# Person Management MiniApp

A complete person management system built as a pure ES6 JavaScript MiniApp for Capacitor mobile applications. Features offline-first storage with PouchDB, credential management, authentication, and parent relation tracking.

## Features

- **Complete Person Profiles**: Manage detailed person information including identity, contact details, and family relations
- **Credential Management**: Secure username/password authentication with OTP support
- **Offline-First**: Built on PouchDB for full offline capability with CouchDB sync support
- **Real-Time Updates**: Automatic UI updates when data changes
- **Parent Relations**: Track father/mother relationships between persons
- **Validation**: Comprehensive data validation including unique username checks
- **Multiple MiniApps**: Designed to coexist with other MiniApps via AppManager

## Files

- `PersonManagementMiniApp.js` - Main MiniApp class
- `PersonManagementMiniApp.css` - Styling for the MiniApp UI
- `AppManager.js` - Global manager for orchestrating multiple MiniApps
- `person-demo.html` - Standalone demo page
- `PERSON_MINIAPP_README.md` - This documentation file

## Requirements

- **PouchDB** - Core database library
- **PouchDB Find Plugin** - Required for indexed queries (optional, fallback provided)

## Quick Start

### 1. Basic Setup

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="PersonManagementMiniApp.css">
</head>
<body>
  <div id="app"></div>

  <!-- PouchDB and Find Plugin -->
  <script src="https://cdn.jsdelivr.net/npm/pouchdb@8.0.1/dist/pouchdb.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/pouchdb@8.0.1/dist/pouchdb.find.min.js"></script>

  <!-- MiniApp Files -->
  <script src="AppManager.js"></script>
  <script src="PersonManagementMiniApp.js"></script>

  <script>
    // Create AppManager
    const appManager = new AppManager();

    // Initialize Person MiniApp
    const personApp = new PersonManagementMiniApp({
      container: '#app',
      dbName: 'persons',
      appManager: appManager
    });

    // Initialize and register
    personApp.init().then(() => {
      appManager.register(personApp);
      console.log('Person Management MiniApp ready!');
    });
  </script>
</body>
</html>
```

**Note:** The PouchDB Find plugin is recommended for better performance but not required. The app will fall back to using `allDocs()` if the find plugin is not available.

### 2. Running the Demo

Open `person-demo.html` in your browser to see a full working example.

## Person Data Structure

Each person record contains:

### Identity Fields
```javascript
{
  namePrefix: 'Dr.',        // Optional - Mr., Mrs., Dr., etc.
  firstName: 'John',        // Required
  middleName: 'Robert',     // Optional
  lastName: 'Doe',          // Optional
  nameSuffix: 'Jr.',        // Optional - Jr., Sr., III, etc.
  dateOfBirth: '1990-01-15', // Optional - ISO date string
  gender: 'M'               // Optional - 'M', 'F', or 'O'
}
```

### Contact Fields
```javascript
{
  primaryPhone: '+1234567890',      // Optional
  primaryEmail: 'john@example.com'  // Required (not unique)
}
```

### Relations
```javascript
{
  fatherId: 'person:uuid-123',  // Optional - references another person
  motherId: 'person:uuid-456'   // Optional - references another person
}
```

### Credentials
```javascript
{
  username: 'johndoe',  // Required, unique, case-insensitive
  credentials: {
    hashedPassword: 'sha256hash...',
    otp: '123456',                    // Optional OTP for login
    failedLoginAttempts: 0,
    lastLoginAt: '2025-01-15T10:30:00Z',
    lastFailedLoginAt: '2025-01-15T09:30:00Z',
    passwordUpdatedAt: '2025-01-01T00:00:00Z'
  }
}
```

### Metadata
```javascript
{
  _id: 'person:uuid',
  _rev: '1-abc',
  type: 'person',
  createdAt: '2025-01-15T10:00:00Z',
  updatedAt: '2025-01-15T10:30:00Z'
}
```

## API Reference

### Constructor

```javascript
new PersonManagementMiniApp(options)
```

**Options:**
- `container` (string|Element) - DOM selector or element to mount the app
- `dbName` (string) - PouchDB database name (default: 'persons')
- `appManager` (AppManager) - Optional AppManager instance for inter-app communication

### Methods

#### Lifecycle Methods

**`async init()`**
Initialize the MiniApp, create database indexes, and render initial UI.

```javascript
await personApp.init();
```

**`async render()`**
Render or re-render the current view.

```javascript
await personApp.render();
```

**`destroy()`**
Clean up the MiniApp, remove event listeners, and clear the container.

```javascript
personApp.destroy();
```

#### Data Methods

**`async loadPerson(id)`**
Load a person record by ID.

```javascript
const person = await personApp.loadPerson('person:uuid-123');
console.log(person.firstName); // "John"
```

**`async savePerson(data)`**
Create or update a person. Validates data and handles password hashing.

```javascript
const person = await personApp.savePerson({
  firstName: 'Jane',
  lastName: 'Smith',
  primaryEmail: 'jane@example.com',
  username: 'janesmith',
  password: 'secure123'
});
```

**`async getAllPersons()`**
Get all person records from the database.

```javascript
const persons = await personApp.getAllPersons();
console.log(persons.length); // Number of persons
```

**`async validatePerson(data)`**
Validate person data before saving.

```javascript
const validation = await personApp.validatePerson({
  firstName: 'John',
  primaryEmail: 'john@example.com',
  username: 'johndoe'
});

if (!validation.valid) {
  console.error(validation.errors);
}
```

**`async isUsernameUnique(username, excludeId)`**
Check if a username is unique (case-insensitive).

```javascript
const isUnique = await personApp.isUsernameUnique('johndoe');
if (!isUnique) {
  alert('Username already taken');
}
```

#### Authentication Methods

**`async authenticate(username, password, otp)`**
Authenticate a user with username and password, optionally with OTP.

```javascript
const result = await personApp.authenticate('johndoe', 'password123');

if (result.success) {
  console.log('Logged in:', result.person.username);
} else {
  console.error(result.message);
}
```

**`async hashPassword(plainPassword)`**
Hash a plain text password (uses SHA-256 for demo, use bcrypt in production).

```javascript
const hashed = await personApp.hashPassword('mypassword');
```

#### Helper Methods

**`getFullName(person)`**
Get formatted full name from person object.

```javascript
const fullName = personApp.getFullName(person);
// "Dr. John Robert Doe Jr."
```

**`isValidEmail(email)`**
Validate email format.

```javascript
const valid = personApp.isValidEmail('test@example.com'); // true
```

### Events

The MiniApp emits events through the AppManager:

**`person:login`**
Fired when a user successfully logs in.

```javascript
appManager.on('person:login', (data) => {
  console.log('User logged in:', data.person.username);
  console.log('Timestamp:', data.timestamp);
});
```

**`person:changed`**
Fired when a person record is created, updated, or deleted.

```javascript
appManager.on('person:changed', (change) => {
  console.log('Person changed:', change.id);
  console.log('Deleted:', change.deleted);
});
```

## Usage Examples

### Example 1: Create a Person Programmatically

```javascript
async function createPerson() {
  try {
    const person = await personApp.savePerson({
      firstName: 'Alice',
      lastName: 'Johnson',
      primaryEmail: 'alice@example.com',
      username: 'alicej',
      password: 'secure123',
      gender: 'F',
      dateOfBirth: '1985-05-20'
    });

    console.log('Person created:', person._id);
  } catch (error) {
    console.error('Failed to create person:', error.message);
  }
}
```

### Example 2: Create Person with Parent Relations

```javascript
async function createFamily() {
  // Create father
  const father = await personApp.savePerson({
    firstName: 'Robert',
    lastName: 'Smith',
    primaryEmail: 'robert@example.com',
    username: 'robertsmith',
    password: 'password123',
    gender: 'M'
  });

  // Create mother
  const mother = await personApp.savePerson({
    firstName: 'Mary',
    lastName: 'Smith',
    primaryEmail: 'mary@example.com',
    username: 'marysmith',
    password: 'password123',
    gender: 'F'
  });

  // Create child with parent relations
  const child = await personApp.savePerson({
    firstName: 'Tommy',
    lastName: 'Smith',
    primaryEmail: 'tommy@example.com',
    username: 'tommysmith',
    password: 'password123',
    gender: 'M',
    fatherId: father._id,
    motherId: mother._id
  });

  console.log('Family created!');
}
```

### Example 3: Login Flow

```javascript
async function loginUser() {
  const result = await personApp.authenticate('johndoe', 'password123');

  if (result.success) {
    // Login successful
    console.log('Welcome,', result.person.firstName);

    // Check last login
    console.log('Last login:', result.person.credentials.lastLoginAt);
  } else {
    // Login failed
    alert(result.message);
  }
}
```

### Example 4: Update Person Password

```javascript
async function changePassword(personId, newPassword) {
  try {
    const person = await personApp.loadPerson(personId);

    // Update with new password
    await personApp.savePerson({
      _id: person._id,
      _rev: person._rev,
      ...person,
      password: newPassword
    });

    console.log('Password updated successfully');
  } catch (error) {
    console.error('Failed to update password:', error.message);
  }
}
```

### Example 5: Search Persons

```javascript
async function searchByEmail(email) {
  const persons = await personApp.getAllPersons();

  return persons.filter(p =>
    p.primaryEmail && p.primaryEmail.toLowerCase().includes(email.toLowerCase())
  );
}

// Usage
const results = await searchByEmail('example.com');
console.log('Found', results.length, 'persons');
```

### Example 6: Failed Login Attempt Handling

```javascript
async function loginWithLockout(username, password) {
  const result = await personApp.authenticate(username, password);

  if (!result.success) {
    if (result.message.includes('locked')) {
      alert('Your account is locked. Please contact support.');
    } else {
      alert('Invalid credentials. Please try again.');
    }
  }

  return result;
}
```

## AppManager Integration

### Register Multiple MiniApps

```javascript
const appManager = new AppManager();

// Create and register person app
const personApp = new PersonManagementMiniApp({
  container: '#person-app',
  appManager: appManager
});

await personApp.init();
appManager.register(personApp, 'persons');

// Create and register another miniapp
const tasksApp = new TasksMiniApp({
  container: '#tasks-app',
  appManager: appManager
});

await tasksApp.init();
appManager.register(tasksApp, 'tasks');

// Cross-app communication
appManager.on('person:login', (data) => {
  // Notify tasks app of login
  tasksApp.setCurrentUser(data.person);
});
```

### AppManager API

```javascript
// Get statistics
const stats = appManager.getStats();
console.log('Total apps:', stats.total);
console.log('Initialized:', stats.initialized);

// Get specific app
const app = appManager.getApp('persons');

// Destroy all apps
appManager.destroyAll();
```

## PouchDB Integration

### Database Indexes

The MiniApp automatically creates these indexes on initialization:

- `username` - For fast username lookups
- `primaryEmail` - For email searches
- `type` - For filtering person documents

### Syncing with CouchDB

```javascript
// Set up continuous sync
const remoteDB = new PouchDB('http://localhost:5984/persons');

personApp.db.sync(remoteDB, {
  live: true,
  retry: true
}).on('change', (info) => {
  console.log('Sync change:', info);
}).on('error', (err) => {
  console.error('Sync error:', err);
});
```

### Conflict Resolution

```javascript
personApp.db.changes({
  since: 'now',
  live: true,
  include_docs: true
}).on('change', (change) => {
  if (change.doc._conflicts) {
    console.log('Conflict detected:', change.id);
    // Handle conflict resolution
  }
});
```

## Security Considerations

### Production Recommendations

1. **Password Hashing**: The demo uses SHA-256. In production, use bcrypt or Argon2:

```javascript
// Replace hashPassword method with bcrypt
async hashPassword(plainPassword) {
  const bcrypt = await import('bcryptjs');
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(plainPassword, salt);
}
```

2. **HTTPS Only**: Always use HTTPS in production
3. **Input Sanitization**: Sanitize all user inputs to prevent XSS
4. **Rate Limiting**: Implement rate limiting on login attempts
5. **Secure Storage**: Consider encrypting sensitive data in PouchDB
6. **OTP Security**: Use time-based OTPs (TOTP) instead of static OTPs

## Browser Support

- Modern browsers with ES6 support
- Chrome 51+
- Firefox 54+
- Safari 10+
- Edge 15+

## Mobile (Capacitor) Integration

```javascript
import { Capacitor } from '@capacitor/core';

// Check if running in native app
if (Capacitor.isNativePlatform()) {
  console.log('Running in Capacitor');

  // Use SQLite plugin for better performance
  const db = new PouchDB('persons', {
    adapter: 'cordova-sqlite'
  });
}
```

## Troubleshooting

### Username Already Exists
- Usernames are case-insensitive
- Check with `isUsernameUnique()` before creating

### PouchDB Not Found
- Ensure PouchDB script is loaded before PersonManagementMiniApp.js
- Check browser console for errors

### UI Not Updating
- Verify change listener is active
- Check that `onDataChanged()` is being called
- Ensure container element exists

### Login Always Fails
- Verify password is being hashed correctly
- Check credentials object exists on person
- Ensure username case matches (it's case-insensitive)

## License

MIT License - Feel free to use in your projects

## Contributing

Contributions welcome! Please ensure:
- ES6 class-based architecture
- No external dependencies except PouchDB
- Comprehensive validation
- Real-time UI updates
- Mobile-friendly design

## Support

For issues and questions, please refer to the demo file `person-demo.html` for working examples.
