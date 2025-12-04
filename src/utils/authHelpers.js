/**
 * authHelpers.js
 * Shared authentication and validation utilities
 */

import { PASSWORD_CONFIG } from '../apps/PersonManagementApp/constants.js';

/**
 * Hash password (simple demo implementation)
 * In production, use proper hashing like bcrypt
 * @param {string} plainPassword - Plain text password
 * @returns {string} Hashed password
 */
export function hashPassword(plainPassword) {
  // Simple hash for demo - in production use bcrypt or similar
  let hash = 0;
  const combined = plainPassword + PASSWORD_CONFIG.SALT;

  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  return `hash_${Math.abs(hash).toString(36)}`;
}

/**
 * Validate email format
 * @param {string} email - Email address
 * @returns {boolean} True if valid email format
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate username
 * @param {string} username - Username
 * @returns {Object} Validation result { valid: boolean, error: string }
 */
export function validateUsername(username) {
  if (!username || username.trim().length === 0) {
    return { valid: false, error: 'Username is required' };
  }

  if (username.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' };
  }

  if (username.length > 20) {
    return { valid: false, error: 'Username must be less than 20 characters' };
  }

  // Only allow alphanumeric and underscores
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { valid: false, error: 'Username can only contain letters, numbers, and underscores' };
  }

  return { valid: true };
}

/**
 * Validate password
 * @param {string} password - Password
 * @returns {Object} Validation result { valid: boolean, error: string }
 */
export function validatePassword(password) {
  if (!password || password.trim().length === 0) {
    return { valid: false, error: 'Password is required' };
  }

  if (password.length < PASSWORD_CONFIG.MIN_LENGTH) {
    return { valid: false, error: `Password must be at least ${PASSWORD_CONFIG.MIN_LENGTH} characters` };
  }

  return { valid: true };
}

/**
 * Authenticate user
 * @param {Object} db - Database instance
 * @param {Function} findPersonByUsername - Function to find person by username
 * @param {string} username - Username
 * @param {string} password - Password
 * @param {string|null} otp - Optional OTP
 * @param {Object} logger - Logger instance
 * @returns {Promise<Object>} Authentication result
 */
export async function authenticate(db, findPersonByUsername, username, password, otp, logger) {
  try {
    const person = await findPersonByUsername(db, username, logger);

    if (!person) {
      return { success: false, error: 'Invalid username or password' };
    }

    // Check password
    const hashedInput = hashPassword(password);
    if (person.hashedPassword !== hashedInput) {
      // Update failed attempts
      person.failedLoginAttempts = (person.failedLoginAttempts || 0) + 1;
      await db.update(person);

      return { success: false, error: 'Invalid username or password' };
    }

    // Check OTP if required
    if (person.otp && person.otp !== otp) {
      return { success: false, error: 'Invalid OTP' };
    }

    // Update login info
    person.lastLoginTimestamp = new Date().toISOString();
    person.failedLoginAttempts = 0;
    await db.update(person);

    return { success: true, person };

  } catch (error) {
    logger.error('Authentication failed:', error);
    return { success: false, error: 'Authentication failed' };
  }
}
