/**
 * constants.js
 * Constants and configuration for PersonManagementApp
 */

export const VIEW_MODES = {
  LIST: 'list',
  EDIT: 'edit',
  LOGIN: 'login',
  SIGNUP: 'signup',
  FORGOT_PASSWORD: 'forgot-password',
  PROFILE: 'profile'
};

export const GENDER_OPTIONS = [
  { value: '', label: '-- Select --' },
  { value: 'M', label: 'Male' },
  { value: 'F', label: 'Female' },
  { value: 'O', label: 'Other' }
];

export const NAME_PREFIX_OPTIONS = [
  'Mr.',
  'Mrs.',
  'Ms.',
  'Dr.'
];

export const NAME_SUFFIX_OPTIONS = [
  'Jr.',
  'Sr.',
  'II',
  'III'
];

export const PASSWORD_CONFIG = {
  MIN_LENGTH: 6,
  SALT: 'miniapp-salt-2025'
};

export const SESSION_STORAGE_KEY = 'personManagementApp_session';
