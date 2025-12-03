/**
 * ApplicationCard.js
 * Reusable application card component
 */

import { createStatusBadge } from './StatusBadge.js';
import { getStageLabel, getOnboardingStatusLabel } from '../utils/formatters.js';
import { getApplicantDisplayNameById } from '../utils/personHelpers.js';

export function createApplicationCard(options) {
  const {
    createElement,
    application,
    isApplicant,
    vacancies,
    onboardings,
    personsCache,
    onViewDetails
  } = options;

  const card = createElement('div', { className: 'application-card' });

  // Get vacancy info
  const vacancy = vacancies.find(v => v._id === application.vacancyId);
  const vacancyTitle = vacancy ? vacancy.title : 'Unknown Position';

  const title = createElement('div', { className: 'application-card-title' }, [vacancyTitle]);

  const statusBadge = createStatusBadge(
    createElement,
    application.status,
    application.status || 'applied'
  );

  const appliedDate = new Date(application.appliedAt).toLocaleDateString();
  const dateInfo = createElement('div', { className: 'application-card-date' }, [
    `Applied: ${appliedDate}`
  ]);

  const stageInfo = createElement('div', { className: 'application-card-stage' }, [
    `Stage: ${getStageLabel(application.currentStage || 'initial_review')}`
  ]);

  card.appendChild(title);
  card.appendChild(statusBadge);
  card.appendChild(dateInfo);
  card.appendChild(stageInfo);

  if (application.onboardingId) {
    const onboarding = onboardings.find(o => o._id === application.onboardingId);
    const onboardingStatus = onboarding ? onboarding.status : 'in_progress';
    const onboardingInfo = createElement('div', { className: 'application-card-onboarding' }, [
      `Onboarding: ${getOnboardingStatusLabel(onboardingStatus)}`
    ]);
    card.appendChild(onboardingInfo);
  }

  if (!isApplicant) {
    // Org admin view - show applicant name
    const applicantName = getApplicantDisplayNameById(personsCache, application.applicantId);

    const applicantInfo = createElement('div', { className: 'application-card-applicant' }, [
      `Applicant: ${applicantName}`
    ]);
    card.appendChild(applicantInfo);

    const actions = createElement('div', { className: 'application-card-actions' });
    const viewBtn = createElement('button', {
      className: 'btn btn-small btn-primary',
      onclick: () => onViewDetails(application._id)
    }, ['View Details']);
    actions.appendChild(viewBtn);
    card.appendChild(actions);
  }

  return card;
}
