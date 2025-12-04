/**
 * LoginView.js
 * Login view for user authentication
 */

import { Input } from '../../../components/Input.js';

/**
 * Render login view
 * @param {Object} app - App instance with context
 * @returns {void}
 */
export function renderLoginView(app) {
  // Emit event to close other apps
  app.emit('auth:focus');

  // Add auth-focused class to container
  app.container.classList.add('auth-view');

  // Login card wrapper
  const authWrapper = app.createElement('div', { className: 'auth-wrapper' });
  const authCard = app.createElement('div', { className: 'auth-card' });

  // Header
  const header = app.createElement('div', { className: 'auth-header' });
  const title = app.createElement('h2', { className: 'auth-title' }, ['Welcome Back']);
  const subtitle = app.createElement('p', { className: 'auth-subtitle' }, ['Sign in to your account']);

  header.appendChild(title);
  header.appendChild(subtitle);

  // Login form
  const form = app.createElement('form', {
    className: 'auth-form',
    onsubmit: (e) => {
      e.preventDefault();
      app.performLogin();
    }
  });

  const usernameGroup = app.createElement('div', { className: 'form-group' });
  const usernameLabel = app.createElement('label', { className: 'form-label' }, ['Username']);
  app.components.loginUsername = new Input({
    placeholder: 'Enter your username',
    className: 'input input-auth',
    type: 'text'
  });
  usernameGroup.appendChild(usernameLabel);
  usernameGroup.appendChild(app.components.loginUsername.create());

  const passwordGroup = app.createElement('div', { className: 'form-group' });
  const passwordLabel = app.createElement('label', { className: 'form-label' }, ['Password']);
  app.components.loginPassword = new Input({
    placeholder: 'Enter your password',
    className: 'input input-auth',
    type: 'password'
  });
  passwordGroup.appendChild(passwordLabel);
  passwordGroup.appendChild(app.components.loginPassword.create());

  // Forgot password link
  const forgotLink = app.createElement('div', { className: 'auth-link-container' });
  const forgotBtn = app.createElement('a', {
    href: '#',
    className: 'auth-link-text',
    onclick: (e) => {
      e.preventDefault();
      app.showForgotPasswordView();
    }
  }, ['Forgot password?']);
  forgotLink.appendChild(forgotBtn);

  const loginBtn = app.createElement('button', {
    className: 'btn btn-primary btn-block btn-auth',
    type: 'submit'
  }, ['Sign In']);

  form.appendChild(usernameGroup);
  form.appendChild(passwordGroup);
  form.appendChild(forgotLink);
  form.appendChild(loginBtn);

  // Sign up link
  const signupSection = app.createElement('div', { className: 'auth-footer' });
  const signupText = app.createElement('span', { className: 'auth-footer-text' }, ["Don't have an account? "]);
  const signupLink = app.createElement('a', {
    href: '#',
    className: 'auth-link-primary',
    onclick: (e) => {
      e.preventDefault();
      app.showSignupView();
    }
  }, ['Sign Up']);
  signupSection.appendChild(signupText);
  signupSection.appendChild(signupLink);

  // Assemble
  authCard.appendChild(header);
  authCard.appendChild(form);
  authCard.appendChild(signupSection);
  authWrapper.appendChild(authCard);
  app.container.appendChild(authWrapper);
}
