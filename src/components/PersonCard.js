/**
 * PersonCard.js
 * Reusable person card component
 */

/**
 * PersonCard Component
 * Displays person information in a card format
 */
export class PersonCard {
  constructor(options = {}) {
    this.person = options.person;
    this.onEdit = options.onEdit;
    this.onDelete = options.onDelete;
    this.createElement = options.createElement;
  }

  /**
   * Get full name from person object
   * @returns {string} Full name
   */
  getFullName() {
    const person = this.person;
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
   * @returns {number|null} Age in years or null
   */
  calculateAge() {
    if (!this.person.dateOfBirth) return null;

    const birthDate = new Date(this.person.dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }

  /**
   * Render the person card
   * @returns {HTMLElement} Card element
   */
  render() {
    const card = this.createElement('div', { className: 'person-card' });

    // Name
    const name = this.getFullName();
    const nameEl = this.createElement('div', { className: 'person-card-name' }, [name]);

    // Details
    const details = this.createElement('div', { className: 'person-card-details' });

    if (this.person.dateOfBirth) {
      const age = this.calculateAge();
      const dobEl = this.createElement('div', {}, [`Age: ${age}`]);
      details.appendChild(dobEl);
    }

    if (this.person.primaryEmail) {
      const emailEl = this.createElement('div', {}, [`Email: ${this.person.primaryEmail}`]);
      details.appendChild(emailEl);
    }

    if (this.person.primaryPhone) {
      const phoneEl = this.createElement('div', {}, [`Phone: ${this.person.primaryPhone}`]);
      details.appendChild(phoneEl);
    }

    const usernameEl = this.createElement('div', {
      className: 'person-card-username'
    }, [`Username: ${this.person.username}`]);
    details.appendChild(usernameEl);

    // Actions
    const actions = this.createElement('div', { className: 'person-card-actions' });

    if (this.onEdit) {
      const editBtn = this.createElement('button', {
        className: 'btn btn-small btn-secondary',
        onClick: this.onEdit
      }, ['Edit']);
      actions.appendChild(editBtn);
    }

    if (this.onDelete) {
      const deleteBtn = this.createElement('button', {
        className: 'btn btn-small btn-danger',
        onClick: this.onDelete
      }, ['Delete']);
      actions.appendChild(deleteBtn);
    }

    // Assemble card
    card.appendChild(nameEl);
    card.appendChild(details);
    card.appendChild(actions);

    return card;
  }
}
