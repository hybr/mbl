# Person Management MiniApp - Integration Guide

This guide shows how to integrate the Person Management MiniApp into your Capacitor mobile application.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Basic Integration](#basic-integration)
4. [Capacitor Integration](#capacitor-integration)
5. [CouchDB Sync Setup](#couchdb-sync-setup)
6. [Advanced Features](#advanced-features)
7. [Production Checklist](#production-checklist)

---

## Prerequisites

- Node.js 14+ and npm
- Capacitor CLI installed
- Basic knowledge of ES6 JavaScript
- PouchDB library

## Installation

### Step 1: Copy Files to Your Project

```bash
# Copy MiniApp files to your project
cp PersonManagementMiniApp.js /path/to/your/project/src/miniapps/
cp PersonManagementMiniApp.css /path/to/your/project/src/styles/
cp AppManager.js /path/to/your/project/src/core/
```

### Step 2: Install PouchDB

```bash
npm install pouchdb pouchdb-find
```

### Step 3: Include in Your HTML

```html
<!-- In your index.html -->
<link rel="stylesheet" href="src/styles/PersonManagementMiniApp.css">

<script src="node_modules/pouchdb/dist/pouchdb.min.js"></script>
<script src="src/core/AppManager.js"></script>
<script src="src/miniapps/PersonManagementMiniApp.js"></script>
```

---

## Basic Integration

### Minimal Setup

```javascript
// app.js
document.addEventListener('DOMContentLoaded', async () => {
  // Create AppManager
  const appManager = new AppManager();

  // Initialize Person MiniApp
  const personApp = new PersonManagementMiniApp({
    container: '#person-app-container',
    dbName: 'persons',
    appManager: appManager
  });

  // Initialize
  await personApp.init();

  // Register with AppManager
  appManager.register(personApp, 'persons');

  console.log('Person Management MiniApp ready');
});
```

### HTML Container

```html
<div id="person-app-container"></div>
```

---

## Capacitor Integration

### Step 1: Install SQLite Adapter (Recommended for Mobile)

For better performance on mobile devices:

```bash
npm install pouchdb-adapter-cordova-sqlite
npm install cordova-plugin-sqlite-2
```

### Step 2: Configure for Capacitor

```javascript
// capacitor-config.js
import { Capacitor } from '@capacitor/core';

export async function initPersonApp() {
  const appManager = new AppManager();

  // Configure database for mobile
  let dbConfig = { name: 'persons' };

  if (Capacitor.isNativePlatform()) {
    // Use SQLite adapter on mobile
    PouchDB.plugin(require('pouchdb-adapter-cordova-sqlite'));
    dbConfig = {
      name: 'persons.db',
      adapter: 'cordova-sqlite',
      location: 'default',
      androidDatabaseProvider: 'system'
    };
  }

  // Create custom database instance
  const db = new PouchDB(dbConfig);

  // Initialize app with custom db
  const personApp = new PersonManagementMiniApp({
    container: '#person-app',
    dbName: 'persons',
    appManager: appManager
  });

  // Override database instance
  personApp.db = db;

  await personApp.init();
  appManager.register(personApp, 'persons');

  return personApp;
}
```

### Step 3: Handle Platform-Specific Features

```javascript
import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';

// Monitor network status
const networkListener = await Network.addListener('networkStatusChange', status => {
  console.log('Network status changed', status.connected);

  if (status.connected) {
    // Start sync when online
    startSync();
  }
});

// Handle app pause/resume
if (Capacitor.isNativePlatform()) {
  document.addEventListener('pause', () => {
    console.log('App paused');
    // Stop sync or save state
  });

  document.addEventListener('resume', () => {
    console.log('App resumed');
    // Resume sync or refresh UI
  });
}
```

---

## CouchDB Sync Setup

### Server Setup

```bash
# Install CouchDB (via Docker)
docker run -d --name couchdb \
  -e COUCHDB_USER=admin \
  -e COUCHDB_PASSWORD=password \
  -p 5984:5984 \
  couchdb:latest

# Create persons database
curl -X PUT http://admin:password@localhost:5984/persons
```

### Enable CORS (for web development)

```bash
# Enable CORS on CouchDB
curl -X PUT http://admin:password@localhost:5984/_config/httpd/enable_cors -d '"true"'
curl -X PUT http://admin:password@localhost:5984/_config/cors/origins -d '"*"'
curl -X PUT http://admin:password@localhost:5984/_config/cors/credentials -d '"true"'
curl -X PUT http://admin:password@localhost:5984/_config/cors/methods -d '"GET, PUT, POST, HEAD, DELETE"'
curl -X PUT http://admin:password@localhost:5984/_config/cors/headers -d '"accept, authorization, content-type, origin, referer"'
```

### Client-Side Sync Configuration

```javascript
class SyncManager {
  constructor(personApp, remoteUrl) {
    this.personApp = personApp;
    this.remoteUrl = remoteUrl;
    this.syncHandler = null;
  }

  start() {
    const remoteDB = new PouchDB(this.remoteUrl, {
      auth: {
        username: 'admin',
        password: 'password'
      }
    });

    this.syncHandler = this.personApp.db.sync(remoteDB, {
      live: true,
      retry: true
    })
    .on('change', (info) => {
      console.log('Sync change:', info);
    })
    .on('paused', (err) => {
      console.log('Sync paused', err);
    })
    .on('active', () => {
      console.log('Sync active');
    })
    .on('denied', (err) => {
      console.error('Sync denied:', err);
    })
    .on('complete', (info) => {
      console.log('Sync complete:', info);
    })
    .on('error', (err) => {
      console.error('Sync error:', err);
    });
  }

  stop() {
    if (this.syncHandler) {
      this.syncHandler.cancel();
    }
  }
}

// Usage
const syncManager = new SyncManager(
  personApp,
  'http://localhost:5984/persons'
);

syncManager.start();
```

### Secure Sync (Production)

```javascript
// Use environment variables for credentials
const remoteDB = new PouchDB(`${process.env.COUCHDB_URL}/persons`, {
  auth: {
    username: process.env.COUCHDB_USER,
    password: process.env.COUCHDB_PASSWORD
  },
  skip_setup: true // Don't try to create database
});

// HTTPS only in production
if (process.env.NODE_ENV === 'production' && !remoteDB.name.startsWith('https')) {
  throw new Error('HTTPS required for production sync');
}
```

---

## Advanced Features

### Custom Validation

```javascript
// Extend the validation method
const originalValidate = personApp.validatePerson.bind(personApp);

personApp.validatePerson = async function(data) {
  const result = await originalValidate(data);

  // Add custom validation
  if (data.primaryPhone && !data.primaryPhone.match(/^\+?[1-9]\d{1,14}$/)) {
    result.valid = false;
    result.errors.push('Invalid phone number format');
  }

  return result;
};
```

### Custom Event Handlers

```javascript
// Listen for specific events
appManager.on('person:login', async (data) => {
  // Log to analytics
  console.log('User logged in:', data.person.username);

  // Update UI
  updateHeaderWithUser(data.person);

  // Load user preferences
  await loadUserPreferences(data.person._id);

  // Notify other miniapps
  appManager.emit('user:authenticated', data);
});
```

### Middleware Pattern

```javascript
class PersonAppMiddleware {
  constructor(personApp) {
    this.personApp = personApp;
    this.beforeSave = [];
    this.afterSave = [];
  }

  addBeforeSave(fn) {
    this.beforeSave.push(fn);
  }

  addAfterSave(fn) {
    this.afterSave.push(fn);
  }

  async executeSave(data) {
    // Run before middleware
    for (let fn of this.beforeSave) {
      data = await fn(data);
    }

    // Save
    const person = await this.personApp.savePerson(data);

    // Run after middleware
    for (let fn of this.afterSave) {
      await fn(person);
    }

    return person;
  }
}

// Usage
const middleware = new PersonAppMiddleware(personApp);

middleware.addBeforeSave(async (data) => {
  // Normalize phone numbers
  if (data.primaryPhone) {
    data.primaryPhone = normalizePhone(data.primaryPhone);
  }
  return data;
});

middleware.addAfterSave(async (person) => {
  // Send welcome email for new users
  if (!person.credentials.lastLoginAt) {
    await sendWelcomeEmail(person);
  }
});
```

### Multi-Database Strategy

```javascript
// Separate databases for different data types
const personDB = new PouchDB('persons');
const settingsDB = new PouchDB('settings');
const auditDB = new PouchDB('audit');

// Audit log for person changes
personDB.changes({
  since: 'now',
  live: true,
  include_docs: true
}).on('change', async (change) => {
  await auditDB.post({
    type: 'audit',
    action: change.deleted ? 'delete' : 'update',
    docId: change.id,
    timestamp: new Date().toISOString(),
    doc: change.doc
  });
});
```

---

## Production Checklist

### Security

- [ ] Replace SHA-256 password hashing with bcrypt/Argon2
- [ ] Implement HTTPS for all remote connections
- [ ] Add rate limiting for login attempts
- [ ] Sanitize all user inputs to prevent XSS
- [ ] Implement CSRF protection
- [ ] Use secure OTP generation (TOTP)
- [ ] Encrypt sensitive data in PouchDB
- [ ] Implement proper session management

### Performance

- [ ] Use SQLite adapter on mobile devices
- [ ] Implement pagination for large person lists
- [ ] Add debouncing to search/filter functions
- [ ] Optimize PouchDB indexes
- [ ] Enable compression for sync
- [ ] Implement lazy loading for images
- [ ] Use Web Workers for heavy operations

### User Experience

- [ ] Add loading indicators
- [ ] Implement error boundaries
- [ ] Add offline indicators
- [ ] Provide meaningful error messages
- [ ] Add confirmation dialogs for destructive actions
- [ ] Implement undo functionality
- [ ] Add keyboard shortcuts
- [ ] Ensure accessibility (ARIA labels, keyboard navigation)

### Data Management

- [ ] Implement backup strategy
- [ ] Set up conflict resolution rules
- [ ] Add data migration scripts
- [ ] Implement data retention policy
- [ ] Add data export functionality
- [ ] Test database compaction
- [ ] Set up monitoring and alerts

### Testing

- [ ] Unit tests for all methods
- [ ] Integration tests for sync
- [ ] End-to-end tests for user flows
- [ ] Performance testing
- [ ] Security audit
- [ ] Cross-browser testing
- [ ] Mobile device testing

### Deployment

```bash
# Build for production
npm run build

# Build Capacitor apps
npx cap sync
npx cap build android
npx cap build ios

# Deploy to app stores
# Follow platform-specific guidelines
```

---

## Example: Complete App Integration

```javascript
// main.js - Complete integration example
import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';

class PersonManagementApp {
  constructor() {
    this.appManager = null;
    this.personApp = null;
    this.syncManager = null;
    this.isOnline = true;
  }

  async init() {
    // Initialize AppManager
    this.appManager = new AppManager();

    // Initialize Person MiniApp
    this.personApp = new PersonManagementMiniApp({
      container: '#app',
      dbName: 'persons',
      appManager: this.appManager
    });

    await this.personApp.init();
    this.appManager.register(this.personApp, 'persons');

    // Set up event handlers
    this.setupEventHandlers();

    // Set up sync if online
    await this.setupSync();

    // Set up network monitoring
    this.setupNetworkMonitoring();

    console.log('App initialized successfully');
  }

  setupEventHandlers() {
    this.appManager.on('person:login', (data) => {
      this.handleLogin(data);
    });

    this.appManager.on('person:changed', (change) => {
      this.handlePersonChanged(change);
    });
  }

  async setupSync() {
    if (this.isOnline) {
      this.syncManager = new SyncManager(
        this.personApp,
        'https://your-server.com/persons'
      );
      this.syncManager.start();
    }
  }

  async setupNetworkMonitoring() {
    if (Capacitor.isNativePlatform()) {
      const status = await Network.getStatus();
      this.isOnline = status.connected;

      Network.addListener('networkStatusChange', (status) => {
        this.isOnline = status.connected;

        if (status.connected && !this.syncManager) {
          this.setupSync();
        } else if (!status.connected && this.syncManager) {
          this.syncManager.stop();
          this.syncManager = null;
        }
      });
    }
  }

  handleLogin(data) {
    console.log('User logged in:', data.person.username);
    localStorage.setItem('currentUser', JSON.stringify(data.person));
  }

  handlePersonChanged(change) {
    console.log('Person changed:', change.id);
    // Update any dependent UI or data
  }
}

// Initialize app
const app = new PersonManagementApp();
app.init().catch(err => console.error('Failed to initialize app:', err));

// Export for global access
window.app = app;
```

---

## Support & Resources

- **Demo**: Open `person-demo.html` to see the MiniApp in action
- **Documentation**: See `PERSON_MINIAPP_README.md` for full API reference
- **Sample Data**: Check `person-sample-data.json` for example records

For more help, refer to the source code comments and demo implementations.
