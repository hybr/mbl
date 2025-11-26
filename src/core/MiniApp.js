/**
 * MiniApp.js - Base class for all mini-applications
 * Every mini-app must extend this class
 */

import { LoggerFactory } from './Logger.js';
import { eventBus } from './EventBus.js';

class MiniApp {
  constructor(options = {}) {
    // Required properties
    this.id = options.id || this.constructor.name + '_' + Date.now();
    this.name = options.name || this.constructor.name;

    // DOM container
    this.container = options.container || null;
    this.containerSelector = options.containerSelector || null;

    // State
    this.isInitialized = false;
    this.isRendered = false;
    this.isActive = true;

    // Configuration
    this.config = options.config || {};

    // Logger
    this.logger = LoggerFactory.getLogger(this.name);

    // Event subscriptions (for cleanup)
    this.eventSubscriptions = [];
    this.dbSubscriptions = [];

    // DOM event listeners (for cleanup)
    this.domListeners = [];

    // Database manager reference (injected by AppManager)
    this.db = options.db || null;

    this.logger.debug(`MiniApp constructed: ${this.id}`);
  }

  /**
   * Initialize the mini-app
   * Override this in subclasses for custom initialization
   */
  async init() {
    if (this.isInitialized) {
      this.logger.warn('MiniApp already initialized');
      return;
    }

    try {
      // Find or create container
      if (this.containerSelector) {
        this.container = document.querySelector(this.containerSelector);
      }

      if (!this.container) {
        throw new Error('Container not found or not provided');
      }

      // Set container attributes
      this.container.dataset.miniappId = this.id;
      this.container.dataset.miniappName = this.name;

      // Call lifecycle hook
      await this.onInit();

      this.isInitialized = true;
      this.logger.info('MiniApp initialized');

      // Emit event
      eventBus.emit('miniapp:initialized', { id: this.id, name: this.name });

    } catch (error) {
      this.logger.error('Failed to initialize MiniApp:', error);
      throw error;
    }
  }

  /**
   * Lifecycle hook: called during initialization
   * Override in subclasses
   */
  async onInit() {
    // Override in subclass
  }

  /**
   * Render the UI
   * Must be implemented by subclasses
   */
  async render() {
    if (!this.isInitialized) {
      throw new Error('MiniApp must be initialized before rendering');
    }

    try {
      // Call lifecycle hook
      await this.onRender();

      this.isRendered = true;
      this.logger.debug('MiniApp rendered');

      // Emit event
      eventBus.emit('miniapp:rendered', { id: this.id, name: this.name });

    } catch (error) {
      this.logger.error('Failed to render MiniApp:', error);
      throw error;
    }
  }

  /**
   * Lifecycle hook: called during rendering
   * Must be implemented by subclasses
   */
  async onRender() {
    throw new Error('onRender() must be implemented by subclass');
  }

  /**
   * Handle data changes from PouchDB
   * Override in subclasses to handle specific data
   */
  onDataChanged(change) {
    // Override in subclass
    this.logger.debug('Data changed:', change);
  }

  /**
   * Subscribe to database changes for a collection
   */
  subscribeToData(collection, callback) {
    if (!this.db) {
      this.logger.warn('No database manager available');
      return () => {};
    }

    const unsubscribe = this.db.subscribe(collection, callback, this);
    this.dbSubscriptions.push(unsubscribe);

    return unsubscribe;
  }

  /**
   * Subscribe to EventBus events
   */
  subscribe(event, callback) {
    const unsubscribe = eventBus.on(event, callback, this);
    this.eventSubscriptions.push(unsubscribe);

    return unsubscribe;
  }

  /**
   * Emit event to EventBus
   */
  emit(event, data) {
    eventBus.emit(event, data);
  }

  /**
   * Add DOM event listener with automatic cleanup tracking
   */
  addEventListener(element, event, handler, options) {
    const boundHandler = handler.bind(this);
    element.addEventListener(event, boundHandler, options);

    this.domListeners.push({
      element,
      event,
      handler: boundHandler,
      options
    });
  }

  /**
   * Create element helper
   */
  createElement(tag, attributes = {}, children = []) {
    const element = document.createElement(tag);

    // Set attributes
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'className') {
        element.className = value;
      } else if (key === 'dataset') {
        Object.entries(value).forEach(([dataKey, dataValue]) => {
          element.dataset[dataKey] = dataValue;
        });
      } else if (key.startsWith('on') && typeof value === 'function') {
        const eventName = key.substring(2).toLowerCase();
        this.addEventListener(element, eventName, value);
      } else {
        element.setAttribute(key, value);
      }
    });

    // Add children
    children.forEach(child => {
      if (typeof child === 'string') {
        element.appendChild(document.createTextNode(child));
      } else if (child instanceof HTMLElement) {
        element.appendChild(child);
      }
    });

    return element;
  }

  /**
   * Clear container
   */
  clearContainer() {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }

  /**
   * Show the mini-app
   */
  show() {
    if (this.container) {
      this.container.style.display = '';
      this.isActive = true;
      this.onShow();
      eventBus.emit('miniapp:shown', { id: this.id, name: this.name });
    }
  }

  /**
   * Hide the mini-app
   */
  hide() {
    if (this.container) {
      this.container.style.display = 'none';
      this.isActive = false;
      this.onHide();
      eventBus.emit('miniapp:hidden', { id: this.id, name: this.name });
    }
  }

  /**
   * Lifecycle hooks
   */
  onShow() {
    // Override in subclass
  }

  onHide() {
    // Override in subclass
  }

  onDestroy() {
    // Override in subclass
  }

  /**
   * Destroy the mini-app and clean up resources
   */
  async destroy() {
    if (!this.isInitialized) {
      return;
    }

    try {
      this.logger.info('Destroying MiniApp');

      // Call lifecycle hook
      await this.onDestroy();

      // Unsubscribe from all events
      this.eventSubscriptions.forEach(unsubscribe => unsubscribe());
      this.eventSubscriptions = [];

      // Unsubscribe from database changes
      this.dbSubscriptions.forEach(unsubscribe => unsubscribe());
      this.dbSubscriptions = [];

      // Remove all DOM event listeners
      this.domListeners.forEach(({ element, event, handler, options }) => {
        element.removeEventListener(event, handler, options);
      });
      this.domListeners = [];

      // Clear and remove container
      if (this.container) {
        this.container.innerHTML = '';
        this.container.dataset.miniappId = '';
        this.container.dataset.miniappName = '';
      }

      // Reset state
      this.isInitialized = false;
      this.isRendered = false;
      this.isActive = false;

      // Emit event
      eventBus.emit('miniapp:destroyed', { id: this.id, name: this.name });

      this.logger.info('MiniApp destroyed successfully');

    } catch (error) {
      this.logger.error('Failed to destroy MiniApp:', error);
      throw error;
    }
  }

  /**
   * Get mini-app metadata
   */
  getMetadata() {
    return {
      id: this.id,
      name: this.name,
      isInitialized: this.isInitialized,
      isRendered: this.isRendered,
      isActive: this.isActive
    };
  }
}

export { MiniApp };
