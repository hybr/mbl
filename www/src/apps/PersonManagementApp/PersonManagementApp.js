/**
 * PersonManagementApp.js - Complete Person Management MiniApp
 * Handles person profiles, credentials, relations, and authentication
 */

import { MiniApp } from '../../core/MiniApp.js';
import { Button } from '../../components/Button.js';
import { Input } from '../../components/Input.js';
import { Notification } from '../../utils/Notification.js';

class PersonManagementApp extends MiniApp {
  constructor(options = {}) {
    super({
      name: 'PersonManagementApp',
      ...options
    });

    this.persons = [];
    this.currentPerson = null;
    this.currentView = 'list'; // 'list', 'edit', 'login', 'signup', 'forgot-password', 'profile'
    this.currentUser = null; // Logged in user
    this.components = {};
    this.resetEmail = '';
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
      localStorage.setItem('personManagementApp_session', JSON.stringify(sessionData));
      this.logger.info('Session saved for user:', this.currentUser.username);
    }
  }

  /**
   * Restore user session from localStorage
   */
  async restoreSession() {
    try {
      const sessionData = localStorage.getItem('personManagementApp_session');

      if (sessionData) {
        const session = JSON.parse(sessionData);
        this.logger.info('Found session for user:', session.username);

        // Load the user from database
        const user = await this.loadPerson(session.userId);

        if (user) {
          this.currentUser = user;
          this.logger.info('Session restored for user:', user.username);

          // Emit login event to update UI (this will update the auth link)
          this.emit('person:login', user);

          // Don't render - let user manually navigate to profile if needed
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
    localStorage.removeItem('personManagementApp_session');
    this.logger.info('Session cleared');
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
      case 'signup':
        this.renderSignupView();
        break;
      case 'forgot-password':
        this.renderForgotPasswordView();
        break;
      case 'profile':
        this.renderProfileView();
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
    // Emit event to close other apps
    this.emit('auth:focus');

    // Add auth-focused class to container
    this.container.classList.add('auth-view');

    // Login card wrapper
    const authWrapper = this.createElement('div', { className: 'auth-wrapper' });
    const authCard = this.createElement('div', { className: 'auth-card' });

    // Header
    const header = this.createElement('div', { className: 'auth-header' });
    const title = this.createElement('h2', { className: 'auth-title' }, ['Welcome Back']);
    const subtitle = this.createElement('p', { className: 'auth-subtitle' }, ['Sign in to your account']);

    header.appendChild(title);
    header.appendChild(subtitle);

    // Login form
    const form = this.createElement('form', {
      className: 'auth-form',
      onsubmit: (e) => {
        e.preventDefault();
        this.performLogin();
      }
    });

    const usernameGroup = this.createElement('div', { className: 'form-group' });
    const usernameLabel = this.createElement('label', { className: 'form-label' }, ['Username']);
    this.components.loginUsername = new Input({
      placeholder: 'Enter your username',
      className: 'input input-auth',
      type: 'text'
    });
    usernameGroup.appendChild(usernameLabel);
    usernameGroup.appendChild(this.components.loginUsername.create());

    const passwordGroup = this.createElement('div', { className: 'form-group' });
    const passwordLabel = this.createElement('label', { className: 'form-label' }, ['Password']);
    this.components.loginPassword = new Input({
      placeholder: 'Enter your password',
      className: 'input input-auth',
      type: 'password'
    });
    passwordGroup.appendChild(passwordLabel);
    passwordGroup.appendChild(this.components.loginPassword.create());

    // Forgot password link
    const forgotLink = this.createElement('div', { className: 'auth-link-container' });
    const forgotBtn = this.createElement('a', {
      href: '#',
      className: 'auth-link-text',
      onclick: (e) => {
        e.preventDefault();
        this.showForgotPasswordView();
      }
    }, ['Forgot password?']);
    forgotLink.appendChild(forgotBtn);

    const loginBtn = this.createElement('button', {
      className: 'btn btn-primary btn-block btn-auth',
      type: 'submit'
    }, ['Sign In']);

    form.appendChild(usernameGroup);
    form.appendChild(passwordGroup);
    form.appendChild(forgotLink);
    form.appendChild(loginBtn);

    // Sign up link
    const signupSection = this.createElement('div', { className: 'auth-footer' });
    const signupText = this.createElement('span', { className: 'auth-footer-text' }, ["Don't have an account? "]);
    const signupLink = this.createElement('a', {
      href: '#',
      className: 'auth-link-primary',
      onclick: (e) => {
        e.preventDefault();
        this.showSignupView();
      }
    }, ['Sign Up']);
    signupSection.appendChild(signupText);
    signupSection.appendChild(signupLink);

    // Assemble
    authCard.appendChild(header);
    authCard.appendChild(form);
    authCard.appendChild(signupSection);
    authWrapper.appendChild(authCard);
    this.container.appendChild(authWrapper);
  }

  /**
   * Render signup view
   */
  renderSignupView() {
    // Emit event to close other apps
    this.emit('auth:focus');

    // Add auth-focused class to container
    this.container.classList.add('auth-view');

    // Signup card wrapper
    const authWrapper = this.createElement('div', { className: 'auth-wrapper' });
    const authCard = this.createElement('div', { className: 'auth-card' });

    // Header
    const header = this.createElement('div', { className: 'auth-header' });
    const title = this.createElement('h2', { className: 'auth-title' }, ['Create Account']);
    const subtitle = this.createElement('p', { className: 'auth-subtitle' }, ['Sign up to get started']);

    header.appendChild(title);
    header.appendChild(subtitle);

    // Signup form
    const form = this.createElement('form', {
      className: 'auth-form',
      onsubmit: (e) => {
        e.preventDefault();
        this.performSignup();
      }
    });

    const firstNameGroup = this.createElement('div', { className: 'form-group' });
    const firstNameLabel = this.createElement('label', { className: 'form-label' }, ['First Name']);
    this.components.signupFirstName = new Input({
      placeholder: 'Enter your first name',
      className: 'input input-auth',
      type: 'text'
    });
    firstNameGroup.appendChild(firstNameLabel);
    firstNameGroup.appendChild(this.components.signupFirstName.create());

    const lastNameGroup = this.createElement('div', { className: 'form-group' });
    const lastNameLabel = this.createElement('label', { className: 'form-label' }, ['Last Name']);
    this.components.signupLastName = new Input({
      placeholder: 'Enter your last name',
      className: 'input input-auth',
      type: 'text'
    });
    lastNameGroup.appendChild(lastNameLabel);
    lastNameGroup.appendChild(this.components.signupLastName.create());

    const emailGroup = this.createElement('div', { className: 'form-group' });
    const emailLabel = this.createElement('label', { className: 'form-label' }, ['Email']);
    this.components.signupEmail = new Input({
      placeholder: 'Enter your email',
      className: 'input input-auth',
      type: 'email'
    });
    emailGroup.appendChild(emailLabel);
    emailGroup.appendChild(this.components.signupEmail.create());

    const usernameGroup = this.createElement('div', { className: 'form-group' });
    const usernameLabel = this.createElement('label', { className: 'form-label' }, ['Username']);
    this.components.signupUsername = new Input({
      placeholder: 'Choose a username',
      className: 'input input-auth',
      type: 'text'
    });
    usernameGroup.appendChild(usernameLabel);
    usernameGroup.appendChild(this.components.signupUsername.create());

    const passwordGroup = this.createElement('div', { className: 'form-group' });
    const passwordLabel = this.createElement('label', { className: 'form-label' }, ['Password']);
    this.components.signupPassword = new Input({
      placeholder: 'Create a password',
      className: 'input input-auth',
      type: 'password'
    });
    passwordGroup.appendChild(passwordLabel);
    passwordGroup.appendChild(this.components.signupPassword.create());

    const confirmPasswordGroup = this.createElement('div', { className: 'form-group' });
    const confirmPasswordLabel = this.createElement('label', { className: 'form-label' }, ['Confirm Password']);
    this.components.signupConfirmPassword = new Input({
      placeholder: 'Confirm your password',
      className: 'input input-auth',
      type: 'password'
    });
    confirmPasswordGroup.appendChild(confirmPasswordLabel);
    confirmPasswordGroup.appendChild(this.components.signupConfirmPassword.create());

    const signupBtn = this.createElement('button', {
      className: 'btn btn-primary btn-block btn-auth',
      type: 'submit'
    }, ['Create Account']);

    form.appendChild(firstNameGroup);
    form.appendChild(lastNameGroup);
    form.appendChild(emailGroup);
    form.appendChild(usernameGroup);
    form.appendChild(passwordGroup);
    form.appendChild(confirmPasswordGroup);
    form.appendChild(signupBtn);

    // Login link
    const loginSection = this.createElement('div', { className: 'auth-footer' });
    const loginText = this.createElement('span', { className: 'auth-footer-text' }, ['Already have an account? ']);
    const loginLink = this.createElement('a', {
      href: '#',
      className: 'auth-link-primary',
      onclick: (e) => {
        e.preventDefault();
        this.showLoginView();
      }
    }, ['Sign In']);
    loginSection.appendChild(loginText);
    loginSection.appendChild(loginLink);

    // Assemble
    authCard.appendChild(header);
    authCard.appendChild(form);
    authCard.appendChild(loginSection);
    authWrapper.appendChild(authCard);
    this.container.appendChild(authWrapper);
  }

  /**
   * Render forgot password view
   */
  renderForgotPasswordView() {
    // Emit event to close other apps
    this.emit('auth:focus');

    // Add auth-focused class to container
    this.container.classList.add('auth-view');

    // Forgot password card wrapper
    const authWrapper = this.createElement('div', { className: 'auth-wrapper' });
    const authCard = this.createElement('div', { className: 'auth-card' });

    // Header
    const header = this.createElement('div', { className: 'auth-header' });
    const title = this.createElement('h2', { className: 'auth-title' }, ['Forgot Password']);
    const subtitle = this.createElement('p', { className: 'auth-subtitle' }, ['Enter your email to reset your password']);

    header.appendChild(title);
    header.appendChild(subtitle);

    // Form
    const form = this.createElement('form', {
      className: 'auth-form',
      onsubmit: (e) => {
        e.preventDefault();
        this.performPasswordReset();
      }
    });

    const emailGroup = this.createElement('div', { className: 'form-group' });
    const emailLabel = this.createElement('label', { className: 'form-label' }, ['Email']);
    this.components.resetEmail = new Input({
      placeholder: 'Enter your email',
      className: 'input input-auth',
      type: 'email'
    });
    emailGroup.appendChild(emailLabel);
    emailGroup.appendChild(this.components.resetEmail.create());

    const resetBtn = this.createElement('button', {
      className: 'btn btn-primary btn-block btn-auth',
      type: 'submit'
    }, ['Send Reset Link']);

    form.appendChild(emailGroup);
    form.appendChild(resetBtn);

    // Back to login link
    const loginSection = this.createElement('div', { className: 'auth-footer' });
    const loginLink = this.createElement('a', {
      href: '#',
      className: 'auth-link-primary',
      onclick: (e) => {
        e.preventDefault();
        this.showLoginView();
      }
    }, ['← Back to Sign In']);
    loginSection.appendChild(loginLink);

    // Assemble
    authCard.appendChild(header);
    authCard.appendChild(form);
    authCard.appendChild(loginSection);
    authWrapper.appendChild(authCard);
    this.container.appendChild(authWrapper);
  }

  /**
   * Render profile view
   */
  renderProfileView() {
    if (!this.currentUser) {
      this.showLoginView();
      return;
    }

    this.container.classList.remove('auth-view');

    // Header
    const header = this.createElement('div', { className: 'profile-header' });
    const backBtn = this.createElement('button', {
      className: 'btn btn-small',
      onClick: () => this.showListView()
    }, ['← Back']);
    header.appendChild(backBtn);

    // Profile card
    const profileCard = this.createElement('div', { className: 'profile-card' });

    // Avatar section
    const avatarSection = this.createElement('div', { className: 'profile-avatar-section' });
    const avatar = this.createElement('div', { className: 'profile-avatar' }, [
      this.currentUser.firstName.charAt(0).toUpperCase() + (this.currentUser.lastName ? this.currentUser.lastName.charAt(0).toUpperCase() : '')
    ]);
    const name = this.createElement('h2', { className: 'profile-name' }, [this.getFullName(this.currentUser)]);
    const username = this.createElement('p', { className: 'profile-username' }, [`@${this.currentUser.username}`]);

    avatarSection.appendChild(avatar);
    avatarSection.appendChild(name);
    avatarSection.appendChild(username);

    // Info section
    const infoSection = this.createElement('div', { className: 'profile-info-section' });

    if (this.currentUser.primaryEmail) {
      const emailRow = this.createElement('div', { className: 'profile-info-row' });
      const emailLabel = this.createElement('span', { className: 'profile-info-label' }, ['Email']);
      const emailValue = this.createElement('span', { className: 'profile-info-value' }, [this.currentUser.primaryEmail]);
      emailRow.appendChild(emailLabel);
      emailRow.appendChild(emailValue);
      infoSection.appendChild(emailRow);
    }

    if (this.currentUser.primaryPhone) {
      const phoneRow = this.createElement('div', { className: 'profile-info-row' });
      const phoneLabel = this.createElement('span', { className: 'profile-info-label' }, ['Phone']);
      const phoneValue = this.createElement('span', { className: 'profile-info-value' }, [this.currentUser.primaryPhone]);
      phoneRow.appendChild(phoneLabel);
      phoneRow.appendChild(phoneValue);
      infoSection.appendChild(phoneRow);
    }

    if (this.currentUser.dateOfBirth) {
      const dobRow = this.createElement('div', { className: 'profile-info-row' });
      const dobLabel = this.createElement('span', { className: 'profile-info-label' }, ['Age']);
      const dobValue = this.createElement('span', { className: 'profile-info-value' }, [this.calculateAge(this.currentUser.dateOfBirth).toString()]);
      dobRow.appendChild(dobLabel);
      dobRow.appendChild(dobValue);
      infoSection.appendChild(dobRow);
    }

    if (this.currentUser.gender) {
      const genderRow = this.createElement('div', { className: 'profile-info-row' });
      const genderLabel = this.createElement('span', { className: 'profile-info-label' }, ['Gender']);
      const genderValue = this.createElement('span', { className: 'profile-info-value' }, [this.currentUser.gender === 'M' ? 'Male' : this.currentUser.gender === 'F' ? 'Female' : 'Other']);
      genderRow.appendChild(genderLabel);
      genderRow.appendChild(genderValue);
      infoSection.appendChild(genderRow);
    }

    // Actions
    const actions = this.createElement('div', { className: 'profile-actions' });

    // Quick access buttons
    const tasksBtn = this.createElement('button', {
      className: 'btn btn-secondary',
      onClick: () => this.openTasksApp()
    }, ['📋 Tasks']);

    const notesBtn = this.createElement('button', {
      className: 'btn btn-secondary',
      onClick: () => this.openNotesApp()
    }, ['📝 Notes']);

    const messagesBtn = this.createElement('button', {
      className: 'btn btn-secondary',
      onClick: () => this.openMessagesApp()
    }, ['✉️ Messages']);

    const editBtn = this.createElement('button', {
      className: 'btn btn-primary',
      onClick: () => this.showEditView(this.currentUser._id)
    }, ['Edit Profile']);

    const logoutBtn = this.createElement('button', {
      className: 'btn btn-secondary',
      onClick: () => this.logout()
    }, ['Logout']);

    const educationBtn = this.createElement('button', {
      className: 'btn btn-secondary',
      onClick: () => this.openEducationApp()
    }, ['🎓 Education']);

    const skillsBtn = this.createElement('button', {
      className: 'btn btn-secondary',
      onClick: () => this.openSkillsApp()
    }, ['🛠️ Skills']);

    const hiringManagementAppBtn = this.createElement('button', {
      className: 'btn btn-secondary',
      onClick: () => this.RecruitmentManagementApp()
    }, ['🛠️ Job Vacancies']);

    actions.appendChild(tasksBtn);
    actions.appendChild(notesBtn);
    actions.appendChild(messagesBtn);
    actions.appendChild(editBtn);
    actions.appendChild(logoutBtn);
    actions.appendChild(educationBtn);
    actions.appendChild(skillsBtn);
    actions.appendChild(hiringManagementAppBtn);

    // Assemble
    profileCard.appendChild(avatarSection);
    profileCard.appendChild(infoSection);
    profileCard.appendChild(actions);

    this.container.appendChild(header);
    this.container.appendChild(profileCard);
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

    // Add all persons with full name and username
    this.persons.forEach(person => {
      const fullName = this.getFullName(person);
      const username = person.username || 'no-username';
      const displayText = `${fullName} (@${username})`;

      const option = this.createElement('option', {
        value: person._id
      }, [displayText]);
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
      const result = await this.db.query({
        selector: { type: 'person' }
      });

      // Sort in JavaScript instead of database
      const persons = result.docs || result;
      persons.sort((a, b) => {
        const nameA = (a.firstName || '').toLowerCase();
        const nameB = (b.firstName || '').toLowerCase();
        return nameA.localeCompare(nameB);
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
      // PouchDB Find doesn't support $regex reliably
      // So we'll query all persons and filter in memory
      const results = await this.db.query({
        selector: {
          type: 'person'
        }
      });

      // Filter by username (case-insensitive)
      const normalizedUsername = username.toLowerCase();
      const found = results.filter(p =>
        p.username && p.username.toLowerCase() === normalizedUsername
      );

      this.logger.debug(`Username check for "${username}":`, {
        totalPersons: results.length,
        found: found.length,
        matches: found.map(p => ({ id: p._id, username: p.username }))
      });

      return found.length > 0 ? found[0] : null;
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

    if (!username || !password) {
      Notification.error('Username and password are required');
      return;
    }

    const result = await this.authenticate(username, password, null);

    if (result.success) {
      this.currentUser = result.person;
      Notification.success(`Welcome, ${this.getFullName(result.person)}!`);

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

    if (!this.isValidEmail(email)) {
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

    if (password.length < 6) {
      Notification.error('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      Notification.error('Passwords do not match');
      return;
    }

    // Check if username exists
    const existingPerson = await this.findPersonByUsername(username);
    if (existingPerson) {
      Notification.error('Username already exists');
      return;
    }

    try {
      // Create new person
      const person = {
        _id: `person:${this.generateUUID()}`,
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
        hashedPassword: this.hashPassword(password),
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

    if (!this.isValidEmail(email)) {
      Notification.error('Invalid email format');
      return;
    }

    try {
      // Find person by email
      const results = await this.db.query({
        selector: {
          type: 'person',
          primaryEmail: email
        },
        limit: 1
      });

      if (results.length === 0) {
        // For security, don't reveal if email exists
        Notification.success('If an account with that email exists, a password reset link has been sent.');
        setTimeout(() => this.showLoginView(), 2000);
        return;
      }

      // In a real app, you would send an email here
      // For demo purposes, we'll just show a success message
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
   * Open HiringManagementApp
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
   * Show signup view
   */
  showSignupView() {
    this.currentView = 'signup';
    this.render();
  }

  /**
   * Show forgot password view
   */
  showForgotPasswordView() {
    this.currentView = 'forgot-password';
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
    this.currentView = 'profile';
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
