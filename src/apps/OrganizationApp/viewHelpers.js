/**
 * viewHelpers.js
 * Helper functions for OrganizationApp views
 */

import { SUBDOMAIN_CONFIG, DEFAULT_ORGANIZATION_KEY } from './constants.js';

/**
 * Validate subdomain format
 * @param {string} subdomain - Subdomain to validate
 * @returns {boolean} True if valid
 */
export function validateSubdomain(subdomain) {
  // Must be lowercase alphanumeric and hyphens, 3-63 characters
  return SUBDOMAIN_CONFIG.PATTERN.test(subdomain);
}

/**
 * Check if an organization is the default organization
 * @param {Object} org - Organization object
 * @returns {boolean} True if default
 */
export function isDefaultOrganization(org) {
  try {
    const storedOrg = localStorage.getItem(DEFAULT_ORGANIZATION_KEY);
    if (!storedOrg) return false;

    const parsed = JSON.parse(storedOrg);
    return parsed._id === org._id;
  } catch (error) {
    return false;
  }
}

/**
 * Get organization type name by ID
 * @param {Array} organizationTypes - Array of organization types
 * @param {number} typeId - Type ID
 * @returns {Object|null} Organization type object or null
 */
export function getOrganizationType(organizationTypes, typeId) {
  return organizationTypes.find(t => t.id === typeId) || null;
}

/**
 * Get industry by ID
 * @param {Array} industries - Array of industries
 * @param {number} industryId - Industry ID
 * @returns {Object|null} Industry object or null
 */
export function getIndustry(industries, industryId) {
  return industries.find(i => i.id === industryId) || null;
}

/**
 * Group organization types by country
 * @param {Array} organizationTypes - Array of organization types
 * @returns {Object} Object with country codes as keys
 */
export function groupTypesByCountry(organizationTypes) {
  const typesByCountry = {};
  organizationTypes.forEach(type => {
    if (!typesByCountry[type.country_code]) {
      typesByCountry[type.country_code] = [];
    }
    typesByCountry[type.country_code].push(type);
  });
  return typesByCountry;
}

/**
 * Group industries by category
 * @param {Array} industries - Array of industries
 * @returns {Object} Object with categories as keys
 */
export function groupIndustriesByCategory(industries) {
  const industriesByCategory = {};
  industries.forEach(ind => {
    if (!industriesByCategory[ind.category]) {
      industriesByCategory[ind.category] = [];
    }
    industriesByCategory[ind.category].push(ind);
  });
  return industriesByCategory;
}

/**
 * Format subdomain with suffix
 * @param {string} subdomain - Subdomain
 * @returns {string} Formatted subdomain
 */
export function formatSubdomain(subdomain) {
  return `${subdomain}${SUBDOMAIN_CONFIG.SUFFIX}`;
}

/**
 * Sanitize subdomain input
 * @param {string} value - Input value
 * @returns {string} Sanitized subdomain
 */
export function sanitizeSubdomainInput(value) {
  let sanitized = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
  if (sanitized.length > SUBDOMAIN_CONFIG.MAX_LENGTH) {
    sanitized = sanitized.slice(0, SUBDOMAIN_CONFIG.MAX_LENGTH);
  }
  if (sanitized.startsWith('-')) {
    sanitized = sanitized.slice(1);
  }
  if (sanitized.endsWith('-')) {
    sanitized = sanitized.slice(0, -1);
  }
  return sanitized;
}
