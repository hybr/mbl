/**
 * AppManager.js - Main application manager
 * Manages mini-app lifecycle, registration, and routing
 */

import { LoggerFactory } from './Logger.js';
import { eventBus } from './EventBus.js';
import { DatabaseManager } from './DatabaseManager.js';

class AppManager {
  constructor(options = {}) {
    this.logger = LoggerFactory.getLogger('AppManager');

    // Mini-app registry
    this.registry = new Map(); // className -> MiniApp constructor
    this.instances = new Map(); // instanceId -> MiniApp instance

    // Database manager
    this.dbManager = new DatabaseManager(options.database || {});

    // Configuration
    this.config = options.config || {};

    // State
    this.isInitialized = false;

    this.logger.info('AppManager constructed');
  }

  /**
   * Initialize the application
   */
  async init() {
    if (this.isInitialized) {
      this.logger.warn('AppManager already initialized');
      return;
    }

    try {
      this.logger.info('Initializing AppManager...');

      // Initialize database
      await this.dbManager.init();

      // Setup global error handler
      this.setupErrorHandler();

      // Setup global event listeners
      this.setupGlobalListeners();

      this.isInitialized = true;
      this.logger.info('AppManager initialized successfully');

      // Emit event
      eventBus.emit('app:initialized');

    } catch (error) {
      this.logger.error('Failed to initialize AppManager:', error);
      throw error;
    }
  }

  /**
   * Register a mini-app class
   */
  register(MiniAppClass, name = null) {
    const className = name || MiniAppClass.name;

    if (this.registry.has(className)) {
      this.logger.warn(`MiniApp already registered: ${className}`);
      return;
    }

    this.registry.set(className, MiniAppClass);
    this.logger.info(`MiniApp registered: ${className}`);

    // Emit event
    eventBus.emit('miniapp:registered', { className });
  }

  /**
   * Unregister a mini-app class
   */
  unregister(className) {
    if (!this.registry.has(className)) {
      this.logger.warn(`MiniApp not found in registry: ${className}`);
      return;
    }

    // Destroy all instances of this class
    const instances = this.getInstancesByClass(className);
    instances.forEach(instance => this.unmount(instance.id));

    this.registry.delete(className);
    this.logger.info(`MiniApp unregistered: ${className}`);

    // Emit event
    eventBus.emit('miniapp:unregistered', { className });
  }

  /**
   * Mount a mini-app instance
   */
  async mount(className, options = {}) {
    if (!this.isInitialized) {
      throw new Error('AppManager must be initialized before mounting mini-apps');
    }

    if (!this.registry.has(className)) {
      throw new Error(`MiniApp not registered: ${className}`);
    }

    try {
      const MiniAppClass = this.registry.get(className);

      // Inject database manager
      options.db = this.dbManager;

      // Create instance
      const instance = new MiniAppClass(options);

      // Store instance
      this.instances.set(instance.id, instance);

      // Initialize
      await instance.init();

      // Render
      await instance.render();

      this.logger.info(`MiniApp mounted: ${instance.id}`);

      // Emit event
      eventBus.emit('miniapp:mounted', {
        id: instance.id,
        name: instance.name,
        className
      });

      return instance;

    } catch (error) {
      this.logger.error(`Failed to mount MiniApp ${className}:`, error);
      throw error;
    }
  }

  /**
   * Unmount a mini-app instance
   */
  async unmount(instanceId) {
    const instance = this.instances.get(instanceId);

    if (!instance) {
      this.logger.warn(`MiniApp instance not found: ${instanceId}`);
      return;
    }

    try {
      await instance.destroy();
      this.instances.delete(instanceId);

      this.logger.info(`MiniApp unmounted: ${instanceId}`);

      // Emit event
      eventBus.emit('miniapp:unmounted', {
        id: instanceId,
        name: instance.name
      });

    } catch (error) {
      this.logger.error(`Failed to unmount MiniApp ${instanceId}:`, error);
      throw error;
    }
  }

  /**
   * Unmount all instances
   */
  async unmountAll() {
    const instanceIds = Array.from(this.instances.keys());

    for (const id of instanceIds) {
      await this.unmount(id);
    }

    this.logger.info('All mini-apps unmounted');
  }

  /**
   * Get a mini-app instance by ID
   */
  getInstance(instanceId) {
    return this.instances.get(instanceId);
  }

  /**
   * Get all instances of a specific class
   */
  getInstancesByClass(className) {
    return Array.from(this.instances.values()).filter(
      instance => instance.constructor.name === className
    );
  }

  /**
   * Get all active instances
   */
  getActiveInstances() {
    return Array.from(this.instances.values()).filter(
      instance => instance.isActive
    );
  }

  /**
   * Get all instances
   */
  getAllInstances() {
    return Array.from(this.instances.values());
  }

  /**
   * Show a mini-app instance
   */
  show(instanceId) {
    const instance = this.getInstance(instanceId);
    if (instance) {
      instance.show();
    }
  }

  /**
   * Hide a mini-app instance
   */
  hide(instanceId) {
    const instance = this.getInstance(instanceId);
    if (instance) {
      instance.hide();
    }
  }

  /**
   * Toggle visibility of a mini-app instance
   */
  toggle(instanceId) {
    const instance = this.getInstance(instanceId);
    if (instance) {
      if (instance.isActive) {
        instance.hide();
      } else {
        instance.show();
      }
    }
  }

  /**
   * Get registered mini-app classes
   */
  getRegisteredClasses() {
    return Array.from(this.registry.keys());
  }

  /**
   * Check if a class is registered
   */
  isRegistered(className) {
    return this.registry.has(className);
  }

  /**
   * Get mini-app count
   */
  getInstanceCount() {
    return this.instances.size;
  }

  /**
   * Get active mini-app count
   */
  getActiveCount() {
    return this.getActiveInstances().length;
  }

  /**
   * Setup global error handler
   */
  setupErrorHandler() {
    window.addEventListener('error', (event) => {
      this.logger.error('Global error:', event.error);
      eventBus.emit('app:error', event.error);
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.logger.error('Unhandled promise rejection:', event.reason);
      eventBus.emit('app:error', event.reason);
    });
  }

  /**
   * Setup global event listeners
   */
  setupGlobalListeners() {
    // Listen for database changes and route to relevant mini-apps
    eventBus.on('db:change', (change) => {
      this.instances.forEach(instance => {
        if (instance.isActive) {
          instance.onDataChanged(change);
        }
      });
    });

    // Listen for visibility changes (performance optimization)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.logger.debug('App hidden - pausing non-critical operations');
        eventBus.emit('app:hidden');
      } else {
        this.logger.debug('App visible - resuming operations');
        eventBus.emit('app:visible');
      }
    });
  }

  /**
   * Get application statistics
   */
  getStats() {
    return {
      registeredClasses: this.registry.size,
      totalInstances: this.instances.size,
      activeInstances: this.getActiveCount(),
      isInitialized: this.isInitialized,
      dbInfo: this.dbManager ? {
        isOnline: this.dbManager.isOnline,
        isSyncing: !!this.dbManager.syncHandler
      } : null
    };
  }

  /**
   * Destroy the application
   */
  async destroy() {
    try {
      this.logger.info('Destroying AppManager...');

      // Unmount all mini-apps
      await this.unmountAll();

      // Destroy database
      if (this.dbManager) {
        await this.dbManager.destroy();
      }

      // Clear registry
      this.registry.clear();

      this.isInitialized = false;
      this.logger.info('AppManager destroyed');

      // Emit event
      eventBus.emit('app:destroyed');

    } catch (error) {
      this.logger.error('Failed to destroy AppManager:', error);
      throw error;
    }
  }
}

export { AppManager };
