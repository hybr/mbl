/**
 * dataLoaders.js - Database operations for InventoryLocationApp
 */

import { CONFIG, LOCATION_CODE_SEPARATOR, DEFAULT_CAPACITY } from './constants.js';

/**
 * Create database indexes
 */
export async function createIndexes(db, logger) {
  try {
    logger.info('Creating database indexes...');

    // Location indexes
    await db.createIndex(['type', 'organizationId', 'buildingId']);
    await db.createIndex(['type', 'buildingId', 'locationType']);
    await db.createIndex(['type', 'buildingId', 'parentLocationId']);
    await db.createIndex(['type', 'locationCode']);
    await db.createIndex(['type', 'barcodeData']);
    await db.createIndex(['type', 'buildingId', 'status']);
    await db.createIndex(['type', 'buildingId', 'level']);

    // Movement indexes
    await db.createIndex(['type', 'organizationId', 'buildingId']);
    await db.createIndex(['type', 'locationId', 'createdAt']);
    await db.createIndex(['type', 'buildingId', 'movementType', 'createdAt']);
    await db.createIndex(['type', 'status']);
    await db.createIndex(['type', 'performedBy', 'createdAt']);

    // Alert indexes
    await db.createIndex(['type', 'organizationId', 'buildingId']);
    await db.createIndex(['type', 'locationId', 'status']);
    await db.createIndex(['type', 'buildingId', 'alertType', 'severity']);
    await db.createIndex(['type', 'status', 'severity']);
    await db.createIndex(['type', 'buildingId', 'createdAt']);

    // Alert config indexes
    await db.createIndex(['type', 'organizationId', 'buildingId']);
    await db.createIndex(['type', 'buildingId', 'locationType']);
    await db.createIndex(['type', 'locationId']);
    await db.createIndex(['type', 'enabled']);

    // Audit log indexes
    await db.createIndex(['type', 'organizationId', 'timestamp']);
    await db.createIndex(['type', 'entityType', 'entityId', 'timestamp']);
    await db.createIndex(['type', 'userId', 'timestamp']);
    await db.createIndex(['type', 'buildingId', 'eventType', 'timestamp']);

    logger.info('Database indexes created successfully');

  } catch (error) {
    logger.error('Failed to create indexes:', error);
    throw error;
  }
}

/**
 * Load locations for a building
 */
export async function loadLocations(db, buildingId, logger) {
  try {
    const result = await db.query({
      selector: {
        type: 'location',
        buildingId: buildingId
      },
      sort: ['locationCode']
    });

    const locations = result.docs || result;
    logger.debug(`Loaded ${locations.length} locations for building ${buildingId}`);
    return locations;

  } catch (error) {
    logger.error('Failed to load locations:', error);
    return [];
  }
}

/**
 * Load locations by type
 */
export async function loadLocationsByType(db, buildingId, locationType, logger) {
  try {
    const result = await db.query({
      selector: {
        type: 'location',
        buildingId: buildingId,
        locationType: locationType
      },
      sort: ['locationCode']
    });

    const locations = result.docs || result;
    logger.debug(`Loaded ${locations.length} locations of type ${locationType}`);
    return locations;

  } catch (error) {
    logger.error('Failed to load locations by type:', error);
    return [];
  }
}

/**
 * Load location hierarchy (all locations organized in tree)
 */
export async function loadLocationHierarchy(db, buildingId, logger) {
  try {
    // Load all locations for building
    const allLocations = await loadLocations(db, buildingId, logger);

    // Build hierarchy tree
    const rootLocations = allLocations.filter(loc => !loc.parentLocationId);

    const buildTree = (locations, parentId = null) => {
      return locations
        .filter(loc => loc.parentLocationId === parentId)
        .map(loc => ({
          ...loc,
          children: buildTree(allLocations, loc._id)
        }));
    };

    const tree = buildTree(allLocations, null);

    logger.debug(`Built hierarchy tree with ${rootLocations.length} root locations`);
    return {
      allLocations,
      tree,
      rootLocations
    };

  } catch (error) {
    logger.error('Failed to load location hierarchy:', error);
    return {
      allLocations: [],
      tree: [],
      rootLocations: []
    };
  }
}

/**
 * Load movements for a location
 */
export async function loadMovements(db, locationId, dateRange, logger) {
  try {
    const selector = {
      type: 'movement',
      locationId: locationId
    };

    // Add date range filter if provided
    if (dateRange && dateRange.start && dateRange.end) {
      selector.createdAt = {
        $gte: dateRange.start,
        $lte: dateRange.end
      };
    }

    const result = await db.query({
      selector,
      sort: [{ createdAt: 'desc' }]
    });

    const movements = result.docs || result;
    logger.debug(`Loaded ${movements.length} movements for location ${locationId}`);
    return movements;

  } catch (error) {
    logger.error('Failed to load movements:', error);
    return [];
  }
}

/**
 * Load alerts for a building
 */
export async function loadAlerts(db, buildingId, status, logger) {
  try {
    const selector = {
      type: 'alert',
      buildingId: buildingId
    };

    if (status && status !== 'all') {
      selector.status = status;
    }

    const result = await db.query({
      selector,
      sort: [{ createdAt: 'desc' }]
    });

    const alerts = result.docs || result;
    logger.debug(`Loaded ${alerts.length} alerts for building ${buildingId}`);
    return alerts;

  } catch (error) {
    logger.error('Failed to load alerts:', error);
    return [];
  }
}

/**
 * Save location (create or update)
 */
export async function saveLocation(db, location, isNew, logger) {
  try {
    if (isNew) {
      // Ensure required fields
      if (!location._id) {
        location._id = `location_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
      if (!location.type) {
        location.type = 'location';
      }
      if (!location.createdAt) {
        location.createdAt = new Date().toISOString();
      }
      location.updatedAt = new Date().toISOString();

      // Initialize capacity if not provided
      if (!location.capacity) {
        location.capacity = { ...DEFAULT_CAPACITY };
      }

      // Initialize utilization
      if (!location.currentUtilization) {
        location.currentUtilization = {
          weight_kg: 0,
          volume_m3: 0,
          itemCount: 0,
          percentFull: 0
        };
      }

      // Initialize stats
      location.totalMovementsIn = 0;
      location.totalMovementsOut = 0;
      location.lastMovementAt = null;

      await db.create(location);
      logger.info('Location created:', location.locationCode);

    } else {
      // Update existing location
      location.updatedAt = new Date().toISOString();
      await db.update(location);
      logger.info('Location updated:', location.locationCode);
    }

    return location;

  } catch (error) {
    logger.error('Failed to save location:', error);
    throw error;
  }
}

/**
 * Save movement
 */
export async function saveMovement(db, movement, logger) {
  try {
    // Ensure required fields
    if (!movement._id) {
      movement._id = `movement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    if (!movement.type) {
      movement.type = 'movement';
    }
    if (!movement.createdAt) {
      movement.createdAt = new Date().toISOString();
    }
    movement.updatedAt = new Date().toISOString();

    await db.create(movement);
    logger.info('Movement created:', movement._id);

    return movement;

  } catch (error) {
    logger.error('Failed to save movement:', error);
    throw error;
  }
}

/**
 * Save alert
 */
export async function saveAlert(db, alert, logger) {
  try {
    // Ensure required fields
    if (!alert._id) {
      alert._id = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    if (!alert.type) {
      alert.type = 'alert';
    }
    if (!alert.createdAt) {
      alert.createdAt = new Date().toISOString();
    }
    alert.updatedAt = new Date().toISOString();

    await db.create(alert);
    logger.info('Alert created:', alert._id);

    return alert;

  } catch (error) {
    logger.error('Failed to save alert:', error);
    throw error;
  }
}

/**
 * Delete location
 */
export async function deleteLocation(db, location, cascadeChildren, logger) {
  try {
    // Check if location has children
    const children = await db.query({
      selector: {
        type: 'location',
        parentLocationId: location._id
      }
    });

    const childLocations = children.docs || children;

    if (childLocations.length > 0) {
      if (!cascadeChildren) {
        throw new Error(`Cannot delete location with ${childLocations.length} children. Please delete children first or enable cascade delete.`);
      } else {
        // Recursively delete children
        for (const child of childLocations) {
          await deleteLocation(db, child, true, logger);
        }
      }
    }

    // Delete the location
    await db.delete(location);
    logger.info('Location deleted:', location.locationCode);

  } catch (error) {
    logger.error('Failed to delete location:', error);
    throw error;
  }
}

/**
 * Generate location code
 */
export function generateLocationCode(buildingCode, locationType, parentCode, sequence) {
  const parts = [];

  // Add building code
  parts.push(buildingCode);

  // Add parent code parts if exists
  if (parentCode) {
    const parentParts = parentCode.split(LOCATION_CODE_SEPARATOR);
    // Skip the building code (first part)
    for (let i = 1; i < parentParts.length; i++) {
      parts.push(parentParts[i]);
    }
  }

  // Add sequence for this location type
  // Use type prefix + sequence number
  const typePrefix = getTypePrefix(locationType);
  parts.push(`${typePrefix}${sequence.toString().padStart(2, '0')}`);

  return parts.join(LOCATION_CODE_SEPARATOR);
}

/**
 * Get type prefix for location code
 */
function getTypePrefix(locationType) {
  const prefixes = {
    'zone': 'Z',
    'storeroom': 'SR',
    'cold_storage': 'CS',
    'docking_point': 'DP',
    'aisle': 'A',
    'rack': 'R',
    'shelf': 'S',
    'bin': 'B',
    'bulk_area': 'BK',
    'quarantine': 'Q',
    'staging_area': 'ST',
    'returns_area': 'RT'
  };

  return prefixes[locationType] || 'L';
}

/**
 * Check if location code is unique
 */
export async function checkLocationCodeUnique(db, code, currentId, logger) {
  try {
    const result = await db.query({
      selector: {
        type: 'location',
        locationCode: code
      }
    });

    const existingLocations = result.docs || result;

    // Filter out the current location if updating
    const conflicts = existingLocations.filter(loc => loc._id !== currentId);

    return conflicts.length === 0;

  } catch (error) {
    logger.error('Failed to check location code uniqueness:', error);
    return false;
  }
}

/**
 * Calculate utilization for a location
 */
export function calculateUtilization(location) {
  if (!location.capacity || !location.currentUtilization) {
    return 0;
  }

  const capacity = location.capacity;
  const current = location.currentUtilization;

  // Calculate percentage based on multiple factors
  let percentages = [];

  if (capacity.weight_kg > 0) {
    percentages.push((current.weight_kg / capacity.weight_kg) * 100);
  }

  if (capacity.volume_m3 > 0) {
    percentages.push((current.volume_m3 / capacity.volume_m3) * 100);
  }

  if (capacity.maxItems > 0) {
    percentages.push((current.itemCount / capacity.maxItems) * 100);
  }

  // Return the maximum percentage (most restrictive)
  return percentages.length > 0 ? Math.max(...percentages) : 0;
}

/**
 * Update location utilization after a movement
 */
export async function updateLocationUtilization(db, locationId, movement, logger) {
  try {
    // Load the location
    const location = await db.read(locationId);
    if (!location) {
      throw new Error(`Location not found: ${locationId}`);
    }

    // Update utilization based on movement type
    const current = location.currentUtilization || {
      weight_kg: 0,
      volume_m3: 0,
      itemCount: 0,
      percentFull: 0
    };

    if (movement.movementType === 'check-in') {
      // Add to utilization
      current.weight_kg += movement.weight_kg || 0;
      current.volume_m3 += movement.volume_m3 || 0;
      current.itemCount += movement.quantity || 0;
      location.totalMovementsIn = (location.totalMovementsIn || 0) + 1;

    } else if (movement.movementType === 'check-out') {
      // Subtract from utilization
      current.weight_kg = Math.max(0, current.weight_kg - (movement.weight_kg || 0));
      current.volume_m3 = Math.max(0, current.volume_m3 - (movement.volume_m3 || 0));
      current.itemCount = Math.max(0, current.itemCount - (movement.quantity || 0));
      location.totalMovementsOut = (location.totalMovementsOut || 0) + 1;
    }

    // Calculate percentage
    current.percentFull = calculateUtilization(location);

    location.currentUtilization = current;
    location.lastMovementAt = movement.createdAt || new Date().toISOString();
    location.updatedAt = new Date().toISOString();

    // Save updated location
    await db.update(location);

    logger.debug(`Updated utilization for location ${location.locationCode}: ${current.percentFull.toFixed(1)}%`);

    return location;

  } catch (error) {
    logger.error('Failed to update location utilization:', error);
    throw error;
  }
}

/**
 * Get next sequence number for location type
 */
export async function getNextSequenceNumber(db, buildingId, locationType, parentLocationId, logger) {
  try {
    // Query for existing locations of this type under the same parent
    const result = await db.query({
      selector: {
        type: 'location',
        buildingId: buildingId,
        locationType: locationType,
        parentLocationId: parentLocationId
      }
    });

    const existingLocations = result.docs || result;

    // Return count + 1 as next sequence
    return existingLocations.length + 1;

  } catch (error) {
    logger.error('Failed to get next sequence number:', error);
    return 1;
  }
}

/**
 * Create audit log entry
 */
export async function createAuditLog(db, auditData, logger) {
  try {
    const auditLog = {
      _id: `auditlog_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'auditLog',
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      ...auditData
    };

    await db.create(auditLog);
    logger.debug('Audit log created:', auditLog.eventType);

    return auditLog;

  } catch (error) {
    logger.error('Failed to create audit log:', error);
    // Don't throw - audit logging failure should not block operations
    return null;
  }
}
