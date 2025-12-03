/**
 * OrgVacanciesView.js
 * Renders the organization vacancies view (admin view for managing vacancies)
 */

import { VACANCY_STATUS_OPTIONS } from '../constants.js';

export function renderOrgVacanciesView(app) {
  if (!app.defaultOrganization) {
    const message = app.createElement('div', { className: 'info-message' }, [
      'Please set a default organization to manage vacancies.'
    ]);
    app.container.appendChild(message);
    return;
  }

  const header = app.createElement('div', { className: 'miniapp-header' });
  const title = app.createElement('h2', {}, [`Vacancies - ${app.defaultOrganization.name}`]);
  header.appendChild(title);

  const actions = app.createElement('div', { className: 'vacancy-actions' });
  const createBtn = app.createElement('button', {
    className: 'btn btn-primary',
    onclick: () => app.showCreateVacancyView()
  }, ['+ Create Vacancy']);
  actions.appendChild(createBtn);

  // Filters
  const filters = app.createElement('div', { className: 'vacancy-filters' });
  const statusFilter = app.createElement('div', { className: 'filter-group' });
  const statusSelect = app.createElement('select', {
    className: 'input',
    onchange: (e) => {
      app.filterStatus = e.target.value;
      app.render();
    }
  });
  ['all', ...VACANCY_STATUS_OPTIONS].forEach(status => {
    const option = app.createElement('option', {
      value: status,
      selected: app.filterStatus === status
    }, [status.charAt(0).toUpperCase() + status.slice(1)]);
    statusSelect.appendChild(option);
  });
  statusFilter.appendChild(statusSelect);
  filters.appendChild(statusFilter);

  // Vacancy list
  const listContainer = app.createElement('div', { className: 'vacancy-list-container' });

  const filteredVacancies = app.getFilteredOrgVacancies();

  if (filteredVacancies.length === 0) {
    const empty = app.createElement('div', { className: 'empty-state' }, [
      'No vacancies found. Create your first vacancy!'
    ]);
    listContainer.appendChild(empty);
  } else {
    filteredVacancies.forEach(vacancy => {
      listContainer.appendChild(app.renderVacancyCard(vacancy, false));
    });
  }

  app.container.appendChild(header);
  app.container.appendChild(actions);
  app.container.appendChild(filters);
  app.container.appendChild(listContainer);
}
