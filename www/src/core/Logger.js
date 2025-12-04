/**
 * Logger.js - Centralized logging system
 * Provides structured logging with levels and namespaces
 */

class Logger {
  static LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    NONE: 4
  };

  constructor(namespace = 'App', level = Logger.LOG_LEVELS.INFO) {
    this.namespace = namespace;
    this.level = level;
    this.history = [];
    this.maxHistory = 100;
  }

  setLevel(level) {
    this.level = level;
  }

  debug(...args) {
    this._log(Logger.LOG_LEVELS.DEBUG, 'DEBUG', ...args);
  }

  info(...args) {
    this._log(Logger.LOG_LEVELS.INFO, 'INFO', ...args);
  }

  warn(...args) {
    this._log(Logger.LOG_LEVELS.WARN, 'WARN', ...args);
  }

  error(...args) {
    this._log(Logger.LOG_LEVELS.ERROR, 'ERROR', ...args);
  }

  _log(level, levelName, ...args) {
    if (level < this.level) return;

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${this.namespace}] [${levelName}]`;

    const logEntry = {
      timestamp,
      namespace: this.namespace,
      level: levelName,
      message: args
    };

    // Store in history
    this.history.push(logEntry);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    // Console output
    const consoleFn = level === Logger.LOG_LEVELS.ERROR ? console.error :
                     level === Logger.LOG_LEVELS.WARN ? console.warn :
                     console.log;

    consoleFn(prefix, ...args);
  }

  getHistory() {
    return [...this.history];
  }

  clearHistory() {
    this.history = [];
  }
}

// Global logger factory
const LoggerFactory = {
  loggers: new Map(),
  defaultLevel: Logger.LOG_LEVELS.INFO,

  getLogger(namespace) {
    if (!this.loggers.has(namespace)) {
      this.loggers.set(namespace, new Logger(namespace, this.defaultLevel));
    }
    return this.loggers.get(namespace);
  },

  setGlobalLevel(level) {
    this.defaultLevel = level;
    this.loggers.forEach(logger => logger.setLevel(level));
  }
};

export { Logger, LoggerFactory };