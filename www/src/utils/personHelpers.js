/**
 * personHelpers.js
 * Utility functions for working with person data
 */

/**
 * Load person data by ID
 */
export async function loadPersonData(db, personsCache, personId, logger) {
  if (!personId) return null;

  // Check cache first
  if (personsCache.has(personId)) {
    return personsCache.get(personId);
  }

  try {
    const person = await db.read(personId);
    if (person) {
      personsCache.set(personId, person);
      return person;
    }
  } catch (error) {
    logger.warn(`Failed to load person ${personId}:`, error);
  }

  return null;
}

/**
 * Get applicant display name from person data
 */
export function getApplicantDisplayName(person, personId) {
  if (!person && !personId) return 'Unknown Applicant';
  if (!person) return personId;

  // Try to build a display name from available fields
  if (person.firstName && person.lastName) {
    return `${person.firstName} ${person.lastName} (${person.username || personId})`;
  } else if (person.username) {
    return person.username;
  } else if (person.firstName) {
    return person.firstName;
  }

  return personId; // Fallback to ID
}

/**
 * Get applicant display name by ID (uses cache)
 */
export function getApplicantDisplayNameById(personsCache, applicantId) {
  if (!applicantId) return 'Unknown Applicant';

  const person = personsCache.get(applicantId);
  return getApplicantDisplayName(person, applicantId);
}
