/**
 * PersonManagementApp.js - Complete Person Management MiniApp
 * Handles person profiles, credentials, relations, and authentication
 */

import { MiniApp } from '../core/MiniApp.js';
import { Button } from '../components/Button.js';
import { Input } from '../components/Input.js';
import { Notification } from '../utils/Notification.js';

class PersonManagementApp extends MiniApp {
  constructor(options = {}) {
    super({
      name: 'PersonManagementApp',
      ...options
    });

    this.persons = [];
    this.currentPerson = null;
    this.currentView = 'list'; // 'list', 'edit', 'login'
    this.currentUser = null; // Logged in user
    this.components = {};
  }

  /**
   * Initialize the app
   */
  async onInit() {
    this.logger.info('Initializing PersonManagementApp');

    // Create indexes for fast queries
    await this.createIndexes();

    // Subscribe to person data changes
    this.subscribeToData('person', (change) => {
      this.handlePersonChange(change);
    });

    // Load all persons
    await this.loadPersons();
  }

  /**
   * Create database indexes
   */
  async createIndexes() {
    try {
      // Index for username uniqueness check
      await this.db.createIndex(['type', 'username']);

      // Index for name searches
      await this.db.createIndex(['type', 'firstName', 'lastName']);

      this.logger.info('Database indexes created');
    } catch (error) {
      this.logger.error('Failed to create indexes:', error);
    }
  }

  /**
   * Render the UI
   */
  async onRender() {
    this.clearContainer();

    // Render based on current view
    switch (this.currentView) {
      case 'list':
        this.renderListView();
        break;
      case 'edit':
        this.renderEditView();
        break;
      case 'login':
        this.renderLoginView();
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
    const title = this.createElement('h2', {}, ['Person Management']);
    titleContainer.appendChild(title);

    if (this.currentUser) {
      const userInfo = this.createElement('div', {
        className: 'user-info'
      }, [`Logged in as: ${this.currentUser.username}`]);
      titleContainer.appendChild(userInfo);
    }

    header.appendChild(titleContainer);

    // Action buttons
    const actions = this.createElement('div', { className: 'person-actions' });

    this.components.createBtn = new Button({
      text: '+ Create Person',
      className: 'btn btn-primary',
      onClick: () => this.showEditView(null)
    });

    this.components.loginBtn = new Button({
      text: this.currentUser ? 'Logout' : 'Login',
      className: 'btn btn-secondary',
      onClick: () => {
        if (this.currentUser) {
          this.logout();
        } else {
          this.showLoginView();
        }
      }
    });

    actions.appendChild(this.components.createBtn.create());
    actions.appendChild(this.components.loginBtn.create());

    // Search
    const searchContainer = this.createElement('div', { className: 'person-search' });

    this.components.searchInput = new Input({
      placeholder: 'Search by name...',
      className: 'input',
      onChange: (value) => this.filterPersons(value)
    });

    searchContainer.appendChild(this.components.searchInput.create());

    // Person list
    const listContainer = this.createElement('div', { className: 'person-list-container' });
    const personList = this.createElement('div', { className: 'person-list' });

    const filteredPersons = this.getFilteredPersons();

    if (filteredPersons.length === 0) {
      const empty = this.createElement('div', {
        className: 'person-list-empty'
      }, ['No persons found. Create your first person!']);
      personList.appendChild(empty);
    } else {
      filteredPersons.forEach(person => {
        const personCard = this.renderPersonCard(person);
        personList.appendChild(personCard);
      });
    }

    listContainer.appendChild(personList);

    // Assemble
    this.container.appendChild(header);
    this.container.appendChild(actions);
    this.container.appendChild(searchContainer);
    this.container.appendChild(listContainer);
  }

  /**
   * Render person card
   */
  renderPersonCard(person) {
    const card = this.createElement('div', { className: 'person-card' });

    // Name
    const name = this.getFullName(person);
    const nameEl = this.createElement('div', { className: 'person-card-name' }, [name]);

    // Details
    const details = this.createElement('div', { className: 'person-card-details' });

    if (person.dateOfBirth) {
      const age = this.calculateAge(person.dateOfBirth);
      const dobEl = this.createElement('div', {}, [`Age: ${age}`]);
      details.appendChild(dobEl);
    }

    if (person.primaryEmail) {
      const emailEl = this.createElement('div', {}, [`Email: ${person.primaryEmail}`]);
      details.appendChild(emailEl);
    }

    if (person.primaryPhone) {
      const phoneEl = this.createElement('div', {}, [`Phone: ${person.primaryPhone}`]);
      details.appendChild(phoneEl);
    }

    const usernameEl = this.createElement('div', {
      className: 'person-card-username'
    }, [`Username: ${person.username}`]);
    details.appendChild(usernameEl);

    // Actions
    const actions = this.createElement('div', { className: 'person-card-actions' });

    const editBtn = this.createElement('button', {
      className: 'btn btn-small btn-secondary',
      onClick: () => this.showEditView(person._id)
    }, ['Edit']);

    const deleteBtn = this.createElement('button', {
      className: 'btn btn-small btn-danger',
      onClick: () => this.deletePerson(person)
    }, ['Delete']);

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    // Assemble card
    card.appendChild(nameEl);
    card.appendChild(details);
    card.appendChild(actions);

    return card;
  }

  /**
   * Render edit view
   */
  renderEditView() {
    const isNew = !this.currentPerson;

    // Header
    const header = this.createElement('div', { className: 'miniapp-header' });
    const title = this.createElement('h2', {}, [isNew ? 'Create Person' : 'Edit Person']);
    const backBtn = this.createElement('button', {
      className: 'btn btn-small',
      onClick: () => this.showListView()
    }, ['← Back to List']);

    header.appendChild(backBtn);
    header.appendChild(title);

    // Form
    const form = this.createElement('form', {
      className: 'person-form',
      onsubmit: (e) => {
        e.preventDefault();
        this.saveCurrentPerson();
      }
    });

    // Identity Section
    const identitySection = this.createFormSection('Identity', [
      this.createFormField('namePrefix', 'Name Prefix', 'text', false, ['Mr.', 'Mrs.', 'Ms.', 'Dr.']),
      this.createFormField('firstName', 'First Name *', 'text', true),
      this.createFormField('middleName', 'Middle Name', 'text', false),
      this.createFormField('lastName', 'Last Name', 'text', false),
      this.createFormField('nameSuffix', 'Name Suffix', 'text', false, ['Jr.', 'Sr.', 'II', 'III']),
      this.createFormField('dateOfBirth', 'Date of Birth', 'date', false),
      this.createFormField('gender', 'Gender', 'select', false, ['', 'M', 'F', 'O'])
    ]);

    // Contact Section
    const contactSection = this.createFormSection('Contact', [
      this.createFormField('primaryPhone', 'Primary Phone', 'tel', false),
      this.createFormField('primaryEmail', 'Primary Email', 'email', false)
    ]);

    // Relations Section
    const relationsSection = this.createFormSection('Relations', [
      this.createPersonSelectField('fatherId', 'Father'),
      this.createPersonSelectField('motherId', 'Mother')
    ]);

    // Credentials Section
    const credentialsSection = this.createFormSection('Credentials', [
      this.createFormField('username', 'Username *', 'text', true),
      this.createFormField('password', isNew ? 'Password *' : 'Password (leave blank to keep)', 'password', isNew),
      this.createFormField('otp', 'OTP (optional)', 'text', false)
    ]);

    // Buttons
    const formActions = this.createElement('div', { className: 'form-actions' });

    this.components.saveBtn = new Button({
      text: isNew ? 'Create Person' : 'Update Person',
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
    form.appendChild(identitySection);
    form.appendChild(contactSection);
    form.appendChild(relationsSection);
    form.appendChild(credentialsSection);
    form.appendChild(formActions);

    // Assemble view
    this.container.appendChild(header);
    this.container.appendChild(form);

    // Populate form if editing
    if (this.currentPerson) {
      this.populateForm(this.currentPerson);
    }
  }

  /**
   * Render login view
   */
  renderLoginView() {
    // Header
    const header = this.createElement('div', { className: 'miniapp-header' });
    const title = this.createElement('h2', {}, ['Login']);
    const backBtn = this.createElement('button', {
      className: 'btn btn-small',
      onClick: () => this.showListView()
    }, ['← Back']);

    header.appendChild(backBtn);
    header.appendChild(title);

    // Login form
    const form = this.createElement('form', {
      className: 'login-form',
      onsubmit: (e) => {
        e.preventDefault();
        this.performLogin();
      }
    });

    const usernameGroup = this.createElement('div', { className: 'form-group' });
    const usernameLabel = this.createElement('label', {}, ['Username']);
    this.components.loginUsername = new Input({
      placeholder: 'Enter username',
      className: 'input',
      type: 'text'
    });
    usernameGroup.appendChild(usernameLabel);
    usernameGroup.appendChild(this.components.loginUsername.create());

    const passwordGroup = this.createElement('div', { className: 'form-group' });
    const passwordLabel = this.createElement('label', {}, ['Password']);
    this.components.loginPassword = new Input({
      placeholder: 'Enter password',
      className: 'input',
      type: 'password'
    });
    passwordGroup.appendChild(passwordLabel);
    passwordGroup.appendChild(this.components.loginPassword.create());

    const otpGroup = this.createElement('div', { className: 'form-group' });
    const otpLabel = this.createElement('label', {}, ['OTP (if enabled)']);
    this.components.loginOtp = new Input({
      placeholder: 'Enter OTP',
      className: 'input',
      type: 'text'
    });
    otpGroup.appendChild(otpLabel);
    otpGroup.appendChild(this.components.loginOtp.create());

    const loginBtn = this.createElement('button', {
      className: 'btn btn-primary btn-block',
      type: 'submit'
    }, ['Login']);

    form.appendChild(usernameGroup);
    form.appendChild(passwordGroup);
    form.appendChild(otpGroup);
    form.appendChild(loginBtn);

    // Assemble
    this.container.appendChild(header);
    this.container.appendChild(form);
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
  createFormField(name, label, type, required, options = null) {
    const group = this.createElement('div', { className: 'form-group' });

    const labelEl = this.createElement('label', { for: `field-${name}` }, [label]);
    group.appendChild(labelEl);

    let input;

    if (type === 'select') {
      input = this.createElement('select', {
        id: `field-${name}`,
        name: name,
        className: 'input',
        required: required
      });

      options.forEach(opt => {
        const option = this.createElement('option', { value: opt }, [opt || '-- Select --']);
        input.appendChild(option);
      });
    } else {
      input = this.createElement('input', {
        id: `field-${name}`,
        name: name,
        type: type,
        className: 'input',
        required: required,
        placeholder: label
      });
    }

    group.appendChild(input);
    return group;
  }

  /**
   * Create person select field for relations
   */
  createPersonSelectField(name, label) {
    const group = this.createElement('div', { className: 'form-group' });

    const labelEl = this.createElement('label', { for: `field-${name}` }, [label]);
    group.appendChild(labelEl);

    const select = this.createElement('select', {
      id: `field-${name}`,
      name: name,
      className: 'input'
    });

    // Empty option
    const emptyOption = this.createElement('option', { value: '' }, ['-- None --']);
    select.appendChild(emptyOption);

    // Add all persons
    this.persons.forEach(person => {
      const option = this.createElement('option', {
        value: person._id
      }, [this.getFullName(person)]);
      select.appendChild(option);
    });

    group.appendChild(select);
    return group;
  }

  /**
   * Populate form with person data
   */
  populateForm(person) {
    const form = this.container.querySelector('.person-form');
    if (!form) return;

    Object.keys(person).forEach(key => {
      const field = form.querySelector(`[name="${key}"]`);
      if (field && key !== '_id' && key !== '_rev' && key !== 'type' && key !== 'hashedPassword') {
        field.value = person[key] || '';
      }
    });
  }

  /**
   * Get form data
   */
  getFormData() {
    const form = this.container.querySelector('.person-form');
    if (!form) return null;

    const formData = new FormData(form);
    const data = {};

    for (let [key, value] of formData.entries()) {
      data[key] = value.trim();
    }

    // Get password separately
    const passwordField = form.querySelector('[name="password"]');
    if (passwordField && passwordField.value) {
      data.password = passwordField.value;
    }

    return data;
  }

  /**
   * Load all persons
   */
  async loadPersons() {
    try {
      const persons = await this.db.query({
        selector: { type: 'person' },
        sort: [{ firstName: 'asc' }]
      });

      this.persons = persons;
      this.logger.debug(`Loaded ${persons.length} persons`);

      if (this.isRendered) {
        this.render();
      }
    } catch (error) {
      this.logger.error('Failed to load persons:', error);
    }
  }

  /**
   * Load single person
   */
  async loadPerson(id) {
    try {
      const person = await this.db.read(id);
      return person;
    } catch (error) {
      this.logger.error('Failed to load person:', error);
      return null;
    }
  }

  /**
   * Save current person
   */
  async saveCurrentPerson() {
    const data = this.getFormData();
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
        person.hashedPassword = this.hashPassword(data.password);
      } else if (this.currentPerson) {
        person.hashedPassword = this.currentPerson.hashedPassword;
      }

      // Save
      if (this.currentPerson) {
        // Update existing
        person._id = this.currentPerson._id;
        person._rev = this.currentPerson._rev;
        await this.db.update(person);
        Notification.success('Person updated successfully');
      } else {
        // Create new
        person._id = `person:${this.generateUUID()}`;
        await this.db.create(person);
        Notification.success('Person created successfully');
      }

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
    if (!confirm(`Delete ${this.getFullName(person)}?`)) {
      return;
    }

    try {
      await this.db.delete(person);
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
    const existingPerson = await this.findPersonByUsername(data.username);

    if (existingPerson && existingPerson._id !== currentPersonId) {
      return { valid: false, error: 'Username already exists' };
    }

    // Password required for new person
    if (!currentPersonId && !data.password) {
      return { valid: false, error: 'Password is required for new person' };
    }

    // Email format
    if (data.primaryEmail && !this.isValidEmail(data.primaryEmail)) {
      return { valid: false, error: 'Invalid email format' };
    }

    return { valid: true };
  }

  /**
   * Find person by username (case-insensitive)
   */
  async findPersonByUsername(username) {
    try {
      const results = await this.db.query({
        selector: {
          type: 'person',
          username: { $regex: new RegExp(`^${username}$`, 'i') }
        },
        limit: 1
      });

      return results.length > 0 ? results[0] : null;
    } catch (error) {
      this.logger.error('Failed to find person by username:', error);
      return null;
    }
  }

  /**
   * Hash password (simple demo implementation)
   * In production, use proper hashing like bcrypt
   */
  hashPassword(plainPassword) {
    // Simple hash for demo - in production use bcrypt or similar
    let hash = 0;
    const salt = 'miniapp-salt-2025';
    const combined = plainPassword + salt;

    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    return `hash_${Math.abs(hash).toString(36)}`;
  }

  /**
   * Authenticate user
   */
  async authenticate(username, password, otp = null) {
    try {
      const person = await this.findPersonByUsername(username);

      if (!person) {
        return { success: false, error: 'Invalid username or password' };
      }

      // Check password
      const hashedInput = this.hashPassword(password);
      if (person.hashedPassword !== hashedInput) {
        // Update failed attempts
        person.failedLoginAttempts = (person.failedLoginAttempts || 0) + 1;
        await this.db.update(person);

        return { success: false, error: 'Invalid username or password' };
      }

      // Check OTP if required
      if (person.otp && person.otp !== otp) {
        return { success: false, error: 'Invalid OTP' };
      }

      // Update login info
      person.lastLoginTimestamp = new Date().toISOString();
      person.failedLoginAttempts = 0;
      await this.db.update(person);

      return { success: true, person };

    } catch (error) {
      this.logger.error('Authentication failed:', error);
      return { success: false, error: 'Authentication failed' };
    }
  }

  /**
   * Perform login
   */
  async performLogin() {
    const username = this.components.loginUsername.getValue().trim();
    const password = this.components.loginPassword.getValue().trim();
    const otp = this.components.loginOtp.getValue().trim();

    if (!username || !password) {
      Notification.error('Username and password are required');
      return;
    }

    const result = await this.authenticate(username, password, otp || null);

    if (result.success) {
      this.currentUser = result.person;
      Notification.success(`Welcome, ${this.getFullName(result.person)}!`);

      // Emit login event
      this.emit('person:login', result.person);

      // Go to list view
      this.showListView();
    } else {
      Notification.error(result.error);
    }
  }

  /**
   * Logout
   */
  logout() {
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
    if (this.isRendered && this.currentView === 'list') {
      this.render();
    }
  }

  /**
   * Show list view
   */
  showListView() {
    this.currentView = 'list';
    this.currentPerson = null;
    this.render();
  }

  /**
   * Show edit view
   */
  async showEditView(personId) {
    if (personId) {
      this.currentPerson = await this.loadPerson(personId);
    } else {
      this.currentPerson = null;
    }

    this.currentView = 'edit';
    this.render();
  }

  /**
   * Show login view
   */
  showLoginView() {
    this.currentView = 'login';
    this.render();
  }

  /**
   * Filter persons by search term
   */
  filterPersons(searchTerm) {
    // Store search term and re-render
    this.searchTerm = searchTerm.toLowerCase();
    if (this.currentView === 'list') {
      this.render();
    }
  }

  /**
   * Get filtered persons
   */
  getFilteredPersons() {
    if (!this.searchTerm) {
      return this.persons;
    }

    return this.persons.filter(person => {
      const fullName = this.getFullName(person).toLowerCase();
      const username = person.username.toLowerCase();
      const email = (person.primaryEmail || '').toLowerCase();

      return fullName.includes(this.searchTerm) ||
             username.includes(this.searchTerm) ||
             email.includes(this.searchTerm);
    });
  }

  /**
   * Get full name
   */
  getFullName(person) {
    const parts = [
      person.namePrefix,
      person.firstName,
      person.middleName,
      person.lastName,
      person.nameSuffix
    ].filter(p => p);

    return parts.join(' ') || 'Unnamed Person';
  }

  /**
   * Calculate age from date of birth
   */
  calculateAge(dob) {
    if (!dob) return null;

    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }

  /**
   * Validate email format
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Generate UUID
   */
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
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
