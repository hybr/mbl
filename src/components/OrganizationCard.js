/**
 * OrganizationCard.js
 * Reusable organization card component
 */

import { Card } from './Card.js';
import { USER_ROLES } from '../apps/OrganizationApp/constants.js';

/**
 * OrganizationCard Component
 * Displays organization information in a card format
 */
export class OrganizationCard {
  constructor(options = {}) {
    this.org = options.org;
    this.organizationTypes = options.organizationTypes;
    this.industries = options.industries;
    this.isDefault = options.isDefault || false;
    this.onSetDefault = options.onSetDefault;
    this.onView = options.onView;
    this.onEdit = options.onEdit;
    this.onDelete = options.onDelete;
    this.createElement = options.createElement;
  }

  /**
   * Render the organization card
   * @returns {HTMLElement} Card element
   */
  render() {
    // Safety check for required fields
    if (!this.org || !this.org.name) {
      console.warn('Skipping organization with missing name:', this.org);
      return this.createElement('div', { className: 'org-card-error' }, ['Invalid organization data']);
    }

    // Build header content
    const headerContent = this._buildHeader();

    // Build body content
    const bodyContent = this._buildBody();

    // Build footer content
    const footerContent = this._buildFooter();

    // Create card using generic Card component
    const card = new Card({
      className: 'org-card',
      isActive: this.isDefault,
      headerContent,
      bodyContent,
      footerContent,
      createElement: this.createElement
    });

    return card.render();
  }

  /**
   * Build header section with logo and name
   * @private
   * @returns {Array} Header elements
   */
  _buildHeader() {
    // Logo or placeholder
    let logo;
    if (this.org.logo) {
      logo = this.createElement('img', {
        className: 'org-logo',
        src: this.org.logo,
        alt: this.org.name
      });
    } else {
      logo = this.createElement('div', {
        className: 'org-logo-placeholder'
      }, [this.org.name.charAt(0).toUpperCase()]);
    }

    // Name and tagline
    const contentElements = [];
    const name = this.createElement('h3', { className: 'org-name' }, [this.org.name]);
    contentElements.push(name);

    if (this.org.tagline) {
      const tagline = this.createElement('div', { className: 'org-tagline' }, [this.org.tagline]);
      contentElements.push(tagline);
    }

    return Card.createHeaderWithLogo({
      logo,
      content: contentElements,
      createElement: this.createElement
    });
  }

  /**
   * Build body section with metadata
   * @private
   * @returns {Array} Body elements
   */
  _buildBody() {
    const bodyElements = [];

    // Get type and industry names
    const orgType = this.organizationTypes.find(t => t.id === this.org.legalTypeId);
    const industry = this.industries.find(i => i.id === this.org.industryId);

    const metadata = this.createElement('div', { className: 'org-metadata' });

    // Show user's role in the organization
    if (this.org._userRole) {
      const roleClass = this.org._userRole === USER_ROLES.OWNER ? 'org-role-owner' : 'org-role-worker';
      const roleText = this.org._userRole === USER_ROLES.OWNER ? '👑 Owner' : '👤 Worker';
      const role = this.createElement('span', {
        className: `org-meta-item ${roleClass}`
      }, [roleText]);
      metadata.appendChild(role);
    }

    if (orgType) {
      const type = this.createElement('span', { className: 'org-meta-item' }, [
        `${orgType.abbreviation || orgType.type_name}`
      ]);
      metadata.appendChild(type);
    }

    if (industry) {
      const ind = this.createElement('span', { className: 'org-meta-item' }, [
        `${industry.icon} ${industry.name}`
      ]);
      metadata.appendChild(ind);
    }

    bodyElements.push(metadata);

    // Subdomain
    if (this.org.subdomain) {
      const subdomain = this.createElement('div', { className: 'org-subdomain' }, [
        `${this.org.subdomain}.v4l.app`
      ]);
      bodyElements.push(subdomain);
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

    // Primary actions (View, Edit, Delete)
    if (this.onView) {
      const viewBtn = this.createElement('button', {
        className: 'btn btn-secondary btn-small',
        onClick: this.onView
      }, ['View']);
      primaryActions.push(viewBtn);
    }

    if (this.onEdit) {
      const editBtn = this.createElement('button', {
        className: 'btn btn-primary btn-small',
        onClick: this.onEdit
      }, ['Edit']);
      primaryActions.push(editBtn);
    }

    if (this.onDelete) {
      const deleteBtn = this.createElement('button', {
        className: 'btn btn-danger btn-small',
        onClick: this.onDelete
      }, ['Delete']);
      primaryActions.push(deleteBtn);
    }

    // Secondary actions (Set Default, Visit Site)
    if (this.onSetDefault) {
      const setDefaultBtnClass = this.isDefault
        ? 'btn btn-success btn-small org-default-btn-active'
        : 'btn btn-secondary btn-small';
      const setDefaultBtnText = this.isDefault ? '✓ Default' : 'Set as Default';

      const setDefaultBtn = this.createElement('button', {
        className: setDefaultBtnClass,
        onClick: this.onSetDefault
      }, [setDefaultBtnText]);
      secondaryActions.push(setDefaultBtn);
    }

    if (this.org.subdomain) {
      const visitBtn = this.createElement('button', {
        className: 'btn btn-info btn-small',
        onClick: () => window.open(`https://${this.org.subdomain}.v4l.app`, '_blank')
      }, ['Visit Site']);
      secondaryActions.push(visitBtn);
    }

    return Card.createFooterWithActions({
      primaryActions,
      secondaryActions,
      createElement: this.createElement
    });
  }
}
