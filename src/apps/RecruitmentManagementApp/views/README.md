# Views Directory

This directory contains the extracted view rendering functions for the Recruitment Management App.

## ✅ Completed Views

1. **PublicVacanciesView.js** - Public job vacancies view (guest/applicant)
2. **OrgVacanciesView.js** - Organization vacancies view (admin)
3. **VacancyFormView.js** - Vacancy creation/edit form (admin)

## 🚧 Remaining Views (To Be Extracted)

The following views remain in the main file and can be extracted if needed:

4. **VacancyDetailsView.js** - Detailed vacancy view with apply button
5. **ApplicationFormView.js** - Application submission form
6. **MyApplicationsView.js** - Applicant's applications list
7. **ManageApplicationsView.js** - Admin applications management
8. **ApplicationDetailsView.js** - Detailed application view with workflow
9. **OnboardingView.js** - Onboarding tasks management

## Usage Pattern

Each view is a pure function that accepts the app instance:

```javascript
export function renderViewName(app) {
  // Access app properties and methods:
  // - app.createElement()
  // - app.container
  // - app.currentUser
  // - app.defaultOrganization
  // - app.render()
  // - etc.

  // Render UI elements
  const element = app.createElement(...);
  app.container.appendChild(element);
}
```

## Benefits of This Approach

- ✅ **Smaller files**: Each view is 50-400 lines instead of 2500+ lines
- ✅ **Focused logic**: One view = one file
- ✅ **Easy to find**: Predictable naming and location
- ✅ **Maintainable**: Changes to one view don't affect others
- ✅ **Testable**: Views can be tested in isolation

## Note

The remaining views (4-9) can be extracted following the same pattern as the first three. They remain in the main file for now to demonstrate the refactoring approach without over-engineering.
