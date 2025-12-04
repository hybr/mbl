/**
 * EventBus.js - Global event system for inter-app communication
 * Allows MiniApps to communicate without direct coupling
 */

import { LoggerFactory } from './Logger.js';

class EventBus {
  constructor() {
    this.listeners = new Map();
    this.logger = LoggerFactory.getLogger('EventBus');
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   * @param {Object} context - Context for the callback (usually 'this')
   * @returns {Function} Unsubscribe function
   */
  on(event, callback, context = null) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    const listener = { callback, context };
    this.listeners.get(event).push(listener);

    this.logger.debug(`Subscribed to event: ${event}`);

    // Return unsubscribe function
    return () => this.off(event, callback, context);
  }

  /**
   * Subscribe to an event (one-time only)
   */
  once(event, callback, context = null) {
    const wrapper = (...args) => {
      this.off(event, wrapper);
      callback.apply(context, args);
    };
    return this.on(event, wrapper, context);
  }

  /**
   * Unsubscribe from an event
   */
  off(event, callback, context = null) {
    if (!this.listeners.has(event)) return;

    const listeners = this.listeners.get(event);
    const index = listeners.findIndex(
      l => l.callback === callback && l.context === context
    );

    if (index !== -1) {
      listeners.splice(index, 1);
      this.logger.debug(`Unsubscribed from event: ${event}`);
    }

    // Clean up empty listener arrays
    if (listeners.length === 0) {
      this.listeners.delete(event);
    }
  }

  /**
   * Emit an event
   */
  emit(event, ...args) {
    if (!this.listeners.has(event)) {
      this.logger.debug(`No listeners for event: ${event}`);
      return;
    }

    const listeners = this.listeners.get(event);
    this.logger.debug(`Emitting event: ${event} to ${listeners.length} listeners`);

    // Clone array to prevent issues if listeners modify subscriptions
    [...listeners].forEach(({ callback, context }) => {
      try {
        callback.apply(context, args);
      } catch (error) {
        this.logger.error(`Error in event listener for ${event}:`, error);
      }
    });
  }

  /**
   * Remove all listeners for an event, or all events
   */
  clear(event = null) {
    if (event) {
      this.listeners.delete(event);
      this.logger.debug(`Cleared all listeners for event: ${event}`);
    } else {
      this.listeners.clear();
      this.logger.debug('Cleared all event listeners');
    }
  }

  /**
   * Get listener count for an event
   */
  listenerCount(event) {
    return this.listeners.has(event) ? this.listeners.get(event).length : 0;
  }

  /**
   * Get all registered events
   */
  getEvents() {
    return Array.from(this.listeners.keys());
  }
}

// Global singleton instance
const eventBus = new EventBus();

export { EventBus, eventBus };