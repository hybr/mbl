# Troubleshooting Guide

Common issues and their solutions.

## Database Conflicts

### Problem: "Document update conflict" error

**Symptoms:**
```
Failed to delete document: conflict
status: 409, name: 'conflict', message: 'Document update conflict'
```

**Cause:**
When documents are updated via real-time sync, local copies may have stale `_rev` values. PouchDB requires the latest `_rev` to perform updates or deletes.

**Solution:**
The `DatabaseManager` automatically fetches the latest version before update/delete operations:

```javascript
// DatabaseManager.js - Automatically handles conflicts
async delete(doc) {
  // Fetch latest version to avoid conflicts
  const latestDoc = await this.db.get(doc._id);
  const result = await this.db.remove(latestDoc);
  return result;
}

async update(doc) {
  // Fetch latest version and merge changes
  const latestDoc = await this.db.get(doc._id);
  const updatedDoc = {
    ...latestDoc,
    ...doc,
    _rev: latestDoc._rev
  };
  return await this.db.put(updatedDoc);
}
```

**Status:** ✅ Fixed in v1.0

---

## Module Import Errors

### Problem: "Module not found" or import errors

**Symptoms:**
```
Failed to load module script: Expected a JavaScript module script
```

**Cause:**
Missing `.js` extension in import statements.

**Solution:**
Always include `.js` extension:

```javascript
// ✅ Correct
import { MiniApp } from '../core/MiniApp.js';

// ❌ Wrong
import { MiniApp } from '../core/MiniApp';
```

---

## PouchDB Not Defined

### Problem: "PouchDB is not defined"

**Symptoms:**
```
ReferenceError: PouchDB is not defined
```

**Cause:**
PouchDB script not loaded before application code.

**Solution:**
Ensure PouchDB is loaded in `index.html` before your app:

```html
<!-- PouchDB must be loaded first -->
<script src="https://cdn.jsdelivr.net/npm/pouchdb@8.0.1/dist/pouchdb.min.js"></script>

<!-- Then your app -->
<script type="module" src="src/app.js"></script>
```

---

## Real-Time Updates Not Working

### Problem: UI doesn't update when data changes

**Symptoms:**
- Create/update operations succeed
- UI doesn't refresh automatically
- Other devices/tabs don't see changes

**Possible Causes & Solutions:**

### 1. MiniApp not subscribed to data

**Check:**
```javascript
// In your MiniApp onInit()
this.subscribeToData('yourtype', (change) => {
  this.handleDataChange(change);
});
```

### 2. Document missing 'type' field

**Check:**
```javascript
// Documents MUST have a type field
const doc = {
  _id: 'item_123',
  type: 'mytype',  // ← Required!
  data: 'value'
};
```

### 3. MiniApp is inactive

**Check:**
```javascript
// Only active mini-apps receive updates
if (!this.isActive) {
  // Won't process changes
}
```

**Solution:**
Call `miniapp.show()` to activate.

---

## Memory Leaks

### Problem: Memory usage grows over time

**Symptoms:**
- Browser becomes sluggish
- DevTools Performance shows growing memory
- App crashes after extended use

**Cause:**
Event listeners or subscriptions not cleaned up.

**Solution:**
The framework handles this automatically IF you use the provided methods:

```javascript
// ✅ Correct - Auto cleanup
this.addEventListener(element, 'click', handler);
this.subscribe('event:name', handler);
this.subscribeToData('type', handler);

// ❌ Wrong - Manual cleanup required
element.addEventListener('click', handler);
eventBus.on('event:name', handler);
```

**Verify cleanup:**
```javascript
// Check subscriptions before/after unmount
console.log(miniapp.eventSubscriptions.length);
console.log(miniapp.dbSubscriptions.length);
console.log(miniapp.domListeners.length);

// After destroy(), all should be 0
await appManager.unmount(miniappId);
```

---

## Sync Issues

### Problem: Data not syncing with CouchDB

**Symptoms:**
- Changes made offline don't sync when online
- Remote changes not appearing locally
- Sync errors in console

**Possible Causes & Solutions:**

### 1. CouchDB URL not configured

**Check `src/app.js`:**
```javascript
this.appManager = new AppManager({
  database: {
    remoteURL: 'http://localhost:5984/miniapp_db'  // Must be set!
  }
});
```

### 2. CORS not enabled on CouchDB

**Enable CORS in CouchDB:**
```bash
# Install CORS module
npm install -g add-cors-to-couchdb

# Enable CORS
add-cors-to-couchdb http://localhost:5984 -u admin -p password
```

### 3. Authentication failed

**Add credentials to URL:**
```javascript
remoteURL: 'http://username:password@localhost:5984/miniapp_db'
```

### 4. Network offline

**Check:**
```javascript
console.log(navigator.onLine);  // Should be true
console.log(appManager.dbManager.isOnline);
```

---

## Performance Issues

### Problem: App is slow or laggy

**Symptoms:**
- UI updates are delayed
- Typing is laggy
- Scrolling is not smooth

**Solutions:**

### 1. Too many active MiniApps

```javascript
// Check active instances
const active = appManager.getActiveInstances();
console.log(active.length);

// Unmount unused apps
await appManager.unmount(unusedId);
```

### 2. Large datasets without pagination

```javascript
// ❌ Bad - Load all data
const items = await this.db.query({ type: 'item' });

// ✅ Good - Use limit
const items = await this.db.query({
  type: 'item',
  limit: 50,
  skip: page * 50
});
```

### 3. Re-rendering entire list on changes

```javascript
// ✅ Better - Update only changed items
handleDataChange(change) {
  const index = this.items.findIndex(i => i._id === change.doc._id);
  if (index >= 0) {
    this.items[index] = change.doc;
    // Update just this one item in DOM
  }
}
```

### 4. No database indexes

```javascript
// Create indexes for frequently queried fields
await this.db.createIndex(['type', 'createdAt']);
await this.db.createIndex(['type', 'status']);
```

---

## Mobile Build Issues

### Problem: Capacitor build fails

**Android:**

```bash
# Clear and rebuild
cd android
./gradlew clean
cd ..
npx cap sync android
npx cap open android
```

**iOS:**

```bash
# Update pods
cd ios/App
pod install
cd ../..
npx cap sync ios
npx cap open ios
```

### Problem: App crashes on mobile

**Check Capacitor console:**
```javascript
// In your app
window.addEventListener('error', (e) => {
  console.error('Global error:', e);
});

// View logs:
// Android: adb logcat
// iOS: Safari → Develop → Device → Console
```

---

## Data Loss

### Problem: Data disappeared after refresh

**Cause:**
IndexedDB was cleared or browser in private mode.

**Prevention:**

1. **Always use CouchDB sync for production**
```javascript
remoteURL: 'https://your-couchdb.com/db'
```

2. **Export data regularly**
```javascript
// In SettingsApp
async exportData() {
  const data = await this.db.query({});
  const json = JSON.stringify(data, null, 2);
  // Download as JSON file
}
```

3. **Check browser settings**
- Not in private/incognito mode
- IndexedDB not disabled
- Sufficient storage available

---

## TypeScript Errors (If Using TypeScript)

### Problem: Type errors in .js files

**Solution:**
This project uses pure JavaScript. If you want TypeScript:

1. **Add JSDoc types:**
```javascript
/**
 * @param {string} id
 * @param {Object} options
 * @returns {Promise<MiniApp>}
 */
async mount(id, options) {
  // ...
}
```

2. **Or convert to TypeScript:**
```bash
# Install TypeScript
npm install -D typescript

# Rename .js to .ts
# Add type definitions
```

---

## Development Server Issues

### Problem: "Cannot GET /" or 404 errors

**Solution:**
```bash
# Make sure you're in the project directory
cd /path/to/mbl

# Start server
npm run dev

# Access at http://localhost:8080 (not file://)
```

### Problem: Changes not appearing

**Solution:**
1. Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
2. Clear cache: DevTools → Application → Clear Storage
3. Check console for errors

---

## Console Errors Reference

### Common Errors and Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `conflict` (409) | Stale `_rev` | ✅ Auto-fixed in v1.0 |
| `not_found` (404) | Document deleted | Check if doc exists before using |
| `Module not found` | Missing `.js` | Add `.js` to imports |
| `PouchDB not defined` | Script not loaded | Check `<script>` order in HTML |
| `Cannot read property of undefined` | Accessing null | Add null checks |
| `Maximum call stack exceeded` | Circular reference | Check for loops in objects |

---

## Getting Help

1. **Check Console Logs**
   - Open DevTools (F12)
   - Look for errors in Console tab
   - Check log level: `LoggerFactory.setGlobalLevel(Logger.LOG_LEVELS.DEBUG)`

2. **Check Database**
   ```javascript
   // View database info
   const info = await appManager.dbManager.getInfo();
   console.log(info);

   // View all documents
   const docs = await appManager.dbManager.query({});
   console.table(docs);
   ```

3. **Check App State**
   ```javascript
   // Get stats
   const stats = appManager.getStats();
   console.log(stats);

   // List instances
   const instances = appManager.getAllInstances();
   instances.forEach(i => console.log(i.getMetadata()));
   ```

4. **Enable Debug Mode**
   ```javascript
   // In src/app.js
   LoggerFactory.setGlobalLevel(Logger.LOG_LEVELS.DEBUG);
   ```

---

## Best Practices to Avoid Issues

1. **Always use provided helper methods**
   - `this.addEventListener()` instead of `element.addEventListener()`
   - `this.subscribe()` instead of `eventBus.on()`
   - `this.subscribeToData()` instead of `db.subscribe()`

2. **Include type in all documents**
   ```javascript
   { _id: '...', type: 'mytype', ...data }
   ```

3. **Implement onDestroy() in every MiniApp**
   ```javascript
   onDestroy() {
     // Cleanup code here
   }
   ```

4. **Use try-catch for async operations**
   ```javascript
   async myMethod() {
     try {
       await this.db.create(doc);
     } catch (error) {
       this.logger.error('Failed:', error);
     }
   }
   ```

5. **Test offline mode**
   - DevTools → Network → Offline
   - Verify app still works
   - Go online and verify sync

---

## Still Having Issues?

1. Check the [README.md](README.md) for setup instructions
2. Review [EXAMPLES.md](EXAMPLES.md) for code patterns
3. Read [ARCHITECTURE.md](ARCHITECTURE.md) for how things work
4. Check browser console for specific error messages
5. Search error messages in documentation

---

**Most issues are resolved by:**
- Using latest code (v1.0+)
- Following provided patterns
- Checking console errors
- Using proper cleanup methods
