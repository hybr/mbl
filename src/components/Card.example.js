/**
 * Card.example.js
 * Example usage of the generic Card component for different data types
 */

import { Card } from './Card.js';

/**
 * Example: UserCard - A card for displaying user information
 * This demonstrates how to use the generic Card component for different entities
 */
export class UserCard {
  constructor(options = {}) {
    this.user = options.user;
    this.isActive = options.isActive || false;
    this.onView = options.onView;
    this.onEdit = options.onEdit;
    this.onMessage = options.onMessage;
    this.createElement = options.createElement;
  }

  render() {
    // Build header with avatar and name
    const avatar = this.user.avatar
      ? this.createElement('img', {
          className: 'user-avatar',
          src: this.user.avatar,
          alt: this.user.name
        })
      : this.createElement('div', {
          className: 'user-avatar-placeholder'
        }, [this.user.name.charAt(0).toUpperCase()]);

    const name = this.createElement('h3', { className: 'user-name' }, [this.user.name]);
    const email = this.createElement('div', { className: 'user-email' }, [this.user.email]);

    const headerContent = Card.createHeaderWithLogo({
      logo: avatar,
      content: [name, email],
      createElement: this.createElement
    });

    // Build body with user details
    const bodyElements = [];

    if (this.user.role) {
      const role = this.createElement('div', { className: 'user-role' }, [
        `Role: ${this.user.role}`
      ]);
      bodyElements.push(role);
    }

    if (this.user.department) {
      const dept = this.createElement('div', { className: 'user-department' }, [
        `Department: ${this.user.department}`
      ]);
      bodyElements.push(dept);
    }

    // Build footer with actions
    const primaryActions = [];
    const secondaryActions = [];

    if (this.onView) {
      const viewBtn = this.createElement('button', {
        className: 'btn btn-secondary btn-small',
        onClick: this.onView
      }, ['View Profile']);
      primaryActions.push(viewBtn);
    }

    if (this.onMessage) {
      const messageBtn = this.createElement('button', {
        className: 'btn btn-primary btn-small',
        onClick: this.onMessage
      }, ['Send Message']);
      primaryActions.push(messageBtn);
    }

    if (this.onEdit) {
      const editBtn = this.createElement('button', {
        className: 'btn btn-secondary btn-small',
        onClick: this.onEdit
      }, ['Edit']);
      secondaryActions.push(editBtn);
    }

    const footerContent = Card.createFooterWithActions({
      primaryActions,
      secondaryActions,
      createElement: this.createElement
    });

    // Create and render card
    const card = new Card({
      className: 'user-card',
      isActive: this.isActive,
      headerContent,
      bodyContent: bodyElements,
      footerContent,
      createElement: this.createElement
    });

    return card.render();
  }
}

/**
 * Example: ProjectCard - A card for displaying project information
 */
export class ProjectCard {
  constructor(options = {}) {
    this.project = options.project;
    this.onCreate = options.onCreate;
    this.onComplete = options.onComplete;
    this.createElement = options.createElement;
  }

  render() {
    // Build header
    const icon = this.createElement('div', {
      className: 'project-icon'
    }, [this.project.icon || '📁']);

    const title = this.createElement('h3', { className: 'project-title' }, [this.project.title]);
    const status = this.createElement('span', {
      className: `project-status project-status-${this.project.status}`
    }, [this.project.status]);

    const headerContent = Card.createHeaderWithLogo({
      logo: icon,
      content: [title, status],
      createElement: this.createElement
    });

    // Build body
    const bodyElements = [];

    if (this.project.description) {
      const desc = this.createElement('div', { className: 'project-description' }, [
        this.project.description
      ]);
      bodyElements.push(desc);
    }

    const progress = this.createElement('div', { className: 'project-progress' }, [
      `Progress: ${this.project.progress || 0}%`
    ]);
    bodyElements.push(progress);

    // Build footer
    const primaryActions = [];

    if (this.onCreate) {
      const openBtn = this.createElement('button', {
        className: 'btn btn-primary btn-small',
        onClick: this.onCreate
      }, ['Open Project']);
      primaryActions.push(openBtn);
    }

    if (this.onComplete && this.project.status !== 'completed') {
      const completeBtn = this.createElement('button', {
        className: 'btn btn-success btn-small',
        onClick: this.onComplete
      }, ['Mark Complete']);
      primaryActions.push(completeBtn);
    }

    const footerContent = Card.createFooterWithActions({
      primaryActions,
      secondaryActions: [],
      createElement: this.createElement
    });

    // Create and render card
    const card = new Card({
      className: 'project-card',
      isActive: this.project.status === 'active',
      headerContent,
      bodyContent: bodyElements,
      footerContent,
      createElement: this.createElement
    });

    return card.render();
  }
}
