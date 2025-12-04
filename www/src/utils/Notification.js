/**
 * Notification.js - Simple toast notification system
 * Now delegates to MessageService for backward compatibility
 */

class Notification {
  static show(message, type = 'info', duration = 3000) {
    // Delegate to MessageService if available
    if (typeof window !== 'undefined' && window.messageService) {
      window.messageService.sendToast(message, type, duration);
      return;
    }

    // Fallback to legacy implementation
    this._showLegacy(message, type, duration);
  }

  static _showLegacy(message, type = 'info', duration = 3000) {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    // Add to body
    document.body.appendChild(toast);

    // Trigger animation
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    // Auto remove
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, duration);
  }

  static success(message, duration) {
    this.show(message, 'success', duration);
  }

  static error(message, duration) {
    this.show(message, 'error', duration);
  }

  static warning(message, duration) {
    this.show(message, 'warning', duration);
  }

  static info(message, duration) {
    this.show(message, 'info', duration);
  }
}

export { Notification };
