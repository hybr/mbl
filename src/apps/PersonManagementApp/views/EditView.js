/**
 * EditView.js
 * Edit view for creating and updating persons
 */

import { Button } from '../../../components/Button.js';
import { NAME_PREFIX_OPTIONS, NAME_SUFFIX_OPTIONS, GENDER_OPTIONS } from '../constants.js';
import { getFullName, populateForm } from '../viewHelpers.js';

/**
 * Create form section
 * @param {Function} createElement - createElement function from app
 * @param {string} title - Section title
 * @param {Array} fields - Array of field elements
 * @returns {HTMLElement} Form section element
 */
function createFormSection(createElement, title, fields) {
  const section = createElement('div', { className: 'form-section' });
  const sectionTitle = createElement('h3', { className: 'form-section-title' }, [title]);
  section.appendChild(sectionTitle);

  fields.forEach(field => section.appendChild(field));

  return section;
}

/**
 * Create form field
 * @param {Function} createElement - createElement function from app
 * @param {string} name - Field name
 * @param {string} label - Field label
 * @param {string} type - Field type
 * @param {boolean} required - Whether field is required
 * @param {Array|null} options - Options for select fields
 * @returns {HTMLElement} Form field element
 */
function createFormField(createElement, name, label, type, required, options = null) {
  const group = createElement('div', { className: 'form-group' });

  const labelEl = createElement('label', { for: `field-${name}` }, [label]);
  group.appendChild(labelEl);

  let input;

  if (type === 'select') {
    input = createElement('select', {
      id: `field-${name}`,
      name: name,
      className: 'input',
      required: required
    });

    options.forEach(opt => {
      const option = createElement('option', { value: opt }, [opt || '-- Select --']);
      input.appendChild(option);
    });
  } else {
    input = createElement('input', {
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
 * @param {Function} createElement - createElement function from app
 * @param {string} name - Field name
 * @param {string} label - Field label
 * @param {Array} persons - Array of all persons
 * @returns {HTMLElement} Person select field element
 */
function createPersonSelectField(createElement, name, label, persons) {
  const group = createElement('div', { className: 'form-group' });

  const labelEl = createElement('label', { for: `field-${name}` }, [label]);
  group.appendChild(labelEl);

  const select = createElement('select', {
    id: `field-${name}`,
    name: name,
    className: 'input'
  });

  // Empty option
  const emptyOption = createElement('option', { value: '' }, ['-- None --']);
  select.appendChild(emptyOption);

  // Add all persons with full name and username
  persons.forEach(person => {
    const fullName = getFullName(person);
    const username = person.username || 'no-username';
    const displayText = `${fullName} (@${username})`;

    const option = createElement('option', {
      value: person._id
    }, [displayText]);
    select.appendChild(option);
  });

  group.appendChild(select);
  return group;
}

/**
 * Render edit view
 * @param {Object} app - App instance with context
 * @returns {void}
 */
export function renderEditView(app) {
  const isNew = !app.currentPerson;

  // Header
  const header = app.createElement('div', { className: 'miniapp-header' });
  const title = app.createElement('h2', {}, [isNew ? 'Create Person' : 'Edit Person']);
  const backBtn = app.createElement('button', {
    className: 'btn btn-small',
    onClick: () => app.showListView()
  }, ['← Back to List']);

  header.appendChild(backBtn);
  header.appendChild(title);

  // Form
  const form = app.createElement('form', {
    className: 'person-form',
    onsubmit: (e) => {
      e.preventDefault();
      app.saveCurrentPerson();
    }
  });

  // Identity Section
  const identitySection = createFormSection(app.createElement.bind(app), 'Identity', [
    createFormField(app.createElement.bind(app), 'namePrefix', 'Name Prefix', 'text', false, NAME_PREFIX_OPTIONS),
    createFormField(app.createElement.bind(app), 'firstName', 'First Name *', 'text', true),
    createFormField(app.createElement.bind(app), 'middleName', 'Middle Name', 'text', false),
    createFormField(app.createElement.bind(app), 'lastName', 'Last Name', 'text', false),
    createFormField(app.createElement.bind(app), 'nameSuffix', 'Name Suffix', 'text', false, NAME_SUFFIX_OPTIONS),
    createFormField(app.createElement.bind(app), 'dateOfBirth', 'Date of Birth', 'date', false),
    createFormField(app.createElement.bind(app), 'gender', 'Gender', 'select', false, GENDER_OPTIONS.map(g => g.value))
  ]);

  // Contact Section
  const contactSection = createFormSection(app.createElement.bind(app), 'Contact', [
    createFormField(app.createElement.bind(app), 'primaryPhone', 'Primary Phone', 'tel', false),
    createFormField(app.createElement.bind(app), 'primaryEmail', 'Primary Email', 'email', false)
  ]);

  // Relations Section
  const relationsSection = createFormSection(app.createElement.bind(app), 'Relations', [
    createPersonSelectField(app.createElement.bind(app), 'fatherId', 'Father', app.persons),
    createPersonSelectField(app.createElement.bind(app), 'motherId', 'Mother', app.persons)
  ]);

  // Credentials Section
  const credentialsSection = createFormSection(app.createElement.bind(app), 'Credentials', [
    createFormField(app.createElement.bind(app), 'username', 'Username *', 'text', true),
    createFormField(app.createElement.bind(app), 'password', isNew ? 'Password *' : 'Password (leave blank to keep)', 'password', isNew),
    createFormField(app.createElement.bind(app), 'otp', 'OTP (optional)', 'text', false)
  ]);

  // Buttons
  const formActions = app.createElement('div', { className: 'form-actions' });

  app.components.saveBtn = new Button({
    text: isNew ? 'Create Person' : 'Update Person',
    className: 'btn btn-primary',
    type: 'submit'
  });

  app.components.cancelBtn = new Button({
    text: 'Cancel',
    className: 'btn btn-secondary',
    onClick: () => app.showListView()
  });

  formActions.appendChild(app.components.saveBtn.create());
  formActions.appendChild(app.components.cancelBtn.create());

  // Assemble form
  form.appendChild(identitySection);
  form.appendChild(contactSection);
  form.appendChild(relationsSection);
  form.appendChild(credentialsSection);
  form.appendChild(formActions);

  // Assemble view
  app.container.appendChild(header);
  app.container.appendChild(form);

  // Populate form if editing
  if (app.currentPerson) {
    populateForm(form, app.currentPerson);
  }
}
