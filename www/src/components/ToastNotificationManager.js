/**
 * ToastNotificationManager.js - Manages toast notification display
 * Shows brief auto-dismissing messages in a stacked layout
 */

import { LoggerFactory } from '../core/Logger.js';
import { eventBus } from '../core/EventBus.js';

class ToastNotificationManager {
  constructor(options = {}) {
    this.logger = LoggerFactory.getLogger('ToastNotificationManager');

    // Configuration
    this.maxToasts = options.maxToasts || 5;
    this.defaultDuration = options.defaultDuration || 3000;
    this.position = options.position || 'top-right'; // top-right, top-left, bottom-right, bottom-left
    this.stackSpacing = options.stackSpacing || 10; // pixels between toasts

    // State
    this.toasts = new Map(); // messageId -> toast element
    this.container = null;
    this.isInitialized = false;

    // Event subscriptions
    this.eventSubscriptions = [];

    this.logger.debug('ToastNotificationManager constructed');
  }

  /**
   * Initialize the toast manager
   */
  async init() {
    if (this.isInitialized) {
      this.logger.warn('ToastNotificationManager already initialized');
      return;
    }

    try {
      this.logger.info('Initializing ToastNotificationManager...');

      // Create container
      this.createContainer();

      // Subscribe to message events
      this.setupEventListeners();

      this.isInitialized = true;
      this.logger.info('ToastNotificationManager initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize ToastNotificationManager:', error);
      throw error;
    }
  }

  /**
   * Create the toast container element
   */
  createContainer() {
    // Check if container already exists
    let container = document.getElementById('toast-notification-container');

    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-notification-container';
      container.className = `toast-container toast-${this.position}`;
      document.body.appendChild(container);
    }

    this.container = container;
    this.logger.debug('Toast container created');
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for toast display events
    const unsubscribe1 = eventBus.on('message:show:toast', (message) => {
      this.show(message);
    });
    this.eventSubscriptions.push(unsubscribe1);

    // Listen for message created events (auto-show toast type messages)
    const unsubscribe2 = eventBus.on('message:created', (message) => {
      if (message.messageType === 'toast') {
        this.show(message);
      }
    });
    this.eventSubscriptions.push(unsubscribe2);

    this.logger.debug('Event listeners setup');
  }

  /**
   * Show a toast notification
   */
  show(message) {
    try {
      // Check max toasts limit
      if (this.toasts.size >= this.maxToasts) {
        this.removeOldest();
      }

      // Create toast element
      const toastElement = this.createToastElement(message);

      // Add to container
      this.container.appendChild(toastElement);

      // Store reference
      this.toasts.set(message._id, toastElement);

      // Trigger animation
      setTimeout(() => {
        toastElement.classList.add('toast-show');
      }, 10);

      // Auto-dismiss if configured
      if (message.displayConfig?.autoDismiss !== false) {
        const duration = message.displayConfig?.dismissAfter || this.defaultDuration;
        setTimeout(() => {
          this.dismiss(message._id);
        }, duration);
      }

      this.logger.debug(`Toast shown: ${message._id}`);

      // Emit event
      eventBus.emit('toast:shown', { id: message._id });

    } catch (error) {
      this.logger.error('Failed to show toast:', error);
    }
  }

  /**
   * Create toast element
   */
  createToastElement(message) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${message.category || 'info'} toast-priority-${message.priority || 'normal'}`;
    toast.dataset.messageId = message._id;
    toast.dataset.priority = message.priority || 'normal';

    // Icon
    const icon = this.getIcon(message.category);
    const iconElement = document.createElement('div');
    iconElement.className = 'toast-icon';
    iconElement.innerHTML = icon;

    // Content
    const content = document.createElement('div');
    content.className = 'toast-content';

    const title = document.createElement('div');
    title.className = 'toast-title';
    title.textContent = message.title;
    content.appendChild(title);

    if (message.body) {
      const body = document.createElement('div');
      body.className = 'toast-body';
      body.textContent = message.body;
      content.appendChild(body);
    }

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'toast-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.setAttribute('aria-label', 'Close notification');
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.dismiss(message._id);
    });

    // Assemble toast
    toast.appendChild(iconElement);
    toast.appendChild(content);
    toast.appendChild(closeBtn);

    // Make toast clickable if there's an action
    if (message.actions && message.actions.length > 0) {
      toast.classList.add('toast-clickable');
      toast.addEventListener('click', () => {
        // Emit event to open detail or execute action
        eventBus.emit('toast:clicked', { message });
        this.dismiss(message._id);
      });
    }

    return toast;
  }

  /**
   * Get icon for category
   */
  getIcon(category) {
    const icons = {
      success: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="2"/>
        <path d="M6 10l3 3 5-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
      error: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="2"/>
        <path d="M10 6v5M10 14v1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
      warning: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 2L2 17h16L10 2z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M10 8v4M10 14v1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
      info: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="2"/>
        <path d="M10 10v4M10 6v1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`
    };

    return icons[category] || icons.info;
  }

  /**
   * Dismiss a toast
   */
  dismiss(messageId) {
    const toast = this.toasts.get(messageId);

    if (!toast) {
      this.logger.warn(`Toast not found: ${messageId}`);
      return;
    }

    // Trigger exit animation
    toast.classList.remove('toast-show');
    toast.classList.add('toast-hide');

    // Remove after animation
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
      this.toasts.delete(messageId);

      // Emit event
      eventBus.emit('toast:dismissed', { id: messageId });

      this.logger.debug(`Toast dismissed: ${messageId}`);
    }, 300); // Match CSS animation duration
  }

  /**
   * Remove the oldest toast
   */
  removeOldest() {
    // Get first (oldest) toast
    const firstKey = this.toasts.keys().next().value;
    if (firstKey) {
      this.dismiss(firstKey);
    }
  }

  /**
   * Dismiss all toasts
   */
  dismissAll() {
    const messageIds = Array.from(this.toasts.keys());
    messageIds.forEach(id => this.dismiss(id));

    this.logger.debug('All toasts dismissed');
  }

  /**
   * Get toast count
   */
  getCount() {
    return this.toasts.size;
  }

  /**
   * Check if a toast is currently shown
   */
  isShown(messageId) {
    return this.toasts.has(messageId);
  }

  /**
   * Update max toasts limit
   */
  setMaxToasts(max) {
    this.maxToasts = max;

    // Remove excess toasts if needed
    while (this.toasts.size > this.maxToasts) {
      this.removeOldest();
    }
  }

  /**
   * Update position
   */
  setPosition(position) {
    if (this.container) {
      // Remove old position class
      this.container.className = this.container.className.replace(/toast-[a-z-]+/, '');

      // Add new position class
      this.position = position;
      this.container.classList.add(`toast-${position}`);
    }
  }

  /**
   * Destroy the toast manager
   */
  async destroy() {
    if (!this.isInitialized) {
      return;
    }

    try {
      this.logger.info('Destroying ToastNotificationManager...');

      // Dismiss all toasts
      this.dismissAll();

      // Unsubscribe from events
      this.eventSubscriptions.forEach(unsubscribe => unsubscribe());
      this.eventSubscriptions = [];

      // Remove container
      if (this.container && this.container.parentNode) {
        this.container.parentNode.removeChild(this.container);
      }
      this.container = null;

      this.isInitialized = false;
      this.logger.info('ToastNotificationManager destroyed successfully');

    } catch (error) {
      this.logger.error('Failed to destroy ToastNotificationManager:', error);
      throw error;
    }
  }
}

export default ToastNotificationManager;
