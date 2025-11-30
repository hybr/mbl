/**
 * EducationManagementApp.js
 * Manages user's education records including degrees, courses, grades, and documents
 */

import { MiniApp } from '../../core/MiniApp.js';

class EducationManagementApp extends MiniApp {
  constructor(options = {}) {
    super({
      name: 'EducationManagementApp',
      ...options
    });

    // State
    this.educationRecords = [];
    this.currentRecord = null;
    this.currentUser = null;

    // Reference data
    this.educationalSubjects = [];
    this.educationLevels = [];
    this.organizations = [];

    // View state
    this.currentView = 'timeline'; // timeline, edit, view-details, export
    this.searchTerm = '';
    this.filterLevel = 'all';
    this.filterStatus = 'all';
    this.sortBy = 'startDate';

    // Components
    this.components = {};
  }

  /**
   * Initialize the app
   */
  async onInit() {
    try {
      this.logger.info('Initializing EducationManagementApp...');

      // Create database indexes
      await this.createIndexes();

      // Subscribe to data changes
      this.subscribeToData('education_record', (change) => this.handleRecordChange(change));

      // Subscribe to person login/logout
      this.subscribe('person:login', (user) => {
        this.logger.info('User logged in:', user.username);
        this.currentUser = user;
        this.loadEducationRecords();
        if (this.isRendered) {
          this.render();
        }
      });

      this.subscribe('person:logout', () => {
        this.logger.info('User logged out');
        this.currentUser = null;
        this.educationRecords = [];
        if (this.isRendered) {
          this.render();
        }
      });

      // Load current user session
      await this.checkCurrentUser();

      // Load reference data
      await this.loadReferenceData();

      // Load education records if user is logged in
      if (this.currentUser) {
        await this.loadEducationRecords();
      }

      this.logger.info('EducationManagementApp initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize EducationManagementApp:', error);
    }
  }

  /**
   * Create database indexes for efficient queries
   */
  async createIndexes() {
    try {
      // User-scoped filtering
      await this.db.createIndex(['type', 'userId']);
      await this.db.createIndex(['type', 'userId', 'startDate']);

      // Other indexes
      await this.db.createIndex(['type', 'institutionId']);
      await this.db.createIndex(['type', 'educationLevelCode']);
      await this.db.createIndex(['type', 'status']);
      await this.db.createIndex(['type', 'verified']);

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
   * Load reference data from JSON files
   */
  async loadReferenceData() {
    try {
      // Load educational subjects
      const subjectsResponse = await fetch('/data/educational-subjects.json');
      this.educationalSubjects = await subjectsResponse.json();
      this.logger.info(`Loaded ${this.educationalSubjects.length} educational subjects`);

      // Load education levels
      const levelsResponse = await fetch('/data/education-levels.json');
      this.educationLevels = await levelsResponse.json();
      this.logger.info(`Loaded ${this.educationLevels.length} education levels`);

    } catch (error) {
      this.logger.error('Failed to load reference data:', error);
    }
  }

  /**
   * Load education records for current user
   */
  async loadEducationRecords() {
    if (!this.currentUser) {
      this.educationRecords = [];
      return;
    }

    try {
      // Load all education records
      const result = await this.db.query({
        selector: { type: 'education_record' }
      });

      const records = result.docs || result;

      // Filter by current user
      const userRecords = records.filter(record =>
        record.userId === this.currentUser._id
      );

      // Sort by start date (newest first)
      userRecords.sort((a, b) => {
        const dateA = new Date(a.startDate || 0);
        const dateB = new Date(b.startDate || 0);
        return dateB - dateA;
      });

      this.educationRecords = userRecords;
      this.logger.info(`Loaded ${this.educationRecords.length} education records`);

      if (this.isRendered) {
        this.render();
      }
    } catch (error) {
      this.logger.error('Failed to load education records:', error);
      this.showError('Failed to load education records');
    }
  }

  /**
   * Handle real-time record changes
   */
  handleRecordChange(change) {
    if (!this.currentUser) return;

    // Only process changes for current user's records
    if (change.doc && change.doc.userId !== this.currentUser._id) {
      return;
    }

    if (change.deleted) {
      this.educationRecords = this.educationRecords.filter(r => r._id !== change.id);
    } else {
      const index = this.educationRecords.findIndex(r => r._id === change.doc._id);
      if (index >= 0) {
        this.educationRecords[index] = change.doc;
      } else if (change.doc.userId === this.currentUser._id) {
        this.educationRecords.push(change.doc);
      }
    }

    if (this.isRendered && this.currentView === 'timeline') {
      this.render();
    }
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

    switch (this.currentView) {
      case 'timeline':
        this.renderTimelineView();
        break;
      case 'edit':
        this.renderEditForm();
        break;
      case 'view-details':
        this.renderViewDetails();
        break;
      case 'export':
        this.renderExportView();
        break;
      default:
        this.renderTimelineView();
    }
  }

  /**
   * Render login required message
   */
  renderLoginRequired() {
    const container = this.createElement('div', { className: 'login-required' });

    const icon = this.createElement('div', { className: 'login-icon' }, ['🎓']);
    const title = this.createElement('h2', {}, ['Education Management']);
    const message = this.createElement('p', {}, ['Please log in to manage your education records.']);

    const loginBtn = this.createElement('button', {
      className: 'btn btn-primary',
      onclick: () => {
        this.emit('auth:showLogin');
      }
    }, ['Go to Login']);

    container.appendChild(icon);
    container.appendChild(title);
    container.appendChild(message);
    container.appendChild(loginBtn);

    this.container.appendChild(container);
  }

  /**
   * Destroy the app
   */
  async onDestroy() {
    // Clean up components
    Object.values(this.components).forEach(component => {
      if (component.destroy) {
        component.destroy();
      }
    });

    // Reset state
    this.educationRecords = [];
    this.currentRecord = null;
    this.currentUser = null;
    this.components = {};

    this.logger.info('EducationManagementApp destroyed');
  }

  // ==========================================
  // VIEW RENDERING METHODS
  // ==========================================

  /**
   * Render timeline/list view
   */
  renderTimelineView() {
    const header = this.createElement('div', { className: 'education-header' });

    const titleSection = this.createElement('div', { className: 'title-section' });
    const title = this.createElement('h2', {}, ['Education History']);
    const subtitle = this.createElement('p', { className: 'subtitle' },
      [`${this.educationRecords.length} record${this.educationRecords.length !== 1 ? 's' : ''}`]);
    titleSection.appendChild(title);
    titleSection.appendChild(subtitle);

    const actions = this.createElement('div', { className: 'header-actions' });
    const addBtn = this.createElement('button', {
      className: 'btn btn-primary',
      onclick: () => this.showEditForm(null)
    }, ['+ Add Education']);
    actions.appendChild(addBtn);

    header.appendChild(titleSection);
    header.appendChild(actions);
    this.container.appendChild(header);

    // Search and filters
    const filterBar = this.createElement('div', { className: 'filter-bar' });

    const searchBox = this.createElement('input', {
      type: 'text',
      className: 'search-input',
      placeholder: 'Search by institution, degree, or field...',
      value: this.searchTerm,
      oninput: (e) => {
        this.searchTerm = e.target.value;
        this.render();
      }
    });
    filterBar.appendChild(searchBox);

    // Level filter
    const levelFilter = this.createElement('select', {
      className: 'filter-select',
      value: this.filterLevel,
      onchange: (e) => {
        this.filterLevel = e.target.value;
        this.render();
      }
    });

    const allLevelOption = this.createElement('option', { value: 'all' }, ['All Levels']);
    levelFilter.appendChild(allLevelOption);

    this.educationLevels.forEach(level => {
      const option = this.createElement('option', { value: level.code }, [level.name]);
      levelFilter.appendChild(option);
    });
    filterBar.appendChild(levelFilter);

    // Status filter
    const statusFilter = this.createElement('select', {
      className: 'filter-select',
      value: this.filterStatus,
      onchange: (e) => {
        this.filterStatus = e.target.value;
        this.render();
      }
    });

    const statusOptions = [
      { value: 'all', label: 'All Status' },
      { value: 'active', label: 'Active' },
      { value: 'completed', label: 'Completed' },
      { value: 'dropped', label: 'Dropped' },
      { value: 'suspended', label: 'Suspended' }
    ];

    statusOptions.forEach(opt => {
      const option = this.createElement('option', { value: opt.value }, [opt.label]);
      statusFilter.appendChild(option);
    });
    filterBar.appendChild(statusFilter);

    this.container.appendChild(filterBar);

    // Filter records
    let filteredRecords = this.educationRecords.filter(record => {
      const matchesSearch = !this.searchTerm ||
        record.institutionName?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        record.degreeName?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        record.fieldOfStudy?.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchesLevel = this.filterLevel === 'all' || record.educationLevelCode === this.filterLevel;
      const matchesStatus = this.filterStatus === 'all' || record.status === this.filterStatus;

      return matchesSearch && matchesLevel && matchesStatus;
    });

    // Render records
    if (filteredRecords.length === 0) {
      this.renderEmptyState();
    } else {
      const recordsGrid = this.createElement('div', { className: 'records-grid' });
      filteredRecords.forEach(record => {
        const card = this.renderEducationCard(record);
        recordsGrid.appendChild(card);
      });
      this.container.appendChild(recordsGrid);
    }
  }

  /**
   * Render empty state
   */
  renderEmptyState() {
    const emptyState = this.createElement('div', { className: 'empty-state' });

    const icon = this.createElement('div', { className: 'empty-icon' }, ['📚']);
    const message = this.createElement('p', {},
      [this.searchTerm || this.filterLevel !== 'all' || this.filterStatus !== 'all'
        ? 'No education records match your filters.'
        : 'No education records yet. Add your first one!']);

    emptyState.appendChild(icon);
    emptyState.appendChild(message);

    if (!this.searchTerm && this.filterLevel === 'all' && this.filterStatus === 'all') {
      const addBtn = this.createElement('button', {
        className: 'btn btn-primary',
        onclick: () => this.showEditForm(null)
      }, ['+ Add Education']);
      emptyState.appendChild(addBtn);
    }

    this.container.appendChild(emptyState);
  }

  /**
   * Render edit form
   */
  renderEditForm() {
    const isEdit = !!this.currentRecord;
    const formData = this.currentRecord || {};

    const header = this.createElement('div', { className: 'form-header' });
    const title = this.createElement('h2', {}, [isEdit ? 'Edit Education Record' : 'Add Education Record']);
    const backBtn = this.createElement('button', {
      className: 'btn btn-secondary',
      onclick: () => this.showTimelineView()
    }, ['← Back']);
    header.appendChild(backBtn);
    header.appendChild(title);
    this.container.appendChild(header);

    const form = this.createElement('form', {
      className: 'education-form',
      onsubmit: (e) => {
        e.preventDefault();
        this.handleFormSubmit(e);
      }
    });

    // Institution Section
    const institutionSection = this.createElement('div', { className: 'form-section' });
    const institutionTitle = this.createElement('h3', {}, ['Institution Information']);
    institutionSection.appendChild(institutionTitle);

    const institutionNameGroup = this.createFormGroup(
      'Institution Name *',
      'institutionName',
      'text',
      formData.institutionName || '',
      true,
      'e.g., Massachusetts Institute of Technology'
    );
    institutionSection.appendChild(institutionNameGroup);

    const institutionTypeGroup = this.createFormGroup(
      'Institution Type *',
      'institutionType',
      'select',
      formData.institutionType || 'university',
      true,
      null,
      [
        { value: 'university', label: 'University' },
        { value: 'college', label: 'College' },
        { value: 'school', label: 'School' },
        { value: 'online', label: 'Online Institution' },
        { value: 'other', label: 'Other' }
      ]
    );
    institutionSection.appendChild(institutionTypeGroup);

    form.appendChild(institutionSection);

    // Program Details Section
    const programSection = this.createElement('div', { className: 'form-section' });
    const programTitle = this.createElement('h3', {}, ['Program Details']);
    programSection.appendChild(programTitle);

    const levelGroup = this.createFormGroup(
      'Education Level *',
      'educationLevelCode',
      'select',
      formData.educationLevelCode || '',
      true,
      null,
      this.educationLevels.map(l => ({ value: l.code, label: l.name }))
    );
    programSection.appendChild(levelGroup);

    const degreeNameGroup = this.createFormGroup(
      'Degree Name *',
      'degreeName',
      'text',
      formData.degreeName || '',
      true,
      'e.g., Bachelor of Science'
    );
    programSection.appendChild(degreeNameGroup);

    const fieldOfStudyGroup = this.createFormGroup(
      'Field of Study *',
      'fieldOfStudy',
      'text',
      formData.fieldOfStudy || '',
      true,
      'e.g., Computer Science'
    );
    programSection.appendChild(fieldOfStudyGroup);

    const minorGroup = this.createFormGroup(
      'Minor',
      'minor',
      'text',
      formData.minor || '',
      false,
      'e.g., Mathematics'
    );
    programSection.appendChild(minorGroup);

    form.appendChild(programSection);

    // Dates Section
    const datesSection = this.createElement('div', { className: 'form-section' });
    const datesTitle = this.createElement('h3', {}, ['Dates']);
    datesSection.appendChild(datesTitle);

    const startDateGroup = this.createFormGroup(
      'Start Date *',
      'startDate',
      'date',
      formData.startDate ? formData.startDate.split('T')[0] : '',
      true
    );
    datesSection.appendChild(startDateGroup);

    const currentlyEnrolledGroup = this.createElement('div', { className: 'form-group' });
    const enrolledCheckbox = this.createElement('input', {
      type: 'checkbox',
      id: 'isCurrentlyEnrolled',
      name: 'isCurrentlyEnrolled',
      checked: formData.isCurrentlyEnrolled || false,
      onchange: (e) => {
        const endDateInput = form.querySelector('[name="endDate"]');
        const graduationDateInput = form.querySelector('[name="graduationDate"]');
        if (e.target.checked) {
          endDateInput.disabled = true;
          endDateInput.value = '';
          graduationDateInput.disabled = true;
          graduationDateInput.value = '';
        } else {
          endDateInput.disabled = false;
          graduationDateInput.disabled = false;
        }
      }
    });
    const enrolledLabel = this.createElement('label', { htmlFor: 'isCurrentlyEnrolled' },
      ['Currently Enrolled']);
    currentlyEnrolledGroup.appendChild(enrolledCheckbox);
    currentlyEnrolledGroup.appendChild(enrolledLabel);
    datesSection.appendChild(currentlyEnrolledGroup);

    const endDateGroup = this.createFormGroup(
      'End Date',
      'endDate',
      'date',
      formData.endDate ? formData.endDate.split('T')[0] : '',
      false
    );
    datesSection.appendChild(endDateGroup);

    const graduationDateGroup = this.createFormGroup(
      'Graduation Date',
      'graduationDate',
      'date',
      formData.graduationDate ? formData.graduationDate.split('T')[0] : '',
      false
    );
    datesSection.appendChild(graduationDateGroup);

    form.appendChild(datesSection);

    // Academic Performance Section
    const performanceSection = this.createElement('div', { className: 'form-section' });
    const performanceTitle = this.createElement('h3', {}, ['Academic Performance']);
    performanceSection.appendChild(performanceTitle);

    const statusGroup = this.createFormGroup(
      'Status *',
      'status',
      'select',
      formData.status || 'active',
      true,
      null,
      [
        { value: 'active', label: 'Active' },
        { value: 'completed', label: 'Completed' },
        { value: 'dropped', label: 'Dropped' },
        { value: 'suspended', label: 'Suspended' }
      ]
    );
    performanceSection.appendChild(statusGroup);

    const gpaGroup = this.createFormGroup(
      'GPA',
      'gpa',
      'number',
      formData.gpa || '',
      false,
      '0.00',
      null,
      { step: '0.01', min: '0', max: '10' }
    );
    performanceSection.appendChild(gpaGroup);

    const gpaScaleGroup = this.createFormGroup(
      'GPA Scale',
      'gpaScale',
      'number',
      formData.gpaScale || '4.0',
      false,
      '4.0',
      null,
      { step: '0.1', min: '0', max: '100' }
    );
    performanceSection.appendChild(gpaScaleGroup);

    const finalGradeGroup = this.createFormGroup(
      'Final Grade',
      'finalGrade',
      'text',
      formData.finalGrade || '',
      false,
      'e.g., First Class Honours'
    );
    performanceSection.appendChild(finalGradeGroup);

    form.appendChild(performanceSection);

    // Notes Section
    const notesSection = this.createElement('div', { className: 'form-section' });
    const notesTitle = this.createElement('h3', {}, ['Additional Information']);
    notesSection.appendChild(notesTitle);

    const descriptionGroup = this.createFormGroup(
      'Description',
      'description',
      'textarea',
      formData.description || '',
      false,
      'Describe your program focus, achievements, etc.'
    );
    notesSection.appendChild(descriptionGroup);

    const notesGroup = this.createFormGroup(
      'Private Notes',
      'notes',
      'textarea',
      formData.notes || '',
      false,
      'Private notes (only visible to you)'
    );
    notesSection.appendChild(notesGroup);

    form.appendChild(notesSection);

    // Form Actions
    const formActions = this.createElement('div', { className: 'form-actions' });

    const saveBtn = this.createElement('button', {
      type: 'submit',
      className: 'btn btn-primary'
    }, [isEdit ? 'Update Record' : 'Create Record']);

    const cancelBtn = this.createElement('button', {
      type: 'button',
      className: 'btn btn-secondary',
      onclick: () => this.showTimelineView()
    }, ['Cancel']);

    formActions.appendChild(saveBtn);
    formActions.appendChild(cancelBtn);
    form.appendChild(formActions);

    this.container.appendChild(form);
  }

  /**
   * Create form group
   */
  createFormGroup(label, name, type, value, required, placeholder, options, attrs) {
    const group = this.createElement('div', { className: 'form-group' });

    const labelEl = this.createElement('label', { htmlFor: name }, [label]);
    group.appendChild(labelEl);

    let input;

    if (type === 'select') {
      input = this.createElement('select', {
        id: name,
        name: name,
        required: required
      });

      if (options) {
        if (!required) {
          const emptyOption = this.createElement('option', { value: '' }, ['-- Select --']);
          input.appendChild(emptyOption);
        }
        options.forEach(opt => {
          const option = this.createElement('option', {
            value: opt.value,
            selected: value === opt.value
          }, [opt.label]);
          input.appendChild(option);
        });
      }
    } else if (type === 'textarea') {
      input = this.createElement('textarea', {
        id: name,
        name: name,
        required: required,
        placeholder: placeholder || '',
        rows: 4
      });
      input.value = value;
    } else {
      const inputAttrs = {
        type: type,
        id: name,
        name: name,
        value: value,
        required: required,
        placeholder: placeholder || '',
        ...attrs
      };
      input = this.createElement('input', inputAttrs);
    }

    group.appendChild(input);
    return group;
  }

  /**
   * Handle form submission
   */
  async handleFormSubmit(event) {
    const form = event.target;
    const formData = new FormData(form);
    const data = {};

    for (const [key, value] of formData.entries()) {
      if (value !== '') {
        data[key] = value;
      }
    }

    // Convert checkbox
    data.isCurrentlyEnrolled = form.querySelector('[name="isCurrentlyEnrolled"]').checked;

    // Convert numbers
    if (data.gpa) data.gpa = parseFloat(data.gpa);
    if (data.gpaScale) data.gpaScale = parseFloat(data.gpaScale);

    // Add education level details
    if (data.educationLevelCode) {
      const level = this.educationLevels.find(l => l.code === data.educationLevelCode);
      if (level) {
        data.educationLevelId = level.id;
        data.educationLevelName = level.name;
      }
    }

    // If editing, preserve _id and other fields
    if (this.currentRecord) {
      data._id = this.currentRecord._id;
      data._rev = this.currentRecord._rev;
      data.subjects = this.currentRecord.subjects || [];
      data.documents = this.currentRecord.documents || [];
      data.honors = this.currentRecord.honors || [];
      data.awards = this.currentRecord.awards || [];
    }

    try {
      await this.saveEducationRecord(data);
    } catch (error) {
      // Error already handled in saveEducationRecord
    }
  }

  /**
   * Render view details
   */
  renderViewDetails() {
    if (!this.currentRecord) {
      this.showTimelineView();
      return;
    }

    const record = this.currentRecord;

    const header = this.createElement('div', { className: 'details-header' });
    const backBtn = this.createElement('button', {
      className: 'btn btn-secondary',
      onclick: () => this.showTimelineView()
    }, ['← Back']);
    const title = this.createElement('h2', {}, [record.institutionName || 'Education Details']);
    header.appendChild(backBtn);
    header.appendChild(title);
    this.container.appendChild(header);

    const details = this.createElement('div', { className: 'details-container' });

    // Institution Section
    const institutionSection = this.createElement('div', { className: 'details-section' });
    const institutionTitle = this.createElement('h3', {}, ['Institution']);
    institutionSection.appendChild(institutionTitle);

    this.addDetailRow(institutionSection, 'Name', record.institutionName);
    this.addDetailRow(institutionSection, 'Type', this.capitalize(record.institutionType));
    details.appendChild(institutionSection);

    // Program Section
    const programSection = this.createElement('div', { className: 'details-section' });
    const programTitle = this.createElement('h3', {}, ['Program']);
    programSection.appendChild(programTitle);

    this.addDetailRow(programSection, 'Education Level', this.getEducationLevelName(record.educationLevelCode));
    this.addDetailRow(programSection, 'Degree', record.degreeName);
    this.addDetailRow(programSection, 'Field of Study', record.fieldOfStudy);
    if (record.minor) this.addDetailRow(programSection, 'Minor', record.minor);
    details.appendChild(programSection);

    // Dates Section
    const datesSection = this.createElement('div', { className: 'details-section' });
    const datesTitle = this.createElement('h3', {}, ['Duration']);
    datesSection.appendChild(datesTitle);

    this.addDetailRow(datesSection, 'Start Date', this.formatDate(record.startDate));
    this.addDetailRow(datesSection, 'End Date',
      record.isCurrentlyEnrolled ? 'Present (Currently Enrolled)' : this.formatDate(record.endDate));
    if (record.graduationDate) {
      this.addDetailRow(datesSection, 'Graduation Date', this.formatDate(record.graduationDate));
    }
    this.addDetailRow(datesSection, 'Duration', this.calculateDuration(record.startDate, record.endDate));
    this.addDetailRow(datesSection, 'Status', this.capitalize(record.status));
    details.appendChild(datesSection);

    // Performance Section
    if (record.gpa || record.finalGrade) {
      const performanceSection = this.createElement('div', { className: 'details-section' });
      const performanceTitle = this.createElement('h3', {}, ['Academic Performance']);
      performanceSection.appendChild(performanceTitle);

      if (record.gpa) {
        this.addDetailRow(performanceSection, 'GPA',
          `${record.gpa}${record.gpaScale ? '/' + record.gpaScale : ''}`);
      }
      if (record.finalGrade) {
        this.addDetailRow(performanceSection, 'Final Grade', record.finalGrade);
      }
      if (record.classRank && record.classSizeTotal) {
        this.addDetailRow(performanceSection, 'Class Rank', `${record.classRank} of ${record.classSizeTotal}`);
      }
      details.appendChild(performanceSection);
    }

    // Subjects Section
    if (record.subjects && record.subjects.length > 0) {
      const subjectsSection = this.createElement('div', { className: 'details-section' });
      const subjectsTitle = this.createElement('h3', {}, [`Subjects (${record.subjects.length})`]);
      subjectsSection.appendChild(subjectsTitle);

      const subjectsList = this.createElement('ul', { className: 'subjects-list' });
      record.subjects.forEach(subject => {
        const item = this.createElement('li', {}, [
          `${subject.courseName || subject.subjectName}${subject.grade ? ` - Grade: ${subject.grade}` : ''}`
        ]);
        subjectsList.appendChild(item);
      });
      subjectsSection.appendChild(subjectsList);
      details.appendChild(subjectsSection);
    }

    // Description
    if (record.description) {
      const descSection = this.createElement('div', { className: 'details-section' });
      const descTitle = this.createElement('h3', {}, ['Description']);
      descSection.appendChild(descTitle);
      const descText = this.createElement('p', {}, [record.description]);
      descSection.appendChild(descText);
      details.appendChild(descSection);
    }

    // Notes
    if (record.notes) {
      const notesSection = this.createElement('div', { className: 'details-section' });
      const notesTitle = this.createElement('h3', {}, ['Private Notes']);
      notesSection.appendChild(notesTitle);
      const notesText = this.createElement('p', {}, [record.notes]);
      notesSection.appendChild(notesText);
      details.appendChild(notesSection);
    }

    this.container.appendChild(details);

    // Actions
    const actions = this.createElement('div', { className: 'details-actions' });

    const editBtn = this.createElement('button', {
      className: 'btn btn-primary',
      onclick: () => this.showEditForm(record._id)
    }, ['Edit']);

    const deleteBtn = this.createElement('button', {
      className: 'btn btn-danger',
      onclick: () => this.confirmDelete(record)
    }, ['Delete']);

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    this.container.appendChild(actions);
  }

  /**
   * Add detail row
   */
  addDetailRow(container, label, value) {
    if (!value) return;

    const row = this.createElement('div', { className: 'detail-row' });
    const labelEl = this.createElement('span', { className: 'detail-label' }, [label + ':']);
    const valueEl = this.createElement('span', { className: 'detail-value' }, [value]);

    row.appendChild(labelEl);
    row.appendChild(valueEl);
    container.appendChild(row);
  }

  /**
   * Render export view
   */
  renderExportView() {
    const header = this.createElement('div', { className: 'export-header' });
    const backBtn = this.createElement('button', {
      className: 'btn btn-secondary',
      onclick: () => this.showTimelineView()
    }, ['← Back']);
    const title = this.createElement('h2', {}, ['Export Education Records']);
    header.appendChild(backBtn);
    header.appendChild(title);
    this.container.appendChild(header);

    const exportOptions = this.createElement('div', { className: 'export-options' });

    const jsonBtn = this.createElement('button', {
      className: 'btn btn-primary export-btn',
      onclick: () => this.exportToJSON()
    }, ['📄 Export as JSON']);

    const textBtn = this.createElement('button', {
      className: 'btn btn-primary export-btn',
      onclick: () => this.exportToText()
    }, ['📝 Export as Text']);

    exportOptions.appendChild(jsonBtn);
    exportOptions.appendChild(textBtn);
    this.container.appendChild(exportOptions);
  }

  /**
   * Export to JSON
   */
  exportToJSON() {
    try {
      const data = JSON.stringify(this.educationRecords, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `education-records-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      this.showSuccess('Education records exported successfully');
    } catch (error) {
      this.logger.error('Failed to export to JSON:', error);
      this.showError('Failed to export records');
    }
  }

  /**
   * Export to text
   */
  exportToText() {
    try {
      let text = 'EDUCATION HISTORY\n';
      text += '='.repeat(50) + '\n\n';

      this.educationRecords.forEach((record, index) => {
        text += `${index + 1}. ${record.institutionName}\n`;
        text += `   ${record.degreeName} - ${record.fieldOfStudy}\n`;
        text += `   ${this.getEducationLevelName(record.educationLevelCode)}\n`;
        text += `   ${this.formatDate(record.startDate)} - ${record.isCurrentlyEnrolled ? 'Present' : this.formatDate(record.endDate)}\n`;
        if (record.gpa) {
          text += `   GPA: ${record.gpa}${record.gpaScale ? '/' + record.gpaScale : ''}\n`;
        }
        text += '\n';
      });

      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `education-history-${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      this.showSuccess('Education history exported successfully');
    } catch (error) {
      this.logger.error('Failed to export to text:', error);
      this.showError('Failed to export records');
    }
  }

  /**
   * Render individual education card
   */
  renderEducationCard(record) {
    const card = this.createElement('div', { className: 'education-card' });

    // Header with institution
    const cardHeader = this.createElement('div', { className: 'card-header' });
    const institutionName = this.createElement('h3', {}, [record.institutionName || 'Unknown Institution']);
    const statusBadge = this.createElement('span', {
      className: `status-badge status-${record.status}`
    }, [this.capitalize(record.status || 'unknown')]);

    cardHeader.appendChild(institutionName);
    cardHeader.appendChild(statusBadge);
    card.appendChild(cardHeader);

    // Degree and field
    const degreeSection = this.createElement('div', { className: 'card-section' });
    const degreeName = this.createElement('div', { className: 'degree-name' },
      [record.degreeName || 'Degree']);
    const fieldOfStudy = this.createElement('div', { className: 'field-of-study' },
      [record.fieldOfStudy || '']);
    const levelBadge = this.createElement('div', { className: 'level-badge' },
      [this.getEducationLevelName(record.educationLevelCode)]);

    degreeSection.appendChild(degreeName);
    if (record.fieldOfStudy) degreeSection.appendChild(fieldOfStudy);
    degreeSection.appendChild(levelBadge);
    card.appendChild(degreeSection);

    // Dates
    const dateSection = this.createElement('div', { className: 'card-section date-section' });
    const startDate = this.createElement('span', {}, [this.formatDate(record.startDate)]);
    const separator = this.createElement('span', {}, [' - ']);
    const endDate = this.createElement('span', {},
      [record.isCurrentlyEnrolled ? 'Present' : this.formatDate(record.endDate)]);
    const duration = this.createElement('span', { className: 'duration' },
      [` (${this.calculateDuration(record.startDate, record.endDate)})`]);

    dateSection.appendChild(startDate);
    dateSection.appendChild(separator);
    dateSection.appendChild(endDate);
    dateSection.appendChild(duration);
    card.appendChild(dateSection);

    // GPA if available
    if (record.gpa) {
      const gpaSection = this.createElement('div', { className: 'card-section gpa-section' });
      const gpaLabel = this.createElement('span', { className: 'label' }, ['GPA: ']);
      const gpaValue = this.createElement('span', { className: 'value' },
        [`${record.gpa}${record.gpaScale ? '/' + record.gpaScale : ''}`]);
      gpaSection.appendChild(gpaLabel);
      gpaSection.appendChild(gpaValue);
      card.appendChild(gpaSection);
    }

    // Subjects count
    if (record.subjects && record.subjects.length > 0) {
      const subjectsInfo = this.createElement('div', { className: 'card-section subjects-info' },
        [`${record.subjects.length} subject${record.subjects.length !== 1 ? 's' : ''}`]);
      card.appendChild(subjectsInfo);
    }

    // Actions
    const cardActions = this.createElement('div', { className: 'card-actions' });

    const viewBtn = this.createElement('button', {
      className: 'btn btn-secondary btn-sm',
      onclick: () => this.showViewDetails(record._id)
    }, ['View']);

    const editBtn = this.createElement('button', {
      className: 'btn btn-secondary btn-sm',
      onclick: () => this.showEditForm(record._id)
    }, ['Edit']);

    const deleteBtn = this.createElement('button', {
      className: 'btn btn-danger btn-sm',
      onclick: () => this.confirmDelete(record)
    }, ['Delete']);

    cardActions.appendChild(viewBtn);
    cardActions.appendChild(editBtn);
    cardActions.appendChild(deleteBtn);
    card.appendChild(cardActions);

    return card;
  }

  // ==========================================
  // NAVIGATION METHODS
  // ==========================================

  /**
   * Show edit form
   */
  showEditForm(recordId) {
    if (recordId) {
      this.currentRecord = this.educationRecords.find(r => r._id === recordId);
    } else {
      this.currentRecord = null;
    }
    this.currentView = 'edit';
    this.render();
  }

  /**
   * Show view details
   */
  showViewDetails(recordId) {
    this.currentRecord = this.educationRecords.find(r => r._id === recordId);
    this.currentView = 'view-details';
    this.render();
  }

  /**
   * Show timeline view
   */
  showTimelineView() {
    this.currentView = 'timeline';
    this.currentRecord = null;
    this.render();
  }

  /**
   * Show export view
   */
  showExportView() {
    this.currentView = 'export';
    this.render();
  }

  // ==========================================
  // CRUD OPERATIONS
  // ==========================================

  /**
   * Confirm delete operation
   */
  async confirmDelete(record) {
    const confirmed = confirm(
      `Are you sure you want to delete the education record:\n"${record.degreeName}" from ${record.institutionName}?\n\nThis action cannot be undone.`
    );

    if (confirmed) {
      await this.deleteEducationRecord(record._id);
    }
  }

  /**
   * Delete education record
   */
  async deleteEducationRecord(recordId) {
    try {
      const record = this.educationRecords.find(r => r._id === recordId);
      if (!record) {
        throw new Error('Record not found');
      }

      await this.db.delete(record);

      this.showSuccess('Education record deleted successfully');
      this.emit('education:deleted', record);

      // Reload records
      await this.loadEducationRecords();

    } catch (error) {
      this.logger.error('Failed to delete education record:', error);
      this.showError('Failed to delete education record');
    }
  }

  /**
   * Save education record (create or update)
   */
  async saveEducationRecord(data) {
    try {
      const isUpdate = !!data._id;

      if (isUpdate) {
        // Update existing record
        const existing = this.educationRecords.find(r => r._id === data._id);
        if (!existing) {
          throw new Error('Record not found');
        }

        const updated = {
          ...existing,
          ...data,
          updatedAt: new Date().toISOString()
        };

        await this.db.put(updated);
        this.showSuccess('Education record updated successfully');
        this.emit('education:updated', updated);

      } else {
        // Create new record
        const newRecord = {
          _id: `education_record:${this.generateUUID()}`,
          type: 'education_record',
          userId: this.currentUser._id,
          userName: this.currentUser.fullName || this.currentUser.username,
          ...data,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: this.currentUser._id
        };

        await this.db.put(newRecord);
        this.showSuccess('Education record created successfully');
        this.emit('education:created', newRecord);
      }

      // Reload records and return to timeline
      await this.loadEducationRecords();
      this.showTimelineView();

    } catch (error) {
      this.logger.error('Failed to save education record:', error);
      this.showError('Failed to save education record');
      throw error;
    }
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  /**
   * Generate UUID for IDs
   */
  generateUUID() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Format date for display
   */
  formatDate(dateString) {
    if (!dateString) return 'Present';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long'
    });
  }

  /**
   * Calculate duration between dates
   */
  calculateDuration(startDate, endDate) {
    if (!startDate) return '';
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();

    const months = (end.getFullYear() - start.getFullYear()) * 12 +
                   (end.getMonth() - start.getMonth());

    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;

    if (years > 0 && remainingMonths > 0) {
      return `${years} year${years > 1 ? 's' : ''} ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
    } else if (years > 0) {
      return `${years} year${years > 1 ? 's' : ''}`;
    } else {
      return `${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
    }
  }

  /**
   * Get education level name from code
   */
  getEducationLevelName(code) {
    const level = this.educationLevels.find(l => l.code === code);
    return level ? level.name : code;
  }

  /**
   * Get subject name from code
   */
  getSubjectName(code) {
    const subject = this.educationalSubjects.find(s => s.code === code);
    return subject ? subject.name : code;
  }

  /**
   * Capitalize string
   */
  capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Show success message
   */
  showSuccess(message) {
    if (window.messageService) {
      window.messageService.sendToast(message, 'success');
    } else {
      console.log('[SUCCESS]', message);
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    if (window.messageService) {
      window.messageService.sendToast(message, 'error');
    } else {
      console.error('[ERROR]', message);
      alert(`Error: ${message}`);
    }
  }
}

export { EducationManagementApp };
