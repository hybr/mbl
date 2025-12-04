/**
 * ProfileView.js
 * Profile view for displaying logged-in user information
 */

import { getFullName, calculateAge, getGenderDisplayText } from '../viewHelpers.js';

/**
 * Render profile view
 * @param {Object} app - App instance with context
 * @returns {void}
 */
export function renderProfileView(app) {
  if (!app.currentUser) {
    app.showLoginView();
    return;
  }

  app.container.classList.remove('auth-view');

  // Header
  const header = app.createElement('div', { className: 'profile-header' });
  const backBtn = app.createElement('button', {
    className: 'btn btn-small',
    onClick: () => app.showListView()
  }, ['← Back']);
  header.appendChild(backBtn);

  // Profile card
  const profileCard = app.createElement('div', { className: 'profile-card' });

  // Avatar section
  const avatarSection = app.createElement('div', { className: 'profile-avatar-section' });
  const avatar = app.createElement('div', { className: 'profile-avatar' }, [
    app.currentUser.firstName.charAt(0).toUpperCase() + (app.currentUser.lastName ? app.currentUser.lastName.charAt(0).toUpperCase() : '')
  ]);
  const name = app.createElement('h2', { className: 'profile-name' }, [getFullName(app.currentUser)]);
  const username = app.createElement('p', { className: 'profile-username' }, [`@${app.currentUser.username}`]);

  avatarSection.appendChild(avatar);
  avatarSection.appendChild(name);
  avatarSection.appendChild(username);

  // Info section
  const infoSection = app.createElement('div', { className: 'profile-info-section' });

  if (app.currentUser.primaryEmail) {
    const emailRow = app.createElement('div', { className: 'profile-info-row' });
    const emailLabel = app.createElement('span', { className: 'profile-info-label' }, ['Email']);
    const emailValue = app.createElement('span', { className: 'profile-info-value' }, [app.currentUser.primaryEmail]);
    emailRow.appendChild(emailLabel);
    emailRow.appendChild(emailValue);
    infoSection.appendChild(emailRow);
  }

  if (app.currentUser.primaryPhone) {
    const phoneRow = app.createElement('div', { className: 'profile-info-row' });
    const phoneLabel = app.createElement('span', { className: 'profile-info-label' }, ['Phone']);
    const phoneValue = app.createElement('span', { className: 'profile-info-value' }, [app.currentUser.primaryPhone]);
    phoneRow.appendChild(phoneLabel);
    phoneRow.appendChild(phoneValue);
    infoSection.appendChild(phoneRow);
  }

  if (app.currentUser.dateOfBirth) {
    const dobRow = app.createElement('div', { className: 'profile-info-row' });
    const dobLabel = app.createElement('span', { className: 'profile-info-label' }, ['Age']);
    const dobValue = app.createElement('span', { className: 'profile-info-value' }, [calculateAge(app.currentUser.dateOfBirth).toString()]);
    dobRow.appendChild(dobLabel);
    dobRow.appendChild(dobValue);
    infoSection.appendChild(dobRow);
  }

  if (app.currentUser.gender) {
    const genderRow = app.createElement('div', { className: 'profile-info-row' });
    const genderLabel = app.createElement('span', { className: 'profile-info-label' }, ['Gender']);
    const genderValue = app.createElement('span', { className: 'profile-info-value' }, [getGenderDisplayText(app.currentUser.gender)]);
    genderRow.appendChild(genderLabel);
    genderRow.appendChild(genderValue);
    infoSection.appendChild(genderRow);
  }

  // Actions
  const actions = app.createElement('div', { className: 'profile-actions' });

  // Quick access buttons
  const tasksBtn = app.createElement('button', {
    className: 'btn btn-secondary',
    onClick: () => app.openTasksApp()
  }, ['📋 Tasks']);

  const notesBtn = app.createElement('button', {
    className: 'btn btn-secondary',
    onClick: () => app.openNotesApp()
  }, ['📝 Notes']);

  const messagesBtn = app.createElement('button', {
    className: 'btn btn-secondary',
    onClick: () => app.openMessagesApp()
  }, ['✉️ Messages']);

  const editBtn = app.createElement('button', {
    className: 'btn btn-primary',
    onClick: () => app.showEditView(app.currentUser._id)
  }, ['Edit Profile']);

  const logoutBtn = app.createElement('button', {
    className: 'btn btn-secondary',
    onClick: () => app.logout()
  }, ['Logout']);

  const educationBtn = app.createElement('button', {
    className: 'btn btn-secondary',
    onClick: () => app.openEducationApp()
  }, ['🎓 Education']);

  const skillsBtn = app.createElement('button', {
    className: 'btn btn-secondary',
    onClick: () => app.openSkillsApp()
  }, ['🛠️ Skills']);

  const hiringManagementAppBtn = app.createElement('button', {
    className: 'btn btn-secondary',
    onClick: () => app.RecruitmentManagementApp()
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

  app.container.appendChild(header);
  app.container.appendChild(profileCard);
}
