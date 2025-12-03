/**
 * StatusBadge.js
 * Reusable status badge component
 */

export function createStatusBadge(createElement, status, label) {
  return createElement('span', {
    className: `status-badge status-${status}`
  }, [label || status]);
}
