/**
 * ViewDetails.js
 * Detail view for displaying organization information
 */

import { getOrganizationType, getIndustry } from '../viewHelpers.js';

/**
 * Render view details
 * @param {Object} app - App instance with context
 * @returns {void}
 */
export function renderViewDetails(app) {
  if (!app.currentOrganization) {
    app.showListView();
    return;
  }

  const org = app.currentOrganization;

  // Header
  const header = app.createElement('div', { className: 'miniapp-header' });
  const backBtn = app.createElement('button', {
    className: 'btn btn-secondary btn-small',
    onClick: () => app.showListView()
  }, ['← Back']);
  header.appendChild(backBtn);

  // Organization details
  const detailsContainer = app.createElement('div', { className: 'org-details' });

  // Logo
  const logoSection = app.createElement('div', { className: 'org-details-logo-section' });
  if (org.logo) {
    const logo = app.createElement('img', {
      className: 'org-details-logo',
      src: org.logo,
      alt: org.name
    });
    logoSection.appendChild(logo);
  } else {
    const placeholder = app.createElement('div', {
      className: 'org-details-logo-placeholder'
    }, [org.name.charAt(0).toUpperCase()]);
    logoSection.appendChild(placeholder);
  }

  // Name and tagline
  const name = app.createElement('h2', { className: 'org-details-name' }, [org.name]);
  detailsContainer.appendChild(name);

  if (org.tagline) {
    const tagline = app.createElement('div', { className: 'org-details-tagline' }, [org.tagline]);
    detailsContainer.appendChild(tagline);
  }

  // Details grid
  const detailsGrid = app.createElement('div', { className: 'org-details-grid' });

  // Legal Type
  const orgType = getOrganizationType(app.organizationTypes, org.legalTypeId);
  if (orgType) {
    const typeItem = app.createElement('div', { className: 'detail-item' });
    const typeLabel = app.createElement('div', { className: 'detail-label' }, ['Legal Type']);
    const typeValue = app.createElement('div', { className: 'detail-value' }, [
      `${orgType.type_name} (${orgType.abbreviation || orgType.type_code})`
    ]);
    typeItem.appendChild(typeLabel);
    typeItem.appendChild(typeValue);
    detailsGrid.appendChild(typeItem);
  }

  // Industry
  const industry = getIndustry(app.industries, org.industryId);
  if (industry) {
    const industryItem = app.createElement('div', { className: 'detail-item' });
    const industryLabel = app.createElement('div', { className: 'detail-label' }, ['Industry']);
    const industryValue = app.createElement('div', { className: 'detail-value' }, [
      `${industry.icon} ${industry.name}`
    ]);
    industryItem.appendChild(industryLabel);
    industryItem.appendChild(industryValue);
    detailsGrid.appendChild(industryItem);
  }

  // Subdomain
  if (org.subdomain) {
    const subdomainItem = app.createElement('div', { className: 'detail-item' });
    const subdomainLabel = app.createElement('div', { className: 'detail-label' }, ['Subdomain']);
    const subdomainValue = app.createElement('a', {
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
    const websiteItem = app.createElement('div', { className: 'detail-item' });
    const websiteLabel = app.createElement('div', { className: 'detail-label' }, ['Website']);
    const websiteValue = app.createElement('a', {
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
    const phoneItem = app.createElement('div', { className: 'detail-item' });
    const phoneLabel = app.createElement('div', { className: 'detail-label' }, ['Phone']);
    const phoneValue = app.createElement('a', {
      className: 'detail-value detail-link',
      href: `tel:${org.phone}`
    }, [org.phone]);
    phoneItem.appendChild(phoneLabel);
    phoneItem.appendChild(phoneValue);
    detailsGrid.appendChild(phoneItem);
  }

  // Email
  if (org.email) {
    const emailItem = app.createElement('div', { className: 'detail-item' });
    const emailLabel = app.createElement('div', { className: 'detail-label' }, ['Email']);
    const emailValue = app.createElement('a', {
      className: 'detail-value detail-link',
      href: `mailto:${org.email}`
    }, [org.email]);
    emailItem.appendChild(emailLabel);
    emailItem.appendChild(emailValue);
    detailsGrid.appendChild(emailItem);
  }

  // Created date
  const createdItem = app.createElement('div', { className: 'detail-item' });
  const createdLabel = app.createElement('div', { className: 'detail-label' }, ['Created']);
  const createdValue = app.createElement('div', { className: 'detail-value' }, [
    new Date(org.createdAt).toLocaleString()
  ]);
  createdItem.appendChild(createdLabel);
  createdItem.appendChild(createdValue);
  detailsGrid.appendChild(createdItem);

  detailsContainer.appendChild(detailsGrid);

  // Actions
  const actions = app.createElement('div', { className: 'org-details-actions' });

  const editBtn = app.createElement('button', {
    className: 'btn btn-primary',
    onClick: () => app.showEditView(org)
  }, ['Edit Organization']);

  const deleteBtn = app.createElement('button', {
    className: 'btn btn-danger',
    onClick: () => {
      app.deleteOrganization(org);
      app.showListView();
    }
  }, ['Delete Organization']);

  actions.appendChild(editBtn);
  actions.appendChild(deleteBtn);

  // Assemble UI
  app.container.appendChild(header);
  app.container.appendChild(logoSection);
  app.container.appendChild(detailsContainer);
  app.container.appendChild(actions);
}
