# Organization Worker Association

## Overview

Organizations now support two types of user associations:

1. **Owner** - User who created the organization (`createdBy` field)
2. **Worker** - User who is a member/employee of the organization (`workers` array)

## Data Structure

### Organization Document

```javascript
{
  _id: "org_1234567890",
  type: "organization",
  name: "Acme Corporation",
  subdomain: "acme",
  legalTypeId: 1,
  industryId: 1,
  createdBy: "person_123",  // Owner's user ID
  createdByUsername: "john",
  workers: [                 // Array of worker associations
    {
      userId: "person_456",   // Worker's user ID
      username: "jane",       // Worker's username
      role: "employee",       // Optional: worker role
      addedAt: "2025-01-15T10:00:00Z",
      addedBy: "person_123"   // Who added this worker
    }
  ],
  // ... other organization fields
}
```

### Worker Object Structure

Each worker in the `workers` array can be:

**Simple format** (just user ID):
```javascript
"person_456"
```

**Extended format** (recommended):
```javascript
{
  userId: "person_456",
  username: "jane",
  role: "employee",          // Optional
  department: "Engineering", // Optional
  addedAt: "2025-01-15T10:00:00Z",
  addedBy: "person_123"
}
```

## How It Works

### Loading Organizations

The `loadOrganizations()` method:

1. Loads all organizations from the database
2. Filters organizations where user is the creator
3. Filters organizations where user is in the workers array
4. Combines both lists (removing duplicates)
5. Adds `_userRole` property to each organization:
   - `'owner'` - User created the organization
   - `'worker'` - User is in the workers array

### Displaying User Role

Each organization card shows the user's role:
- **👑 Owner** - Yellow badge for creators
- **👤 Worker** - Blue badge for workers

### Persistence

Organizations are automatically loaded on:
- App initialization (if user is logged in)
- User login
- Page refresh (session is restored from localStorage)

## Adding Workers to an Organization

Currently, the `workers` array is initialized as empty when creating an organization. To add workers, you'll need to implement a worker management interface.

### Future Implementation: Add Worker Function

```javascript
/**
 * Add a worker to an organization
 * @param {string} orgId - Organization ID
 * @param {string} userId - User ID to add as worker
 * @param {Object} options - Additional worker properties
 */
async addWorker(orgId, userId, options = {}) {
  try {
    // Load the organization
    const org = await this.db.read(orgId);

    if (!org) {
      throw new Error('Organization not found');
    }

    // Check if user is already a worker
    const isWorker = org.workers.some(w =>
      w.userId === userId || w === userId
    );

    if (isWorker) {
      Notification.error('User is already a worker in this organization');
      return;
    }

    // Create worker object
    const worker = {
      userId,
      username: options.username,
      role: options.role || 'employee',
      department: options.department,
      addedAt: new Date().toISOString(),
      addedBy: this.currentUser._id
    };

    // Add worker to array
    org.workers.push(worker);

    // Save organization
    await this.db.update(org);

    Notification.success('Worker added successfully');
    this.logger.info('Worker added to organization:', orgId, userId);

    // Reload organizations
    await this.loadOrganizations();

  } catch (error) {
    this.logger.error('Failed to add worker:', error);
    Notification.error('Failed to add worker');
  }
}
```

### Future Implementation: Remove Worker Function

```javascript
/**
 * Remove a worker from an organization
 * @param {string} orgId - Organization ID
 * @param {string} userId - User ID to remove
 */
async removeWorker(orgId, userId) {
  try {
    const org = await this.db.read(orgId);

    if (!org) {
      throw new Error('Organization not found');
    }

    // Remove worker from array
    org.workers = org.workers.filter(w => {
      const workerId = typeof w === 'string' ? w : w.userId;
      return workerId !== userId;
    });

    // Save organization
    await this.db.update(org);

    Notification.success('Worker removed successfully');
    this.logger.info('Worker removed from organization:', orgId, userId);

    // Reload organizations
    await this.loadOrganizations();

  } catch (error) {
    this.logger.error('Failed to remove worker:', error);
    Notification.error('Failed to remove worker');
  }
}
```

## UI Features Needed

To fully implement worker management, you'll need:

1. **Worker Management View**
   - List current workers
   - Add new workers (search users)
   - Remove workers
   - Update worker roles

2. **Permissions System**
   - Only owners can add/remove workers
   - Workers have limited edit permissions
   - Define what workers can/cannot do

3. **Worker Search/Invite**
   - Search existing users by username/email
   - Send invitations to join organization
   - Accept/decline invitations

## Example Usage

### Manual Worker Addition (Console)

```javascript
// Get the app instance
const orgApp = window.app.miniAppInstances.OrganizationApp;

// Get organization
const org = orgApp.organizations[0];

// Add worker manually
org.workers.push({
  userId: "person_456",
  username: "jane",
  role: "employee",
  addedAt: new Date().toISOString(),
  addedBy: orgApp.currentUser._id
});

// Save
await orgApp.db.update(org);

// Reload
await orgApp.loadOrganizations();
```

## Testing

1. **Create an organization** - Should see "👑 Owner" badge
2. **Add yourself as worker** (via console) - Should still see "👑 Owner" (owner takes precedence)
3. **Add another user as worker** - That user should see "👤 Worker" badge when they log in
4. **Refresh page** - Organizations should persist and show correct roles

## Next Steps

- [ ] Implement worker management UI
- [ ] Add permissions system
- [ ] Create worker invitation system
- [ ] Add worker roles and permissions
- [ ] Show worker list in organization details view
