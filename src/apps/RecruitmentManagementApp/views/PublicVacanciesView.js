/**
 * PublicVacanciesView.js
 * Renders the public vacancies view (open jobs for all users)
 */

export function renderPublicVacanciesView(app) {
  const header = app.createElement('div', { className: 'miniapp-header' });
  const title = app.createElement('h2', {}, ['Open Job Vacancies']);
  header.appendChild(title);

  // Search and filters
  const filters = app.createElement('div', { className: 'vacancy-filters' });

  const searchGroup = app.createElement('div', { className: 'filter-group' });
  const searchInput = app.createElement('input', {
    type: 'text',
    className: 'input',
    placeholder: 'Search vacancies...',
    value: app.searchTerm || '',
    oninput: (e) => {
      app.searchTerm = e.target.value;
      app.render();
    }
  });
  searchGroup.appendChild(searchInput);

  const orgFilter = app.createElement('div', { className: 'filter-group' });
  const orgSelect = app.createElement('select', {
    className: 'input',
    onchange: (e) => {
      app.filterOrganization = e.target.value;
      app.render();
    }
  });
  const allOrgOption = app.createElement('option', { value: 'all' }, ['All Organizations']);
  orgSelect.appendChild(allOrgOption);
  app.organizations.forEach(org => {
    const option = app.createElement('option', {
      value: org._id,
      selected: app.filterOrganization === org._id
    }, [org.name || org._id]);
    orgSelect.appendChild(option);
  });
  orgFilter.appendChild(orgSelect);

  filters.appendChild(searchGroup);
  filters.appendChild(orgFilter);

  // Vacancy list
  const listContainer = app.createElement('div', { className: 'vacancy-list-container' });

  const filteredVacancies = app.getFilteredVacancies();

  if (filteredVacancies.length === 0) {
    const empty = app.createElement('div', { className: 'empty-state' }, [
      'No open job vacancies found.'
    ]);
    listContainer.appendChild(empty);
  } else {
    filteredVacancies.forEach(vacancy => {
      listContainer.appendChild(app.renderVacancyCard(vacancy, true));
    });
  }

  app.container.appendChild(header);
  app.container.appendChild(filters);
  app.container.appendChild(listContainer);
}
