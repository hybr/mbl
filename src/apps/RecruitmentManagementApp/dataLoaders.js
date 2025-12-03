/**
 * dataLoaders.js
 * Database query functions for recruitment data
 */

import { loadPersonData } from '../../utils/personHelpers.js';

/**
 * Load public vacancies (open status only)
 */
export async function loadPublicVacancies(db, logger) {
  try {
    const result = await db.query({
      selector: {
        type: 'vacancy',
        status: 'open'
      }
    });
    const vacancies = result.docs || result;
    logger.info(`Loaded ${vacancies.length} public vacancies`);
    return vacancies;
  } catch (error) {
    logger.error('Failed to load public vacancies:', error);
    return [];
  }
}

/**
 * Load organization vacancies
 */
export async function loadOrgVacancies(db, organizationId, logger) {
  if (!organizationId) {
    return [];
  }

  try {
    const result = await db.query({
      selector: {
        type: 'vacancy',
        organizationId: organizationId
      }
    });
    const vacancies = result.docs || result;
    logger.info(`Loaded ${vacancies.length} organization vacancies`);
    return vacancies;
  } catch (error) {
    logger.error('Failed to load organization vacancies:', error);
    return [];
  }
}

/**
 * Load my applications
 */
export async function loadMyApplications(db, userId, logger) {
  if (!userId) {
    return [];
  }

  try {
    const result = await db.query({
      selector: {
        type: 'application',
        applicantId: userId
      }
    });
    const applications = result.docs || result;
    logger.info(`Loaded ${applications.length} applications`);
    return applications;
  } catch (error) {
    logger.error('Failed to load applications:', error);
    return [];
  }
}

/**
 * Load my onboarding records
 */
export async function loadMyOnboardings(db, userId, logger) {
  if (!userId) {
    return [];
  }

  try {
    const result = await db.query({
      selector: {
        type: 'onboarding',
        personId: userId
      }
    });
    const onboardings = result.docs || result;
    logger.info(`Loaded ${onboardings.length} onboarding records for applicant`);
    return onboardings;
  } catch (error) {
    logger.error('Failed to load onboarding records:', error);
    return [];
  }
}

/**
 * Load organization applications
 */
export async function loadOrgApplications(db, organizationId, personsCache, logger) {
  if (!organizationId) {
    return [];
  }

  try {
    logger.info('Loading applications for organization:', organizationId);
    const result = await db.query({
      selector: {
        type: 'application',
        organizationId: organizationId
      }
    });
    logger.info('Applications query result:', result);
    const applications = result.docs || result;
    logger.info(`Loaded ${applications.length} organization applications`);

    // Preload person data for all applicants
    const applicantIds = [...new Set(applications.map(app => app.applicantId).filter(Boolean))];
    await Promise.all(applicantIds.map(id => loadPersonData(db, personsCache, id, logger)));
    logger.info(`Preloaded person data for ${applicantIds.length} applicants`);

    return applications;
  } catch (error) {
    logger.error('Failed to load organization applications:', error);
    return [];
  }
}

/**
 * Load organization onboarding records
 */
export async function loadOrgOnboardings(db, organizationId, logger) {
  if (!organizationId) {
    return [];
  }

  try {
    const result = await db.query({
      selector: {
        type: 'onboarding',
        organizationId: organizationId
      }
    });
    const onboardings = result.docs || result;
    logger.info(`Loaded ${onboardings.length} onboarding records`);
    return onboardings;
  } catch (error) {
    logger.error('Failed to load onboarding records:', error);
    return [];
  }
}

/**
 * Load reference data from JSON files
 */
export async function loadReferenceData(logger) {
  const data = {
    departments: [],
    teams: [],
    designations: [],
    educationLevels: [],
    subjects: [],
    skills: []
  };

  // Load departments
  try {
    const deptResponse = await fetch('/data/departments.json');
    data.departments = await deptResponse.json();
    logger.info(`Loaded ${data.departments.length} departments`);
  } catch (e) {
    logger.warn('Failed to load departments');
  }

  // Load teams
  try {
    const teamResponse = await fetch('/data/teams.json');
    data.teams = await teamResponse.json();
    logger.info(`Loaded ${data.teams.length} teams`);
  } catch (e) {
    logger.warn('Failed to load teams');
  }

  // Load designations
  try {
    const desgResponse = await fetch('/data/designations.json');
    data.designations = await desgResponse.json();
    logger.info(`Loaded ${data.designations.length} designations`);
  } catch (e) {
    logger.warn('Failed to load designations');
  }

  // Load education levels
  try {
    const levelsResponse = await fetch('/data/education-levels.json');
    data.educationLevels = await levelsResponse.json();
    logger.info(`Loaded ${data.educationLevels.length} education levels`);
  } catch (e) {
    logger.warn('Failed to load education levels');
  }

  // Load subjects
  try {
    const subjectsResponse = await fetch('/data/educational-subjects.json');
    data.subjects = await subjectsResponse.json();
    logger.info(`Loaded ${data.subjects.length} subjects`);
  } catch (e) {
    logger.warn('Failed to load subjects');
  }

  // Load skills
  try {
    const skillsResponse = await fetch('/data/skills.json');
    data.skills = await skillsResponse.json();
    logger.info(`Loaded ${data.skills.length} skills`);
  } catch (e) {
    logger.warn('Failed to load skills');
  }

  return data;
}

/**
 * Load workstations (branches)
 */
export async function loadWorkstations(db, logger) {
  try {
    const result = await db.query({
      selector: { type: 'branch' }
    });
    const workstations = result.docs || result;
    logger.info(`Loaded ${workstations.length} workstations`);
    return workstations;
  } catch (error) {
    logger.warn('Failed to load workstations');
    return [];
  }
}

/**
 * Load organizations
 */
export async function loadOrganizations(db, logger) {
  try {
    const result = await db.query({
      selector: { type: 'organization' }
    });
    const organizations = result.docs || result;
    logger.info(`Loaded ${organizations.length} organizations`);
    return organizations;
  } catch (error) {
    logger.warn('Failed to load organizations');
    return [];
  }
}
