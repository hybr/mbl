# V4L - Vocal 4 Local

**Connecting vocal customers with local businesses through smart geo-sensing technology**

## About V4L

V4L (Vocal 4 Local) is a revolutionary platform designed to bridge the gap between passionate, vocal customers and local businesses in their community. Through smart geo-sensing technology, we ensure that customers and businesses discover each other at the right time and place.

### Our Mission
- **Empower Local Businesses**: Help them connect with their community
- **Support Vocal Customers**: Those passionate about local commerce
- **Build Communities**: Through meaningful connections and authentic experiences
- **Smart Geo-Sensing**: Location-aware discovery and recommendations

---

## Technical Architecture

A scalable, offline-first mobile application architecture built with **Pure JavaScript Classes**, **PouchDB**, and **Capacitor**. This system supports hundreds of mini-applications running simultaneously with real-time data synchronization.

## 🎯 Core Features

- **Pure JavaScript Classes** - No frameworks, no TypeScript, no bundlers
- **MiniApp Architecture** - Self-contained, independent mini-applications
- **Offline-First** - PouchDB for local storage with automatic CouchDB sync
- **Real-Time Updates** - Instant UI updates across all mini-apps
- **Event-Driven Communication** - Inter-app communication via EventBus
- **Memory Efficient** - Clean lifecycle management prevents memory leaks
- **Mobile-Ready** - Runs on Android/iOS via Capacitor
- **Scalable** - Designed to handle hundreds of mini-apps

## 📁 Project Structure

```
mbl/
├── index.html                    # Main HTML entry point
├── package.json                  # NPM dependencies & scripts
├── capacitor.config.json         # Capacitor configuration
├── src/
│   ├── core/
│   │   ├── AppManager.js         # Main application manager
│   │   ├── MiniApp.js            # Base MiniApp class
│   │   ├── EventBus.js           # Global event system
│   │   ├── DatabaseManager.js    # PouchDB wrapper with sync
│   │   └── Logger.js             # Logging utility
│   ├── components/
│   │   ├── Component.js          # Base UI component
│   │   ├── Button.js             # Button component
│   │   ├── Input.js              # Input component
│   │   └── List.js               # List component
│   ├── miniapps/
│   │   ├── NotesApp.js           # Example: Notes mini-app
│   │   ├── TasksApp.js           # Example: Tasks mini-app
│   │   └── SettingsApp.js        # Example: Settings mini-app
│   ├── utils/
│   │   ├── DOMHelper.js          # DOM utilities
│   │   └── ErrorHandler.js       # Error handling
│   └── app.js                    # Application initialization
└── styles/
    ├── main.css                  # Core styles
    ├── components.css            # Component styles
    └── miniapps.css              # MiniApp-specific styles
```

## 🚀 Getting Started

### Prerequisites

- Node.js 14+ installed
- Modern web browser (Chrome, Safari, Firefox)
- (Optional) Android Studio for Android builds
- (Optional) Xcode for iOS builds

### Installation

1. **Install dependencies:**

```bash
npm install
```

2. **Run development server:**

```bash
npm run dev
```

3. **Open in browser:**

Navigate to `http://localhost:8080`

### Setup CouchDB Sync (Optional)

1. Install CouchDB locally or use a hosted service
2. Create a database named `miniapp_db`
3. Update `src/app.js` with your CouchDB URL:

```javascript
this.appManager = new AppManager({
  database: {
    dbName: 'miniapp_db',
    remoteURL: 'http://localhost:5984/miniapp_db' // Your CouchDB URL
  }
});
```

## 📱 Building for Mobile

### Android

```bash
# Initialize Capacitor
npm run capacitor:init

# Add Android platform
npm run capacitor:add:android

# Build for Android
npm run build:android
```

### iOS

```bash
# Add iOS platform
npm run capacitor:add:ios

# Build for iOS
npm run build:ios
```

## 🏗️ Architecture Overview

### 1. AppManager

The central controller that manages all mini-apps:

- Registers MiniApp classes
- Mounts/unmounts instances
- Provides database access
- Routes events to active mini-apps
- Manages lifecycle

**Example Usage:**

```javascript
// Register a MiniApp
appManager.register(MyMiniApp);

// Mount an instance
const instance = await appManager.mount('MyMiniApp', {
  containerSelector: '#my-container'
});

// Unmount
await appManager.unmount(instance.id);
```

### 2. MiniApp Base Class

All mini-apps extend this base class:

```javascript
import { MiniApp } from './core/MiniApp.js';

class MyMiniApp extends MiniApp {
  async onInit() {
    // Initialize your app
    this.subscribeToData('mydata', this.handleDataChange);
  }

  async onRender() {
    // Render your UI
    const button = this.createElement('button', {
      onClick: () => this.handleClick()
    }, ['Click Me']);

    this.container.appendChild(button);
  }

  async onDestroy() {
    // Cleanup
  }
}
```

### 3. DatabaseManager

Handles all data operations with PouchDB:

```javascript
// Create
await this.db.create({
  _id: 'item_1',
  type: 'mytype',
  name: 'My Item'
});

// Read
const item = await this.db.read('item_1');

// Update
item.name = 'Updated Name';
await this.db.update(item);

// Delete
await this.db.delete(item);

// Query by type
const items = await this.db.query({
  selector: { type: 'mytype' }
});
```

### 4. EventBus

Global event system for inter-app communication:

```javascript
// Subscribe to events
this.subscribe('note:created', (note) => {
  console.log('New note created:', note);
});

// Emit events
this.emit('note:created', { id: '123', title: 'My Note' });
```

### 5. Real-Time Data Updates

Subscribe to database changes:

```javascript
// In your MiniApp
this.subscribeToData('note', (change) => {
  if (change.deleted) {
    // Handle deletion
  } else {
    // Handle create/update
    this.updateUI(change.doc);
  }
});
```

## 🎨 Creating a New MiniApp

### Step 1: Create the MiniApp Class

Create `src/miniapps/MyApp.js`:

```javascript
import { MiniApp } from '../core/MiniApp.js';
import { Button } from '../components/Button.js';

class MyApp extends MiniApp {
  constructor(options = {}) {
    super({
      name: 'MyApp',
      ...options
    });
  }

  async onInit() {
    // Subscribe to data changes
    this.subscribeToData('mydata', (change) => {
      this.handleDataChange(change);
    });

    // Load initial data
    await this.loadData();
  }

  async onRender() {
    this.clearContainer();

    const header = this.createElement('div',
      { className: 'miniapp-header' },
      [this.createElement('h2', {}, ['My App'])]
    );

    this.container.appendChild(header);
  }

  async loadData() {
    const items = await this.db.query({
      selector: { type: 'mydata' }
    });
    // Process items...
  }

  handleDataChange(change) {
    // Update UI in real-time
  }

  onDestroy() {
    // Cleanup
  }
}

export { MyApp };
```

### Step 2: Register in app.js

```javascript
import { MyApp } from './miniapps/MyApp.js';

// In registerMiniApps()
this.appManager.register(MyApp);
```

### Step 3: Add UI Controls

In `index.html`:

```html
<button id="toggle-myapp" class="btn btn-control">Show MyApp</button>
<div id="myapp-container" class="miniapp-container"></div>
```

In `src/app.js`:

```javascript
// In setupUI()
const toggleMyAppBtn = document.getElementById('toggle-myapp');
toggleMyAppBtn.addEventListener('click', () =>
  this.toggleMiniApp('MyApp', 'myapp-container')
);
```

## 📊 Data Management

### Data Structure

All documents should include:

```javascript
{
  _id: 'unique_id',      // Required: Unique identifier
  type: 'collection',    // Required: Collection/type name
  createdAt: '...',      // Auto-added by DatabaseManager
  updatedAt: '...',      // Auto-updated by DatabaseManager
  // Your custom fields...
}
```

### Indexing for Performance

```javascript
// Create index for faster queries
await this.db.createIndex(['type', 'createdAt']);
```

### Bulk Operations

```javascript
// Bulk create
await this.db.bulkCreate([
  { _id: 'item_1', type: 'mytype', name: 'Item 1' },
  { _id: 'item_2', type: 'mytype', name: 'Item 2' }
]);
```

## 🔌 Inter-App Communication

### Publishing Events

```javascript
// In NotesApp
this.emit('note:created', { id: note._id, title: note.title });
```

### Subscribing to Events

```javascript
// In TasksApp
this.subscribe('note:created', (note) => {
  console.log('Note created:', note);
  // Auto-create a task from note, for example
});
```

### Available System Events

- `app:initialized` - App initialization complete
- `miniapp:mounted` - MiniApp mounted
- `miniapp:unmounted` - MiniApp unmounted
- `db:change` - Database change detected
- `network:online` - Network came online
- `network:offline` - Network went offline
- `sync:started` - Sync started
- `sync:change` - Sync change occurred
- `sync:error` - Sync error

## 🛠️ Debugging

### Access AppManager in Console

```javascript
// Check stats
window.appManager.getStats();

// Get all instances
window.appManager.getAllInstances();

// Get active instances
window.appManager.getActiveInstances();
```

### Logger Configuration

```javascript
import { Logger, LoggerFactory } from './core/Logger.js';

// Set global log level
LoggerFactory.setGlobalLevel(Logger.LOG_LEVELS.DEBUG);

// Levels: DEBUG, INFO, WARN, ERROR, NONE
```

### View PouchDB Data

```javascript
// Get database info
const info = await window.appManager.dbManager.getInfo();

// Query all documents
const docs = await window.appManager.dbManager.query({});
```

## 📈 Performance Best Practices

1. **Only Active Mini-Apps Consume CPU**
   - Inactive mini-apps don't receive updates
   - Use `show()` and `hide()` to control activity

2. **Clean Up Resources**
   - Always implement `onDestroy()`
   - Remove event listeners
   - Clear intervals/timeouts

3. **Optimize Data Queries**
   - Create indexes for frequent queries
   - Use specific selectors instead of fetching all documents
   - Limit result sets

4. **Lazy Loading**
   - Mount mini-apps on demand
   - Don't mount all apps at startup

5. **Memory Management**
   - The framework automatically tracks and cleans up:
     - DOM event listeners
     - EventBus subscriptions
     - Database subscriptions

## 🔒 Security Considerations

1. **Input Validation**
   - Always validate user input
   - Sanitize data before rendering

2. **CouchDB Authentication**
   ```javascript
   remoteURL: 'https://user:password@your-couchdb.com/db'
   ```

3. **HTTPS for Production**
   - Always use HTTPS in production
   - Configure Capacitor for HTTPS

## 🧪 Testing

### Manual Testing Checklist

- [ ] Create, read, update, delete operations work
- [ ] Real-time updates reflect across mini-apps
- [ ] Offline mode works (disable network)
- [ ] Sync resumes when online
- [ ] No memory leaks after unmounting
- [ ] Multiple instances work simultaneously
- [ ] Inter-app communication functions

### Browser DevTools

1. **Performance Tab** - Check for memory leaks
2. **Network Tab** - Monitor sync traffic
3. **Application Tab** - View IndexedDB (PouchDB storage)
4. **Console** - View logs and errors

## 📝 License

MIT License - feel free to use this architecture in your projects.

## 🤝 Contributing

Contributions are welcome! This architecture is designed to be extended.

## 📧 Support

For questions and support, please open an issue in the repository.

---

**Built with ❤️ using Pure JavaScript**
