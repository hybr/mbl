# Recruitment Management App - Implementation Plan

## Overview
A comprehensive MiniApp that manages the complete hiring lifecycle from vacancy creation to worker onboarding. Supports multi-organization recruitment with public vacancy listings and application tracking.

## Core Features

### 1. Vacancy Management
- Create, edit, and manage job vacancies
- Set vacancy status (Draft, Open, Closed, Filled)
- Associate vacancies with organizations, departments, teams, designations
- Define requirements (education, skills, experience)
- Link to workstations/branches

### 2. Public Vacancy View
- Guest-accessible list of open vacancies
- Filter by organization, department, location
- Search functionality
- Vacancy details view

### 3. Application Management
- Users can apply to vacancies
- Track application status (Applied, Screening, Interview, Offer, Rejected, Hired)
- Application history per user
- Organization view of all applications

### 4. Hiring Workflow
- Multi-stage application review
- Interview scheduling and tracking
- Offer management
- Onboarding initiation

### 5. Onboarding Process
- Create onboarding tasks
- Track completion status
- Link to worker creation in PersonManagementApp
- Document management

## Data Structure

### Vacancy Document
```javascript
{
  _id: "vacancy:uuid",
  type: "vacancy",
  organizationId: "org:xxx",
  departmentCode: "DEPT-001", // FK to department.json
  teamCode: "TEAM-001", // FK to team.json
  designationCode: "DESG-001", // FK to designation.json
  workstationId: "branch:xxx", // FK to BranchManagementApp
  minimumEducationLevelCode: "LEVEL-001", // FK to level.json
  majorSubjectOneCode: "SUBJ-001", // FK to subject.json
  majorSubjectTwoCode: "SUBJ-002", // FK to subject.json (optional)
  majorSubjectThreeCode: "SUBJ-003", // FK to subject.json (optional)
  requiredSkillOneCode: "PROG-PYTHON", // FK to skills.json
  requiredSkillTwoCode: "WEB-DEV", // FK to skills.json
  requiredSkillThreeCode: "SQL", // FK to skills.json
  goodToHaveSkillOneCode: "CLOUD-COMPUTING", // FK to skills.json (optional)
  goodToHaveSkillTwoCode: "DEVOPS", // FK to skills.json (optional)
  workExperienceYears: 3,
  title: "Senior Software Engineer",
  description: "Job description text...",
  responsibilities: "Responsibilities text...",
  status: "open", // draft, open, closed, filled
  createdBy: "person:xxx",
  createdAt: "2025-11-30T...",
  updatedAt: "2025-11-30T...",
  publishedAt: "2025-11-30T...",
  closedAt: null,
  applicationDeadline: "2025-12-31T..."
}
```

### Application Document
```javascript
{
  _id: "application:uuid",
  type: "application",
  vacancyId: "vacancy:xxx",
  applicantId: "person:xxx",
  organizationId: "org:xxx",
  status: "applied", // applied, screening, interview, offer, rejected, hired
  appliedAt: "2025-11-30T...",
  currentStage: "initial_review",
  stages: [
    {
      stage: "initial_review",
      status: "completed",
      completedAt: "2025-12-01T...",
      notes: "..."
    },
    {
      stage: "interview",
      status: "scheduled",
      scheduledAt: "2025-12-05T10:00:00Z",
      notes: "..."
    }
  ],
  coverLetter: "Cover letter text...",
  resumeUrl: null, // Future: file attachment
  interviewNotes: [],
  offerDetails: null,
  onboardingId: null, // Link to onboarding when hired
  createdAt: "2025-11-30T...",
  updatedAt: "2025-11-30T..."
}
```

### Onboarding Document
```javascript
{
  _id: "onboarding:uuid",
  type: "onboarding",
  applicationId: "application:xxx",
  vacancyId: "vacancy:xxx",
  personId: "person:xxx", // Created worker
  organizationId: "org:xxx",
  status: "in_progress", // not_started, in_progress, completed
  startDate: "2025-12-15T...",
  completionDate: null,
  tasks: [
    {
      task: "Background Check",
      status: "completed",
      completedAt: "2025-12-16T...",
      assignedTo: "person:xxx"
    },
    {
      task: "Document Collection",
      status: "pending",
      dueDate: "2025-12-20T..."
    },
    {
      task: "System Access Setup",
      status: "pending"
    }
  ],
  createdAt: "2025-12-15T...",
  updatedAt: "2025-12-15T..."
}
```

## Reference Data Files Required

### 1. `/data/department.json`
```json
[
  {
    "id": 1,
    "code": "DEPT-IT",
    "name": "Information Technology",
    "description": "IT Department"
  }
]
```

### 2. `/data/team.json`
```json
[
  {
    "id": 1,
    "code": "TEAM-DEV",
    "name": "Development Team",
    "departmentCode": "DEPT-IT"
  }
]
```

### 3. `/data/designation.json`
```json
[
  {
    "id": 1,
    "code": "DESG-SE",
    "name": "Software Engineer",
    "level": "Mid-Level"
  }
]
```

### 4. `/data/level.json` (Education Levels - reuse from EducationManagementApp)
### 5. `/data/subject.json` (Subjects - reuse from EducationManagementApp)
### 6. `/data/skills.json` (Already exists)

## Views & User Flows

### 1. Vacancy List View (Organization Admin)
- List all vacancies for organization
- Filter by status, department, team
- Create new vacancy button
- Edit/Close actions

### 2. Vacancy Create/Edit View (Organization Admin)
- Form with all vacancy fields
- Dropdowns for all foreign keys
- Validation
- Save as Draft or Publish

### 3. Public Vacancy List (Guest/All Users)
- Show only "open" status vacancies
- Filter/search
- View details
- Apply button (requires login)

### 4. Vacancy Details View
- Full vacancy information
- Requirements breakdown
- Apply button (if logged in and not already applied)

### 5. Application Form View
- Pre-filled with user info
- Cover letter textarea
- Submit application

### 6. Application Tracking View (Applicant)
- List user's applications
- Status for each
- View details

### 7. Application Management View (Organization)
- List all applications for vacancies
- Filter by vacancy, status, stage
- Update status
- Add interview notes
- Move to next stage
- Create offer
- Initiate onboarding

### 8. Onboarding View
- Task checklist
- Progress tracking
- Complete onboarding (creates worker in PersonManagementApp)

## Integration Points

### 1. OrganizationApp
- Get organization list
- Verify user has org admin rights
- Get default organization

### 2. BranchManagementApp
- Get workstation/branch list for organization
- Display branch details

### 3. PersonManagementApp
- Create worker profile on onboarding completion
- Link person to application

### 4. EducationManagementApp
- Reference education levels and subjects
- Validate applicant education against requirements

### 5. SkillManagementApp
- Reference skills list
- Match applicant skills to requirements

## User Roles & Permissions

### Guest
- View public vacancies
- Apply (after login)

### Logged-in User
- View public vacancies
- Apply to vacancies
- Track own applications

### Organization Admin
- Create/edit vacancies
- View all applications for org
- Manage application workflow
- Initiate onboarding
- Complete onboarding

## Workflow States

### Vacancy Status
- `draft`: Not published
- `open`: Accepting applications
- `closed`: No longer accepting
- `filled`: Position filled

### Application Status
- `applied`: Initial submission
- `screening`: Under review
- `interview`: Interview scheduled/in progress
- `offer`: Offer extended
- `rejected`: Not selected
- `hired`: Selected and onboarding

### Onboarding Status
- `not_started`: Created but not started
- `in_progress`: Tasks in progress
- `completed`: All tasks done, worker created

## Database Indexes

```javascript
// Vacancy indexes
['type', 'organizationId']
['type', 'organizationId', 'status']
['type', 'status'] // For public view
['type', 'departmentCode']
['type', 'workstationId']

// Application indexes
['type', 'vacancyId']
['type', 'applicantId']
['type', 'organizationId']
['type', 'organizationId', 'status']
['type', 'status']

// Onboarding indexes
['type', 'applicationId']
['type', 'organizationId']
['type', 'status']
```

## UI Components

### Vacancy Card
- Title, organization, department
- Location (workstation)
- Requirements summary
- Status badge
- Actions (Edit, View Applications, Close)

### Application Card
- Applicant name
- Vacancy title
- Status
- Applied date
- Actions (View, Update Status)

### Onboarding Task List
- Checkbox list
- Due dates
- Assignees
- Progress indicator

## Implementation Phases

### Phase 1: Core Vacancy Management
- Vacancy CRUD
- Reference data loading
- Organization integration
- Basic UI

### Phase 2: Application System
- Application creation
- Application tracking
- Status management

### Phase 3: Workflow Management
- Multi-stage workflow
- Interview scheduling
- Offer management

### Phase 4: Onboarding
- Onboarding creation
- Task management
- Worker creation integration

### Phase 5: Public Features
- Public vacancy listing
- Guest access
- Search/filter

## File Structure

```
src/apps/RecruitmentManagementApp/
  ├── RecruitmentManagementApp.js
  ├── RecruitmentManagementApp.css
  └── README.md
```

## Next Steps

1. Create reference data JSON files (department.json, team.json, designation.json)
2. Implement core vacancy CRUD
3. Add application system
4. Build workflow management
5. Integrate onboarding
6. Add public features

