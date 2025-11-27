# Architecture Documentation

## Overview

This is a Pure JavaScript MiniApp architecture designed for mobile applications using Capacitor. The system is built on **class-based programming** without frameworks, bundlers, or TypeScript.

## Core Principles

### 1. Pure JavaScript Classes
- ES6 class syntax
- No transpilation required
- Direct browser execution
- Native module system (ES6 imports/exports)

### 2. MiniApp Pattern
Each MiniApp is:
- **Self-contained**: Owns its DOM, logic, and data subscriptions
- **Independent**: Can run alone or with other mini-apps
- **Lifecycle-managed**: Proper init/render/destroy phases
- **Event-driven**: Communicates through EventBus

### 3. Offline-First
- PouchDB for local storage (IndexedDB)
- Automatic CouchDB synchronization
- Real-time change propagation
- Works fully offline

## System Components

### Core Layer

#### AppManager (`src/core/AppManager.js`)

**Responsibilities:**
- Registry of MiniApp classes
- Instance lifecycle management
- Database injection
- Event routing
- Global error handling

**Key Methods:**
```javascript
register(MiniAppClass)           // Register a class
mount(className, options)         // Create & mount instance
unmount(instanceId)               // Destroy instance
getInstance(instanceId)           // Get instance reference
getStats()                        // System statistics
```

**Scalability:**
- Handles hundreds of registered classes
- Only active instances consume resources
- Automatic memory cleanup

#### MiniApp (`src/core/MiniApp.js`)

**Base class for all mini-apps.**

**Lifecycle Hooks:**
```javascript
constructor(options)              // Initialize state
async onInit()                    // Setup subscriptions
async onRender()                  // Build UI (required)
onDataChanged(change)             // Handle DB changes
onShow()                          // Visibility changed
onHide()                          // Hidden
onDestroy()                       // Cleanup (required)
```

**Built-in Features:**
- DOM event tracking for auto-cleanup
- EventBus subscription management
- Database subscription management
- Helper methods for element creation

**Memory Safety:**
All subscriptions and event listeners are automatically cleaned up on destroy.

#### DatabaseManager (`src/core/DatabaseManager.js`)

**PouchDB wrapper with sync capabilities.**

**Features:**
- CRUD operations
- Real-time change listener
- Automatic CouchDB sync with retry
- Collection-based subscriptions
- Network status detection

**Data Flow:**
```
User Action → MiniApp → DatabaseManager → PouchDB
                                          ↓
                                     IndexedDB
                                          ↓
                                     CouchDB (sync)
                                          ↓
                                     Change Event
                                          ↓
                                     All Subscribed MiniApps
```

**API:**
```javascript
create(doc)                       // Create document
read(id)                          // Read document
update(doc)                       // Update document
delete(doc)                       // Delete document
query(options)                    // Query documents
subscribe(collection, callback)   // Subscribe to changes
```

#### EventBus (`src/core/EventBus.js`)

**Global pub/sub system for inter-app communication.**

**Usage:**
```javascript
// Subscribe
eventBus.on('event:name', callback, context);

// Emit
eventBus.emit('event:name', data);

// Unsubscribe
eventBus.off('event:name', callback);

// One-time
eventBus.once('event:name', callback);
```

**Pattern:**
- Decouples mini-apps
- Enables cross-app workflows
- System events for lifecycle

#### Logger (`src/core/Logger.js`)

**Structured logging system.**

**Features:**
- Namespaced loggers
- Log levels (DEBUG, INFO, WARN, ERROR)
- History tracking
- Global level control

```javascript
const logger = LoggerFactory.getLogger('MyApp');
logger.debug('Debug message');
logger.info('Info message');
logger.warn('Warning message');
logger.error('Error message');
```

### Component Layer

#### Component (`src/components/Component.js`)

**Base class for reusable UI components.**

**Features:**
- State management
- Props system
- Lifecycle methods
- Auto cleanup

**Example:**
```javascript
class MyComponent extends Component {
  render() {
    const element = document.createElement('div');
    element.textContent = this.props.text;
    return element;
  }
}

const comp = new MyComponent({ text: 'Hello' });
comp.mount('#container');
```

#### Built-in Components

- **Button**: Clickable button with variants
- **Input**: Text input with onChange/onEnter
- **List**: Dynamic list with custom renderers

### MiniApp Layer

Example implementations:

#### NotesApp (`src/miniapps/NotesApp.js`)

**Features:**
- Create notes with title and content
- Real-time updates from database
- Delete notes
- Full CRUD example

**Data Model:**
```javascript
{
  _id: 'note_timestamp',
  type: 'note',
  title: 'string',
  content: 'string',
  createdAt: 'ISO date',
  updatedAt: 'ISO date'
}
```

#### TasksApp (`src/miniapps/TasksApp.js`)

**Features:**
- Add tasks
- Toggle completion
- Filter (all/active/completed)
- Statistics display
- Inter-app communication example

**Data Model:**
```javascript
{
  _id: 'task_timestamp',
  type: 'task',
  text: 'string',
  completed: boolean,
  createdAt: 'ISO date',
  updatedAt: 'ISO date'
}
```

#### SettingsApp (`src/miniapps/SettingsApp.js`)

**Features:**
- System statistics
- Database info
- Cache management
- Data export
- Manual sync trigger

## Data Flow

### Write Flow

```
User Input
  ↓
MiniApp (validation)
  ↓
DatabaseManager.create/update/delete
  ↓
PouchDB
  ↓
IndexedDB (local storage)
  ↓
CouchDB (if online & configured)
```

### Read Flow (Real-time)

```
PouchDB Change
  ↓
DatabaseManager (change listener)
  ↓
Notify Subscribers
  ↓
MiniApp.onDataChanged()
  ↓
Update UI
```

### Event Flow

```
MiniApp A
  ↓
eventBus.emit('event', data)
  ↓
EventBus
  ↓
All Subscribers
  ↓
MiniApp B, C, D... (callbacks)
```

## Scalability Strategy

### Performance Optimizations

1. **Lazy Mounting**
   - Only mount mini-apps when needed
   - Unmount unused mini-apps

2. **Active-Only Processing**
   - Hidden mini-apps don't process events
   - Check `isActive` flag

3. **Efficient Queries**
   - Use PouchDB indexes
   - Filter by type at database level

4. **Memory Management**
   - Automatic cleanup on destroy
   - No circular references
   - WeakMap for internal references

### Handling 100+ MiniApps

**Registry Design:**
```javascript
// AppManager stores classes, not instances
registry: Map<className, MiniAppClass>
instances: Map<instanceId, MiniAppInstance>
```

- Only active instances are in memory
- Registry is just class references (small memory footprint)
- Unmounted apps are fully garbage collected

**Example Scale:**
- 100 registered classes: ~100 KB memory
- 10 active instances: ~500 KB memory
- Total: < 1 MB for framework

## Security

### Input Sanitization

All user input should be validated:

```javascript
const sanitized = text.trim();
if (sanitized.length === 0) return;
```

### Database Access

- PouchDB runs locally (IndexedDB)
- CouchDB sync uses HTTPS
- Credentials in environment variables

### XSS Prevention

- Use `textContent` instead of `innerHTML`
- Validate all data before rendering
- Escape HTML when necessary

## Error Handling Strategy

### Levels

1. **Component Level**
   - Try/catch in methods
   - Log errors
   - Show user-friendly messages

2. **MiniApp Level**
   - Catch in lifecycle methods
   - Prevent crash propagation
   - Emit error events

3. **System Level**
   - Global error handlers
   - Unhandled rejection handler
   - Error event on EventBus

### Example Pattern

```javascript
async onRender() {
  try {
    // Render logic
  } catch (error) {
    this.logger.error('Render failed:', error);
    this.showError('Failed to render app');
  }
}
```

## Extension Points

### Creating New MiniApps

1. Extend `MiniApp` class
2. Implement required hooks
3. Subscribe to data changes
4. Register with AppManager

### Creating New Components

1. Extend `Component` class
2. Implement `render()` method
3. Use in MiniApps

### Custom Database Operations

```javascript
// In MiniApp
async customQuery() {
  const result = await this.db.query({
    selector: {
      type: 'mytype',
      status: 'active'
    },
    sort: [{ createdAt: 'desc' }],
    limit: 10
  });
  return result;
}
```

### Custom Events

```javascript
// Define event constants
const EVENTS = {
  USER_LOGIN: 'user:login',
  USER_LOGOUT: 'user:logout',
  DATA_SYNC: 'data:sync'
};

// Publisher
this.emit(EVENTS.USER_LOGIN, { userId: '123' });

// Subscriber
this.subscribe(EVENTS.USER_LOGIN, (data) => {
  console.log('User logged in:', data.userId);
});
```

## Testing Strategy

### Unit Testing

Test individual classes:

```javascript
// Mock dependencies
const mockDB = {
  create: async (doc) => ({ ...doc, _rev: '1-abc' })
};

const app = new MyMiniApp({ db: mockDB });
await app.init();
```

### Integration Testing

Test mini-app with real database:

```javascript
const dbManager = new DatabaseManager({ dbName: 'test_db' });
await dbManager.init();

const appManager = new AppManager({ db: dbManager });
await appManager.init();
```

### Manual Testing

1. Open browser DevTools
2. Check Console for errors
3. Monitor Network tab for sync
4. View Application tab for IndexedDB
5. Use Performance tab for memory leaks

## Deployment

### Web (Development)

```bash
npm run dev
# Open http://localhost:8080
```

### Mobile (Production)

```bash
# Android
npm run build:android

# iOS
npm run build:ios
```

### Capacitor Configuration

Edit `capacitor.config.json`:

```json
{
  "appId": "com.your.app",
  "appName": "Your App",
  "webDir": ".",
  "server": {
    "androidScheme": "https"
  }
}
```

## Best Practices

### MiniApp Design

1. **Single Responsibility**: One feature per mini-app
2. **Small Surface Area**: Minimal dependencies
3. **Self-Contained**: Own UI and data
4. **Stateless**: Derive state from database

### Database Design

1. **Type Field**: Always include `type` for collections
2. **Indexes**: Create for frequently queried fields
3. **IDs**: Use descriptive IDs (`${type}_${timestamp}`)
4. **Timestamps**: Auto-added by DatabaseManager

### Performance

1. **Lazy Load**: Mount on demand
2. **Debounce**: Throttle frequent operations
3. **Virtual Lists**: For large datasets
4. **Pagination**: Limit query results

### Code Organization

1. **One Class Per File**: Easy to locate
2. **Descriptive Names**: Clear purpose
3. **JSDoc Comments**: Document public APIs
4. **Export Named**: `export { MyClass }`

## Future Enhancements

### Potential Features

1. **Router System**: URL-based navigation
2. **State Management**: Shared state across mini-apps
3. **Plugin System**: Third-party extensions
4. **Hot Reload**: Development experience
5. **Service Worker**: Full PWA support
6. **Virtual DOM**: Performance optimization
7. **Animation Library**: Smooth transitions
8. **Form Validation**: Reusable validators

### Migration Path

From this architecture to frameworks:

- **React**: MiniApps → Components
- **Vue**: MiniApps → Vue components
- **Angular**: MiniApps → Angular modules

The concepts translate directly.

---

**This architecture provides a solid foundation for building complex, scalable mobile applications with pure JavaScript.**
