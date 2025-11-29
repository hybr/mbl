# Clear Database and Reset Application

If you're experiencing issues with duplicate usernames or subdomains after deleting the database, follow these steps to completely reset:

## Method 1: Clear from Browser DevTools (Recommended)

1. Open the browser DevTools (F12)
2. Go to the **Application** tab (Chrome) or **Storage** tab (Firefox)
3. In the left sidebar, find **IndexedDB**
4. Expand IndexedDB and you should see `_pouch_miniapp_db` or similar
5. Right-click on it and select **Delete database**
6. Also clear:
   - **Local Storage**: Delete all items under your domain
   - **Session Storage**: Delete all items
7. Close DevTools and hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

## Method 2: Use Console Commands

1. Open browser console (F12, then Console tab)
2. Run these commands:

```javascript
// Delete the PouchDB database
const db = new PouchDB('miniapp_db');
await db.destroy();
console.log('Database destroyed');

// Clear localStorage
localStorage.clear();
console.log('LocalStorage cleared');

// Reload the page
location.reload();
```

## Method 3: Clear All Site Data (Nuclear Option)

**Chrome:**
1. Click the lock/info icon in the address bar
2. Click "Site settings"
3. Click "Clear data" button
4. Reload the page

**Firefox:**
1. Click the lock/info icon in the address bar
2. Click "Clear Cookies and Site Data"
3. Reload the page

## Verify Database is Empty

After clearing, run this in the console:

```javascript
const db = new PouchDB('miniapp_db');
const info = await db.allDocs({ include_docs: true });
console.log('Total documents:', info.total_rows);
console.log('Documents:', info.rows);
```

Should show: `Total documents: 0`

## Common Issues

### "Username already exists" after clearing database

**Cause:** Browser cache or session data not fully cleared

**Solution:**
1. Close ALL browser tabs with the app
2. Clear cache (Ctrl+Shift+Delete)
3. Open the app in a new incognito/private window
4. Try signing up again

### Database recreates with old data

**Cause:** CouchDB sync is enabled and restoring old data

**Solution:**
1. Check if `remoteURL` is set in `src/app.js`
2. If syncing, you also need to clear the remote CouchDB database

### Indexes not working

**Cause:** PouchDB Find plugin not loaded or indexes not created

**Solution:**
1. Check that `pouchdb.find.min.js` is loaded in index.html
2. Hard refresh (Ctrl+Shift+R)
3. Check console for "Database indexes created" messages

## Development Reset Script

Add this to your app for quick resets during development:

```javascript
// In browser console or add to app.js temporarily
window.resetApp = async function() {
  try {
    // Destroy database
    const db = new PouchDB('miniapp_db');
    await db.destroy();
    console.log('✓ Database destroyed');

    // Clear storage
    localStorage.clear();
    sessionStorage.clear();
    console.log('✓ Storage cleared');

    // Reload
    console.log('Reloading...');
    location.reload();
  } catch (error) {
    console.error('Reset failed:', error);
  }
};

// Then just run: resetApp()
```

## After Reset Checklist

- [ ] Database shows 0 documents
- [ ] LocalStorage is empty
- [ ] Session is cleared (no logged-in user)
- [ ] Can create first user successfully
- [ ] Username uniqueness check works
- [ ] Can create organizations with unique subdomains
