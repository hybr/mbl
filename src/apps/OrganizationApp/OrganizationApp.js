/**
 * OrganizationApp.js - Organization Management MiniApp
 * Handles organization profiles with CRUD operations
 * Users must be logged in to create organizations
 */

import { MiniApp } from '../../core/MiniApp.js';
import { Button } from '../../components/Button.js';
import { Input } from '../../components/Input.js';
import { Notification } from '../../utils/Notification.js';

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
    this.currentView = 'list'; // 'list', 'edit', 'view'
    this.currentUser = null;
    this.components = {};
  }

  /**
   * Initialize the app
   */
  async onInit() {
    this.logger.info('Initializing OrganizationApp');

    // Load reference data
    await this.loadOrganizationTypes();
    await this.loadIndustries();

    // Create indexes for fast queries
    await this.createIndexes();

    // Subscribe to organization data changes
    this.subscribeToData('organization', (change) => {
      this.handleOrganizationChange(change);
    });

    // Listen for login/logout events
    this.on('person:login', (user) => {
      this.currentUser = user;
      this.loadOrganizations();
      if (this.isRendered) {
        this.render();
      }
    });

    this.on('person:logout', () => {
      this.currentUser = null;
      this.organizations = [];
      if (this.isRendered) {
        this.render();
      }
    });

    // Check if user is already logged in
    await this.checkCurrentUser();

    // Load organizations
    await this.loadOrganizations();
  }

  /**
   * Check if user is currently logged in
   */
  async checkCurrentUser() {
    try {
      const sessionData = localStorage.getItem('personManagementApp_session');
      if (sessionData) {
        const session = JSON.parse(sessionData);
        // Load the user from database
        const users = await this.db.query({
          selector: {
            type: 'person',
            _id: session.userId
          }
        });

        if (users.length > 0) {
          this.currentUser = users[0];
          this.logger.info('Current user loaded:', this.currentUser.username);
        }
      }
    } catch (error) {
      this.logger.error('Failed to check current user:', error);
    }
  }

  /**
   * Create database indexes
   */
  async createIndexes() {
    try {
      // Index for user's organizations
      await this.db.createIndex(['type', 'createdBy']);

      // Index for subdomain uniqueness
      await this.db.createIndex(['type', 'subdomain']);

      this.logger.info('Database indexes created');
    } catch (error) {
      this.logger.error('Failed to create indexes:', error);
    }
  }

  /**
   * Load organization types from JSON file
   */
  async loadOrganizationTypes() {
    try {
      const response = await fetch('/data/organization-types.json');
      this.organizationTypes = await response.json();
      this.logger.info(`Loaded ${this.organizationTypes.length} organization types`);
    } catch (error) {
      this.logger.error('Failed to load organization types:', error);
      Notification.error('Failed to load organization types');
    }
  }

  /**
   * Load industries from JSON file
   */
  async loadIndustries() {
    try {
      const response = await fetch('/data/industries.json');
      this.industries = await response.json();
      this.logger.info(`Loaded ${this.industries.length} industries`);
    } catch (error) {
      this.logger.error('Failed to load industries:', error);
      Notification.error('Failed to load industries');
    }
  }

  /**
   * Load organizations for current user
   */
  async loadOrganizations() {
    try {
      if (!this.db) {
        this.logger.warn('Database not available');
        return;
      }

      if (!this.currentUser) {
        this.organizations = [];
        return;
      }

      const orgs = await this.db.query({
        selector: {
          type: 'organization',
          createdBy: this.currentUser._id
        },
        sort: [{ createdAt: 'desc' }]
      });

      this.organizations = orgs;
      this.logger.debug(`Loaded ${orgs.length} organizations`);

      // Update UI if rendered
      if (this.isRendered) {
        this.render();
      }
    } catch (error) {
      this.logger.error('Failed to load organizations:', error);
    }
  }

  /**
   * Render the UI
   */
  async onRender() {
    this.clearContainer();

    // Check if user is logged in
    if (!this.currentUser && this.currentView !== 'list') {
      this.currentView = 'list';
    }

    // Render based on current view
    switch (this.currentView) {
      case 'list':
        this.renderListView();
        break;
      case 'edit':
        this.renderEditView();
        break;
      case 'view':
        this.renderViewDetails();
        break;
    }
  }

  /**
   * Render list view
   */
  renderListView() {
    // Header
    const header = this.createElement('div', { className: 'miniapp-header' });

    const titleContainer = this.createElement('div', { className: 'header-title-container' });
    const title = this.createElement('h2', {}, ['Organizations']);
    titleContainer.appendChild(title);

    if (this.currentUser) {
      const userInfo = this.createElement('div', {
        className: 'user-info'
      }, [`Managing as: ${this.currentUser.username}`]);
      titleContainer.appendChild(userInfo);
    }

    header.appendChild(titleContainer);

    // Action buttons
    const actions = this.createElement('div', { className: 'org-actions' });

    if (this.currentUser) {
      this.components.createBtn = new Button({
        text: '+ Create Organization',
        className: 'btn btn-primary',
        onClick: () => this.showEditView(null)
      });
      actions.appendChild(this.components.createBtn.create());
    } else {
      const loginMsg = this.createElement('div', {
        className: 'login-message'
      }, ['Please log in to create and manage organizations']);
      actions.appendChild(loginMsg);
    }

    // Organizations list
    const listContainer = this.createElement('div', { className: 'org-list-container' });

    if (!this.currentUser) {
      const emptyState = this.createElement('div', {
        className: 'empty-state'
      }, ['You must be logged in to view your organizations']);
      listContainer.appendChild(emptyState);
    } else if (this.organizations.length === 0) {
      const emptyState = this.createElement('div', {
        className: 'empty-state'
      }, ['No organizations yet. Create your first organization!']);
      listContainer.appendChild(emptyState);
    } else {
      this.organizations.forEach(org => {
        const orgCard = this.renderOrganizationCard(org);
        listContainer.appendChild(orgCard);
      });
    }

    // Assemble UI
    this.container.appendChild(header);
    this.container.appendChild(actions);
    this.container.appendChild(listContainer);
  }

  /**
   * Render organization card
   */
  renderOrganizationCard(org) {
    const card = this.createElement('div', { className: 'org-card' });

    // Logo or placeholder
    const logoContainer = this.createElement('div', { className: 'org-logo-container' });
    if (org.logo) {
      const logo = this.createElement('img', {
        className: 'org-logo',
        src: org.logo,
        alt: org.name
      });
      logoContainer.appendChild(logo);
    } else {
      const placeholder = this.createElement('div', {
        className: 'org-logo-placeholder'
      }, [org.name.charAt(0).toUpperCase()]);
      logoContainer.appendChild(placeholder);
    }

    // Organization info
    const info = this.createElement('div', { className: 'org-info' });

    const name = this.createElement('h3', { className: 'org-name' }, [org.name]);
    info.appendChild(name);

    if (org.tagline) {
      const tagline = this.createElement('div', { className: 'org-tagline' }, [org.tagline]);
      info.appendChild(tagline);
    }

    // Get type and industry names
    const orgType = this.organizationTypes.find(t => t.id === org.legalTypeId);
    const industry = this.industries.find(i => i.id === org.industryId);

    const metadata = this.createElement('div', { className: 'org-metadata' });

    if (orgType) {
      const type = this.createElement('span', { className: 'org-meta-item' }, [
        `${orgType.abbreviation || orgType.type_name}`
      ]);
      metadata.appendChild(type);
    }

    if (industry) {
      const ind = this.createElement('span', { className: 'org-meta-item' }, [
        `${industry.icon} ${industry.name}`
      ]);
      metadata.appendChild(ind);
    }

    info.appendChild(metadata);

    // Subdomain
    if (org.subdomain) {
      const subdomain = this.createElement('div', { className: 'org-subdomain' }, [
        `${org.subdomain}.v4l.app`
      ]);
      info.appendChild(subdomain);
    }

    // Actions
    const actions = this.createElement('div', { className: 'org-card-actions' });

    const viewBtn = this.createElement('button', {
      className: 'btn btn-secondary btn-small',
      onClick: () => this.showViewDetails(org)
    }, ['View']);

    const editBtn = this.createElement('button', {
      className: 'btn btn-primary btn-small',
      onClick: () => this.showEditView(org)
    }, ['Edit']);

    const deleteBtn = this.createElement('button', {
      className: 'btn btn-danger btn-small',
      onClick: () => this.deleteOrganization(org)
    }, ['Delete']);

    actions.appendChild(viewBtn);
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    // Assemble card
    card.appendChild(logoContainer);
    card.appendChild(info);
    card.appendChild(actions);

    return card;
  }

  /**
   * Render edit view
   */
  renderEditView() {
    const isEdit = this.currentOrganization !== null;

    // Header
    const header = this.createElement('div', { className: 'miniapp-header' });
    const title = this.createElement('h2', {}, [
      isEdit ? 'Edit Organization' : 'Create Organization'
    ]);
    header.appendChild(title);

    // Form
    const form = this.createElement('form', {
      className: 'org-form',
      onSubmit: (e) => {
        e.preventDefault();
        this.saveOrganization();
      }
    });

    // Organization Name
    const nameGroup = this.createElement('div', { className: 'form-group' });
    const nameLabel = this.createElement('label', {}, ['Organization Name *']);
    this.components.nameInput = new Input({
      placeholder: 'Enter full organization name',
      className: 'input',
      value: this.currentOrganization?.name || ''
    });
    nameGroup.appendChild(nameLabel);
    nameGroup.appendChild(this.components.nameInput.create());

    // Legal Type
    const typeGroup = this.createElement('div', { className: 'form-group' });
    const typeLabel = this.createElement('label', {}, ['Legal Type *']);
    const typeSelect = this.createElement('select', {
      className: 'input',
      id: 'org-type-select'
    });

    // Add default option
    const defaultTypeOption = this.createElement('option', { value: '' }, ['Select Legal Type']);
    typeSelect.appendChild(defaultTypeOption);

    // Group by country
    const typesByCountry = {};
    this.organizationTypes.forEach(type => {
      if (!typesByCountry[type.country_code]) {
        typesByCountry[type.country_code] = [];
      }
      typesByCountry[type.country_code].push(type);
    });

    // Add options grouped by country
    Object.keys(typesByCountry).sort().forEach(country => {
      const optgroup = this.createElement('optgroup', { label: country });
      typesByCountry[country].forEach(type => {
        const option = this.createElement('option', {
          value: type.id,
          selected: this.currentOrganization?.legalTypeId === type.id
        }, [`${type.type_name} (${type.abbreviation || type.type_code})`]);
        optgroup.appendChild(option);
      });
      typeSelect.appendChild(optgroup);
    });

    typeGroup.appendChild(typeLabel);
    typeGroup.appendChild(typeSelect);

    // Industry
    const industryGroup = this.createElement('div', { className: 'form-group' });
    const industryLabel = this.createElement('label', {}, ['Industry *']);
    const industrySelect = this.createElement('select', {
      className: 'input',
      id: 'org-industry-select'
    });

    // Add default option
    const defaultIndustryOption = this.createElement('option', { value: '' }, ['Select Industry']);
    industrySelect.appendChild(defaultIndustryOption);

    // Group by category
    const industriesByCategory = {};
    this.industries.forEach(ind => {
      if (!industriesByCategory[ind.category]) {
        industriesByCategory[ind.category] = [];
      }
      industriesByCategory[ind.category].push(ind);
    });

    // Add options grouped by category
    Object.keys(industriesByCategory).sort().forEach(category => {
      const optgroup = this.createElement('optgroup', { label: category });
      industriesByCategory[category].forEach(ind => {
        const option = this.createElement('option', {
          value: ind.id,
          selected: this.currentOrganization?.industryId === ind.id
        }, [`${ind.icon} ${ind.name}`]);
        optgroup.appendChild(option);
      });
      industrySelect.appendChild(optgroup);
    });

    industryGroup.appendChild(industryLabel);
    industryGroup.appendChild(industrySelect);

    // Tagline
    const taglineGroup = this.createElement('div', { className: 'form-group' });
    const taglineLabel = this.createElement('label', {}, ['Tagline']);
    this.components.taglineInput = new Input({
      placeholder: 'Short description or slogan',
      className: 'input',
      value: this.currentOrganization?.tagline || ''
    });
    taglineGroup.appendChild(taglineLabel);
    taglineGroup.appendChild(this.components.taglineInput.create());

    // Logo URL
    const logoGroup = this.createElement('div', { className: 'form-group' });
    const logoLabel = this.createElement('label', {}, ['Logo URL']);
    this.components.logoInput = new Input({
      placeholder: 'https://example.com/logo.png',
      className: 'input',
      value: this.currentOrganization?.logo || ''
    });
    logoGroup.appendChild(logoLabel);
    logoGroup.appendChild(this.components.logoInput.create());

    // Subdomain
    const subdomainGroup = this.createElement('div', { className: 'form-group' });
    const subdomainLabel = this.createElement('label', {}, ['Subdomain *']);
    const subdomainWrapper = this.createElement('div', { className: 'subdomain-input-wrapper' });
    this.components.subdomainInput = new Input({
      placeholder: 'mycompany',
      className: 'input subdomain-input',
      value: this.currentOrganization?.subdomain || ''
    });
    const subdomainSuffix = this.createElement('span', {
      className: 'subdomain-suffix'
    }, ['.v4l.app']);
    subdomainWrapper.appendChild(this.components.subdomainInput.create());
    subdomainWrapper.appendChild(subdomainSuffix);
    subdomainGroup.appendChild(subdomainLabel);
    subdomainGroup.appendChild(subdomainWrapper);

    // Website
    const websiteGroup = this.createElement('div', { className: 'form-group' });
    const websiteLabel = this.createElement('label', {}, ['Website']);
    this.components.websiteInput = new Input({
      placeholder: 'https://www.example.com',
      className: 'input',
      value: this.currentOrganization?.website || ''
    });
    websiteGroup.appendChild(websiteLabel);
    websiteGroup.appendChild(this.components.websiteInput.create());

    // Phone
    const phoneGroup = this.createElement('div', { className: 'form-group' });
    const phoneLabel = this.createElement('label', {}, ['Primary Phone']);
    this.components.phoneInput = new Input({
      placeholder: '+1 (555) 123-4567',
      className: 'input',
      value: this.currentOrganization?.phone || ''
    });
    phoneGroup.appendChild(phoneLabel);
    phoneGroup.appendChild(this.components.phoneInput.create());

    // Email
    const emailGroup = this.createElement('div', { className: 'form-group' });
    const emailLabel = this.createElement('label', {}, ['Primary Email']);
    this.components.emailInput = new Input({
      placeholder: 'contact@example.com',
      className: 'input',
      value: this.currentOrganization?.email || ''
    });
    emailGroup.appendChild(emailLabel);
    emailGroup.appendChild(this.components.emailInput.create());

    // Form buttons
    const formActions = this.createElement('div', { className: 'form-actions' });

    this.components.saveBtn = new Button({
      text: isEdit ? 'Update Organization' : 'Create Organization',
      className: 'btn btn-primary',
      type: 'submit'
    });

    this.components.cancelBtn = new Button({
      text: 'Cancel',
      className: 'btn btn-secondary',
      onClick: () => this.showListView()
    });

    formActions.appendChild(this.components.saveBtn.create());
    formActions.appendChild(this.components.cancelBtn.create());

    // Assemble form
    form.appendChild(nameGroup);
    form.appendChild(typeGroup);
    form.appendChild(industryGroup);
    form.appendChild(taglineGroup);
    form.appendChild(logoGroup);
    form.appendChild(subdomainGroup);
    form.appendChild(websiteGroup);
    form.appendChild(phoneGroup);
    form.appendChild(emailGroup);
    form.appendChild(formActions);

    // Assemble UI
    this.container.appendChild(header);
    this.container.appendChild(form);
  }

  /**
   * Render view details
   */
  renderViewDetails() {
    if (!this.currentOrganization) {
      this.showListView();
      return;
    }

    const org = this.currentOrganization;

    // Header
    const header = this.createElement('div', { className: 'miniapp-header' });
    const backBtn = this.createElement('button', {
      className: 'btn btn-secondary btn-small',
      onClick: () => this.showListView()
    }, ['← Back']);
    header.appendChild(backBtn);

    // Organization details
    const detailsContainer = this.createElement('div', { className: 'org-details' });

    // Logo
    const logoSection = this.createElement('div', { className: 'org-details-logo-section' });
    if (org.logo) {
      const logo = this.createElement('img', {
        className: 'org-details-logo',
        src: org.logo,
        alt: org.name
      });
      logoSection.appendChild(logo);
    } else {
      const placeholder = this.createElement('div', {
        className: 'org-details-logo-placeholder'
      }, [org.name.charAt(0).toUpperCase()]);
      logoSection.appendChild(placeholder);
    }

    // Name and tagline
    const name = this.createElement('h2', { className: 'org-details-name' }, [org.name]);
    detailsContainer.appendChild(name);

    if (org.tagline) {
      const tagline = this.createElement('div', { className: 'org-details-tagline' }, [org.tagline]);
      detailsContainer.appendChild(tagline);
    }

    // Details grid
    const detailsGrid = this.createElement('div', { className: 'org-details-grid' });

    // Legal Type
    const orgType = this.organizationTypes.find(t => t.id === org.legalTypeId);
    if (orgType) {
      const typeItem = this.createElement('div', { className: 'detail-item' });
      const typeLabel = this.createElement('div', { className: 'detail-label' }, ['Legal Type']);
      const typeValue = this.createElement('div', { className: 'detail-value' }, [
        `${orgType.type_name} (${orgType.abbreviation || orgType.type_code})`
      ]);
      typeItem.appendChild(typeLabel);
      typeItem.appendChild(typeValue);
      detailsGrid.appendChild(typeItem);
    }

    // Industry
    const industry = this.industries.find(i => i.id === org.industryId);
    if (industry) {
      const industryItem = this.createElement('div', { className: 'detail-item' });
      const industryLabel = this.createElement('div', { className: 'detail-label' }, ['Industry']);
      const industryValue = this.createElement('div', { className: 'detail-value' }, [
        `${industry.icon} ${industry.name}`
      ]);
      industryItem.appendChild(industryLabel);
      industryItem.appendChild(industryValue);
      detailsGrid.appendChild(industryItem);
    }

    // Subdomain
    if (org.subdomain) {
      const subdomainItem = this.createElement('div', { className: 'detail-item' });
      const subdomainLabel = this.createElement('div', { className: 'detail-label' }, ['Subdomain']);
      const subdomainValue = this.createElement('a', {
        className: 'detail-value detail-link',
        href: `https://${org.subdomain}.v4l.app`,
        target: '_blank'
      }, [`${org.subdomain}.v4l.app`]);
      subdomainItem.appendChild(subdomainLabel);
      subdomainItem.appendChild(subdomainValue);
      detailsGrid.appendChild(subdomainItem);
    }

    // Website
    if (org.website) {
      const websiteItem = this.createElement('div', { className: 'detail-item' });
      const websiteLabel = this.createElement('div', { className: 'detail-label' }, ['Website']);
      const websiteValue = this.createElement('a', {
        className: 'detail-value detail-link',
        href: org.website,
        target: '_blank'
      }, [org.website]);
      websiteItem.appendChild(websiteLabel);
      websiteItem.appendChild(websiteValue);
      detailsGrid.appendChild(websiteItem);
    }

    // Phone
    if (org.phone) {
      const phoneItem = this.createElement('div', { className: 'detail-item' });
      const phoneLabel = this.createElement('div', { className: 'detail-label' }, ['Phone']);
      const phoneValue = this.createElement('a', {
        className: 'detail-value detail-link',
        href: `tel:${org.phone}`
      }, [org.phone]);
      phoneItem.appendChild(phoneLabel);
      phoneItem.appendChild(phoneValue);
      detailsGrid.appendChild(phoneItem);
    }

    // Email
    if (org.email) {
      const emailItem = this.createElement('div', { className: 'detail-item' });
      const emailLabel = this.createElement('div', { className: 'detail-label' }, ['Email']);
      const emailValue = this.createElement('a', {
        className: 'detail-value detail-link',
        href: `mailto:${org.email}`
      }, [org.email]);
      emailItem.appendChild(emailLabel);
      emailItem.appendChild(emailValue);
      detailsGrid.appendChild(emailItem);
    }

    // Created date
    const createdItem = this.createElement('div', { className: 'detail-item' });
    const createdLabel = this.createElement('div', { className: 'detail-label' }, ['Created']);
    const createdValue = this.createElement('div', { className: 'detail-value' }, [
      new Date(org.createdAt).toLocaleString()
    ]);
    createdItem.appendChild(createdLabel);
    createdItem.appendChild(createdValue);
    detailsGrid.appendChild(createdItem);

    detailsContainer.appendChild(detailsGrid);

    // Actions
    const actions = this.createElement('div', { className: 'org-details-actions' });

    const editBtn = this.createElement('button', {
      className: 'btn btn-primary',
      onClick: () => this.showEditView(org)
    }, ['Edit Organization']);

    const deleteBtn = this.createElement('button', {
      className: 'btn btn-danger',
      onClick: () => {
        this.deleteOrganization(org);
        this.showListView();
      }
    }, ['Delete Organization']);

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    // Assemble UI
    this.container.appendChild(header);
    this.container.appendChild(logoSection);
    this.container.appendChild(detailsContainer);
    this.container.appendChild(actions);
  }

  /**
   * Show list view
   */
  showListView() {
    this.currentView = 'list';
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

    this.currentView = 'edit';
    this.currentOrganization = organization;
    this.render();
  }

  /**
   * Show view details
   */
  showViewDetails(organization) {
    this.currentView = 'view';
    this.currentOrganization = organization;
    this.render();
  }

  /**
   * Validate subdomain format
   */
  validateSubdomain(subdomain) {
    // Must be lowercase alphanumeric and hyphens, 3-63 characters
    const pattern = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;
    return pattern.test(subdomain);
  }

  /**
   * Check if subdomain is unique
   */
  async isSubdomainUnique(subdomain, currentOrgId = null) {
    try {
      const existing = await this.db.query({
        selector: {
          type: 'organization',
          subdomain: subdomain
        }
      });

      // If editing, exclude current organization from check
      if (currentOrgId) {
        return existing.every(org => org._id === currentOrgId);
      }

      return existing.length === 0;
    } catch (error) {
      this.logger.error('Failed to check subdomain uniqueness:', error);
      return false;
    }
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
    if (!this.validateSubdomain(subdomain)) {
      Notification.error('Subdomain must be 3-63 characters, lowercase letters, numbers, and hyphens only');
      return;
    }

    // Check subdomain uniqueness
    const isUnique = await this.isSubdomainUnique(subdomain, this.currentOrganization?._id);
    if (!isUnique) {
      Notification.error('This subdomain is already taken');
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
        createdByUsername: this.currentUser.username
      };

      if (isEdit) {
        // Update existing
        orgData._id = this.currentOrganization._id;
        orgData._rev = this.currentOrganization._rev;
        orgData.createdAt = this.currentOrganization.createdAt;
        orgData.updatedAt = new Date().toISOString();

        await this.db.update(orgData);
        Notification.success('Organization updated successfully');
        this.logger.info('Organization updated:', orgData._id);
      } else {
        // Create new
        orgData._id = `org_${Date.now()}`;
        orgData.createdAt = new Date().toISOString();

        await this.db.create(orgData);
        Notification.success('Organization created successfully');
        this.logger.info('Organization created:', orgData._id);

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
      await this.db.delete(org);
      Notification.success('Organization deleted successfully');
      this.logger.info('Organization deleted:', org._id);

      // Emit event
      this.emit('organization:deleted', org);

    } catch (error) {
      this.logger.error('Failed to delete organization:', error);
      Notification.error('Failed to delete organization. Please try again.');
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
    if (this.isRendered && this.currentView === 'list') {
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
