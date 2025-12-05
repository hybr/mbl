/**
 * constants.js - Constants and enums for InventoryLocationApp
 */

// View modes
export const VIEW_MODES = {
  LIST: 'list',
  EDIT: 'edit',
  VIEW: 'view',
  HIERARCHY: 'hierarchy',
  MOVEMENT: 'movement',
  MOVEMENT_HISTORY: 'movementHistory',
  ALERTS: 'alerts',
  DASHBOARD: 'dashboard',
  BARCODE: 'barcode',
  SCANNER: 'scanner',
  BULK_IMPORT: 'bulkImport',
  REPORTS: 'reports'
};

// User roles
export const USER_ROLES = {
  ADMIN: 'admin',
  WAREHOUSE_MANAGER: 'warehouse_manager',
  STAFF: 'staff',
  AUDITOR: 'auditor'
};

// Location types with metadata
export const LOCATION_TYPES = [
  {
    code: 'zone',
    name: 'Zone',
    description: 'Major storage area division',
    icon: '📍',
    validParents: ['building'],
    canHaveChildren: true,
    level: 0
  },
  {
    code: 'storeroom',
    name: 'Storeroom',
    description: 'Enclosed storage area',
    icon: '🚪',
    validParents: ['zone', 'building'],
    canHaveChildren: true,
    level: 1
  },
  {
    code: 'cold_storage',
    name: 'Cold Storage',
    description: 'Temperature-controlled area',
    icon: '❄️',
    validParents: ['zone', 'building'],
    canHaveChildren: true,
    level: 1
  },
  {
    code: 'docking_point',
    name: 'Docking Point',
    description: 'Loading/unloading bay',
    icon: '🚚',
    validParents: ['zone', 'building'],
    canHaveChildren: false,
    level: 1
  },
  {
    code: 'aisle',
    name: 'Aisle',
    description: 'Corridor between racks',
    icon: '↔️',
    validParents: ['zone'],
    canHaveChildren: true,
    level: 2
  },
  {
    code: 'rack',
    name: 'Rack',
    description: 'Vertical storage unit',
    icon: '🗄️',
    validParents: ['zone', 'storeroom', 'aisle'],
    canHaveChildren: true,
    level: 2
  },
  {
    code: 'shelf',
    name: 'Shelf',
    description: 'Horizontal storage level',
    icon: '➖',
    validParents: ['rack'],
    canHaveChildren: true,
    level: 3
  },
  {
    code: 'bin',
    name: 'Bin',
    description: 'Smallest storage unit',
    icon: '📦',
    validParents: ['shelf', 'rack'],
    canHaveChildren: false,
    level: 4
  },
  {
    code: 'bulk_area',
    name: 'Bulk Area',
    description: 'Open storage for large items',
    icon: '📐',
    validParents: ['zone'],
    canHaveChildren: false,
    level: 1
  },
  {
    code: 'quarantine',
    name: 'Quarantine',
    description: 'Isolated storage area',
    icon: '⚠️',
    validParents: ['zone', 'building'],
    canHaveChildren: true,
    level: 1
  },
  {
    code: 'staging_area',
    name: 'Staging Area',
    description: 'Temporary holding area',
    icon: '🔄',
    validParents: ['zone'],
    canHaveChildren: false,
    level: 1
  },
  {
    code: 'returns_area',
    name: 'Returns Area',
    description: 'Return processing area',
    icon: '↩️',
    validParents: ['zone'],
    canHaveChildren: false,
    level: 1
  }
];

// Movement types
export const MOVEMENT_TYPES = {
  CHECK_IN: 'check-in',
  CHECK_OUT: 'check-out',
  TRANSFER: 'transfer',
  ADJUSTMENT: 'adjustment',
  AUDIT: 'audit'
};

// Movement type labels
export const MOVEMENT_TYPE_LABELS = {
  'check-in': 'Check In',
  'check-out': 'Check Out',
  'transfer': 'Transfer',
  'adjustment': 'Adjustment',
  'audit': 'Audit / Cycle Count'
};

// Movement type icons
export const MOVEMENT_TYPE_ICONS = {
  'check-in': '📥',
  'check-out': '📤',
  'transfer': '🔄',
  'adjustment': '⚖️',
  'audit': '🔍'
};

// Movement status
export const MOVEMENT_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled'
};

// Movement status labels
export const MOVEMENT_STATUS_LABELS = {
  'pending': 'Pending Approval',
  'approved': 'Approved',
  'completed': 'Completed',
  'rejected': 'Rejected',
  'cancelled': 'Cancelled'
};

// Alert types
export const ALERT_TYPES = {
  CAPACITY: 'capacity',
  TEMPERATURE: 'temperature',
  STOCK: 'stock',
  OPERATIONAL: 'operational'
};

// Alert type labels
export const ALERT_TYPE_LABELS = {
  'capacity': 'Capacity Alert',
  'temperature': 'Temperature Alert',
  'stock': 'Stock Level Alert',
  'operational': 'Operational Alert'
};

// Severity levels
export const SEVERITY_LEVELS = {
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'critical'
};

// Status options
export const STATUS_OPTIONS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  FULL: 'full',
  MAINTENANCE: 'maintenance',
  QUARANTINE: 'quarantine'
};

// Status labels
export const STATUS_LABELS = {
  'active': 'Active',
  'inactive': 'Inactive',
  'full': 'Full',
  'maintenance': 'Maintenance',
  'quarantine': 'Quarantine'
};

// Status colors
export const STATUS_COLORS = {
  'active': '#4CAF50',      // Green
  'inactive': '#9E9E9E',    // Gray
  'full': '#f44336',        // Red
  'maintenance': '#ff9800', // Orange
  'quarantine': '#9C27B0'   // Purple
};

// Unit of measure options
export const UNIT_OF_MEASURE = {
  EACH: 'ea',
  KILOGRAM: 'kg',
  CUBIC_METER: 'm3',
  PALLET: 'pallet',
  CASE: 'case',
  BOX: 'box'
};

// Unit labels
export const UNIT_LABELS = {
  'ea': 'Each',
  'kg': 'Kilogram',
  'm3': 'Cubic Meter',
  'pallet': 'Pallet',
  'case': 'Case',
  'box': 'Box'
};

// Session storage keys
export const SESSION_STORAGE_KEYS = {
  CURRENT_BUILDING: 'inventoryLocation_currentBuilding',
  SEARCH_TERM: 'inventoryLocation_searchTerm',
  FILTER_TYPE: 'inventoryLocation_filterType',
  FILTER_STATUS: 'inventoryLocation_filterStatus',
  SORT_BY: 'inventoryLocation_sortBy'
};

// Permission actions
export const PERMISSION_ACTIONS = {
  CREATE: 'create',
  EDIT: 'edit',
  DELETE: 'delete',
  VIEW: 'view',
  APPROVE: 'approve',
  EXPORT: 'export'
};

// Permission resources
export const PERMISSION_RESOURCES = {
  LOCATION: 'location',
  MOVEMENT: 'movement',
  ALERT: 'alert',
  AUDIT: 'audit'
};

// Role permissions matrix
export const ROLE_PERMISSIONS = {
  admin: {
    location: { create: true, edit: true, delete: true, view: true },
    movement: { create: true, approve: true, delete: true, view: true },
    alert: { create: true, edit: true, delete: true, view: true },
    audit: { view: true, export: true }
  },
  warehouse_manager: {
    location: { create: true, edit: true, delete: true, view: true },
    movement: { create: true, approve: true, view: true },
    alert: { create: true, edit: true, view: true },
    audit: { view: true }
  },
  staff: {
    location: { view: true },
    movement: { create: true, view: true },
    alert: { view: true },
    audit: {}
  },
  auditor: {
    location: { view: true },
    movement: { view: true },
    alert: { view: true },
    audit: { view: true, export: true }
  }
};

// Configuration
export const CONFIG = {
  MAX_HIERARCHY_DEPTH: 6,
  ITEMS_PER_PAGE: 50,
  SEARCH_DEBOUNCE_MS: 300,
  CAPACITY_WARNING_THRESHOLD: 80,
  CAPACITY_CRITICAL_THRESHOLD: 95,
  MOVEMENT_RETENTION_DAYS: 730,     // 2 years
  AUDIT_LOG_RETENTION_DAYS: 2555,   // 7 years
  ALERT_RETENTION_DAYS: 365         // 1 year
};

// Security levels
export const SECURITY_LEVELS = {
  STANDARD: 'standard',
  RESTRICTED: 'restricted',
  HIGH_SECURITY: 'high_security'
};

// Security level labels
export const SECURITY_LEVEL_LABELS = {
  'standard': 'Standard',
  'restricted': 'Restricted',
  'high_security': 'High Security'
};

// Temperature ranges presets
export const TEMPERATURE_PRESETS = {
  FROZEN: { min: -18, max: -10, unit: 'C' },
  REFRIGERATED: { min: 2, max: 8, unit: 'C' },
  COOL: { min: 10, max: 15, unit: 'C' },
  AMBIENT: { min: 18, max: 25, unit: 'C' }
};

// Default capacity units
export const DEFAULT_CAPACITY = {
  weight_kg: 0,
  volume_m3: 0,
  maxItems: 0,
  unitOfMeasure: 'ea'
};

// Location code separator
export const LOCATION_CODE_SEPARATOR = '-';

// Maximum location code length
export const MAX_LOCATION_CODE_LENGTH = 50;

// Barcode prefix
export const BARCODE_PREFIX = 'LOC';

// Export all constants
export default {
  VIEW_MODES,
  USER_ROLES,
  LOCATION_TYPES,
  MOVEMENT_TYPES,
  MOVEMENT_TYPE_LABELS,
  MOVEMENT_TYPE_ICONS,
  MOVEMENT_STATUS,
  MOVEMENT_STATUS_LABELS,
  ALERT_TYPES,
  ALERT_TYPE_LABELS,
  SEVERITY_LEVELS,
  STATUS_OPTIONS,
  STATUS_LABELS,
  STATUS_COLORS,
  UNIT_OF_MEASURE,
  UNIT_LABELS,
  SESSION_STORAGE_KEYS,
  PERMISSION_ACTIONS,
  PERMISSION_RESOURCES,
  ROLE_PERMISSIONS,
  CONFIG,
  SECURITY_LEVELS,
  SECURITY_LEVEL_LABELS,
  TEMPERATURE_PRESETS,
  DEFAULT_CAPACITY,
  LOCATION_CODE_SEPARATOR,
  MAX_LOCATION_CODE_LENGTH,
  BARCODE_PREFIX
};
