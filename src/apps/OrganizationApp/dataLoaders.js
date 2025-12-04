/**
 * dataLoaders.js
 * Database operations and data loading functions for OrganizationApp
 */

import { Notification } from '../../utils/Notification.js';
import { USER_ROLES } from './constants.js';

/**
 * Load organization types from JSON file
 * @param {Object} logger - Logger instance
 * @returns {Promise<Array>} Array of organization types
 */
export async function loadOrganizationTypes(logger) {
  try {
    const response = await fetch('/data/organization-types.json');
    const types = await response.json();
    logger.info(`Loaded ${types.length} organization types`);
    return types;
  } catch (error) {
    logger.error('Failed to load organization types:', error);
    Notification.error('Failed to load organization types');
    return [];
  }
}

/**
 * Load industries from JSON file
 * @param {Object} logger - Logger instance
 * @returns {Promise<Array>} Array of industries
 */
export async function loadIndustries(logger) {
  try {
    const response = await fetch('/data/industries.json');
    const industries = await response.json();
    logger.info(`Loaded ${industries.length} industries`);
    return industries;
  } catch (error) {
    logger.error('Failed to load industries:', error);
    Notification.error('Failed to load industries');
    return [];
  }
}

/**
 * Load organizations for current user
 * Includes both organizations created by user and organizations where user is a worker
 * @param {Object} db - Database instance
 * @param {Object} currentUser - Current user object
 * @param {Object} logger - Logger instance
 * @returns {Promise<Object>} Object with organizations, myOrganizations, workerOrganizations
 */
export async function loadOrganizations(db, currentUser, logger) {
  try {
    if (!db) {
      logger.warn('Database not available');
      return {
        organizations: [],
        myOrganizations: [],
        workerOrganizations: []
      };
    }

    if (!currentUser) {
      return {
        organizations: [],
        myOrganizations: [],
        workerOrganizations: []
      };
    }

    // Load all organizations (we'll filter in memory for better reliability)
    const allOrgs = await db.query({
      selector: {
        type: 'organization'
      }
    });

    // Filter organizations created by current user
    const myOrganizations = allOrgs.filter(org =>
      org && org.name && org.createdBy === currentUser._id
    );

    // Filter organizations where current user is a worker
    const workerOrganizations = allOrgs.filter(org =>
      org && org.name &&
      org.workers &&
      Array.isArray(org.workers) &&
      org.workers.some(worker =>
        worker.userId === currentUser._id || worker === currentUser._id
      )
    );

    // Combine both lists (remove duplicates if user is both creator and worker)
    const orgMap = new Map();

    // Add created organizations
    myOrganizations.forEach(org => {
      orgMap.set(org._id, { ...org, _userRole: USER_ROLES.OWNER });
    });

    // Add worker organizations (if not already in map)
    workerOrganizations.forEach(org => {
      if (!orgMap.has(org._id)) {
        orgMap.set(org._id, { ...org, _userRole: USER_ROLES.WORKER });
      }
    });

    // Convert map to array and sort by creation date
    const organizations = Array.from(orgMap.values()).sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    logger.info(`Loaded ${organizations.length} organizations (${myOrganizations.length} owned, ${workerOrganizations.length} as worker)`);

    return {
      organizations,
      myOrganizations,
      workerOrganizations
    };
  } catch (error) {
    logger.error('Failed to load organizations:', error);
    return {
      organizations: [],
      myOrganizations: [],
      workerOrganizations: []
    };
  }
}

/**
 * Save organization to database
 * @param {Object} db - Database instance
 * @param {Object} orgData - Organization data
 * @param {boolean} isEdit - Whether this is an edit operation
 * @param {Object} logger - Logger instance
 * @returns {Promise<Object>} Saved organization object
 */
export async function saveOrganization(db, orgData, isEdit, logger) {
  try {
    if (isEdit) {
      await db.update(orgData);
      logger.info('Organization updated:', orgData._id);
    } else {
      await db.create(orgData);
      logger.info('Organization created:', orgData._id);
    }
    return orgData;
  } catch (error) {
    logger.error('Failed to save organization:', error);
    throw error;
  }
}

/**
 * Delete organization from database
 * @param {Object} db - Database instance
 * @param {Object} org - Organization object to delete
 * @param {Object} logger - Logger instance
 * @returns {Promise<void>}
 */
export async function deleteOrganization(db, org, logger) {
  try {
    await db.delete(org);
    logger.info('Organization deleted:', org._id);
  } catch (error) {
    logger.error('Failed to delete organization:', error);
    throw error;
  }
}

/**
 * Create database indexes
 * @param {Object} db - Database instance
 * @param {Object} logger - Logger instance
 * @returns {Promise<void>}
 */
export async function createIndexes(db, logger) {
  try {
    // Index for user's organizations
    await db.createIndex(['type', 'createdBy']);

    // Index for subdomain uniqueness
    await db.createIndex(['type', 'subdomain']);

    logger.info('Database indexes created');
  } catch (error) {
    logger.error('Failed to create indexes:', error);
  }
}

/**
 * Check current user from session storage
 * @param {Object} db - Database instance
 * @param {string} sessionKey - Session storage key
 * @param {Object} logger - Logger instance
 * @returns {Promise<Object|null>} Current user or null
 */
export async function checkCurrentUser(db, sessionKey, logger) {
  try {
    const sessionData = localStorage.getItem(sessionKey);
    if (sessionData) {
      const session = JSON.parse(sessionData);
      // Load the user from database
      const users = await db.query({
        selector: {
          type: 'person',
          _id: session.userId
        }
      });

      if (users.length > 0) {
        logger.info('Current user loaded:', users[0].username);
        return users[0];
      }
    }
    return null;
  } catch (error) {
    logger.error('Failed to check current user:', error);
    return null;
  }
}

/**
 * Check if subdomain is unique
 * @param {Object} db - Database instance
 * @param {string} subdomain - Subdomain to check
 * @param {string|null} currentOrgId - Current organization ID (for edit mode)
 * @param {Object} logger - Logger instance
 * @returns {Promise<boolean>} True if subdomain is unique
 */
export async function isSubdomainUnique(db, subdomain, currentOrgId, logger) {
  try {
    const existing = await db.query({
      selector: {
        type: 'organization',
        subdomain: subdomain
      }
    });

    logger.debug(`Subdomain uniqueness check for "${subdomain}":`, {
      found: existing.length,
      organizations: existing.map(o => ({ id: o._id, subdomain: o.subdomain })),
      currentOrgId
    });

    // If editing, exclude current organization from check
    if (currentOrgId) {
      const otherOrgs = existing.filter(org => org._id !== currentOrgId);
      return otherOrgs.length === 0;
    }

    return existing.length === 0;
  } catch (error) {
    logger.error('Failed to check subdomain uniqueness:', error);
    return false;
  }
}
