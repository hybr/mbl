/**
 * ErrorHandler.js - Global error handling utilities
 */

import { LoggerFactory } from '../core/Logger.js';
import { eventBus } from '../core/EventBus.js';

class ErrorHandler {
  static logger = LoggerFactory.getLogger('ErrorHandler');

  /**
   * Handle and log error
   */
  static handle(error, context = '') {
    this.logger.error(`${context}:`, error);

    // Emit error event
    eventBus.emit('error', { error, context });

    // Show user-friendly message
    this.showError(error, context);
  }

  /**
   * Show error to user
   */
  static showError(error, context = '') {
    // This can be customized to show toast/modal/etc
    console.error(`Error in ${context}:`, error.message || error);
  }

  /**
   * Async error wrapper
   */
  static async asyncWrapper(fn, context = '') {
    try {
      return await fn();
    } catch (error) {
      this.handle(error, context);
      throw error;
    }
  }

  /**
   * Wrap function with error handling
   */
  static wrap(fn, context = '') {
    return (...args) => {
      try {
        const result = fn(...args);
        if (result instanceof Promise) {
          return result.catch(error => {
            this.handle(error, context);
            throw error;
          });
        }
        return result;
      } catch (error) {
        this.handle(error, context);
        throw error;
      }
    };
  }
}

export { ErrorHandler };
