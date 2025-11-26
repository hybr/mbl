/**
 * PersonManagementMiniApp
 * A complete person management system with offline storage using PouchDB
 * Handles person profiles, credentials, authentication, and parent relations
 */

class PersonManagementMiniApp {
  constructor(options = {}) {
    this.options = {
      container: options.container || '#app',
      dbName: options.dbName || 'persons',
      appManager: options.appManager || null,
      ...options
    };

    this.db = null;
    this.containerElement = null;
    this.currentView = 'list'; // 'list', 'edit', 'login', 'profile'
    this.currentPerson = null;
    this.loggedInUser = null; // Currently logged in user
    this.changeListener = null;
    this.eventHandlers = new Map();

    // Try to restore session from localStorage
    this.restoreSession();
  }

  /**
   * Initialize the MiniApp
   */
  async init() {
    try {
      // Get or create container
      if (typeof this.options.container === 'string') {
        this.containerElement = document.querySelector(this.options.container);
      } else {
        this.containerElement = this.options.container;
      }

      if (!this.containerElement) {
        throw new Error(`Container ${this.options.container} not found`);
      }

      // Initialize PouchDB
      this.db = new PouchDB(this.options.dbName);

      // Create indexes
      await this.createIndexes();

      // Set up change listener
      this.setupChangeListener();

      // Initial render
      await this.render();

      console.log('PersonManagementMiniApp initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize PersonManagementMiniApp:', error);
      throw error;
    }
  }

  /**
   * Create necessary database indexes
   */
  async createIndexes() {
    try {
      // Check if pouchdb-find plugin is available
      if (typeof this.db.createIndex === 'function') {
        await this.db.createIndex({
          index: { fields: ['username'] }
        });
        await this.db.createIndex({
          index: { fields: ['primaryEmail'] }
        });
        await this.db.createIndex({
          index: { fields: ['type'] }
        });
        console.log('Database indexes created successfully');
      } else {
        console.warn('PouchDB find plugin not available. Install pouchdb-find for better performance.');
      }
    } catch (error) {
      console.error('Error creating indexes:', error);
    }
  }

  /**
   * Set up real-time change listener
   */
  setupChangeListener() {
    this.changeListener = this.db.changes({
      since: 'now',
      live: true,
      include_docs: true
    }).on('change', (change) => {
      this.onDataChanged(change);
    }).on('error', (err) => {
      console.error('Change listener error:', err);
    });
  }

  /**
   * Handle database changes
   */
  async onDataChanged(change) {
    console.log('Data changed:', change.id);

    // Refresh current view if needed
    if (this.currentView === 'list') {
      await this.renderPersonList();
    } else if (this.currentView === 'edit' && this.currentPerson && this.currentPerson._id === change.id) {
      // Reload current person if it was changed externally
      if (!change.deleted) {
        this.currentPerson = change.doc;
      }
    }

    // Notify AppManager
    if (this.options.appManager) {
      this.options.appManager.emit('person:changed', change);
    }
  }

  /**
   * Restore session from localStorage
   */
  restoreSession() {
    try {
      const sessionData = localStorage.getItem('personapp_session');
      if (sessionData) {
        const session = JSON.parse(sessionData);
        // Validate session is not expired (24 hours)
        const sessionAge = Date.now() - new Date(session.timestamp).getTime();
        if (sessionAge < 24 * 60 * 60 * 1000) {
          this.loggedInUser = session.user;
        } else {
          localStorage.removeItem('personapp_session');
        }
      }
    } catch (error) {
      console.error('Error restoring session:', error);
      localStorage.removeItem('personapp_session');
    }
  }

  /**
   * Save session to localStorage
   */
  saveSession() {
    if (this.loggedInUser) {
      const sessionData = {
        user: this.loggedInUser,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('personapp_session', JSON.stringify(sessionData));
    }
  }

  /**
   * Clear session
   */
  clearSession() {
    this.loggedInUser = null;
    localStorage.removeItem('personapp_session');
  }

  /**
   * Check if user is logged in
   */
  isLoggedIn() {
    return this.loggedInUser !== null;
  }

  /**
   * Main render method
   */
  async render() {
    this.containerElement.innerHTML = '';
    this.containerElement.className = 'person-miniapp';

    switch (this.currentView) {
      case 'list':
        await this.renderPersonList();
        break;
      case 'edit':
        await this.renderEditForm();
        break;
      case 'login':
        await this.renderLoginForm();
        break;
      case 'profile':
        await this.renderProfileView();
        break;
      default:
        await this.renderPersonList();
    }
  }

  /**
   * Render person list view
   */
  async renderPersonList() {
    const persons = await this.getAllPersons();

    const html = `
      <div class="person-list-view">
        <div class="header">
          <h2>Person Management</h2>
          <div class="header-actions">
            <button class="btn btn-primary" data-action="create">Create Person</button>
            ${this.renderAuthButton()}
          </div>
        </div>

        <div class="person-list">
          ${persons.length === 0 ? '<p class="empty-state">No persons found. Create one to get started.</p>' : ''}
          ${persons.map(person => `
            <div class="person-card" data-id="${person._id}">
              <div class="person-info">
                <h3>${this.getFullName(person)}</h3>
                <p class="person-meta">
                  <span><strong>Username:</strong> ${person.username || 'N/A'}</span>
                  ${person.primaryEmail ? `<span><strong>Email:</strong> ${person.primaryEmail}</span>` : ''}
                  ${person.dateOfBirth ? `<span><strong>DOB:</strong> ${person.dateOfBirth}</span>` : ''}
                </p>
              </div>
              <div class="person-actions">
                <button class="btn btn-small" data-action="edit" data-id="${person._id}">Edit</button>
                <button class="btn btn-small btn-danger" data-action="delete" data-id="${person._id}">Delete</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    this.containerElement.innerHTML = html;
    this.attachListEventHandlers();
  }

  /**
   * Render edit/create form
   */
  async renderEditForm() {
    const isEdit = !!this.currentPerson;
    const person = this.currentPerson || {};
    const allPersons = await this.getAllPersons();

    const html = `
      <div class="person-edit-view">
        <div class="header">
          <h2>${isEdit ? 'Edit Person' : 'Create Person'}</h2>
          <button class="btn btn-secondary" data-action="back">Back to List</button>
        </div>

        <form class="person-form" id="personForm">
          <fieldset>
            <legend>Identity Information</legend>

            <div class="form-row">
              <div class="form-group small">
                <label>Prefix</label>
                <input type="text" name="namePrefix" value="${person.namePrefix || ''}" placeholder="Mr., Mrs., Dr.">
              </div>

              <div class="form-group">
                <label>First Name <span class="required">*</span></label>
                <input type="text" name="firstName" value="${person.firstName || ''}" required>
              </div>

              <div class="form-group">
                <label>Middle Name</label>
                <input type="text" name="middleName" value="${person.middleName || ''}">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Last Name</label>
                <input type="text" name="lastName" value="${person.lastName || ''}">
              </div>

              <div class="form-group small">
                <label>Suffix</label>
                <input type="text" name="nameSuffix" value="${person.nameSuffix || ''}" placeholder="Jr., Sr., III">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Date of Birth</label>
                <input type="date" name="dateOfBirth" value="${person.dateOfBirth || ''}">
              </div>

              <div class="form-group">
                <label>Gender</label>
                <select name="gender">
                  <option value="">Select...</option>
                  <option value="M" ${person.gender === 'M' ? 'selected' : ''}>Male</option>
                  <option value="F" ${person.gender === 'F' ? 'selected' : ''}>Female</option>
                  <option value="O" ${person.gender === 'O' ? 'selected' : ''}>Other</option>
                </select>
              </div>
            </div>
          </fieldset>

          <fieldset>
            <legend>Contact Information</legend>

            <div class="form-row">
              <div class="form-group">
                <label>Primary Phone</label>
                <input type="tel" name="primaryPhone" value="${person.primaryPhone || ''}">
              </div>

              <div class="form-group">
                <label>Primary Email <span class="required">*</span></label>
                <input type="email" name="primaryEmail" value="${person.primaryEmail || ''}" required>
              </div>
            </div>
          </fieldset>

          <fieldset>
            <legend>Relations</legend>

            <div class="form-row">
              <div class="form-group">
                <label>Father</label>
                <select name="fatherId">
                  <option value="">Select father...</option>
                  ${allPersons.filter(p => p._id !== person._id).map(p => `
                    <option value="${p._id}" ${person.fatherId === p._id ? 'selected' : ''}>
                      ${this.getFullName(p)} (${p.username || 'no username'})
                    </option>
                  `).join('')}
                </select>
              </div>

              <div class="form-group">
                <label>Mother</label>
                <select name="motherId">
                  <option value="">Select mother...</option>
                  ${allPersons.filter(p => p._id !== person._id).map(p => `
                    <option value="${p._id}" ${person.motherId === p._id ? 'selected' : ''}>
                      ${this.getFullName(p)} (${p.username || 'no username'})
                    </option>
                  `).join('')}
                </select>
              </div>
            </div>
          </fieldset>

          <fieldset>
            <legend>Credentials</legend>

            <div class="form-row">
              <div class="form-group">
                <label>Username <span class="required">*</span></label>
                <input type="text" name="username" value="${person.username || ''}" required ${isEdit ? 'readonly' : ''}>
                ${isEdit ? '<small>Username cannot be changed after creation</small>' : ''}
              </div>
            </div>

            ${!isEdit ? `
              <div class="form-row">
                <div class="form-group">
                  <label>Password <span class="required">*</span></label>
                  <input type="password" name="password" required>
                </div>

                <div class="form-group">
                  <label>Confirm Password <span class="required">*</span></label>
                  <input type="password" name="confirmPassword" required>
                </div>
              </div>
            ` : `
              <div class="form-row">
                <div class="form-group">
                  <label>Change Password</label>
                  <input type="password" name="password" placeholder="Leave blank to keep current password">
                </div>

                <div class="form-group">
                  <label>Confirm New Password</label>
                  <input type="password" name="confirmPassword">
                </div>
              </div>
            `}
          </fieldset>

          <div class="form-actions">
            <button type="submit" class="btn btn-primary">${isEdit ? 'Update Person' : 'Create Person'}</button>
            <button type="button" class="btn btn-secondary" data-action="back">Cancel</button>
          </div>
        </form>
      </div>
    `;

    this.containerElement.innerHTML = html;
    this.attachFormEventHandlers();
  }

  /**
   * Render login form
   */
  async renderLoginForm() {
    const html = `
      <div class="person-login-view">
        <div class="header">
          <h2>Login</h2>
          <button class="btn btn-secondary" data-action="back">Back to List</button>
        </div>

        <div class="login-container">
          <form class="login-form" id="loginForm">
            <div class="form-group">
              <label>Username <span class="required">*</span></label>
              <input type="text" name="username" required autofocus>
            </div>

            <div class="form-group">
              <label>Password <span class="required">*</span></label>
              <input type="password" name="password" required>
            </div>

            <div class="form-group">
              <label>OTP (if required)</label>
              <input type="text" name="otp" placeholder="Enter OTP if provided">
            </div>

            <div class="form-actions">
              <button type="submit" class="btn btn-primary btn-block">Login</button>
            </div>
          </form>

          <div id="loginMessage" class="message"></div>
        </div>
      </div>
    `;

    this.containerElement.innerHTML = html;
    this.attachLoginEventHandlers();
  }

  /**
   * Render authentication button (Login or My)
   */
  renderAuthButton() {
    if (this.isLoggedIn()) {
      return `<button class="btn btn-user" data-action="profile">My</button>`;
    } else {
      return `<button class="btn btn-secondary" data-action="login">Login</button>`;
    }
  }

  /**
   * Render profile view
   */
  async renderProfileView() {
    if (!this.isLoggedIn()) {
      // Redirect to login if not logged in
      this.currentView = 'login';
      await this.render();
      return;
    }

    const user = this.loggedInUser;
    const fullName = this.getFullName(user);

    const html = `
      <div class="person-profile-view">
        <div class="header">
          <h2>My Profile</h2>
          <button class="btn btn-secondary" data-action="back">Back to List</button>
        </div>

        <div class="profile-container">
          <div class="profile-header">
            <div class="profile-avatar">
              <div class="avatar-circle">
                ${this.getInitials(user)}
              </div>
            </div>
            <div class="profile-info">
              <h3>${fullName}</h3>
              <p class="username">@${user.username}</p>
              <p class="email">${user.primaryEmail}</p>
            </div>
          </div>

          <div class="profile-details">
            <h4>Personal Information</h4>
            <div class="detail-grid">
              ${user.dateOfBirth ? `
                <div class="detail-item">
                  <span class="detail-label">Date of Birth</span>
                  <span class="detail-value">${user.dateOfBirth}</span>
                </div>
              ` : ''}
              ${user.gender ? `
                <div class="detail-item">
                  <span class="detail-label">Gender</span>
                  <span class="detail-value">${this.getGenderLabel(user.gender)}</span>
                </div>
              ` : ''}
              ${user.primaryPhone ? `
                <div class="detail-item">
                  <span class="detail-label">Phone</span>
                  <span class="detail-value">${user.primaryPhone}</span>
                </div>
              ` : ''}
              ${user.credentials?.lastLoginAt ? `
                <div class="detail-item">
                  <span class="detail-label">Last Login</span>
                  <span class="detail-value">${this.formatDate(user.credentials.lastLoginAt)}</span>
                </div>
              ` : ''}
            </div>
          </div>

          <div class="profile-navigation">
            <h4>Quick Actions</h4>
            <div class="nav-buttons">
              <button class="btn btn-nav" data-action="tasks">
                <span class="btn-icon">✓</span>
                <span class="btn-text">Tasks</span>
              </button>
              <button class="btn btn-nav" data-action="notes">
                <span class="btn-icon">📝</span>
                <span class="btn-text">Notes</span>
              </button>
              <button class="btn btn-nav" data-action="settings">
                <span class="btn-icon">⚙</span>
                <span class="btn-text">Settings</span>
              </button>
              <button class="btn btn-nav" data-action="edit-profile">
                <span class="btn-icon">✎</span>
                <span class="btn-text">Edit Profile</span>
              </button>
            </div>
          </div>

          <div class="profile-actions">
            <button class="btn btn-danger btn-block" data-action="logout">Logout</button>
          </div>
        </div>
      </div>
    `;

    this.containerElement.innerHTML = html;
    this.attachProfileEventHandlers();
  }

  /**
   * Get initials from person name
   */
  getInitials(person) {
    const first = person.firstName ? person.firstName.charAt(0).toUpperCase() : '';
    const last = person.lastName ? person.lastName.charAt(0).toUpperCase() : '';
    return first + last || person.username?.charAt(0).toUpperCase() || '?';
  }

  /**
   * Get gender label
   */
  getGenderLabel(gender) {
    const labels = {
      'M': 'Male',
      'F': 'Female',
      'O': 'Other'
    };
    return labels[gender] || gender;
  }

  /**
   * Format date for display
   */
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString();
  }

  /**
   * Attach event handlers for list view
   */
  attachListEventHandlers() {
    const createBtn = this.containerElement.querySelector('[data-action="create"]');
    const loginBtn = this.containerElement.querySelector('[data-action="login"]');
    const profileBtn = this.containerElement.querySelector('[data-action="profile"]');
    const editBtns = this.containerElement.querySelectorAll('[data-action="edit"]');
    const deleteBtns = this.containerElement.querySelectorAll('[data-action="delete"]');

    if (createBtn) {
      createBtn.addEventListener('click', () => this.handleCreate());
    }

    if (loginBtn) {
      loginBtn.addEventListener('click', () => this.handleShowLogin());
    }

    if (profileBtn) {
      profileBtn.addEventListener('click', () => this.handleShowProfile());
    }

    editBtns.forEach(btn => {
      btn.addEventListener('click', (e) => this.handleEdit(e.target.dataset.id));
    });

    deleteBtns.forEach(btn => {
      btn.addEventListener('click', (e) => this.handleDelete(e.target.dataset.id));
    });
  }

  /**
   * Attach event handlers for edit form
   */
  attachFormEventHandlers() {
    const form = this.containerElement.querySelector('#personForm');
    const backBtn = this.containerElement.querySelector('[data-action="back"]');

    if (form) {
      form.addEventListener('submit', (e) => this.handleFormSubmit(e));
    }

    if (backBtn) {
      backBtn.addEventListener('click', () => this.handleBack());
    }
  }

  /**
   * Attach event handlers for login form
   */
  attachLoginEventHandlers() {
    const form = this.containerElement.querySelector('#loginForm');
    const backBtn = this.containerElement.querySelector('[data-action="back"]');

    if (form) {
      form.addEventListener('submit', (e) => this.handleLoginSubmit(e));
    }

    if (backBtn) {
      backBtn.addEventListener('click', () => this.handleBack());
    }
  }

  /**
   * Attach event handlers for profile view
   */
  attachProfileEventHandlers() {
    const backBtn = this.containerElement.querySelector('[data-action="back"]');
    const logoutBtn = this.containerElement.querySelector('[data-action="logout"]');
    const tasksBtn = this.containerElement.querySelector('[data-action="tasks"]');
    const notesBtn = this.containerElement.querySelector('[data-action="notes"]');
    const settingsBtn = this.containerElement.querySelector('[data-action="settings"]');
    const editProfileBtn = this.containerElement.querySelector('[data-action="edit-profile"]');

    if (backBtn) {
      backBtn.addEventListener('click', () => this.handleBack());
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.handleLogout());
    }

    if (tasksBtn) {
      tasksBtn.addEventListener('click', () => this.handleNavigateToTasks());
    }

    if (notesBtn) {
      notesBtn.addEventListener('click', () => this.handleNavigateToNotes());
    }

    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => this.handleNavigateToSettings());
    }

    if (editProfileBtn) {
      editProfileBtn.addEventListener('click', () => this.handleEditProfile());
    }
  }

  /**
   * Handle create person action
   */
  handleCreate() {
    this.currentPerson = null;
    this.currentView = 'edit';
    this.render();
  }

  /**
   * Handle edit person action
   */
  async handleEdit(personId) {
    try {
      this.currentPerson = await this.loadPerson(personId);
      this.currentView = 'edit';
      await this.render();
    } catch (error) {
      alert('Failed to load person: ' + error.message);
    }
  }

  /**
   * Handle delete person action
   */
  async handleDelete(personId) {
    if (!confirm('Are you sure you want to delete this person?')) {
      return;
    }

    try {
      const person = await this.loadPerson(personId);
      await this.db.remove(person);
      await this.render();
    } catch (error) {
      alert('Failed to delete person: ' + error.message);
    }
  }

  /**
   * Handle show login action
   */
  handleShowLogin() {
    this.currentView = 'login';
    this.render();
  }

  /**
   * Handle show profile action
   */
  handleShowProfile() {
    this.currentView = 'profile';
    this.render();
  }

  /**
   * Handle logout action
   */
  async handleLogout() {
    if (!confirm('Are you sure you want to logout?')) {
      return;
    }

    this.clearSession();

    // Notify AppManager
    if (this.options.appManager) {
      this.options.appManager.emit('person:logout', {
        timestamp: new Date().toISOString()
      });
    }

    // Return to list view
    this.currentView = 'list';
    await this.render();

    alert('You have been logged out successfully');
  }

  /**
   * Handle navigate to tasks
   */
  handleNavigateToTasks() {
    // Notify AppManager to switch to tasks miniapp
    if (this.options.appManager) {
      this.options.appManager.emit('navigate:tasks', {
        user: this.loggedInUser
      });
    } else {
      alert('Tasks feature: This would navigate to Tasks MiniApp.\nIntegrate with your Tasks MiniApp.');
    }
  }

  /**
   * Handle navigate to notes
   */
  handleNavigateToNotes() {
    // Notify AppManager to switch to notes miniapp
    if (this.options.appManager) {
      this.options.appManager.emit('navigate:notes', {
        user: this.loggedInUser
      });
    } else {
      alert('Notes feature: This would navigate to Notes MiniApp.\nIntegrate with your Notes MiniApp.');
    }
  }

  /**
   * Handle navigate to settings
   */
  handleNavigateToSettings() {
    // Notify AppManager to switch to settings miniapp
    if (this.options.appManager) {
      this.options.appManager.emit('navigate:settings', {
        user: this.loggedInUser
      });
    } else {
      alert('Settings feature: This would navigate to Settings MiniApp.\nIntegrate with your Settings MiniApp.');
    }
  }

  /**
   * Handle edit profile
   */
  async handleEditProfile() {
    try {
      // Load fresh data from DB
      this.currentPerson = await this.loadPerson(this.loggedInUser._id);
      this.currentView = 'edit';
      await this.render();
    } catch (error) {
      alert('Failed to load profile: ' + error.message);
    }
  }

  /**
   * Handle back to list action
   */
  handleBack() {
    this.currentView = 'list';
    this.currentPerson = null;
    this.render();
  }

  /**
   * Handle form submission
   */
  async handleFormSubmit(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const data = {};

    for (let [key, value] of formData.entries()) {
      data[key] = value.trim();
    }

    // Remove empty strings
    Object.keys(data).forEach(key => {
      if (data[key] === '') {
        data[key] = undefined;
      }
    });

    // Validate passwords match
    if (data.password || data.confirmPassword) {
      if (data.password !== data.confirmPassword) {
        alert('Passwords do not match');
        return;
      }
    }

    try {
      // If editing, merge with current person
      if (this.currentPerson) {
        data._id = this.currentPerson._id;
        data._rev = this.currentPerson._rev;
      }

      // Save person
      const savedPerson = await this.savePerson(data);

      // Show success message
      alert('Person saved successfully!');

      // Return to list
      this.currentView = 'list';
      this.currentPerson = null;
      await this.render();
    } catch (error) {
      alert('Failed to save person: ' + error.message);
    }
  }

  /**
   * Handle login form submission
   */
  async handleLoginSubmit(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const username = formData.get('username').trim();
    const password = formData.get('password').trim();
    const otp = formData.get('otp').trim();

    const messageEl = this.containerElement.querySelector('#loginMessage');

    try {
      const result = await this.authenticate(username, password, otp);

      if (result.success) {
        messageEl.className = 'message success';
        messageEl.textContent = 'Login successful!';

        // Save logged in user and session
        this.loggedInUser = result.person;
        this.saveSession();

        // Notify AppManager
        if (this.options.appManager) {
          this.options.appManager.emit('person:login', {
            person: result.person,
            timestamp: new Date().toISOString()
          });
        }

        // Redirect to list after short delay
        setTimeout(() => {
          this.currentView = 'list';
          this.render();
        }, 1500);
      } else {
        messageEl.className = 'message error';
        messageEl.textContent = result.message || 'Login failed';
      }
    } catch (error) {
      messageEl.className = 'message error';
      messageEl.textContent = 'Login error: ' + error.message;
    }
  }

  /**
   * Load a person by ID
   */
  async loadPerson(id) {
    try {
      const person = await this.db.get(id);
      return person;
    } catch (error) {
      throw new Error('Person not found');
    }
  }

  /**
   * Get all persons from database
   */
  async getAllPersons() {
    try {
      const result = await this.db.allDocs({
        include_docs: true,
        startkey: 'person:',
        endkey: 'person:\ufff0'
      });
      return result.rows.map(row => row.doc);
    } catch (error) {
      console.error('Error getting all persons:', error);
      return [];
    }
  }

  /**
   * Save person to database
   */
  async savePerson(data) {
    // Validate person data
    const validation = await this.validatePerson(data);
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }

    // Prepare person document
    const person = {
      type: 'person',
      namePrefix: data.namePrefix,
      firstName: data.firstName,
      middleName: data.middleName,
      lastName: data.lastName,
      nameSuffix: data.nameSuffix,
      dateOfBirth: data.dateOfBirth,
      gender: data.gender,
      primaryPhone: data.primaryPhone,
      primaryEmail: data.primaryEmail,
      fatherId: data.fatherId,
      motherId: data.motherId,
      username: data.username,
      credentials: {}
    };

    // Handle password
    if (data.password) {
      person.credentials.hashedPassword = await this.hashPassword(data.password);
      person.credentials.passwordUpdatedAt = new Date().toISOString();
    } else if (data._id) {
      // Keep existing password for updates
      const existing = await this.loadPerson(data._id);
      person.credentials = existing.credentials || {};
    }

    // Add metadata
    if (data._id) {
      person._id = data._id;
      person._rev = data._rev;
      person.updatedAt = new Date().toISOString();
    } else {
      person._id = 'person:' + this.generateUUID();
      person.createdAt = new Date().toISOString();
      person.credentials.failedLoginAttempts = 0;
    }

    // Save to database
    const result = await this.db.put(person);
    person._rev = result.rev;

    return person;
  }

  /**
   * Validate person data
   */
  async validatePerson(data) {
    const errors = [];

    // Required fields
    if (!data.firstName || data.firstName.trim() === '') {
      errors.push('First name is required');
    }

    if (!data.primaryEmail || data.primaryEmail.trim() === '') {
      errors.push('Primary email is required');
    }

    if (!data.username || data.username.trim() === '') {
      errors.push('Username is required');
    }

    // Email format validation
    if (data.primaryEmail && !this.isValidEmail(data.primaryEmail)) {
      errors.push('Invalid email format');
    }

    // Username uniqueness check (case-insensitive)
    if (data.username) {
      const isUnique = await this.isUsernameUnique(data.username, data._id);
      if (!isUnique) {
        errors.push('Username already exists');
      }
    }

    // Password validation for new users
    if (!data._id && (!data.password || data.password.trim() === '')) {
      errors.push('Password is required for new users');
    }

    // Gender validation
    if (data.gender && !['M', 'F', 'O'].includes(data.gender)) {
      errors.push('Gender must be M, F, or O');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if username is unique (case-insensitive)
   */
  async isUsernameUnique(username, excludeId = null) {
    try {
      const normalizedUsername = username.toLowerCase();

      // Try using find plugin if available
      if (typeof this.db.find === 'function') {
        const result = await this.db.find({
          selector: {
            username: { $exists: true }
          }
        });

        for (let doc of result.docs) {
          if (doc.username && doc.username.toLowerCase() === normalizedUsername) {
            if (excludeId && doc._id === excludeId) {
              continue; // Skip current person when editing
            }
            return false;
          }
        }
      } else {
        // Fallback: use allDocs to get all persons
        const result = await this.db.allDocs({
          include_docs: true,
          startkey: 'person:',
          endkey: 'person:\ufff0'
        });

        for (let row of result.rows) {
          const doc = row.doc;
          if (doc.username && doc.username.toLowerCase() === normalizedUsername) {
            if (excludeId && doc._id === excludeId) {
              continue; // Skip current person when editing
            }
            return false;
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Error checking username uniqueness:', error);
      return false;
    }
  }

  /**
   * Validate email format
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Hash password (simple demo implementation - use bcrypt in production)
   */
  async hashPassword(plainPassword) {
    // For demo purposes - in production use bcrypt or similar
    // This is a simple SHA-256 hash
    const encoder = new TextEncoder();
    const data = encoder.encode(plainPassword);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }

  /**
   * Authenticate user with username and password
   */
  async authenticate(username, password, otp = null) {
    try {
      // Find person by username (case-insensitive)
      const result = await this.db.find({
        selector: {
          username: { $exists: true }
        }
      });

      const normalizedUsername = username.toLowerCase();
      const person = result.docs.find(doc =>
        doc.username && doc.username.toLowerCase() === normalizedUsername
      );

      if (!person) {
        return {
          success: false,
          message: 'Invalid username or password'
        };
      }

      // Check if account is locked (e.g., too many failed attempts)
      if (person.credentials && person.credentials.failedLoginAttempts >= 5) {
        return {
          success: false,
          message: 'Account locked due to too many failed login attempts'
        };
      }

      // Verify password
      const hashedPassword = await this.hashPassword(password);
      if (!person.credentials || person.credentials.hashedPassword !== hashedPassword) {
        // Increment failed login attempts
        await this.incrementFailedLoginAttempts(person);

        return {
          success: false,
          message: 'Invalid username or password'
        };
      }

      // Check OTP if present
      if (person.credentials.otp) {
        if (!otp || otp !== person.credentials.otp) {
          return {
            success: false,
            message: 'Invalid or missing OTP'
          };
        }
      }

      // Update login audit fields
      await this.updateLoginSuccess(person);

      return {
        success: true,
        person: person,
        message: 'Login successful'
      };
    } catch (error) {
      console.error('Authentication error:', error);
      return {
        success: false,
        message: 'Authentication error occurred'
      };
    }
  }

  /**
   * Increment failed login attempts
   */
  async incrementFailedLoginAttempts(person) {
    try {
      if (!person.credentials) {
        person.credentials = {};
      }

      person.credentials.failedLoginAttempts = (person.credentials.failedLoginAttempts || 0) + 1;
      person.credentials.lastFailedLoginAt = new Date().toISOString();

      await this.db.put(person);
    } catch (error) {
      console.error('Error incrementing failed login attempts:', error);
    }
  }

  /**
   * Update person on successful login
   */
  async updateLoginSuccess(person) {
    try {
      if (!person.credentials) {
        person.credentials = {};
      }

      person.credentials.failedLoginAttempts = 0;
      person.credentials.lastLoginAt = new Date().toISOString();
      person.credentials.otp = null; // Clear OTP after successful login

      await this.db.put(person);
    } catch (error) {
      console.error('Error updating login success:', error);
    }
  }

  /**
   * Get full name from person object
   */
  getFullName(person) {
    const parts = [];

    if (person.namePrefix) parts.push(person.namePrefix);
    if (person.firstName) parts.push(person.firstName);
    if (person.middleName) parts.push(person.middleName);
    if (person.lastName) parts.push(person.lastName);
    if (person.nameSuffix) parts.push(person.nameSuffix);

    return parts.length > 0 ? parts.join(' ') : 'Unnamed Person';
  }

  /**
   * Generate UUID for person IDs
   */
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Destroy the MiniApp and clean up
   */
  destroy() {
    // Stop change listener
    if (this.changeListener) {
      this.changeListener.cancel();
      this.changeListener = null;
    }

    // Clear container
    if (this.containerElement) {
      this.containerElement.innerHTML = '';
    }

    // Clear references
    this.currentPerson = null;
    this.eventHandlers.clear();

    console.log('PersonManagementMiniApp destroyed');
  }
}

// Export for use in modules or global scope
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PersonManagementMiniApp;
}
