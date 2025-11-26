/**
 * TasksApp.js - Example MiniApp for task management
 * Demonstrates real-time updates and inter-app communication
 */

import { MiniApp } from '../core/MiniApp.js';
import { Button } from '../components/Button.js';
import { Input } from '../components/Input.js';
import { List } from '../components/List.js';
import { Notification } from '../utils/Notification.js';

class TasksApp extends MiniApp {
  constructor(options = {}) {
    super({
      name: 'TasksApp',
      ...options
    });

    this.tasks = [];
    this.components = {};
    this.filter = 'all'; // all, active, completed
  }

  async onInit() {
    this.logger.info('Initializing TasksApp');

    // Subscribe to task changes from database
    this.subscribeToData('task', (change) => {
      this.handleTaskChange(change);
    });

    // Listen to note events (example of inter-app communication)
    this.subscribe('note:created', (note) => {
      this.logger.debug('Note created event received:', note);
      // Could auto-create a task from a note, for example
    });

    // Load existing tasks
    await this.loadTasks();
  }

  async onRender() {
    this.clearContainer();

    // Create header
    const header = this.createElement('div', { className: 'miniapp-header' }, [
      this.createElement('h2', {}, ['Tasks'])
    ]);

    // Create input section
    const inputSection = this.createElement('div', { className: 'tasks-input-section' });

    this.components.taskInput = new Input({
      placeholder: 'Add a new task...',
      className: 'input input-task',
      onEnter: () => this.addTask()
    });

    this.components.addButton = new Button({
      text: 'Add Task',
      className: 'btn btn-primary',
      onClick: () => this.addTask()
    });

    inputSection.appendChild(this.components.taskInput.create());
    inputSection.appendChild(this.components.addButton.create());

    // Create filter buttons
    const filterSection = this.createElement('div', { className: 'tasks-filter-section' });

    this.components.filterAll = new Button({
      text: 'All',
      className: `btn btn-filter ${this.filter === 'all' ? 'active' : ''}`,
      onClick: () => this.setFilter('all')
    });

    this.components.filterActive = new Button({
      text: 'Active',
      className: `btn btn-filter ${this.filter === 'active' ? 'active' : ''}`,
      onClick: () => this.setFilter('active')
    });

    this.components.filterCompleted = new Button({
      text: 'Completed',
      className: `btn btn-filter ${this.filter === 'completed' ? 'active' : ''}`,
      onClick: () => this.setFilter('completed')
    });

    filterSection.appendChild(this.components.filterAll.create());
    filterSection.appendChild(this.components.filterActive.create());
    filterSection.appendChild(this.components.filterCompleted.create());

    // Create stats
    const stats = this.createElement('div', { className: 'tasks-stats' }, [
      this.getStatsText()
    ]);
    this.components.stats = stats;

    // Create tasks list
    const listContainer = this.createElement('div', { className: 'tasks-list-container' });

    this.components.tasksList = new List({
      items: this.getFilteredTasks(),
      className: 'tasks-list',
      itemClassName: 'task-item',
      renderItem: (task) => this.renderTaskItem(task),
      emptyMessage: 'No tasks yet. Add your first task!'
    });

    listContainer.appendChild(this.components.tasksList.create());

    // Assemble UI
    this.container.appendChild(header);
    this.container.appendChild(inputSection);
    this.container.appendChild(filterSection);
    this.container.appendChild(stats);
    this.container.appendChild(listContainer);

    this.logger.debug('TasksApp rendered');
  }

  renderTaskItem(task) {
    const item = this.createElement('div', {
      className: `task-content ${task.completed ? 'completed' : ''}`
    });

    const checkbox = this.createElement('input', {
      type: 'checkbox',
      className: 'task-checkbox'
    });
    checkbox.checked = task.completed;

    this.addEventListener(checkbox, 'change', () => {
      this.toggleTask(task);
    });

    const text = this.createElement('div', { className: 'task-text' }, [task.text]);
    const timestamp = this.createElement('div', {
      className: 'task-timestamp'
    }, [new Date(task.createdAt).toLocaleString()]);

    const deleteBtn = this.createElement('button', {
      className: 'btn btn-danger btn-small',
      onClick: () => this.deleteTask(task)
    }, ['Delete']);

    const actions = this.createElement('div', { className: 'task-actions' });
    actions.appendChild(deleteBtn);

    item.appendChild(checkbox);
    item.appendChild(text);
    item.appendChild(timestamp);
    item.appendChild(actions);

    return item;
  }

  async loadTasks() {
    try {
      if (!this.db) {
        this.logger.warn('Database not available');
        return;
      }

      const tasks = await this.db.query({
        selector: { type: 'task' },
        sort: [{ createdAt: 'desc' }]
      });

      this.tasks = tasks;
      this.logger.debug(`Loaded ${tasks.length} tasks`);

      // Update UI if rendered
      if (this.isRendered) {
        this.updateTasksList();
      }

    } catch (error) {
      this.logger.error('Failed to load tasks:', error);
    }
  }

  async addTask() {
    const text = this.components.taskInput.getValue().trim();

    if (!text) {
      this.logger.warn('Task text is required');
      return;
    }

    try {
      const task = {
        _id: `task_${Date.now()}`,
        type: 'task',
        text,
        completed: false
      };

      await this.db.create(task);

      // Clear input
      this.components.taskInput.clear();
      this.components.taskInput.focus();

      this.logger.info('Task created:', task._id);

      // Emit event for other apps
      this.emit('task:created', task);

    } catch (error) {
      this.logger.error('Failed to create task:', error);
    }
  }

  async toggleTask(task) {
    try {
      task.completed = !task.completed;
      const updatedTask = await this.db.update(task);

      // Update local reference with new _rev
      const index = this.tasks.findIndex(t => t._id === task._id);
      if (index >= 0) {
        this.tasks[index] = updatedTask;
      }

      this.logger.info('Task toggled:', task._id);

      // Emit event
      this.emit('task:toggled', updatedTask);

    } catch (error) {
      this.logger.error('Failed to toggle task:', error);
    }
  }

  async deleteTask(task) {
    try {
      await this.db.delete(task);
      this.logger.info('Task deleted:', task._id);

      // Emit event
      this.emit('task:deleted', task);

      // Show success notification
      Notification.success('Task deleted successfully');

    } catch (error) {
      this.logger.error('Failed to delete task:', error);
      Notification.error('Failed to delete task. Please try again.');
    }
  }

  handleTaskChange(change) {
    this.logger.debug('Task change detected:', change);

    if (change.deleted) {
      // Remove from local array
      this.tasks = this.tasks.filter(t => t._id !== change.id);
    } else {
      // Add or update
      const index = this.tasks.findIndex(t => t._id === change.doc._id);
      if (index >= 0) {
        this.tasks[index] = change.doc;
      } else {
        this.tasks.unshift(change.doc);
      }
    }

    // Update UI
    if (this.isRendered) {
      this.updateTasksList();
    }
  }

  setFilter(filter) {
    this.filter = filter;

    // Update filter button states
    this.components.filterAll.element.classList.toggle('active', filter === 'all');
    this.components.filterActive.element.classList.toggle('active', filter === 'active');
    this.components.filterCompleted.element.classList.toggle('active', filter === 'completed');

    // Update list
    this.updateTasksList();
  }

  getFilteredTasks() {
    switch (this.filter) {
      case 'active':
        return this.tasks.filter(t => !t.completed);
      case 'completed':
        return this.tasks.filter(t => t.completed);
      default:
        return this.tasks;
    }
  }

  getStatsText() {
    const total = this.tasks.length;
    const completed = this.tasks.filter(t => t.completed).length;
    const active = total - completed;

    return `${total} total • ${active} active • ${completed} completed`;
  }

  updateTasksList() {
    if (this.components.tasksList) {
      this.components.tasksList.setItems(this.getFilteredTasks());
    }

    if (this.components.stats) {
      this.components.stats.textContent = this.getStatsText();
    }
  }

  onDestroy() {
    // Destroy components
    Object.values(this.components).forEach(component => {
      if (component.destroy) {
        component.destroy();
      }
    });

    this.logger.info('TasksApp destroyed');
  }
}

export { TasksApp };
