/**
 * dataLoaders.js
 * Database operations and data loading functions for PersonManagementApp
 */

/**
 * Load all persons from database
 * @param {Object} db - Database instance
 * @param {Object} logger - Logger instance
 * @returns {Promise<Array>} Array of person objects
 */
export async function loadPersons(db, logger) {
  try {
    const result = await db.query({
      selector: { type: 'person' }
    });

    // Sort in JavaScript instead of database
    const persons = result.docs || result;
    persons.sort((a, b) => {
      const nameA = (a.firstName || '').toLowerCase();
      const nameB = (b.firstName || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });

    logger.debug(`Loaded ${persons.length} persons`);
    return persons;
  } catch (error) {
    logger.error('Failed to load persons:', error);
    return [];
  }
}

/**
 * Load single person by ID
 * @param {Object} db - Database instance
 * @param {string} id - Person ID
 * @param {Object} logger - Logger instance
 * @returns {Promise<Object|null>} Person object or null
 */
export async function loadPerson(db, id, logger) {
  try {
    const person = await db.read(id);
    return person;
  } catch (error) {
    logger.error('Failed to load person:', error);
    return null;
  }
}

/**
 * Find person by username (case-insensitive)
 * @param {Object} db - Database instance
 * @param {string} username - Username to search for
 * @param {Object} logger - Logger instance
 * @returns {Promise<Object|null>} Person object or null
 */
export async function findPersonByUsername(db, username, logger) {
  try {
    // PouchDB Find doesn't support $regex reliably
    // So we'll query all persons and filter in memory
    const results = await db.query({
      selector: {
        type: 'person'
      }
    });

    // Filter by username (case-insensitive)
    const normalizedUsername = username.toLowerCase();
    const found = results.filter(p =>
      p.username && p.username.toLowerCase() === normalizedUsername
    );

    logger.debug(`Username check for "${username}":`, {
      totalPersons: results.length,
      found: found.length,
      matches: found.map(p => ({ id: p._id, username: p.username }))
    });

    return found.length > 0 ? found[0] : null;
  } catch (error) {
    logger.error('Failed to find person by username:', error);
    return null;
  }
}

/**
 * Find person by email
 * @param {Object} db - Database instance
 * @param {string} email - Email to search for
 * @param {Object} logger - Logger instance
 * @returns {Promise<Array>} Array of matching persons
 */
export async function findPersonByEmail(db, email, logger) {
  try {
    const results = await db.query({
      selector: {
        type: 'person',
        primaryEmail: email
      },
      limit: 1
    });

    return results;
  } catch (error) {
    logger.error('Failed to find person by email:', error);
    return [];
  }
}

/**
 * Save person to database
 * @param {Object} db - Database instance
 * @param {Object} person - Person object to save
 * @param {boolean} isNew - Whether this is a new person
 * @param {Object} logger - Logger instance
 * @returns {Promise<Object>} Saved person object
 */
export async function savePerson(db, person, isNew, logger) {
  try {
    if (isNew) {
      await db.create(person);
      logger.debug('Person created:', person._id);
    } else {
      await db.update(person);
      logger.debug('Person updated:', person._id);
    }
    return person;
  } catch (error) {
    logger.error('Failed to save person:', error);
    throw error;
  }
}

/**
 * Delete person from database
 * @param {Object} db - Database instance
 * @param {Object} person - Person object to delete
 * @param {Object} logger - Logger instance
 * @returns {Promise<void>}
 */
export async function deletePerson(db, person, logger) {
  try {
    await db.delete(person);
    logger.debug('Person deleted:', person._id);
  } catch (error) {
    logger.error('Failed to delete person:', error);
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
    // Index for username uniqueness check
    await db.createIndex(['type', 'username']);

    // Index for name searches
    await db.createIndex(['type', 'firstName', 'lastName']);

    logger.info('Database indexes created');
  } catch (error) {
    logger.error('Failed to create indexes:', error);
  }
}
