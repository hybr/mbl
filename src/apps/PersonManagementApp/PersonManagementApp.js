/**
 * PersonManagementApp.js - Complete Person Management MiniApp
 * Handles person profiles, credentials, relations, and authentication
 */

import { MiniApp } from '../../core/MiniApp.js';
import { Notification } from '../../utils/Notification.js';

// Constants
import {
  VIEW_MODES,
  SESSION_STORAGE_KEY,
  PASSWORD_CONFIG
} from './constants.js';

// Data Loaders
import {
  loadPersons as _loadPersons,
  loadPerson as _loadPerson,
  findPersonByUsername,
  findPersonByEmail,
  savePerson,
  deletePerson as _deletePerson,
  createIndexes
} from './dataLoaders.js';

// View Helpers
import {
  getFullName,
  filterPersons as _filterPersons,
  getFormData
} from './viewHelpers.js';

// Auth Helpers
import {
  hashPassword,
  isValidEmail,
  authenticate
} from '../../utils/authHelpers.js';

// Utilities
import { generateUUID } from '../../utils/formatters.js';

// Views
import { renderListView } from './views/ListView.js';
import { renderLoginView } from './views/LoginView.js';
import { renderSignupView } from './views/SignupView.js';
import { renderForgotPasswordView } from './views/ForgotPasswordView.js';
import { renderProfileView } from './views/ProfileView.js';
import { renderEditView } from './views/EditView.js';

class PersonManagementApp extends MiniApp {
  constructor(options = {}) {
    super({
      name: 'PersonManagementApp',
      ...options
    });

    this.persons = [];
    this.currentPerson = null;
    this.currentView = VIEW_MODES.LIST;
    this.currentUser = null;
    this.components = {};
    this.searchTerm = '';
  }

  /**
   * Initialize the app
   */
  async onInit() {
    this.logger.info('Initializing PersonManagementApp');

    // Create indexes for fast queries
    await createIndexes(this.db, this.logger);

    // Subscribe to person data changes
    this.subscribeToData('person', (change) => {
      this.handlePersonChange(change);
    });

    // Load all persons
    await this.loadPersons();

    // Restore session if exists
    await this.restoreSession();
  }

  /**
   * Save current user session to localStorage
   */
  saveSession() {
    if (this.currentUser) {
      const sessionData = {
        userId: this.currentUser._id,
        username: this.currentUser.username,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
      this.logger.info('Session saved for user:', this.currentUser.username);
    }
  }

  /**
   * Restore user session from localStorage
   */
  async restoreSession() {
    try {
      const sessionData = localStorage.getItem(SESSION_STORAGE_KEY);

      if (sessionData) {
        const session = JSON.parse(sessionData);
        this.logger.info('Found session for user:', session.username);

        // Load the user from database
        const user = await _loadPerson(this.db, session.userId, this.logger);

        if (user) {
          this.currentUser = user;
          this.logger.info('Session restored for user:', user.username);

          // Emit login event to update UI
          this.emit('person:login', user);
        } else {
          // User not found, clear invalid session
          this.clearSession();
          this.logger.warn('User not found, session cleared');
        }
      }
    } catch (error) {
      this.logger.error('Failed to restore session:', error);
      this.clearSession();
    }
  }

  /**
   * Clear user session from localStorage
   */
  clearSession() {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    this.logger.info('Session cleared');
  }

  /**
   * Render the UI
   */
  async onRender() {
    this.clearContainer();

    // Render based on current view
    switch (this.currentView) {
      case VIEW_MODES.LIST:
        renderListView(this);
        break;
      case VIEW_MODES.EDIT:
        renderEditView(this);
        break;
      case VIEW_MODES.LOGIN:
        renderLoginView(this);
        break;
      case VIEW_MODES.SIGNUP:
        renderSignupView(this);
        break;
      case VIEW_MODES.FORGOT_PASSWORD:
        renderForgotPasswordView(this);
        break;
      case VIEW_MODES.PROFILE:
        renderProfileView(this);
        break;
    }
  }

  /**
   * Load all persons
   */
  async loadPersons() {
    this.persons = await _loadPersons(this.db, this.logger);

    if (this.isRendered) {
      this.render();
    }
  }

  /**
   * Save current person
   */
  async saveCurrentPerson() {
    const form = this.container.querySelector('.person-form');
    const data = getFormData(form);
    if (!data) return;

    try {
      // Validate
      const validation = await this.validatePerson(data, this.currentPerson?._id);
      if (!validation.valid) {
        Notification.error(validation.error);
        return;
      }

      // Prepare person object
      const person = {
        type: 'person',
        namePrefix: data.namePrefix || '',
        firstName: data.firstName,
        middleName: data.middleName || '',
        lastName: data.lastName || '',
        nameSuffix: data.nameSuffix || '',
        dateOfBirth: data.dateOfBirth || '',
        gender: data.gender || '',
        primaryPhone: data.primaryPhone || '',
        primaryEmail: data.primaryEmail || '',
        fatherId: data.fatherId || null,
        motherId: data.motherId || null,
        username: data.username,
        otp: data.otp || '',
        failedLoginAttempts: 0,
        lastLoginTimestamp: null,
        passwordUpdatedTimestamp: new Date().toISOString()
      };

      // Handle password
      if (data.password) {
        person.hashedPassword = hashPassword(data.password);
      } else if (this.currentPerson) {
        person.hashedPassword = this.currentPerson.hashedPassword;
      }

      // Save
      const isNew = !this.currentPerson;
      if (this.currentPerson) {
        person._id = this.currentPerson._id;
        person._rev = this.currentPerson._rev;
      } else {
        person._id = `person:${generateUUID()}`;
      }

      await savePerson(this.db, person, isNew, this.logger);
      Notification.success(isNew ? 'Person created successfully' : 'Person updated successfully');

      // Emit event
      this.emit('person:saved', person);

      // Go back to list
      this.showListView();

    } catch (error) {
      this.logger.error('Failed to save person:', error);
      Notification.error('Failed to save person. Please try again.');
    }
  }

  /**
   * Delete person
   */
  async deletePerson(person) {
    if (!confirm(`Delete ${getFullName(person)}?`)) {
      return;
    }

    try {
      await _deletePerson(this.db, person, this.logger);
      Notification.success('Person deleted successfully');
      this.emit('person:deleted', person);
    } catch (error) {
      this.logger.error('Failed to delete person:', error);
      Notification.error('Failed to delete person. Please try again.');
    }
  }

  /**
   * Validate person data
   */
  async validatePerson(data, currentPersonId = null) {
    // Required fields
    if (!data.firstName) {
      return { valid: false, error: 'First name is required' };
    }

    if (!data.username) {
      return { valid: false, error: 'Username is required' };
    }

    // Username must be unique (case-insensitive)
    const existingPerson = await findPersonByUsername(this.db, data.username, this.logger);

    if (existingPerson && existingPerson._id !== currentPersonId) {
      return { valid: false, error: 'Username already exists' };
    }

    // Password required for new person
    if (!currentPersonId && !data.password) {
      return { valid: false, error: 'Password is required for new person' };
    }

    // Email format
    if (data.primaryEmail && !isValidEmail(data.primaryEmail)) {
      return { valid: false, error: 'Invalid email format' };
    }

    return { valid: true };
  }

  /**
   * Perform login
   */
  async performLogin() {
    const username = this.components.loginUsername.getValue().trim();
    const password = this.components.loginPassword.getValue().trim();

    if (!username || !password) {
      Notification.error('Username and password are required');
      return;
    }

    const result = await authenticate(this.db, findPersonByUsername, username, password, null, this.logger);

    if (result.success) {
      this.currentUser = result.person;
      Notification.success(`Welcome, ${getFullName(result.person)}!`);

      // Save session to localStorage
      this.saveSession();

      // Emit login event
      this.emit('person:login', result.person);

      // Show profile view
      this.showProfileView();
    } else {
      Notification.error(result.error);
    }
  }

  /**
   * Perform signup
   */
  async performSignup() {
    const firstName = this.components.signupFirstName.getValue().trim();
    const lastName = this.components.signupLastName.getValue().trim();
    const email = this.components.signupEmail.getValue().trim();
    const username = this.components.signupUsername.getValue().trim();
    const password = this.components.signupPassword.getValue().trim();
    const confirmPassword = this.components.signupConfirmPassword.getValue().trim();

    // Validation
    if (!firstName) {
      Notification.error('First name is required');
      return;
    }

    if (!email) {
      Notification.error('Email is required');
      return;
    }

    if (!isValidEmail(email)) {
      Notification.error('Invalid email format');
      return;
    }

    if (!username) {
      Notification.error('Username is required');
      return;
    }

    if (!password) {
      Notification.error('Password is required');
      return;
    }

    if (password.length < PASSWORD_CONFIG.MIN_LENGTH) {
      Notification.error(`Password must be at least ${PASSWORD_CONFIG.MIN_LENGTH} characters`);
      return;
    }

    if (password !== confirmPassword) {
      Notification.error('Passwords do not match');
      return;
    }

    // Check if username exists
    const existingPerson = await findPersonByUsername(this.db, username, this.logger);
    if (existingPerson) {
      Notification.error('Username already exists');
      return;
    }

    try {
      // Create new person
      const person = {
        _id: `person:${generateUUID()}`,
        type: 'person',
        namePrefix: '',
        firstName: firstName,
        middleName: '',
        lastName: lastName,
        nameSuffix: '',
        dateOfBirth: '',
        gender: '',
        primaryPhone: '',
        primaryEmail: email,
        fatherId: null,
        motherId: null,
        username: username,
        hashedPassword: hashPassword(password),
        otp: '',
        failedLoginAttempts: 0,
        lastLoginTimestamp: null,
        passwordUpdatedTimestamp: new Date().toISOString()
      };

      await this.db.create(person);
      Notification.success('Account created successfully! Please log in.');

      // Clear form and go to login
      this.showLoginView();

    } catch (error) {
      this.logger.error('Signup failed:', error);
      Notification.error('Failed to create account. Please try again.');
    }
  }

  /**
   * Perform password reset
   */
  async performPasswordReset() {
    const email = this.components.resetEmail.getValue().trim();

    if (!email) {
      Notification.error('Email is required');
      return;
    }

    if (!isValidEmail(email)) {
      Notification.error('Invalid email format');
      return;
    }

    try {
      // Find person by email
      const results = await findPersonByEmail(this.db, email, this.logger);

      if (results.length === 0) {
        // For security, don't reveal if email exists
        Notification.success('If an account with that email exists, a password reset link has been sent.');
        setTimeout(() => this.showLoginView(), 2000);
        return;
      }

      // In a real app, you would send an email here
      Notification.success('Password reset link sent to your email!');

      this.logger.info('Password reset requested for:', email);

      setTimeout(() => this.showLoginView(), 2000);

    } catch (error) {
      this.logger.error('Password reset failed:', error);
      Notification.error('Failed to process request. Please try again.');
    }
  }

  /**
   * Open Tasks App
   */
  async openTasksApp() {
    try {
      if (window.app) {
        await window.app.toggleMiniApp('TasksApp', 'tasks-container');
      } else {
        this.logger.warn('Global app instance not available');
      }
    } catch (error) {
      this.logger.error('Failed to open Tasks app:', error);
      this.showError('Failed to open Tasks app');
    }
  }

  /**
   * Open Notes App
   */
  async openNotesApp() {
    try {
      if (window.app) {
        await window.app.toggleMiniApp('NotesApp', 'notes-container');
      } else {
        this.logger.warn('Global app instance not available');
      }
    } catch (error) {
      this.logger.error('Failed to open Notes app:', error);
      this.showError('Failed to open Notes app');
    }
  }

  /**
   * Open Messages App (Inbox)
   */
  async openMessagesApp() {
    try {
      if (window.app) {
        await window.app.toggleMiniApp('MessageInboxApp', 'inbox-container');
      } else {
        this.logger.warn('Global app instance not available');
      }
    } catch (error) {
      this.logger.error('Failed to open Messages app:', error);
      this.showError('Failed to open Messages app');
    }
  }

  /**
   * Open Education App
   */
  async openEducationApp() {
    try {
      if (window.app) {
        await window.app.toggleMiniApp('EducationManagementApp', 'education-container');
      } else {
        this.logger.warn('Global app instance not available');
      }
    } catch (error) {
      this.logger.error('Failed to open Education app:', error);
      this.showError('Failed to open Education app');
    }
  }

  /**
   * Open Skill Management App
   */
  async openSkillsApp() {
    try {
      if (window.app) {
        await window.app.toggleMiniApp('SkillManagementApp', 'skill-container');
      } else {
        this.logger.warn('Global app instance not available');
      }
    } catch (error) {
      this.logger.error('Failed to open Skills app:', error);
      this.showError('Failed to open Skills app');
    }
  }

  /**
   * Open RecruitmentManagementApp
   */
  async RecruitmentManagementApp() {
    try {
      if (window.app) {
        await window.app.toggleMiniApp('RecruitmentManagementApp', 'recruitment-container');
      } else {
        this.logger.warn('Global app instance not available');
      }
    } catch (error) {
      this.logger.error('Failed to open RecruitmentManagement app:', error);
      this.showError('Failed to open RecruitmentManagement app');
    }
  }

  /**
   * Logout
   */
  logout() {
    // Clear session from localStorage
    this.clearSession();

    this.currentUser = null;
    Notification.info('Logged out successfully');
    this.emit('person:logout');
    this.render();
  }

  /**
   * Handle person data changes
   */
  handlePersonChange(change) {
    this.logger.debug('Person change detected:', change);

    if (change.deleted) {
      this.persons = this.persons.filter(p => p._id !== change.id);
    } else {
      const index = this.persons.findIndex(p => p._id === change.doc._id);
      if (index >= 0) {
        this.persons[index] = change.doc;
      } else {
        this.persons.push(change.doc);
      }
    }

    // Re-render if on list view
    if (this.isRendered && this.currentView === VIEW_MODES.LIST) {
      this.render();
    }
  }

  /**
   * Show list view
   */
  showListView() {
    this.currentView = VIEW_MODES.LIST;
    this.currentPerson = null;
    this.render();
  }

  /**
   * Show edit view
   */
  async showEditView(personId) {
    if (personId) {
      this.currentPerson = await _loadPerson(this.db, personId, this.logger);
    } else {
      this.currentPerson = null;
    }

    this.currentView = VIEW_MODES.EDIT;
    this.render();
  }

  /**
   * Show login view
   */
  showLoginView() {
    this.currentView = VIEW_MODES.LOGIN;
    this.render();
  }

  /**
   * Show signup view
   */
  showSignupView() {
    this.currentView = VIEW_MODES.SIGNUP;
    this.render();
  }

  /**
   * Show forgot password view
   */
  showForgotPasswordView() {
    this.currentView = VIEW_MODES.FORGOT_PASSWORD;
    this.render();
  }

  /**
   * Show profile view
   */
  showProfileView() {
    if (!this.currentUser) {
      this.showLoginView();
      return;
    }
    this.currentView = VIEW_MODES.PROFILE;
    this.render();
  }

  /**
   * Filter persons by search term
   */
  filterPersons(searchTerm) {
    // Store search term and re-render
    this.searchTerm = searchTerm.toLowerCase();
    if (this.currentView === VIEW_MODES.LIST) {
      this.render();
    }
  }

  /**
   * Get filtered persons
   */
  getFilteredPersons() {
    return _filterPersons(this.persons, this.searchTerm);
  }

  /**
   * Cleanup
   */
  onDestroy() {
    // Destroy all components
    Object.values(this.components).forEach(component => {
      if (component.destroy) {
        component.destroy();
      }
    });

    this.persons = [];
    this.currentPerson = null;
    this.currentUser = null;

    this.logger.info('PersonManagementApp destroyed');
  }
}

export { PersonManagementApp };
