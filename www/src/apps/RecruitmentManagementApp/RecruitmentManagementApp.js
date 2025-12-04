/**
 * RecruitmentManagementApp.js
 * Manages complete hiring lifecycle from vacancy creation to worker onboarding
 */

import { MiniApp } from '../../core/MiniApp.js';

// Constants
import {
  STAGE_LABELS,
  APPLICATION_STATUS_OPTIONS,
  STAGE_STATUS_OPTIONS,
  DEFAULT_ONBOARDING_TASKS,
  VIEW_MODES,
  VIEWS
} from './constants.js';

// Utilities
import {
  formatLabel,
  getStageLabel,
  getOnboardingStatusLabel,
  formatDateTime,
  generateUUID
} from '../../utils/formatters.js';

import {
  loadPersonData,
  getApplicantDisplayNameById
} from '../../utils/personHelpers.js';

// Data Loaders
import {
  loadPublicVacancies as _loadPublicVacancies,
  loadOrgVacancies as _loadOrgVacancies,
  loadMyApplications as _loadMyApplications,
  loadMyOnboardings as _loadMyOnboardings,
  loadOrgApplications as _loadOrgApplications,
  loadOrgOnboardings as _loadOrgOnboardings,
  loadReferenceData,
  loadWorkstations as _loadWorkstations,
  loadOrganizations as _loadOrganizations
} from './dataLoaders.js';

// View Helpers
import {
  getOrganizationName,
  getDepartmentName,
  getTeamName,
  getDesignationName,
  getSkillName,
  getEducationLevelName,
  getSubjectName,
  getOnboardingForApplication,
  getFilteredVacancies,
  getFilteredOrgVacancies
} from './viewHelpers.js';

// Components
import { createVacancyCard } from '../../components/VacancyCard.js';
import { createApplicationCard } from '../../components/ApplicationCard.js';
import { createOnboardingCard } from '../../components/OnboardingCard.js';

// Views
import { renderPublicVacanciesView } from './views/PublicVacanciesView.js';
import { renderOrgVacanciesView } from './views/OrgVacanciesView.js';
import { renderVacancyFormView } from './views/VacancyFormView.js';

class RecruitmentManagementApp extends MiniApp {
  constructor(options = {}) {
    super({
      name: 'RecruitmentManagementApp',
      ...options
    });

    // State
    this.vacancies = [];
    this.applications = [];
    this.onboardings = [];
    this.currentVacancy = null;
    this.currentApplication = null;
    this.currentUser = null;
    this.defaultOrganization = null;

    // Reference data
    this.departments = [];
    this.teams = [];
    this.designations = [];
    this.educationLevels = [];
    this.subjects = [];
    this.skills = [];
    this.workstations = [];
    this.organizations = [];
    this.personsCache = new Map(); // Cache for person data

    // View state
    this.currentView = 'public-vacancies'; // public-vacancies, org-vacancies, create-vacancy, edit-vacancy, vacancy-details, apply, my-applications, manage-applications, onboarding
    this.viewMode = 'public'; // public, org-admin, applicant
    this.searchTerm = '';
    this.filterStatus = 'all';
    this.filterDepartment = 'all';
    this.filterOrganization = 'all';

    // Components
    this.components = {};
  }

  /**
   * Initialize the app
   */
  async onInit() {
    try {
      this.logger.info('Initializing RecruitmentManagementApp...');

      // Create database indexes
      await this.createIndexes();

      // Subscribe to data changes
      this.subscribeToData('vacancy', (change) => this.handleVacancyChange(change));
      this.subscribeToData('application', (change) => this.handleApplicationChange(change));
      this.subscribeToData('onboarding', (change) => this.handleOnboardingChange(change));

      // Subscribe to person login/logout
      this.subscribe('person:login', async (user) => {
        this.currentUser = user;
        this.determineViewMode();
        await this.loadData();
        this.updateViewBasedOnMode();
        if (this.isRendered) {
          this.render();
        }
      });

      this.subscribe('person:logout', () => {
        this.currentUser = null;
        this.viewMode = 'public';
        this.vacancies = [];
        this.applications = [];
        if (this.isRendered) {
          this.render();
        }
      });

      // Subscribe to organization changes
      this.subscribe('organization:defaultChanged', async (org) => {
        this.defaultOrganization = org;
        this.determineViewMode();
        await this.loadData();
        this.updateViewBasedOnMode();
        if (this.isRendered) {
          this.render();
        }
      });

      // Load current user session
      await this.checkCurrentUser();

      // Load default organization
      await this.loadDefaultOrganization();

      // Load reference data
      await this.loadReferenceData();

      // Determine view mode
      this.determineViewMode();

      // Load data
      await this.loadData();

      this.updateViewBasedOnMode();

      this.logger.info('RecruitmentManagementApp initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize RecruitmentManagementApp:', error);
    }
  }

  /**
   * Create database indexes
   */
  async createIndexes() {
    try {
      // Vacancy indexes
      await this.db.createIndex(['type', 'organizationId']);
      await this.db.createIndex(['type', 'organizationId', 'status']);
      await this.db.createIndex(['type', 'status']);
      await this.db.createIndex(['type', 'departmentCode']);

      // Application indexes
      await this.db.createIndex(['type', 'vacancyId']);
      await this.db.createIndex(['type', 'applicantId']);
      await this.db.createIndex(['type', 'organizationId']);
      await this.db.createIndex(['type', 'organizationId', 'status']);

      // Onboarding indexes
      await this.db.createIndex(['type', 'applicationId']);
      await this.db.createIndex(['type', 'organizationId']);

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
   * Load default organization
   */
  async loadDefaultOrganization() {
    try {
      const storedOrg = localStorage.getItem('defaultOrganization');
      if (storedOrg) {
        this.defaultOrganization = JSON.parse(storedOrg);
      }
    } catch (error) {
      this.logger.error('Failed to load default organization:', error);
    }
  }

  /**
   * Determine view mode based on user and organization
   */
  determineViewMode() {
    if (!this.currentUser) {
      this.logger.info('Current user not logged in, setting view mode to public');
      this.viewMode = 'public';
      return;
    }
    this.logger.info('Current user logged in:', this.currentUser);

    // Check if user has organization (org admin)
    this.logger.info('Default organization:', this.defaultOrganization);
    if (this.defaultOrganization && this.currentUser.username && this.currentUser.username == this.defaultOrganization.createdByUsername) {
      this.viewMode = 'org-admin';
    } else {
      this.viewMode = 'applicant';
    }

    this.logger.info(`View mode set to ${this.viewMode}`);
  }

  /**
   * Load reference data from JSON files
   */
  async loadReferenceData() {
    try {
      const data = await loadReferenceData(this.logger);
      this.departments = data.departments;
      this.teams = data.teams;
      this.designations = data.designations;
      this.educationLevels = data.educationLevels;
      this.subjects = data.subjects;
      this.skills = data.skills;

      // Load workstations from BranchManagementApp data
      await this.loadWorkstations();

      // Load organizations
      await this.loadOrganizations();

    } catch (error) {
      this.logger.error('Failed to load reference data:', error);
    }
  }

  /**
   * Load workstations (branches)
   */
  async loadWorkstations() {
    this.workstations = await _loadWorkstations(this.db, this.logger);
  }

  /**
   * Load organizations
   */
  async loadOrganizations() {
    this.organizations = await _loadOrganizations(this.db, this.logger);
  }

  /**
   * Load all data based on view mode
   */
  async loadData() {
    if (this.viewMode === 'public') {
      await this.loadPublicVacancies();
      this.onboardings = [];
    } else if (this.viewMode === 'org-admin') {
      this.logger.info('Loading data for org-admin view mode');
      await this.loadOrgVacancies();
      await this.loadOrgApplications();
      await this.loadOrgOnboardings();
    } else if (this.viewMode === 'applicant') {
      await this.loadPublicVacancies();
      await this.loadMyApplications();
      await this.loadMyOnboardings();
    }
  }

  /**
   * Load public vacancies (open status only)
   */
  async loadPublicVacancies() {
    this.vacancies = await _loadPublicVacancies(this.db, this.logger);
    if (this.isRendered) {
      this.render();
    }
  }

  /**
   * Load organization vacancies
   */
  async loadOrgVacancies() {
    const orgId = this.defaultOrganization?._id;
    this.vacancies = await _loadOrgVacancies(this.db, orgId, this.logger);
    if (this.isRendered) {
      this.render();
    }
  }

  /**
   * Load my applications
   */
  async loadMyApplications() {
    const userId = this.currentUser?._id;
    this.applications = await _loadMyApplications(this.db, userId, this.logger);
    if (this.isRendered) {
      this.render();
    }
  }

  /**
   * Load onboarding records for current user
   */
  async loadMyOnboardings() {
    const userId = this.currentUser?._id;
    this.onboardings = await _loadMyOnboardings(this.db, userId, this.logger);
  }

  /**
   * Load organization applications
   */
  async loadOrgApplications() {
    const orgId = this.defaultOrganization?._id;
    this.applications = await _loadOrgApplications(this.db, orgId, this.personsCache, this.logger);
    if (this.isRendered) {
      this.render();
    }
  }

  /**
   * Load organization onboarding records
   */
  async loadOrgOnboardings() {
    const orgId = this.defaultOrganization?._id;
    this.onboardings = await _loadOrgOnboardings(this.db, orgId, this.logger);
  }

  /**
   * Handle vacancy changes
   */
  handleVacancyChange(change) {
    if (change.deleted) {
      this.vacancies = this.vacancies.filter(v => v._id !== change.id);
    } else {
      const index = this.vacancies.findIndex(v => v._id === change.doc._id);
      if (index >= 0) {
        this.vacancies[index] = change.doc;
      } else {
        // Only add if matches current filter
        if (this.viewMode === 'public' && change.doc.status === 'open') {
          this.vacancies.push(change.doc);
        } else if (this.viewMode === 'org-admin' && change.doc.organizationId === this.defaultOrganization?._id) {
          this.vacancies.push(change.doc);
        }
      }
    }

    if (this.isRendered && (this.currentView === 'public-vacancies' || this.currentView === 'org-vacancies')) {
      this.render();
    }
  }

  /**
 * Automatically switch to the correct view based on user role
 */
  updateViewBasedOnMode() {
    if (this.viewMode === 'org-admin') {
      this.currentView = 'org-vacancies';
    } else if (this.viewMode === 'applicant') {
      this.currentView = 'public-vacancies';
    } else {
      this.currentView = 'public-vacancies';
    }

    // Force re-render with correct view
    if (this.isRendered) {
      this.render();
    }
  }

  /**
   * Handle application changes
   */
  handleApplicationChange(change) {
    if (change.deleted) {
      this.applications = this.applications.filter(a => a._id !== change.id);
    } else {
      const index = this.applications.findIndex(a => a._id === change.doc._id);
      if (index >= 0) {
        this.applications[index] = change.doc;
      } else {
        // Only add if matches current user/org
        if (this.viewMode === 'applicant' && change.doc.applicantId === this.currentUser?._id) {
          this.applications.push(change.doc);
        } else if (this.viewMode === 'org-admin' && change.doc.organizationId === this.defaultOrganization?._id) {
          this.applications.push(change.doc);
        }
      }
    }

    if (this.isRendered && (this.currentView === 'my-applications' || this.currentView === 'manage-applications')) {
      this.render();
    }
  }

  /**
   * Handle onboarding changes
   */
  handleOnboardingChange(change) {
    if (change.deleted) {
      this.onboardings = this.onboardings.filter(o => o._id !== change.id);
    } else {
      const index = this.onboardings.findIndex(o => o._id === change.doc._id);
      if (index >= 0) {
        this.onboardings[index] = change.doc;
      } else {
        this.onboardings.push(change.doc);
      }
    }

    if (this.isRendered && (this.currentView === 'onboarding' || this.currentView === 'application-details')) {
      this.render();
    }
  }

  /**
   * Render the UI
   */
  async onRender() {
    this.clearContainer();

    if (this.currentUser) {
      const nav = this.createElement('div', { className: 'recruitment-nav' });

      if (this.viewMode === 'org-admin') {
        const links = [
          { text: 'Vacancies', view: 'org-vacancies' },
          { text: 'Applications', view: 'manage-applications' },
          { text: 'Onboarding', view: 'onboarding' },
          { text: 'Browse Jobs', view: 'public-vacancies' }
        ];
        links.forEach(link => {
          const btn = this.createElement('button', {
            className: `btn ${this.currentView === link.view ? 'btn-primary' : 'btn-secondary'} btn-small`,
            onclick: async () => {
              this.currentView = link.view;
              // Load public vacancies when switching to Browse Jobs view
              if (link.view === 'public-vacancies') {
                await this.loadPublicVacancies();
              } else if (link.view === 'org-vacancies') {
                await this.loadOrgVacancies();
              }
              this.render();
            }
          }, [link.text]);
          nav.appendChild(btn);
        });
      } else if (this.viewMode === 'applicant') {
        const links = [
          { text: 'Browse Jobs', view: 'public-vacancies' },
          { text: 'My Applications', view: 'my-applications' }
        ];
        links.forEach(link => {
          const btn = this.createElement('button', {
            className: `btn ${this.currentView === link.view ? 'btn-primary' : 'btn-secondary'} btn-small`,
            onclick: async () => {
              this.currentView = link.view;
              // Reload appropriate data when switching views
              if (link.view === 'public-vacancies') {
                await this.loadPublicVacancies();
              } else if (link.view === 'my-applications') {
                await this.loadMyApplications();
              }
              this.render();
            }
          }, [link.text]);
          nav.appendChild(btn);
        });
      }

      this.container.appendChild(nav);
      this.container.appendChild(this.createElement('hr'));
    }

    switch (this.currentView) {
      case 'public-vacancies':
        this.renderPublicVacanciesView();
        break;
      case 'org-vacancies':
        this.renderOrgVacanciesView();
        break;
      case 'create-vacancy':
      case 'edit-vacancy':
        this.renderVacancyFormView();
        break;
      case 'vacancy-details':
        this.renderVacancyDetailsView();
        break;
      case 'apply':
        this.renderApplicationFormView();
        break;
      case 'my-applications':
        this.renderMyApplicationsView();
        break;
      case 'manage-applications':
        this.renderManageApplicationsView();
        break;
      case 'application-details':
        this.renderApplicationDetailsView();
        break;
      case 'onboarding':
        this.renderOnboardingView();
        break;
      default:
        this.renderPublicVacanciesView();
    }
  }

  /**
   * Render public vacancies view
   */
  renderPublicVacanciesView() {
    renderPublicVacanciesView(this);
  }

  /**
   * Render organization vacancies view
   */
  renderOrgVacanciesView() {
    renderOrgVacanciesView(this);
  }

  /**
   * Render vacancy card
   */
  renderVacancyCard(vacancy, isPublic = false) {
    const card = this.createElement('div', { className: 'vacancy-card' });

    const title = this.createElement('div', { className: 'vacancy-card-title' }, [
      vacancy.title || 'Untitled Position'
    ]);

    const orgName = this.getOrganizationName(vacancy.organizationId);
    const orgInfo = this.createElement('div', { className: 'vacancy-card-org' }, [orgName]);

    const deptName = this.getDepartmentName(vacancy.departmentCode);
    const deptInfo = this.createElement('div', { className: 'vacancy-card-dept' }, [
      deptName || 'N/A'
    ]);

    const statusBadge = this.createElement('span', {
      className: `status-badge status-${vacancy.status}`
    }, [vacancy.status || 'draft']);

    const details = this.createElement('div', { className: 'vacancy-card-details' });
    if (vacancy.workExperienceYears) {
      details.appendChild(this.createElement('div', {}, [
        `Experience: ${vacancy.workExperienceYears} years`
      ]));
    }

    const actions = this.createElement('div', { className: 'vacancy-card-actions' });

    if (isPublic) {
      const viewBtn = this.createElement('button', {
        className: 'btn btn-small btn-primary',
        onclick: () => this.showVacancyDetailsView(vacancy._id)
      }, ['View Details']);
      actions.appendChild(viewBtn);

      if (this.currentUser) {
        const hasApplied = this.applications.some(a => a.vacancyId === vacancy._id);
        if (!hasApplied) {
          const applyBtn = this.createElement('button', {
            className: 'btn btn-small btn-secondary',
            onclick: () => this.showApplicationFormView(vacancy._id)
          }, ['Apply']);
          actions.appendChild(applyBtn);
        } else {
          const appliedBadge = this.createElement('span', { className: 'applied-badge' }, ['Applied']);
          actions.appendChild(appliedBadge);
        }
      }
    } else {
      const editBtn = this.createElement('button', {
        className: 'btn btn-small btn-secondary',
        onclick: () => this.showEditVacancyView(vacancy._id)
      }, ['Edit']);
      actions.appendChild(editBtn);

      const appsBtn = this.createElement('button', {
        className: 'btn btn-small btn-primary',
        onclick: () => this.showManageApplicationsView(vacancy._id)
      }, ['Applications']);
      actions.appendChild(appsBtn);
    }

    card.appendChild(title);
    card.appendChild(orgInfo);
    card.appendChild(deptInfo);
    card.appendChild(statusBadge);
    card.appendChild(details);
    card.appendChild(actions);

    return card;
  }

  /**
   * Get filtered vacancies for public view
   */
  getFilteredVacancies() {
    return getFilteredVacancies(this.vacancies, this.filterOrganization, this.searchTerm);
  }

  /**
   * Get filtered vacancies for org view
   */
  getFilteredOrgVacancies() {
    return getFilteredOrgVacancies(this.vacancies, this.filterStatus);
  }

  // Helper methods now use imported functions
  getOrganizationName(orgId) {
    return getOrganizationName(this.organizations, orgId);
  }

  getDepartmentName(code) {
    return getDepartmentName(this.departments, code);
  }

  getTeamName(code) {
    return getTeamName(this.teams, code);
  }

  getDesignationName(code) {
    return getDesignationName(this.designations, code);
  }

  getSkillName(code) {
    return getSkillName(this.skills, code);
  }

  getEducationLevelName(code) {
    return getEducationLevelName(this.educationLevels, code);
  }

  getSubjectName(code) {
    return getSubjectName(this.subjects, code);
  }

  getStageLabel(stage) {
    return getStageLabel(stage);
  }

  formatLabel(value) {
    return formatLabel(value);
  }

  getOnboardingStatusLabel(status) {
    return getOnboardingStatusLabel(status);
  }

  formatDateTime(value) {
    return formatDateTime(value);
  }

  getOnboardingForApplication(applicationId) {
    return getOnboardingForApplication(this.onboardings, applicationId);
  }

  async loadPersonData(personId) {
    return await loadPersonData(this.db, this.personsCache, personId, this.logger);
  }

  /**
   * Show create vacancy view
   */
  showCreateVacancyView() {
    this.currentVacancy = null;
    this.currentView = 'create-vacancy';
    this.render();
  }

  /**
   * Show edit vacancy view
   */
  async showEditVacancyView(vacancyId) {
    try {
      this.currentVacancy = await this.db.read(vacancyId);
      this.currentView = 'edit-vacancy';
      this.render();
    } catch (error) {
      this.logger.error('Failed to load vacancy:', error);
      this.showError('Failed to load vacancy');
    }
  }

  /**
   * Show vacancy details view
   */
  async showVacancyDetailsView(vacancyId) {
    try {
      this.currentVacancy = await this.db.read(vacancyId);
      this.currentView = 'vacancy-details';
      this.render();
    } catch (error) {
      this.logger.error('Failed to load vacancy:', error);
      this.showError('Failed to load vacancy');
    }
  }

  /**
   * Show application form view
   */
  showApplicationFormView(vacancyId) {
    if (!this.currentUser) {
      this.showError('Please login to apply');
      return;
    }
    this.currentVacancy = this.vacancies.find(v => v._id === vacancyId);
    if (!this.currentVacancy) {
      this.showError('Vacancy not found');
      return;
    }
    this.currentView = 'apply';
    this.render();
  }

  /**
   * Show my applications view
   */
  showMyApplicationsView() {
    this.currentView = 'my-applications';
    this.render();
  }

  /**
   * Show manage applications view
   */
  showManageApplicationsView(vacancyId = null) {
    this.currentView = 'manage-applications';
    if (vacancyId) {
      this.currentVacancy = this.vacancies.find(v => v._id === vacancyId);
    }
    this.render();
  }

  /**
   * Render vacancy form view (create/edit)
   */
  renderVacancyFormView() {
    renderVacancyFormView(this);
  }

  /**
   * Save vacancy
   */
  async saveVacancy() {
    if (!this.defaultOrganization) {
      this.showError('Organization required');
      return;
    }

    const form = this.container.querySelector('.vacancy-form');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // Convert empty strings to null for optional fields
    Object.keys(data).forEach(key => {
      if (data[key] === '') {
        data[key] = null;
      }
    });

    try {
      if (this.currentVacancy) {
        // Update
        const updated = {
          ...this.currentVacancy,
          ...data,
          workExperienceYears: parseInt(data.workExperienceYears) || 0,
          updatedAt: new Date().toISOString()
        };
        await this.db.update(updated);
        this.showSuccess('Vacancy updated successfully');
      } else {
        // Create
        const newVacancy = {
          _id: `vacancy:${this.generateUUID()}`,
          type: 'vacancy',
          organizationId: this.defaultOrganization._id,
          ...data,
          workExperienceYears: parseInt(data.workExperienceYears) || 0,
          createdBy: this.currentUser._id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          publishedAt: data.status === 'open' ? new Date().toISOString() : null
        };
        await this.db.create(newVacancy);
        this.showSuccess('Vacancy created successfully');
      }

      this.currentView = 'org-vacancies';
      await this.loadOrgVacancies();
      this.render();

    } catch (error) {
      this.logger.error('Failed to save vacancy:', error);
      this.showError('Failed to save vacancy');
    }
  }

  /**
   * Render vacancy details view
   */
  renderVacancyDetailsView() {
    if (!this.currentVacancy) {
      this.showError('Vacancy not found');
      return;
    }

    const header = this.createElement('div', { className: 'miniapp-header' });
    const backBtn = this.createElement('button', {
      className: 'btn btn-small',
      onclick: () => {
        this.currentView = 'public-vacancies';
        this.render();
      }
    }, ['← Back']);
    header.appendChild(backBtn);

    const details = this.createElement('div', { className: 'vacancy-details' });

    const title = this.createElement('h2', {}, [this.currentVacancy.title || 'Untitled Position']);
    details.appendChild(title);

    const orgName = this.getOrganizationName(this.currentVacancy.organizationId);
    const orgInfo = this.createElement('div', { className: 'detail-row' }, [
      `Organization: ${orgName}`
    ]);
    details.appendChild(orgInfo);

    const deptName = this.getDepartmentName(this.currentVacancy.departmentCode);
    const deptInfo = this.createElement('div', { className: 'detail-row' }, [
      `Department: ${deptName}`
    ]);
    details.appendChild(deptInfo);

    if (this.currentVacancy.teamCode) {
      const teamName = this.getTeamName(this.currentVacancy.teamCode);
      const teamInfo = this.createElement('div', { className: 'detail-row' }, [
        `Team: ${teamName}`
      ]);
      details.appendChild(teamInfo);
    }

    const desgName = this.getDesignationName(this.currentVacancy.designationCode);
    const desgInfo = this.createElement('div', { className: 'detail-row' }, [
      `Designation: ${desgName}`
    ]);
    details.appendChild(desgInfo);

    if (this.currentVacancy.workExperienceYears) {
      const expInfo = this.createElement('div', { className: 'detail-row' }, [
        `Experience Required: ${this.currentVacancy.workExperienceYears} years`
      ]);
      details.appendChild(expInfo);
    }

    const eduLevelName = this.getEducationLevelName(this.currentVacancy.minimumEducationLevelCode);
    const eduInfo = this.createElement('div', { className: 'detail-row' }, [
      `Minimum Education: ${eduLevelName}`
    ]);
    details.appendChild(eduInfo);

    if (this.currentVacancy.description) {
      const descSection = this.createElement('div', { className: 'detail-section' });
      const descTitle = this.createElement('h3', {}, ['Description']);
      const descText = this.createElement('div', { className: 'detail-text' }, [
        this.currentVacancy.description
      ]);
      descSection.appendChild(descTitle);
      descSection.appendChild(descText);
      details.appendChild(descSection);
    }

    // Requirements section
    const reqSection = this.createElement('div', { className: 'detail-section' });
    const reqTitle = this.createElement('h3', {}, ['Requirements']);
    reqSection.appendChild(reqTitle);

    if (this.currentVacancy.majorSubjectOneCode) {
      const subj1 = this.getSubjectName(this.currentVacancy.majorSubjectOneCode);
      reqSection.appendChild(this.createElement('div', {}, [`Major Subject 1: ${subj1}`]));
    }
    if (this.currentVacancy.majorSubjectTwoCode) {
      const subj2 = this.getSubjectName(this.currentVacancy.majorSubjectTwoCode);
      reqSection.appendChild(this.createElement('div', {}, [`Major Subject 2: ${subj2}`]));
    }
    if (this.currentVacancy.majorSubjectThreeCode) {
      const subj3 = this.getSubjectName(this.currentVacancy.majorSubjectThreeCode);
      reqSection.appendChild(this.createElement('div', {}, [`Major Subject 3: ${subj3}`]));
    }

    if (this.currentVacancy.requiredSkillOneCode) {
      const skill1 = this.getSkillName(this.currentVacancy.requiredSkillOneCode);
      reqSection.appendChild(this.createElement('div', {}, [`Required Skill 1: ${skill1}`]));
    }
    if (this.currentVacancy.requiredSkillTwoCode) {
      const skill2 = this.getSkillName(this.currentVacancy.requiredSkillTwoCode);
      reqSection.appendChild(this.createElement('div', {}, [`Required Skill 2: ${skill2}`]));
    }
    if (this.currentVacancy.requiredSkillThreeCode) {
      const skill3 = this.getSkillName(this.currentVacancy.requiredSkillThreeCode);
      reqSection.appendChild(this.createElement('div', {}, [`Required Skill 3: ${skill3}`]));
    }

    if (this.currentVacancy.goodToHaveSkillOneCode) {
      const gskill1 = this.getSkillName(this.currentVacancy.goodToHaveSkillOneCode);
      reqSection.appendChild(this.createElement('div', {}, [`Good to Have Skill 1: ${gskill1}`]));
    }
    if (this.currentVacancy.goodToHaveSkillTwoCode) {
      const gskill2 = this.getSkillName(this.currentVacancy.goodToHaveSkillTwoCode);
      reqSection.appendChild(this.createElement('div', {}, [`Good to Have Skill 2: ${gskill2}`]));
    }

    details.appendChild(reqSection);

    // Actions
    const actions = this.createElement('div', { className: 'vacancy-details-actions' });
    if (this.currentUser) {
      const hasApplied = this.applications.some(a => a.vacancyId === this.currentVacancy._id);
      if (!hasApplied) {
        const applyBtn = this.createElement('button', {
          className: 'btn btn-primary',
          onclick: () => this.showApplicationFormView(this.currentVacancy._id)
        }, ['Apply Now']);
        actions.appendChild(applyBtn);
      } else {
        const appliedBadge = this.createElement('div', { className: 'applied-badge' }, [
          'You have already applied'
        ]);
        actions.appendChild(appliedBadge);
      }
    } else {
      const loginMsg = this.createElement('div', { className: 'info-message' }, [
        'Please login to apply'
      ]);
      actions.appendChild(loginMsg);
    }

    this.container.appendChild(header);
    this.container.appendChild(details);
    this.container.appendChild(actions);
  }

  /**
   * Render application form view
   */
  renderApplicationFormView() {
    if (!this.currentUser) {
      this.showError('Please login to apply');
      return;
    }

    if (!this.currentVacancy) {
      this.showError('Vacancy not found');
      return;
    }

    const header = this.createElement('div', { className: 'miniapp-header' });
    const title = this.createElement('h2', {}, ['Apply for Position']);
    const backBtn = this.createElement('button', {
      className: 'btn btn-small',
      onclick: () => {
        this.currentView = 'vacancy-details';
        this.render();
      }
    }, ['← Back']);
    header.appendChild(backBtn);
    header.appendChild(title);

    const form = this.createElement('form', {
      className: 'application-form',
      onsubmit: (e) => {
        e.preventDefault();
        this.submitApplication();
      }
    });

    const vacancyInfo = this.createElement('div', { className: 'application-vacancy-info' }, [
      `Position: ${this.currentVacancy.title || 'Untitled'}`
    ]);
    form.appendChild(vacancyInfo);

    const coverLetterGroup = this.createElement('div', { className: 'form-group' });
    coverLetterGroup.appendChild(this.createElement('label', {}, ['Cover Letter']));
    const coverLetterTextarea = this.createElement('textarea', {
      name: 'coverLetter',
      className: 'input',
      rows: '8',
      placeholder: 'Tell us why you are a good fit for this position...'
    });
    coverLetterGroup.appendChild(coverLetterTextarea);
    form.appendChild(coverLetterGroup);

    const formActions = this.createElement('div', { className: 'form-actions' });
    const submitBtn = this.createElement('button', {
      className: 'btn btn-primary',
      type: 'submit'
    }, ['Submit Application']);
    const cancelBtn = this.createElement('button', {
      className: 'btn btn-secondary',
      type: 'button',
      onclick: () => {
        this.currentView = 'vacancy-details';
        this.render();
      }
    }, ['Cancel']);
    formActions.appendChild(submitBtn);
    formActions.appendChild(cancelBtn);
    form.appendChild(formActions);

    this.container.appendChild(header);
    this.container.appendChild(form);
  }

  /**
   * Submit application
   */
  async submitApplication() {
    if (!this.currentUser || !this.currentVacancy) {
      this.showError('Invalid application');
      return;
    }

    // Check if already applied
    const existingApp = this.applications.find(a =>
      a.vacancyId === this.currentVacancy._id &&
      a.applicantId === this.currentUser._id
    );

    if (existingApp) {
      this.showError('You have already applied for this position');
      return;
    }

    const form = this.container.querySelector('.application-form');
    const formData = new FormData(form);
    const coverLetter = formData.get('coverLetter') || '';

    try {
      const newApplication = {
        _id: `application:${this.generateUUID()}`,
        type: 'application',
        vacancyId: this.currentVacancy._id,
        applicantId: this.currentUser._id,
        organizationId: this.currentVacancy.organizationId,
        status: 'applied',
        appliedAt: new Date().toISOString(),
        currentStage: 'initial_review',
        stages: [{
          stage: 'initial_review',
          status: 'pending',
          notes: ''
        }],
        coverLetter: coverLetter,
        interviewNotes: [],
        offerDetails: null,
        onboardingId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await this.db.create(newApplication);
      this.showSuccess('Application submitted successfully!');

      // Reload applications
      await this.loadMyApplications();

      // Go to my applications view
      this.currentView = 'my-applications';
      this.render();

    } catch (error) {
      this.logger.error('Failed to submit application:', error);
      this.showError('Failed to submit application');
    }
  }

  /**
   * Render my applications view
   */
  renderMyApplicationsView() {
    if (!this.currentUser) {
      const message = this.createElement('div', { className: 'info-message' }, [
        'Please login to view your applications.'
      ]);
      this.container.appendChild(message);
      return;
    }

    const header = this.createElement('div', { className: 'miniapp-header' });
    const title = this.createElement('h2', {}, ['My Applications']);
    header.appendChild(title);

    const listContainer = this.createElement('div', { className: 'application-list-container' });

    if (this.applications.length === 0) {
      const empty = this.createElement('div', { className: 'empty-state' }, [
        'You have not applied to any positions yet.'
      ]);
      listContainer.appendChild(empty);
    } else {
      this.applications.forEach(application => {
        listContainer.appendChild(this.renderApplicationCard(application, true));
      });
    }

    this.container.appendChild(header);
    this.container.appendChild(listContainer);
  }

  /**
   * Render application card
   */
  renderApplicationCard(application, isApplicant = false) {
    const card = this.createElement('div', { className: 'application-card' });

    // Get vacancy info
    const vacancy = this.vacancies.find(v => v._id === application.vacancyId);
    const vacancyTitle = vacancy ? vacancy.title : 'Unknown Position';

    const title = this.createElement('div', { className: 'application-card-title' }, [vacancyTitle]);

    const statusBadge = this.createElement('span', {
      className: `status-badge status-${application.status}`
    }, [application.status || 'applied']);

    const appliedDate = new Date(application.appliedAt).toLocaleDateString();
    const dateInfo = this.createElement('div', { className: 'application-card-date' }, [
      `Applied: ${appliedDate}`
    ]);

    const stageInfo = this.createElement('div', { className: 'application-card-stage' }, [
      `Stage: ${this.getStageLabel(application.currentStage || 'initial_review')}`
    ]);

    card.appendChild(title);
    card.appendChild(statusBadge);
    card.appendChild(dateInfo);
    card.appendChild(stageInfo);

    if (application.onboardingId) {
      const onboarding = this.onboardings.find(o => o._id === application.onboardingId);
      const onboardingStatus = onboarding ? onboarding.status : 'in_progress';
      const onboardingInfo = this.createElement('div', { className: 'application-card-onboarding' }, [
        `Onboarding: ${this.getOnboardingStatusLabel(onboardingStatus)}`
      ]);
      card.appendChild(onboardingInfo);
    }

    if (!isApplicant) {
      // Org admin view - show applicant name
      let applicantName = application.applicantId;
      const person = this.personsCache.get(application.applicantId);
      if (person) {
        if (person.firstName && person.lastName) {
          applicantName = `${person.firstName} ${person.lastName} (${person.username || ''})`;
        } else if (person.username) {
          applicantName = person.username;
        } else if (person.firstName) {
          applicantName = person.firstName;
        }
      }

      const applicantInfo = this.createElement('div', { className: 'application-card-applicant' }, [
        `Applicant: ${applicantName}`
      ]);
      card.appendChild(applicantInfo);

      const actions = this.createElement('div', { className: 'application-card-actions' });
      const viewBtn = this.createElement('button', {
        className: 'btn btn-small btn-primary',
        onclick: () => this.showApplicationDetailsView(application._id)
      }, ['View Details']);
      actions.appendChild(viewBtn);
      card.appendChild(actions);
    }

    return card;
  }

  /**
   * Render manage applications view
   */
  renderManageApplicationsView() {
    if (!this.defaultOrganization) {
      const message = this.createElement('div', { className: 'info-message' }, [
        'Please set a default organization to manage applications.'
      ]);
      this.container.appendChild(message);
      return;
    }

    const header = this.createElement('div', { className: 'miniapp-header' });
    const title = this.createElement('h2', {}, ['Manage Applications']);
    header.appendChild(title);

    const headerActions = this.createElement('div', { className: 'header-actions' });
    const onboardingBtn = this.createElement('button', {
      className: 'btn btn-secondary btn-small',
      onclick: () => {
        this.currentView = 'onboarding';
        this.render();
      }
    }, ['View Onboarding']);
    headerActions.appendChild(onboardingBtn);
    header.appendChild(headerActions);

    // Filter by vacancy if specified
    let filteredApplications = [...this.applications];
    if (this.currentVacancy) {
      filteredApplications = filteredApplications.filter(a => a.vacancyId === this.currentVacancy._id);
    }

    const listContainer = this.createElement('div', { className: 'application-list-container' });

    if (filteredApplications.length === 0) {
      const empty = this.createElement('div', { className: 'empty-state' }, [
        'No applications found.'
      ]);
      listContainer.appendChild(empty);
    } else {
      filteredApplications.forEach(application => {
        listContainer.appendChild(this.renderApplicationCard(application, false));
      });
    }

    this.container.appendChild(header);
    this.container.appendChild(listContainer);
  }

  /**
   * Render application details view with workflow controls
   */
  renderApplicationDetailsView() {
    if (!this.currentApplication) {
      this.showError('Application not found');
      return;
    }

    const application = this.currentApplication;
    const vacancy = this.vacancies.find(v => v._id === application.vacancyId);

    // Get applicant display name from cache
    let applicantDisplay = 'Unknown applicant';
    if (application.applicantId) {
      const person = this.personsCache.get(application.applicantId);
      if (person) {
        if (person.firstName && person.lastName) {
          applicantDisplay = `${person.firstName} ${person.lastName} (${person.username || ''})`;
        } else if (person.username) {
          applicantDisplay = person.username;
        } else if (person.firstName) {
          applicantDisplay = person.firstName;
        } else {
          applicantDisplay = application.applicantId;
        }
      } else {
        applicantDisplay = application.applicantId;
      }
    }

    const header = this.createElement('div', { className: 'miniapp-header' });
    const backBtn = this.createElement('button', {
      className: 'btn btn-small',
      onclick: () => {
        this.currentView = this.viewMode === 'org-admin' ? 'manage-applications' : 'my-applications';
        this.render();
      }
    }, ['← Back']);
    header.appendChild(backBtn);

    const title = this.createElement('h2', {}, ['Application Details']);
    header.appendChild(title);

    // Info card
    const infoCard = this.createElement('div', { className: 'application-details-card' });
    infoCard.appendChild(this.createElement('div', { className: 'detail-row' }, [
      `Position: ${vacancy ? vacancy.title : 'Unknown Position'}`
    ]));
    infoCard.appendChild(this.createElement('div', { className: 'detail-row' }, [
      `Applicant: ${applicantDisplay}`
    ]));
    infoCard.appendChild(this.createElement('div', { className: 'detail-row' }, [
      `Status: ${this.formatLabel(application.status)}`
    ]));
    infoCard.appendChild(this.createElement('div', { className: 'detail-row' }, [
      `Current Stage: ${this.getStageLabel(application.currentStage)}`
    ]));
    infoCard.appendChild(this.createElement('div', { className: 'detail-row' }, [
      `Applied: ${this.formatDateTime(application.appliedAt)}`
    ]));

    if (application.coverLetter) {
      const coverSection = this.createElement('div', { className: 'detail-section' });
      coverSection.appendChild(this.createElement('h3', {}, ['Cover Letter']));
      coverSection.appendChild(this.createElement('div', { className: 'detail-text' }, [
        application.coverLetter
      ]));
      infoCard.appendChild(coverSection);
    }

    // Stage timeline
    const timelineSection = this.createElement('div', { className: 'stage-timeline' });
    const timelineTitle = this.createElement('h3', {}, ['Stage History']);
    timelineSection.appendChild(timelineTitle);

    if (application.stages && application.stages.length > 0) {
      application.stages
        .sort((a, b) => new Date(a.updatedAt || a.scheduledAt || 0) - new Date(b.updatedAt || b.scheduledAt || 0))
        .forEach(stage => {
          const entry = this.createElement('div', { className: 'stage-entry' });
          entry.appendChild(this.createElement('div', { className: 'stage-entry-title' }, [
            `${this.getStageLabel(stage.stage)} - ${this.formatLabel(stage.status)}`
          ]));
          entry.appendChild(this.createElement('div', { className: 'stage-entry-date' }, [
            this.formatDateTime(stage.updatedAt || stage.scheduledAt)
          ]));
          if (stage.notes) {
            entry.appendChild(this.createElement('div', { className: 'stage-entry-notes' }, [stage.notes]));
          }
          timelineSection.appendChild(entry);
        });
    } else {
      timelineSection.appendChild(this.createElement('div', { className: 'info-message' }, [
        'No workflow updates yet.'
      ]));
    }

    this.container.appendChild(header);
    this.container.appendChild(infoCard);
    this.container.appendChild(timelineSection);

    // Workflow form for org admins
    if (this.viewMode === 'org-admin') {
      const workflowForm = this.createElement('form', {
        className: 'application-workflow-form',
        onsubmit: (e) => {
          e.preventDefault();
          this.updateApplicationWorkflow(e.currentTarget);
        }
      });

      const statusGroup = this.createElement('div', { className: 'form-group' });
      statusGroup.appendChild(this.createElement('label', {}, ['Application Status']));
      const statusSelect = this.createElement('select', {
        name: 'status',
        className: 'input'
      });
      APPLICATION_STATUS_OPTIONS.forEach(status => {
        const option = this.createElement('option', {
          value: status,
          selected: application.status === status
        }, [this.formatLabel(status)]);
        statusSelect.appendChild(option);
      });
      statusGroup.appendChild(statusSelect);

      const stageGroup = this.createElement('div', { className: 'form-group' });
      stageGroup.appendChild(this.createElement('label', {}, ['Workflow Stage']));
      const stageSelect = this.createElement('select', {
        name: 'stage',
        className: 'input'
      });
      Object.keys(STAGE_LABELS).forEach(stage => {
        const option = this.createElement('option', {
          value: stage,
          selected: application.currentStage === stage
        }, [this.getStageLabel(stage)]);
        stageSelect.appendChild(option);
      });
      stageGroup.appendChild(stageSelect);

      const stageStatusGroup = this.createElement('div', { className: 'form-group' });
      stageStatusGroup.appendChild(this.createElement('label', {}, ['Stage Status']));
      const stageStatusSelect = this.createElement('select', {
        name: 'stageStatus',
        className: 'input'
      });
      STAGE_STATUS_OPTIONS.forEach(status => {
        const option = this.createElement('option', {
          value: status
        }, [this.formatLabel(status)]);
        stageStatusSelect.appendChild(option);
      });
      stageStatusGroup.appendChild(stageStatusSelect);

      const scheduleGroup = this.createElement('div', { className: 'form-group' });
      scheduleGroup.appendChild(this.createElement('label', {}, ['Schedule / Due Date']));
      const scheduleInput = this.createElement('input', {
        type: 'datetime-local',
        name: 'scheduledAt',
        className: 'input'
      });
      scheduleGroup.appendChild(scheduleInput);

      const notesGroup = this.createElement('div', { className: 'form-group' });
      notesGroup.appendChild(this.createElement('label', {}, ['Notes']));
      const notesInput = this.createElement('textarea', {
        name: 'notes',
        className: 'input',
        rows: '4',
        placeholder: 'Add notes or interview information...'
      });
      notesGroup.appendChild(notesInput);

      const formActions = this.createElement('div', { className: 'form-actions' });
      const updateBtn = this.createElement('button', {
        className: 'btn btn-primary',
        type: 'submit'
      }, ['Update Application']);
      formActions.appendChild(updateBtn);

      workflowForm.appendChild(statusGroup);
      workflowForm.appendChild(stageGroup);
      workflowForm.appendChild(stageStatusGroup);
      workflowForm.appendChild(scheduleGroup);
      workflowForm.appendChild(notesGroup);
      workflowForm.appendChild(formActions);

      this.container.appendChild(workflowForm);
    }

    const onboardingSection = this.renderOnboardingSection(application);
    if (onboardingSection) {
      this.container.appendChild(onboardingSection);
    }
  }

  /**
   * Show application details view
   */
  async showApplicationDetailsView(applicationId) {
    try {
      this.currentApplication = await this.db.read(applicationId);

      // Load applicant person data
      if (this.currentApplication.applicantId) {
        await this.loadPersonData(this.currentApplication.applicantId);
      }

      if (this.currentApplication.onboardingId) {
        const hasOnboarding = this.onboardings.find(o => o._id === this.currentApplication.onboardingId);
        if (!hasOnboarding) {
          if (this.viewMode === 'org-admin') {
            await this.loadOrgOnboardings();
          } else {
            await this.loadMyOnboardings();
          }
        }
      }
      this.currentView = 'application-details';
      this.render();
    } catch (error) {
      this.logger.error('Failed to load application:', error);
      this.showError('Failed to load application');
    }
  }

  /**
   * Update application workflow and status
   */
  async updateApplicationWorkflow(formElement) {
    if (!this.currentApplication) {
      this.showError('Application not found');
      return;
    }

    const formData = new FormData(formElement);
    const status = formData.get('status') || this.currentApplication.status;
    const stage = formData.get('stage') || this.currentApplication.currentStage || 'initial_review';
    const stageStatus = formData.get('stageStatus') || 'pending';
    const scheduledAt = formData.get('scheduledAt');
    const notes = formData.get('notes') || '';
    const now = new Date().toISOString();

    const updatedApplication = {
      ...this.currentApplication,
      status,
      currentStage: stage,
      updatedAt: now,
      stages: [...(this.currentApplication.stages || []), {
        id: `stage:${this.generateUUID()}`,
        stage,
        status: stageStatus,
        notes: notes.trim(),
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        updatedAt: now
      }]
    };

    try {
      await this.db.update(updatedApplication);
      this.currentApplication = updatedApplication;
      await this.loadOrgApplications();
      this.showSuccess('Application updated successfully');
      this.render();
    } catch (error) {
      this.logger.error('Failed to update application:', error);
      this.showError('Failed to update application');
    }
  }

  /**
   * Render onboarding section inside application details
   */
  renderOnboardingSection(application) {
    if (!application) return null;

    const section = this.createElement('div', { className: 'onboarding-section' });
    section.appendChild(this.createElement('h3', {}, ['Onboarding']));

    const onboarding = this.getOnboardingForApplication(application._id);

    if (!onboarding) {
      const message = this.createElement('div', { className: 'info-message' }, [
        application.status === 'hired'
          ? 'Onboarding has not started yet.'
          : 'Set status to Hired to enable onboarding.'
      ]);
      section.appendChild(message);

      if (this.viewMode === 'org-admin' && application.status === 'hired') {
        const startBtn = this.createElement('button', {
          className: 'btn btn-primary',
          onclick: () => this.createOnboardingForApplication(application)
        }, ['Start Onboarding']);
        section.appendChild(startBtn);
      }

      return section;
    }

    section.appendChild(this.renderOnboardingCard(onboarding, this.viewMode === 'org-admin'));
    return section;
  }

  /**
   * Create onboarding record for application
   */
  async createOnboardingForApplication(application) {
    if (!application) return;

    const now = new Date().toISOString();
    const newOnboarding = {
      _id: `onboarding:${this.generateUUID()}`,
      type: 'onboarding',
      applicationId: application._id,
      vacancyId: application.vacancyId,
      personId: application.applicantId,
      organizationId: application.organizationId,
      status: 'not_started',
      startDate: now,
      completionDate: null,
      tasks: DEFAULT_ONBOARDING_TASKS.map(task => ({
        ...task,
        updatedAt: now
      })),
      createdAt: now,
      updatedAt: now
    };

    try {
      await this.db.create(newOnboarding);
      const updatedApplication = {
        ...application,
        onboardingId: newOnboarding._id,
        currentStage: 'onboarding',
        status: 'hired',
        updatedAt: now,
        stages: [...(application.stages || []), {
          id: `stage:${this.generateUUID()}`,
          stage: 'onboarding',
          status: 'pending',
          notes: 'Onboarding initiated',
          updatedAt: now
        }]
      };

      await this.db.update(updatedApplication);
      this.currentApplication = updatedApplication;

      if (this.viewMode === 'org-admin') {
        await this.loadOrgOnboardings();
        await this.loadOrgApplications();
      } else {
        await this.loadMyOnboardings();
        await this.loadMyApplications();
      }

      this.showSuccess('Onboarding started');
      this.render();
    } catch (error) {
      this.logger.error('Failed to create onboarding:', error);
      this.showError('Failed to start onboarding');
    }
  }

  /**
   * Update onboarding task status
   */
  async updateOnboardingTaskStatus(onboardingId, taskId, newStatus) {
    try {
      const onboarding = await this.db.read(onboardingId);
      const now = new Date().toISOString();
      onboarding.tasks = (onboarding.tasks || []).map(task => {
        if (task.id === taskId) {
          const updatedTask = {
            ...task,
            status: newStatus,
            updatedAt: now
          };
          if (newStatus === 'completed') {
            updatedTask.completedAt = now;
          } else {
            delete updatedTask.completedAt;
          }
          return updatedTask;
        }
        return task;
      });

      const allCompleted = onboarding.tasks.every(task => task.status === 'completed');
      const anyInProgress = onboarding.tasks.some(task => task.status === 'in_progress' || task.status === 'completed');

      onboarding.status = allCompleted
        ? 'completed'
        : anyInProgress
          ? 'in_progress'
          : 'not_started';
      onboarding.updatedAt = now;
      onboarding.completionDate = allCompleted ? now : null;

      await this.db.update(onboarding);

      if (this.viewMode === 'org-admin') {
        await this.loadOrgOnboardings();
      } else {
        await this.loadMyOnboardings();
      }

      this.showSuccess('Onboarding task updated');
      if (this.currentView === 'application-details' || this.currentView === 'onboarding') {
        this.render();
      }
    } catch (error) {
      this.logger.error('Failed to update onboarding task:', error);
      this.showError('Failed to update onboarding task');
    }
  }

  /**
   * Render onboarding overview view
   */
  renderOnboardingView() {
    const header = this.createElement('div', { className: 'miniapp-header' });
    const title = this.createElement('h2', {}, ['Onboarding']);
    const backBtn = this.createElement('button', {
      className: 'btn btn-small',
      onclick: () => {
        this.currentView = this.viewMode === 'org-admin' ? 'manage-applications' : 'my-applications';
        this.render();
      }
    }, ['← Back']);
    header.appendChild(backBtn);
    header.appendChild(title);

    const listContainer = this.createElement('div', { className: 'onboarding-list-container' });
    const records = this.onboardings || [];

    if (records.length === 0) {
      const empty = this.createElement('div', { className: 'empty-state' }, [
        this.viewMode === 'org-admin'
          ? 'No onboarding records for this organization.'
          : 'You do not have any onboarding tasks yet.'
      ]);
      listContainer.appendChild(empty);
    } else {
      records.forEach(onboarding => {
        listContainer.appendChild(this.renderOnboardingCard(onboarding, this.viewMode === 'org-admin'));
      });
    }

    this.container.appendChild(header);
    this.container.appendChild(listContainer);
  }

  /**
   * Render onboarding card
   */
  renderOnboardingCard(onboarding, allowUpdates = false) {
    const card = this.createElement('div', { className: 'onboarding-card' });
    const vacancy = this.vacancies.find(v => v._id === onboarding.vacancyId);

    const title = this.createElement('div', { className: 'onboarding-card-title' }, [
      vacancy ? vacancy.title : 'Onboarding'
    ]);
    card.appendChild(title);

    const statusBadge = this.createElement('span', {
      className: `status-badge status-${onboarding.status || 'not_started'}`
    }, [this.getOnboardingStatusLabel(onboarding.status || 'not_started')]);
    card.appendChild(statusBadge);

    const tasksList = this.createElement('div', { className: 'onboarding-task-list' });

    (onboarding.tasks || []).forEach(task => {
      const taskRow = this.createElement('div', { className: 'onboarding-task-row' });
      const name = this.createElement('div', { className: 'onboarding-task-name' }, [task.task]);
      taskRow.appendChild(name);

      if (allowUpdates) {
        const select = this.createElement('select', {
          className: 'input onboarding-task-select',
          onchange: (e) => this.updateOnboardingTaskStatus(onboarding._id, task.id, e.target.value)
        });
        STAGE_STATUS_OPTIONS.filter(status => status !== 'scheduled').forEach(status => {
          const option = this.createElement('option', {
            value: status,
            selected: task.status === status
          }, [this.formatLabel(status)]);
          select.appendChild(option);
        });
        taskRow.appendChild(select);
      } else {
        taskRow.appendChild(this.createElement('div', { className: 'onboarding-task-status' }, [
          this.formatLabel(task.status)
        ]));
      }

      tasksList.appendChild(taskRow);
    });

    card.appendChild(tasksList);

    if (onboarding.status === 'completed' && onboarding.completionDate) {
      card.appendChild(this.createElement('div', { className: 'onboarding-completion' }, [
        `Completed on ${this.formatDateTime(onboarding.completionDate)}`
      ]));
    }

    return card;
  }

  /**
   * Generate UUID
   */
  generateUUID() {
    return generateUUID();
  }

  /**
   * Cleanup
   */
  onDestroy() {
    this.vacancies = [];
    this.applications = [];
    this.onboardings = [];
    this.currentVacancy = null;
    this.currentApplication = null;
    this.currentUser = null;
    this.defaultOrganization = null;
  }
}

export { RecruitmentManagementApp };

