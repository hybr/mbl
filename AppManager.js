/**
 * AppManager
 * Global manager for multiple MiniApps
 * Handles registration, lifecycle, and event communication between MiniApps
 */

class AppManager {
  constructor() {
    this.apps = new Map();
    this.eventListeners = new Map();
    this.config = {
      maxApps: 10,
      autoInit: true
    };
  }

  /**
   * Register a MiniApp with the manager
   */
  register(app, name = null) {
    // Auto-generate name if not provided
    const appName = name || app.constructor.name + '_' + this.apps.size;

    // Check if max apps limit reached
    if (this.apps.size >= this.config.maxApps) {
      throw new Error('Maximum number of apps reached');
    }

    // Check if app has required methods
    if (typeof app.init !== 'function') {
      throw new Error('MiniApp must have an init() method');
    }

    if (typeof app.destroy !== 'function') {
      throw new Error('MiniApp must have a destroy() method');
    }

    // Register the app
    this.apps.set(appName, {
      instance: app,
      initialized: false,
      name: appName
    });

    console.log(`AppManager: Registered app "${appName}"`);

    // Auto-initialize if configured
    if (this.config.autoInit && typeof app.init === 'function') {
      this.initializeApp(appName);
    }

    return appName;
  }

  /**
   * Unregister a MiniApp
   */
  unregister(name) {
    const app = this.apps.get(name);

    if (!app) {
      console.warn(`AppManager: App "${name}" not found`);
      return false;
    }

    // Destroy the app if it has a destroy method
    if (typeof app.instance.destroy === 'function') {
      app.instance.destroy();
    }

    this.apps.delete(name);
    console.log(`AppManager: Unregistered app "${name}"`);

    return true;
  }

  /**
   * Initialize a specific app
   */
  async initializeApp(name) {
    const app = this.apps.get(name);

    if (!app) {
      throw new Error(`App "${name}" not found`);
    }

    if (app.initialized) {
      console.warn(`AppManager: App "${name}" already initialized`);
      return;
    }

    try {
      await app.instance.init();
      app.initialized = true;
      console.log(`AppManager: Initialized app "${name}"`);

      // Emit initialization event
      this.emit('app:initialized', { name, app: app.instance });
    } catch (error) {
      console.error(`AppManager: Failed to initialize app "${name}"`, error);
      throw error;
    }
  }

  /**
   * Initialize all registered apps
   */
  async initializeAll() {
    const promises = [];

    for (let [name, app] of this.apps) {
      if (!app.initialized) {
        promises.push(this.initializeApp(name));
      }
    }

    await Promise.all(promises);
    console.log('AppManager: All apps initialized');
  }

  /**
   * Get a registered app by name
   */
  getApp(name) {
    const app = this.apps.get(name);
    return app ? app.instance : null;
  }

  /**
   * Get all registered apps
   */
  getAllApps() {
    const apps = {};
    for (let [name, app] of this.apps) {
      apps[name] = app.instance;
    }
    return apps;
  }

  /**
   * Check if an app is registered
   */
  hasApp(name) {
    return this.apps.has(name);
  }

  /**
   * Event system - subscribe to events
   */
  on(eventName, callback) {
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, []);
    }

    this.eventListeners.get(eventName).push(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.eventListeners.get(eventName);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }

  /**
   * Event system - emit events
   */
  emit(eventName, data) {
    const listeners = this.eventListeners.get(eventName);

    if (!listeners || listeners.length === 0) {
      return;
    }

    listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`AppManager: Error in event listener for "${eventName}"`, error);
      }
    });
  }

  /**
   * Event system - remove all listeners for an event
   */
  off(eventName) {
    this.eventListeners.delete(eventName);
  }

  /**
   * Destroy all apps and clean up
   */
  destroyAll() {
    for (let [name, app] of this.apps) {
      if (typeof app.instance.destroy === 'function') {
        app.instance.destroy();
      }
    }

    this.apps.clear();
    this.eventListeners.clear();

    console.log('AppManager: All apps destroyed');
  }

  /**
   * Get manager statistics
   */
  getStats() {
    let initialized = 0;
    let total = this.apps.size;

    for (let app of this.apps.values()) {
      if (app.initialized) {
        initialized++;
      }
    }

    return {
      total,
      initialized,
      uninitialized: total - initialized,
      events: this.eventListeners.size
    };
  }

  /**
   * Configure the AppManager
   */
  configure(config) {
    this.config = { ...this.config, ...config };
  }
}

// Export for use in modules or global scope
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AppManager;
}
