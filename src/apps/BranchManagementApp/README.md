# BranchManagementApp

A comprehensive MiniApp for managing organizational branches, buildings, and workstations in a hierarchical structure.

## Overview

The BranchManagementApp provides a complete solution for managing the physical infrastructure of an organization, tracking:

- **Branches**: Organizational divisions or locations
- **Buildings**: Physical structures within each branch
- **Workstations**: Individual work areas within buildings
- **Worker Assignments**: Tracking which employees are assigned to which workstations

## Features

### Approval and Authorization System

All create, update, and delete operations for branches, buildings, and workstations require approval from authorized personnel:

**Authorized Users:**
1. **Organization Owner**: The person who created the organization
2. **Facilities Management - Space Planning Team Members**: Workers assigned to a workstation in:
   - Department: Facilities Management (code: "FACILITIES")
   - Team: Space Planning (teamCode: "SPACE-PLAN")
   - Designation Seniority: 6, 7, or 8

**Permission Behavior:**
- Unauthorized users see view-only access with a notification banner
- Create, Edit, and Delete buttons are hidden for users without approval authority
- Attempts to perform restricted operations show a permission denied message
- Assign/Unassign worker operations are available to all users

### Hierarchical Data Management

- **3-Level Hierarchy**: Organization → Branch → Buildings → Workstations
- **Cascading Operations**: Proper parent-child relationships with cascade delete protection
- **Real-time Statistics**: Automatic calculation and updates of counts across the hierarchy
- **Denormalized Data**: Optimized for quick lookups with parent names stored in children

### Branch Management

- Create, read, update, and delete branches
- Track branch status (active, inactive, planned, closed)
- Store contact information (phone, email)
- View statistics (total buildings, workstations, assigned workers)
- Organization-scoped: Each branch belongs to a specific organization

### Building Management

- Full CRUD operations for buildings within branches
- Building types: office, warehouse, retail, mixed use, industrial
- Physical location tracking:
  - Full postal addresses
  - Geographic coordinates (latitude/longitude)
- Building details:
  - Year built
  - Total floors
  - Square footage
- Status tracking (active, under construction, maintenance, closed)
- Workstation capacity statistics

### Workstation Management

- Comprehensive workstation tracking
- Multiple workstation types: desk, cubicle, hot desk, standing desk, bench, meeting room
- Equipment and amenities tracking (arrays of items)
- Location within building (floor, room number)
- Status: occupied, available, maintenance, reserved, unavailable

### Worker Assignment

- Assign workers to workstations from PersonManagementApp
- Track assignment details:
  - Employment type (full-time, part-time, contractor, intern)
  - Department
  - Position/role
  - Assignment date
- Unassign workers when needed
- Automatic availability tracking
- Event emission for integration with PersonManagementApp

### Views and Navigation

- **Branch List View**: Grid of branches with stats and actions
- **Building List View**: Buildings within a branch with breadcrumb navigation
- **Workstation List View**: Workstations within a building
- **Entity Details View**: Comprehensive view of any entity with all fields
- **Edit/Create Forms**: Dynamic forms adapting to entity type
- **Breadcrumb Navigation**: Easy navigation through the hierarchy

### User Interface

- Card-based layouts for easy scanning
- Status badges with color coding
- Responsive design for mobile and desktop
- Empty states for guidance
- Action buttons on cards
- Modal overlay for worker assignment

## Data Models

### Branch Document

```javascript
{
  _id: "branch:timestamp_uuid",
  type: "branch",
  name: "Main Headquarters",
  code: "HQ-001",                    // Unique code
  description: "Primary branch",
  organizationId: "org:uuid",        // Link to organization
  organizationName: "Company Name",  // Denormalized
  phone: "+1-555-0100",
  email: "branch@company.com",
  status: "active",                  // active, inactive, planned, closed
  isOperational: true,
  totalBuildings: 2,                 // Calculated
  totalWorkstations: 150,            // Calculated
  totalAssignedWorkers: 120,         // Calculated
  managerId: "person:uuid",          // Optional
  managerName: "John Doe",
  createdBy: "person:uuid",
  createdAt: "ISO-timestamp",
  updatedAt: "ISO-timestamp"
}
```

**Note**: Branches do NOT have postal addresses or geo-coordinates. Those belong to buildings.

### Building Document

```javascript
{
  _id: "building:timestamp_uuid",
  type: "building",
  name: "Building A",
  code: "BLDG-A",
  description: "Main office tower",
  branchId: "branch:uuid",           // Parent reference
  branchName: "Main HQ",             // Denormalized
  organizationId: "org:uuid",
  address: "123 Main St, NY, NY 10001",  // Full address
  buildingType: "office",            // office, warehouse, retail, mixed, industrial
  yearBuilt: 2015,
  totalFloors: 5,
  squareFeetage: 50000,
  coordinates: {                     // Geographic location
    latitude: 40.7128,
    longitude: -74.0060
  },
  totalWorkstations: 75,             // Calculated
  totalAssignedWorkstations: 60,     // Calculated
  status: "active",                  // active, under_construction, maintenance, closed
  isOperational: true,
  createdBy: "person:uuid",
  createdAt: "ISO-timestamp",
  updatedAt: "ISO-timestamp"
}
```

### Workstation Document

```javascript
{
  _id: "workstation:timestamp_uuid",
  type: "workstation",
  name: "Desk A",
  code: "WS-A-001",
  description: "Corner desk with window",
  buildingId: "building:uuid",       // Parent reference
  buildingName: "Building A",        // Denormalized
  branchId: "branch:uuid",           // For queries
  branchName: "Main HQ",
  organizationId: "org:uuid",
  workstationType: "desk",           // desk, cubicle, hot_desk, standing_desk, bench, meeting_room
  location: "Floor 4, Room 401",
  equipment: ["computer", "monitor", "phone", "chair"],
  amenities: ["wifi", "AC", "printer_access"],
  assignedWorkerId: "person:uuid",   // null if unassigned
  assignedWorkerName: "Jane Smith",
  assignmentDate: "ISO-timestamp",
  employmentType: "full-time",       // full-time, part-time, contractor, intern
  department: "Engineering",
  position: "Software Developer",
  status: "occupied",                // occupied, available, maintenance, reserved, unavailable
  isAvailable: false,
  createdBy: "person:uuid",
  createdAt: "ISO-timestamp",
  updatedAt: "ISO-timestamp"
}
```

## Database Indexes

The following indexes are created for efficient queries:

```javascript
// Branch queries
await this.db.createIndex(['type', 'organizationId']);
await this.db.createIndex(['type', 'organizationId', 'status']);
await this.db.createIndex(['type', 'code']);

// Building queries
await this.db.createIndex(['type', 'branchId']);
await this.db.createIndex(['type', 'branchId', 'status']);

// Workstation queries
await this.db.createIndex(['type', 'buildingId']);
await this.db.createIndex(['type', 'branchId']);
await this.db.createIndex(['type', 'assignedWorkerId']);
await this.db.createIndex(['type', 'status']);
```

## Integration

### With OrganizationApp

The app subscribes to organization changes and automatically filters branches by the current default organization:

```javascript
this.subscribe('organization:setDefault', (org) => {
  this.currentOrganization = org;
  this.loadBranches();
});

this.subscribe('organization:defaultChanged', (org) => {
  this.currentOrganization = org;
  this.loadBranches();
});
```

### With PersonManagementApp

The app integrates with PersonManagementApp for user authentication and worker assignment:

```javascript
// Subscribe to login/logout
this.subscribe('person:login', (user) => {
  this.currentUser = user;
  this.render();
});

this.subscribe('person:logout', () => {
  this.currentUser = null;
  this.render();
});

// Emit assignment events
this.emit('branch:workerAssigned', {
  personId,
  workstationId,
  branchId,
  buildingId,
  assignmentDate
});

this.emit('branch:workerUnassigned', {
  personId,
  workstationId,
  branchId,
  buildingId
});
```

## Usage

### Basic Operations

#### Creating a Branch

1. Click "Create Branch" button
2. Fill in required fields: Name, Code
3. Optionally add description, phone, email
4. Select status
5. Click "Create Branch"

#### Managing Buildings

1. Click "Manage Buildings" on a branch card
2. Click "Create Building" to add new buildings
3. Fill in building details including address and coordinates
4. Select building type and status

#### Managing Workstations

1. Navigate to a building
2. Click "Manage Workstations"
3. Create workstations with equipment and amenities
4. Assign workers using the "Assign Worker" button

#### Assigning Workers

1. Click "Assign Worker" on an available workstation
2. Select a worker from the dropdown (only shows unassigned workers)
3. Optionally add employment type, department, and position
4. Click "Assign Worker"

### Navigation

- Use breadcrumbs to navigate back through the hierarchy
- Click "Back" buttons to return to previous views
- Click entity names in breadcrumbs for quick navigation

### Viewing Details

- Click on any entity card to see detailed information
- Details view shows all fields organized in sections
- Edit or delete from the details view

## Validation Rules

### Branches

- Name is required
- Code is required and must be unique
- Email must be valid format if provided

### Buildings

- Name is required
- Code is required and must be unique
- Address is required
- Parent branch must exist

### Workstations

- Name is required
- Code is required and must be unique
- Parent building must exist
- Cannot delete if assigned to a worker

## Cascade Delete Protection

- Cannot delete a branch if it has buildings
- Cannot delete a building if it has workstations
- Cannot delete a workstation if it has an assigned worker
- User must first delete/remove children before deleting parent

## Events Emitted

| Event | Data | Description |
|-------|------|-------------|
| `branch:created` | branch object | Emitted when a branch is created |
| `branch:updated` | branch object | Emitted when a branch is updated |
| `branch:deleted` | branch object | Emitted when a branch is deleted |
| `building:created` | building object | Emitted when a building is created |
| `building:updated` | building object | Emitted when a building is updated |
| `building:deleted` | building object | Emitted when a building is deleted |
| `workstation:created` | workstation object | Emitted when a workstation is created |
| `workstation:updated` | workstation object | Emitted when a workstation is updated |
| `workstation:deleted` | workstation object | Emitted when a workstation is deleted |
| `branch:workerAssigned` | { personId, workstationId, branchId, buildingId, assignmentDate } | Emitted when a worker is assigned |
| `branch:workerUnassigned` | { personId, workstationId, branchId, buildingId } | Emitted when a worker is unassigned |

## Approval Authority Implementation

The app implements a comprehensive permission system:

```javascript
/**
 * Check if current user has approval authority
 * User must be either:
 * 1. Organization Owner (created the organization)
 * 2. Worker in FACILITIES/Space Planning with seniority 6, 7, or 8
 */
async hasApprovalAuthority() {
  // Check if user is organization owner
  if (this.currentOrganization.createdBy === this.currentUser._id) {
    return true;
  }

  // Check if user is assigned to Facilities Management workstation
  const workstationResult = await this.db.query({
    selector: {
      type: 'workstation',
      assignedWorkerId: this.currentUser._id,
      department: 'Facilities Management'
    }
  });

  // Check if user has vacancy in Space Planning team with seniority 6+
  const vacancyResult = await this.db.query({
    selector: {
      type: 'vacancy',
      assignedPersonId: this.currentUser._id
    }
  });

  // Validate team and seniority
  for (const vacancy of vacancyResult) {
    if (vacancy.teamCode === 'SPACE-PLAN' &&
        vacancy.seniority >= 6 && vacancy.seniority <= 8) {
      return true;
    }
  }

  return false;
}
```

This check is performed:
- Before each create/update/delete operation (backend validation)
- During UI rendering to show/hide action buttons (frontend UX)
- Permission denied messages guide users to authorized personnel

## File Structure

```
src/apps/BranchManagementApp/
├── BranchManagementApp.js    # Main app class (~3200 lines)
├── BranchManagementApp.css   # Styling (~800 lines)
└── README.md                  # This file
```

## Styling

The app uses a consistent design system:

- **Colors**:
  - Primary action: #4CAF50 (green)
  - Secondary action: #2196F3 (blue)
  - Danger action: #f44336 (red)
  - Warning action: #ff9800 (orange)

- **Status Colors**:
  - Active/Available: Green
  - Inactive/Occupied: Pink
  - Planned/Reserved: Blue
  - Closed/Unavailable: Gray
  - Under Construction/Maintenance: Orange

- **Responsive Breakpoints**:
  - Mobile: < 768px (single column layout)
  - Desktop: >= 768px (multi-column grid layout)

## Performance Considerations

- Uses PouchDB indexes for efficient queries
- Denormalizes parent names to avoid joins
- Loads only entities for current context (branch/building)
- Real-time updates via subscriptions
- Lazy loading of entity details

## Future Enhancements

Potential improvements for future versions:

1. **Search and Filters**:
   - Full-text search across entities
   - Filter by status, type, etc.
   - Advanced filtering UI

2. **Bulk Operations**:
   - Import branches from CSV
   - Bulk assign workers
   - Bulk update statuses

3. **Reporting**:
   - Capacity utilization reports
   - Worker assignment reports
   - Building occupancy dashboards

4. **Map Integration**:
   - Interactive map view of buildings
   - Building location visualization
   - Route planning between buildings

5. **Scheduling**:
   - Hot desk reservations
   - Meeting room booking
   - Maintenance scheduling

6. **Analytics**:
   - Space utilization metrics
   - Occupancy trends
   - Cost per workstation

## License

This app is part of the V4L (Vocal 4 Local) project.

## Support

For issues or questions, please refer to the main project documentation.
