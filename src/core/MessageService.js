import { eventBus } from './EventBus.js';
import { LoggerFactory } from './Logger.js';

/**
 * MessageService - Central message management and routing service
 * Handles message creation, validation, storage, delivery, and action callbacks
 */
class MessageService {
  constructor(options = {}) {
    this.dbManager = options.dbManager;
    this.eventBus = options.eventBus || eventBus;
    this.logger = LoggerFactory.getLogger('MessageService');

    // Action callback registry: { appName: { actionName: callback } }
    this.actionHandlers = new Map();

    // Current user context
    this.currentUser = null;
    this.currentOrg = null;
    this.currentRole = null;

    // Change listener subscription
    this.changeSubscription = null;

    this.logger.info('MessageService created');
  }

  /**
   * Initialize the service
   */
  async init() {
    try {
      this.logger.info('Initializing MessageService');

      // Setup database indexes
      await this.setupDatabaseIndexes();

      // Setup database change listeners
      this.setupDatabaseSubscription();

      // Setup user context listeners
      this.setupUserListeners();

      // Setup system event listeners
      this.setupSystemListeners();

      // Load current user context
      await this.loadCurrentUser();

      this.logger.info('MessageService initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize MessageService:', error);
      throw error;
    }
  }

  /**
   * Create database indexes for efficient querying
   */
  async setupDatabaseIndexes() {
    try {
      // Index 1: Query messages by user
      await this.dbManager.createIndex(['type', 'targetUserId', 'status', 'createdAt']);

      // Index 2: Query messages by organization
      await this.dbManager.createIndex(['type', 'targetOrgId', 'status', 'createdAt']);

      // Index 3: Query messages by role
      await this.dbManager.createIndex(['type', 'targetRole', 'status', 'createdAt']);

      // Index 4: Query global messages
      await this.dbManager.createIndex(['type', 'isGlobal', 'status', 'createdAt']);

      // Index 5: Query unread messages (for badge count)
      await this.dbManager.createIndex(['type', 'targetUserId', 'status']);

      // Index 6: Query by priority (for routing)
      await this.dbManager.createIndex(['type', 'priority', 'status', 'createdAt']);

      this.logger.info('Database indexes created successfully');
    } catch (error) {
      this.logger.warn('Some indexes may already exist:', error.message);
    }
  }

  /**
   * Subscribe to database changes for real-time message updates
   */
  setupDatabaseSubscription() {
    this.changeSubscription = this.dbManager.subscribe('message', (change) => {
      this.handleMessageChange(change);
    });
  }

  /**
   * Setup listeners for user login/logout events
   */
  setupUserListeners() {
    this.eventBus.on('person:login', (user) => {
      this.logger.info('User logged in:', user._id);
      this.currentUser = user;
      this.currentRole = user.organizationRole || null;
      this.loadUnreadMessages(user._id);
    });

    this.eventBus.on('person:logout', () => {
      this.logger.info('User logged out');
      this.currentUser = null;
      this.currentRole = null;
    });

    this.eventBus.on('organization:defaultChanged', (org) => {
      this.logger.info('Default organization changed:', org?._id);
      this.currentOrg = org;
    });
  }

  /**
   * Setup system event listeners for automatic messages
   */
  setupSystemListeners() {
    // Sync error notifications
    this.eventBus.on('sync:error', (error) => {
      this.sendGlobal({
        messageType: 'toast',
        title: 'Sync Failed',
        body: 'Unable to sync with server. Changes saved locally.',
        icon: '⚠️',
        category: 'error',
        priority: 'high',
        displayConfig: {
          autoDismiss: true,
          dismissAfter: 6000
        }
      });
    });

    // Network offline notifications
    this.eventBus.on('network:offline', () => {
      this.sendGlobal({
        messageType: 'toast',
        title: 'You are offline',
        body: 'Changes will sync when you reconnect',
        icon: '📡',
        category: 'warning',
        priority: 'normal',
        displayConfig: {
          autoDismiss: true,
          dismissAfter: 4000
        }
      });
    });

    // Network online notifications
    this.eventBus.on('network:online', () => {
      this.sendGlobal({
        messageType: 'toast',
        title: 'Back online',
        body: 'Syncing changes now',
        icon: '✓',
        category: 'success',
        priority: 'normal',
        displayConfig: {
          autoDismiss: true,
          dismissAfter: 3000
        }
      });
    });
  }

  /**
   * Load current user from session storage
   */
  async loadCurrentUser() {
    try {
      const sessionData = localStorage.getItem('personManagementApp_session');
      if (sessionData) {
        const session = JSON.parse(sessionData);
        const user = await this.dbManager.read(session.userId);
        if (user) {
          this.currentUser = user;
          this.currentRole = user.organizationRole || null;
          this.logger.info('Current user loaded:', user._id);
        }
      }

      const defaultOrgData = localStorage.getItem('defaultOrganization');
      if (defaultOrgData) {
        this.currentOrg = JSON.parse(defaultOrgData);
      }
    } catch (error) {
      this.logger.warn('Failed to load current user:', error.message);
    }
  }

  /**
   * Load unread messages for user (called on login)
   */
  async loadUnreadMessages(userId) {
    try {
      const unreadCount = await this.getUnreadCount(userId);
      this.logger.info(`User has ${unreadCount} unread messages`);
      this.eventBus.emit('message:unreadCount', { userId, count: unreadCount });
    } catch (error) {
      this.logger.error('Failed to load unread messages:', error);
    }
  }

  /**
   * Core method: Send a message
   * @param {Object} messageData - Message configuration
   * @returns {Promise<Object>} Created message document
   */
  async send(messageData) {
    try {
      // Validate message
      this.validateMessage(messageData);

      // Enrich message with defaults
      const message = this.enrichMessage(messageData);

      // Store in database
      const savedMessage = await this.dbManager.create(message);

      this.logger.info('Message created:', savedMessage._id);

      // Emit event for real-time delivery
      this.eventBus.emit('message:created', savedMessage);

      // Route message for immediate display if appropriate
      this.routeMessage(savedMessage);

      return { success: true, id: savedMessage._id, message: savedMessage };
    } catch (error) {
      this.logger.error('Failed to send message:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Validate message data
   */
  validateMessage(messageData) {
    // Required fields
    if (!messageData.title) {
      throw new Error('Message title is required');
    }

    if (!messageData.messageType) {
      throw new Error('Message type is required');
    }

    if (!['toast', 'actionable', 'persistent'].includes(messageData.messageType)) {
      throw new Error('Invalid message type. Must be: toast, actionable, or persistent');
    }

    // Only one target type allowed
    const targets = [
      messageData.targetUserId,
      messageData.targetOrgId,
      messageData.targetRole,
      messageData.isGlobal
    ].filter(Boolean);

    if (targets.length > 1) {
      throw new Error('Message can only have one target type (user, org, role, or global)');
    }

    // Validate actions for actionable messages
    if (messageData.actions && messageData.actions.length > 0) {
      messageData.actions.forEach((action, index) => {
        if (!action.id) {
          throw new Error(`Action ${index} must have an id`);
        }
        if (!action.label) {
          throw new Error(`Action ${index} must have a label`);
        }
        if (!action.callback) {
          throw new Error(`Action ${index} must have a callback`);
        }
      });
    }

    return true;
  }

  /**
   * Enrich message with defaults and metadata
   */
  enrichMessage(messageData) {
    const now = new Date().toISOString();

    // Generate unique ID
    const id = `message:${this.generateUUID()}`;

    // Default values
    const enriched = {
      _id: id,
      type: 'message',

      // Content
      title: messageData.title,
      body: messageData.body || '',
      icon: messageData.icon || this.getDefaultIcon(messageData.category),

      // Type & Priority
      messageType: messageData.messageType,
      priority: messageData.priority || 'normal',
      category: messageData.category || 'info',

      // Targeting
      targetUserId: messageData.targetUserId || null,
      targetOrgId: messageData.targetOrgId || null,
      targetRole: messageData.targetRole || null,
      isGlobal: messageData.isGlobal || false,

      // Source
      sourceApp: messageData.sourceApp || 'System',
      sourceAction: messageData.sourceAction || '',

      // Actions
      actions: messageData.actions || [],

      // State
      status: 'unread',
      readAt: null,
      readBy: null,
      actionTaken: null,

      // Display configuration
      displayConfig: {
        autoDismiss: true,
        dismissAfter: 3000,
        persistent: messageData.messageType === 'persistent',
        requireAction: false,
        ...messageData.displayConfig
      },

      // Metadata
      createdAt: now,
      updatedAt: now,
      expiresAt: messageData.expiresAt || null
    };

    // If no targeting specified and user is logged in, target current user
    if (!enriched.targetUserId &&
        !enriched.targetOrgId &&
        !enriched.targetRole &&
        !enriched.isGlobal &&
        this.currentUser) {
      enriched.targetUserId = this.currentUser._id;
    }

    return enriched;
  }

  /**
   * Get default icon for category
   */
  getDefaultIcon(category) {
    const icons = {
      success: '✓',
      info: 'ℹ',
      warning: '⚠️',
      error: '✗'
    };
    return icons[category] || 'ℹ';
  }

  /**
   * Generate UUID v4
   */
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Route message for immediate display
   */
  routeMessage(message) {
    // Only route if message targets current user
    if (!this.shouldDisplayToCurrentUser(message)) {
      return;
    }

    switch (message.priority) {
      case 'critical':
        // Always show modal immediately, block interaction
        if (message.messageType === 'actionable') {
          this.eventBus.emit('message:show:modal', message);
        } else {
          this.eventBus.emit('message:show:toast', message);
        }
        break;

      case 'high':
        if (message.messageType === 'actionable') {
          this.eventBus.emit('message:show:modal', message);
        } else {
          this.eventBus.emit('message:show:toast', message);
        }
        break;

      case 'normal':
        if (message.messageType === 'toast') {
          this.eventBus.emit('message:show:toast', message);
        } else if (message.messageType === 'actionable') {
          this.eventBus.emit('message:show:modal', message);
        }
        // Persistent always goes to inbox only
        break;

      case 'low':
        // Only save to inbox, no immediate display
        break;
    }
  }

  /**
   * Check if current user should receive this message
   */
  shouldDisplayToCurrentUser(message) {
    // Global messages go to everyone
    if (message.isGlobal) {
      return true;
    }

    // No user logged in
    if (!this.currentUser) {
      return false;
    }

    // User-specific messages
    if (message.targetUserId && message.targetUserId === this.currentUser._id) {
      return true;
    }

    // Organization-specific messages
    if (message.targetOrgId && this.currentOrg && message.targetOrgId === this.currentOrg._id) {
      return true;
    }

    // Role-specific messages
    if (message.targetRole && message.targetRole === this.currentRole) {
      return true;
    }

    return false;
  }

  /**
   * Handle database change events
   */
  handleMessageChange(change) {
    if (change.deleted) {
      this.eventBus.emit('message:deleted', { messageId: change.id });
      return;
    }

    const message = change.doc;

    // Emit update event for inbox
    this.eventBus.emit('message:updated', { message });

    // Route new messages
    if (!change.id.startsWith('_design/')) {
      this.routeMessage(message);
    }
  }

  // ===== Convenience Methods =====

  /**
   * Send simple toast notification
   */
  async sendToast(message, category = 'info', duration = 3000) {
    return this.send({
      messageType: 'toast',
      title: message,
      category,
      displayConfig: {
        autoDismiss: true,
        dismissAfter: duration
      }
    });
  }

  /**
   * Send actionable message requiring user response
   */
  async sendActionable(title, body, actions, options = {}) {
    return this.send({
      messageType: 'actionable',
      title,
      body,
      actions,
      priority: options.priority || 'normal',
      category: options.category || 'info',
      ...options
    });
  }

  /**
   * Send persistent message to inbox
   */
  async sendPersistent(title, body, options = {}) {
    return this.send({
      messageType: 'persistent',
      title,
      body,
      displayConfig: { persistent: true },
      ...options
    });
  }

  // ===== Targeting Methods =====

  /**
   * Send to specific user
   */
  async sendToUser(userId, messageData) {
    return this.send({ ...messageData, targetUserId: userId });
  }

  /**
   * Send to organization
   */
  async sendToOrganization(orgId, messageData) {
    return this.send({ ...messageData, targetOrgId: orgId });
  }

  /**
   * Send to role
   */
  async sendToRole(role, messageData) {
    return this.send({ ...messageData, targetRole: role });
  }

  /**
   * Send global broadcast
   */
  async sendGlobal(messageData) {
    return this.send({ ...messageData, isGlobal: true });
  }

  // ===== Query Methods =====

  /**
   * Get messages for current user
   */
  async getMessagesForUser(userId, options = {}) {
    try {
      const limit = options.limit || 50;
      const skip = options.skip || 0;
      const status = options.status || ['unread', 'read'];
      const includeGlobal = options.includeGlobal !== false;

      // Query multiple times and merge results
      const allMessages = [];

      // Query user-specific messages
      const userMessages = await this.dbManager.query({
        selector: {
          type: 'message',
          targetUserId: userId
        },
        sort: [{ type: 'asc', targetUserId: 'asc', status: 'asc', createdAt: 'desc' }],
        limit: 1000
      });
      allMessages.push(...userMessages);

      // Query global messages
      if (includeGlobal) {
        const globalMessages = await this.dbManager.query({
          selector: {
            type: 'message',
            isGlobal: true
          },
          sort: [{ type: 'asc', isGlobal: 'asc', status: 'asc', createdAt: 'desc' }],
          limit: 1000
        });
        allMessages.push(...globalMessages);
      }

      // Query org messages if user has org
      if (options.includeOrg && this.currentOrg) {
        const orgMessages = await this.dbManager.query({
          selector: {
            type: 'message',
            targetOrgId: this.currentOrg._id
          },
          sort: [{ type: 'asc', targetOrgId: 'asc', status: 'asc', createdAt: 'desc' }],
          limit: 1000
        });
        allMessages.push(...orgMessages);
      }

      // Query role messages if user has role
      if (options.includeRole && this.currentRole) {
        const roleMessages = await this.dbManager.query({
          selector: {
            type: 'message',
            targetRole: this.currentRole
          },
          sort: [{ type: 'asc', targetRole: 'asc', status: 'asc', createdAt: 'desc' }],
          limit: 1000
        });
        allMessages.push(...roleMessages);
      }

      // Deduplicate by _id
      const uniqueMessages = [];
      const seenIds = new Set();
      for (const msg of allMessages) {
        if (!seenIds.has(msg._id)) {
          seenIds.add(msg._id);
          uniqueMessages.push(msg);
        }
      }

      // Filter by status
      let filtered = uniqueMessages;
      if (Array.isArray(status)) {
        filtered = uniqueMessages.filter(m => status.includes(m.status));
      } else {
        filtered = uniqueMessages.filter(m => m.status === status);
      }

      // Sort by createdAt descending
      filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // Apply pagination
      const paginated = filtered.slice(skip, skip + limit);

      return paginated;
    } catch (error) {
      this.logger.error('Failed to get messages for user:', error);
      return [];
    }
  }

  /**
   * Get unread count for user
   */
  async getUnreadCount(userId, options = {}) {
    try {
      const messages = await this.getMessagesForUser(userId, {
        ...options,
        status: 'unread',
        limit: 1000 // High limit to get accurate count
      });
      return messages.length;
    } catch (error) {
      this.logger.error('Failed to get unread count:', error);
      return 0;
    }
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId, userId) {
    try {
      const message = await this.dbManager.read(messageId);
      if (!message) {
        throw new Error('Message not found');
      }

      message.status = 'read';
      message.readAt = new Date().toISOString();
      message.readBy = userId;
      message.updatedAt = new Date().toISOString();

      await this.dbManager.update(message);

      this.eventBus.emit('message:read', { messageId, userId });

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to mark message as read:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Mark all messages as read for user
   */
  async markAllAsRead(userId) {
    try {
      const unreadMessages = await this.getMessagesForUser(userId, {
        status: 'unread',
        limit: 1000
      });

      const now = new Date().toISOString();
      const updates = unreadMessages.map(msg => ({
        ...msg,
        status: 'read',
        readAt: now,
        readBy: userId,
        updatedAt: now
      }));

      await this.dbManager.bulkUpdate(updates);

      this.logger.info(`Marked ${updates.length} messages as read for user ${userId}`);

      return { success: true, count: updates.length };
    } catch (error) {
      this.logger.error('Failed to mark all as read:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Archive message
   */
  async archive(messageId) {
    try {
      const message = await this.dbManager.read(messageId);
      if (!message) {
        throw new Error('Message not found');
      }

      message.status = 'archived';
      message.archivedAt = new Date().toISOString();
      message.updatedAt = new Date().toISOString();

      await this.dbManager.update(message);

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to archive message:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete message (soft delete)
   */
  async deleteMessage(messageId) {
    try {
      const message = await this.dbManager.read(messageId);
      if (!message) {
        throw new Error('Message not found');
      }

      message.status = 'deleted';
      message.updatedAt = new Date().toISOString();

      await this.dbManager.update(message);

      this.eventBus.emit('message:deleted', { messageId });

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to delete message:', error);
      return { success: false, error: error.message };
    }
  }

  // ===== Action Handler Registry =====

  /**
   * Register action callback handler
   * @param {string} appName - Name of the app registering the handler
   * @param {string} actionName - Name of the action
   * @param {Function} callback - Callback function to execute
   */
  registerActionHandler(appName, actionName, callback) {
    if (!this.actionHandlers.has(appName)) {
      this.actionHandlers.set(appName, new Map());
    }

    const appHandlers = this.actionHandlers.get(appName);
    appHandlers.set(actionName, callback);

    this.logger.info(`Registered action handler: ${appName}.${actionName}`);
  }

  /**
   * Execute action callback
   */
  async executeAction(messageId, actionId, actionData) {
    try {
      // Get message
      const message = await this.dbManager.read(messageId);
      if (!message) {
        throw new Error('Message not found');
      }

      // Find action
      const action = message.actions.find(a => a.id === actionId);
      if (!action) {
        throw new Error('Action not found in message');
      }

      // Find callback
      const appHandlers = this.actionHandlers.get(message.sourceApp);
      if (!appHandlers) {
        throw new Error(`No handlers registered for app: ${message.sourceApp}`);
      }

      const callback = appHandlers.get(action.callback);
      if (!callback) {
        throw new Error(`Handler not found: ${action.callback}`);
      }

      // Execute callback
      this.logger.info(`Executing action: ${message.sourceApp}.${action.callback}`);
      const result = await callback(action.data || actionData);

      // Update message with action result
      message.actionTaken = {
        actionId,
        timestamp: new Date().toISOString(),
        result: 'success'
      };
      message.status = 'read';
      message.readAt = new Date().toISOString();
      message.readBy = this.currentUser?._id || null;
      message.updatedAt = new Date().toISOString();

      await this.dbManager.update(message);

      this.eventBus.emit('message:actioned', { messageId, actionId, result });

      return { success: true, result };
    } catch (error) {
      this.logger.error('Failed to execute action:', error);

      // Still update message to mark action as attempted
      try {
        const message = await this.dbManager.read(messageId);
        if (message) {
          message.actionTaken = {
            actionId,
            timestamp: new Date().toISOString(),
            result: 'error',
            error: error.message
          };
          message.updatedAt = new Date().toISOString();
          await this.dbManager.update(message);
        }
      } catch (updateError) {
        this.logger.error('Failed to update message after action error:', updateError);
      }

      return { success: false, error: error.message };
    }
  }

  /**
   * Cleanup - unsubscribe from events
   */
  destroy() {
    if (this.changeSubscription) {
      this.changeSubscription();
    }
    this.logger.info('MessageService destroyed');
  }
}

export default MessageService;
