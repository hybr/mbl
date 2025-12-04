/**
 * MessageInboxApp.js - Message Inbox Mini App
 * Displays message history with filtering, search, and management features
 */

import { MiniApp } from '../../core/MiniApp.js';

class MessageInboxApp extends MiniApp {
  constructor(options = {}) {
    super(options);

    // State
    this.messages = [];
    this.filteredMessages = [];
    this.currentFilter = 'all'; // all, unread, read, archived
    this.searchQuery = '';
    this.unreadCount = 0;
    this.currentPage = 1;
    this.pageSize = 50;

    // DOM elements
    this.headerElement = null;
    this.filterElement = null;
    this.searchElement = null;
    this.listElement = null;
    this.emptyStateElement = null;
    this.badgeElement = null;

    this.logger.debug('MessageInboxApp constructed');
  }

  /**
   * Initialize the app
   */
  async onInit() {
    this.logger.info('Initializing MessageInboxApp...');

    // Subscribe to message changes
    this.subscribeToData('message', this.handleMessageChange.bind(this));

    // Subscribe to inbox events
    this.subscribe('message:inbox:refresh', () => {
      this.loadMessages();
    });

    this.logger.info('MessageInboxApp initialized');
  }

  /**
   * Render the UI
   */
  async onRender() {
    this.logger.info('Rendering MessageInboxApp...');

    // Clear container
    this.clearContainer();

    // Build UI
    this.container.appendChild(this.buildHeader());
    this.container.appendChild(this.buildFilters());
    this.container.appendChild(this.buildSearch());
    this.container.appendChild(this.buildList());

    // Load messages
    await this.loadMessages();

    this.logger.info('MessageInboxApp rendered');
  }

  /**
   * Build header
   */
  buildHeader() {
    const header = this.createElement('div', { className: 'inbox-header' });

    const title = this.createElement('h1', { className: 'inbox-title' }, ['Message Inbox']);
    header.appendChild(title);

    // Badge for unread count
    this.badgeElement = this.createElement('span', {
      className: 'inbox-badge',
      dataset: { count: '0' }
    }, ['0']);
    header.appendChild(this.badgeElement);

    // Actions
    const actions = this.createElement('div', { className: 'inbox-actions' });

    const refreshBtn = this.createElement('button', {
      className: 'inbox-action-btn',
      title: 'Refresh'
    }, ['🔄 Refresh']);
    this.addEventListener(refreshBtn, 'click', () => this.loadMessages());
    actions.appendChild(refreshBtn);

    const markAllBtn = this.createElement('button', {
      className: 'inbox-action-btn',
      title: 'Mark all as read'
    }, ['✓ Mark All Read']);
    this.addEventListener(markAllBtn, 'click', () => this.markAllAsRead());
    actions.appendChild(markAllBtn);

    header.appendChild(actions);

    this.headerElement = header;
    return header;
  }

  /**
   * Build filters
   */
  buildFilters() {
    const filters = this.createElement('div', { className: 'inbox-filters' });

    const filterOptions = [
      { value: 'all', label: 'All' },
      { value: 'unread', label: 'Unread' },
      { value: 'read', label: 'Read' },
      { value: 'archived', label: 'Archived' }
    ];

    filterOptions.forEach(option => {
      const btn = this.createElement('button', {
        className: `inbox-filter-btn ${option.value === this.currentFilter ? 'active' : ''}`,
        dataset: { filter: option.value }
      }, [option.label]);

      this.addEventListener(btn, 'click', () => {
        this.setFilter(option.value);
      });

      filters.appendChild(btn);
    });

    this.filterElement = filters;
    return filters;
  }

  /**
   * Build search
   */
  buildSearch() {
    const searchContainer = this.createElement('div', { className: 'inbox-search' });

    const searchInput = this.createElement('input', {
      type: 'text',
      className: 'inbox-search-input',
      placeholder: 'Search messages...'
    });

    this.addEventListener(searchInput, 'input', (e) => {
      this.setSearch(e.target.value);
    });

    searchContainer.appendChild(searchInput);
    this.searchElement = searchContainer;

    return searchContainer;
  }

  /**
   * Build message list
   */
  buildList() {
    const listContainer = this.createElement('div', { className: 'inbox-list-container' });

    this.listElement = this.createElement('div', { className: 'inbox-list' });
    this.emptyStateElement = this.createElement('div', { className: 'inbox-empty' }, [
      'No messages to display'
    ]);
    this.emptyStateElement.style.display = 'none';

    listContainer.appendChild(this.listElement);
    listContainer.appendChild(this.emptyStateElement);

    return listContainer;
  }

  /**
   * Load messages from database
   */
  async loadMessages() {
    try {
      if (!this.db) {
        this.logger.warn('Database not available');
        return;
      }

      this.logger.debug('Loading messages...');

      // Get current user (from PersonManagementApp session)
      const currentUser = this.getCurrentUser();

      // Query messages in separate calls and merge
      const allMessages = [];

      // Query user-specific messages
      if (currentUser?._id) {
        const userMessages = await this.db.query({
          selector: {
            type: 'message',
            targetUserId: currentUser._id
          },
          sort: [{ type: 'asc', targetUserId: 'asc', status: 'asc', createdAt: 'desc' }],
          limit: 1000
        });
        allMessages.push(...userMessages);
      }

      // Query global messages
      const globalMessages = await this.db.query({
        selector: {
          type: 'message',
          isGlobal: true
        },
        sort: [{ type: 'asc', isGlobal: 'asc', status: 'asc', createdAt: 'desc' }],
        limit: 1000
      });
      allMessages.push(...globalMessages);

      // Deduplicate by _id
      const uniqueMessages = [];
      const seenIds = new Set();
      for (const msg of allMessages) {
        if (!seenIds.has(msg._id)) {
          seenIds.add(msg._id);
          uniqueMessages.push(msg);
        }
      }

      // Sort by createdAt descending
      uniqueMessages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      this.messages = uniqueMessages;
      this.updateUnreadCount();
      this.applyFilters();

      this.logger.debug(`Loaded ${this.messages.length} messages`);

    } catch (error) {
      this.logger.error('Failed to load messages:', error);
      this.showError('Failed to load messages');
    }
  }

  /**
   * Get current user from PersonManagementApp session
   */
  getCurrentUser() {
    try {
      const sessionData = localStorage.getItem('personManagementApp_session');
      if (sessionData) {
        const session = JSON.parse(sessionData);
        return session.user || null;
      }
    } catch (error) {
      this.logger.warn('Failed to get current user:', error);
    }
    return null;
  }

  /**
   * Update unread count
   */
  updateUnreadCount() {
    this.unreadCount = this.messages.filter(m => m.status === 'unread').length;

    if (this.badgeElement) {
      this.badgeElement.textContent = this.unreadCount.toString();
      this.badgeElement.dataset.count = this.unreadCount.toString();

      if (this.unreadCount > 0) {
        this.badgeElement.style.display = '';
      } else {
        this.badgeElement.style.display = 'none';
      }
    }

    // Emit event for external badge displays
    this.emit('inbox:unread:updated', { count: this.unreadCount });
  }

  /**
   * Set filter
   */
  setFilter(filter) {
    this.currentFilter = filter;

    // Update button states
    const buttons = this.filterElement.querySelectorAll('.inbox-filter-btn');
    buttons.forEach(btn => {
      if (btn.dataset.filter === filter) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    this.applyFilters();
  }

  /**
   * Set search query
   */
  setSearch(query) {
    this.searchQuery = query.toLowerCase();
    this.applyFilters();
  }

  /**
   * Apply filters and search
   */
  applyFilters() {
    let filtered = [...this.messages];

    // Apply status filter
    if (this.currentFilter !== 'all') {
      filtered = filtered.filter(m => m.status === this.currentFilter);
    }

    // Apply search
    if (this.searchQuery) {
      filtered = filtered.filter(m => {
        const titleMatch = m.title?.toLowerCase().includes(this.searchQuery);
        const bodyMatch = m.body?.toLowerCase().includes(this.searchQuery);
        const sourceMatch = m.sourceApp?.toLowerCase().includes(this.searchQuery);
        return titleMatch || bodyMatch || sourceMatch;
      });
    }

    this.filteredMessages = filtered;
    this.renderMessages();
  }

  /**
   * Render message list
   */
  renderMessages() {
    // Clear list
    this.listElement.innerHTML = '';

    if (this.filteredMessages.length === 0) {
      this.emptyStateElement.style.display = 'flex';
      this.listElement.style.display = 'none';
      return;
    }

    this.emptyStateElement.style.display = 'none';
    this.listElement.style.display = 'block';

    // Render each message
    this.filteredMessages.forEach(message => {
      const card = this.buildMessageCard(message);
      this.listElement.appendChild(card);
    });
  }

  /**
   * Build a message card
   */
  buildMessageCard(message) {
    const card = this.createElement('div', {
      className: `inbox-message-card ${message.status} category-${message.category}`,
      dataset: { messageId: message._id }
    });

    // Unread indicator
    if (message.status === 'unread') {
      const indicator = this.createElement('div', { className: 'message-unread-indicator' });
      card.appendChild(indicator);
    }

    // Header
    const header = this.createElement('div', { className: 'message-card-header' });

    const title = this.createElement('h3', { className: 'message-title' }, [message.title]);
    header.appendChild(title);

    const time = this.createElement('span', { className: 'message-time' }, [
      this.formatTime(message.createdAt)
    ]);
    header.appendChild(time);

    card.appendChild(header);

    // Body
    if (message.body) {
      const body = this.createElement('div', { className: 'message-body' }, [message.body]);
      card.appendChild(body);
    }

    // Meta
    const meta = this.createElement('div', { className: 'message-meta' });

    const category = this.createElement('span', {
      className: `message-category message-category-${message.category}`
    }, [message.category || 'info']);
    meta.appendChild(category);

    if (message.sourceApp) {
      const source = this.createElement('span', { className: 'message-source' }, [
        `From: ${message.sourceApp}`
      ]);
      meta.appendChild(source);
    }

    card.appendChild(meta);

    // Actions
    const actions = this.createElement('div', { className: 'message-actions' });

    if (message.status === 'unread') {
      const readBtn = this.createElement('button', {
        className: 'message-action-btn btn-primary'
      }, ['Mark as Read']);
      this.addEventListener(readBtn, 'click', (e) => {
        e.stopPropagation();
        this.markAsRead(message._id);
      });
      actions.appendChild(readBtn);
    } else if (message.status === 'read') {
      const unreadBtn = this.createElement('button', {
        className: 'message-action-btn btn-secondary'
      }, ['Mark as Unread']);
      this.addEventListener(unreadBtn, 'click', (e) => {
        e.stopPropagation();
        this.markAsUnread(message._id);
      });
      actions.appendChild(unreadBtn);
    }

    if (message.status !== 'archived') {
      const archiveBtn = this.createElement('button', {
        className: 'message-action-btn btn-secondary'
      }, ['Archive']);
      this.addEventListener(archiveBtn, 'click', (e) => {
        e.stopPropagation();
        this.archive(message._id);
      });
      actions.appendChild(archiveBtn);
    }

    const deleteBtn = this.createElement('button', {
      className: 'message-action-btn btn-danger'
    }, ['Delete']);
    this.addEventListener(deleteBtn, 'click', (e) => {
      e.stopPropagation();
      this.delete(message._id);
    });
    actions.appendChild(deleteBtn);

    card.appendChild(actions);

    return card;
  }

  /**
   * Format timestamp
   */
  formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    // Less than 1 minute
    if (diff < 60000) {
      return 'Just now';
    }

    // Less than 1 hour
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    }

    // Less than 24 hours
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }

    // Less than 7 days
    if (diff < 604800000) {
      const days = Math.floor(diff / 86400000);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }

    // Format as date
    return date.toLocaleDateString();
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId) {
    try {
      if (!this.messageService) {
        this.logger.warn('MessageService not available');
        return;
      }

      const currentUser = this.getCurrentUser();
      await this.messageService.markAsRead(messageId, currentUser?._id);

      this.logger.debug(`Message marked as read: ${messageId}`);

    } catch (error) {
      this.logger.error('Failed to mark as read:', error);
      this.showError('Failed to mark as read');
    }
  }

  /**
   * Mark message as unread
   */
  async markAsUnread(messageId) {
    try {
      const message = this.messages.find(m => m._id === messageId);
      if (!message) return;

      message.status = 'unread';
      message.readAt = null;
      message.readBy = null;

      await this.db.update(message);

      this.logger.debug(`Message marked as unread: ${messageId}`);

    } catch (error) {
      this.logger.error('Failed to mark as unread:', error);
      this.showError('Failed to mark as unread');
    }
  }

  /**
   * Archive message
   */
  async archive(messageId) {
    try {
      if (!this.messageService) {
        this.logger.warn('MessageService not available');
        return;
      }

      await this.messageService.archive(messageId);

      this.logger.debug(`Message archived: ${messageId}`);

    } catch (error) {
      this.logger.error('Failed to archive:', error);
      this.showError('Failed to archive');
    }
  }

  /**
   * Delete message
   */
  async delete(messageId) {
    try {
      if (!this.messageService) {
        this.logger.warn('MessageService not available');
        return;
      }

      await this.messageService.deleteMessage(messageId);

      this.logger.debug(`Message deleted: ${messageId}`);
      this.showSuccess('Message deleted');

    } catch (error) {
      this.logger.error('Failed to delete:', error);
      this.showError('Failed to delete');
    }
  }

  /**
   * Mark all as read
   */
  async markAllAsRead() {
    try {
      if (!this.messageService) {
        this.logger.warn('MessageService not available');
        return;
      }

      const currentUser = this.getCurrentUser();
      await this.messageService.markAllAsRead(currentUser?._id);

      this.showSuccess('All messages marked as read');
      this.logger.debug('All messages marked as read');

    } catch (error) {
      this.logger.error('Failed to mark all as read:', error);
      this.showError('Failed to mark all as read');
    }
  }

  /**
   * Handle database changes
   */
  handleMessageChange(change) {
    this.logger.debug('Message changed:', change);

    // Reload messages on any change
    this.loadMessages();
  }

  /**
   * Lifecycle: on show
   */
  onShow() {
    this.loadMessages();
  }

  /**
   * Lifecycle: on destroy
   */
  async onDestroy() {
    // Cleanup is handled by base class
    this.logger.info('MessageInboxApp destroyed');
  }
}

export default MessageInboxApp;
