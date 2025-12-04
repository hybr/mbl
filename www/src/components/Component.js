/**
 * Component.js - Base UI component class
 * Lightweight component system for building reusable UI elements
 */

class Component {
  constructor(props = {}) {
    this.props = props;
    this.state = {};
    this.element = null;
    this.children = [];
    this.eventListeners = [];
  }

  /**
   * Set component state and trigger re-render
   */
  setState(newState) {
    const oldState = { ...this.state };
    this.state = { ...this.state, ...newState };

    if (this.element) {
      this.onStateChange(oldState, this.state);
    }
  }

  /**
   * Lifecycle hook: called when state changes
   */
  onStateChange(oldState, newState) {
    // Override in subclass if needed
  }

  /**
   * Update props and trigger re-render
   */
  updateProps(newProps) {
    this.props = { ...this.props, ...newProps };

    if (this.element) {
      this.update();
    }
  }

  /**
   * Render the component
   * Must be implemented by subclasses
   */
  render() {
    throw new Error('render() must be implemented by subclass');
  }

  /**
   * Create the DOM element
   */
  create() {
    if (this.element) {
      return this.element;
    }

    this.element = this.render();
    return this.element;
  }

  /**
   * Update the component (re-render)
   */
  update() {
    if (!this.element || !this.element.parentNode) {
      return;
    }

    const newElement = this.render();
    this.element.parentNode.replaceChild(newElement, this.element);
    this.element = newElement;
  }

  /**
   * Add event listener with automatic cleanup tracking
   */
  addEventListener(element, event, handler) {
    element.addEventListener(event, handler);
    this.eventListeners.push({ element, event, handler });
  }

  /**
   * Mount component to a parent element
   */
  mount(parent) {
    if (!this.element) {
      this.create();
    }

    if (typeof parent === 'string') {
      parent = document.querySelector(parent);
    }

    if (parent) {
      parent.appendChild(this.element);
    }

    return this.element;
  }

  /**
   * Unmount and destroy component
   */
  destroy() {
    // Remove event listeners
    this.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.eventListeners = [];

    // Destroy children
    this.children.forEach(child => {
      if (child.destroy) {
        child.destroy();
      }
    });
    this.children = [];

    // Remove from DOM
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }

    this.element = null;
  }
}

export { Component };
