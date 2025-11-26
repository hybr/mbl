# Quick Start Guide

Get up and running with the MiniApp System in 5 minutes.

## Step 1: Install Dependencies

```bash
npm install
```

This installs:
- PouchDB (database)
- Capacitor (mobile runtime)
- http-server (development server)

## Step 2: Start Development Server

```bash
npm run dev
```

Open your browser to `http://localhost:8080`

## Step 3: Explore the Demo

The demo includes three mini-apps:

1. **Notes App** - Create and manage notes
2. **Tasks App** - Todo list with filters
3. **Settings App** - System diagnostics

Try:
- Click "Show Notes" to open the Notes app
- Add a note with title and content
- Click "Show Tasks" to open the Tasks app
- Add some tasks and toggle them
- Notice how all changes are instant (no page reload!)

## Step 4: Open DevTools

Press F12 to open browser DevTools:

```javascript
// Check app stats
appManager.getStats()

// List all instances
appManager.getAllInstances()

// View PouchDB data
await appManager.dbManager.query({})
```

## Step 5: Test Offline Mode

1. Open DevTools → Network tab
2. Select "Offline" from throttling dropdown
3. Add a note or task
4. Data is saved locally!
5. Go back "Online"
6. If CouchDB is configured, it syncs automatically

## Step 6: Create Your First MiniApp

Create `src/miniapps/HelloApp.js`:

```javascript
import { MiniApp } from '../core/MiniApp.js';

class HelloApp extends MiniApp {
  constructor(options = {}) {
    super({ name: 'HelloApp', ...options });
  }

  async onRender() {
    this.clearContainer();

    const header = this.createElement('div',
      { className: 'miniapp-header' },
      [this.createElement('h2', {}, ['Hello World!'])]
    );

    const message = this.createElement('p', {},
      ['This is my first MiniApp!']
    );

    this.container.appendChild(header);
    this.container.appendChild(message);
  }

  onDestroy() {
    // Cleanup if needed
  }
}

export { HelloApp };
```

Register it in `src/app.js`:

```javascript
import { HelloApp } from './miniapps/HelloApp.js';

// In registerMiniApps()
this.appManager.register(HelloApp);
```

Add a button in `index.html`:

```html
<button id="toggle-hello" class="btn btn-control">Show Hello</button>
<div id="hello-container" class="miniapp-container"></div>
```

Add handler in `src/app.js` setupUI():

```javascript
const toggleHelloBtn = document.getElementById('toggle-hello');
toggleHelloBtn.addEventListener('click', () =>
  this.toggleMiniApp('HelloApp', 'hello-container')
);
```

Refresh the browser - you now have a working MiniApp!

## Step 7: Add Database Integration

Update your HelloApp:

```javascript
class HelloApp extends MiniApp {
  async onInit() {
    // Subscribe to data changes
    this.subscribeToData('greeting', (change) => {
      this.handleGreetingChange(change);
    });

    // Load greetings
    this.greetings = await this.db.query({
      selector: { type: 'greeting' }
    });
  }

  async onRender() {
    this.clearContainer();

    // Header
    const header = this.createElement('div',
      { className: 'miniapp-header' },
      [this.createElement('h2', {}, ['Hello World!'])]
    );

    // Input
    const input = this.createElement('input', {
      type: 'text',
      placeholder: 'Your name...',
      className: 'input'
    });

    // Button
    const button = this.createElement('button', {
      className: 'btn btn-primary',
      onClick: async () => {
        await this.saveGreeting(input.value);
        input.value = '';
      }
    }, ['Say Hello']);

    // List
    const list = this.createElement('div', { className: 'list' });
    this.greetings.forEach(greeting => {
      const item = this.createElement('div',
        { className: 'list-item' },
        [`Hello, ${greeting.name}!`]
      );
      list.appendChild(item);
    });

    this.container.appendChild(header);
    this.container.appendChild(input);
    this.container.appendChild(button);
    this.container.appendChild(list);
  }

  async saveGreeting(name) {
    if (!name.trim()) return;

    await this.db.create({
      _id: `greeting_${Date.now()}`,
      type: 'greeting',
      name: name.trim()
    });
  }

  handleGreetingChange(change) {
    if (!change.deleted) {
      this.greetings.push(change.doc);
      this.render(); // Re-render with new data
    }
  }

  onDestroy() {
    // Cleanup
  }
}
```

Now your app saves data and updates in real-time!

## Step 8: Test Inter-App Communication

Add event emission:

```javascript
async saveGreeting(name) {
  const greeting = await this.db.create({
    _id: `greeting_${Date.now()}`,
    type: 'greeting',
    name: name.trim()
  });

  // Emit event for other apps
  this.emit('greeting:saved', greeting);
}
```

In another app, subscribe:

```javascript
this.subscribe('greeting:saved', (greeting) => {
  console.log('New greeting:', greeting);
  // React to the event
});
```

## Step 9: Style Your App

Add to `styles/miniapps.css`:

```css
.hello-greeting {
  padding: 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 0.5rem;
  margin: 0.5rem 0;
}
```

Use in your app:

```javascript
const item = this.createElement('div',
  { className: 'hello-greeting' },
  [`Hello, ${greeting.name}!`]
);
```

## Step 10: Build for Mobile (Optional)

### Android

```bash
# One-time setup
npm run capacitor:init
npm run capacitor:add:android

# Build
npm run build:android
```

This opens Android Studio. Click "Run" to test on emulator or device.

### iOS

```bash
# One-time setup
npm run capacitor:add:ios

# Build
npm run build:ios
```

This opens Xcode. Click "Run" to test on simulator or device.

## Next Steps

- Read the [README.md](README.md) for full documentation
- Check [EXAMPLES.md](EXAMPLES.md) for more patterns
- Review [ARCHITECTURE.md](ARCHITECTURE.md) for deep dive
- Build your own MiniApps!

## Common Tasks

### View all data in console

```javascript
const data = await appManager.dbManager.query({});
console.table(data);
```

### Clear all data

```javascript
// WARNING: This deletes everything!
const docs = await appManager.dbManager.query({});
for (const doc of docs) {
  await appManager.dbManager.delete(doc);
}
```

### Enable CouchDB sync

Edit `src/app.js`:

```javascript
this.appManager = new AppManager({
  database: {
    dbName: 'miniapp_db',
    remoteURL: 'http://admin:password@localhost:5984/miniapp_db'
  }
});
```

### Change log level

```javascript
import { Logger, LoggerFactory } from './core/Logger.js';

// Set to DEBUG to see everything
LoggerFactory.setGlobalLevel(Logger.LOG_LEVELS.DEBUG);

// Set to ERROR to see only errors
LoggerFactory.setGlobalLevel(Logger.LOG_LEVELS.ERROR);
```

## Troubleshooting

### "Module not found" errors

Make sure all imports use the `.js` extension:

```javascript
// ✅ Correct
import { MiniApp } from '../core/MiniApp.js';

// ❌ Wrong
import { MiniApp } from '../core/MiniApp';
```

### Changes not appearing

1. Check console for errors (F12)
2. Verify you called `render()` or `update()`
3. Make sure MiniApp is active (not hidden)

### Data not persisting

1. Check if database initialized: `appManager.dbManager.db`
2. Verify document has `_id` and `type` fields
3. Check for errors in console

### App not loading

1. Check that dev server is running (`npm run dev`)
2. Clear browser cache (Ctrl+Shift+Delete)
3. Check console for JavaScript errors

## Get Help

- Read the docs in this repo
- Check console logs for errors
- Use browser DevTools to inspect

---

**You're ready to build amazing MiniApps! 🚀**
