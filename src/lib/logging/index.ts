// lib/logging/index.ts
export { logger, type LogLevel, type LogContext, type LogEntry } from "./logger";
export { 
  errorReporter, 
  reportError, 
  reportApiError, 
  reportDbError, 
  reportAuthError, 
  reportFormError, 
  reportLocationError, 
  reportUploadError,
  type ErrorReport 
} from "./error-reporter";

// Re-export specific logging functions for convenience
export { 
  logApiError, 
  logDbError, 
  logReactError, 
  logUserAction, 
  logPerformance, 
  logSecurity 
} from "./logger";
