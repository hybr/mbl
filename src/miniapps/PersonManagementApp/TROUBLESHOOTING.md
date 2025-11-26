# Troubleshooting Guide - Person Management MiniApp

## Common Errors and Solutions

### Error: `this.db.createIndex is not a function`

**Cause:** PouchDB Find plugin is not loaded.

**Solution:**

Add the PouchDB Find plugin to your HTML:

```html
<!-- Add AFTER PouchDB but BEFORE PersonManagementMiniApp.js -->
<script src="https://cdn.jsdelivr.net/npm/pouchdb@8.0.1/dist/pouchdb.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/pouchdb@8.0.1/dist/pouchdb.find.min.js"></script>
```

Or install via npm:

```bash
npm install pouchdb pouchdb-find
```

**Note:** The app includes fallback logic and will work without the plugin, but with reduced performance.

---

### Error: `this.db.find is not a function`

**Cause:** Same as above - PouchDB Find plugin is missing.

**Solution:** Add the plugin as shown above. The app will use `allDocs()` as a fallback.

---

### Quick Fix Summary

**Problem:** PouchDB errors about missing functions
**Solution:** Add this line to your HTML:

```html
<script src="https://cdn.jsdelivr.net/npm/pouchdb@8.0.1/dist/pouchdb.find.min.js"></script>
```

Right after the main PouchDB script tag.

---

## Verification

Check if the plugin is loaded:

```javascript
// In browser console
console.log('PouchDB Find loaded:', typeof PouchDB.find !== 'undefined');
console.log('createIndex available:', typeof personApp.db.createIndex === 'function');
```

If both return `true`, the plugin is properly loaded.

---

## Other Common Issues

See the main README files for additional troubleshooting:
- `PERSON_MINIAPP_README.md` - Full API documentation
- `AUTHENTICATION_FEATURES.md` - Login/profile issues
- `INTEGRATION_GUIDE.md` - Capacitor/CouchDB issues
