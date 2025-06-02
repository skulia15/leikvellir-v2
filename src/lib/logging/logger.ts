// lib/logging/logger.ts

import { type ErrorInfo } from "react";

export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

export interface LogContext {
  userId?: string;
  sessionId?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, unknown>;
  timestamp?: Date;
  userAgent?: string;
  url?: string;
  referrer?: string;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: Error;
  errorInfo?: ErrorInfo;
  stack?: string;
  timestamp: Date;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === "development";
  private isClient = typeof window !== "undefined";

  private getBaseContext(): LogContext {
    const context: LogContext = {
      timestamp: new Date(),
    };

    if (this.isClient) {
      try {
        context.userAgent = navigator.userAgent;
        context.url = window.location.href;
        context.referrer = document.referrer;
        context.sessionId = this.getSessionId();
      } catch {
        // Fallback if browser APIs are not available
        context.sessionId = this.getSessionId();
      }
    } else {
      context.sessionId = "server";
    }

    return context;
  }

  private getSessionId(): string {
    if (!this.isClient) return "server";

    try {
      let sessionId = sessionStorage.getItem("leikvellir-session-id");
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
        sessionStorage.setItem("leikvellir-session-id", sessionId);
      }
      return sessionId;
    } catch {
      // Fallback if sessionStorage is not available
      return `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    }
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    if (context?.component) {
      return `${prefix} [${context.component}] ${message}`;
    }

    return `${prefix} ${message}`;
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.isDevelopment) return true;

    // In production, only log warnings and errors
    return ["warn", "error", "fatal"].includes(level);
  }

  private logToConsole(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return;

    const message = this.formatMessage(entry.level, entry.message, entry.context);

    switch (entry.level) {
      case "debug":
        console.debug(message, entry.context, entry.error);
        break;
      case "info":
        console.info(message, entry.context);
        break;
      case "warn":
        console.warn(message, entry.context, entry.error);
        break;
      case "error":
      case "fatal":
        console.error(message, entry.context, entry.error);
        if (entry.error?.stack) {
          console.error("Stack trace:", entry.error.stack);
        }
        if (entry.errorInfo) {
          console.error("React Error Info:", entry.errorInfo);
        }
        break;
    }
  }

  private async logToExternalService(entry: LogEntry): Promise<void> {
    // In production, you could send to external logging services like:
    // - Sentry: Sentry.captureException(entry.error, { extra: entry.context })
    // - DataDog: DD_LOGS.logger.error(entry.message, entry.context)
    // - Custom API endpoint for logging

    if (!this.shouldLog(entry.level)) return;

    // For now, just log critical errors to console in production
    if (entry.level === "fatal" || entry.level === "error") {
      console.error("EXTERNAL_LOG:", {
        level: entry.level,
        message: entry.message,
        context: entry.context,
        timestamp: entry.timestamp.toISOString(),
      });
    }
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error,
    errorInfo?: ErrorInfo
  ): LogEntry {
    return {
      level,
      message,
      context: { ...this.getBaseContext(), ...context },
      error,
      errorInfo,
      stack: error?.stack,
      timestamp: new Date(),
    };
  }

  private log(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error,
    errorInfo?: ErrorInfo
  ): void {
    const entry = this.createLogEntry(level, message, context, error, errorInfo);

    this.logToConsole(entry);

    // Don't await external logging to avoid blocking
    void this.logToExternalService(entry).catch((err) => {
      console.error("Failed to log to external service:", err);
    });
  }

  debug(message: string, context?: LogContext): void {
    this.log("debug", message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log("info", message, context);
  }

  warn(message: string, context?: LogContext, error?: Error): void {
    this.log("warn", message, context, error);
  }

  error(message: string, context?: LogContext, error?: Error): void {
    this.log("error", message, context, error);
  }

  fatal(message: string, context?: LogContext, error?: Error): void {
    this.log("fatal", message, context, error);
  }

  // React-specific error logging
  reactError(error: Error, errorInfo: ErrorInfo, context?: LogContext): void {
    this.log("error", "React component error", context, error, errorInfo);
  }

  // API-specific error logging
  apiError(
    endpoint: string,
    method: string,
    error: Error,
    context?: LogContext
  ): void {
    this.error(`API ${method} ${endpoint} failed`, {
      ...context,
      component: "API",
      action: `${method} ${endpoint}`,
    }, error);
  }

  // Database-specific error logging
  dbError(operation: string, error: Error, context?: LogContext): void {
    this.error(`Database ${operation} failed`, {
      ...context,
      component: "Database",
      action: operation,
    }, error);
  }

  // User action logging
  userAction(action: string, context?: LogContext): void {
    this.info(`User action: ${action}`, {
      ...context,
      component: "UserAction",
      action,
    });
  }

  // Performance logging
  performance(metric: string, value: number, context?: LogContext): void {
    this.debug(`Performance: ${metric} = ${value}ms`, {
      ...context,
      component: "Performance",
      metadata: { metric, value },
    });
  }

  // Security logging
  security(event: string, context?: LogContext): void {
    this.warn(`Security event: ${event}`, {
      ...context,
      component: "Security",
      action: event,
    });
  }
}

// Export singleton instance
export const logger = new Logger();

// Convenience functions for specific use cases
export const logApiError = (endpoint: string, method: string, error: Error, context?: LogContext) => {
  logger.apiError(endpoint, method, error, context);
};

export const logDbError = (operation: string, error: Error, context?: LogContext) => {
  logger.dbError(operation, error, context);
};

export const logReactError = (error: Error, errorInfo: ErrorInfo, context?: LogContext) => {
  logger.reactError(error, errorInfo, context);
};

export const logUserAction = (action: string, context?: LogContext) => {
  logger.userAction(action, context);
};

export const logPerformance = (metric: string, value: number, context?: LogContext) => {
  logger.performance(metric, value, context);
};

export const logSecurity = (event: string, context?: LogContext) => {
  logger.security(event, context);
};
