/**
 * List.js - Reusable list component
 */

import { Component } from './Component.js';

class List extends Component {
  constructor(props = {}) {
    super({
      items: [],
      className: 'list',
      itemClassName: 'list-item',
      renderItem: null,
      onItemClick: null,
      emptyMessage: 'No items',
      ...props
    });
  }

  render() {
    const list = document.createElement('div');
    list.className = this.props.className;

    if (this.props.items.length === 0) {
      const emptyMessage = document.createElement('div');
      emptyMessage.className = 'list-empty';
      emptyMessage.textContent = this.props.emptyMessage;
      list.appendChild(emptyMessage);
    } else {
      this.props.items.forEach((item, index) => {
        const itemElement = this.renderListItem(item, index);
        list.appendChild(itemElement);
      });
    }

    return list;
  }

  renderListItem(item, index) {
    let itemElement;

    if (this.props.renderItem) {
      itemElement = this.props.renderItem(item, index);
    } else {
      itemElement = document.createElement('div');
      itemElement.textContent = typeof item === 'string' ? item : JSON.stringify(item);
    }

    itemElement.className = `${this.props.itemClassName} ${itemElement.className || ''}`.trim();

    if (this.props.onItemClick) {
      this.addEventListener(itemElement, 'click', () => {
        this.props.onItemClick(item, index);
      });
    }

    return itemElement;
  }

  setItems(items) {
    this.props.items = items;
    this.update();
  }

  addItem(item) {
    this.props.items.push(item);
    this.update();
  }

  removeItem(index) {
    this.props.items.splice(index, 1);
    this.update();
  }

  clear() {
    this.props.items = [];
    this.update();
  }
}

export { List };
