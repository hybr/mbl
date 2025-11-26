/**
 * Input.js - Reusable input component
 */

import { Component } from './Component.js';

class Input extends Component {
  constructor(props = {}) {
    super({
      type: 'text',
      placeholder: '',
      value: '',
      className: 'input',
      onChange: null,
      onEnter: null,
      disabled: false,
      ...props
    });

    this.state = {
      value: this.props.value
    };
  }

  render() {
    const input = document.createElement('input');
    input.type = this.props.type;
    input.className = this.props.className;
    input.placeholder = this.props.placeholder;
    input.value = this.state.value;
    input.disabled = this.props.disabled;

    this.addEventListener(input, 'input', (e) => {
      this.state.value = e.target.value;
      if (this.props.onChange) {
        this.props.onChange(e.target.value);
      }
    });

    if (this.props.onEnter) {
      this.addEventListener(input, 'keypress', (e) => {
        if (e.key === 'Enter') {
          this.props.onEnter(this.state.value);
        }
      });
    }

    return input;
  }

  getValue() {
    return this.state.value;
  }

  setValue(value) {
    this.setState({ value });
    if (this.element) {
      this.element.value = value;
    }
  }

  clear() {
    this.setValue('');
  }

  focus() {
    if (this.element) {
      this.element.focus();
    }
  }
}

export { Input };
