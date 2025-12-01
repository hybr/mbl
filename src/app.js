/**
 * app.js - Main application entry point
 * Initializes AppManager and registers MiniApps
 */

import { Logger, LoggerFactory } from './core/Logger.js';
import { AppManager } from './core/AppManager.js';
import { eventBus } from './core/EventBus.js';

// Import MiniApps
import { NotesApp } from './apps/NotesApp.js';
import { TasksApp } from './apps/TasksApp.js';
import { SettingsApp } from './apps/SettingsApp.js';
import { PersonManagementApp } from './apps/PersonManagementApp/PersonManagementApp.js';
import { DataViewerApp } from './apps/DataViewerApp/DataViewerApp.js';
import { OrganizationApp } from './apps/OrganizationApp/OrganizationApp.js';
import MessageInboxApp from './apps/MessageInboxApp/MessageInboxApp.js';
import { BranchManagementApp } from './apps/BranchManagementApp/BranchManagementApp.js';
import { EducationManagementApp } from './apps/EducationManagementApp/EducationManagementApp.js';
import { SkillManagementApp } from './apps/SkillManagementApp/SkillManagementApp.js';
import { RecruitmentManagementApp } from './apps/RecruitmentManagementApp/RecruitmentManagementApp.js';

class App {
  constructor() {
    this.logger = LoggerFactory.getLogger('App');
    this.appManager = null;
    this.miniAppInstances = {};
    this.currentUser = null;
    this.defaultOrganization = null;
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

      // Setup global event listeners BEFORE mounting apps
      // This ensures listeners are ready when session is restored
      this.setupEventListeners();

      // Mount initial MiniApps (this will restore session)
      await this.mountInitialApps();

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
    this.appManager.register(PersonManagementApp);
    this.appManager.register(DataViewerApp);
    this.appManager.register(OrganizationApp);
    this.appManager.register(MessageInboxApp);
    this.appManager.register(BranchManagementApp);
    this.appManager.register(EducationManagementApp);
    this.appManager.register(SkillManagementApp);
    this.appManager.register(RecruitmentManagementApp);

    this.logger.info(`Registered ${this.appManager.getRegisteredClasses().length} MiniApps`);
  }

  /**
   * Setup UI controls
   */
  setupUI() {
    // Welcome banner close button and auto-dismiss
    this.setupWelcomeBanner();

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

    // Data Viewer link
    const dataViewerLink = document.getElementById('data-viewer-link');
    if (dataViewerLink) {
      dataViewerLink.addEventListener('click', async (e) => {
        e.preventDefault();
        await this.toggleMiniApp('DataViewerApp', 'dataviewer-container');
      });
    }

    // Organization link
    const organizationLink = document.getElementById('organization-link');
    if (organizationLink) {
      organizationLink.addEventListener('click', async (e) => {
        e.preventDefault();
        await this.toggleMiniApp('OrganizationApp', 'organization-container');
      });
    }

    // Auth link
    const authLink = document.getElementById('auth-link');
    if (authLink) {
      authLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleAuthClick();
      });
    }

    // Branch link
    const branchLink = document.getElementById('branch-link');
    if (branchLink) {
      branchLink.addEventListener('click', async (e) => {
        e.preventDefault();
        await this.toggleMiniApp('BranchManagementApp', 'branch-container');
      });
    }

    // Education link
    const educationLink = document.getElementById('education-link');
    if (educationLink) {
      educationLink.addEventListener('click', async (e) => {
        e.preventDefault();
        await this.toggleMiniApp('EducationManagementApp', 'education-container');
      });
    }

    // Status indicators
    this.updateNetworkStatus();

    // Load and display default organization
    this.loadDefaultOrganization();

    // Listen for organization changes
    eventBus.on('organization:setDefault', (org) => {
      this.setDefaultOrganization(org);
    });
  }

  /**
   * Get container selector for a MiniApp class
   */
  getContainerSelector(className) {
    const selectorMap = {
      'NotesApp': 'notes-container',
      'TasksApp': 'tasks-container',
      'SettingsApp': 'settings-container',
      'PersonManagementApp': 'person-container',
      'DataViewerApp': 'dataviewer-container',
      'OrganizationApp': 'organization-container',
      'MessageInboxApp': 'inbox-container',
      'BranchManagementApp': 'branch-container',
      'EducationManagementApp': 'education-container',
      'SkillManagementApp': 'skill-container',
      'RecruitmentManagementApp': 'recruitment-container'
    };
    return selectorMap[className] || `${className.toLowerCase()}-container`;
  }

  /**
   * Mount initial MiniApps
   */
  async mountInitialApps() {
    this.logger.info('Mounting initial MiniApps...');

    try {
      // Mount PersonManagementApp first to restore session
      // await this.mountMiniApp('PersonManagementApp', 'person-container');

      // Mount Notes and Tasks by default
      // await this.mountMiniApp('NotesApp', 'notes-container');
      // await this.mountMiniApp('TasksApp', 'tasks-container');

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
      const grid = document.getElementById('miniapp-grid');
      if (!grid) {
        throw new Error('MiniApp grid not found');
      }

      // Check if container already exists
      let container = document.getElementById(containerSelector);

      if (!container) {
        // Create wrapper with close button
        const wrapper = document.createElement('div');
        wrapper.className = 'miniapp-wrapper';
        wrapper.id = `${containerSelector}-wrapper`;

        // Create close button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'miniapp-close-btn';
        closeBtn.innerHTML = '&times;';
        closeBtn.title = 'Close';
        closeBtn.setAttribute('aria-label', 'Close');
        closeBtn.addEventListener('click', async () => {
          await this.unmountMiniApp(className);
        });

        // Create container
        container = document.createElement('div');
        container.id = containerSelector;
        container.className = 'miniapp-container';
        container.dataset.miniapp = className.toLowerCase().replace('app', '');

        // Assemble wrapper
        wrapper.appendChild(closeBtn);
        wrapper.appendChild(container);

        // Prepend to grid (adds to front)
        grid.insertBefore(wrapper, grid.firstChild);
      } else {
        // If container exists, make sure it's visible
        const wrapper = container.closest('.miniapp-wrapper');
        if (wrapper) {
          wrapper.style.display = 'block';
        }
        container.style.display = 'flex';
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

      // Remove the wrapper from DOM
      const containerSelector = this.getContainerSelector(className);
      const container = document.getElementById(containerSelector);
      if (container) {
        const wrapper = container.closest('.miniapp-wrapper');
        if (wrapper) {
          wrapper.remove();
        }
      }

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

      // Move focus to the mounted app
      const container = document.getElementById(containerSelector);
      if (container) {
        // Scroll the container into view smoothly
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Optional: Set focus on the container for keyboard navigation
        container.setAttribute('tabindex', '-1');
        container.focus();
      }
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

    // Person management events
    eventBus.on('person:login', (person) => {
      this.currentUser = person;
      this.updateAuthLink();
      this.logger.info('User logged in:', person.username);
    });

    eventBus.on('person:logout', () => {
      this.currentUser = null;
      this.updateAuthLink();
      this.logger.info('User logged out');
    });

    // Auth focus event - close other apps when showing auth screens
    eventBus.on('auth:focus', () => {
      this.closeOtherApps();
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
   * Handle auth link click
   */
  async handleAuthClick() {
    // Mount PersonManagementApp if not already mounted
    if (!this.miniAppInstances['PersonManagementApp']) {
      await this.mountMiniApp('PersonManagementApp', 'person-container');
    }

    // Make container visible
    const container = document.getElementById('person-container');
    if (container) {
      container.style.display = 'block';
    }

    const personApp = this.miniAppInstances['PersonManagementApp'];
    if (!personApp) return;

    if (this.currentUser) {
      // Show profile view for current user
      personApp.showProfileView();
    } else {
      // Show login view
      personApp.showLoginView();
    }
  }

  /**
   * Setup welcome banner with close button and auto-dismiss
   */
  setupWelcomeBanner() {
    const banner = document.getElementById('welcome-banner');
    const closeBtn = document.getElementById('welcome-banner-close');

    if (!banner) return;

    // Check if banner was previously dismissed
    const bannerDismissed = localStorage.getItem('welcomeBannerDismissed');
    if (bannerDismissed === 'true') {
      banner.style.display = 'none';
      return;
    }

    // Close button handler
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.dismissWelcomeBanner();
      });
    }

    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      this.dismissWelcomeBanner();
    }, 10000);
  }

  /**
   * Dismiss welcome banner with animation
   */
  dismissWelcomeBanner() {
    const banner = document.getElementById('welcome-banner');
    if (!banner) return;

    // Add fade-out animation
    banner.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
    banner.style.opacity = '0';
    banner.style.transform = 'translateY(-20px)';

    // Remove from DOM after animation
    setTimeout(() => {
      banner.style.display = 'none';
      // Save dismissal state to localStorage
      localStorage.setItem('welcomeBannerDismissed', 'true');
    }, 500);

    this.logger.info('Welcome banner dismissed');
  }

  /**
   * Close all apps except PersonManagementApp
   */
  async closeOtherApps() {
    const appsToClose = Object.keys(this.miniAppInstances).filter(
      name => name !== 'PersonManagementApp'
    );

    for (const appName of appsToClose) {
      await this.unmountMiniApp(appName);
    }

    this.logger.info('Closed other apps for auth focus');
  }

  /**
   * Update auth link text and appearance
   */
  updateAuthLink() {
    const authLink = document.getElementById('auth-link');
    if (authLink) {
      if (this.currentUser) {
        authLink.textContent = 'My';
        authLink.classList.add('logged-in');
      } else {
        authLink.textContent = 'Login';
        authLink.classList.remove('logged-in');
      }
    }
  }

  /**
   * Load default organization from localStorage
   */
  loadDefaultOrganization() {
    try {
      const storedOrg = localStorage.getItem('defaultOrganization');
      if (storedOrg) {
        this.defaultOrganization = JSON.parse(storedOrg);
        this.updateOrganizationLink();
      }
    } catch (error) {
      this.logger.error('Failed to load default organization:', error);
    }
  }

  /**
   * Set default organization
   */
  setDefaultOrganization(organization) {
    try {
      if (organization === null) {
        this.clearDefaultOrganization();
        return;
      }

      this.defaultOrganization = organization;
      localStorage.setItem('defaultOrganization', JSON.stringify(organization));
      this.updateOrganizationLink();
      this.logger.info('Default organization set:', organization.name);

      // Emit event for other apps
      eventBus.emit('organization:defaultChanged', organization);
    } catch (error) {
      this.logger.error('Failed to set default organization:', error);
    }
  }

  /**
   * Clear default organization
   */
  clearDefaultOrganization() {
    this.defaultOrganization = null;
    localStorage.removeItem('defaultOrganization');
    this.updateOrganizationLink();
    eventBus.emit('organization:defaultChanged', null);
  }

  /**
   * Update organization link text to show default org
   */
  updateOrganizationLink() {
    const orgLink = document.getElementById('organization-link');
    if (orgLink) {
      if (this.defaultOrganization && this.defaultOrganization.name) {
        // Show first 10 characters of organization name
        const displayName = this.defaultOrganization.name.substring(0, 10);
        orgLink.textContent = displayName;
        orgLink.classList.add('has-default-org');
        orgLink.title = this.defaultOrganization.name; // Show full name on hover
      } else {
        orgLink.textContent = 'Org';
        orgLink.classList.remove('has-default-org');
        orgLink.title = 'Organizations';
      }
    }
  }

  /**
   * Show notification
   */
  showNotification(message, type = 'info') {
    // Use MessageService if available
    if (window.messageService) {
      window.messageService.sendToast(message, type);
    } else {
      // Fallback to console
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
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
