/**
 * constants.js
 * Constants and configuration for RecruitmentManagementApp
 */

export const STAGE_LABELS = {
  initial_review: 'Initial Review',
  screening: 'Screening',
  interview: 'Interview',
  offer: 'Offer',
  onboarding: 'Onboarding'
};

export const APPLICATION_STATUS_OPTIONS = [
  'applied',
  'screening',
  'interview',
  'offer',
  'rejected',
  'hired'
];

export const STAGE_STATUS_OPTIONS = [
  'pending',
  'scheduled',
  'in_progress',
  'completed'
];

export const DEFAULT_ONBOARDING_TASKS = [
  { id: 'task-offer-acceptance', task: 'Offer Acceptance', status: 'pending' },
  { id: 'task-background-check', task: 'Background Check', status: 'pending' },
  { id: 'task-documentation', task: 'Document Collection', status: 'pending' },
  { id: 'task-orientation', task: 'Orientation Scheduling', status: 'pending' }
];

export const VIEW_MODES = {
  PUBLIC: 'public',
  ORG_ADMIN: 'org-admin',
  APPLICANT: 'applicant'
};

export const VIEWS = {
  PUBLIC_VACANCIES: 'public-vacancies',
  ORG_VACANCIES: 'org-vacancies',
  CREATE_VACANCY: 'create-vacancy',
  EDIT_VACANCY: 'edit-vacancy',
  VACANCY_DETAILS: 'vacancy-details',
  APPLY: 'apply',
  MY_APPLICATIONS: 'my-applications',
  MANAGE_APPLICATIONS: 'manage-applications',
  APPLICATION_DETAILS: 'application-details',
  ONBOARDING: 'onboarding'
};

export const VACANCY_STATUS_OPTIONS = ['draft', 'open', 'closed', 'filled'];
