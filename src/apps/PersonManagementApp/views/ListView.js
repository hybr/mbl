/**
 * ListView.js
 * List view for displaying all persons
 */

import { Button } from '../../../components/Button.js';
import { Input } from '../../../components/Input.js';
import { PersonCard } from '../../../components/PersonCard.js';

/**
 * Render list view
 * @param {Object} app - App instance with context
 * @returns {void}
 */
export function renderListView(app) {
  // Header
  const header = app.createElement('div', { className: 'miniapp-header' });

  const titleContainer = app.createElement('div', { className: 'header-title-container' });
  const title = app.createElement('h2', {}, ['Person Management']);
  titleContainer.appendChild(title);

  if (app.currentUser) {
    const userInfo = app.createElement('div', {
      className: 'user-info'
    }, [`Logged in as: ${app.currentUser.username}`]);
    titleContainer.appendChild(userInfo);
  }

  header.appendChild(titleContainer);

  // Action buttons
  const actions = app.createElement('div', { className: 'person-actions' });

  app.components.createBtn = new Button({
    text: '+ Create Person',
    className: 'btn btn-primary',
    onClick: () => app.showEditView(null)
  });

  app.components.loginBtn = new Button({
    text: app.currentUser ? 'Logout' : 'Login',
    className: 'btn btn-secondary',
    onClick: () => {
      if (app.currentUser) {
        app.logout();
      } else {
        app.showLoginView();
      }
    }
  });

  actions.appendChild(app.components.createBtn.create());
  actions.appendChild(app.components.loginBtn.create());

  // Search
  const searchContainer = app.createElement('div', { className: 'person-search' });

  app.components.searchInput = new Input({
    placeholder: 'Search by name...',
    className: 'input',
    onChange: (value) => app.filterPersons(value)
  });

  searchContainer.appendChild(app.components.searchInput.create());

  // Person list
  const listContainer = app.createElement('div', { className: 'person-list-container' });
  const personList = app.createElement('div', { className: 'person-list' });

  const filteredPersons = app.getFilteredPersons();

  if (filteredPersons.length === 0) {
    const empty = app.createElement('div', {
      className: 'person-list-empty'
    }, ['No persons found. Create your first person!']);
    personList.appendChild(empty);
  } else {
    filteredPersons.forEach(person => {
      const personCard = new PersonCard({
        person,
        onEdit: () => app.showEditView(person._id),
        onDelete: () => app.deletePerson(person),
        createElement: app.createElement.bind(app)
      });
      personList.appendChild(personCard.render());
    });
  }

  listContainer.appendChild(personList);

  // Assemble
  app.container.appendChild(header);
  app.container.appendChild(actions);
  app.container.appendChild(searchContainer);
  app.container.appendChild(listContainer);
}
