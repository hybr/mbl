/**
 * VacancyCard.js
 * Reusable vacancy card component
 */

import { Card } from './Card.js';
import { createStatusBadge } from './StatusBadge.js';

/**
 * VacancyCard Component
 * Displays vacancy information in a card format
 */
export class VacancyCard {
  constructor(options = {}) {
    this.vacancy = options.vacancy;
    this.isPublic = options.isPublic || false;
    this.getOrganizationName = options.getOrganizationName;
    this.getDepartmentName = options.getDepartmentName;
    this.onViewDetails = options.onViewDetails;
    this.onApply = options.onApply;
    this.onEdit = options.onEdit;
    this.onViewApplications = options.onViewApplications;
    this.hasApplied = options.hasApplied || false;
    this.currentUser = options.currentUser;
    this.createElement = options.createElement;
  }

  /**
   * Render the vacancy card
   * @returns {HTMLElement} Card element
   */
  render() {
    // Safety check
    if (!this.vacancy || !this.vacancy.title) {
      console.warn('Skipping vacancy with missing title:', this.vacancy);
      return this.createElement('div', { className: 'vacancy-card-error' }, ['Invalid vacancy data']);
    }

    // Build header content
    const headerContent = this._buildHeader();

    // Build body content
    const bodyContent = this._buildBody();

    // Build footer content
    const footerContent = this._buildFooter();

    // Create card using generic Card component
    const card = new Card({
      className: 'vacancy-card',
      isActive: false,
      headerContent,
      bodyContent,
      footerContent,
      createElement: this.createElement
    });

    return card.render();
  }

  /**
   * Build header section with title and organization
   * @private
   * @returns {Array} Header elements
   */
  _buildHeader() {
    // Icon placeholder for vacancy (briefcase emoji)
    const icon = this.createElement('div', {
      className: 'vacancy-icon'
    }, ['💼']);

    // Title and organization
    const contentElements = [];
    const title = this.createElement('h3', { className: 'vacancy-title' }, [
      this.vacancy.title || 'Untitled Position'
    ]);
    contentElements.push(title);

    const orgName = this.getOrganizationName(this.vacancy.organizationId);
    const orgInfo = this.createElement('div', { className: 'vacancy-org' }, [orgName]);
    contentElements.push(orgInfo);

    return Card.createHeaderWithLogo({
      logo: icon,
      content: contentElements,
      createElement: this.createElement
    });
  }

  /**
   * Build body section with details
   * @private
   * @returns {Array} Body elements
   */
  _buildBody() {
    const bodyElements = [];

    // Department
    const deptName = this.getDepartmentName(this.vacancy.departmentCode);
    const deptInfo = this.createElement('div', { className: 'vacancy-department' }, [
      `Department: ${deptName || 'N/A'}`
    ]);
    bodyElements.push(deptInfo);

    // Status badge
    const statusBadge = createStatusBadge(
      this.createElement,
      this.vacancy.status,
      this.vacancy.status || 'draft'
    );
    bodyElements.push(statusBadge);

    // Experience requirement
    if (this.vacancy.workExperienceYears) {
      const experience = this.createElement('div', { className: 'vacancy-experience' }, [
        `Experience: ${this.vacancy.workExperienceYears} years`
      ]);
      bodyElements.push(experience);
    }

    return bodyElements;
  }

  /**
   * Build footer section with action buttons
   * @private
   * @returns {Array} Footer elements
   */
  _buildFooter() {
    const primaryActions = [];
    const secondaryActions = [];

    if (this.isPublic) {
      // Public view actions
      const viewBtn = this.createElement('button', {
        className: 'btn btn-small btn-primary',
        onclick: () => this.onViewDetails(this.vacancy._id)
      }, ['View Details']);
      primaryActions.push(viewBtn);

      if (this.currentUser) {
        if (!this.hasApplied) {
          const applyBtn = this.createElement('button', {
            className: 'btn btn-small btn-secondary',
            onclick: () => this.onApply(this.vacancy._id)
          }, ['Apply']);
          secondaryActions.push(applyBtn);
        } else {
          const appliedBadge = this.createElement('span', {
            className: 'applied-badge'
          }, ['Applied']);
          secondaryActions.push(appliedBadge);
        }
      }
    } else {
      // Organization admin view actions
      const editBtn = this.createElement('button', {
        className: 'btn btn-small btn-secondary',
        onclick: () => this.onEdit(this.vacancy._id)
      }, ['Edit']);
      primaryActions.push(editBtn);

      const appsBtn = this.createElement('button', {
        className: 'btn btn-small btn-primary',
        onclick: () => this.onViewApplications(this.vacancy._id)
      }, ['Applications']);
      primaryActions.push(appsBtn);
    }

    return Card.createFooterWithActions({
      primaryActions,
      secondaryActions,
      createElement: this.createElement
    });
  }
}

// Keep backward compatibility with functional API
export function createVacancyCard(options) {
  const card = new VacancyCard(options);
  return card.render();
}
