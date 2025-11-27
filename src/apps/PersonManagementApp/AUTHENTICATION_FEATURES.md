# Person Management MiniApp - Authentication & Profile Features

## Overview

The Person Management MiniApp now includes complete authentication and user profile management features with persistent sessions and dynamic UI based on login state.

## New Features

### 1. Authentication State Management

**Session Persistence**
- User sessions are stored in `localStorage` and restored on page reload
- Sessions expire after 24 hours for security
- Automatic session cleanup on logout

**Login State**
```javascript
// Check if user is logged in
if (personApp.isLoggedIn()) {
  console.log('Current user:', personApp.loggedInUser);
}

// Get current logged-in user
const user = personApp.loggedInUser;
```

### 2. Dynamic Header Button

**Before Login**
- Shows "Login" button (gray)
- Clicking opens the login form

**After Login**
- Shows "My" button (green)
- Clicking opens the user profile view

```html
<!-- Automatically rendered based on auth state -->
<button class="btn btn-secondary" data-action="login">Login</button>
<!-- OR -->
<button class="btn btn-user" data-action="profile">My</button>
```

### 3. User Profile View

**Profile Header**
- Avatar with initials (e.g., "JD" for John Doe)
- Full name display
- Username (@username)
- Email address

**Personal Information Section**
- Date of Birth (if provided)
- Gender
- Phone number
- Last login timestamp

**Quick Actions Navigation**
Four navigation buttons with icons:

1. **Tasks** - Navigate to Tasks MiniApp
   - Icon: ✓
   - Emits: `navigate:tasks` event

2. **Notes** - Navigate to Notes MiniApp
   - Icon: 📝
   - Emits: `navigate:notes` event

3. **Settings** - Navigate to Settings MiniApp
   - Icon: ⚙
   - Emits: `navigate:settings` event

4. **Edit Profile** - Edit current user's information
   - Icon: ✎
   - Opens edit form with user's data

**Logout Button**
- Red, full-width button at bottom
- Confirmation dialog before logout
- Clears session and returns to list view

### 4. Event System

**Login Event**
```javascript
appManager.on('person:login', (data) => {
  console.log('User:', data.person);
  console.log('Timestamp:', data.timestamp);
});
```

**Logout Event**
```javascript
appManager.on('person:logout', (data) => {
  console.log('Logged out at:', data.timestamp);
});
```

**Navigation Events**
```javascript
// Tasks navigation
appManager.on('navigate:tasks', (data) => {
  console.log('User navigating to tasks:', data.user);
  // Show tasks miniapp
});

// Notes navigation
appManager.on('navigate:notes', (data) => {
  console.log('User navigating to notes:', data.user);
  // Show notes miniapp
});

// Settings navigation
appManager.on('navigate:settings', (data) => {
  console.log('User navigating to settings:', data.user);
  // Show settings miniapp
});
```

## Usage Examples

### Example 1: Basic Login Flow

```javascript
// User clicks "Login" button in header
// → Opens login form
// User enters credentials and submits
// → Calls authenticate()
// → On success: saves session, shows "My" button
// → Redirects to list view
```

### Example 2: View Profile

```javascript
// User clicks "My" button
// → Opens profile view
// Shows user information and navigation buttons
```

### Example 3: Navigate to Other MiniApps

```javascript
// From profile view, user clicks "Tasks" button
// → Emits navigate:tasks event
// AppManager receives event and can:

appManager.on('navigate:tasks', (data) => {
  // Hide person miniapp
  document.getElementById('person-app').style.display = 'none';

  // Show tasks miniapp
  document.getElementById('tasks-app').style.display = 'block';

  // Pass user context to tasks app
  tasksApp.loadTasksForUser(data.user._id);
});
```

### Example 4: Session Persistence

```javascript
// Page load
const personApp = new PersonManagementMiniApp({ container: '#app' });
await personApp.init();

// Check if user is already logged in
if (personApp.isLoggedIn()) {
  console.log('Welcome back,', personApp.loggedInUser.firstName);
  // Show logged-in UI
  updateHeaderWithUser(personApp.loggedInUser);
}
```

### Example 5: Edit Profile from Profile View

```javascript
// User clicks "Edit Profile" button
// → Loads user data into edit form
// User makes changes and saves
// → Updates database
// → Updates loggedInUser
// → Re-saves session with new data
```

### Example 6: Complete Integration with Multiple MiniApps

```javascript
// main.js
const appManager = new AppManager();

// Initialize all miniapps
const personApp = new PersonManagementMiniApp({
  container: '#person-app',
  appManager: appManager
});

const tasksApp = new TasksMiniApp({
  container: '#tasks-app',
  appManager: appManager
});

const notesApp = new NotesMiniApp({
  container: '#notes-app',
  appManager: appManager
});

await personApp.init();
await tasksApp.init();
await notesApp.init();

appManager.register(personApp, 'persons');
appManager.register(tasksApp, 'tasks');
appManager.register(notesApp, 'notes');

// Handle cross-miniapp navigation
appManager.on('navigate:tasks', (data) => {
  showMiniApp('tasks');
  tasksApp.setUser(data.user);
});

appManager.on('navigate:notes', (data) => {
  showMiniApp('notes');
  notesApp.setUser(data.user);
});

appManager.on('person:login', (data) => {
  // Update all miniapps with logged-in user
  tasksApp.setUser(data.person);
  notesApp.setUser(data.person);
});

appManager.on('person:logout', () => {
  // Clear user from all miniapps
  tasksApp.clearUser();
  notesApp.clearUser();
  showMiniApp('persons');
});

function showMiniApp(name) {
  document.getElementById('person-app').style.display =
    name === 'persons' ? 'block' : 'none';
  document.getElementById('tasks-app').style.display =
    name === 'tasks' ? 'block' : 'none';
  document.getElementById('notes-app').style.display =
    name === 'notes' ? 'block' : 'none';
}
```

## API Reference

### New Methods

**`restoreSession()`**
Restores user session from localStorage on initialization.

**`saveSession()`**
Saves current user session to localStorage.

**`clearSession()`**
Clears user session from memory and localStorage.

**`isLoggedIn()`**
Returns `true` if a user is currently logged in.

```javascript
if (personApp.isLoggedIn()) {
  // User is logged in
}
```

**`renderAuthButton()`**
Returns HTML for Login or My button based on auth state.

**`renderProfileView()`**
Renders the complete user profile view with navigation buttons.

**`getInitials(person)`**
Gets initials from person's name for avatar display.

```javascript
const initials = personApp.getInitials(person); // "JD"
```

**`getGenderLabel(gender)`**
Converts gender code to label.

```javascript
const label = personApp.getGenderLabel('M'); // "Male"
```

**`formatDate(dateString)`**
Formats ISO date string for display.

```javascript
const formatted = personApp.formatDate('2025-01-15T10:30:00Z');
// "1/15/2025, 10:30:00 AM"
```

### New Event Handlers

**`handleShowProfile()`**
Shows the profile view.

**`handleLogout()`**
Logs out the current user with confirmation.

**`handleNavigateToTasks()`**
Emits navigate:tasks event for AppManager.

**`handleNavigateToNotes()`**
Emits navigate:notes event for AppManager.

**`handleNavigateToSettings()`**
Emits navigate:settings event for AppManager.

**`handleEditProfile()`**
Opens edit form with current user's data.

**`attachProfileEventHandlers()`**
Attaches event listeners for profile view buttons.

## Styling

### New CSS Classes

**Button Styles**
- `.btn-user` - Green button for logged-in user (My button)
- `.btn-nav` - Navigation button with icon and text

**Profile Styles**
- `.profile-container` - Main profile container
- `.profile-header` - Profile header with avatar
- `.profile-avatar` - Avatar container
- `.avatar-circle` - Circular avatar with gradient
- `.profile-info` - User info section
- `.profile-details` - Personal information section
- `.detail-grid` - Grid layout for details
- `.detail-item` - Individual detail item
- `.detail-label` - Detail label (uppercase, gray)
- `.detail-value` - Detail value (larger, dark)
- `.profile-navigation` - Navigation buttons section
- `.nav-buttons` - Grid of navigation buttons
- `.profile-actions` - Logout button section
- `.btn-icon` - Icon in navigation button
- `.btn-text` - Text in navigation button

### Customization

```css
/* Custom avatar gradient */
.person-miniapp .avatar-circle {
  background: linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 100%);
}

/* Custom navigation button hover */
.person-miniapp .btn-nav:hover {
  border-color: #28a745;
  color: #28a745;
}

/* Custom My button color */
.person-miniapp .btn-user {
  background: #007bff;
}
```

## Security Considerations

1. **Session Expiration**: Sessions expire after 24 hours
2. **Local Storage**: Session data is stored in localStorage (not encrypted)
3. **Password Handling**: Passwords are hashed before storage
4. **Logout Confirmation**: Prevents accidental logouts
5. **Session Validation**: Age checked on every restore

### Production Recommendations

```javascript
// Add session encryption
function saveSession() {
  if (this.loggedInUser) {
    const sessionData = {
      user: this.loggedInUser,
      timestamp: new Date().toISOString()
    };
    // Encrypt session data
    const encrypted = encryptData(JSON.stringify(sessionData));
    localStorage.setItem('personapp_session', encrypted);
  }
}

// Add session token/JWT
function saveSession() {
  if (this.loggedInUser) {
    // Store only token, not full user data
    const token = generateJWT(this.loggedInUser);
    localStorage.setItem('personapp_token', token);
  }
}

// Add secure session timeout
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
let sessionTimer;

function resetSessionTimer() {
  clearTimeout(sessionTimer);
  sessionTimer = setTimeout(() => {
    this.handleLogout();
    alert('Session expired. Please login again.');
  }, SESSION_TIMEOUT);
}
```

## Testing

### Test Login Flow

```javascript
// Create test user
await personApp.savePerson({
  firstName: 'Test',
  lastName: 'User',
  primaryEmail: 'test@example.com',
  username: 'testuser',
  password: 'password123'
});

// Login
const result = await personApp.authenticate('testuser', 'password123');
console.log('Login:', result.success); // true

// Check session
console.log('Logged in:', personApp.isLoggedIn()); // true
console.log('User:', personApp.loggedInUser.username); // testuser

// Logout
await personApp.handleLogout();
console.log('Logged in:', personApp.isLoggedIn()); // false
```

### Test Session Persistence

```javascript
// Login
await personApp.authenticate('testuser', 'password123');

// Reload page (simulate)
const newPersonApp = new PersonManagementMiniApp({ container: '#app' });
await newPersonApp.init();

// Check session restored
console.log('Session restored:', newPersonApp.isLoggedIn()); // true
console.log('User:', newPersonApp.loggedInUser.username); // testuser
```

## Troubleshooting

### Session Not Persisting
- Check localStorage is enabled in browser
- Check for localStorage errors in console
- Verify session timestamp is valid

### My Button Not Showing
- Verify user is logged in: `personApp.isLoggedIn()`
- Check loggedInUser is set
- Ensure render() is called after login

### Profile View Empty
- Verify loggedInUser contains data
- Check browser console for errors
- Ensure user object has required fields

### Navigation Not Working
- Verify AppManager is properly configured
- Check event listeners are registered
- Ensure events are being emitted

## Demo

Open `person-demo.html` to see all features in action:

1. Create a person with username and password
2. Click "Login" button
3. Enter credentials and login
4. Notice "My" button appears (green)
5. Click "My" to view profile
6. Try navigation buttons (Tasks, Notes, Settings)
7. Click "Edit Profile" to modify
8. Click "Logout" to end session
9. Reload page - session should be restored

## Future Enhancements

- [ ] Profile picture upload
- [ ] Two-factor authentication
- [ ] Remember me checkbox
- [ ] Password strength indicator
- [ ] Social login integration
- [ ] Activity log in profile
- [ ] Customizable navigation buttons
- [ ] Theme preferences
- [ ] Privacy settings
