# Card Component

A generic, reusable card component for building consistent list views across the application.

## Features

- **Flexible Structure**: Header, Body, and Footer sections
- **Helper Methods**: Built-in helpers for common patterns (logo headers, action footers)
- **Active State**: Support for highlighting active/selected cards
- **Consistent Styling**: Uses a common class naming convention

## Basic Usage

```javascript
import { Card } from './Card.js';

const card = new Card({
  className: 'my-card',
  isActive: false,
  headerContent: [/* header elements */],
  bodyContent: [/* body elements */],
  footerContent: [/* footer elements */],
  createElement: app.createElement.bind(app)
});

const cardElement = card.render();
```

## Structure

The Card component creates this DOM structure:

```html
<div class="my-card">
  <div class="my-card-header">
    <!-- header content -->
  </div>
  <div class="my-card-body">
    <!-- body content -->
  </div>
  <div class="my-card-footer">
    <!-- footer content -->
  </div>
</div>
```

## Helper Methods

### `Card.createHeaderWithLogo(options)`

Creates a header with logo and content side-by-side.

```javascript
const headerContent = Card.createHeaderWithLogo({
  logo: logoElement,
  content: [nameElement, emailElement],
  createElement: app.createElement.bind(app)
});
```

Generates:
```html
<div class="card-logo-container">
  <!-- logo -->
</div>
<div class="card-header-content">
  <!-- content elements -->
</div>
```

### `Card.createFooterWithActions(options)`

Creates a footer with primary and secondary action groups.

```javascript
const footerContent = Card.createFooterWithActions({
  primaryActions: [viewBtn, editBtn, deleteBtn],
  secondaryActions: [shareBtn, favoriteBtn],
  createElement: app.createElement.bind(app)
});
```

Generates:
```html
<div class="card-actions-primary">
  <!-- primary action buttons -->
</div>
<div class="card-actions-secondary">
  <!-- secondary action buttons -->
</div>
```

## Examples

### Example 1: OrganizationCard

See `OrganizationCard.js` for a real-world implementation that uses:
- Logo with placeholder fallback
- Metadata display (role, type, industry)
- Primary actions (View, Edit, Delete)
- Secondary actions (Set Default, Visit Site)

### Example 2: UserCard

See `Card.example.js` for examples of:
- UserCard with avatar and user details
- ProjectCard with icon and progress tracking

## Creating Your Own Card

1. **Import the Card component**:
```javascript
import { Card } from './Card.js';
```

2. **Build your sections** (header, body, footer):
```javascript
_buildHeader() {
  const logo = this.createElement('img', { src: this.data.image });
  const title = this.createElement('h3', {}, [this.data.title]);

  return Card.createHeaderWithLogo({
    logo,
    content: [title],
    createElement: this.createElement
  });
}
```

3. **Render using the Card component**:
```javascript
render() {
  const card = new Card({
    className: 'my-entity-card',
    isActive: this.isSelected,
    headerContent: this._buildHeader(),
    bodyContent: this._buildBody(),
    footerContent: this._buildFooter(),
    createElement: this.createElement
  });

  return card.render();
}
```

## CSS Styling

The Card component uses a consistent class naming pattern:

- `.{className}` - Main card container
- `.{className}-active` - Active/selected state
- `.{className}-header` - Header section
- `.{className}-body` - Body section
- `.{className}-footer` - Footer section
- `.card-logo-container` - Logo wrapper (when using helper)
- `.card-header-content` - Header content wrapper (when using helper)
- `.card-actions-primary` - Primary actions group (when using helper)
- `.card-actions-secondary` - Secondary actions group (when using helper)

## Best Practices

1. **Use consistent naming**: Use entity-specific class names (e.g., 'user-card', 'project-card')
2. **Separate concerns**: Split header, body, and footer into separate methods
3. **Use helpers**: Leverage `createHeaderWithLogo` and `createFooterWithActions` for common patterns
4. **Keep it simple**: Only include sections you need (header, body, footer are all optional)
5. **Active state**: Use `isActive` for selected/default items in lists

## Migration Guide

If you have existing card components, you can migrate them to use the generic Card:

**Before:**
```javascript
const card = this.createElement('div', { className: 'my-card' });
const header = this.createElement('div', { className: 'my-card-header' });
// ... build elements manually
card.appendChild(header);
card.appendChild(body);
```

**After:**
```javascript
const card = new Card({
  className: 'my-card',
  headerContent: [/* elements */],
  bodyContent: [/* elements */],
  createElement: this.createElement
});
return card.render();
```
