/**
 * EditView.js
 * Edit view for creating and updating organizations
 */

import { Button } from '../../../components/Button.js';
import { Input } from '../../../components/Input.js';
import { groupTypesByCountry, groupIndustriesByCategory, sanitizeSubdomainInput } from '../viewHelpers.js';
import { isSubdomainUnique } from '../dataLoaders.js';
import { SUBDOMAIN_CONFIG } from '../constants.js';

/**
 * Render edit view
 * @param {Object} app - App instance with context
 * @returns {void}
 */
export function renderEditView(app) {
  const isEdit = app.currentOrganization !== null;

  // Header
  const header = app.createElement('div', { className: 'miniapp-header' });
  const title = app.createElement('h2', {}, [
    isEdit ? 'Edit Organization' : 'Create Organization'
  ]);
  header.appendChild(title);

  // Form
  const form = app.createElement('form', {
    className: 'org-form',
    onSubmit: (e) => {
      e.preventDefault();
      app.saveOrganization();
    }
  });

  // Organization Name
  const nameGroup = app.createElement('div', { className: 'form-group' });
  const nameLabel = app.createElement('label', {}, ['Organization Name *']);
  app.components.nameInput = new Input({
    placeholder: 'Enter full organization name',
    className: 'input',
    value: app.currentOrganization?.name || ''
  });
  nameGroup.appendChild(nameLabel);
  nameGroup.appendChild(app.components.nameInput.create());

  // Legal Type
  const typeGroup = app.createElement('div', { className: 'form-group' });
  const typeLabel = app.createElement('label', {}, ['Legal Type *']);
  const typeSelect = app.createElement('select', {
    className: 'input',
    id: 'org-type-select'
  });

  // Add default option
  const defaultTypeOption = app.createElement('option', { value: '' }, ['Select Legal Type']);
  typeSelect.appendChild(defaultTypeOption);

  // Group by country
  const typesByCountry = groupTypesByCountry(app.organizationTypes);

  // Add options grouped by country
  Object.keys(typesByCountry).sort().forEach(country => {
    const optgroup = app.createElement('optgroup', { label: country });
    typesByCountry[country].forEach(type => {
      const option = app.createElement('option', {
        value: type.id,
        selected: app.currentOrganization?.legalTypeId === type.id
      }, [`${type.type_name} (${type.abbreviation || type.type_code})`]);
      optgroup.appendChild(option);
    });
    typeSelect.appendChild(optgroup);
  });

  typeGroup.appendChild(typeLabel);
  typeGroup.appendChild(typeSelect);

  // Industry
  const industryGroup = app.createElement('div', { className: 'form-group' });
  const industryLabel = app.createElement('label', {}, ['Industry *']);
  const industrySelect = app.createElement('select', {
    className: 'input',
    id: 'org-industry-select'
  });

  // Add default option
  const defaultIndustryOption = app.createElement('option', { value: '' }, ['Select Industry']);
  industrySelect.appendChild(defaultIndustryOption);

  // Group by category
  const industriesByCategory = groupIndustriesByCategory(app.industries);

  // Add options grouped by category
  Object.keys(industriesByCategory).sort().forEach(category => {
    const optgroup = app.createElement('optgroup', { label: category });
    industriesByCategory[category].forEach(ind => {
      const option = app.createElement('option', {
        value: ind.id,
        selected: app.currentOrganization?.industryId === ind.id
      }, [`${ind.icon} ${ind.name}`]);
      optgroup.appendChild(option);
    });
    industrySelect.appendChild(optgroup);
  });

  industryGroup.appendChild(industryLabel);
  industryGroup.appendChild(industrySelect);

  // Tagline
  const taglineGroup = app.createElement('div', { className: 'form-group' });
  const taglineLabel = app.createElement('label', {}, ['Tagline']);
  app.components.taglineInput = new Input({
    placeholder: 'Short description or slogan',
    className: 'input',
    value: app.currentOrganization?.tagline || ''
  });
  taglineGroup.appendChild(taglineLabel);
  taglineGroup.appendChild(app.components.taglineInput.create());

  // Logo URL
  const logoGroup = app.createElement('div', { className: 'form-group' });
  const logoLabel = app.createElement('label', {}, ['Logo URL']);
  app.components.logoInput = new Input({
    placeholder: 'https://example.com/logo.png',
    className: 'input',
    value: app.currentOrganization?.logo || ''
  });
  logoGroup.appendChild(logoLabel);
  logoGroup.appendChild(app.components.logoInput.create());

  // Subdomain
  const subdomainGroup = app.createElement('div', { className: 'form-group' });
  const subdomainLabel = app.createElement('label', {}, ['Subdomain *']);
  const subdomainWrapper = app.createElement('div', { className: 'subdomain-input-wrapper' });
  app.components.subdomainInput = new Input({
    placeholder: 'mycompany',
    className: 'input subdomain-input',
    value: app.currentOrganization?.subdomain || '',
    onInput: (e) => {
      e.target.value = sanitizeSubdomainInput(e.target.value);
    }
  });
  const subdomainSuffix = app.createElement('span', {
    className: 'subdomain-suffix'
  }, [SUBDOMAIN_CONFIG.SUFFIX]);
  subdomainWrapper.appendChild(app.components.subdomainInput.create());
  subdomainWrapper.appendChild(subdomainSuffix);
  subdomainGroup.appendChild(subdomainLabel);
  subdomainGroup.appendChild(subdomainWrapper);

  const subdomainStatus = app.createElement('span', { className: 'subdomain-status' });
  subdomainWrapper.appendChild(subdomainStatus);

  // Subdomain validation
  let timeout;
  app.components.subdomainInput.element.addEventListener('input', async () => {
    clearTimeout(timeout);
    const value = app.components.subdomainInput.getValue().trim().toLowerCase();

    if (value.length < SUBDOMAIN_CONFIG.MIN_LENGTH) {
      subdomainStatus.textContent = 'Too short';
      subdomainStatus.className = 'subdomain-status error';
      return;
    }
    if (!SUBDOMAIN_CONFIG.PATTERN.test(value)) {
      subdomainStatus.textContent = 'Invalid format';
      subdomainStatus.className = 'subdomain-status error';
      return;
    }

    subdomainStatus.textContent = 'Checking...';
    subdomainStatus.className = 'subdomain-status checking';

    timeout = setTimeout(async () => {
      const isUnique = await isSubdomainUnique(app.db, value, app.currentOrganization?._id, app.logger);
      if (isUnique) {
        subdomainStatus.textContent = 'Available';
        subdomainStatus.className = 'subdomain-status success';
      } else {
        subdomainStatus.textContent = 'Taken';
        subdomainStatus.className = 'subdomain-status error';
      }
    }, 500);
  });

  // Website
  const websiteGroup = app.createElement('div', { className: 'form-group' });
  const websiteLabel = app.createElement('label', {}, ['Website']);
  app.components.websiteInput = new Input({
    placeholder: 'https://www.example.com',
    className: 'input',
    value: app.currentOrganization?.website || ''
  });
  websiteGroup.appendChild(websiteLabel);
  websiteGroup.appendChild(app.components.websiteInput.create());

  // Phone
  const phoneGroup = app.createElement('div', { className: 'form-group' });
  const phoneLabel = app.createElement('label', {}, ['Primary Phone']);
  app.components.phoneInput = new Input({
    placeholder: '+1 (555) 123-4567',
    className: 'input',
    value: app.currentOrganization?.phone || ''
  });
  phoneGroup.appendChild(phoneLabel);
  phoneGroup.appendChild(app.components.phoneInput.create());

  // Email
  const emailGroup = app.createElement('div', { className: 'form-group' });
  const emailLabel = app.createElement('label', {}, ['Primary Email']);
  app.components.emailInput = new Input({
    placeholder: 'contact@example.com',
    className: 'input',
    value: app.currentOrganization?.email || ''
  });
  emailGroup.appendChild(emailLabel);
  emailGroup.appendChild(app.components.emailInput.create());

  // Form buttons
  const formActions = app.createElement('div', { className: 'form-actions' });

  app.components.saveBtn = new Button({
    text: isEdit ? 'Update Organization' : 'Create Organization',
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
  app.container.appendChild(header);
  app.container.appendChild(form);
}
