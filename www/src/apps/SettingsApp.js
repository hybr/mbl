/**
 * SettingsApp.js - Settings and diagnostics MiniApp
 * Shows app statistics and allows configuration
 */

import { MiniApp } from '../core/MiniApp.js';
import { Button } from '../components/Button.js';

class SettingsApp extends MiniApp {
  constructor(options = {}) {
    super({
      name: 'SettingsApp',
      ...options
    });

    this.components = {};
    this.stats = {};
  }

  async onInit() {
    this.logger.info('Initializing SettingsApp');

    // Subscribe to app events
    this.subscribe('miniapp:mounted', () => this.updateStats());
    this.subscribe('miniapp:unmounted', () => this.updateStats());
    this.subscribe('sync:change', () => this.updateStats());

    // Update stats periodically
    this.statsInterval = setInterval(() => {
      if (this.isActive) {
        this.updateStats();
      }
    }, 5000);
  }

  async onRender() {
    this.clearContainer();

    // Create header
    const header = this.createElement('div', { className: 'miniapp-header' }, [
      this.createElement('h2', {}, ['Settings & Diagnostics'])
    ]);

    // Create stats section
    const statsSection = this.createElement('div', { className: 'settings-stats' });
    this.components.statsContainer = statsSection;

    // Create actions section
    const actionsSection = this.createElement('div', { className: 'settings-actions' });

    this.components.clearCacheBtn = new Button({
      text: 'Clear Cache',
      className: 'btn btn-warning',
      onClick: () => this.clearCache()
    });

    this.components.exportDataBtn = new Button({
      text: 'Export Data',
      className: 'btn btn-secondary',
      onClick: () => this.exportData()
    });

    this.components.syncNowBtn = new Button({
      text: 'Sync Now',
      className: 'btn btn-primary',
      onClick: () => this.syncNow()
    });

    actionsSection.appendChild(this.components.clearCacheBtn.create());
    actionsSection.appendChild(this.components.exportDataBtn.create());
    actionsSection.appendChild(this.components.syncNowBtn.create());

    // Assemble UI
    this.container.appendChild(header);
    this.container.appendChild(statsSection);
    this.container.appendChild(actionsSection);

    // Initial stats update
    await this.updateStats();

    this.logger.debug('SettingsApp rendered');
  }

  async updateStats() {
    if (!this.isRendered || !this.components.statsContainer) return;

    try {
      // Get app stats (injected by AppManager)
      const appStats = window.appManager ? window.appManager.getStats() : {};

      // Get database info
      let dbInfo = { doc_count: 0, update_seq: 0 };
      if (this.db) {
        dbInfo = await this.db.getInfo();
      }

      this.stats = {
        ...appStats,
        dbDocCount: dbInfo.doc_count,
        dbUpdateSeq: dbInfo.update_seq,
        timestamp: new Date().toLocaleString()
      };

      // Render stats
      this.renderStats();

    } catch (error) {
      this.logger.error('Failed to update stats:', error);
    }
  }

  renderStats() {
    const container = this.components.statsContainer;
    container.innerHTML = '';

    const statItems = [
      { label: 'Registered Classes', value: this.stats.registeredClasses || 0 },
      { label: 'Total Instances', value: this.stats.totalInstances || 0 },
      { label: 'Active Instances', value: this.stats.activeInstances || 0 },
      { label: 'Database Documents', value: this.stats.dbDocCount || 0 },
      { label: 'Database Update Seq', value: this.stats.dbUpdateSeq || 0 },
      { label: 'Network Status', value: navigator.onLine ? 'Online' : 'Offline' },
      { label: 'Sync Status', value: this.stats.dbInfo?.isSyncing ? 'Active' : 'Inactive' },
      { label: 'Last Updated', value: this.stats.timestamp || 'Never' }
    ];

    statItems.forEach(({ label, value }) => {
      const statItem = this.createElement('div', { className: 'stat-item' });
      const statLabel = this.createElement('div', { className: 'stat-label' }, [label]);
      const statValue = this.createElement('div', { className: 'stat-value' }, [String(value)]);

      statItem.appendChild(statLabel);
      statItem.appendChild(statValue);
      container.appendChild(statItem);
    });
  }

  async clearCache() {
    this.logger.info('Clearing cache...');

    try {
      // Clear localStorage
      localStorage.clear();

      // Could also clear IndexedDB, etc.

      this.logger.info('Cache cleared');
      alert('Cache cleared successfully!');

    } catch (error) {
      this.logger.error('Failed to clear cache:', error);
      alert('Failed to clear cache');
    }
  }

  async exportData() {
    this.logger.info('Exporting data...');

    try {
      if (!this.db) {
        alert('Database not available');
        return;
      }

      // Get all documents
      const result = await this.db.query({});
      const data = JSON.stringify(result, null, 2);

      // Create download link
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `miniapp-data-${Date.now()}.json`;
      a.click();

      URL.revokeObjectURL(url);

      this.logger.info('Data exported successfully');

    } catch (error) {
      this.logger.error('Failed to export data:', error);
      alert('Failed to export data');
    }
  }

  async syncNow() {
    this.logger.info('Triggering sync...');

    try {
      if (!this.db || !this.db.remoteURL) {
        alert('Sync not configured');
        return;
      }

      if (!navigator.onLine) {
        alert('You are offline. Cannot sync.');
        return;
      }

      // Sync is automatic, but we can emit an event
      this.emit('sync:manual-trigger');

      alert('Sync in progress...');
      this.logger.info('Sync triggered');

    } catch (error) {
      this.logger.error('Failed to trigger sync:', error);
      alert('Failed to trigger sync');
    }
  }

  onDestroy() {
    // Clear interval
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
    }

    // Destroy components
    Object.values(this.components).forEach(component => {
      if (component.destroy) {
        component.destroy();
      }
    });

    this.logger.info('SettingsApp destroyed');
  }
}

export { SettingsApp };
