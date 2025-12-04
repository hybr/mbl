/**
 * SignupView.js
 * Signup view for new user registration
 */

import { Input } from '../../../components/Input.js';

/**
 * Render signup view
 * @param {Object} app - App instance with context
 * @returns {void}
 */
export function renderSignupView(app) {
  // Emit event to close other apps
  app.emit('auth:focus');

  // Add auth-focused class to container
  app.container.classList.add('auth-view');

  // Signup card wrapper
  const authWrapper = app.createElement('div', { className: 'auth-wrapper' });
  const authCard = app.createElement('div', { className: 'auth-card' });

  // Header
  const header = app.createElement('div', { className: 'auth-header' });
  const title = app.createElement('h2', { className: 'auth-title' }, ['Create Account']);
  const subtitle = app.createElement('p', { className: 'auth-subtitle' }, ['Sign up to get started']);

  header.appendChild(title);
  header.appendChild(subtitle);

  // Signup form
  const form = app.createElement('form', {
    className: 'auth-form',
    onsubmit: (e) => {
      e.preventDefault();
      app.performSignup();
    }
  });

  const firstNameGroup = app.createElement('div', { className: 'form-group' });
  const firstNameLabel = app.createElement('label', { className: 'form-label' }, ['First Name']);
  app.components.signupFirstName = new Input({
    placeholder: 'Enter your first name',
    className: 'input input-auth',
    type: 'text'
  });
  firstNameGroup.appendChild(firstNameLabel);
  firstNameGroup.appendChild(app.components.signupFirstName.create());

  const lastNameGroup = app.createElement('div', { className: 'form-group' });
  const lastNameLabel = app.createElement('label', { className: 'form-label' }, ['Last Name']);
  app.components.signupLastName = new Input({
    placeholder: 'Enter your last name',
    className: 'input input-auth',
    type: 'text'
  });
  lastNameGroup.appendChild(lastNameLabel);
  lastNameGroup.appendChild(app.components.signupLastName.create());

  const emailGroup = app.createElement('div', { className: 'form-group' });
  const emailLabel = app.createElement('label', { className: 'form-label' }, ['Email']);
  app.components.signupEmail = new Input({
    placeholder: 'Enter your email',
    className: 'input input-auth',
    type: 'email'
  });
  emailGroup.appendChild(emailLabel);
  emailGroup.appendChild(app.components.signupEmail.create());

  const usernameGroup = app.createElement('div', { className: 'form-group' });
  const usernameLabel = app.createElement('label', { className: 'form-label' }, ['Username']);
  app.components.signupUsername = new Input({
    placeholder: 'Choose a username',
    className: 'input input-auth',
    type: 'text'
  });
  usernameGroup.appendChild(usernameLabel);
  usernameGroup.appendChild(app.components.signupUsername.create());

  const passwordGroup = app.createElement('div', { className: 'form-group' });
  const passwordLabel = app.createElement('label', { className: 'form-label' }, ['Password']);
  app.components.signupPassword = new Input({
    placeholder: 'Create a password',
    className: 'input input-auth',
    type: 'password'
  });
  passwordGroup.appendChild(passwordLabel);
  passwordGroup.appendChild(app.components.signupPassword.create());

  const confirmPasswordGroup = app.createElement('div', { className: 'form-group' });
  const confirmPasswordLabel = app.createElement('label', { className: 'form-label' }, ['Confirm Password']);
  app.components.signupConfirmPassword = new Input({
    placeholder: 'Confirm your password',
    className: 'input input-auth',
    type: 'password'
  });
  confirmPasswordGroup.appendChild(confirmPasswordLabel);
  confirmPasswordGroup.appendChild(app.components.signupConfirmPassword.create());

  const signupBtn = app.createElement('button', {
    className: 'btn btn-primary btn-block btn-auth',
    type: 'submit'
  }, ['Create Account']);

  form.appendChild(firstNameGroup);
  form.appendChild(lastNameGroup);
  form.appendChild(emailGroup);
  form.appendChild(usernameGroup);
  form.appendChild(passwordGroup);
  form.appendChild(confirmPasswordGroup);
  form.appendChild(signupBtn);

  // Login link
  const loginSection = app.createElement('div', { className: 'auth-footer' });
  const loginText = app.createElement('span', { className: 'auth-footer-text' }, ['Already have an account? ']);
  const loginLink = app.createElement('a', {
    href: '#',
    className: 'auth-link-primary',
    onclick: (e) => {
      e.preventDefault();
      app.showLoginView();
    }
  }, ['Sign In']);
  loginSection.appendChild(loginText);
  loginSection.appendChild(loginLink);

  // Assemble
  authCard.appendChild(header);
  authCard.appendChild(form);
  authCard.appendChild(loginSection);
  authWrapper.appendChild(authCard);
  app.container.appendChild(authWrapper);
}
