/**
 * viewHelpers.js
 * Helper functions for views
 */

/**
 * Get organization name
 */
export function getOrganizationName(organizations, orgId) {
  const org = organizations.find(o => o._id === orgId);
  return org ? org.name : orgId;
}

/**
 * Get department name
 */
export function getDepartmentName(departments, code) {
  const dept = departments.find(d => d.code === code);
  return dept ? dept.name : code;
}

/**
 * Get team name
 */
export function getTeamName(teams, code) {
  const team = teams.find(t => t.teamCode === code);
  return team ? team.teamCode + ': ' + team.teamName : code;
}

/**
 * Get designation name
 */
export function getDesignationName(designations, code) {
  const desg = designations.find(d => d.code === code);
  return desg ? desg.name : code;
}

/**
 * Get skill name
 */
export function getSkillName(skills, code) {
  const skill = skills.find(s => s.code === code);
  return skill ? skill.name : code;
}

/**
 * Get education level name
 */
export function getEducationLevelName(educationLevels, code) {
  const level = educationLevels.find(l => l.code === code);
  return level ? level.name : code;
}

/**
 * Get subject name
 */
export function getSubjectName(subjects, code) {
  const subject = subjects.find(s => s.code === code);
  return subject ? subject.name : code;
}

/**
 * Get onboarding for application
 */
export function getOnboardingForApplication(onboardings, applicationId) {
  if (!applicationId) return null;
  return onboardings.find(o => o.applicationId === applicationId);
}

/**
 * Get filtered vacancies for public view
 */
export function getFilteredVacancies(vacancies, filterOrganization, searchTerm) {
  let filtered = [...vacancies];

  // Filter by organization
  if (filterOrganization && filterOrganization !== 'all') {
    filtered = filtered.filter(v => v.organizationId === filterOrganization);
  }

  // Filter by search term
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter(v => {
      const title = (v.title || '').toLowerCase();
      const desc = (v.description || '').toLowerCase();
      return title.includes(term) || desc.includes(term);
    });
  }

  return filtered;
}

/**
 * Get filtered vacancies for org view
 */
export function getFilteredOrgVacancies(vacancies, filterStatus) {
  let filtered = [...vacancies];

  // Filter by status
  if (filterStatus && filterStatus !== 'all') {
    filtered = filtered.filter(v => v.status === filterStatus);
  }

  return filtered;
}
