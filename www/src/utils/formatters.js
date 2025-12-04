/**
 * formatters.js
 * Utility functions for formatting data
 */

import { STAGE_LABELS } from '../apps/RecruitmentManagementApp/constants.js';

/**
 * Format status/stage labels
 */
export function formatLabel(value) {
  if (!value) return 'N/A';
  return value
    .toString()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Get stage label
 */
export function getStageLabel(stage) {
  if (!stage) return 'N/A';
  return STAGE_LABELS[stage] || formatLabel(stage);
}

/**
 * Get onboarding status label
 */
export function getOnboardingStatusLabel(status) {
  if (!status) return 'Not Started';
  return formatLabel(status);
}

/**
 * Format datetime values
 */
export function formatDateTime(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString();
  } catch (_) {
    return value;
  }
}

/**
 * Generate UUID
 */
export function generateUUID() {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
