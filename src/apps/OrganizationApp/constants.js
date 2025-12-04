/**
 * constants.js
 * Constants and configuration for OrganizationApp
 */

export const VIEW_MODES = {
  LIST: 'list',
  EDIT: 'edit',
  VIEW: 'view'
};

export const DEFAULT_ORGANIZATION_KEY = 'defaultOrganization';
export const SESSION_STORAGE_KEY = 'personManagementApp_session';

export const SUBDOMAIN_CONFIG = {
  MIN_LENGTH: 3,
  MAX_LENGTH: 63,
  PATTERN: /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/,
  SUFFIX: '.v4l.app'
};

export const USER_ROLES = {
  OWNER: 'owner',
  WORKER: 'worker'
};
