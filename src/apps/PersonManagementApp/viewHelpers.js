/**
 * viewHelpers.js
 * Helper functions for PersonManagementApp views
 */

/**
 * Get full name from person object
 * @param {Object} person - Person object
 * @returns {string} Full name
 */
export function getFullName(person) {
  const parts = [
    person.namePrefix,
    person.firstName,
    person.middleName,
    person.lastName,
    person.nameSuffix
  ].filter(p => p);

  return parts.join(' ') || 'Unnamed Person';
}

/**
 * Calculate age from date of birth
 * @param {string} dob - Date of birth (YYYY-MM-DD)
 * @returns {number|null} Age in years or null
 */
export function calculateAge(dob) {
  if (!dob) return null;

  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

/**
 * Get form data from a form element
 * @param {HTMLFormElement} form - Form element
 * @returns {Object} Form data as key-value pairs
 */
export function getFormData(form) {
  if (!form) return null;

  const formData = new FormData(form);
  const data = {};

  for (let [key, value] of formData.entries()) {
    data[key] = value.trim();
  }

  // Get password separately
  const passwordField = form.querySelector('[name="password"]');
  if (passwordField && passwordField.value) {
    data.password = passwordField.value;
  }

  return data;
}

/**
 * Populate form with person data
 * @param {HTMLFormElement} form - Form element
 * @param {Object} person - Person object
 */
export function populateForm(form, person) {
  if (!form) return;

  Object.keys(person).forEach(key => {
    const field = form.querySelector(`[name="${key}"]`);
    if (field && key !== '_id' && key !== '_rev' && key !== 'type' && key !== 'hashedPassword') {
      field.value = person[key] || '';
    }
  });
}

/**
 * Filter persons by search term
 * @param {Array} persons - Array of person objects
 * @param {string} searchTerm - Search term
 * @returns {Array} Filtered persons
 */
export function filterPersons(persons, searchTerm) {
  if (!searchTerm) {
    return persons;
  }

  const term = searchTerm.toLowerCase();

  return persons.filter(person => {
    const fullName = getFullName(person).toLowerCase();
    const username = person.username.toLowerCase();
    const email = (person.primaryEmail || '').toLowerCase();

    return fullName.includes(term) ||
           username.includes(term) ||
           email.includes(term);
  });
}

/**
 * Get gender display text
 * @param {string} genderCode - Gender code (M, F, O)
 * @returns {string} Gender display text
 */
export function getGenderDisplayText(genderCode) {
  switch (genderCode) {
    case 'M': return 'Male';
    case 'F': return 'Female';
    case 'O': return 'Other';
    default: return '';
  }
}
