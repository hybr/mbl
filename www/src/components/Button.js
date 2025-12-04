/**
 * Button.js - Reusable button component
 */

import { Component } from './Component.js';

class Button extends Component {
  constructor(props = {}) {
    super({
      text: 'Button',
      className: 'btn',
      onClick: null,
      disabled: false,
      type: 'button',
      ...props
    });
  }

  render() {
    const button = document.createElement('button');
    button.type = this.props.type;
    button.className = this.props.className;
    button.textContent = this.props.text;
    button.disabled = this.props.disabled;

    if (this.props.onClick) {
      this.addEventListener(button, 'click', this.props.onClick);
    }

    return button;
  }

  enable() {
    if (this.element) {
      this.element.disabled = false;
    }
  }

  disable() {
    if (this.element) {
      this.element.disabled = true;
    }
  }

  setText(text) {
    this.props.text = text;
    if (this.element) {
      this.element.textContent = text;
    }
  }
}

export { Button };
