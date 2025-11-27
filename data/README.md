# Data Files Directory

This directory contains JSON data files that are displayed in the **DataViewerApp**.

## Available Data Files

1. **countries.json** - List of countries with population, capital, and currency information
2. **priority-levels.json** - Priority levels with colors, icons, and SLA hours
3. **user-roles.json** - User roles and their associated permissions
4. **status-codes.json** - HTTP status codes with descriptions

## File Format

All JSON files must be arrays of objects:

```json
[
  {
    "key1": "value1",
    "key2": "value2"
  },
  {
    "key1": "value3",
    "key2": "value4"
  }
]
```

## Supported Data Types

The DataViewerApp automatically formats different data types:

- **Strings**: Displayed as-is
- **Numbers**: Large numbers formatted with commas
- **Booleans**: Displayed as ✓ True / ✗ False
- **Arrays**: Shown as comma-separated list
- **Objects**: Shown as JSON string
- **Colors** (hex codes): Displayed with color preview box
- **Emojis**: Displayed larger for visibility
- **Null/Undefined**: Shown as "—"

## Adding New Data Files

To add a new data file:

1. Create your JSON file in this directory
2. Update `src/apps/DataViewerApp/DataViewerApp.js`
3. Add to the `dataFiles` array in the constructor:

```javascript
this.dataFiles = [
  // ... existing files
  {
    name: 'your-file.json',
    path: '/data/your-file.json',
    title: 'Your File Title'
  }
];
```

## Features

- **Search**: Filter across all columns
- **Sort**: Click column headers to sort
- **Read-only**: No CRUD operations, perfect for reference data
- **Responsive**: Works on mobile and desktop
- **Beautiful UI**: Modern gradient design with hover effects
