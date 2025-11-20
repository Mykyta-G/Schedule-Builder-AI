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
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
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
 * Export error categories for use in components
 */
export { ERROR_CATEGORIES, LOG_LEVELS };

