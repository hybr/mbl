/**
 * Card.js
 * Generic reusable card component for list views
 */

/**
 * Card Component
 * A generic card with header, body, and footer sections
 */
export class Card {
  constructor(options = {}) {
    this.className = options.className || 'card';
    this.isActive = options.isActive || false;
    this.createElement = options.createElement;

    // Content sections
    this.headerContent = options.headerContent || null;
    this.bodyContent = options.bodyContent || null;
    this.footerContent = options.footerContent || null;

    // Event handlers
    this.onClick = options.onClick;
  }

  /**
   * Render the card
   * @returns {HTMLElement} Card element
   */
  render() {
    const cardClass = this.isActive ? `${this.className} ${this.className}-active` : this.className;
    const card = this.createElement('div', {
      className: cardClass,
      onClick: this.onClick
    });

    // Header section
    if (this.headerContent) {
      const header = this.createElement('div', { className: `${this.className}-header` });
      if (Array.isArray(this.headerContent)) {
        this.headerContent.forEach(element => {
          if (element) header.appendChild(element);
        });
      } else {
        header.appendChild(this.headerContent);
      }
      card.appendChild(header);
    }

    // Body section
    if (this.bodyContent) {
      const body = this.createElement('div', { className: `${this.className}-body` });
      if (Array.isArray(this.bodyContent)) {
        this.bodyContent.forEach(element => {
          if (element) body.appendChild(element);
        });
      } else {
        body.appendChild(this.bodyContent);
      }
      card.appendChild(body);
    }

    // Footer section
    if (this.footerContent) {
      const footer = this.createElement('div', { className: `${this.className}-footer` });
      if (Array.isArray(this.footerContent)) {
        this.footerContent.forEach(element => {
          if (element) footer.appendChild(element);
        });
      } else {
        footer.appendChild(this.footerContent);
      }
      card.appendChild(footer);
    }

    return card;
  }

  /**
   * Create a card header with logo and content
   * @param {Object} options - Header options
   * @param {HTMLElement} options.logo - Logo element
   * @param {HTMLElement} options.content - Header content element
   * @param {Function} options.createElement - createElement function
   * @returns {HTMLElement} Header element
   */
  static createHeaderWithLogo(options) {
    const { logo, content, createElement } = options;
    const headerContent = [];

    if (logo) {
      const logoContainer = createElement('div', { className: 'card-logo-container' });
      logoContainer.appendChild(logo);
      headerContent.push(logoContainer);
    }

    if (content) {
      const contentWrapper = createElement('div', { className: 'card-header-content' });
      if (Array.isArray(content)) {
        content.forEach(el => contentWrapper.appendChild(el));
      } else {
        contentWrapper.appendChild(content);
      }
      headerContent.push(contentWrapper);
    }

    return headerContent;
  }

  /**
   * Create a card footer with action groups
   * @param {Object} options - Footer options
   * @param {Array} options.primaryActions - Primary action buttons
   * @param {Array} options.secondaryActions - Secondary action buttons
   * @param {Function} options.createElement - createElement function
   * @returns {Array} Footer elements
   */
  static createFooterWithActions(options) {
    const { primaryActions, secondaryActions, createElement } = options;
    const footerContent = [];

    if (primaryActions && primaryActions.length > 0) {
      const primary = createElement('div', { className: 'card-actions-primary' });
      primaryActions.forEach(action => {
        if (action) primary.appendChild(action);
      });
      footerContent.push(primary);
    }

    if (secondaryActions && secondaryActions.length > 0) {
      const secondary = createElement('div', { className: 'card-actions-secondary' });
      secondaryActions.forEach(action => {
        if (action) secondary.appendChild(action);
      });
      footerContent.push(secondary);
    }

    return footerContent;
  }
}
