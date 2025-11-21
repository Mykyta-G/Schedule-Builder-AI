/**
 * Centralized Error Logging System
 * Provides structured logging with context, error tracking, and debugging information
 */

const ERROR_CATEGORIES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  TYPE_ERROR: 'TYPE_ERROR',
  RANGE_ERROR: 'RANGE_ERROR',
  LOGICAL_ERROR: 'LOGICAL_ERROR',
  SAVE_ERROR: 'SAVE_ERROR',
  PARSE_ERROR: 'PARSE_ERROR',
  INIT_ERROR: 'INIT_ERROR',
  NAVIGATION_ERROR: 'NAVIGATION_ERROR',
  APPLICATION_ERROR: 'APPLICATION_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  STATE_SAVE: 'STATE_SAVE',
  STATE_RESTORE: 'STATE_RESTORE',
  SCHEDULE_DISPLAY: 'SCHEDULE_DISPLAY',
  FILTER_CHANGE: 'FILTER_CHANGE',
  COMPUTED_UPDATE: 'COMPUTED_UPDATE'
};

const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

/**
 * Create a structured log entry
 */
const createLogEntry = (level, category, action, details = {}) => {
  return {
    level,
    category,
    action,
    timestamp: new Date().toISOString(),
    ...details
  };
};

/**
 * Enhanced error logger with context
 */
export const logError = (action, error, context = {}) => {
  const category = context.category || ERROR_CATEGORIES.APPLICATION_ERROR;
  const logEntry = createLogEntry(LOG_LEVELS.ERROR, category, action, {
    error: {
      message: error?.message || String(error),
      stack: error?.stack,
      name: error?.name,
      ...(error?.code && { code: error.code })
    },
    context: {
      ...context,
      userAgent: navigator.userAgent,
      url: window.location.href
    }
  });
  
  console.error(`[${category}] ${action}`, logEntry);
  
  return logEntry;
};

/**
 * Enhanced warning logger
 */
export const logWarning = (action, context = {}) => {
  const category = context.category || ERROR_CATEGORIES.APPLICATION_ERROR;
  const logEntry = createLogEntry(LOG_LEVELS.WARN, category, action, {
    context
  });
  
  console.warn(`[${category}] ${action}`, logEntry);
  
  return logEntry;
};

/**
 * Enhanced info logger
 */
export const logInfo = (action, context = {}) => {
  const category = context.category || ERROR_CATEGORIES.APPLICATION_ERROR;
  const logEntry = createLogEntry(LOG_LEVELS.INFO, category, action, {
    context
  });
  
  console.log(`[${category}] ${action}`, logEntry);
  
  return logEntry;
};

/**
 * Enhanced debug logger (only in development)
 */
export const logDebug = (action, context = {}) => {
  if (process.env.NODE_ENV === 'development') {
    const category = context.category || ERROR_CATEGORIES.APPLICATION_ERROR;
    const logEntry = createLogEntry(LOG_LEVELS.DEBUG, category, action, {
      context
    });
    
    console.debug(`[${category}] ${action}`, logEntry);
    
    return logEntry;
  }
};

/**
 * Log validation errors with field context
 */
export const logValidationError = (field, value, errorMessage, validationRule = null) => {
  return logError('VALIDATE_FIELD', new Error(errorMessage), {
    category: ERROR_CATEGORIES.VALIDATION_ERROR,
    field,
    value,
    validationRule,
    errorMessage
  });
};

/**
 * Log save operation errors
 */
export const logSaveError = (error, constraints, attemptNumber = 1) => {
  return logError('SAVE_OPERATION', error, {
    category: ERROR_CATEGORIES.SAVE_ERROR,
    constraints: JSON.stringify(constraints),
    attemptNumber
  });
};

/**
 * Log type errors
 */
export const logTypeError = (field, expectedType, actualType, value) => {
  return logError('TYPE_CHECK', new Error(`Expected ${expectedType}, got ${actualType}`), {
    category: ERROR_CATEGORIES.TYPE_ERROR,
    field,
    expectedType,
    actualType,
    value,
    valueType: typeof value
  });
};

/**
 * Log parse errors
 */
export const logParseError = (field, inputValue, error, expectedFormat) => {
  return logError('PARSE_OPERATION', error, {
    category: ERROR_CATEGORIES.PARSE_ERROR,
    field,
    inputValue,
    expectedFormat
  });
};

/**
 * Log navigation errors
 */
export const logNavigationError = (error, fromPage, toPage, context = {}) => {
  return logError('NAVIGATION', error, {
    category: ERROR_CATEGORIES.NAVIGATION_ERROR,
    fromPage,
    toPage,
    ...context
  });
};

/**
 * Log state restoration operations
 */
export const logStateRestore = (action, details = {}) => {
  const logEntry = createLogEntry(LOG_LEVELS.INFO, ERROR_CATEGORIES.STATE_RESTORE, action, {
    component: 'ViewerPage',
    details: {
      hasGeneratedSchedule: details.hasGeneratedSchedule || false,
      hasSelectedClassFilter: details.hasSelectedClassFilter || false,
      selectedClassFilter: details.selectedClassFilter || null,
      scheduleKeys: details.scheduleKeys || [],
      scheduleEntryCount: details.scheduleEntryCount || 0,
      presetId: details.presetId || null,
      ...details
    }
  });
  
  console.log(`[${ERROR_CATEGORIES.STATE_RESTORE}] ${action}`, logEntry);
  return logEntry;
};

/**
 * Log schedule display changes
 */
export const logScheduleDisplay = (action, details = {}) => {
  const logEntry = createLogEntry(LOG_LEVELS.INFO, ERROR_CATEGORIES.SCHEDULE_DISPLAY, action, {
    component: 'ViewerPage',
    details: {
      hasSchedule: details.hasSchedule || false,
      scheduleKeys: details.scheduleKeys || [],
      scheduleEntryCount: details.scheduleEntryCount || 0,
      selectedDayKey: details.selectedDayKey || null,
      selectedClassFilter: details.selectedClassFilter || null,
      ...details
    }
  });
  
  console.log(`[${ERROR_CATEGORIES.SCHEDULE_DISPLAY}] ${action}`, logEntry);
  return logEntry;
};

/**
 * Log navigation events
 */
export const logNavigation = (action, details = {}) => {
  const logEntry = createLogEntry(LOG_LEVELS.INFO, ERROR_CATEGORIES.NAVIGATION_ERROR, action, {
    component: details.component || 'ViewerPage',
    details: {
      fromPage: details.fromPage || null,
      toPage: details.toPage || null,
      presetId: details.presetId || null,
      hasState: details.hasState || false,
      ...details
    }
  });
  
  console.log(`[${ERROR_CATEGORIES.NAVIGATION_ERROR}] ${action}`, logEntry);
  return logEntry;
};

/**
 * Log schedule clearing operations
 */
export const logScheduleClear = (action, details = {}) => {
  const logEntry = createLogEntry(LOG_LEVELS.WARN, ERROR_CATEGORIES.SCHEDULE_DISPLAY, action, {
    component: 'ViewerPage',
    details: {
      reason: details.reason || 'unknown',
      hadSchedule: details.hadSchedule || false,
      scheduleKeys: details.scheduleKeys || [],
      ...details
    }
  });
  
  console.warn(`[${ERROR_CATEGORIES.SCHEDULE_DISPLAY}] ${action}`, logEntry);
  return logEntry;
};

/**
 * Log filter changes
 */
export const logFilterChange = (action, details = {}) => {
  const logEntry = createLogEntry(LOG_LEVELS.INFO, ERROR_CATEGORIES.FILTER_CHANGE, action, {
    component: 'ViewerPage',
    details: {
      oldFilter: details.oldFilter || null,
      newFilter: details.newFilter || null,
      availableOptions: details.availableOptions || [],
      ...details
    }
  });
  
  console.log(`[${ERROR_CATEGORIES.FILTER_CHANGE}] ${action}`, logEntry);
  return logEntry;
};

/**
 * Log computed property updates
 */
export const logComputedUpdate = (computedName, details = {}) => {
  const logEntry = createLogEntry(LOG_LEVELS.DEBUG, ERROR_CATEGORIES.COMPUTED_UPDATE, 'COMPUTED_UPDATE', {
    component: 'ViewerPage',
    computedName,
    details: {
      oldValue: details.oldValue,
      newValue: details.newValue,
      ...details
    }
  });
  
  if (process.env.NODE_ENV === 'development') {
    console.debug(`[${ERROR_CATEGORIES.COMPUTED_UPDATE}] ${computedName}`, logEntry);
  }
  return logEntry;
};

/**
 * Export error categories for use in components
 */
export { ERROR_CATEGORIES, LOG_LEVELS };

