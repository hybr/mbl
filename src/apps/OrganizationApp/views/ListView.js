/**
 * ListView.js
 * List view for displaying all organizations
 */

import { Button } from '../../../components/Button.js';
import { OrganizationCard } from '../../../components/OrganizationCard.js';
import { isDefaultOrganization } from '../viewHelpers.js';

/**
 * Render list view
 * @param {Object} app - App instance with context
 * @returns {void}
 */
export function renderListView(app) {
  // Header
  const header = app.createElement('div', { className: 'miniapp-header' });

  const titleContainer = app.createElement('div', { className: 'header-title-container' });
  const title = app.createElement('h2', {}, ['Organizations']);
  titleContainer.appendChild(title);

  if (app.currentUser) {
    const userInfo = app.createElement('div', {
      className: 'user-info'
    }, [`Managing as: ${app.currentUser.username}`]);
    titleContainer.appendChild(userInfo);
  }

  header.appendChild(titleContainer);

  // Action buttons
  const actions = app.createElement('div', { className: 'org-actions' });

  if (app.currentUser) {
    app.components.createBtn = new Button({
      text: '+ Create Organization',
      className: 'btn btn-primary',
      onClick: () => app.showEditView(null)
    });
    actions.appendChild(app.components.createBtn.create());

    // Add Readonly Data button
    app.components.readonlyDataBtn = new Button({
      text: 'Readonly Data',
      className: 'btn btn-secondary',
      onClick: () => app.openDataViewer()
    });
    actions.appendChild(app.components.readonlyDataBtn.create());

    // Add Branches button
    app.components.branchesBtn = new Button({
      text: 'Branches',
      className: 'btn btn-secondary',
      onClick: () => app.openBranchManagement()
    });
    actions.appendChild(app.components.branchesBtn.create());

    // Add Hiring button
    app.components.hiringBtn = new Button({
      text: 'Hiring',
      className: 'btn btn-secondary',
      onClick: () => app.openHiringManagement()
    });
    actions.appendChild(app.components.hiringBtn.create());

  } else {
    const loginMsg = app.createElement('div', {
      className: 'login-message'
    }, ['Please log in to create and manage organizations']);
    actions.appendChild(loginMsg);
  }

  // Organizations list
  const listContainer = app.createElement('div', { className: 'org-list-container' });

  if (!app.currentUser) {
    const emptyState = app.createElement('div', {
      className: 'empty-state'
    }, ['You must be logged in to view your organizations']);
    listContainer.appendChild(emptyState);
  } else if (app.organizations.length === 0) {
    const emptyState = app.createElement('div', {
      className: 'empty-state'
    }, ['No organizations yet. Create your first organization!']);
    listContainer.appendChild(emptyState);
  } else {
    app.organizations.forEach(org => {
      const orgCard = new OrganizationCard({
        org,
        organizationTypes: app.organizationTypes,
        industries: app.industries,
        isDefault: isDefaultOrganization(org),
        onSetDefault: () => app.setAsDefaultOrganization(org),
        onView: () => app.showViewDetails(org),
        onEdit: () => app.showEditView(org),
        onDelete: () => app.deleteOrganization(org),
        createElement: app.createElement.bind(app)
      });
      listContainer.appendChild(orgCard.render());
    });
  }

  // Assemble UI
  app.container.appendChild(header);
  app.container.appendChild(actions);
  app.container.appendChild(listContainer);
}
