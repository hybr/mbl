/**
 * DataViewerApp.js - View JSON data files in table format
 * Read-only viewer for common data and enums stored in JSON files
 */

import { MiniApp } from '../../core/MiniApp.js';
import { Button } from '../../components/Button.js';

class DataViewerApp extends MiniApp {
  constructor(options) {
    super(options);

    this.dataFiles = [
      { name: 'departments.json', path: '/data/departments.json', title: 'Organization Departments' },
      { name: 'teams.json', path: '/data/teams.json', title: 'Department Teams' },
      { name: 'designations.json', path: '/data/designations.json', title: 'Job Designations & Levels' },
      { name: 'industries.json', path: '/data/industries.json', title: 'Industries & Sectors' },
      { name: 'organization-types.json', path: '/data/organization-types.json', title: 'Legal Organization Types' },

      { name: 'educational-subjects.json', path: '/data/educational-subjects.json', title: 'Educational Subjects' },
      { name: 'skills.json', path: '/data/skills.json', title: 'Professional Skills' },
      { name: 'countries.json', path: '/data/countries.json', title: 'Countries' },

      { name: 'priority-levels.json', path: '/data/priority-levels.json', title: 'Priority Levels' },
      { name: 'status-codes.json', path: '/data/status-codes.json', title: 'HTTP Status Codes' },

      { name: 'user-roles.json', path: '/data/user-roles.json', title: 'User Roles' },
    ];

    this.currentView = 'list'; // 'list' or 'table'
    this.currentFile = null;
    this.currentData = null;
    this.searchTerm = '';
    this.sortColumn = null;
    this.sortDirection = 'asc';

    this.components = {};
  }

  /**
   * Initialize the app
   */
  async onInit() {
    this.logger.info('Initializing DataViewerApp');
  }

  /**
   * Render the app
   */
  async onRender() {
    this.container.innerHTML = '';

    if (this.currentView === 'list') {
      this.renderFileList();
    } else {
      this.renderTableView();
    }
  }

  /**
   * Render the file list view
   */
  renderFileList() {
    const header = this.createElement('div', { className: 'miniapp-header' });
    const title = this.createElement('h2', {}, ['Data Viewer']);
    const subtitle = this.createElement('p', { className: 'data-viewer-subtitle' },
      ['Browse and view JSON data files']);

    header.appendChild(title);
    header.appendChild(subtitle);
    this.container.appendChild(header);

    // File grid
    const fileGrid = this.createElement('div', { className: 'data-file-grid' });

    this.dataFiles.forEach(file => {
      const fileCard = this.createElement('div', { className: 'data-file-card' });

      const fileIcon = this.createElement('div', { className: 'data-file-icon' }, ['📄']);
      const fileName = this.createElement('div', { className: 'data-file-name' }, [file.title]);
      const fileSubname = this.createElement('div', { className: 'data-file-subname' }, [file.name]);

      const viewBtn = new Button({
        text: 'View Data',
        variant: 'primary',
        size: 'small',
        onClick: () => this.loadFile(file)
      });

      fileCard.appendChild(fileIcon);
      fileCard.appendChild(fileName);
      fileCard.appendChild(fileSubname);
      fileCard.appendChild(viewBtn.render());

      fileGrid.appendChild(fileCard);
    });

    this.container.appendChild(fileGrid);
  }

  /**
   * Load a JSON file
   */
  async loadFile(file) {
    try {
      this.logger.info('Loading file:', file.path);

      const response = await fetch(file.path);
      if (!response.ok) {
        throw new Error(`Failed to load ${file.name}`);
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error('Data must be an array of objects');
      }

      this.currentFile = file;
      this.currentData = data;
      this.currentView = 'table';
      this.searchTerm = '';
      this.sortColumn = null;
      this.sortDirection = 'asc';

      await this.render();

    } catch (error) {
      this.logger.error('Failed to load file:', error);
      alert(`Error loading file: ${error.message}`);
    }
  }

  /**
   * Render the table view
   */
  renderTableView() {
    const header = this.createElement('div', { className: 'data-viewer-header' });

    // Back button and title row
    const titleRow = this.createElement('div', { className: 'data-viewer-title-row' });

    const backBtn = new Button({
      text: '← Back',
      variant: 'secondary',
      size: 'small',
      onClick: () => {
        this.currentView = 'list';
        this.currentFile = null;
        this.currentData = null;
        this.render();
      }
    });

    const titleContainer = this.createElement('div', { className: 'data-viewer-title-container' });
    const title = this.createElement('h2', {}, [this.currentFile.title]);
    const recordCount = this.createElement('span', { className: 'data-viewer-count' },
      [`${this.getFilteredData().length} records`]);

    titleContainer.appendChild(title);
    titleContainer.appendChild(recordCount);

    titleRow.appendChild(backBtn.render());
    titleRow.appendChild(titleContainer);
    header.appendChild(titleRow);

    // Search bar
    const searchBar = this.createElement('div', { className: 'data-viewer-search' });
    const searchInput = this.createElement('input', {
      type: 'text',
      className: 'data-viewer-search-input',
      placeholder: 'Search...'
    });
    searchInput.value = this.searchTerm;
    searchInput.addEventListener('input', (e) => {
      this.searchTerm = e.target.value;
      this.render();
    });

    searchBar.appendChild(searchInput);
    header.appendChild(searchBar);

    this.container.appendChild(header);

    // Table container with scroll
    const tableContainer = this.createElement('div', { className: 'data-viewer-table-container' });
    const table = this.createTable();
    tableContainer.appendChild(table);

    this.container.appendChild(tableContainer);
  }

  /**
   * Create the data table
   */
  createTable() {
    const filteredData = this.getFilteredData();

    if (filteredData.length === 0) {
      const emptyMsg = this.createElement('div', { className: 'data-viewer-empty' },
        [this.searchTerm ? 'No results found' : 'No data available']);
      return emptyMsg;
    }

    const table = this.createElement('table', { className: 'data-viewer-table' });

    // Get all unique keys from the data
    const keys = this.getDataKeys(filteredData);

    // Create header
    const thead = this.createElement('thead');
    const headerRow = this.createElement('tr');

    keys.forEach(key => {
      const th = this.createElement('th', { className: 'data-viewer-th' });

      const headerContent = this.createElement('div', { className: 'data-viewer-th-content' });
      const headerText = this.createElement('span', {}, [this.formatHeader(key)]);

      const sortIcon = this.createElement('span', { className: 'data-viewer-sort-icon' });
      if (this.sortColumn === key) {
        sortIcon.textContent = this.sortDirection === 'asc' ? '▲' : '▼';
      } else {
        sortIcon.textContent = '⇅';
      }

      headerContent.appendChild(headerText);
      headerContent.appendChild(sortIcon);
      th.appendChild(headerContent);

      th.addEventListener('click', () => this.toggleSort(key));
      th.style.cursor = 'pointer';

      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create body
    const tbody = this.createElement('tbody');

    filteredData.forEach((row, index) => {
      const tr = this.createElement('tr', { className: 'data-viewer-tr' });
      if (index % 2 === 0) {
        tr.classList.add('data-viewer-tr-even');
      }

      keys.forEach(key => {
        const td = this.createElement('td', { className: 'data-viewer-td' });
        const value = row[key];
        td.innerHTML = this.formatCellValue(key, value);
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);

    return table;
  }

  /**
   * Get all unique keys from data
   */
  getDataKeys(data) {
    const keysSet = new Set();
    data.forEach(item => {
      Object.keys(item).forEach(key => keysSet.add(key));
    });
    return Array.from(keysSet);
  }

  /**
   * Format header text
   */
  formatHeader(key) {
    return key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Format cell value for display
   */
  formatCellValue(key, value) {
    if (value === null || value === undefined) {
      return '<span class="data-viewer-null">—</span>';
    }

    if (typeof value === 'boolean') {
      return value
        ? '<span class="data-viewer-bool-true">✓ True</span>'
        : '<span class="data-viewer-bool-false">✗ False</span>';
    }

    if (Array.isArray(value)) {
      return `<span class="data-viewer-array">[${value.join(', ')}]</span>`;
    }

    if (typeof value === 'object') {
      return `<span class="data-viewer-object">${JSON.stringify(value)}</span>`;
    }

    if (typeof value === 'number') {
      // Format large numbers with commas
      if (value > 999) {
        return value.toLocaleString();
      }
      return value;
    }

    // Check if it's a color code
    if (typeof value === 'string' && value.startsWith('#')) {
      return `<span class="data-viewer-color">
        <span class="data-viewer-color-box" style="background-color: ${value}"></span>
        ${value}
      </span>`;
    }

    // Check if it contains emoji
    if (typeof value === 'string' && /\p{Emoji}/u.test(value)) {
      return `<span class="data-viewer-emoji">${value}</span>`;
    }

    return this.escapeHtml(String(value));
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Get filtered and sorted data
   */
  getFilteredData() {
    if (!this.currentData) return [];

    let filtered = this.currentData;

    // Apply search filter
    if (this.searchTerm) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(item => {
        return Object.values(item).some(value => {
          if (value === null || value === undefined) return false;
          return String(value).toLowerCase().includes(searchLower);
        });
      });
    }

    // Apply sorting
    if (this.sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[this.sortColumn];
        const bVal = b[this.sortColumn];

        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return this.sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        }

        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();

        if (aStr < bStr) return this.sortDirection === 'asc' ? -1 : 1;
        if (aStr > bStr) return this.sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }

  /**
   * Toggle sort on a column
   */
  toggleSort(column) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.render();
  }

  /**
   * Create a DOM element with attributes and children
   */
  createElement(tag, attributes = {}, children = []) {
    const element = document.createElement(tag);

    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'className') {
        element.className = value;
      } else if (key === 'dataset') {
        Object.entries(value).forEach(([dataKey, dataValue]) => {
          element.dataset[dataKey] = dataValue;
        });
      } else {
        element.setAttribute(key, value);
      }
    });

    children.forEach(child => {
      if (typeof child === 'string') {
        element.appendChild(document.createTextNode(child));
      } else if (child instanceof Node) {
        element.appendChild(child);
      }
    });

    return element;
  }

  /**
   * Cleanup
   */
  async onDestroy() {
    this.logger.info('Destroying DataViewerApp');
    this.currentData = null;
    this.currentFile = null;
  }
}

export { DataViewerApp };
