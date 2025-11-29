# Messaging System Usage Guide

This document explains how to use the new messaging system in your mini apps.

## Overview

The messaging system allows mini apps to send three types of messages to users:
1. **Toast Notifications** - Brief auto-dismissing messages
2. **Actionable Messages** - Modal dialogs requiring user response
3. **Persistent Messages** - Messages saved to the inbox for later review

## Quick Start

All MiniApp instances automatically have access to messaging methods.

### Simple Toast Notifications

```javascript
// Success toast
this.showSuccess('Note saved successfully!');

// Error toast
this.showError('Failed to save note');

// Warning toast
this.showWarning('This action cannot be undone');

// Info toast
this.showInfo('New features available');
```

### Custom Toast

```javascript
this.showToast('Custom message', 'success', 5000); // 5 second duration
```

### Actionable Messages (Modals)

First, register action handlers in your `onInit()` method:

```javascript
async onInit() {
  // Register action handlers
  this.registerMessageAction('confirmDelete', this.handleConfirmDelete);
  this.registerMessageAction('cancelDelete', this.handleCancelDelete);
}

handleConfirmDelete(actionData) {
  console.log('Delete confirmed for:', actionData.noteId);
  // Perform delete operation
}

handleCancelDelete(actionData) {
  console.log('Delete cancelled');
}
```

Then send an actionable message:

```javascript
this.sendMessage({
  messageType: 'actionable',
  title: 'Confirm Delete',
  body: 'Are you sure you want to delete this note? This action cannot be undone.',
  category: 'warning',
  priority: 'high',
  actions: [
    {
      id: 'confirm',
      label: 'Delete',
      style: 'danger',
      callback: 'confirmDelete',
      data: { noteId: note._id }
    },
    {
      id: 'cancel',
      label: 'Cancel',
      style: 'secondary',
      callback: 'cancelDelete'
    }
  ]
});
```

### Persistent Messages (Inbox)

Send a message that will appear in the user's message inbox:

```javascript
this.sendMessage({
  messageType: 'persistent',
  title: 'New Task Assigned',
  body: `You have been assigned task "${task.title}"`,
  category: 'info',
  priority: 'normal',
  displayConfig: {
    persistent: true,
    autoDismiss: true,  // Also show as toast
    dismissAfter: 5000
  }
});
```

## Advanced Usage

### Targeting Specific Users

Using MessageService directly (available globally as `window.messageService`):

```javascript
// Send to specific user
await window.messageService.sendToUser(userId, {
  messageType: 'persistent',
  title: 'Personal Message',
  body: 'This is just for you',
  category: 'info'
});

// Send to organization
await window.messageService.sendToOrganization(orgId, {
  messageType: 'toast',
  title: 'Organization Update',
  body: 'New policy announcement',
  category: 'info'
});

// Send to role
await window.messageService.sendToRole('admin', {
  messageType: 'actionable',
  title: 'Admin Action Required',
  body: 'Please review pending approvals',
  category: 'warning',
  priority: 'high',
  actions: [...]
});

// Global broadcast
await window.messageService.sendGlobal({
  messageType: 'toast',
  title: 'System Maintenance',
  body: 'System will be down for 10 minutes',
  category: 'warning',
  priority: 'critical'
});
```

### Message Priorities

- **critical** - Blocks all interaction, shows immediately
- **high** - Shows modal immediately for actionable messages
- **normal** - Queues for display (default)
- **low** - Only saved to inbox, no immediate display

### Message Categories

- **success** - Green color scheme
- **error** - Red color scheme
- **warning** - Orange/yellow color scheme
- **info** - Blue color scheme (default)

### Action Button Styles

- **primary** - Blue background (default action)
- **secondary** - Gray background (cancel/dismiss)
- **danger** - Red background (destructive actions)
- **success** - Green background (confirm actions)

## Display Configuration

```javascript
displayConfig: {
  autoDismiss: true,      // Auto-dismiss toast
  dismissAfter: 3000,     // Duration in milliseconds
  persistent: true,       // Save to inbox
  requireAction: true     // User must click action (cannot dismiss modal)
}
```

## Opening the Message Inbox

Users can open their message inbox to view all messages:

```javascript
// Mount the MessageInboxApp
await window.appManager.mount('MessageInboxApp', {
  containerSelector: '#inbox-container'
});
```

Or programmatically from another mini app:

```javascript
// Emit event to request inbox
this.emit('inbox:open');
```

## Backward Compatibility

The old `Notification` class still works and now uses the new system:

```javascript
import { Notification } from './utils/Notification.js';

Notification.success('Operation successful!');
Notification.error('Operation failed!');
Notification.warning('Be careful!');
Notification.info('Information message');
```

## System Messages

The system automatically sends messages for:
- Sync errors
- Network offline/online status
- Application errors

## Best Practices

1. **Use appropriate message types**
   - Toast for quick confirmations and feedback
   - Actionable for user decisions
   - Persistent for important information

2. **Set correct priorities**
   - Use `critical` sparingly (blocks everything)
   - Use `high` for important actions
   - Use `normal` for most messages
   - Use `low` for FYI messages

3. **Keep messages concise**
   - Title: 5-10 words
   - Body: 1-2 sentences max

4. **Use clear action labels**
   - "Delete" not "OK"
   - "Cancel" not "No"
   - "Confirm" not "Yes"

5. **Provide context in action data**
   - Pass relevant IDs and info in `action.data`

## Examples from NotesApp

```javascript
class NotesApp extends MiniApp {
  async onInit() {
    // Register delete confirmation handler
    this.registerMessageAction('confirmDeleteNote', this.handleDeleteConfirm);
  }

  async saveNote(note) {
    try {
      await this.db.update(note);
      this.showSuccess('Note saved successfully!');
    } catch (error) {
      this.showError('Failed to save note');
      this.logger.error('Save failed:', error);
    }
  }

  promptDeleteNote(note) {
    this.sendMessage({
      messageType: 'actionable',
      title: 'Delete Note?',
      body: `Delete "${note.title}"? This cannot be undone.`,
      category: 'warning',
      priority: 'high',
      actions: [
        {
          id: 'delete',
          label: 'Delete',
          style: 'danger',
          callback: 'confirmDeleteNote',
          data: { noteId: note._id }
        },
        {
          id: 'cancel',
          label: 'Cancel',
          style: 'secondary',
          callback: 'cancelDeleteNote'
        }
      ]
    });
  }

  async handleDeleteConfirm(actionData) {
    try {
      await this.db.delete(actionData.noteId);
      this.showSuccess('Note deleted');
    } catch (error) {
      this.showError('Failed to delete note');
    }
  }
}
```

## Troubleshooting

**Messages not showing:**
- Check browser console for errors
- Verify MessageService is initialized (`window.messageService`)
- Check that action handlers are registered before sending messages

**Actions not working:**
- Verify callback name matches registered handler
- Check that handler is registered in `onInit()`
- Use `bind(this)` or arrow functions for context

**Inbox not loading:**
- Check user is logged in
- Verify database permissions
- Check console for query errors

## API Reference

### MiniApp Methods

- `showToast(message, category, duration)` - Show toast notification
- `showSuccess(message, duration)` - Success toast
- `showError(message, duration)` - Error toast
- `showWarning(message, duration)` - Warning toast
- `showInfo(message, duration)` - Info toast
- `sendMessage(messageData)` - Send any type of message
- `registerMessageAction(actionName, callback)` - Register action handler

### MessageService Methods

- `send(messageData)` - Send message
- `sendToast(message, category, duration)` - Send toast
- `sendActionable(title, body, actions, options)` - Send actionable
- `sendPersistent(title, body, options)` - Send persistent
- `sendToUser(userId, messageData)` - Target user
- `sendToOrganization(orgId, messageData)` - Target org
- `sendToRole(role, messageData)` - Target role
- `sendGlobal(messageData)` - Global broadcast
- `getMessagesForUser(userId, options)` - Query messages
- `getUnreadCount(userId)` - Get unread count
- `markAsRead(messageId, userId)` - Mark read
- `markAllAsRead(userId)` - Mark all read
- `archive(messageId)` - Archive message
- `deleteMessage(messageId)` - Delete message
- `registerActionHandler(appName, actionName, callback)` - Register handler
- `executeAction(messageId, actionId, actionData)` - Execute action

## Events

The system emits these EventBus events:

- `message:created` - New message created
- `message:updated` - Message state changed
- `message:read` - Message marked as read
- `message:actioned` - Action executed
- `message:deleted` - Message deleted
- `toast:shown` - Toast displayed
- `toast:dismissed` - Toast dismissed
- `modal:shown` - Modal displayed
- `modal:closed` - Modal closed
- `inbox:unread:updated` - Unread count changed
