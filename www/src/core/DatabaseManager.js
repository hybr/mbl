/**
 * DatabaseManager.js - PouchDB wrapper with CouchDB sync
 * Manages offline storage and real-time synchronization
 */

import { LoggerFactory } from './Logger.js';
import { eventBus } from './EventBus.js';

class DatabaseManager {
  constructor(options = {}) {
    this.dbName = options.dbName || 'miniapp_db';
    this.remoteURL = options.remoteURL || null;
    this.logger = LoggerFactory.getLogger('DatabaseManager');

    this.db = null;
    this.syncHandler = null;
    this.changeListener = null;
    this.syncRetryDelay = options.syncRetryDelay || 5000;
    this.isOnline = navigator.onLine;

    this.subscribers = new Map(); // Collection-based subscribers
  }

  /**
   * Initialize PouchDB and setup sync
   */
  async init() {
    try {
      // Initialize PouchDB
      this.db = new PouchDB(this.dbName);
      this.logger.info(`PouchDB initialized: ${this.dbName}`);

      // Setup change listener for real-time updates
      this.setupChangeListener();

      // Setup online/offline detection
      this.setupNetworkListener();

      // Start sync if remote URL provided
      if (this.remoteURL) {
        await this.startSync();
      }

      return true;
    } catch (error) {
      this.logger.error('Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * Setup real-time change listener
   */
  setupChangeListener() {
    this.changeListener = this.db.changes({
      since: 'now',
      live: true,
      include_docs: true
    }).on('change', (change) => {
      this.logger.debug('Database change detected:', change);
      this.notifySubscribers(change);

      // Emit global event
      eventBus.emit('db:change', change);
    }).on('error', (error) => {
      this.logger.error('Change listener error:', error);
      eventBus.emit('db:error', error);
    });

    this.logger.info('Change listener activated');
  }

  /**
   * Setup network online/offline detection
   */
  setupNetworkListener() {
    window.addEventListener('online', () => {
      this.logger.info('Network online');
      this.isOnline = true;
      eventBus.emit('network:online');

      if (this.remoteURL && !this.syncHandler) {
        this.startSync();
      }
    });

    window.addEventListener('offline', () => {
      this.logger.info('Network offline');
      this.isOnline = false;
      eventBus.emit('network:offline');
    });
  }

  /**
   * Start bidirectional sync with CouchDB
   */
  async startSync() {
    if (!this.remoteURL) {
      this.logger.warn('No remote URL configured for sync');
      return;
    }

    try {
      const remoteDB = new PouchDB(this.remoteURL);

      this.syncHandler = this.db.sync(remoteDB, {
        live: true,
        retry: true,
        heartbeat: 10000,
        timeout: 30000
      })
      .on('change', (info) => {
        this.logger.debug('Sync change:', info);
        eventBus.emit('sync:change', info);
      })
      .on('paused', (err) => {
        if (err) {
          this.logger.warn('Sync paused with error:', err);
          eventBus.emit('sync:paused', err);
        } else {
          this.logger.debug('Sync paused (caught up)');
          eventBus.emit('sync:paused', null);
        }
      })
      .on('active', () => {
        this.logger.debug('Sync resumed');
        eventBus.emit('sync:active');
      })
      .on('denied', (err) => {
        this.logger.error('Sync denied:', err);
        eventBus.emit('sync:denied', err);
      })
      .on('error', (err) => {
        this.logger.error('Sync error:', err);
        eventBus.emit('sync:error', err);

        // Retry after delay
        setTimeout(() => {
          if (this.isOnline) {
            this.logger.info('Retrying sync...');
            this.startSync();
          }
        }, this.syncRetryDelay);
      });

      this.logger.info('Sync started with:', this.remoteURL);
      eventBus.emit('sync:started');

    } catch (error) {
      this.logger.error('Failed to start sync:', error);
      throw error;
    }
  }

  /**
   * Stop sync
   */
  stopSync() {
    if (this.syncHandler) {
      this.syncHandler.cancel();
      this.syncHandler = null;
      this.logger.info('Sync stopped');
      eventBus.emit('sync:stopped');
    }
  }

  /**
   * Subscribe to changes for a specific collection/type
   */
  subscribe(collection, callback, context = null) {
    if (!this.subscribers.has(collection)) {
      this.subscribers.set(collection, []);
    }

    const subscriber = { callback, context };
    this.subscribers.get(collection).push(subscriber);

    this.logger.debug(`Subscribed to collection: ${collection}`);

    // Return unsubscribe function
    return () => this.unsubscribe(collection, callback, context);
  }

  /**
   * Unsubscribe from collection changes
   */
  unsubscribe(collection, callback, context = null) {
    if (!this.subscribers.has(collection)) return;

    const subscribers = this.subscribers.get(collection);
    const index = subscribers.findIndex(
      s => s.callback === callback && s.context === context
    );

    if (index !== -1) {
      subscribers.splice(index, 1);
      this.logger.debug(`Unsubscribed from collection: ${collection}`);
    }

    if (subscribers.length === 0) {
      this.subscribers.delete(collection);
    }
  }

  /**
   * Notify subscribers of changes
   */
  notifySubscribers(change) {
    if (!change.doc || !change.doc.type) return;

    const collection = change.doc.type;
    if (!this.subscribers.has(collection)) return;

    const subscribers = this.subscribers.get(collection);
    subscribers.forEach(({ callback, context }) => {
      try {
        callback.call(context, change);
      } catch (error) {
        this.logger.error(`Error notifying subscriber for ${collection}:`, error);
      }
    });
  }

  /**
   * CRUD Operations
   */

  async create(doc) {
    try {
      doc.createdAt = new Date().toISOString();
      doc.updatedAt = doc.createdAt;

      const result = await this.db.put(doc);
      this.logger.debug('Document created:', result.id);
      return { ...doc, _id: result.id, _rev: result.rev };
    } catch (error) {
      this.logger.error('Failed to create document:', error);
      throw error;
    }
  }

  async read(id) {
    try {
      const doc = await this.db.get(id);
      return doc;
    } catch (error) {
      if (error.name === 'not_found') {
        return null;
      }
      this.logger.error('Failed to read document:', error);
      throw error;
    }
  }

  async update(doc) {
    try {
      // Fetch latest version to avoid conflicts
      const latestDoc = await this.db.get(doc._id);

      // Merge changes with latest version
      const updatedDoc = {
        ...latestDoc,
        ...doc,
        _rev: latestDoc._rev, // Use latest revision
        updatedAt: new Date().toISOString()
      };

      const result = await this.db.put(updatedDoc);
      this.logger.debug('Document updated:', result.id);
      return { ...updatedDoc, _rev: result.rev };
    } catch (error) {
      this.logger.error('Failed to update document:', error);
      throw error;
    }
  }

  async delete(doc) {
    try {
      // Fetch latest version to avoid conflicts
      const latestDoc = await this.db.get(doc._id);
      const result = await this.db.remove(latestDoc);
      this.logger.debug('Document deleted:', result.id);
      return result;
    } catch (error) {
      if (error.name === 'not_found') {
        // Document already deleted
        this.logger.debug('Document already deleted:', doc._id);
        return { id: doc._id, ok: true };
      }
      this.logger.error('Failed to delete document:', error);
      throw error;
    }
  }

  /**
   * Query documents by type/collection
   */
  async query(options = {}) {
    try {
      // If selector is provided, use find()
      if (options.selector) {
        const result = await this.db.find(options);
        this.logger.debug('Query with selector returned:', result.docs.length, 'documents');
        return result.docs;
      }

      // Legacy support: if type is specified without selector
      if (options.type) {
        const query = {
          selector: { type: options.type },
          limit: options.limit,
          skip: options.skip,
          sort: options.sort
        };
        const result = await this.db.find(query);
        this.logger.debug('Query with type returned:', result.docs.length, 'documents');
        return result.docs;
      }

      // Get all documents using allDocs
      const query = {
        include_docs: true,
        limit: options.limit,
        skip: options.skip
      };
      const result = await this.db.allDocs(query);
      this.logger.debug('Query allDocs returned:', result.rows.length, 'documents');
      return result.rows.map(row => row.doc).filter(doc => doc);

    } catch (error) {
      this.logger.error('Failed to query documents:', error);
      throw error;
    }
  }

  /**
   * Bulk operations
   */
  async bulkCreate(docs) {
    try {
      const timestamp = new Date().toISOString();
      const docsWithTimestamps = docs.map(doc => ({
        ...doc,
        createdAt: timestamp,
        updatedAt: timestamp
      }));

      const result = await this.db.bulkDocs(docsWithTimestamps);
      this.logger.debug(`Bulk created ${result.length} documents`);
      return result;
    } catch (error) {
      this.logger.error('Failed to bulk create documents:', error);
      throw error;
    }
  }

  /**
   * Create index for faster queries
   */
  async createIndex(fields) {
    try {
      const result = await this.db.createIndex({
        index: { fields }
      });
      this.logger.info('Index created:', fields);
      return result;
    } catch (error) {
      this.logger.error('Failed to create index:', error);
      throw error;
    }
  }

  /**
   * Destroy database
   */
  async destroy() {
    try {
      if (this.changeListener) {
        this.changeListener.cancel();
      }

      this.stopSync();

      if (this.db) {
        await this.db.close();
        this.logger.info('Database closed');
      }

      this.subscribers.clear();

    } catch (error) {
      this.logger.error('Failed to destroy database:', error);
      throw error;
    }
  }

  /**
   * Get database info
   */
  async getInfo() {
    return await this.db.info();
  }
}

export { DatabaseManager };
