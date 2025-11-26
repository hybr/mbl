# MiniApp Examples & Recipes

This document provides practical examples for common use cases.

## Table of Contents

1. [Creating a Simple MiniApp](#creating-a-simple-miniapp)
2. [Creating a Complex MiniApp](#creating-a-complex-miniapp)
3. [Inter-App Communication](#inter-app-communication)
4. [Custom Components](#custom-components)
5. [Advanced Database Queries](#advanced-database-queries)
6. [Error Handling](#error-handling)
7. [Performance Optimization](#performance-optimization)
8. [Mobile-Specific Features](#mobile-specific-features)

---

## Creating a Simple MiniApp

### Counter App

```javascript
// src/miniapps/CounterApp.js
import { MiniApp } from '../core/MiniApp.js';
import { Button } from '../components/Button.js';

class CounterApp extends MiniApp {
  constructor(options = {}) {
    super({ name: 'CounterApp', ...options });
    this.count = 0;
    this.components = {};
  }

  async onInit() {
    // Load saved count from database
    const data = await this.db.read('counter_state');
    if (data) {
      this.count = data.count;
    }
  }

  async onRender() {
    this.clearContainer();

    // Header
    const header = this.createElement('div',
      { className: 'miniapp-header' },
      [this.createElement('h2', {}, ['Counter'])]
    );

    // Display
    this.countDisplay = this.createElement('div',
      { className: 'counter-display' },
      [String(this.count)]
    );

    // Buttons
    const btnContainer = this.createElement('div',
      { className: 'counter-buttons' }
    );

    this.components.decrementBtn = new Button({
      text: '-',
      className: 'btn btn-primary',
      onClick: () => this.decrement()
    });

    this.components.incrementBtn = new Button({
      text: '+',
      className: 'btn btn-primary',
      onClick: () => this.increment()
    });

    this.components.resetBtn = new Button({
      text: 'Reset',
      className: 'btn btn-secondary',
      onClick: () => this.reset()
    });

    btnContainer.appendChild(this.components.decrementBtn.create());
    btnContainer.appendChild(this.components.incrementBtn.create());
    btnContainer.appendChild(this.components.resetBtn.create());

    // Assemble
    this.container.appendChild(header);
    this.container.appendChild(this.countDisplay);
    this.container.appendChild(btnContainer);
  }

  async increment() {
    this.count++;
    this.updateDisplay();
    await this.saveState();
  }

  async decrement() {
    this.count--;
    this.updateDisplay();
    await this.saveState();
  }

  async reset() {
    this.count = 0;
    this.updateDisplay();
    await this.saveState();
  }

  updateDisplay() {
    if (this.countDisplay) {
      this.countDisplay.textContent = String(this.count);
    }
  }

  async saveState() {
    try {
      const existing = await this.db.read('counter_state');
      if (existing) {
        existing.count = this.count;
        await this.db.update(existing);
      } else {
        await this.db.create({
          _id: 'counter_state',
          type: 'app_state',
          count: this.count
        });
      }
    } catch (error) {
      this.logger.error('Failed to save state:', error);
    }
  }

  onDestroy() {
    Object.values(this.components).forEach(c => c.destroy?.());
  }
}

export { CounterApp };
```

---

## Creating a Complex MiniApp

### Chat App with Real-time Updates

```javascript
// src/miniapps/ChatApp.js
import { MiniApp } from '../core/MiniApp.js';
import { Input } from '../components/Input.js';
import { Button } from '../components/Button.js';
import { List } from '../components/List.js';

class ChatApp extends MiniApp {
  constructor(options = {}) {
    super({ name: 'ChatApp', ...options });
    this.messages = [];
    this.currentUser = options.userId || 'anonymous';
    this.components = {};
  }

  async onInit() {
    // Subscribe to message changes
    this.subscribeToData('message', (change) => {
      this.handleMessageChange(change);
    });

    // Listen to user events
    this.subscribe('user:login', (user) => {
      this.currentUser = user.id;
      this.updateUserDisplay();
    });

    // Load messages
    await this.loadMessages();
  }

  async onRender() {
    this.clearContainer();

    // Header with user info
    const header = this.createElement('div', { className: 'miniapp-header' });
    const title = this.createElement('h2', {}, ['Chat']);
    const userInfo = this.createElement('div',
      { className: 'chat-user-info' },
      [`Logged in as: ${this.currentUser}`]
    );
    this.components.userInfo = userInfo;

    header.appendChild(title);
    header.appendChild(userInfo);

    // Messages list
    const messagesContainer = this.createElement('div',
      { className: 'chat-messages-container' }
    );

    this.components.messagesList = new List({
      items: this.messages,
      className: 'chat-messages',
      itemClassName: 'chat-message',
      renderItem: (msg) => this.renderMessage(msg),
      emptyMessage: 'No messages yet. Start the conversation!'
    });

    messagesContainer.appendChild(this.components.messagesList.create());

    // Input section
    const inputSection = this.createElement('div',
      { className: 'chat-input-section' }
    );

    this.components.messageInput = new Input({
      placeholder: 'Type a message...',
      className: 'input',
      onEnter: () => this.sendMessage()
    });

    this.components.sendBtn = new Button({
      text: 'Send',
      className: 'btn btn-primary',
      onClick: () => this.sendMessage()
    });

    inputSection.appendChild(this.components.messageInput.create());
    inputSection.appendChild(this.components.sendBtn.create());

    // Assemble
    this.container.appendChild(header);
    this.container.appendChild(messagesContainer);
    this.container.appendChild(inputSection);

    // Auto-scroll to bottom
    this.scrollToBottom();
  }

  renderMessage(message) {
    const isOwnMessage = message.userId === this.currentUser;

    const messageEl = this.createElement('div', {
      className: `chat-message-content ${isOwnMessage ? 'own' : 'other'}`
    });

    const author = this.createElement('div',
      { className: 'chat-message-author' },
      [message.userId]
    );

    const text = this.createElement('div',
      { className: 'chat-message-text' },
      [message.text]
    );

    const time = this.createElement('div',
      { className: 'chat-message-time' },
      [new Date(message.createdAt).toLocaleTimeString()]
    );

    messageEl.appendChild(author);
    messageEl.appendChild(text);
    messageEl.appendChild(time);

    return messageEl;
  }

  async loadMessages() {
    try {
      const messages = await this.db.query({
        selector: { type: 'message' },
        sort: [{ createdAt: 'asc' }],
        limit: 100
      });

      this.messages = messages;

      if (this.isRendered && this.components.messagesList) {
        this.components.messagesList.setItems(this.messages);
        this.scrollToBottom();
      }
    } catch (error) {
      this.logger.error('Failed to load messages:', error);
    }
  }

  async sendMessage() {
    const text = this.components.messageInput.getValue().trim();

    if (!text) {
      this.logger.warn('Message is empty');
      return;
    }

    try {
      const message = {
        _id: `message_${Date.now()}_${Math.random()}`,
        type: 'message',
        text,
        userId: this.currentUser
      };

      await this.db.create(message);

      // Clear input
      this.components.messageInput.clear();
      this.components.messageInput.focus();

      // Emit event
      this.emit('message:sent', message);

    } catch (error) {
      this.logger.error('Failed to send message:', error);
    }
  }

  handleMessageChange(change) {
    if (change.deleted) {
      this.messages = this.messages.filter(m => m._id !== change.id);
    } else {
      const index = this.messages.findIndex(m => m._id === change.doc._id);
      if (index >= 0) {
        this.messages[index] = change.doc;
      } else {
        this.messages.push(change.doc);
        // Sort by creation time
        this.messages.sort((a, b) =>
          new Date(a.createdAt) - new Date(b.createdAt)
        );
      }
    }

    if (this.isRendered && this.components.messagesList) {
      this.components.messagesList.setItems(this.messages);
      this.scrollToBottom();
    }
  }

  updateUserDisplay() {
    if (this.components.userInfo) {
      this.components.userInfo.textContent = `Logged in as: ${this.currentUser}`;
    }
  }

  scrollToBottom() {
    setTimeout(() => {
      const container = this.container.querySelector('.chat-messages-container');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 100);
  }

  onDestroy() {
    Object.values(this.components).forEach(c => c.destroy?.());
  }
}

export { ChatApp };
```

---

## Inter-App Communication

### Example: Note to Task Converter

```javascript
// In NotesApp - emit event when note created
async addNote() {
  const note = await this.db.create({
    _id: `note_${Date.now()}`,
    type: 'note',
    title: this.title,
    content: this.content
  });

  // Emit event with note data
  this.emit('note:created', note);
}

// In TasksApp - listen for note creation
async onInit() {
  this.subscribe('note:created', (note) => {
    this.offerToConvertToTask(note);
  });
}

offerToConvertToTask(note) {
  if (confirm(`Convert note "${note.title}" to a task?`)) {
    this.createTaskFromNote(note);
  }
}

async createTaskFromNote(note) {
  await this.db.create({
    _id: `task_${Date.now()}`,
    type: 'task',
    text: note.title,
    completed: false,
    sourceNoteId: note._id
  });

  this.emit('task:created-from-note', { noteId: note._id });
}
```

### Example: Notification System

```javascript
// src/miniapps/NotificationApp.js
class NotificationApp extends MiniApp {
  async onInit() {
    // Listen to all important events
    this.subscribe('note:created', () =>
      this.showNotification('Note created!')
    );

    this.subscribe('task:completed', () =>
      this.showNotification('Task completed!')
    );

    this.subscribe('sync:error', () =>
      this.showNotification('Sync error!', 'error')
    );
  }

  showNotification(message, type = 'success') {
    // Create toast notification
    const toast = this.createElement('div', {
      className: `toast toast-${type}`
    }, [message]);

    document.body.appendChild(toast);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }
}
```

---

## Custom Components

### Dropdown Component

```javascript
// src/components/Dropdown.js
import { Component } from './Component.js';

class Dropdown extends Component {
  constructor(props = {}) {
    super({
      options: [],
      value: null,
      placeholder: 'Select...',
      onChange: null,
      className: 'dropdown',
      ...props
    });

    this.state = {
      isOpen: false,
      selectedValue: this.props.value
    };
  }

  render() {
    const container = document.createElement('div');
    container.className = this.props.className;

    // Selected display
    const selected = document.createElement('div');
    selected.className = 'dropdown-selected';
    selected.textContent = this.getSelectedLabel() || this.props.placeholder;

    this.addEventListener(selected, 'click', () => {
      this.toggleDropdown();
    });

    // Options list
    const optionsList = document.createElement('div');
    optionsList.className = `dropdown-options ${this.state.isOpen ? 'open' : ''}`;

    this.props.options.forEach(option => {
      const optionEl = document.createElement('div');
      optionEl.className = 'dropdown-option';
      optionEl.textContent = option.label;
      optionEl.dataset.value = option.value;

      this.addEventListener(optionEl, 'click', () => {
        this.selectOption(option.value);
      });

      optionsList.appendChild(optionEl);
    });

    container.appendChild(selected);
    container.appendChild(optionsList);

    return container;
  }

  getSelectedLabel() {
    const option = this.props.options.find(
      o => o.value === this.state.selectedValue
    );
    return option ? option.label : null;
  }

  toggleDropdown() {
    this.setState({ isOpen: !this.state.isOpen });
    this.update();
  }

  selectOption(value) {
    this.setState({
      selectedValue: value,
      isOpen: false
    });

    if (this.props.onChange) {
      this.props.onChange(value);
    }

    this.update();
  }

  getValue() {
    return this.state.selectedValue;
  }

  setValue(value) {
    this.setState({ selectedValue: value });
    this.update();
  }
}

export { Dropdown };
```

### Modal Component

```javascript
// src/components/Modal.js
import { Component } from './Component.js';

class Modal extends Component {
  constructor(props = {}) {
    super({
      title: '',
      content: null,
      onClose: null,
      showCloseButton: true,
      ...props
    });
  }

  render() {
    const overlay = document.createElement('div');
    overlay.className = 'modal';

    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';

    // Header
    const header = document.createElement('div');
    header.className = 'modal-header';

    const title = document.createElement('h3');
    title.textContent = this.props.title;
    header.appendChild(title);

    if (this.props.showCloseButton) {
      const closeBtn = document.createElement('button');
      closeBtn.className = 'btn btn-small';
      closeBtn.textContent = '×';
      this.addEventListener(closeBtn, 'click', () => this.close());
      header.appendChild(closeBtn);
    }

    // Content
    const content = document.createElement('div');
    content.className = 'modal-body';

    if (typeof this.props.content === 'string') {
      content.textContent = this.props.content;
    } else if (this.props.content instanceof HTMLElement) {
      content.appendChild(this.props.content);
    }

    modalContent.appendChild(header);
    modalContent.appendChild(content);
    overlay.appendChild(modalContent);

    // Close on overlay click
    this.addEventListener(overlay, 'click', (e) => {
      if (e.target === overlay) {
        this.close();
      }
    });

    return overlay;
  }

  close() {
    if (this.props.onClose) {
      this.props.onClose();
    }
    this.destroy();
  }
}

export { Modal };
```

---

## Advanced Database Queries

### Full-Text Search

```javascript
async searchNotes(searchTerm) {
  // Create index first (do this once at init)
  await this.db.createIndex(['type', 'title', 'content']);

  // Query with regex
  const results = await this.db.query({
    selector: {
      type: 'note',
      $or: [
        { title: { $regex: new RegExp(searchTerm, 'i') } },
        { content: { $regex: new RegExp(searchTerm, 'i') } }
      ]
    },
    sort: [{ createdAt: 'desc' }]
  });

  return results;
}
```

### Pagination

```javascript
class PaginatedListApp extends MiniApp {
  constructor(options) {
    super(options);
    this.pageSize = 20;
    this.currentPage = 0;
    this.items = [];
  }

  async loadPage(page) {
    const skip = page * this.pageSize;

    const results = await this.db.query({
      selector: { type: 'item' },
      sort: [{ createdAt: 'desc' }],
      limit: this.pageSize,
      skip: skip
    });

    this.items = results;
    this.currentPage = page;
    this.updateUI();
  }

  async nextPage() {
    await this.loadPage(this.currentPage + 1);
  }

  async prevPage() {
    if (this.currentPage > 0) {
      await this.loadPage(this.currentPage - 1);
    }
  }
}
```

### Aggregation

```javascript
async getTaskStatistics() {
  // Get all tasks
  const tasks = await this.db.query({
    selector: { type: 'task' }
  });

  // Aggregate data
  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.completed).length,
    active: tasks.filter(t => !t.completed).length,
    byDate: {}
  };

  // Group by date
  tasks.forEach(task => {
    const date = task.createdAt.split('T')[0];
    if (!stats.byDate[date]) {
      stats.byDate[date] = 0;
    }
    stats.byDate[date]++;
  });

  return stats;
}
```

---

## Error Handling

### Graceful Degradation

```javascript
async onRender() {
  try {
    await this.loadData();
    this.renderContent();
  } catch (error) {
    this.logger.error('Render failed:', error);
    this.renderError('Failed to load data. Please try again.');
  }
}

renderError(message) {
  this.clearContainer();

  const errorDiv = this.createElement('div',
    { className: 'error-message' },
    [message]
  );

  const retryBtn = this.createElement('button', {
    className: 'btn btn-primary',
    onClick: () => this.render()
  }, ['Retry']);

  this.container.appendChild(errorDiv);
  this.container.appendChild(retryBtn);
}
```

### Offline Mode Indicator

```javascript
class OfflineIndicatorApp extends MiniApp {
  async onInit() {
    this.subscribe('network:online', () => this.updateStatus(true));
    this.subscribe('network:offline', () => this.updateStatus(false));
  }

  async onRender() {
    this.statusDiv = this.createElement('div', {
      className: `offline-indicator ${navigator.onLine ? 'hidden' : ''}`
    }, ['You are offline. Changes will sync when online.']);

    this.container.appendChild(this.statusDiv);
  }

  updateStatus(isOnline) {
    if (this.statusDiv) {
      this.statusDiv.classList.toggle('hidden', isOnline);
    }
  }
}
```

---

## Performance Optimization

### Virtual Scrolling

```javascript
class VirtualListApp extends MiniApp {
  constructor(options) {
    super(options);
    this.allItems = [];
    this.visibleItems = [];
    this.itemHeight = 50;
    this.visibleCount = 20;
    this.scrollTop = 0;
  }

  onScroll(event) {
    this.scrollTop = event.target.scrollTop;
    this.updateVisibleItems();
  }

  updateVisibleItems() {
    const startIndex = Math.floor(this.scrollTop / this.itemHeight);
    const endIndex = startIndex + this.visibleCount;

    this.visibleItems = this.allItems.slice(startIndex, endIndex);
    this.renderVisibleItems(startIndex);
  }

  renderVisibleItems(startIndex) {
    const container = this.container.querySelector('.list');
    container.innerHTML = '';

    // Add offset for scroll position
    container.style.paddingTop = `${startIndex * this.itemHeight}px`;

    this.visibleItems.forEach(item => {
      const el = this.renderItem(item);
      container.appendChild(el);
    });
  }
}
```

### Debounced Search

```javascript
class SearchApp extends MiniApp {
  constructor(options) {
    super(options);
    this.searchTimeout = null;
    this.searchDelay = 300; // ms
  }

  onSearchInput(value) {
    // Clear previous timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    // Set new timeout
    this.searchTimeout = setTimeout(() => {
      this.performSearch(value);
    }, this.searchDelay);
  }

  async performSearch(query) {
    const results = await this.db.query({
      selector: {
        type: 'item',
        name: { $regex: new RegExp(query, 'i') }
      }
    });

    this.updateResults(results);
  }
}
```

---

## Mobile-Specific Features

### Capacitor Camera Integration

```javascript
// src/miniapps/PhotoApp.js
import { Camera, CameraResultType } from '@capacitor/camera';

class PhotoApp extends MiniApp {
  async takePicture() {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl
      });

      // Save to database
      await this.db.create({
        _id: `photo_${Date.now()}`,
        type: 'photo',
        data: image.dataUrl
      });

      this.emit('photo:taken', { id: result._id });

    } catch (error) {
      this.logger.error('Camera error:', error);
    }
  }
}
```

### Pull-to-Refresh

```javascript
class RefreshableApp extends MiniApp {
  async onRender() {
    // ... render content

    let startY = 0;
    let pulling = false;

    this.addEventListener(this.container, 'touchstart', (e) => {
      if (this.container.scrollTop === 0) {
        startY = e.touches[0].pageY;
        pulling = true;
      }
    });

    this.addEventListener(this.container, 'touchmove', (e) => {
      if (pulling) {
        const deltaY = e.touches[0].pageY - startY;
        if (deltaY > 100) {
          this.showRefreshIndicator();
        }
      }
    });

    this.addEventListener(this.container, 'touchend', async (e) => {
      if (pulling) {
        const deltaY = e.changedTouches[0].pageY - startY;
        if (deltaY > 100) {
          await this.refresh();
        }
        this.hideRefreshIndicator();
        pulling = false;
      }
    });
  }

  async refresh() {
    await this.loadData();
    this.render();
  }
}
```

---

These examples demonstrate the flexibility and power of the MiniApp architecture. You can mix and match patterns to build complex, real-world applications.
