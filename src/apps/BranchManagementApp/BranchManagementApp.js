/**
 * BranchManagementApp.js
 * Manages branches, buildings, and workstations in a hierarchical structure
 * Organization → Branch → Buildings → Workstations
 */

import { MiniApp } from '../../core/MiniApp.js';
import { Notification } from '../../utils/Notification.js';

class BranchManagementApp extends MiniApp {
  constructor(options = {}) {
    super({
      name: 'BranchManagementApp',
      ...options
    });

    // State
    this.branches = [];
    this.buildings = [];
    this.workstations = [];

    // Current context
    this.currentUser = null;
    this.currentOrganization = null;
    this.currentBranch = null;
    this.currentBuilding = null;
    this.currentWorkstation = null;

    // View state
    this.currentView = 'branch-list'; // branch-list, building-list, workstation-list, edit, view-details
    this.currentEntityType = null; // 'branch', 'building', 'workstation'
    this.currentEntityId = null;

    // Navigation stack for breadcrumb
    this.navigationStack = [];

    // Search and filter state
    this.searchTerm = '';
    this.statusFilter = 'all';
    this.typeFilter = 'all';

    // Components
    this.components = {};
  }

  /**
   * Initialize the app
   */
  async onInit() {
    try {
      this.logger.info('Initializing BranchManagementApp...');

      // Create database indexes
      await this.createIndexes();

      // Subscribe to data changes
      this.subscribeToData('branch', (change) => this.handleBranchChange(change));
      this.subscribeToData('building', (change) => this.handleBuildingChange(change));
      this.subscribeToData('workstation', (change) => this.handleWorkstationChange(change));

      // Subscribe to organization changes
      this.subscribe('organization:setDefault', (org) => {
        this.logger.info('Organization changed:', org);
        this.currentOrganization = org;
        this.loadBranches();
      });

      this.subscribe('organization:defaultChanged', (org) => {
        this.logger.info('Default organization changed:', org);
        this.currentOrganization = org;
        this.loadBranches();
      });

      // Subscribe to person login/logout
      this.subscribe('person:login', (user) => {
        this.logger.info('User logged in:', user.username);
        this.currentUser = user;
        if (this.isRendered) {
          this.render();
        }
      });

      this.subscribe('person:logout', () => {
        this.logger.info('User logged out');
        this.currentUser = null;
        this.branches = [];
        this.buildings = [];
        this.workstations = [];
        if (this.isRendered) {
          this.render();
        }
      });

      // Load current user session
      await this.checkCurrentUser();

      // Load current organization
      await this.loadCurrentOrganization();

      // Load initial data
      if (this.currentOrganization) {
        await this.loadBranches();
      }

      this.logger.info('BranchManagementApp initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize BranchManagementApp:', error);
    }
  }

  /**
   * Create database indexes for efficient queries
   */
  async createIndexes() {
    try {
      // Branch indexes
      await this.db.createIndex(['type', 'organizationId']);
      await this.db.createIndex(['type', 'organizationId', 'status']);
      await this.db.createIndex(['type', 'code']);

      // Building indexes
      await this.db.createIndex(['type', 'branchId']);
      await this.db.createIndex(['type', 'branchId', 'status']);

      // Workstation indexes
      await this.db.createIndex(['type', 'buildingId']);
      await this.db.createIndex(['type', 'branchId']);
      await this.db.createIndex(['type', 'assignedWorkerId']);
      await this.db.createIndex(['type', 'status']);

      this.logger.info('Database indexes created');
    } catch (error) {
      this.logger.error('Failed to create indexes:', error);
    }
  }

  /**
   * Check for current logged-in user
   */
  async checkCurrentUser() {
    try {
      const sessionData = localStorage.getItem('personManagementApp_session');
      if (sessionData) {
        const session = JSON.parse(sessionData);
        const result = await this.db.query({
          selector: {
            type: 'person',
            _id: session.userId
          }
        });

        if (result && result.length > 0) {
          this.currentUser = result[0];
          this.logger.info('Current user loaded:', this.currentUser.username);
        }
      }
    } catch (error) {
      this.logger.error('Failed to load current user:', error);
    }
  }

  /**
   * Load current organization from localStorage
   */
  async loadCurrentOrganization() {
    try {
      const storedOrg = localStorage.getItem('defaultOrganization');
      if (storedOrg) {
        this.currentOrganization = JSON.parse(storedOrg);
        this.logger.info('Current organization loaded:', this.currentOrganization.name);
      }
    } catch (error) {
      this.logger.error('Failed to load current organization:', error);
    }
  }

  /**
   * Check if current user has approval authority
   * User must be either:
   * 1. Organization Owner (created the organization)
   * 2. Worker in FACILITIES/Space Planning with seniority 6, 7, or 8
   */
  async hasApprovalAuthority() {
    try {
      if (!this.currentUser || !this.currentOrganization) {
        return false;
      }

      // Check if user is organization owner
      if (this.currentOrganization.createdBy === this.currentUser._id) {
        this.logger.info('User is organization owner - has approval authority');
        return true;
      }

      // Check if user is assigned to a workstation with correct department/team/seniority
      const workstationResult = await this.db.query({
        selector: {
          type: 'workstation',
          assignedWorkerId: this.currentUser._id,
          department: 'Facilities Management'
        }
      });

      if (!workstationResult || workstationResult.length === 0) {
        this.logger.info('User not assigned to Facilities Management workstation');
        return false;
      }

      // Get user's vacancy to check team and seniority
      const vacancyResult = await this.db.query({
        selector: {
          type: 'vacancy',
          assignedPersonId: this.currentUser._id
        }
      });

      if (!vacancyResult || vacancyResult.length === 0) {
        this.logger.info('User has no vacancy assignment');
        return false;
      }

      // Check if any vacancy matches our criteria
      for (const vacancy of vacancyResult) {
        // Check team code
        if (vacancy.teamCode === 'SPACE-PLAN') {
          // Check seniority (6, 7, or 8)
          if (vacancy.seniority >= 6 && vacancy.seniority <= 8) {
            this.logger.info('User has approval authority via Space Planning team with seniority', vacancy.seniority);
            return true;
          }
        }
      }

      this.logger.info('User does not meet approval criteria');
      return false;
    } catch (error) {
      this.logger.error('Failed to check approval authority:', error);
      return false;
    }
  }

  /**
   * Show permission denied message
   */
  showPermissionDenied() {
    this.showError(
      'Permission Denied: You must be the Organization Owner or a member of the Facilities Management - Space Planning team (seniority 6+) to perform this action.'
    );
  }

  /**
   * Render the app
   */
  async onRender() {
    this.clearContainer();

    if (!this.currentUser) {
      this.renderLoginRequired();
      return;
    }

    if (!this.currentOrganization) {
      this.renderOrganizationRequired();
      return;
    }

    switch (this.currentView) {
      case 'branch-list':
        this.renderBranchList();
        break;
      case 'building-list':
        this.renderBuildingList();
        break;
      case 'workstation-list':
        this.renderWorkstationList();
        break;
      case 'edit':
        this.renderEditForm();
        break;
      case 'view-details':
        this.renderViewDetails();
        break;
      default:
        this.renderBranchList();
    }
  }

  /**
   * Render login required message
   */
  renderLoginRequired() {
    const container = this.createElement('div', { className: 'empty-state' });

    const icon = this.createElement('div', { className: 'empty-state-icon' }, ['🔒']);
    const title = this.createElement('h3', {}, ['Login Required']);
    const message = this.createElement('p', {}, ['Please log in to manage branches, buildings, and workstations.']);

    container.appendChild(icon);
    container.appendChild(title);
    container.appendChild(message);

    this.container.appendChild(container);
  }

  /**
   * Render organization required message
   */
  renderOrganizationRequired() {
    const container = this.createElement('div', { className: 'empty-state' });

    const icon = this.createElement('div', { className: 'empty-state-icon' }, ['🏢']);
    const title = this.createElement('h3', {}, ['Organization Required']);
    const message = this.createElement('p', {}, ['Please select a default organization to manage branches.']);

    container.appendChild(icon);
    container.appendChild(title);
    container.appendChild(message);

    this.container.appendChild(container);
  }

  // ==========================================
  // BRANCH OPERATIONS
  // ==========================================

  /**
   * Load branches for current organization
   */
  async loadBranches() {
    try {
      if (!this.currentOrganization) {
        this.branches = [];
        return;
      }

      const result = await this.db.query({
        selector: {
          type: 'branch',
          organizationId: this.currentOrganization._id
        }
      });

      this.branches = result || [];

      // Sort by name
      this.branches.sort((a, b) => a.name.localeCompare(b.name));

      this.logger.info(`Loaded ${this.branches.length} branches`);

      if (this.isRendered && this.currentView === 'branch-list') {
        this.render();
      }
    } catch (error) {
      this.logger.error('Failed to load branches:', error);
      this.showError('Failed to load branches');
    }
  }

  /**
   * Validate branch data
   */
  async validateBranch(data) {
    // Required fields
    if (!data.name || !data.name.trim()) {
      return { valid: false, error: 'Branch name is required' };
    }

    if (!data.code || !data.code.trim()) {
      return { valid: false, error: 'Branch code is required' };
    }

    // Check unique code
    const existingCode = await this.isCodeUnique('branch', data.code, data._id);
    if (!existingCode) {
      return { valid: false, error: 'Branch code already exists' };
    }

    // Validate email format if provided
    if (data.email && data.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        return { valid: false, error: 'Invalid email format' };
      }
    }

    return { valid: true };
  }

  /**
   * Check if code is unique
   */
  async isCodeUnique(type, code, excludeId = null) {
    try {
      const result = await this.db.query({
        selector: {
          type: type,
          code: code
        }
      });

      if (!result || result.length === 0) {
        return true;
      }

      // If we're editing, exclude current document
      if (excludeId) {
        const filtered = result.filter(doc => doc._id !== excludeId);
        return filtered.length === 0;
      }

      return false;
    } catch (error) {
      this.logger.error('Failed to check code uniqueness:', error);
      return true; // Assume unique on error
    }
  }

  /**
   * Create a new branch
   */
  async createBranch(data) {
    try {
      // Check approval authority
      const hasAuthority = await this.hasApprovalAuthority();
      if (!hasAuthority) {
        this.showPermissionDenied();
        return null;
      }

      // Validate
      const validation = await this.validateBranch(data);
      if (!validation.valid) {
        this.showError(validation.error);
        return null;
      }

      const branch = {
        _id: `branch:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'branch',
        name: data.name.trim(),
        code: data.code.trim().toUpperCase(),
        description: data.description ? data.description.trim() : '',
        organizationId: this.currentOrganization._id,
        organizationName: this.currentOrganization.name,
        phone: data.phone || '',
        email: data.email || '',
        status: data.status || 'active',
        isOperational: data.isOperational !== false,
        totalBuildings: 0,
        totalWorkstations: 0,
        totalAssignedWorkers: 0,
        managerId: data.managerId || null,
        managerName: data.managerName || '',
        createdBy: this.currentUser._id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await this.db.create(branch);

      this.logger.info('Branch created:', branch.name);
      this.showSuccess('Branch created successfully');
      this.emit('branch:created', branch);

      return branch;
    } catch (error) {
      this.logger.error('Failed to create branch:', error);
      this.showError('Failed to create branch. Please try again.');
      return null;
    }
  }

  /**
   * Update an existing branch
   */
  async updateBranch(data) {
    try {
      // Check approval authority
      const hasAuthority = await this.hasApprovalAuthority();
      if (!hasAuthority) {
        this.showPermissionDenied();
        return null;
      }

      // Validate
      const validation = await this.validateBranch(data);
      if (!validation.valid) {
        this.showError(validation.error);
        return null;
      }

      const branch = {
        ...data,
        name: data.name.trim(),
        code: data.code.trim().toUpperCase(),
        description: data.description ? data.description.trim() : '',
        phone: data.phone || '',
        email: data.email || '',
        updatedAt: new Date().toISOString()
      };

      await this.db.update(branch);

      this.logger.info('Branch updated:', branch.name);
      this.showSuccess('Branch updated successfully');
      this.emit('branch:updated', branch);

      return branch;
    } catch (error) {
      this.logger.error('Failed to update branch:', error);
      this.showError('Failed to update branch. Please try again.');
      return null;
    }
  }

  /**
   * Delete a branch
   */
  async deleteBranch(branch) {
    try {
      // Check approval authority
      const hasAuthority = await this.hasApprovalAuthority();
      if (!hasAuthority) {
        this.showPermissionDenied();
        return false;
      }

      // Check if branch has buildings
      const buildingsResult = await this.db.query({
        selector: {
          type: 'building',
          branchId: branch._id
        }
      });

      if (buildingsResult && buildingsResult.length > 0) {
        this.showError(`Cannot delete branch "${branch.name}". It has ${buildingsResult.length} building(s). Please delete all buildings first.`);
        return false;
      }

      if (!confirm(`Are you sure you want to delete branch "${branch.name}"?`)) {
        return false;
      }

      await this.db.delete(branch);

      this.logger.info('Branch deleted:', branch.name);
      this.showSuccess('Branch deleted successfully');
      this.emit('branch:deleted', branch);

      return true;
    } catch (error) {
      this.logger.error('Failed to delete branch:', error);
      this.showError('Failed to delete branch. Please try again.');
      return false;
    }
  }

  /**
   * Get branch details by ID
   */
  async getBranchDetails(branchId) {
    try {
      const branch = await this.db.read(branchId);

      // Calculate current stats
      const stats = await this.calculateBranchStats(branchId);
      branch.totalBuildings = stats.totalBuildings;
      branch.totalWorkstations = stats.totalWorkstations;
      branch.totalAssignedWorkers = stats.totalAssignedWorkers;

      return branch;
    } catch (error) {
      this.logger.error('Failed to get branch details:', error);
      return null;
    }
  }

  /**
   * Calculate branch statistics
   */
  async calculateBranchStats(branchId) {
    try {
      // Count buildings
      const buildingsResult = await this.db.query({
        selector: {
          type: 'building',
          branchId: branchId
        }
      });
      const totalBuildings = buildingsResult ? buildingsResult.length : 0;

      // Count workstations
      const workstationsResult = await this.db.query({
        selector: {
          type: 'workstation',
          branchId: branchId
        }
      });
      const totalWorkstations = workstationsResult ? workstationsResult.length : 0;

      // Count assigned workers
      const assignedResult = await this.db.query({
        selector: {
          type: 'workstation',
          branchId: branchId,
          assignedWorkerId: { $ne: null }
        }
      });
      const totalAssignedWorkers = assignedResult ? assignedResult.length : 0;

      return {
        totalBuildings,
        totalWorkstations,
        totalAssignedWorkers
      };
    } catch (error) {
      this.logger.error('Failed to calculate branch stats:', error);
      return {
        totalBuildings: 0,
        totalWorkstations: 0,
        totalAssignedWorkers: 0
      };
    }
  }

  /**
   * Handle branch data changes
   */
  handleBranchChange(change) {
    if (change.deleted) {
      this.branches = this.branches.filter(b => b._id !== change.id);
    } else {
      const index = this.branches.findIndex(b => b._id === change.doc._id);
      if (index >= 0) {
        this.branches[index] = change.doc;
      } else {
        // Only add if it belongs to current organization
        if (this.currentOrganization && change.doc.organizationId === this.currentOrganization._id) {
          this.branches.push(change.doc);
        }
      }
    }

    // Re-sort
    this.branches.sort((a, b) => a.name.localeCompare(b.name));

    // Update UI if visible
    if (this.isRendered && this.currentView === 'branch-list') {
      this.render();
    }
  }

  // ==========================================
  // BUILDING OPERATIONS
  // ==========================================

  /**
   * Load buildings for a branch
   */
  async loadBuildingsForBranch(branchId) {
    try {
      const result = await this.db.query({
        selector: {
          type: 'building',
          branchId: branchId
        }
      });

      this.buildings = result || [];

      // Sort by name
      this.buildings.sort((a, b) => a.name.localeCompare(b.name));

      this.logger.info(`Loaded ${this.buildings.length} buildings for branch`);

      if (this.isRendered && this.currentView === 'building-list') {
        this.render();
      }
    } catch (error) {
      this.logger.error('Failed to load buildings:', error);
      this.showError('Failed to load buildings');
    }
  }

  /**
   * Validate building data
   */
  async validateBuilding(data) {
    // Required fields
    if (!data.name || !data.name.trim()) {
      return { valid: false, error: 'Building name is required' };
    }

    if (!data.code || !data.code.trim()) {
      return { valid: false, error: 'Building code is required' };
    }

    // Check unique code
    const existingCode = await this.isCodeUnique('building', data.code, data._id);
    if (!existingCode) {
      return { valid: false, error: 'Building code already exists' };
    }

    return { valid: true };
  }

  /**
   * Create a new building
   */
  async createBuilding(data) {
    try {
      // Check approval authority
      const hasAuthority = await this.hasApprovalAuthority();
      if (!hasAuthority) {
        this.showPermissionDenied();
        return null;
      }

      // Validate
      const validation = await this.validateBuilding(data);
      if (!validation.valid) {
        this.showError(validation.error);
        return null;
      }

      const building = {
        _id: `building:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'building',
        name: data.name.trim(),
        code: data.code.trim().toUpperCase(),
        description: data.description ? data.description.trim() : '',
        branchId: this.currentBranch._id,
        branchName: this.currentBranch.name,
        organizationId: this.currentOrganization._id,
        address: data.address || '',
        buildingType: data.buildingType || 'office',
        yearBuilt: data.yearBuilt ? parseInt(data.yearBuilt) : null,
        totalFloors: data.totalFloors ? parseInt(data.totalFloors) : null,
        squareFeetage: data.squareFeetage ? parseInt(data.squareFeetage) : null,
        coordinates: {
          latitude: data.latitude ? parseFloat(data.latitude) : 0,
          longitude: data.longitude ? parseFloat(data.longitude) : 0
        },
        totalWorkstations: 0,
        totalAssignedWorkstations: 0,
        status: data.status || 'active',
        isOperational: data.isOperational !== false,
        createdBy: this.currentUser._id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await this.db.create(building);

      this.logger.info('Building created:', building.name);
      this.showSuccess('Building created successfully');
      this.emit('building:created', building);

      // Update branch stats
      await this.updateBranchStats(this.currentBranch._id);

      return building;
    } catch (error) {
      this.logger.error('Failed to create building:', error);
      this.showError('Failed to create building. Please try again.');
      return null;
    }
  }

  /**
   * Update an existing building
   */
  async updateBuilding(data) {
    try {
      // Check approval authority
      const hasAuthority = await this.hasApprovalAuthority();
      if (!hasAuthority) {
        this.showPermissionDenied();
        return null;
      }

      // Validate
      const validation = await this.validateBuilding(data);
      if (!validation.valid) {
        this.showError(validation.error);
        return null;
      }

      const building = {
        ...data,
        name: data.name.trim(),
        code: data.code.trim().toUpperCase(),
        description: data.description ? data.description.trim() : '',
        address: data.address || '',
        yearBuilt: data.yearBuilt ? parseInt(data.yearBuilt) : null,
        totalFloors: data.totalFloors ? parseInt(data.totalFloors) : null,
        squareFeetage: data.squareFeetage ? parseInt(data.squareFeetage) : null,
        coordinates: {
          latitude: data.latitude ? parseFloat(data.latitude) : 0,
          longitude: data.longitude ? parseFloat(data.longitude) : 0
        },
        updatedAt: new Date().toISOString()
      };

      await this.db.update(building);

      this.logger.info('Building updated:', building.name);
      this.showSuccess('Building updated successfully');
      this.emit('building:updated', building);

      return building;
    } catch (error) {
      this.logger.error('Failed to update building:', error);
      this.showError('Failed to update building. Please try again.');
      return null;
    }
  }

  /**
   * Delete a building
   */
  async deleteBuilding(building) {
    try {
      // Check approval authority
      const hasAuthority = await this.hasApprovalAuthority();
      if (!hasAuthority) {
        this.showPermissionDenied();
        return false;
      }

      // Check if building has workstations
      const workstationsResult = await this.db.query({
        selector: {
          type: 'workstation',
          buildingId: building._id
        }
      });

      if (workstationsResult && workstationsResult.length > 0) {
        this.showError(`Cannot delete building "${building.name}". It has ${workstationsResult.length} workstation(s). Please delete all workstations first.`);
        return false;
      }

      if (!confirm(`Are you sure you want to delete building "${building.name}"?`)) {
        return false;
      }

      await this.db.delete(building);

      this.logger.info('Building deleted:', building.name);
      this.showSuccess('Building deleted successfully');
      this.emit('building:deleted', building);

      // Update branch stats
      await this.updateBranchStats(building.branchId);

      return true;
    } catch (error) {
      this.logger.error('Failed to delete building:', error);
      this.showError('Failed to delete building. Please try again.');
      return false;
    }
  }

  /**
   * Get building details by ID
   */
  async getBuildingDetails(buildingId) {
    try {
      const building = await this.db.read(buildingId);

      // Calculate current stats
      const stats = await this.calculateBuildingStats(buildingId);
      building.totalWorkstations = stats.totalWorkstations;
      building.totalAssignedWorkstations = stats.totalAssignedWorkstations;

      return building;
    } catch (error) {
      this.logger.error('Failed to get building details:', error);
      return null;
    }
  }

  /**
   * Calculate building statistics
   */
  async calculateBuildingStats(buildingId) {
    try {
      // Count workstations
      const workstationsResult = await this.db.query({
        selector: {
          type: 'workstation',
          buildingId: buildingId
        }
      });
      const totalWorkstations = workstationsResult ? workstationsResult.length : 0;

      // Count assigned workstations
      const assignedResult = await this.db.query({
        selector: {
          type: 'workstation',
          buildingId: buildingId,
          assignedWorkerId: { $ne: null }
        }
      });
      const totalAssignedWorkstations = assignedResult ? assignedResult.length : 0;

      return {
        totalWorkstations,
        totalAssignedWorkstations
      };
    } catch (error) {
      this.logger.error('Failed to calculate building stats:', error);
      return {
        totalWorkstations: 0,
        totalAssignedWorkstations: 0
      };
    }
  }

  /**
   * Update branch statistics
   */
  async updateBranchStats(branchId) {
    try {
      const stats = await this.calculateBranchStats(branchId);
      const branch = await this.db.read(branchId);

      branch.totalBuildings = stats.totalBuildings;
      branch.totalWorkstations = stats.totalWorkstations;
      branch.totalAssignedWorkers = stats.totalAssignedWorkers;
      branch.updatedAt = new Date().toISOString();

      await this.db.update(branch);

      // Reload branches to update UI
      await this.loadBranches();
    } catch (error) {
      this.logger.error('Failed to update branch stats:', error);
    }
  }

  /**
   * Handle building data changes
   */
  handleBuildingChange(change) {
    if (change.deleted) {
      this.buildings = this.buildings.filter(b => b._id !== change.id);
    } else {
      const index = this.buildings.findIndex(b => b._id === change.doc._id);
      if (index >= 0) {
        this.buildings[index] = change.doc;
      } else {
        // Only add if it belongs to current branch
        if (this.currentBranch && change.doc.branchId === this.currentBranch._id) {
          this.buildings.push(change.doc);
        }
      }
    }

    // Re-sort
    this.buildings.sort((a, b) => a.name.localeCompare(b.name));

    // Update UI if visible
    if (this.isRendered && this.currentView === 'building-list') {
      this.render();
    }
  }

  // ==========================================
  // WORKSTATION OPERATIONS
  // ==========================================

  /**
   * Load workstations for a building
   */
  async loadWorkstationsForBuilding(buildingId) {
    try {
      const result = await this.db.query({
        selector: {
          type: 'workstation',
          buildingId: buildingId
        }
      });

      this.workstations = result || [];

      // Sort by name
      this.workstations.sort((a, b) => a.name.localeCompare(b.name));

      this.logger.info(`Loaded ${this.workstations.length} workstations for building`);

      if (this.isRendered && this.currentView === 'workstation-list') {
        this.render();
      }
    } catch (error) {
      this.logger.error('Failed to load workstations:', error);
      this.showError('Failed to load workstations');
    }
  }

  /**
   * Validate workstation data
   */
  async validateWorkstation(data) {
    // Required fields
    if (!data.name || !data.name.trim()) {
      return { valid: false, error: 'Workstation name is required' };
    }

    if (!data.code || !data.code.trim()) {
      return { valid: false, error: 'Workstation code is required' };
    }

    // Check unique code
    const existingCode = await this.isCodeUnique('workstation', data.code, data._id);
    if (!existingCode) {
      return { valid: false, error: 'Workstation code already exists' };
    }

    return { valid: true };
  }

  /**
   * Create a new workstation
   */
  async createWorkstation(data) {
    try {
      // Check approval authority
      const hasAuthority = await this.hasApprovalAuthority();
      if (!hasAuthority) {
        this.showPermissionDenied();
        return null;
      }

      // Validate
      const validation = await this.validateWorkstation(data);
      if (!validation.valid) {
        this.showError(validation.error);
        return null;
      }

      // Parse equipment and amenities from comma-separated strings
      const equipment = data.equipment ? data.equipment.split(',').map(e => e.trim()).filter(e => e) : [];
      const amenities = data.amenities ? data.amenities.split(',').map(a => a.trim()).filter(a => a) : [];

      const workstation = {
        _id: `workstation:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'workstation',
        name: data.name.trim(),
        code: data.code.trim().toUpperCase(),
        description: data.description ? data.description.trim() : '',
        buildingId: this.currentBuilding._id,
        buildingName: this.currentBuilding.name,
        branchId: this.currentBranch._id,
        branchName: this.currentBranch.name,
        organizationId: this.currentOrganization._id,
        workstationType: data.workstationType || 'desk',
        location: data.location ? data.location.trim() : '',
        equipment: equipment,
        amenities: amenities,
        assignedWorkerId: null,
        assignedWorkerName: null,
        assignmentDate: null,
        employmentType: null,
        department: null,
        position: null,
        status: 'available',
        isAvailable: true,
        createdBy: this.currentUser._id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await this.db.create(workstation);

      this.logger.info('Workstation created:', workstation.name);
      this.showSuccess('Workstation created successfully');
      this.emit('workstation:created', workstation);

      // Update building and branch stats
      await this.updateBuildingStats(this.currentBuilding._id);
      await this.updateBranchStats(this.currentBranch._id);

      return workstation;
    } catch (error) {
      this.logger.error('Failed to create workstation:', error);
      this.showError('Failed to create workstation. Please try again.');
      return null;
    }
  }

  /**
   * Update an existing workstation
   */
  async updateWorkstation(data) {
    try {
      // Check approval authority
      const hasAuthority = await this.hasApprovalAuthority();
      if (!hasAuthority) {
        this.showPermissionDenied();
        return null;
      }

      // Validate
      const validation = await this.validateWorkstation(data);
      if (!validation.valid) {
        this.showError(validation.error);
        return null;
      }

      // Parse equipment and amenities
      const equipment = data.equipment ?
        (typeof data.equipment === 'string' ? data.equipment.split(',').map(e => e.trim()).filter(e => e) : data.equipment) : [];
      const amenities = data.amenities ?
        (typeof data.amenities === 'string' ? data.amenities.split(',').map(a => a.trim()).filter(a => a) : data.amenities) : [];

      const workstation = {
        ...data,
        name: data.name.trim(),
        code: data.code.trim().toUpperCase(),
        description: data.description ? data.description.trim() : '',
        location: data.location ? data.location.trim() : '',
        equipment: equipment,
        amenities: amenities,
        updatedAt: new Date().toISOString()
      };

      await this.db.update(workstation);

      this.logger.info('Workstation updated:', workstation.name);
      this.showSuccess('Workstation updated successfully');
      this.emit('workstation:updated', workstation);

      return workstation;
    } catch (error) {
      this.logger.error('Failed to update workstation:', error);
      this.showError('Failed to update workstation. Please try again.');
      return null;
    }
  }

  /**
   * Delete a workstation
   */
  async deleteWorkstation(workstation) {
    try {
      // Check approval authority
      const hasAuthority = await this.hasApprovalAuthority();
      if (!hasAuthority) {
        this.showPermissionDenied();
        return false;
      }

      // Check if workstation is assigned
      if (workstation.assignedWorkerId) {
        this.showError(`Cannot delete workstation "${workstation.name}". It is currently assigned to ${workstation.assignedWorkerName}. Please unassign the worker first.`);
        return false;
      }

      if (!confirm(`Are you sure you want to delete workstation "${workstation.name}"?`)) {
        return false;
      }

      await this.db.delete(workstation);

      this.logger.info('Workstation deleted:', workstation.name);
      this.showSuccess('Workstation deleted successfully');
      this.emit('workstation:deleted', workstation);

      // Update building and branch stats
      await this.updateBuildingStats(workstation.buildingId);
      await this.updateBranchStats(workstation.branchId);

      return true;
    } catch (error) {
      this.logger.error('Failed to delete workstation:', error);
      this.showError('Failed to delete workstation. Please try again.');
      return false;
    }
  }

  /**
   * Get workstation details by ID
   */
  async getWorkstationDetails(workstationId) {
    try {
      const workstation = await this.db.read(workstationId);
      return workstation;
    } catch (error) {
      this.logger.error('Failed to get workstation details:', error);
      return null;
    }
  }

  /**
   * Update building statistics
   */
  async updateBuildingStats(buildingId) {
    try {
      const stats = await this.calculateBuildingStats(buildingId);
      const building = await this.db.read(buildingId);

      building.totalWorkstations = stats.totalWorkstations;
      building.totalAssignedWorkstations = stats.totalAssignedWorkstations;
      building.updatedAt = new Date().toISOString();

      await this.db.update(building);

      // Reload buildings to update UI
      if (this.currentBranch) {
        await this.loadBuildingsForBranch(this.currentBranch._id);
      }
    } catch (error) {
      this.logger.error('Failed to update building stats:', error);
    }
  }

  /**
   * Handle workstation data changes
   */
  handleWorkstationChange(change) {
    if (change.deleted) {
      this.workstations = this.workstations.filter(w => w._id !== change.id);
    } else {
      const index = this.workstations.findIndex(w => w._id === change.doc._id);
      if (index >= 0) {
        this.workstations[index] = change.doc;
      } else {
        // Only add if it belongs to current building
        if (this.currentBuilding && change.doc.buildingId === this.currentBuilding._id) {
          this.workstations.push(change.doc);
        }
      }
    }

    // Re-sort
    this.workstations.sort((a, b) => a.name.localeCompare(b.name));

    // Update UI if visible
    if (this.isRendered && this.currentView === 'workstation-list') {
      this.render();
    }
  }

  // ==========================================
  // WORKER ASSIGNMENT OPERATIONS
  // ==========================================

  /**
   * Get available workers from PersonManagementApp
   */
  async getAvailableWorkers() {
    try {
      const result = await this.db.query({
        selector: {
          type: 'person'
        }
      });

      const allPeople = result || [];

      // Get all assigned workstation IDs
      const assignedResult = await this.db.query({
        selector: {
          type: 'workstation',
          assignedWorkerId: { $ne: null }
        }
      });

      const assignedWorkerIds = new Set(
        (assignedResult || []).map(ws => ws.assignedWorkerId)
      );

      // Filter to get available workers (not assigned to any workstation)
      const availableWorkers = allPeople.filter(person =>
        !assignedWorkerIds.has(person._id)
      );

      // Sort by name
      availableWorkers.sort((a, b) => {
        const nameA = `${a.firstName || ''} ${a.lastName || ''}`.trim();
        const nameB = `${b.firstName || ''} ${b.lastName || ''}`.trim();
        return nameA.localeCompare(nameB);
      });

      return availableWorkers;
    } catch (error) {
      this.logger.error('Failed to get available workers:', error);
      return [];
    }
  }

  /**
   * Get worker full name
   */
  getWorkerFullName(person) {
    const parts = [
      person.namePrefix,
      person.firstName,
      person.middleName,
      person.lastName,
      person.nameSuffix
    ].filter(p => p && p.trim());

    return parts.join(' ') || person.username || 'Unknown';
  }

  /**
   * Assign worker to workstation
   */
  async assignWorkerToWorkstation(workstationId, personId, assignmentData) {
    try {
      const workstation = await this.db.read(workstationId);
      const person = await this.db.read(personId);

      if (!workstation || !person) {
        this.showError('Workstation or person not found');
        return null;
      }

      // Check if workstation is already assigned
      if (workstation.assignedWorkerId) {
        this.showError(`Workstation is already assigned to ${workstation.assignedWorkerName}`);
        return null;
      }

      // Update workstation with assignment
      workstation.assignedWorkerId = person._id;
      workstation.assignedWorkerName = this.getWorkerFullName(person);
      workstation.assignmentDate = new Date().toISOString();
      workstation.employmentType = assignmentData.employmentType || null;
      workstation.department = assignmentData.department || null;
      workstation.position = assignmentData.position || null;
      workstation.status = 'occupied';
      workstation.isAvailable = false;
      workstation.updatedAt = new Date().toISOString();

      await this.db.update(workstation);

      this.logger.info(`Assigned ${workstation.assignedWorkerName} to ${workstation.name}`);
      this.showSuccess(`Worker assigned successfully to ${workstation.name}`);

      // Emit event for PersonManagementApp integration
      this.emit('branch:workerAssigned', {
        personId: person._id,
        workstationId: workstation._id,
        branchId: workstation.branchId,
        buildingId: workstation.buildingId,
        assignmentDate: workstation.assignmentDate
      });

      // Update stats
      await this.updateBuildingStats(workstation.buildingId);
      await this.updateBranchStats(workstation.branchId);

      return workstation;
    } catch (error) {
      this.logger.error('Failed to assign worker:', error);
      this.showError('Failed to assign worker. Please try again.');
      return null;
    }
  }

  /**
   * Unassign worker from workstation
   */
  async unassignWorker(workstationId) {
    try {
      const workstation = await this.db.read(workstationId);

      if (!workstation) {
        this.showError('Workstation not found');
        return null;
      }

      if (!workstation.assignedWorkerId) {
        this.showError('Workstation is not assigned to anyone');
        return null;
      }

      const workerName = workstation.assignedWorkerName;
      const personId = workstation.assignedWorkerId;

      if (!confirm(`Are you sure you want to unassign ${workerName} from ${workstation.name}?`)) {
        return null;
      }

      // Clear assignment
      workstation.assignedWorkerId = null;
      workstation.assignedWorkerName = null;
      workstation.assignmentDate = null;
      workstation.employmentType = null;
      workstation.department = null;
      workstation.position = null;
      workstation.status = 'available';
      workstation.isAvailable = true;
      workstation.updatedAt = new Date().toISOString();

      await this.db.update(workstation);

      this.logger.info(`Unassigned ${workerName} from ${workstation.name}`);
      this.showSuccess(`Worker unassigned successfully from ${workstation.name}`);

      // Emit event for PersonManagementApp integration
      this.emit('branch:workerUnassigned', {
        personId: personId,
        workstationId: workstation._id,
        branchId: workstation.branchId,
        buildingId: workstation.buildingId
      });

      // Update stats
      await this.updateBuildingStats(workstation.buildingId);
      await this.updateBranchStats(workstation.branchId);

      return workstation;
    } catch (error) {
      this.logger.error('Failed to unassign worker:', error);
      this.showError('Failed to unassign worker. Please try again.');
      return null;
    }
  }

  /**
   * Show assignment modal/form
   */
  async showAssignmentModal(workstation) {
    // Get available workers
    const workers = await this.getAvailableWorkers();

    if (workers.length === 0) {
      this.showError('No available workers. All workers are already assigned or no workers exist.');
      return;
    }

    // Create modal overlay
    const overlay = this.createElement('div', { className: 'assignment-modal-overlay' });

    // Create modal
    const modal = this.createElement('div', { className: 'assignment-modal' });

    // Modal header
    const header = this.createElement('div', { className: 'assignment-modal-header' });
    const title = this.createElement('h3', {}, [`Assign Worker to ${workstation.name}`]);
    const closeBtn = this.createElement('button', {
      className: 'assignment-modal-close',
      onclick: () => overlay.remove()
    }, ['×']);
    header.appendChild(title);
    header.appendChild(closeBtn);
    modal.appendChild(header);

    // Modal body - form
    const form = this.createElement('form', {
      className: 'assignment-form',
      onsubmit: async (e) => {
        e.preventDefault();
        const formData = this.getFormData(e.target);
        const result = await this.assignWorkerToWorkstation(workstation._id, formData.workerId, {
          employmentType: formData.employmentType,
          department: formData.department,
          position: formData.position
        });

        if (result) {
          overlay.remove();
          await this.loadWorkstationsForBuilding(this.currentBuilding._id);
        }
      }
    });

    // Worker selection
    const workerGroup = this.createElement('div', { className: 'form-group' });
    const workerLabel = this.createElement('label', { for: 'worker-select' }, ['Select Worker *']);
    const workerSelect = this.createElement('select', {
      id: 'worker-select',
      name: 'workerId',
      className: 'input',
      required: true
    });

    const defaultOption = this.createElement('option', { value: '' }, ['-- Select a worker --']);
    workerSelect.appendChild(defaultOption);

    workers.forEach(worker => {
      const option = this.createElement('option', { value: worker._id },
        [this.getWorkerFullName(worker) + (worker.username ? ` (${worker.username})` : '')]
      );
      workerSelect.appendChild(option);
    });

    workerGroup.appendChild(workerLabel);
    workerGroup.appendChild(workerSelect);
    form.appendChild(workerGroup);

    // Employment type
    const employmentGroup = this.createElement('div', { className: 'form-group' });
    const employmentLabel = this.createElement('label', { for: 'employment-type' }, ['Employment Type']);
    const employmentSelect = this.createElement('select', {
      id: 'employment-type',
      name: 'employmentType',
      className: 'input'
    });

    [
      { value: '', label: '-- Select --' },
      { value: 'full-time', label: 'Full-time' },
      { value: 'part-time', label: 'Part-time' },
      { value: 'contractor', label: 'Contractor' },
      { value: 'intern', label: 'Intern' }
    ].forEach(opt => {
      const option = this.createElement('option', { value: opt.value }, [opt.label]);
      employmentSelect.appendChild(option);
    });

    employmentGroup.appendChild(employmentLabel);
    employmentGroup.appendChild(employmentSelect);
    form.appendChild(employmentGroup);

    // Department
    const deptField = this.createFormField('department', 'Department', 'text', false, { placeholder: 'e.g., Engineering, Sales' });
    form.appendChild(deptField);

    // Position
    const posField = this.createFormField('position', 'Position', 'text', false, { placeholder: 'e.g., Software Developer, Manager' });
    form.appendChild(posField);

    // Form actions
    const formActions = this.createElement('div', { className: 'form-actions' });

    const assignBtn = this.createElement('button', {
      type: 'submit',
      className: 'btn btn-primary'
    }, ['Assign Worker']);

    const cancelBtn = this.createElement('button', {
      type: 'button',
      className: 'btn btn-secondary',
      onclick: () => overlay.remove()
    }, ['Cancel']);

    formActions.appendChild(assignBtn);
    formActions.appendChild(cancelBtn);
    form.appendChild(formActions);

    modal.appendChild(form);
    overlay.appendChild(modal);

    // Add to document
    document.body.appendChild(overlay);

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });
  }

  // ==========================================
  // NAVIGATION
  // ==========================================

  /**
   * Show branch list view
   */
  showBranchList() {
    this.currentView = 'branch-list';
    this.currentBranch = null;
    this.currentBuilding = null;
    this.currentWorkstation = null;
    this.currentEntityType = null;
    this.currentEntityId = null;
    this.navigationStack = [];
    this.render();
  }

  /**
   * Show building list for a branch
   */
  async showBuildingList(branchId) {
    try {
      // Load branch details
      this.currentBranch = await this.db.read(branchId);

      // Load buildings
      await this.loadBuildingsForBranch(branchId);

      this.currentView = 'building-list';
      this.currentBuilding = null;
      this.currentWorkstation = null;
      this.currentEntityType = null;
      this.currentEntityId = null;

      this.render();
    } catch (error) {
      this.logger.error('Failed to show building list:', error);
      this.showError('Failed to load buildings');
    }
  }

  /**
   * Show workstation list for a building
   */
  async showWorkstationList(buildingId) {
    try {
      // Load building details
      this.currentBuilding = await this.db.read(buildingId);

      // Make sure we have branch loaded
      if (!this.currentBranch || this.currentBranch._id !== this.currentBuilding.branchId) {
        this.currentBranch = await this.db.read(this.currentBuilding.branchId);
      }

      // Load workstations
      await this.loadWorkstationsForBuilding(buildingId);

      this.currentView = 'workstation-list';
      this.currentWorkstation = null;
      this.currentEntityType = null;
      this.currentEntityId = null;

      this.render();
    } catch (error) {
      this.logger.error('Failed to show workstation list:', error);
      this.showError('Failed to load workstations');
    }
  }

  /**
   * Show edit form for creating or editing an entity
   */
  async showEditForm(entityType, entityId = null) {
    this.currentView = 'edit';
    this.currentEntityType = entityType;
    this.currentEntityId = entityId;

    if (entityId) {
      // Load entity for editing
      try {
        const entity = await this.db.read(entityId);
        if (entityType === 'branch') {
          this.currentBranch = entity;
        } else if (entityType === 'building') {
          this.currentBuilding = entity;
        } else if (entityType === 'workstation') {
          this.currentWorkstation = entity;
        }
      } catch (error) {
        this.logger.error('Failed to load entity:', error);
        this.showError('Failed to load entity details');
        return;
      }
    } else {
      // Creating new
      if (entityType === 'branch') {
        this.currentBranch = null;
      } else if (entityType === 'building') {
        this.currentBuilding = null;
      } else if (entityType === 'workstation') {
        this.currentWorkstation = null;
      }
    }

    this.render();
  }

  /**
   * Navigate back to previous view
   */
  navigateBack() {
    if (this.currentView === 'edit' || this.currentView === 'view-details') {
      // Return to list view
      if (this.currentEntityType === 'branch') {
        this.showBranchList();
      } else if (this.currentEntityType === 'building') {
        if (this.currentBranch) {
          this.showBuildingList(this.currentBranch._id);
        } else {
          this.showBranchList();
        }
      } else if (this.currentEntityType === 'workstation') {
        if (this.currentBuilding) {
          this.showWorkstationList(this.currentBuilding._id);
        } else {
          this.showBranchList();
        }
      }
    } else if (this.currentView === 'building-list') {
      this.showBranchList();
    } else if (this.currentView === 'workstation-list') {
      if (this.currentBranch) {
        this.showBuildingList(this.currentBranch._id);
      } else {
        this.showBranchList();
      }
    } else {
      this.showBranchList();
    }
  }

  // ==========================================
  // UI RENDERING - BRANCH LIST
  // ==========================================

  /**
   * Render branch list view
   */
  async renderBranchList() {
    // Check approval authority for UI
    const hasAuthority = await this.hasApprovalAuthority();

    // Header
    const header = this.createElement('div', { className: 'miniapp-header' });
    const title = this.createElement('h2', {}, ['Branches']);
    header.appendChild(title);

    // User info
    if (this.currentUser && this.currentOrganization) {
      const userInfo = this.createElement('div', { className: 'user-info' },
        [`${this.currentOrganization.name} - Managing as: ${this.currentUser.username}`]
      );
      header.appendChild(userInfo);
    }

    this.container.appendChild(header);

    // Permission notice
    if (!hasAuthority) {
      const notice = this.createElement('div', {
        className: 'permission-notice',
        style: 'background: #fff3e0; border-left: 4px solid #ff9800; padding: 12px; margin-bottom: 16px; border-radius: 4px;'
      }, ['ℹ️ You have view-only access. Contact the Organization Owner or Facilities Management - Space Planning team (seniority 6+) to request changes.']);
      this.container.appendChild(notice);
    }

    // Actions
    const actions = this.createElement('div', { className: 'branch-actions' });

    if (hasAuthority) {
      const createBtn = this.createElement('button', {
        className: 'btn btn-primary',
        onclick: () => this.showEditForm('branch', null)
      }, ['+ Create Branch']);
      actions.appendChild(createBtn);
    }

    this.container.appendChild(actions);

    // List container
    const listContainer = this.createElement('div', { className: 'branch-list-container' });

    if (this.branches.length === 0) {
      const emptyState = this.createElement('div', { className: 'empty-state' });
      const icon = this.createElement('div', { className: 'empty-state-icon' }, ['🏢']);
      const emptyTitle = this.createElement('h3', {}, ['No Branches Yet']);
      const emptyMessage = this.createElement('p', {}, ['Create your first branch to get started.']);

      emptyState.appendChild(icon);
      emptyState.appendChild(emptyTitle);
      emptyState.appendChild(emptyMessage);
      listContainer.appendChild(emptyState);
    } else {
      this.branches.forEach(branch => {
        const card = this.renderBranchCard(branch, hasAuthority);
        listContainer.appendChild(card);
      });
    }

    this.container.appendChild(listContainer);
  }

  /**
   * Render a branch card
   */
  renderBranchCard(branch, hasAuthority = false) {
    const card = this.createElement('div', { className: 'branch-card' });

    // Header with name and status
    const cardHeader = this.createElement('div', { className: 'branch-card-header' });
    const name = this.createElement('h3', { className: 'branch-name' }, [branch.name]);
    const statusBadge = this.createElement('span', {
      className: `status-badge status-${branch.status}`
    }, [branch.status]);

    cardHeader.appendChild(name);
    cardHeader.appendChild(statusBadge);
    card.appendChild(cardHeader);

    // Code
    const code = this.createElement('div', { className: 'branch-code' }, [`Code: ${branch.code}`]);
    card.appendChild(code);

    // Description (if provided)
    if (branch.description) {
      const description = this.createElement('div', { className: 'branch-description' },
        [branch.description.substring(0, 100) + (branch.description.length > 100 ? '...' : '')]
      );
      card.appendChild(description);
    }

    // Stats
    const stats = this.createElement('div', { className: 'branch-stats' });
    const buildingStat = this.createElement('div', { className: 'stat-item' },
      [`🏗️ ${branch.totalBuildings || 0} Building${branch.totalBuildings !== 1 ? 's' : ''}`]
    );
    const workstationStat = this.createElement('div', { className: 'stat-item' },
      [`💼 ${branch.totalWorkstations || 0} Workstation${branch.totalWorkstations !== 1 ? 's' : ''}`]
    );
    const workerStat = this.createElement('div', { className: 'stat-item' },
      [`👥 ${branch.totalAssignedWorkers || 0} Worker${branch.totalAssignedWorkers !== 1 ? 's' : ''}`]
    );

    stats.appendChild(buildingStat);
    stats.appendChild(workstationStat);
    stats.appendChild(workerStat);
    card.appendChild(stats);

    // Actions
    const actions = this.createElement('div', { className: 'branch-card-actions' });

    const manageBuildingsBtn = this.createElement('button', {
      className: 'btn btn-sm btn-primary',
      onclick: () => this.showBuildingList(branch._id)
    }, ['🏗️ Manage Buildings']);

    actions.appendChild(manageBuildingsBtn);

    if (hasAuthority) {
      const editBtn = this.createElement('button', {
        className: 'btn btn-sm btn-secondary',
        onclick: () => this.showEditForm('branch', branch._id)
      }, ['Edit']);

      const deleteBtn = this.createElement('button', {
        className: 'btn btn-sm btn-danger',
        onclick: async () => {
          const deleted = await this.deleteBranch(branch);
          if (deleted) {
            await this.loadBranches();
          }
        }
      }, ['Delete']);

      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);
    }

    card.appendChild(actions);

    return card;
  }

  // ==========================================
  // UI RENDERING - BUILDING LIST
  // ==========================================

  /**
   * Render building list view
   */
  async renderBuildingList() {
    // Check approval authority for UI
    const hasAuthority = await this.hasApprovalAuthority();

    // Breadcrumb
    const breadcrumb = this.createElement('div', { className: 'breadcrumb' });
    const orgCrumb = this.createElement('span', {
      className: 'breadcrumb-item',
      onclick: () => this.showBranchList()
    }, [this.currentOrganization.name]);
    const separator1 = this.createElement('span', { className: 'breadcrumb-separator' }, ['>']);
    const branchCrumb = this.createElement('span', {
      className: 'breadcrumb-item',
      onclick: () => this.showBranchList()
    }, ['Branches']);
    const separator2 = this.createElement('span', { className: 'breadcrumb-separator' }, ['>']);
    const currentCrumb = this.createElement('span', { className: 'breadcrumb-current' },
      [this.currentBranch.name]);

    breadcrumb.appendChild(orgCrumb);
    breadcrumb.appendChild(separator1);
    breadcrumb.appendChild(branchCrumb);
    breadcrumb.appendChild(separator2);
    breadcrumb.appendChild(currentCrumb);
    this.container.appendChild(breadcrumb);

    // Header
    const header = this.createElement('div', { className: 'miniapp-header' });
    const title = this.createElement('h2', {}, [`Buildings - ${this.currentBranch.name}`]);
    header.appendChild(title);
    this.container.appendChild(header);

    // Permission notice
    if (!hasAuthority) {
      const notice = this.createElement('div', {
        className: 'permission-notice',
        style: 'background: #fff3e0; border-left: 4px solid #ff9800; padding: 12px; margin-bottom: 16px; border-radius: 4px;'
      }, ['ℹ️ You have view-only access. Contact the Organization Owner or Facilities Management - Space Planning team (seniority 6+) to request changes.']);
      this.container.appendChild(notice);
    }

    // Actions
    const actions = this.createElement('div', { className: 'branch-actions' });

    const backBtn = this.createElement('button', {
      className: 'btn btn-secondary',
      onclick: () => this.showBranchList()
    }, ['← Back to Branches']);

    actions.appendChild(backBtn);

    if (hasAuthority) {
      const createBtn = this.createElement('button', {
        className: 'btn btn-primary',
        onclick: () => this.showEditForm('building', null)
      }, ['+ Create Building']);

      actions.appendChild(createBtn);
    }

    this.container.appendChild(actions);

    // List container
    const listContainer = this.createElement('div', { className: 'branch-list-container' });

    if (this.buildings.length === 0) {
      const emptyState = this.createElement('div', { className: 'empty-state' });
      const icon = this.createElement('div', { className: 'empty-state-icon' }, ['🏗️']);
      const emptyTitle = this.createElement('h3', {}, ['No Buildings Yet']);
      const emptyMessage = this.createElement('p', {},
        [`Create your first building for ${this.currentBranch.name}.`]);

      emptyState.appendChild(icon);
      emptyState.appendChild(emptyTitle);
      emptyState.appendChild(emptyMessage);
      listContainer.appendChild(emptyState);
    } else {
      this.buildings.forEach(building => {
        const card = this.renderBuildingCard(building, hasAuthority);
        listContainer.appendChild(card);
      });
    }

    this.container.appendChild(listContainer);
  }

  /**
   * Render a building card
   */
  renderBuildingCard(building, hasAuthority = false) {
    const card = this.createElement('div', { className: 'building-card' });

    // Header with name and status
    const cardHeader = this.createElement('div', { className: 'building-card-header' });
    const name = this.createElement('h3', { className: 'building-name' }, [building.name]);
    const statusBadge = this.createElement('span', {
      className: `status-badge status-${building.status}`
    }, [building.status]);

    cardHeader.appendChild(name);
    cardHeader.appendChild(statusBadge);
    card.appendChild(cardHeader);

    // Code
    const code = this.createElement('div', { className: 'building-code' }, [`Code: ${building.code}`]);
    card.appendChild(code);

    // Type
    const type = this.createElement('div', { className: 'building-type' },
      [`Type: ${this.capitalize(building.buildingType || 'office')}`]);
    card.appendChild(type);

    // Address
    if (building.address) {
      const address = this.createElement('div', { className: 'building-address' },
        [`📍 ${building.address}`]);
      card.appendChild(address);
    }

    // Details
    const details = this.createElement('div', { className: 'building-details' });
    if (building.yearBuilt) {
      const year = this.createElement('div', { className: 'detail-item' },
        [`Built: ${building.yearBuilt}`]);
      details.appendChild(year);
    }
    if (building.totalFloors) {
      const floors = this.createElement('div', { className: 'detail-item' },
        [`Floors: ${building.totalFloors}`]);
      details.appendChild(floors);
    }
    if (building.squareFeetage) {
      const sqft = this.createElement('div', { className: 'detail-item' },
        [`Area: ${building.squareFeetage.toLocaleString()} sq ft`]);
      details.appendChild(sqft);
    }
    if (details.children.length > 0) {
      card.appendChild(details);
    }

    // Stats
    const stats = this.createElement('div', { className: 'branch-stats' });
    const workstationStat = this.createElement('div', { className: 'stat-item' },
      [`💼 ${building.totalWorkstations || 0} Workstation${building.totalWorkstations !== 1 ? 's' : ''}`]
    );
    const assignedStat = this.createElement('div', { className: 'stat-item' },
      [`👥 ${building.totalAssignedWorkstations || 0} Assigned`]
    );

    stats.appendChild(workstationStat);
    stats.appendChild(assignedStat);
    card.appendChild(stats);

    // Actions
    const actions = this.createElement('div', { className: 'building-card-actions' });

    const manageWorkstationsBtn = this.createElement('button', {
      className: 'btn btn-sm btn-primary',
      onclick: () => this.showWorkstationList(building._id)
    }, ['💼 Manage Workstations']);

    actions.appendChild(manageWorkstationsBtn);

    if (hasAuthority) {
      const editBtn = this.createElement('button', {
        className: 'btn btn-sm btn-secondary',
        onclick: () => this.showEditForm('building', building._id)
      }, ['Edit']);

      const deleteBtn = this.createElement('button', {
        className: 'btn btn-sm btn-danger',
        onclick: async () => {
          const deleted = await this.deleteBuilding(building);
          if (deleted) {
            await this.loadBuildingsForBranch(this.currentBranch._id);
          }
        }
      }, ['Delete']);

      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);
    }

    card.appendChild(actions);

    return card;
  }

  // ==========================================
  // UI RENDERING - WORKSTATION LIST
  // ==========================================

  /**
   * Render workstation list view
   */
  async renderWorkstationList() {
    // Check approval authority for UI
    const hasAuthority = await this.hasApprovalAuthority();

    // Breadcrumb
    const breadcrumb = this.createElement('div', { className: 'breadcrumb' });
    const orgCrumb = this.createElement('span', {
      className: 'breadcrumb-item',
      onclick: () => this.showBranchList()
    }, [this.currentOrganization.name]);
    const separator1 = this.createElement('span', { className: 'breadcrumb-separator' }, ['>']);
    const branchCrumb = this.createElement('span', {
      className: 'breadcrumb-item',
      onclick: () => this.showBranchList()
    }, ['Branches']);
    const separator2 = this.createElement('span', { className: 'breadcrumb-separator' }, ['>']);
    const branchNameCrumb = this.createElement('span', {
      className: 'breadcrumb-item',
      onclick: () => this.showBuildingList(this.currentBranch._id)
    }, [this.currentBranch.name]);
    const separator3 = this.createElement('span', { className: 'breadcrumb-separator' }, ['>']);
    const buildingCrumb = this.createElement('span', {
      className: 'breadcrumb-item',
      onclick: () => this.showBuildingList(this.currentBranch._id)
    }, ['Buildings']);
    const separator4 = this.createElement('span', { className: 'breadcrumb-separator' }, ['>']);
    const currentCrumb = this.createElement('span', { className: 'breadcrumb-current' },
      [this.currentBuilding.name]);

    breadcrumb.appendChild(orgCrumb);
    breadcrumb.appendChild(separator1);
    breadcrumb.appendChild(branchCrumb);
    breadcrumb.appendChild(separator2);
    breadcrumb.appendChild(branchNameCrumb);
    breadcrumb.appendChild(separator3);
    breadcrumb.appendChild(buildingCrumb);
    breadcrumb.appendChild(separator4);
    breadcrumb.appendChild(currentCrumb);
    this.container.appendChild(breadcrumb);

    // Header
    const header = this.createElement('div', { className: 'miniapp-header' });
    const title = this.createElement('h2', {}, [`Workstations - ${this.currentBuilding.name}`]);
    header.appendChild(title);
    this.container.appendChild(header);

    // Permission notice
    if (!hasAuthority) {
      const notice = this.createElement('div', {
        className: 'permission-notice',
        style: 'background: #fff3e0; border-left: 4px solid #ff9800; padding: 12px; margin-bottom: 16px; border-radius: 4px;'
      }, ['ℹ️ You have view-only access. Contact the Organization Owner or Facilities Management - Space Planning team (seniority 6+) to request changes.']);
      this.container.appendChild(notice);
    }

    // Actions
    const actions = this.createElement('div', { className: 'branch-actions' });

    const backBtn = this.createElement('button', {
      className: 'btn btn-secondary',
      onclick: () => this.showBuildingList(this.currentBranch._id)
    }, ['← Back to Buildings']);

    actions.appendChild(backBtn);

    if (hasAuthority) {
      const createBtn = this.createElement('button', {
        className: 'btn btn-primary',
        onclick: () => this.showEditForm('workstation', null)
      }, ['+ Create Workstation']);

      actions.appendChild(createBtn);
    }

    this.container.appendChild(actions);

    // List container
    const listContainer = this.createElement('div', { className: 'branch-list-container' });

    if (this.workstations.length === 0) {
      const emptyState = this.createElement('div', { className: 'empty-state' });
      const icon = this.createElement('div', { className: 'empty-state-icon' }, ['💼']);
      const emptyTitle = this.createElement('h3', {}, ['No Workstations Yet']);
      const emptyMessage = this.createElement('p', {},
        [`Create your first workstation for ${this.currentBuilding.name}.`]);

      emptyState.appendChild(icon);
      emptyState.appendChild(emptyTitle);
      emptyState.appendChild(emptyMessage);
      listContainer.appendChild(emptyState);
    } else {
      this.workstations.forEach(workstation => {
        const card = this.renderWorkstationCard(workstation, hasAuthority);
        listContainer.appendChild(card);
      });
    }

    this.container.appendChild(listContainer);
  }

  /**
   * Render a workstation card
   */
  renderWorkstationCard(workstation, hasAuthority = false) {
    const card = this.createElement('div', { className: 'workstation-card' });

    // Header with name and status
    const cardHeader = this.createElement('div', { className: 'workstation-card-header' });
    const name = this.createElement('h3', { className: 'workstation-name' }, [workstation.name]);
    const statusBadge = this.createElement('span', {
      className: `status-badge status-${workstation.status}`
    }, [workstation.status]);

    cardHeader.appendChild(name);
    cardHeader.appendChild(statusBadge);
    card.appendChild(cardHeader);

    // Code
    const code = this.createElement('div', { className: 'workstation-code' }, [`Code: ${workstation.code}`]);
    card.appendChild(code);

    // Type
    const type = this.createElement('div', { className: 'workstation-type' },
      [`Type: ${this.capitalize(workstation.workstationType || 'desk').replace('_', ' ')}`]);
    card.appendChild(type);

    // Location
    if (workstation.location) {
      const location = this.createElement('div', { className: 'workstation-location' },
        [`📍 ${workstation.location}`]);
      card.appendChild(location);
    }

    // Assignment info (if assigned)
    if (workstation.assignedWorkerId) {
      const assignmentInfo = this.createElement('div', { className: 'assignment-info' });
      const assignmentTitle = this.createElement('div', { className: 'assignment-info-title' },
        ['Assigned To:']);
      const workerName = this.createElement('div', { className: 'assignment-detail' },
        [`👤 ${workstation.assignedWorkerName}`]);

      assignmentInfo.appendChild(assignmentTitle);
      assignmentInfo.appendChild(workerName);

      if (workstation.department) {
        const dept = this.createElement('div', { className: 'assignment-detail' },
          [`Dept: ${workstation.department}`]);
        assignmentInfo.appendChild(dept);
      }

      if (workstation.position) {
        const pos = this.createElement('div', { className: 'assignment-detail' },
          [`Position: ${workstation.position}`]);
        assignmentInfo.appendChild(pos);
      }

      card.appendChild(assignmentInfo);
    }

    // Equipment (if any)
    if (workstation.equipment && workstation.equipment.length > 0) {
      const equipDiv = this.createElement('div', { className: 'workstation-equipment' });
      const equipTitle = this.createElement('strong', {}, ['Equipment: ']);
      const equipList = this.createElement('span', {}, [workstation.equipment.join(', ')]);
      equipDiv.appendChild(equipTitle);
      equipDiv.appendChild(equipList);
      card.appendChild(equipDiv);
    }

    // Amenities (if any)
    if (workstation.amenities && workstation.amenities.length > 0) {
      const amenDiv = this.createElement('div', { className: 'workstation-amenities' });
      const amenTitle = this.createElement('strong', {}, ['Amenities: ']);
      const amenList = this.createElement('span', {}, [workstation.amenities.join(', ')]);
      amenDiv.appendChild(amenTitle);
      amenDiv.appendChild(amenList);
      card.appendChild(amenDiv);
    }

    // Actions
    const actions = this.createElement('div', { className: 'workstation-card-actions' });

    // Show Assign or Unassign button based on assignment status
    if (workstation.assignedWorkerId) {
      // Unassign button
      const unassignBtn = this.createElement('button', {
        className: 'btn btn-sm btn-warning',
        onclick: async () => {
          const result = await this.unassignWorker(workstation._id);
          if (result) {
            await this.loadWorkstationsForBuilding(this.currentBuilding._id);
          }
        }
      }, ['Unassign Worker']);
      actions.appendChild(unassignBtn);
    } else {
      // Assign button
      const assignBtn = this.createElement('button', {
        className: 'btn btn-sm btn-primary',
        onclick: () => this.showAssignmentModal(workstation)
      }, ['👤 Assign Worker']);
      actions.appendChild(assignBtn);
    }

    if (hasAuthority) {
      const editBtn = this.createElement('button', {
        className: 'btn btn-sm btn-secondary',
        onclick: () => this.showEditForm('workstation', workstation._id)
      }, ['Edit']);

      const deleteBtn = this.createElement('button', {
        className: 'btn btn-sm btn-danger',
        onclick: async () => {
          const deleted = await this.deleteWorkstation(workstation);
          if (deleted) {
            await this.loadWorkstationsForBuilding(this.currentBuilding._id);
          }
        }
      }, ['Delete']);

      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);
    }

    card.appendChild(actions);

    return card;
  }

  // ==========================================
  // UI RENDERING - EDIT FORM
  // ==========================================

  /**
   * Render edit/create form
   */
  renderEditForm() {
    const isEdit = this.currentEntityId !== null;
    const entityType = this.currentEntityType;

    // Header
    const header = this.createElement('div', { className: 'miniapp-header' });
    const title = this.createElement('h2', {},
      [isEdit ? `Edit ${this.capitalize(entityType)}` : `Create ${this.capitalize(entityType)}`]
    );
    header.appendChild(title);
    this.container.appendChild(header);

    // Form
    const form = this.createElement('form', {
      className: 'branch-form',
      onsubmit: async (e) => {
        e.preventDefault();
        await this.handleFormSubmit(e);
      }
    });

    if (entityType === 'branch') {
      this.renderBranchForm(form, isEdit);
    } else if (entityType === 'building') {
      this.renderBuildingForm(form, isEdit);
    } else if (entityType === 'workstation') {
      this.renderWorkstationForm(form, isEdit);
    }

    this.container.appendChild(form);
  }

  /**
   * Render branch form fields
   */
  renderBranchForm(form, isEdit) {
    // Basic Information Section
    const basicSection = this.createFormSection('Basic Information', [
      this.createFormField('name', 'Branch Name *', 'text', true),
      this.createFormField('code', 'Branch Code *', 'text', true),
      this.createFormField('description', 'Description', 'textarea', false),
      this.createFormSelect('status', 'Status *', [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'planned', label: 'Planned' },
        { value: 'closed', label: 'Closed' }
      ], true)
    ]);
    form.appendChild(basicSection);

    // Contact Information Section
    const contactSection = this.createFormSection('Contact Information', [
      this.createFormField('phone', 'Phone', 'tel', false),
      this.createFormField('email', 'Email', 'email', false)
    ]);
    form.appendChild(contactSection);

    // Form Actions
    const formActions = this.createElement('div', { className: 'form-actions' });

    const saveBtn = this.createElement('button', {
      type: 'submit',
      className: 'btn btn-primary'
    }, [isEdit ? 'Update Branch' : 'Create Branch']);

    const cancelBtn = this.createElement('button', {
      type: 'button',
      className: 'btn btn-secondary',
      onclick: () => this.navigateBack()
    }, ['Cancel']);

    formActions.appendChild(saveBtn);
    formActions.appendChild(cancelBtn);
    form.appendChild(formActions);

    // Populate form if editing
    if (isEdit && this.currentBranch) {
      this.populateForm(form, this.currentBranch);
    }
  }

  /**
   * Render building form fields
   */
  renderBuildingForm(form, isEdit) {
    // Basic Information Section
    const basicSection = this.createFormSection('Basic Information', [
      this.createFormField('name', 'Building Name *', 'text', true),
      this.createFormField('code', 'Building Code *', 'text', true),
      this.createFormField('description', 'Description', 'textarea', false),
      this.createFormSelect('buildingType', 'Building Type *', [
        { value: 'office', label: 'Office' },
        { value: 'warehouse', label: 'Warehouse' },
        { value: 'retail', label: 'Retail' },
        { value: 'mixed', label: 'Mixed Use' },
        { value: 'industrial', label: 'Industrial' }
      ], true),
      this.createFormSelect('status', 'Status *', [
        { value: 'active', label: 'Active' },
        { value: 'under_construction', label: 'Under Construction' },
        { value: 'maintenance', label: 'Maintenance' },
        { value: 'closed', label: 'Closed' }
      ], true)
    ]);
    form.appendChild(basicSection);

    // Location Information Section
    const locationSection = this.createFormSection('Location Information', [
      this.createFormField('address', 'Full Address *', 'textarea', true, { rows: 3, placeholder: 'Street, City, State, Postal Code, Country' }),
      this.createFormField('latitude', 'Latitude', 'number', false, { step: 'any', placeholder: 'e.g., 40.7128' }),
      this.createFormField('longitude', 'Longitude', 'number', false, { step: 'any', placeholder: 'e.g., -74.0060' })
    ]);
    form.appendChild(locationSection);

    // Building Details Section
    const detailsSection = this.createFormSection('Building Details', [
      this.createFormField('yearBuilt', 'Year Built', 'number', false, { min: 1800, max: new Date().getFullYear() + 5, placeholder: 'e.g., 2020' }),
      this.createFormField('totalFloors', 'Total Floors', 'number', false, { min: 1, placeholder: 'e.g., 5' }),
      this.createFormField('squareFeetage', 'Square Footage', 'number', false, { min: 1, placeholder: 'e.g., 50000' })
    ]);
    form.appendChild(detailsSection);

    // Form Actions
    const formActions = this.createElement('div', { className: 'form-actions' });

    const saveBtn = this.createElement('button', {
      type: 'submit',
      className: 'btn btn-primary'
    }, [isEdit ? 'Update Building' : 'Create Building']);

    const cancelBtn = this.createElement('button', {
      type: 'button',
      className: 'btn btn-secondary',
      onclick: () => this.navigateBack()
    }, ['Cancel']);

    formActions.appendChild(saveBtn);
    formActions.appendChild(cancelBtn);
    form.appendChild(formActions);

    // Populate form if editing
    if (isEdit && this.currentBuilding) {
      this.populateForm(form, this.currentBuilding);
    }
  }

  /**
   * Render workstation form fields
   */
  renderWorkstationForm(form, isEdit) {
    // Basic Information Section
    const basicSection = this.createFormSection('Basic Information', [
      this.createFormField('name', 'Workstation Name *', 'text', true),
      this.createFormField('code', 'Workstation Code *', 'text', true),
      this.createFormField('description', 'Description', 'textarea', false),
      this.createFormSelect('workstationType', 'Workstation Type *', [
        { value: 'desk', label: 'Desk' },
        { value: 'cubicle', label: 'Cubicle' },
        { value: 'hot_desk', label: 'Hot Desk' },
        { value: 'standing_desk', label: 'Standing Desk' },
        { value: 'bench', label: 'Bench' },
        { value: 'meeting_room', label: 'Meeting Room' }
      ], true),
      this.createFormField('location', 'Location in Building', 'text', false, { placeholder: 'e.g., Floor 4, Room 401' })
    ]);
    form.appendChild(basicSection);

    // Equipment & Amenities Section
    const equipSection = this.createFormSection('Equipment & Amenities', [
      this.createFormField('equipment', 'Equipment', 'text', false, { placeholder: 'Comma-separated list: computer, monitor, phone' }),
      this.createFormField('amenities', 'Amenities', 'text', false, { placeholder: 'Comma-separated list: wifi, AC, printer_access' })
    ]);
    form.appendChild(equipSection);

    // Form Actions
    const formActions = this.createElement('div', { className: 'form-actions' });

    const saveBtn = this.createElement('button', {
      type: 'submit',
      className: 'btn btn-primary'
    }, [isEdit ? 'Update Workstation' : 'Create Workstation']);

    const cancelBtn = this.createElement('button', {
      type: 'button',
      className: 'btn btn-secondary',
      onclick: () => this.navigateBack()
    }, ['Cancel']);

    formActions.appendChild(saveBtn);
    formActions.appendChild(cancelBtn);
    form.appendChild(formActions);

    // Populate form if editing
    if (isEdit && this.currentWorkstation) {
      this.populateForm(form, this.currentWorkstation);

      // Handle equipment and amenities arrays
      const equipField = form.querySelector('[name="equipment"]');
      const amenField = form.querySelector('[name="amenities"]');

      if (equipField && this.currentWorkstation.equipment) {
        equipField.value = Array.isArray(this.currentWorkstation.equipment) ?
          this.currentWorkstation.equipment.join(', ') : this.currentWorkstation.equipment;
      }

      if (amenField && this.currentWorkstation.amenities) {
        amenField.value = Array.isArray(this.currentWorkstation.amenities) ?
          this.currentWorkstation.amenities.join(', ') : this.currentWorkstation.amenities;
      }
    }
  }

  /**
   * Create form section
   */
  createFormSection(title, fields) {
    const section = this.createElement('div', { className: 'form-section' });
    const sectionTitle = this.createElement('h3', { className: 'form-section-title' }, [title]);
    section.appendChild(sectionTitle);

    fields.forEach(field => section.appendChild(field));

    return section;
  }

  /**
   * Create form field
   */
  createFormField(name, label, type, required, additionalAttrs = {}) {
    const group = this.createElement('div', { className: 'form-group' });
    const labelEl = this.createElement('label', { for: `field-${name}` }, [label]);
    group.appendChild(labelEl);

    let input;
    if (type === 'textarea') {
      input = this.createElement('textarea', {
        id: `field-${name}`,
        name: name,
        className: 'input',
        required: required,
        rows: 4,
        placeholder: label,
        ...additionalAttrs
      });
    } else {
      input = this.createElement('input', {
        id: `field-${name}`,
        name: name,
        type: type,
        className: 'input',
        required: required,
        placeholder: label,
        ...additionalAttrs
      });
    }

    group.appendChild(input);
    return group;
  }

  /**
   * Create form select field
   */
  createFormSelect(name, label, options, required) {
    const group = this.createElement('div', { className: 'form-group' });
    const labelEl = this.createElement('label', { for: `field-${name}` }, [label]);
    group.appendChild(labelEl);

    const select = this.createElement('select', {
      id: `field-${name}`,
      name: name,
      className: 'input',
      required: required
    });

    options.forEach(opt => {
      const option = this.createElement('option', { value: opt.value }, [opt.label]);
      select.appendChild(option);
    });

    group.appendChild(select);
    return group;
  }

  /**
   * Populate form with entity data
   */
  populateForm(form, entity) {
    // Basic fields
    Object.keys(entity).forEach(key => {
      const field = form.querySelector(`[name="${key}"]`);
      if (field && !key.startsWith('_') && typeof entity[key] !== 'object') {
        field.value = entity[key] || '';
      }
    });

    // For building/workstation forms - handle nested objects
    if (entity.address) {
      ['street', 'city', 'state', 'postalCode', 'country'].forEach(key => {
        const field = form.querySelector(`[name="${key}"]`);
        if (field && entity.address[key]) {
          field.value = entity.address[key];
        }
      });
    }

    if (entity.coordinates) {
      const latField = form.querySelector('[name="latitude"]');
      const lonField = form.querySelector('[name="longitude"]');
      if (latField && entity.coordinates.latitude) {
        latField.value = entity.coordinates.latitude;
      }
      if (lonField && entity.coordinates.longitude) {
        lonField.value = entity.coordinates.longitude;
      }
    }
  }

  /**
   * Get form data as object
   */
  getFormData(form) {
    const formData = new FormData(form);
    const data = {};

    for (let [key, value] of formData.entries()) {
      data[key] = typeof value === 'string' ? value.trim() : value;
    }

    return data;
  }

  /**
   * Handle form submission
   */
  async handleFormSubmit(event) {
    event.preventDefault();

    const form = event.target;
    const data = this.getFormData(form);
    const entityType = this.currentEntityType;
    const isEdit = this.currentEntityId !== null;

    let result;
    if (entityType === 'branch') {
      if (isEdit) {
        // Include _id and _rev for update
        data._id = this.currentBranch._id;
        data._rev = this.currentBranch._rev;
        result = await this.updateBranch(data);
      } else {
        result = await this.createBranch(data);
      }

      if (result) {
        await this.loadBranches();
        this.navigateBack();
      }
    } else if (entityType === 'building') {
      if (isEdit) {
        // Include _id and _rev for update
        data._id = this.currentBuilding._id;
        data._rev = this.currentBuilding._rev;
        data.branchId = this.currentBuilding.branchId;
        data.branchName = this.currentBuilding.branchName;
        data.organizationId = this.currentBuilding.organizationId;
        result = await this.updateBuilding(data);
      } else {
        result = await this.createBuilding(data);
      }

      if (result) {
        await this.loadBuildingsForBranch(this.currentBranch._id);
        this.navigateBack();
      }
    } else if (entityType === 'workstation') {
      if (isEdit) {
        // Include _id and _rev for update
        data._id = this.currentWorkstation._id;
        data._rev = this.currentWorkstation._rev;
        data.buildingId = this.currentWorkstation.buildingId;
        data.buildingName = this.currentWorkstation.buildingName;
        data.branchId = this.currentWorkstation.branchId;
        data.branchName = this.currentWorkstation.branchName;
        data.organizationId = this.currentWorkstation.organizationId;
        data.assignedWorkerId = this.currentWorkstation.assignedWorkerId;
        data.assignedWorkerName = this.currentWorkstation.assignedWorkerName;
        data.assignmentDate = this.currentWorkstation.assignmentDate;
        data.employmentType = this.currentWorkstation.employmentType;
        data.department = this.currentWorkstation.department;
        data.position = this.currentWorkstation.position;
        data.status = this.currentWorkstation.status;
        data.isAvailable = this.currentWorkstation.isAvailable;
        result = await this.updateWorkstation(data);
      } else {
        result = await this.createWorkstation(data);
      }

      if (result) {
        await this.loadWorkstationsForBuilding(this.currentBuilding._id);
        this.navigateBack();
      }
    }
  }

  // ==========================================
  // UI RENDERING - VIEW DETAILS
  // ==========================================

  /**
   * Render entity details view
   */
  async renderViewDetails() {
    const entityType = this.currentEntityType;
    const entityId = this.currentEntityId;

    if (!entityType || !entityId) {
      this.showError('No entity selected for viewing');
      this.navigateBack();
      return;
    }

    try {
      // Load entity
      let entity;
      if (entityType === 'branch') {
        entity = await this.getBranchDetails(entityId);
      } else if (entityType === 'building') {
        entity = await this.getBuildingDetails(entityId);
      } else if (entityType === 'workstation') {
        entity = await this.getWorkstationDetails(entityId);
      }

      if (!entity) {
        this.showError('Entity not found');
        this.navigateBack();
        return;
      }

      // Render based on type
      if (entityType === 'branch') {
        this.renderBranchDetails(entity);
      } else if (entityType === 'building') {
        this.renderBuildingDetails(entity);
      } else if (entityType === 'workstation') {
        this.renderWorkstationDetails(entity);
      }
    } catch (error) {
      this.logger.error('Failed to render details:', error);
      this.showError('Failed to load entity details');
      this.navigateBack();
    }
  }

  /**
   * Render branch details
   */
  renderBranchDetails(branch) {
    // Header
    const header = this.createElement('div', { className: 'miniapp-header' });
    const title = this.createElement('h2', {}, [`Branch Details: ${branch.name}`]);
    header.appendChild(title);
    this.container.appendChild(header);

    // Actions
    const actions = this.createElement('div', { className: 'branch-actions' });

    const backBtn = this.createElement('button', {
      className: 'btn btn-secondary',
      onclick: () => this.showBranchList()
    }, ['← Back to List']);

    const editBtn = this.createElement('button', {
      className: 'btn btn-primary',
      onclick: () => this.showEditForm('branch', branch._id)
    }, ['Edit Branch']);

    const deleteBtn = this.createElement('button', {
      className: 'btn btn-danger',
      onclick: async () => {
        const deleted = await this.deleteBranch(branch);
        if (deleted) {
          this.showBranchList();
        }
      }
    }, ['Delete Branch']);

    actions.appendChild(backBtn);
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    this.container.appendChild(actions);

    // Details card
    const detailsCard = this.createElement('div', { className: 'details-card' });

    // Basic information
    const basicSection = this.createElement('div', { className: 'details-section' });
    const basicTitle = this.createElement('h3', { className: 'details-section-title' }, ['Basic Information']);
    basicSection.appendChild(basicTitle);

    const basicGrid = this.createElement('div', { className: 'details-grid' });

    this.addDetailRow(basicGrid, 'Branch Name', branch.name);
    this.addDetailRow(basicGrid, 'Code', branch.code);
    this.addDetailRow(basicGrid, 'Status', branch.status, `status-badge status-${branch.status}`);
    this.addDetailRow(basicGrid, 'Organization', branch.organizationName);
    if (branch.description) {
      this.addDetailRow(basicGrid, 'Description', branch.description);
    }

    basicSection.appendChild(basicGrid);
    detailsCard.appendChild(basicSection);

    // Contact information
    const contactSection = this.createElement('div', { className: 'details-section' });
    const contactTitle = this.createElement('h3', { className: 'details-section-title' }, ['Contact Information']);
    contactSection.appendChild(contactTitle);

    const contactGrid = this.createElement('div', { className: 'details-grid' });

    if (branch.phone) this.addDetailRow(contactGrid, 'Phone', branch.phone);
    if (branch.email) this.addDetailRow(contactGrid, 'Email', branch.email);

    if (contactGrid.children.length > 0) {
      contactSection.appendChild(contactGrid);
      detailsCard.appendChild(contactSection);
    }

    // Statistics
    const statsSection = this.createElement('div', { className: 'details-section' });
    const statsTitle = this.createElement('h3', { className: 'details-section-title' }, ['Statistics']);
    statsSection.appendChild(statsTitle);

    const statsGrid = this.createElement('div', { className: 'details-grid' });

    this.addDetailRow(statsGrid, 'Total Buildings', branch.totalBuildings || 0);
    this.addDetailRow(statsGrid, 'Total Workstations', branch.totalWorkstations || 0);
    this.addDetailRow(statsGrid, 'Assigned Workers', branch.totalAssignedWorkers || 0);
    this.addDetailRow(statsGrid, 'Operational Status', branch.isOperational ? 'Yes' : 'No');

    statsSection.appendChild(statsGrid);
    detailsCard.appendChild(statsSection);

    // Metadata
    const metaSection = this.createElement('div', { className: 'details-section' });
    const metaTitle = this.createElement('h3', { className: 'details-section-title' }, ['Metadata']);
    metaSection.appendChild(metaTitle);

    const metaGrid = this.createElement('div', { className: 'details-grid' });

    if (branch.createdAt) this.addDetailRow(metaGrid, 'Created', new Date(branch.createdAt).toLocaleString());
    if (branch.updatedAt) this.addDetailRow(metaGrid, 'Last Updated', new Date(branch.updatedAt).toLocaleString());

    metaSection.appendChild(metaGrid);
    detailsCard.appendChild(metaSection);

    this.container.appendChild(detailsCard);
  }

  /**
   * Render building details
   */
  renderBuildingDetails(building) {
    // Breadcrumb
    const breadcrumb = this.createElement('div', { className: 'breadcrumb' });
    const orgCrumb = this.createElement('span', {
      className: 'breadcrumb-item',
      onclick: () => this.showBranchList()
    }, [this.currentOrganization.name]);
    const separator1 = this.createElement('span', { className: 'breadcrumb-separator' }, ['>']);
    const branchCrumb = this.createElement('span', {
      className: 'breadcrumb-item',
      onclick: async () => {
        if (building.branchId) {
          await this.showBuildingList(building.branchId);
        } else {
          this.showBranchList();
        }
      }
    }, [building.branchName || 'Branch']);
    const separator2 = this.createElement('span', { className: 'breadcrumb-separator' }, ['>']);
    const currentCrumb = this.createElement('span', { className: 'breadcrumb-current' }, [building.name]);

    breadcrumb.appendChild(orgCrumb);
    breadcrumb.appendChild(separator1);
    breadcrumb.appendChild(branchCrumb);
    breadcrumb.appendChild(separator2);
    breadcrumb.appendChild(currentCrumb);
    this.container.appendChild(breadcrumb);

    // Header
    const header = this.createElement('div', { className: 'miniapp-header' });
    const title = this.createElement('h2', {}, [`Building Details: ${building.name}`]);
    header.appendChild(title);
    this.container.appendChild(header);

    // Actions
    const actions = this.createElement('div', { className: 'branch-actions' });

    const backBtn = this.createElement('button', {
      className: 'btn btn-secondary',
      onclick: async () => {
        if (building.branchId) {
          await this.showBuildingList(building.branchId);
        } else {
          this.showBranchList();
        }
      }
    }, ['← Back to List']);

    const editBtn = this.createElement('button', {
      className: 'btn btn-primary',
      onclick: () => this.showEditForm('building', building._id)
    }, ['Edit Building']);

    const deleteBtn = this.createElement('button', {
      className: 'btn btn-danger',
      onclick: async () => {
        const deleted = await this.deleteBuilding(building);
        if (deleted && building.branchId) {
          await this.showBuildingList(building.branchId);
        } else {
          this.showBranchList();
        }
      }
    }, ['Delete Building']);

    actions.appendChild(backBtn);
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    this.container.appendChild(actions);

    // Details card
    const detailsCard = this.createElement('div', { className: 'details-card' });

    // Basic information
    const basicSection = this.createElement('div', { className: 'details-section' });
    const basicTitle = this.createElement('h3', { className: 'details-section-title' }, ['Basic Information']);
    basicSection.appendChild(basicTitle);

    const basicGrid = this.createElement('div', { className: 'details-grid' });

    this.addDetailRow(basicGrid, 'Building Name', building.name);
    this.addDetailRow(basicGrid, 'Code', building.code);
    this.addDetailRow(basicGrid, 'Status', building.status, `status-badge status-${building.status}`);
    this.addDetailRow(basicGrid, 'Branch', building.branchName);
    this.addDetailRow(basicGrid, 'Building Type', this.capitalize(building.buildingType || 'office'));
    if (building.description) {
      this.addDetailRow(basicGrid, 'Description', building.description);
    }

    basicSection.appendChild(basicGrid);
    detailsCard.appendChild(basicSection);

    // Location information
    const locationSection = this.createElement('div', { className: 'details-section' });
    const locationTitle = this.createElement('h3', { className: 'details-section-title' }, ['Location']);
    locationSection.appendChild(locationTitle);

    const locationGrid = this.createElement('div', { className: 'details-grid' });

    if (building.address) this.addDetailRow(locationGrid, 'Address', building.address);
    if (building.coordinates && (building.coordinates.latitude || building.coordinates.longitude)) {
      this.addDetailRow(locationGrid, 'Coordinates',
        `${building.coordinates.latitude}, ${building.coordinates.longitude}`);
    }

    if (locationGrid.children.length > 0) {
      locationSection.appendChild(locationGrid);
      detailsCard.appendChild(locationSection);
    }

    // Building details
    const detailsSection = this.createElement('div', { className: 'details-section' });
    const detailsTitle = this.createElement('h3', { className: 'details-section-title' }, ['Building Details']);
    detailsSection.appendChild(detailsTitle);

    const detailsGrid = this.createElement('div', { className: 'details-grid' });

    if (building.yearBuilt) this.addDetailRow(detailsGrid, 'Year Built', building.yearBuilt);
    if (building.totalFloors) this.addDetailRow(detailsGrid, 'Total Floors', building.totalFloors);
    if (building.squareFeetage) this.addDetailRow(detailsGrid, 'Square Footage',
      building.squareFeetage.toLocaleString() + ' sq ft');
    this.addDetailRow(detailsGrid, 'Operational Status', building.isOperational ? 'Yes' : 'No');

    detailsSection.appendChild(detailsGrid);
    detailsCard.appendChild(detailsSection);

    // Statistics
    const statsSection = this.createElement('div', { className: 'details-section' });
    const statsTitle = this.createElement('h3', { className: 'details-section-title' }, ['Workstation Statistics']);
    statsSection.appendChild(statsTitle);

    const statsGrid = this.createElement('div', { className: 'details-grid' });

    this.addDetailRow(statsGrid, 'Total Workstations', building.totalWorkstations || 0);
    this.addDetailRow(statsGrid, 'Assigned Workstations', building.totalAssignedWorkstations || 0);
    this.addDetailRow(statsGrid, 'Available Workstations',
      (building.totalWorkstations || 0) - (building.totalAssignedWorkstations || 0));

    statsSection.appendChild(statsGrid);
    detailsCard.appendChild(statsSection);

    // Metadata
    const metaSection = this.createElement('div', { className: 'details-section' });
    const metaTitle = this.createElement('h3', { className: 'details-section-title' }, ['Metadata']);
    metaSection.appendChild(metaTitle);

    const metaGrid = this.createElement('div', { className: 'details-grid' });

    if (building.createdAt) this.addDetailRow(metaGrid, 'Created', new Date(building.createdAt).toLocaleString());
    if (building.updatedAt) this.addDetailRow(metaGrid, 'Last Updated', new Date(building.updatedAt).toLocaleString());

    metaSection.appendChild(metaGrid);
    detailsCard.appendChild(metaSection);

    this.container.appendChild(detailsCard);
  }

  /**
   * Render workstation details
   */
  renderWorkstationDetails(workstation) {
    // Breadcrumb
    const breadcrumb = this.createElement('div', { className: 'breadcrumb' });
    const orgCrumb = this.createElement('span', {
      className: 'breadcrumb-item',
      onclick: () => this.showBranchList()
    }, [this.currentOrganization.name]);
    const separator1 = this.createElement('span', { className: 'breadcrumb-separator' }, ['>']);
    const branchCrumb = this.createElement('span', {
      className: 'breadcrumb-item',
      onclick: async () => {
        if (workstation.branchId) {
          await this.showBuildingList(workstation.branchId);
        } else {
          this.showBranchList();
        }
      }
    }, [workstation.branchName || 'Branch']);
    const separator2 = this.createElement('span', { className: 'breadcrumb-separator' }, ['>']);
    const buildingCrumb = this.createElement('span', {
      className: 'breadcrumb-item',
      onclick: async () => {
        if (workstation.buildingId) {
          await this.showWorkstationList(workstation.buildingId);
        }
      }
    }, [workstation.buildingName || 'Building']);
    const separator3 = this.createElement('span', { className: 'breadcrumb-separator' }, ['>']);
    const currentCrumb = this.createElement('span', { className: 'breadcrumb-current' }, [workstation.name]);

    breadcrumb.appendChild(orgCrumb);
    breadcrumb.appendChild(separator1);
    breadcrumb.appendChild(branchCrumb);
    breadcrumb.appendChild(separator2);
    breadcrumb.appendChild(buildingCrumb);
    breadcrumb.appendChild(separator3);
    breadcrumb.appendChild(currentCrumb);
    this.container.appendChild(breadcrumb);

    // Header
    const header = this.createElement('div', { className: 'miniapp-header' });
    const title = this.createElement('h2', {}, [`Workstation Details: ${workstation.name}`]);
    header.appendChild(title);
    this.container.appendChild(header);

    // Actions
    const actions = this.createElement('div', { className: 'branch-actions' });

    const backBtn = this.createElement('button', {
      className: 'btn btn-secondary',
      onclick: async () => {
        if (workstation.buildingId) {
          await this.showWorkstationList(workstation.buildingId);
        } else {
          this.showBranchList();
        }
      }
    }, ['← Back to List']);

    const editBtn = this.createElement('button', {
      className: 'btn btn-primary',
      onclick: () => this.showEditForm('workstation', workstation._id)
    }, ['Edit Workstation']);

    const deleteBtn = this.createElement('button', {
      className: 'btn btn-danger',
      onclick: async () => {
        const deleted = await this.deleteWorkstation(workstation);
        if (deleted && workstation.buildingId) {
          await this.showWorkstationList(workstation.buildingId);
        } else {
          this.showBranchList();
        }
      }
    }, ['Delete Workstation']);

    actions.appendChild(backBtn);
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    this.container.appendChild(actions);

    // Details card
    const detailsCard = this.createElement('div', { className: 'details-card' });

    // Basic information
    const basicSection = this.createElement('div', { className: 'details-section' });
    const basicTitle = this.createElement('h3', { className: 'details-section-title' }, ['Basic Information']);
    basicSection.appendChild(basicTitle);

    const basicGrid = this.createElement('div', { className: 'details-grid' });

    this.addDetailRow(basicGrid, 'Workstation Name', workstation.name);
    this.addDetailRow(basicGrid, 'Code', workstation.code);
    this.addDetailRow(basicGrid, 'Status', workstation.status, `status-badge status-${workstation.status}`);
    this.addDetailRow(basicGrid, 'Branch', workstation.branchName);
    this.addDetailRow(basicGrid, 'Building', workstation.buildingName);
    this.addDetailRow(basicGrid, 'Type', this.capitalize(workstation.workstationType || 'desk').replace('_', ' '));
    if (workstation.location) {
      this.addDetailRow(basicGrid, 'Location', workstation.location);
    }
    if (workstation.description) {
      this.addDetailRow(basicGrid, 'Description', workstation.description);
    }

    basicSection.appendChild(basicGrid);
    detailsCard.appendChild(basicSection);

    // Assignment information
    if (workstation.assignedWorkerId) {
      const assignSection = this.createElement('div', { className: 'details-section' });
      const assignTitle = this.createElement('h3', { className: 'details-section-title' }, ['Worker Assignment']);
      assignSection.appendChild(assignTitle);

      const assignGrid = this.createElement('div', { className: 'details-grid' });

      this.addDetailRow(assignGrid, 'Assigned Worker', workstation.assignedWorkerName);
      if (workstation.department) this.addDetailRow(assignGrid, 'Department', workstation.department);
      if (workstation.position) this.addDetailRow(assignGrid, 'Position', workstation.position);
      if (workstation.employmentType) {
        this.addDetailRow(assignGrid, 'Employment Type',
          this.capitalize(workstation.employmentType.replace('-', ' ')));
      }
      if (workstation.assignmentDate) {
        this.addDetailRow(assignGrid, 'Assignment Date',
          new Date(workstation.assignmentDate).toLocaleDateString());
      }

      assignSection.appendChild(assignGrid);
      detailsCard.appendChild(assignSection);
    }

    // Equipment and Amenities
    const equipSection = this.createElement('div', { className: 'details-section' });
    const equipTitle = this.createElement('h3', { className: 'details-section-title' }, ['Equipment & Amenities']);
    equipSection.appendChild(equipTitle);

    const equipGrid = this.createElement('div', { className: 'details-grid' });

    if (workstation.equipment && workstation.equipment.length > 0) {
      this.addDetailRow(equipGrid, 'Equipment', workstation.equipment.join(', '));
    } else {
      this.addDetailRow(equipGrid, 'Equipment', 'None specified');
    }

    if (workstation.amenities && workstation.amenities.length > 0) {
      this.addDetailRow(equipGrid, 'Amenities', workstation.amenities.join(', '));
    } else {
      this.addDetailRow(equipGrid, 'Amenities', 'None specified');
    }

    equipSection.appendChild(equipGrid);
    detailsCard.appendChild(equipSection);

    // Metadata
    const metaSection = this.createElement('div', { className: 'details-section' });
    const metaTitle = this.createElement('h3', { className: 'details-section-title' }, ['Metadata']);
    metaSection.appendChild(metaTitle);

    const metaGrid = this.createElement('div', { className: 'details-grid' });

    if (workstation.createdAt) this.addDetailRow(metaGrid, 'Created', new Date(workstation.createdAt).toLocaleString());
    if (workstation.updatedAt) this.addDetailRow(metaGrid, 'Last Updated', new Date(workstation.updatedAt).toLocaleString());

    metaSection.appendChild(metaGrid);
    detailsCard.appendChild(metaSection);

    this.container.appendChild(detailsCard);
  }

  /**
   * Add a detail row to a grid
   */
  addDetailRow(grid, label, value, valueClass = null) {
    const row = this.createElement('div', { className: 'detail-row' });

    const labelEl = this.createElement('div', { className: 'detail-label' }, [label + ':']);
    const valueEl = this.createElement('div', {
      className: valueClass ? `detail-value ${valueClass}` : 'detail-value'
    }, [String(value)]);

    row.appendChild(labelEl);
    row.appendChild(valueEl);
    grid.appendChild(row);
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  /**
   * Capitalize first letter
   */
  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Format address object to string
   */
  formatAddress(address) {
    if (!address) return '';

    const parts = [
      address.street,
      address.city,
      address.state,
      address.postalCode,
      address.country
    ].filter(p => p && p.trim());

    return parts.join(', ');
  }

  /**
   * Cleanup
   */
  onDestroy() {
    // Clean up components
    Object.values(this.components).forEach(component => {
      if (component && component.destroy) {
        component.destroy();
      }
    });

    this.components = {};
    this.branches = [];
    this.buildings = [];
    this.workstations = [];
  }
}

export { BranchManagementApp };
