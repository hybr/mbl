# Changelog

All notable changes to the MiniApp System will be documented in this file.

## [1.0.1] - 2025-11-26

### Fixed
- **Document update conflicts** - DatabaseManager now automatically fetches the latest document version before update/delete operations to prevent 409 conflict errors
- **Stale _rev handling** - Update and delete methods now merge changes with the latest revision from PouchDB

### Added
- **Notification system** - New `Notification.js` utility for toast notifications
- **Toast styles** - Added CSS for success/error/warning/info toast notifications
- **User feedback** - MiniApps now show toast notifications for delete operations
- **TROUBLESHOOTING.md** - Comprehensive troubleshooting guide
- **CHANGELOG.md** - This file to track changes

### Changed
- `DatabaseManager.delete()` - Now fetches latest version before deletion
- `DatabaseManager.update()` - Now merges with latest version to prevent conflicts
- `TasksApp` - Added success/error notifications for operations
- `NotesApp` - Added success/error notifications for operations
- `TasksApp.toggleTask()` - Now updates local reference with new _rev after update

### Technical Details

**Before:**
```javascript
async delete(doc) {
  // Direct delete - could fail if _rev is stale
  const result = await this.db.remove(doc);
  return result;
}
```

**After:**
```javascript
async delete(doc) {
  // Fetch latest version first
  const latestDoc = await this.db.get(doc._id);
  const result = await this.db.remove(latestDoc);
  return result;
}
```

This prevents the common 409 conflict error when documents are updated via real-time sync while the UI holds a stale reference.

---

## [1.0.0] - 2025-11-26

### Initial Release

Complete Pure JavaScript MiniApp architecture with:

#### Core Framework
- `AppManager` - Central application manager
- `MiniApp` - Base class for all mini-applications
- `DatabaseManager` - PouchDB wrapper with CouchDB sync
- `EventBus` - Global event system
- `Logger` - Structured logging

#### Components
- `Component` - Base UI component class
- `Button` - Button component
- `Input` - Input component
- `List` - List component

#### Sample Applications
- `NotesApp` - Note management with CRUD
- `TasksApp` - Task management with filters
- `SettingsApp` - Diagnostics and settings

#### Features
- ✅ Pure JavaScript ES6 classes
- ✅ No frameworks, bundlers, or TypeScript
- ✅ Offline-first with PouchDB
- ✅ Real-time synchronization with CouchDB
- ✅ Event-driven inter-app communication
- ✅ Automatic memory management
- ✅ Scales to 100+ mini-apps
- ✅ Mobile-ready with Capacitor
- ✅ Comprehensive documentation

#### Documentation
- `README.md` - Complete user guide
- `ARCHITECTURE.md` - Technical documentation
- `EXAMPLES.md` - Code examples and recipes
- `QUICKSTART.md` - Getting started guide
- `DIAGRAMS.md` - Visual architecture diagrams
- `PROJECT_SUMMARY.md` - Project overview

#### Infrastructure
- `package.json` - NPM configuration
- `capacitor.config.json` - Mobile configuration
- Complete CSS styling system
- Development server setup

---

## Version History

### Release Versioning

This project follows [Semantic Versioning](https://semver.org/):

- **MAJOR** version: Incompatible API changes
- **MINOR** version: Backwards-compatible functionality additions
- **PATCH** version: Backwards-compatible bug fixes

### Upgrade Guide

#### From 1.0.0 to 1.0.1

No breaking changes. Simply update your files:

1. Replace `src/core/DatabaseManager.js`
2. Replace `src/miniapps/TasksApp.js`
3. Replace `src/miniapps/NotesApp.js`
4. Add `src/utils/Notification.js`
5. Update `styles/components.css`

Your existing code will continue to work without modifications.

---

## Roadmap

### Planned Features

#### v1.1.0 (Minor Release)
- [ ] Router system for URL-based navigation
- [ ] State management store
- [ ] Form validation utilities
- [ ] Animation helpers

#### v1.2.0 (Minor Release)
- [ ] Virtual scrolling for large lists
- [ ] Plugin system
- [ ] CLI tool for generating boilerplate
- [ ] Hot module replacement

#### v2.0.0 (Major Release)
- [ ] TypeScript support (optional)
- [ ] React adapter
- [ ] Vue adapter
- [ ] Testing framework

### Community Requests

Submit feature requests via GitHub issues.

---

## Migration Guides

### Breaking Changes

None yet! Version 1.0.x is stable.

---

## Security Updates

No security vulnerabilities reported.

If you discover a security issue, please email: [your-email]

---

## Credits

Built with ❤️ using Pure JavaScript.

**Technologies:**
- PouchDB - Client-side database
- Capacitor - Mobile runtime
- ES6 Modules - Native JavaScript modules

---

## License

MIT License - See LICENSE file for details.
