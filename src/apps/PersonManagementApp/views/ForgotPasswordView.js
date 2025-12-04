/**
 * ForgotPasswordView.js
 * Forgot password view for password recovery
 */

import { Input } from '../../../components/Input.js';

/**
 * Render forgot password view
 * @param {Object} app - App instance with context
 * @returns {void}
 */
export function renderForgotPasswordView(app) {
  // Emit event to close other apps
  app.emit('auth:focus');

  // Add auth-focused class to container
  app.container.classList.add('auth-view');

  // Forgot password card wrapper
  const authWrapper = app.createElement('div', { className: 'auth-wrapper' });
  const authCard = app.createElement('div', { className: 'auth-card' });

  // Header
  const header = app.createElement('div', { className: 'auth-header' });
  const title = app.createElement('h2', { className: 'auth-title' }, ['Forgot Password']);
  const subtitle = app.createElement('p', { className: 'auth-subtitle' }, ['Enter your email to reset your password']);

  header.appendChild(title);
  header.appendChild(subtitle);

  // Form
  const form = app.createElement('form', {
    className: 'auth-form',
    onsubmit: (e) => {
      e.preventDefault();
      app.performPasswordReset();
    }
  });

  const emailGroup = app.createElement('div', { className: 'form-group' });
  const emailLabel = app.createElement('label', { className: 'form-label' }, ['Email']);
  app.components.resetEmail = new Input({
    placeholder: 'Enter your email',
    className: 'input input-auth',
    type: 'email'
  });
  emailGroup.appendChild(emailLabel);
  emailGroup.appendChild(app.components.resetEmail.create());

  const resetBtn = app.createElement('button', {
    className: 'btn btn-primary btn-block btn-auth',
    type: 'submit'
  }, ['Send Reset Link']);

  form.appendChild(emailGroup);
  form.appendChild(resetBtn);

  // Back to login link
  const loginSection = app.createElement('div', { className: 'auth-footer' });
  const loginLink = app.createElement('a', {
    href: '#',
    className: 'auth-link-primary',
    onclick: (e) => {
      e.preventDefault();
      app.showLoginView();
    }
  }, ['← Back to Sign In']);
  loginSection.appendChild(loginLink);

  // Assemble
  authCard.appendChild(header);
  authCard.appendChild(form);
  authCard.appendChild(loginSection);
  authWrapper.appendChild(authCard);
  app.container.appendChild(authWrapper);
}
