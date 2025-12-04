# PersonManagementApp Folder Structure

## Location
`src/miniapps/PersonManagementApp/`

## Files

### Core Files
- **PersonManagementMiniApp.js** - Main MiniApp class with all functionality
- **PersonManagementMiniApp.css** - Complete styling for the MiniApp UI
- **person-demo.html** - Standalone demo page for testing

### Data Files
- **person-sample-data.json** - Sample person records and data structures

### Documentation
- **README.md** - Main API documentation and usage guide
- **AUTHENTICATION_FEATURES.md** - Login, logout, and profile features
- **FEATURE_SUMMARY.md** - Quick start guide and feature overview
- **INTEGRATION_GUIDE.md** - Capacitor and CouchDB integration
- **TROUBLESHOOTING.md** - Common errors and solutions
- **FIXES_APPLIED.md** - PouchDB plugin fixes documentation
- **FOLDER_STRUCTURE.md** - This file

## Usage

### Standalone Demo
```bash
# Open the demo in browser
open person-demo.html
```

### Integration in Main App
```html
<link rel="stylesheet" href="src/miniapps/PersonManagementApp/PersonManagementMiniApp.css">
<script src="src/miniapps/PersonManagementApp/PersonManagementMiniApp.js"></script>
```

### With Module System
```javascript
import PersonManagementMiniApp from './src/miniapps/PersonManagementApp/PersonManagementMiniApp.js';

const personApp = new PersonManagementMiniApp({
  container: '#person-app',
  dbName: 'persons',
  appManager: appManager
});

await personApp.init();
```

## Dependencies

### External (CDN in demo)
- PouchDB 8.0.1
- PouchDB Find plugin 8.0.1

### Internal
- AppManager.js (located at root level: `../../../AppManager.js`)

## File Sizes

| File | Size | Description |
|------|------|-------------|
| PersonManagementMiniApp.js | ~37KB | Main logic |
| PersonManagementMiniApp.css | ~9KB | Styles |
| README.md | ~14KB | API docs |
| AUTHENTICATION_FEATURES.md | ~12KB | Auth guide |
| FEATURE_SUMMARY.md | ~13KB | Quick start |
| INTEGRATION_GUIDE.md | ~13KB | Integration |
| person-sample-data.json | ~9KB | Sample data |
| TROUBLESHOOTING.md | ~2KB | Troubleshooting |
| FIXES_APPLIED.md | ~6KB | Fix documentation |

## Related Files

Files that work with PersonManagementApp but are in different locations:

- **AppManager.js** - `C:\Users\Faber\b\y\mbl\AppManager.js`
  - Global orchestrator for all MiniApps
  - Handles inter-app communication and events

## Features Included

✅ Complete CRUD for person records
✅ Authentication and login system
✅ User profile view with navigation
✅ Session persistence (24hr)
✅ Real-time UI updates
✅ Parent relations (father/mother)
✅ Password hashing and validation
✅ Username uniqueness check
✅ OTP support
✅ Account lockout protection
✅ Mobile responsive design
✅ PouchDB offline-first storage
✅ CouchDB sync capability

## Quick Start

1. **View the demo:**
   - Open `person-demo.html` in browser
   - No build step required

2. **Create a test user:**
   ```javascript
   await personApp.savePerson({
     firstName: 'Test',
     lastName: 'User',
     primaryEmail: 'test@example.com',
     username: 'testuser',
     password: 'password123'
   });
   ```

3. **Login:**
   - Click "Login" button
   - Username: `testuser`
   - Password: `password123`

4. **Explore profile:**
   - Click "My" button after login
   - Try navigation buttons (Tasks, Notes, Settings)
   - Click "Logout" when done

## Notes

- All paths in `person-demo.html` are relative to the PersonManagementApp folder
- AppManager.js is referenced as `../../../AppManager.js` (up 3 levels from src/miniapps/PersonManagementApp)
- For production, copy AppManager.js to your desired location and update paths

## Development

When modifying files in this folder:

1. **Test changes** in `person-demo.html`
2. **Update documentation** if adding new features
3. **Maintain backward compatibility** with existing integrations
4. **Follow ES6 class patterns** used throughout

## Integration Example

See `README.md` for complete integration examples with:
- Basic setup
- AppManager integration
- Multiple MiniApp coordination
- Event handling
- Session management
