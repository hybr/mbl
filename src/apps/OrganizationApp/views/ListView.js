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
  // Header with title and user info
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

  // Action buttons section
  const actionsSection = app.createElement('div', { className: 'org-actions-section' });

  if (app.currentUser) {
    // Primary action
    const primaryActions = app.createElement('div', { className: 'org-actions-primary' });
    app.components.createBtn = new Button({
      text: '+ Create Organization',
      className: 'btn btn-primary',
      onClick: () => app.showEditView(null)
    });
    primaryActions.appendChild(app.components.createBtn.create());
    actionsSection.appendChild(primaryActions);

    // Secondary actions
    const secondaryActions = app.createElement('div', { className: 'org-actions-secondary' });

    app.components.readonlyDataBtn = new Button({
      text: 'Readonly Data',
      className: 'btn btn-secondary',
      onClick: () => app.openDataViewer()
    });
    secondaryActions.appendChild(app.components.readonlyDataBtn.create());

    app.components.branchesBtn = new Button({
      text: 'Branches',
      className: 'btn btn-secondary',
      onClick: () => app.openBranchManagement()
    });
    secondaryActions.appendChild(app.components.branchesBtn.create());

    app.components.hiringBtn = new Button({
      text: 'Hiring',
      className: 'btn btn-secondary',
      onClick: () => app.openHiringManagement()
    });
    secondaryActions.appendChild(app.components.hiringBtn.create());

    actionsSection.appendChild(secondaryActions);
  } else {
    const loginMsg = app.createElement('div', {
      className: 'login-message'
    }, ['Please log in to create and manage organizations']);
    actionsSection.appendChild(loginMsg);
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
  app.container.appendChild(actionsSection);
  app.container.appendChild(listContainer);
}
