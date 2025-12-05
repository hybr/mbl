/**
 * InventoryLocationApp.js - Inventory Location Management MiniApp
 *
 * Manages hierarchical inventory locations within buildings,
 * tracks inventory movements, implements barcode/QR scanning,
 * monitors alerts, and maintains audit trails.
 */

import { MiniApp } from '../../core/MiniApp.js';
import { VIEW_MODES, USER_ROLES, STATUS_OPTIONS } from './constants.js';
import { createIndexes } from './dataLoaders.js';

export class InventoryLocationApp extends MiniApp {
  constructor(options = {}) {
    super({
      name: 'InventoryLocationApp',
      ...options
    });

    // Current view state
    this.currentView = VIEW_MODES.LIST;
    this.previousView = null;

    // Data collections
    this.buildings = [];
    this.locations = [];
    this.movements = [];
    this.alerts = [];

    // Current context
    this.currentOrganization = null;
    this.currentBranch = null;
    this.currentBuilding = null;
    this.currentLocation = null;
    this.currentMovement = null;
    this.currentUser = null;

    // Filter and search state
    this.searchTerm = '';
    this.filterType = 'all';
    this.filterStatus = 'all';
    this.sortBy = 'code';
    this.sortOrder = 'asc';

    // Pagination
    this.currentPage = 1;
    this.itemsPerPage = 50;

    // Component instances
    this.components = {};

    // Expanded nodes for hierarchy view
    this.expandedNodes = new Set();
  }

  /**
   * Initialize the app
   */
  async onInit() {
    try {
      this.logger.info('Initializing InventoryLocationApp...');

      // Create database indexes
      await createIndexes(this.db, this.logger);

      // Subscribe to database changes
      this.subscribeToData('location', (change) => {
        this.handleLocationChange(change);
      });

      this.subscribeToData('movement', (change) => {
        this.handleMovementChange(change);
      });

      this.subscribeToData('alert', (change) => {
        this.handleAlertChange(change);
      });

      // Subscribe to organization events
      this.subscribe('organization:setDefault', (org) => {
        this.handleOrganizationChanged(org);
      });

      this.subscribe('organization:defaultChanged', (org) => {
        this.handleOrganizationChanged(org);
      });

      // Subscribe to person events
      this.subscribe('person:login', (user) => {
        this.currentUser = user;
        this.logger.info('User logged in:', user.username);
        this.loadBuildings();
        if (this.isRendered) this.render();
      });

      this.subscribe('person:logout', () => {
        this.currentUser = null;
        this.currentBuilding = null;
        this.buildings = [];
        this.locations = [];
        this.movements = [];
        this.alerts = [];
        this.logger.info('User logged out');
        if (this.isRendered) this.render();
      });

      // Subscribe to building events
      this.subscribe('building:created', (building) => {
        if (building.organizationId === this.currentOrganization?._id) {
          this.loadBuildings();
        }
      });

      this.subscribe('building:updated', (building) => {
        this.updateBuildingInContext(building);
      });

      this.subscribe('building:deleted', (building) => {
        if (building._id === this.currentBuilding?._id) {
          this.currentBuilding = null;
          this.locations = [];
          this.showBuildingSelector();
        }
      });

      // Try to restore session state
      await this.restoreSession();

      // Load initial data
      if (this.currentOrganization) {
        await this.loadBuildings();
      }

      this.logger.info('InventoryLocationApp initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize InventoryLocationApp:', error);
      throw error;
    }
  }

  /**
   * Render the app
   */
  async onRender() {
    try {
      this.clearContainer();

      // Check if user is logged in
      if (!this.currentUser) {
        this.renderLoginRequired();
        return;
      }

      // Check if organization is selected
      if (!this.currentOrganization) {
        this.renderOrganizationRequired();
        return;
      }

      // Switch between views
      switch (this.currentView) {
        case VIEW_MODES.LIST:
          await this.renderListView();
          break;

        case VIEW_MODES.EDIT:
          await this.renderEditView();
          break;

        case VIEW_MODES.VIEW:
          await this.renderViewDetails();
          break;

        case VIEW_MODES.HIERARCHY:
          await this.renderHierarchyView();
          break;

        case VIEW_MODES.MOVEMENT:
          await this.renderMovementView();
          break;

        case VIEW_MODES.MOVEMENT_HISTORY:
          await this.renderMovementHistoryView();
          break;

        case VIEW_MODES.ALERTS:
          await this.renderAlertsView();
          break;

        case VIEW_MODES.DASHBOARD:
          await this.renderDashboardView();
          break;

        default:
          this.logger.warn('Unknown view mode:', this.currentView);
          this.showListView();
      }

    } catch (error) {
      this.logger.error('Failed to render view:', error);
      this.showError('Failed to render view. Please try again.');
    }
  }

  /**
   * Cleanup
   */
  onDestroy() {
    // Destroy all components
    Object.values(this.components).forEach(component => {
      if (component && component.destroy) {
        component.destroy();
      }
    });

    // Clear data
    this.buildings = [];
    this.locations = [];
    this.movements = [];
    this.alerts = [];
    this.components = {};

    this.logger.info('InventoryLocationApp destroyed');
  }

  // ==================== View Navigation ====================

  /**
   * Show list view
   */
  showListView() {
    this.previousView = this.currentView;
    this.currentView = VIEW_MODES.LIST;
    this.currentLocation = null;
    this.render();
  }

  /**
   * Show edit view
   */
  showEditView(location = null) {
    this.previousView = this.currentView;
    this.currentView = VIEW_MODES.EDIT;
    this.currentLocation = location;
    this.render();
  }

  /**
   * Show view details
   */
  showViewDetails(location) {
    this.previousView = this.currentView;
    this.currentView = VIEW_MODES.VIEW;
    this.currentLocation = location;
    this.render();
  }

  /**
   * Show hierarchy view
   */
  showHierarchyView() {
    this.previousView = this.currentView;
    this.currentView = VIEW_MODES.HIERARCHY;
    this.render();
  }

  /**
   * Show movement view
   */
  showMovementView(location = null, movementType = null) {
    this.previousView = this.currentView;
    this.currentView = VIEW_MODES.MOVEMENT;
    this.currentLocation = location;
    this.currentMovementType = movementType;
    this.render();
  }

  /**
   * Show movement history view
   */
  showMovementHistoryView(location = null) {
    this.previousView = this.currentView;
    this.currentView = VIEW_MODES.MOVEMENT_HISTORY;
    this.currentLocation = location;
    this.render();
  }

  /**
   * Show alerts view
   */
  showAlertsView() {
    this.previousView = this.currentView;
    this.currentView = VIEW_MODES.ALERTS;
    this.render();
  }

  /**
   * Show dashboard view
   */
  showDashboardView() {
    this.previousView = this.currentView;
    this.currentView = VIEW_MODES.DASHBOARD;
    this.render();
  }

  /**
   * Go back to previous view
   */
  goBack() {
    if (this.previousView) {
      const temp = this.currentView;
      this.currentView = this.previousView;
      this.previousView = temp;
      this.render();
    } else {
      this.showListView();
    }
  }

  // ==================== Data Loading ====================

  /**
   * Load buildings for current organization
   */
  async loadBuildings() {
    try {
      if (!this.currentOrganization) {
        this.buildings = [];
        return;
      }

      const result = await this.db.query({
        selector: {
          type: 'building',
          organizationId: this.currentOrganization._id
        }
      });

      this.buildings = result.docs || result;
      this.logger.debug(`Loaded ${this.buildings.length} buildings`);

      // Auto-select building if only one
      if (this.buildings.length === 1 && !this.currentBuilding) {
        this.selectBuilding(this.buildings[0]);
      }

    } catch (error) {
      this.logger.error('Failed to load buildings:', error);
      this.buildings = [];
    }
  }

  /**
   * Load locations for current building
   */
  async loadLocations() {
    try {
      if (!this.currentBuilding) {
        this.locations = [];
        return;
      }

      const result = await this.db.query({
        selector: {
          type: 'location',
          buildingId: this.currentBuilding._id
        }
      });

      this.locations = result.docs || result;
      this.logger.debug(`Loaded ${this.locations.length} locations`);

      if (this.isRendered && this.currentView === VIEW_MODES.LIST) {
        this.render();
      }

    } catch (error) {
      this.logger.error('Failed to load locations:', error);
      this.locations = [];
    }
  }

  /**
   * Load movements for location
   */
  async loadMovements(locationId = null) {
    try {
      const selector = {
        type: 'movement',
        buildingId: this.currentBuilding?._id
      };

      if (locationId) {
        selector.locationId = locationId;
      }

      const result = await this.db.query({
        selector,
        sort: [{ createdAt: 'desc' }]
      });

      this.movements = result.docs || result;
      this.logger.debug(`Loaded ${this.movements.length} movements`);

    } catch (error) {
      this.logger.error('Failed to load movements:', error);
      this.movements = [];
    }
  }

  /**
   * Load alerts for building
   */
  async loadAlerts() {
    try {
      if (!this.currentBuilding) {
        this.alerts = [];
        return;
      }

      const result = await this.db.query({
        selector: {
          type: 'alert',
          buildingId: this.currentBuilding._id,
          status: { $in: ['active', 'acknowledged'] }
        },
        sort: [{ createdAt: 'desc' }]
      });

      this.alerts = result.docs || result;
      this.logger.debug(`Loaded ${this.alerts.length} alerts`);

    } catch (error) {
      this.logger.error('Failed to load alerts:', error);
      this.alerts = [];
    }
  }

  // ==================== Event Handlers ====================

  /**
   * Handle organization changed
   */
  async handleOrganizationChanged(org) {
    this.currentOrganization = org;
    this.currentBuilding = null;
    this.currentBranch = null;
    this.buildings = [];
    this.locations = [];
    this.movements = [];
    this.alerts = [];

    this.logger.info('Organization changed:', org?.name);

    await this.loadBuildings();

    if (this.isRendered) {
      this.render();
    }
  }

  /**
   * Handle location database change
   */
  handleLocationChange(change) {
    if (change.deleted) {
      this.locations = this.locations.filter(loc => loc._id !== change.id);
    } else {
      const index = this.locations.findIndex(loc => loc._id === change.doc._id);
      if (index >= 0) {
        this.locations[index] = change.doc;
      } else {
        if (change.doc.buildingId === this.currentBuilding?._id) {
          this.locations.unshift(change.doc);
        }
      }
    }

    if (this.isRendered && this.currentView === VIEW_MODES.LIST) {
      this.render();
    }
  }

  /**
   * Handle movement database change
   */
  handleMovementChange(change) {
    if (change.deleted) {
      this.movements = this.movements.filter(mov => mov._id !== change.id);
    } else {
      const index = this.movements.findIndex(mov => mov._id === change.doc._id);
      if (index >= 0) {
        this.movements[index] = change.doc;
      } else {
        if (change.doc.buildingId === this.currentBuilding?._id) {
          this.movements.unshift(change.doc);
        }
      }
    }

    if (this.isRendered && this.currentView === VIEW_MODES.MOVEMENT_HISTORY) {
      this.render();
    }
  }

  /**
   * Handle alert database change
   */
  handleAlertChange(change) {
    if (change.deleted) {
      this.alerts = this.alerts.filter(alert => alert._id !== change.id);
    } else {
      const index = this.alerts.findIndex(alert => alert._id === change.doc._id);
      if (index >= 0) {
        this.alerts[index] = change.doc;
      } else {
        if (change.doc.buildingId === this.currentBuilding?._id) {
          this.alerts.unshift(change.doc);
        }
      }
    }

    if (this.isRendered && this.currentView === VIEW_MODES.ALERTS) {
      this.render();
    }
  }

  // ==================== Building Management ====================

  /**
   * Select a building
   */
  async selectBuilding(building) {
    this.currentBuilding = building;
    this.currentBranch = await this.loadBranch(building.branchId);

    // Save to session storage
    localStorage.setItem('inventoryLocation_currentBuilding', JSON.stringify({
      buildingId: building._id,
      buildingName: building.name
    }));

    this.logger.info('Building selected:', building.name);

    // Load locations for this building
    await this.loadLocations();
    await this.loadAlerts();

    if (this.isRendered) {
      this.render();
    }
  }

  /**
   * Load branch by ID
   */
  async loadBranch(branchId) {
    try {
      const branch = await this.db.read(branchId);
      return branch;
    } catch (error) {
      this.logger.error('Failed to load branch:', error);
      return null;
    }
  }

  /**
   * Update building in context
   */
  updateBuildingInContext(building) {
    if (this.currentBuilding && this.currentBuilding._id === building._id) {
      this.currentBuilding = building;
    }

    const index = this.buildings.findIndex(b => b._id === building._id);
    if (index >= 0) {
      this.buildings[index] = building;
    }

    if (this.isRendered) {
      this.render();
    }
  }

  /**
   * Show building selector
   */
  showBuildingSelector() {
    this.currentBuilding = null;
    this.locations = [];
    this.currentView = VIEW_MODES.LIST;
    this.render();
  }

  // ==================== Session Management ====================

  /**
   * Restore session state
   */
  async restoreSession() {
    try {
      // Restore current building
      const storedBuilding = localStorage.getItem('inventoryLocation_currentBuilding');
      if (storedBuilding) {
        const { buildingId } = JSON.parse(storedBuilding);
        const building = await this.db.read(buildingId);
        if (building) {
          await this.selectBuilding(building);
        }
      }

      // Restore filters
      this.searchTerm = localStorage.getItem('inventoryLocation_searchTerm') || '';
      this.filterType = localStorage.getItem('inventoryLocation_filterType') || 'all';
      this.filterStatus = localStorage.getItem('inventoryLocation_filterStatus') || 'all';
      this.sortBy = localStorage.getItem('inventoryLocation_sortBy') || 'code';

    } catch (error) {
      this.logger.error('Failed to restore session:', error);
    }
  }

  /**
   * Save session state
   */
  saveSessionState() {
    localStorage.setItem('inventoryLocation_searchTerm', this.searchTerm);
    localStorage.setItem('inventoryLocation_filterType', this.filterType);
    localStorage.setItem('inventoryLocation_filterStatus', this.filterStatus);
    localStorage.setItem('inventoryLocation_sortBy', this.sortBy);
  }

  // ==================== Placeholder Views (to be implemented) ====================

  renderLoginRequired() {
    const message = this.createElement('div', {
      className: 'empty-state',
      style: 'padding: 2rem; text-align: center;'
    }, [
      'Please log in to access Inventory Location Management'
    ]);

    this.container.appendChild(message);
  }

  renderOrganizationRequired() {
    const message = this.createElement('div', {
      className: 'empty-state',
      style: 'padding: 2rem; text-align: center;'
    }, [
      'Please select an organization to access Inventory Location Management'
    ]);

    this.container.appendChild(message);
  }

  renderBuildingSelector() {
    const wrapper = this.createElement('div', {
      className: 'building-selector-wrapper',
      style: 'padding: 2rem;'
    });

    const title = this.createElement('h2', {}, ['Select a Building']);
    wrapper.appendChild(title);

    if (this.buildings.length === 0) {
      const emptyMessage = this.createElement('p', {}, [
        'No buildings found. Please create a building in Branch Management first.'
      ]);
      wrapper.appendChild(emptyMessage);
    } else {
      const buildingList = this.createElement('div', {
        className: 'building-list',
        style: 'display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1rem; margin-top: 1rem;'
      });

      this.buildings.forEach(building => {
        const card = this.createElement('div', {
          className: 'building-card',
          style: 'border: 1px solid #ddd; padding: 1rem; border-radius: 8px; cursor: pointer;'
        });

        card.addEventListener('click', () => this.selectBuilding(building));

        const name = this.createElement('h3', {}, [building.name]);
        const code = this.createElement('p', {}, [`Code: ${building.code}`]);
        const branch = this.createElement('p', {}, [`Branch: ${building.branchName}`]);

        card.appendChild(name);
        card.appendChild(code);
        card.appendChild(branch);

        buildingList.appendChild(card);
      });

      wrapper.appendChild(buildingList);
    }

    this.container.appendChild(wrapper);
  }

  async renderListView() {
    if (!this.currentBuilding) {
      this.renderBuildingSelector();
      return;
    }

    const header = this.createElement('div', { className: 'miniapp-header' });
    const title = this.createElement('h2', {}, [
      `Inventory Locations - ${this.currentBuilding.name}`
    ]);
    header.appendChild(title);

    const message = this.createElement('p', {}, [
      `${this.locations.length} locations loaded. Views to be implemented.`
    ]);

    this.container.appendChild(header);
    this.container.appendChild(message);
  }

  async renderEditView() {
    const header = this.createElement('div', { className: 'miniapp-header' });
    const title = this.createElement('h2', {}, [
      this.currentLocation ? 'Edit Location' : 'Create Location'
    ]);
    header.appendChild(title);

    const message = this.createElement('p', {}, ['Edit view to be implemented']);

    this.container.appendChild(header);
    this.container.appendChild(message);
  }

  async renderViewDetails() {
    const header = this.createElement('div', { className: 'miniapp-header' });
    const title = this.createElement('h2', {}, ['Location Details']);
    header.appendChild(title);

    const message = this.createElement('p', {}, ['Details view to be implemented']);

    this.container.appendChild(header);
    this.container.appendChild(message);
  }

  async renderHierarchyView() {
    const header = this.createElement('div', { className: 'miniapp-header' });
    const title = this.createElement('h2', {}, ['Location Hierarchy']);
    header.appendChild(title);

    const message = this.createElement('p', {}, ['Hierarchy view to be implemented']);

    this.container.appendChild(header);
    this.container.appendChild(message);
  }

  async renderMovementView() {
    const header = this.createElement('div', { className: 'miniapp-header' });
    const title = this.createElement('h2', {}, ['Record Movement']);
    header.appendChild(title);

    const message = this.createElement('p', {}, ['Movement view to be implemented']);

    this.container.appendChild(header);
    this.container.appendChild(message);
  }

  async renderMovementHistoryView() {
    const header = this.createElement('div', { className: 'miniapp-header' });
    const title = this.createElement('h2', {}, ['Movement History']);
    header.appendChild(title);

    const message = this.createElement('p', {}, ['Movement history view to be implemented']);

    this.container.appendChild(header);
    this.container.appendChild(message);
  }

  async renderAlertsView() {
    const header = this.createElement('div', { className: 'miniapp-header' });
    const title = this.createElement('h2', {}, ['Alerts']);
    header.appendChild(title);

    const message = this.createElement('p', {}, ['Alerts view to be implemented']);

    this.container.appendChild(header);
    this.container.appendChild(message);
  }

  async renderDashboardView() {
    const header = this.createElement('div', { className: 'miniapp-header' });
    const title = this.createElement('h2', {}, ['Dashboard']);
    header.appendChild(title);

    const message = this.createElement('p', {}, ['Dashboard view to be implemented']);

    this.container.appendChild(header);
    this.container.appendChild(message);
  }
}
