/**
 * DOMHelper.js - Utility functions for DOM manipulation
 */

class DOMHelper {
  /**
   * Create element with attributes and children
   */
  static createElement(tag, attributes = {}, children = []) {
    const element = document.createElement(tag);

    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'className') {
        element.className = value;
      } else if (key === 'dataset') {
        Object.entries(value).forEach(([dataKey, dataValue]) => {
          element.dataset[dataKey] = dataValue;
        });
      } else if (key === 'style' && typeof value === 'object') {
        Object.assign(element.style, value);
      } else {
        element.setAttribute(key, value);
      }
    });

    children.forEach(child => {
      if (typeof child === 'string') {
        element.appendChild(document.createTextNode(child));
      } else if (child instanceof HTMLElement) {
        element.appendChild(child);
      }
    });

    return element;
  }

  /**
   * Clear all children from element
   */
  static clearElement(element) {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  /**
   * Add multiple classes
   */
  static addClasses(element, ...classes) {
    element.classList.add(...classes);
  }

  /**
   * Remove multiple classes
   */
  static removeClasses(element, ...classes) {
    element.classList.remove(...classes);
  }

  /**
   * Toggle class
   */
  static toggleClass(element, className) {
    element.classList.toggle(className);
  }

  /**
   * Find closest parent matching selector
   */
  static findParent(element, selector) {
    return element.closest(selector);
  }

  /**
   * Check if element is visible
   */
  static isVisible(element) {
    return !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
  }
}

export { DOMHelper };
