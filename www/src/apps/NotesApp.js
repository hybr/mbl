/**
 * NotesApp.js - Example MiniApp for managing notes
 * Demonstrates full CRUD operations with PouchDB sync
 */

import { MiniApp } from '../core/MiniApp.js';
import { Button } from '../components/Button.js';
import { Input } from '../components/Input.js';
import { List } from '../components/List.js';
import { Notification } from '../utils/Notification.js';

class NotesApp extends MiniApp {
  constructor(options = {}) {
    super({
      name: 'NotesApp',
      ...options
    });

    this.notes = [];
    this.components = {};
  }

  async onInit() {
    this.logger.info('Initializing NotesApp');

    // Subscribe to note changes from database
    this.subscribeToData('note', (change) => {
      this.handleNoteChange(change);
    });

    // Load existing notes
    await this.loadNotes();
  }

  async onRender() {
    this.clearContainer();

    // Create header
    const header = this.createElement('div', { className: 'miniapp-header' }, [
      this.createElement('h2', {}, ['Notes'])
    ]);

    // Create input section
    const inputSection = this.createElement('div', { className: 'notes-input-section' });

    this.components.titleInput = new Input({
      placeholder: 'Note title...',
      className: 'input input-title'
    });

    this.components.contentInput = new Input({
      placeholder: 'Note content...',
      className: 'input input-content',
      onEnter: () => this.addNote()
    });

    this.components.addButton = new Button({
      text: 'Add Note',
      className: 'btn btn-primary',
      onClick: () => this.addNote()
    });

    inputSection.appendChild(this.components.titleInput.create());
    inputSection.appendChild(this.components.contentInput.create());
    inputSection.appendChild(this.components.addButton.create());

    // Create notes list
    const listContainer = this.createElement('div', { className: 'notes-list-container' });

    this.components.notesList = new List({
      items: this.notes,
      className: 'notes-list',
      itemClassName: 'note-item',
      renderItem: (note) => this.renderNoteItem(note),
      emptyMessage: 'No notes yet. Create your first note!'
    });

    listContainer.appendChild(this.components.notesList.create());

    // Assemble UI
    this.container.appendChild(header);
    this.container.appendChild(inputSection);
    this.container.appendChild(listContainer);

    this.logger.debug('NotesApp rendered');
  }

  renderNoteItem(note) {
    const item = this.createElement('div', { className: 'note-content' });

    const title = this.createElement('div', { className: 'note-title' }, [note.title]);
    const content = this.createElement('div', { className: 'note-text' }, [note.content]);
    const timestamp = this.createElement('div', {
      className: 'note-timestamp'
    }, [new Date(note.createdAt).toLocaleString()]);

    const deleteBtn = this.createElement('button', {
      className: 'btn btn-danger btn-small',
      onClick: () => this.deleteNote(note)
    }, ['Delete']);

    const actions = this.createElement('div', { className: 'note-actions' });
    actions.appendChild(deleteBtn);

    item.appendChild(title);
    item.appendChild(content);
    item.appendChild(timestamp);
    item.appendChild(actions);

    return item;
  }

  async loadNotes() {
    try {
      if (!this.db) {
        this.logger.warn('Database not available');
        return;
      }

      const result = await this.db.query({
        selector: { type: 'note' }
      });

      // Sort in JavaScript instead of database
      const notes = result.docs || result;
      notes.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB - dateA; // Descending order (newest first)
      });

      this.notes = notes;
      this.logger.debug(`Loaded ${notes.length} notes`);

      // Update UI if rendered
      if (this.isRendered && this.components.notesList) {
        this.components.notesList.setItems(this.notes);
      }

    } catch (error) {
      this.logger.error('Failed to load notes:', error);
    }
  }

  async addNote() {
    const title = this.components.titleInput.getValue().trim();
    const content = this.components.contentInput.getValue().trim();

    if (!title || !content) {
      this.logger.warn('Title and content are required');
      return;
    }

    try {
      const note = {
        _id: `note_${Date.now()}`,
        type: 'note',
        title,
        content
      };

      await this.db.create(note);

      // Clear inputs
      this.components.titleInput.clear();
      this.components.contentInput.clear();
      this.components.titleInput.focus();

      this.logger.info('Note created:', note._id);

      // Emit event for other apps
      this.emit('note:created', note);

    } catch (error) {
      this.logger.error('Failed to create note:', error);
    }
  }

  async deleteNote(note) {
    try {
      await this.db.delete(note);
      this.logger.info('Note deleted:', note._id);

      // Emit event
      this.emit('note:deleted', note);

      // Show success notification
      Notification.success('Note deleted successfully');

    } catch (error) {
      this.logger.error('Failed to delete note:', error);
      Notification.error('Failed to delete note. Please try again.');
    }
  }

  handleNoteChange(change) {
    this.logger.debug('Note change detected:', change);

    if (change.deleted) {
      // Remove from local array
      this.notes = this.notes.filter(n => n._id !== change.id);
    } else {
      // Add or update
      const index = this.notes.findIndex(n => n._id === change.doc._id);
      if (index >= 0) {
        this.notes[index] = change.doc;
      } else {
        this.notes.unshift(change.doc);
      }
    }

    // Update UI
    if (this.isRendered && this.components.notesList) {
      this.components.notesList.setItems(this.notes);
    }
  }

  onDestroy() {
    // Destroy components
    Object.values(this.components).forEach(component => {
      if (component.destroy) {
        component.destroy();
      }
    });

    this.logger.info('NotesApp destroyed');
  }
}

export { NotesApp };
