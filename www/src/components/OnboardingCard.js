/**
 * OnboardingCard.js
 * Reusable onboarding card component
 */

import { createStatusBadge } from './StatusBadge.js';
import { getOnboardingStatusLabel, formatDateTime, formatLabel } from '../utils/formatters.js';
import { STAGE_STATUS_OPTIONS } from '../apps/RecruitmentManagementApp/constants.js';

export function createOnboardingCard(options) {
  const {
    createElement,
    onboarding,
    allowUpdates,
    vacancies,
    onUpdateTaskStatus
  } = options;

  const card = createElement('div', { className: 'onboarding-card' });
  const vacancy = vacancies.find(v => v._id === onboarding.vacancyId);

  const title = createElement('div', { className: 'onboarding-card-title' }, [
    vacancy ? vacancy.title : 'Onboarding'
  ]);
  card.appendChild(title);

  const statusBadge = createStatusBadge(
    createElement,
    onboarding.status || 'not_started',
    getOnboardingStatusLabel(onboarding.status || 'not_started')
  );
  card.appendChild(statusBadge);

  const tasksList = createElement('div', { className: 'onboarding-task-list' });

  (onboarding.tasks || []).forEach(task => {
    const taskRow = createElement('div', { className: 'onboarding-task-row' });
    const name = createElement('div', { className: 'onboarding-task-name' }, [task.task]);
    taskRow.appendChild(name);

    if (allowUpdates) {
      const select = createElement('select', {
        className: 'input onboarding-task-select',
        onchange: (e) => onUpdateTaskStatus(onboarding._id, task.id, e.target.value)
      });
      STAGE_STATUS_OPTIONS.filter(status => status !== 'scheduled').forEach(status => {
        const option = createElement('option', {
          value: status,
          selected: task.status === status
        }, [formatLabel(status)]);
        select.appendChild(option);
      });
      taskRow.appendChild(select);
    } else {
      taskRow.appendChild(createElement('div', { className: 'onboarding-task-status' }, [
        formatLabel(task.status)
      ]));
    }

    tasksList.appendChild(taskRow);
  });

  card.appendChild(tasksList);

  if (onboarding.status === 'completed' && onboarding.completionDate) {
    card.appendChild(createElement('div', { className: 'onboarding-completion' }, [
      `Completed on ${formatDateTime(onboarding.completionDate)}`
    ]));
  }

  return card;
}
