/**
 * OrganizationApp.js - Organization Management MiniApp
 * Handles organization profiles with CRUD operations
 * Users must be logged in to create organizations
 */

import { MiniApp } from '../../core/MiniApp.js';
import { Notification } from '../../utils/Notification.js';

// Constants
import {
  VIEW_MODES,
  DEFAULT_ORGANIZATION_KEY,
  SESSION_STORAGE_KEY
} from './constants.js';

// Data Loaders
import {
  loadOrganizationTypes as _loadOrganizationTypes,
  loadIndustries as _loadIndustries,
  loadOrganizations as _loadOrganizations,
  saveOrganization as _saveOrganization,
  deleteOrganization as _deleteOrganization,
  createIndexes,
  checkCurrentUser,
  isSubdomainUnique
} from './dataLoaders.js';

// View Helpers
import {
  validateSubdomain,
  isDefaultOrganization
} from './viewHelpers.js';

// Views
import { renderListView } from './views/ListView.js';
import { renderEditView } from './views/EditView.js';
import { renderViewDetails } from './views/ViewDetails.js';

class OrganizationApp extends MiniApp {
  constructor(options = {}) {
    super({
      name: 'OrganizationApp',
      ...options
    });

    this.organizations = [];
    this.organizationTypes = [];
    this.industries = [];
    this.currentOrganization = null;
    this.currentView = VIEW_MODES.LIST;
    this.currentUser = null;
    this.components = {};

    // Track which organizations user has access to
    this.myOrganizations = []; // Organizations I created
    this.workerOrganizations = []; // Organizations where I'm a worker
  }

  /**
   * Initialize the app
   */
  async onInit() {
    this.logger.info('Initializing OrganizationApp');

    // Initialize organizations array to prevent undefined errors
    this.organizations = [];

    // Load reference data
    await this.loadOrganizationTypes();
    await this.loadIndustries();

    // Create indexes for fast queries
    await createIndexes(this.db, this.logger);

    // Subscribe to organization data changes
    this.subscribeToData('organization', (change) => {
      this.handleOrganizationChange(change);
    });

    // Listen for login/logout events
    this.subscribe('person:login', (user) => {
      this.currentUser = user;
      this.loadOrganizations();
      if (this.isRendered) {
        this.render();
      }
    });

    this.subscribe('person:logout', () => {
      this.currentUser = null;
      this.organizations = [];
      if (this.isRendered) {
        this.render();
      }
    });

    // Check if user is already logged in
    await this.checkCurrentUser();

    // Load organizations for current user
    await this.loadOrganizations();
  }

  /**
   * Check if user is currently logged in
   */
  async checkCurrentUser() {
    this.currentUser = await checkCurrentUser(this.db, SESSION_STORAGE_KEY, this.logger);
  }

  /**
   * Load organization types
   */
  async loadOrganizationTypes() {
    this.organizationTypes = await _loadOrganizationTypes(this.logger);
  }

  /**
   * Load industries
   */
  async loadIndustries() {
    this.industries = await _loadIndustries(this.logger);
  }

  /**
   * Load organizations for current user
   */
  async loadOrganizations() {
    const result = await _loadOrganizations(this.db, this.currentUser, this.logger);
    this.organizations = result.organizations;
    this.myOrganizations = result.myOrganizations;
    this.workerOrganizations = result.workerOrganizations;

    // Auto-select first organization if none is selected
    if (this.organizations.length > 0) {
      this.checkAndSetDefaultOrganization();
    }

    // Update UI if rendered
    if (this.isRendered) {
      this.render();
    }
  }

  /**
   * Render the UI
   */
  async onRender() {
    this.clearContainer();

    // Check if user is logged in
    if (!this.currentUser && this.currentView !== VIEW_MODES.LIST) {
      this.currentView = VIEW_MODES.LIST;
    }

    // Render based on current view
    switch (this.currentView) {
      case VIEW_MODES.LIST:
        renderListView(this);
        break;
      case VIEW_MODES.EDIT:
        renderEditView(this);
        break;
      case VIEW_MODES.VIEW:
        renderViewDetails(this);
        break;
    }

    if (this.currentView === VIEW_MODES.LIST && this.currentUser && this.organizations.length > 0) {
      this.checkAndSetDefaultOrganization();
    }
  }

  /**
   * Show list view
   */
  showListView() {
    this.currentView = VIEW_MODES.LIST;
    this.currentOrganization = null;
    this.render();
  }

  /**
   * Show edit view
   */
  showEditView(organization) {
    if (!this.currentUser) {
      Notification.error('Please log in to create or edit organizations');
      return;
    }

    this.currentView = VIEW_MODES.EDIT;
    this.currentOrganization = organization;
    this.render();
  }

  /**
   * Show view details
   */
  showViewDetails(organization) {
    this.currentView = VIEW_MODES.VIEW;
    this.currentOrganization = organization;
    this.render();
  }

  /**
   * Open DataViewerApp
   */
  openDataViewer() {
    // Emit event to toggle DataViewerApp
    this.emit('app:toggleMiniApp', {
      className: 'DataViewerApp',
      containerSelector: 'dataviewer-container'
    });

    // Alternative: Use the global app instance if available
    if (window.app && window.app.toggleMiniApp) {
      window.app.toggleMiniApp('DataViewerApp', 'dataviewer-container');
    }

    this.logger.info('Opening DataViewerApp');
  }

  /**
   * Open BranchManagementApp
   */
  openBranchManagement() {
    // Emit event to toggle BranchManagementApp
    this.emit('app:toggleMiniApp', {
      className: 'BranchManagementApp',
      containerSelector: 'branch-container'
    });

    // Alternative: Use the global app instance if available
    if (window.app && window.app.toggleMiniApp) {
      window.app.toggleMiniApp('BranchManagementApp', 'branch-container');
    }

    this.logger.info('Opening BranchManagementApp');
  }

  /**
   * Open HiringManagementApp
   */
  openHiringManagement() {
    // Emit event to toggle HiringManagementApp
    this.emit('app:toggleMiniApp', {
      className: 'RecruitmentManagementApp',
      containerSelector: 'recruitment-container'
    });

    // Alternative: Use the global app instance if available
    if (window.app && window.app.toggleMiniApp) {
      window.app.toggleMiniApp('RecruitmentManagementApp', 'recruitment-container');
    }

    this.logger.info('Opening RecruitmentManagementApp');
  }

  /**
   * Save organization
   */
  async saveOrganization() {
    if (!this.currentUser) {
      Notification.error('You must be logged in to create organizations');
      return;
    }

    // Get form values
    const name = this.components.nameInput.getValue().trim();
    const legalTypeId = parseInt(document.getElementById('org-type-select').value);
    const industryId = parseInt(document.getElementById('org-industry-select').value);
    const tagline = this.components.taglineInput.getValue().trim();
    const logo = this.components.logoInput.getValue().trim();
    const subdomain = this.components.subdomainInput.getValue().trim().toLowerCase();
    const website = this.components.websiteInput.getValue().trim();
    const phone = this.components.phoneInput.getValue().trim();
    const email = this.components.emailInput.getValue().trim();

    // Validate required fields
    if (!name) {
      Notification.error('Organization name is required');
      return;
    }

    if (!legalTypeId) {
      Notification.error('Legal type is required');
      return;
    }

    if (!industryId) {
      Notification.error('Industry is required');
      return;
    }

    if (!subdomain) {
      Notification.error('Subdomain is required');
      return;
    }

    // Validate subdomain format
    if (!validateSubdomain(subdomain)) {
      Notification.error('Subdomain must be 3-63 characters, lowercase letters, numbers, and hyphens only');
      return;
    }

    // Check subdomain uniqueness
    const isUnique = await isSubdomainUnique(this.db, subdomain, this.currentOrganization?._id, this.logger);
    if (!isUnique) {
      Notification.error(`Subdomain "${subdomain}" is already taken. Please choose another.`);
      return;
    }

    try {
      const isEdit = this.currentOrganization !== null;

      const orgData = {
        type: 'organization',
        name,
        legalTypeId,
        industryId,
        tagline,
        logo,
        subdomain,
        website,
        phone,
        email,
        createdBy: this.currentUser._id,
        createdByUsername: this.currentUser.username,
        workers: [] // Initialize empty workers array
      };

      if (isEdit) {
        // Update existing - preserve workers array
        orgData._id = this.currentOrganization._id;
        orgData._rev = this.currentOrganization._rev;
        orgData.createdAt = this.currentOrganization.createdAt;
        orgData.updatedAt = new Date().toISOString();
        orgData.workers = this.currentOrganization.workers || []; // Preserve workers
      } else {
        // Create new
        orgData._id = `org_${Date.now()}`;
        orgData.createdAt = new Date().toISOString();
      }

      await _saveOrganization(this.db, orgData, isEdit, this.logger);
      Notification.success(isEdit ? 'Organization updated successfully' : 'Organization created successfully');

      if (!isEdit) {
        // Emit event
        this.emit('organization:created', orgData);
      }

      // Return to list view
      this.showListView();

    } catch (error) {
      this.logger.error('Failed to save organization:', error);
      Notification.error('Failed to save organization. Please try again.');
    }
  }

  /**
   * Delete organization
   */
  async deleteOrganization(org) {
    if (!confirm(`Are you sure you want to delete "${org.name}"?`)) {
      return;
    }

    try {
      // Check if this is the default organization
      const isDefault = isDefaultOrganization(org);

      await _deleteOrganization(this.db, org, this.logger);
      Notification.success('Organization deleted successfully');

      // If deleted org was default, clear it and let auto-select handle setting new default
      if (isDefault) {
        localStorage.removeItem(DEFAULT_ORGANIZATION_KEY);
        this.emit('organization:defaultChanged', null);
      }

      // Emit event
      this.emit('organization:deleted', org);

    } catch (error) {
      this.logger.error('Failed to delete organization:', error);
      Notification.error('Failed to delete organization. Please try again.');
    }
  }

  /**
   * Check if there's a default organization, if not set the first one
   */
  checkAndSetDefaultOrganization() {
    try {
      // Check if default organization exists in localStorage
      const storedOrg = localStorage.getItem(DEFAULT_ORGANIZATION_KEY);

      if (!storedOrg && this.organizations.length > 0) {
        // No default set, select first organization
        const firstOrg = this.organizations[0];
        this.logger.info('Auto-selecting first organization as default:', firstOrg.name);
        this.setAsDefaultOrganization(firstOrg, true); // true = silent mode
      } else if (storedOrg) {
        // Verify the stored organization still exists in current list
        const parsed = JSON.parse(storedOrg);
        const exists = this.organizations.some(org => org._id === parsed._id);

        if (!exists && this.organizations.length > 0) {
          // Stored org no longer exists, select first
          const firstOrg = this.organizations[0];
          this.logger.info('Previous default org not found, auto-selecting first:', firstOrg.name);
          this.setAsDefaultOrganization(firstOrg, true);
        }
      }
    } catch (error) {
      this.logger.error('Failed to check/set default organization:', error);
    }
  }

  /**
   * Set organization as default
   */
  setAsDefaultOrganization(org, silent = false) {
    try {
      this.logger.info('Setting default organization:', org.name);

      // Emit event to main app
      this.emit('organization:defaultChanged', org);

      if (!silent) {
        Notification.success(`"${org.name}" set as default organization`);
      }

      // Trigger re-render to update active state
      if (this.isRendered && this.currentView === VIEW_MODES.LIST) {
        this.render();
      }
    } catch (error) {
      this.logger.error('Failed to set default organization:', error);
      if (!silent) {
        Notification.error('Failed to set default organization. Please try again.');
      }
    }
  }

  /**
   * Handle organization change from database
   */
  handleOrganizationChange(change) {
    this.logger.debug('Organization change detected:', change);

    // Only show changes for current user's organizations
    if (change.doc && change.doc.createdBy !== this.currentUser?._id) {
      return;
    }

    if (change.deleted) {
      // Remove from local array
      this.organizations = this.organizations.filter(o => o._id !== change.id);
    } else {
      // Add or update
      const index = this.organizations.findIndex(o => o._id === change.doc._id);
      if (index >= 0) {
        this.organizations[index] = change.doc;
      } else {
        this.organizations.unshift(change.doc);
      }
    }

    // Update UI if in list view
    if (this.isRendered && this.currentView === VIEW_MODES.LIST) {
      this.render();
    }
  }

  /**
   * Clean up on destroy
   */
  onDestroy() {
    // Destroy components
    Object.values(this.components).forEach(component => {
      if (component.destroy) {
        component.destroy();
      }
    });

    this.logger.info('OrganizationApp destroyed');
  }
}

export { OrganizationApp };
