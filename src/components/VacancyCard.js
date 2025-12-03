/**
 * VacancyCard.js
 * Reusable vacancy card component
 */

import { createStatusBadge } from './StatusBadge.js';

export function createVacancyCard(options) {
  const {
    createElement,
    vacancy,
    isPublic,
    getOrganizationName,
    getDepartmentName,
    onViewDetails,
    onApply,
    onEdit,
    onViewApplications,
    hasApplied,
    currentUser
  } = options;

  const card = createElement('div', { className: 'vacancy-card' });

  const title = createElement('div', { className: 'vacancy-card-title' }, [
    vacancy.title || 'Untitled Position'
  ]);

  const orgName = getOrganizationName(vacancy.organizationId);
  const orgInfo = createElement('div', { className: 'vacancy-card-org' }, [orgName]);

  const deptName = getDepartmentName(vacancy.departmentCode);
  const deptInfo = createElement('div', { className: 'vacancy-card-dept' }, [
    deptName || 'N/A'
  ]);

  const statusBadge = createStatusBadge(createElement, vacancy.status, vacancy.status || 'draft');

  const details = createElement('div', { className: 'vacancy-card-details' });
  if (vacancy.workExperienceYears) {
    details.appendChild(createElement('div', {}, [
      `Experience: ${vacancy.workExperienceYears} years`
    ]));
  }

  const actions = createElement('div', { className: 'vacancy-card-actions' });

  if (isPublic) {
    const viewBtn = createElement('button', {
      className: 'btn btn-small btn-primary',
      onclick: () => onViewDetails(vacancy._id)
    }, ['View Details']);
    actions.appendChild(viewBtn);

    if (currentUser) {
      if (!hasApplied) {
        const applyBtn = createElement('button', {
          className: 'btn btn-small btn-secondary',
          onclick: () => onApply(vacancy._id)
        }, ['Apply']);
        actions.appendChild(applyBtn);
      } else {
        const appliedBadge = createElement('span', { className: 'applied-badge' }, ['Applied']);
        actions.appendChild(appliedBadge);
      }
    }
  } else {
    const editBtn = createElement('button', {
      className: 'btn btn-small btn-secondary',
      onclick: () => onEdit(vacancy._id)
    }, ['Edit']);
    actions.appendChild(editBtn);

    const appsBtn = createElement('button', {
      className: 'btn btn-small btn-primary',
      onclick: () => onViewApplications(vacancy._id)
    }, ['Applications']);
    actions.appendChild(appsBtn);
  }

  card.appendChild(title);
  card.appendChild(orgInfo);
  card.appendChild(deptInfo);
  card.appendChild(statusBadge);
  card.appendChild(details);
  card.appendChild(actions);

  return card;
}
