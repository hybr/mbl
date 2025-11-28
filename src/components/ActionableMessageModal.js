/**
 * ActionableMessageModal.js - Displays modal messages requiring user action
 * Handles action buttons, callbacks, and modal queuing
 */

import { LoggerFactory } from '../core/Logger.js';
import { eventBus } from '../core/EventBus.js';

class ActionableMessageModal {
  constructor(options = {}) {
    this.logger = LoggerFactory.getLogger('ActionableMessageModal');

    // Configuration
    this.closeOnBackdrop = options.closeOnBackdrop !== false;
    this.closeOnEscape = options.closeOnEscape !== false;

    // State
    this.currentMessage = null;
    this.messageQueue = [];
    this.isShowing = false;
    this.isInitialized = false;

    // DOM elements
    this.modal = null;
    this.backdrop = null;
    this.modalContent = null;

    // Event subscriptions
    this.eventSubscriptions = [];

    // Bound handlers for cleanup
    this.boundHandlers = {
      backdropClick: this.handleBackdropClick.bind(this),
      escapeKey: this.handleEscapeKey.bind(this)
    };

    this.logger.debug('ActionableMessageModal constructed');
  }

  /**
   * Initialize the modal
   */
  async init() {
    if (this.isInitialized) {
      this.logger.warn('ActionableMessageModal already initialized');
      return;
    }

    try {
      this.logger.info('Initializing ActionableMessageModal...');

      // Create modal elements
      this.createModal();

      // Setup event listeners
      this.setupEventListeners();

      this.isInitialized = true;
      this.logger.info('ActionableMessageModal initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize ActionableMessageModal:', error);
      throw error;
    }
  }

  /**
   * Create modal DOM structure
   */
  createModal() {
    // Check if modal already exists
    let backdrop = document.getElementById('actionable-message-backdrop');

    if (!backdrop) {
      // Create backdrop
      backdrop = document.createElement('div');
      backdrop.id = 'actionable-message-backdrop';
      backdrop.className = 'actionable-backdrop';
      backdrop.style.display = 'none';

      // Create modal
      const modal = document.createElement('div');
      modal.id = 'actionable-message-modal';
      modal.className = 'actionable-modal';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');

      backdrop.appendChild(modal);
      document.body.appendChild(backdrop);
    } else {
      const modal = backdrop.querySelector('.actionable-modal');
      this.modal = modal;
    }

    this.backdrop = backdrop;
    this.modal = backdrop.querySelector('.actionable-modal');

    this.logger.debug('Modal DOM created');
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for actionable message display events
    const unsubscribe1 = eventBus.on('message:show:modal', (message) => {
      this.show(message);
    });
    this.eventSubscriptions.push(unsubscribe1);

    // Listen for message created events (auto-show actionable type messages)
    const unsubscribe2 = eventBus.on('message:created', (message) => {
      if (message.messageType === 'actionable') {
        // High and critical priority show immediately
        if (message.priority === 'high' || message.priority === 'critical') {
          this.show(message);
        } else {
          // Normal and low priority get queued
          this.queue(message);
        }
      }
    });
    this.eventSubscriptions.push(unsubscribe2);

    // Backdrop click handler
    this.backdrop.addEventListener('click', this.boundHandlers.backdropClick);

    // Escape key handler
    document.addEventListener('keydown', this.boundHandlers.escapeKey);

    this.logger.debug('Event listeners setup');
  }

  /**
   * Handle backdrop click
   */
  handleBackdropClick(event) {
    if (event.target === this.backdrop && this.closeOnBackdrop) {
      // Check if message requires action (cannot dismiss)
      if (this.currentMessage?.displayConfig?.requireAction) {
        this.shake();
        return;
      }

      this.close();
    }
  }

  /**
   * Handle escape key
   */
  handleEscapeKey(event) {
    if (event.key === 'Escape' && this.isShowing && this.closeOnEscape) {
      // Check if message requires action (cannot dismiss)
      if (this.currentMessage?.displayConfig?.requireAction) {
        this.shake();
        return;
      }

      this.close();
    }
  }

  /**
   * Shake animation when user tries to close required message
   */
  shake() {
    this.modal.classList.add('modal-shake');
    setTimeout(() => {
      this.modal.classList.remove('modal-shake');
    }, 500);
  }

  /**
   * Show a message
   */
  show(message) {
    if (this.isShowing) {
      // Queue the message
      this.queue(message);
      return;
    }

    try {
      this.currentMessage = message;
      this.isShowing = true;

      // Build modal content
      this.buildContent(message);

      // Show modal
      this.backdrop.style.display = 'flex';
      setTimeout(() => {
        this.backdrop.classList.add('backdrop-show');
        this.modal.classList.add('modal-show');
      }, 10);

      // Focus first action button
      setTimeout(() => {
        const firstButton = this.modal.querySelector('.modal-action-btn');
        if (firstButton) {
          firstButton.focus();
        }
      }, 100);

      this.logger.debug(`Modal shown: ${message._id}`);

      // Emit event
      eventBus.emit('modal:shown', { id: message._id });

    } catch (error) {
      this.logger.error('Failed to show modal:', error);
    }
  }

  /**
   * Build modal content
   */
  buildContent(message) {
    // Clear existing content
    this.modal.innerHTML = '';

    // Category indicator
    const categoryBar = document.createElement('div');
    categoryBar.className = `modal-category-bar modal-category-${message.category || 'info'}`;
    this.modal.appendChild(categoryBar);

    // Header
    const header = document.createElement('div');
    header.className = 'modal-header';

    const icon = this.getIcon(message.category);
    const iconElement = document.createElement('div');
    iconElement.className = 'modal-icon';
    iconElement.innerHTML = icon;
    header.appendChild(iconElement);

    const title = document.createElement('h2');
    title.className = 'modal-title';
    title.textContent = message.title;
    header.appendChild(title);

    // Close button (if message doesn't require action)
    if (!message.displayConfig?.requireAction) {
      const closeBtn = document.createElement('button');
      closeBtn.className = 'modal-close-btn';
      closeBtn.innerHTML = '&times;';
      closeBtn.setAttribute('aria-label', 'Close');
      closeBtn.addEventListener('click', () => this.close());
      header.appendChild(closeBtn);
    }

    this.modal.appendChild(header);

    // Body
    if (message.body) {
      const body = document.createElement('div');
      body.className = 'modal-body';
      body.textContent = message.body;
      this.modal.appendChild(body);
    }

    // Actions
    if (message.actions && message.actions.length > 0) {
      const actionsContainer = document.createElement('div');
      actionsContainer.className = 'modal-actions';

      message.actions.forEach(action => {
        const button = document.createElement('button');
        button.className = `modal-action-btn btn-${action.style || 'secondary'}`;
        button.textContent = action.label;
        button.dataset.actionId = action.id;

        button.addEventListener('click', () => {
          this.executeAction(message, action);
        });

        actionsContainer.appendChild(button);
      });

      this.modal.appendChild(actionsContainer);
    }

    // Source info (small text)
    if (message.sourceApp) {
      const sourceInfo = document.createElement('div');
      sourceInfo.className = 'modal-source';
      sourceInfo.textContent = `From: ${message.sourceApp}`;
      this.modal.appendChild(sourceInfo);
    }
  }

  /**
   * Get icon for category
   */
  getIcon(category) {
    const icons = {
      success: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
        <path d="M8 12l3 3 5-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
      error: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
        <path d="M12 7v6M12 16v1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
      warning: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L2 20h20L12 2z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M12 9v5M12 17v1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
      info: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
        <path d="M12 12v5M12 7v1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`
    };

    return icons[category] || icons.info;
  }

  /**
   * Execute an action
   */
  async executeAction(message, action) {
    try {
      this.logger.info(`Executing action: ${action.id} for message: ${message._id}`);

      // Emit event for MessageService to handle
      eventBus.emit('message:action:execute', {
        messageId: message._id,
        actionId: action.id,
        callback: action.callback,
        data: action.data
      });

      // Close modal
      this.close();

      // Show next queued message if any
      this.showNext();

    } catch (error) {
      this.logger.error('Failed to execute action:', error);
    }
  }

  /**
   * Queue a message
   */
  queue(message) {
    // Check if already queued
    const exists = this.messageQueue.find(m => m._id === message._id);
    if (exists) {
      this.logger.debug(`Message already queued: ${message._id}`);
      return;
    }

    // Add to queue (sorted by priority)
    this.messageQueue.push(message);
    this.messageQueue.sort((a, b) => {
      const priorities = { critical: 0, high: 1, normal: 2, low: 3 };
      return (priorities[a.priority] || 2) - (priorities[b.priority] || 2);
    });

    this.logger.debug(`Message queued: ${message._id}, queue size: ${this.messageQueue.length}`);

    // Emit event
    eventBus.emit('modal:queued', { id: message._id, queueSize: this.messageQueue.length });
  }

  /**
   * Show next queued message
   */
  showNext() {
    if (this.messageQueue.length > 0) {
      const nextMessage = this.messageQueue.shift();
      setTimeout(() => {
        this.show(nextMessage);
      }, 300);
    }
  }

  /**
   * Close the modal
   */
  close() {
    if (!this.isShowing) {
      return;
    }

    // Trigger exit animation
    this.backdrop.classList.remove('backdrop-show');
    this.modal.classList.remove('modal-show');

    // Hide after animation
    setTimeout(() => {
      this.backdrop.style.display = 'none';
      this.modal.innerHTML = '';
      this.currentMessage = null;
      this.isShowing = false;

      // Emit event
      eventBus.emit('modal:closed');

      // Show next queued message
      this.showNext();

    }, 300);

    this.logger.debug('Modal closed');
  }

  /**
   * Get queue size
   */
  getQueueSize() {
    return this.messageQueue.length;
  }

  /**
   * Clear queue
   */
  clearQueue() {
    this.messageQueue = [];
    this.logger.debug('Queue cleared');
  }

  /**
   * Destroy the modal
   */
  async destroy() {
    if (!this.isInitialized) {
      return;
    }

    try {
      this.logger.info('Destroying ActionableMessageModal...');

      // Close if showing
      if (this.isShowing) {
        this.close();
      }

      // Clear queue
      this.clearQueue();

      // Unsubscribe from events
      this.eventSubscriptions.forEach(unsubscribe => unsubscribe());
      this.eventSubscriptions = [];

      // Remove event listeners
      this.backdrop.removeEventListener('click', this.boundHandlers.backdropClick);
      document.removeEventListener('keydown', this.boundHandlers.escapeKey);

      // Remove DOM elements
      if (this.backdrop && this.backdrop.parentNode) {
        this.backdrop.parentNode.removeChild(this.backdrop);
      }

      this.modal = null;
      this.backdrop = null;

      this.isInitialized = false;
      this.logger.info('ActionableMessageModal destroyed successfully');

    } catch (error) {
      this.logger.error('Failed to destroy ActionableMessageModal:', error);
      throw error;
    }
  }
}

export default ActionableMessageModal;
