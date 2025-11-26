/**
 * app.js - Main application entry point
 * Initializes AppManager and registers MiniApps
 */

import { Logger, LoggerFactory } from './core/Logger.js';
import { AppManager } from './core/AppManager.js';
import { eventBus } from './core/EventBus.js';

// Import MiniApps
import { NotesApp } from './miniapps/NotesApp.js';
import { TasksApp } from './miniapps/TasksApp.js';
import { SettingsApp } from './miniapps/SettingsApp.js';

class App {
  constructor() {
    this.logger = LoggerFactory.getLogger('App');
    this.appManager = null;
    this.miniAppInstances = {};
  }

  /**
   * Initialize the application
   */
  async init() {
    try {
      this.logger.info('Starting application...');

      // Set log level (can be configured)
      LoggerFactory.setGlobalLevel(Logger.LOG_LEVELS.DEBUG);

      // Create AppManager with configuration
      this.appManager = new AppManager({
        database: {
          dbName: 'miniapp_db',
          remoteURL: null, // Set to CouchDB URL: 'http://localhost:5984/miniapp_db'
          syncRetryDelay: 5000
        },
        config: {
          maxMiniApps: 100
        }
      });

      // Make appManager globally accessible for debugging
      window.appManager = this.appManager;

      // Initialize AppManager
      await this.appManager.init();

      // Register MiniApps
      this.registerMiniApps();

      // Setup UI event listeners
      this.setupUI();

      // Mount initial MiniApps
      await this.mountInitialApps();

      // Setup global event listeners
      this.setupEventListeners();

      this.logger.info('Application initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize application:', error);
      this.showError('Failed to initialize application. Please refresh the page.');
    }
  }

  /**
   * Register all MiniApps
   */
  registerMiniApps() {
    this.logger.info('Registering MiniApps...');

    this.appManager.register(NotesApp);
    this.appManager.register(TasksApp);
    this.appManager.register(SettingsApp);

    this.logger.info(`Registered ${this.appManager.getRegisteredClasses().length} MiniApps`);
  }

  /**
   * Setup UI controls
   */
  setupUI() {
    // App controls
    const toggleNotesBtn = document.getElementById('toggle-notes');
    const toggleTasksBtn = document.getElementById('toggle-tasks');
    const toggleSettingsBtn = document.getElementById('toggle-settings');

    if (toggleNotesBtn) {
      toggleNotesBtn.addEventListener('click', () => this.toggleMiniApp('NotesApp', 'notes-container'));
    }

    if (toggleTasksBtn) {
      toggleTasksBtn.addEventListener('click', () => this.toggleMiniApp('TasksApp', 'tasks-container'));
    }

    if (toggleSettingsBtn) {
      toggleSettingsBtn.addEventListener('click', () => this.toggleMiniApp('SettingsApp', 'settings-container'));
    }

    // Status indicators
    this.updateNetworkStatus();
  }

  /**
   * Mount initial MiniApps
   */
  async mountInitialApps() {
    this.logger.info('Mounting initial MiniApps...');

    try {
      // Mount Notes and Tasks by default
      await this.mountMiniApp('NotesApp', 'notes-container');
      await this.mountMiniApp('TasksApp', 'tasks-container');

      this.logger.info('Initial MiniApps mounted');

    } catch (error) {
      this.logger.error('Failed to mount initial MiniApps:', error);
    }
  }

  /**
   * Mount a MiniApp
   */
  async mountMiniApp(className, containerSelector) {
    try {
      const container = document.getElementById(containerSelector);
      if (!container) {
        throw new Error(`Container not found: ${containerSelector}`);
      }

      const instance = await this.appManager.mount(className, {
        containerSelector: `#${containerSelector}`
      });

      this.miniAppInstances[className] = instance;
      this.updateButtonState(className, true);

      this.logger.info(`Mounted ${className}`);

    } catch (error) {
      this.logger.error(`Failed to mount ${className}:`, error);
      throw error;
    }
  }

  /**
   * Unmount a MiniApp
   */
  async unmountMiniApp(className) {
    try {
      const instance = this.miniAppInstances[className];
      if (!instance) {
        this.logger.warn(`MiniApp not mounted: ${className}`);
        return;
      }

      await this.appManager.unmount(instance.id);
      delete this.miniAppInstances[className];
      this.updateButtonState(className, false);

      this.logger.info(`Unmounted ${className}`);

    } catch (error) {
      this.logger.error(`Failed to unmount ${className}:`, error);
      throw error;
    }
  }

  /**
   * Toggle MiniApp visibility
   */
  async toggleMiniApp(className, containerSelector) {
    const instance = this.miniAppInstances[className];

    if (instance) {
      await this.unmountMiniApp(className);
    } else {
      await this.mountMiniApp(className, containerSelector);
    }
  }

  /**
   * Update button state
   */
  updateButtonState(className, isMounted) {
    const buttonId = `toggle-${className.toLowerCase().replace('app', '')}`;
    const button = document.getElementById(buttonId);

    if (button) {
      button.textContent = isMounted ? `Hide ${className}` : `Show ${className}`;
      button.classList.toggle('active', isMounted);
    }
  }

  /**
   * Setup global event listeners
   */
  setupEventListeners() {
    // Network status
    eventBus.on('network:online', () => {
      this.logger.info('Network online');
      this.updateNetworkStatus();
      this.showNotification('You are online', 'success');
    });

    eventBus.on('network:offline', () => {
      this.logger.info('Network offline');
      this.updateNetworkStatus();
      this.showNotification('You are offline', 'warning');
    });

    // Sync events
    eventBus.on('sync:started', () => {
      this.logger.info('Sync started');
      this.updateSyncStatus('Syncing...');
    });

    eventBus.on('sync:paused', () => {
      this.updateSyncStatus('Sync paused');
    });

    eventBus.on('sync:error', (error) => {
      this.logger.error('Sync error:', error);
      this.updateSyncStatus('Sync error');
    });

    // Database changes
    eventBus.on('db:change', (change) => {
      this.logger.debug('Database change:', change);
    });

    // App errors
    eventBus.on('app:error', (error) => {
      this.showError(error.message || 'An error occurred');
    });
  }

  /**
   * Update network status indicator
   */
  updateNetworkStatus() {
    const indicator = document.getElementById('network-status');
    if (indicator) {
      indicator.textContent = navigator.onLine ? 'Online' : 'Offline';
      indicator.className = navigator.onLine ? 'status-online' : 'status-offline';
    }
  }

  /**
   * Update sync status indicator
   */
  updateSyncStatus(status) {
    const indicator = document.getElementById('sync-status');
    if (indicator) {
      indicator.textContent = status;
    }
  }

  /**
   * Show notification
   */
  showNotification(message, type = 'info') {
    // Simple notification - could be enhanced with a toast system
    console.log(`[${type.toUpperCase()}] ${message}`);

    // Could implement a toast notification system here
  }

  /**
   * Show error
   */
  showError(message) {
    this.logger.error('Error:', message);
    alert(`Error: ${message}`);
  }

  /**
   * Destroy the application
   */
  async destroy() {
    try {
      this.logger.info('Destroying application...');

      if (this.appManager) {
        await this.appManager.destroy();
      }

      this.miniAppInstances = {};

      this.logger.info('Application destroyed');

    } catch (error) {
      this.logger.error('Failed to destroy application:', error);
    }
  }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
    window.app.init();
  });
} else {
  window.app = new App();
  window.app.init();
}

export { App };
