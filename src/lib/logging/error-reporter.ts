// lib/logging/error-reporter.ts
import { logger, type LogContext } from "./logger";

export interface ErrorReport {
  error: Error;
  context?: LogContext;
  component?: string;
  userAction?: string;
  timestamp: Date;
}

interface ResourceElement extends HTMLElement {
  src?: string;
  href?: string;
}

class ErrorReporter {
  private errorQueue: ErrorReport[] = [];
  private maxQueueSize = 100;
  private isClient = typeof window !== "undefined";

  constructor() {
    if (this.isClient) {
      this.setupGlobalErrorHandlers();
    }
  }

  private setupGlobalErrorHandlers(): void {
    // Handle unhandled JavaScript errors
    window.addEventListener("error", (event) => {
      this.reportError(
        new Error(event.message),
        {
          component: "GlobalErrorHandler",
          action: "unhandled_js_error",
          metadata: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
          },
        }
      );
    });

    // Handle unhandled Promise rejections
    window.addEventListener("unhandledrejection", (event) => {
      const error = event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason));

      this.reportError(error, {
        component: "GlobalErrorHandler",
        action: "unhandled_promise_rejection",
      });
    });

    // Handle resource loading errors
    window.addEventListener("error", (event) => {
      if (event.target && event.target !== window) {
        const target = event.target as ResourceElement;
        this.reportError(
          new Error(`Resource failed to load: ${target.tagName}`),
          {
            component: "GlobalErrorHandler",
            action: "resource_load_error",
            metadata: {
              tagName: target.tagName,
              src: target.src || target.href,
            },
          }
        );
      }
    }, true);
  }

  reportError(error: Error, context?: LogContext): void {
    const report: ErrorReport = {
      error,
      context,
      component: context?.component,
      userAction: context?.action,
      timestamp: new Date(),
    };

    // Add to queue
    this.errorQueue.push(report);

    // Trim queue if it gets too large
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift();
    }

    // Log the error
    logger.error(error.message, context, error);
  }

  // Report API errors with additional context
  reportApiError(
    endpoint: string,
    method: string,
    error: Error,
    responseStatus?: number,
    responseData?: unknown
  ): void {
    this.reportError(error, {
      component: "API",
      action: `${method} ${endpoint}`,
      metadata: {
        endpoint,
        method,
        responseStatus,
        responseData: responseData ? JSON.stringify(responseData).substring(0, 1000) : undefined,
      },
    });
  }

  // Report database errors
  reportDbError(operation: string, table: string, error: Error): void {
    this.reportError(error, {
      component: "Database",
      action: operation,
      metadata: {
        table,
        operation,
      },
    });
  }

  // Report authentication errors
  reportAuthError(action: string, error: Error, userId?: string): void {
    this.reportError(error, {
      component: "Authentication",
      action,
      userId,
      metadata: {
        authAction: action,
      },
    });
  }

  // Report form validation errors
  reportFormError(formName: string, field: string, error: Error): void {
    this.reportError(error, {
      component: "Form",
      action: "validation_error",
      metadata: {
        formName,
        field,
      },
    });
  }

  // Report geolocation errors
  reportLocationError(error: Error, action: string): void {
    this.reportError(error, {
      component: "Geolocation",
      action,
      metadata: {
        browserSupported: "geolocation" in navigator,
        permissionsSupported: "permissions" in navigator,
      },
    });
  }

  // Report file upload errors
  reportUploadError(
    fileName: string,
    fileSize: number,
    error: Error,
    stage: "validation" | "upload" | "processing"
  ): void {
    this.reportError(error, {
      component: "FileUpload",
      action: `upload_${stage}_error`,
      metadata: {
        fileName: fileName.substring(0, 100), // Limit filename length
        fileSize,
        stage,
      },
    });
  }

  // Get recent errors for debugging
  getRecentErrors(count = 10): ErrorReport[] {
    return this.errorQueue.slice(-count);
  }

  // Clear error queue
  clearErrors(): void {
    this.errorQueue = [];
  }

  // Get error statistics
  getErrorStats(): {
    totalErrors: number;
    errorsByComponent: Record<string, number>;
    errorsByAction: Record<string, number>;
    recentErrorRate: number; // errors per minute in last 10 minutes
  } {
    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

    const recentErrors = this.errorQueue.filter(
      report => report.timestamp > tenMinutesAgo
    );

    const errorsByComponent: Record<string, number> = {};
    const errorsByAction: Record<string, number> = {};

    this.errorQueue.forEach(report => {
      if (report.component) {
        errorsByComponent[report.component] = (errorsByComponent[report.component] || 0) + 1;
      }
      if (report.userAction) {
        errorsByAction[report.userAction] = (errorsByAction[report.userAction] || 0) + 1;
      }
    });

    return {
      totalErrors: this.errorQueue.length,
      errorsByComponent,
      errorsByAction,
      recentErrorRate: recentErrors.length / 10, // per minute
    };
  }
}

// Export singleton instance
export const errorReporter = new ErrorReporter();

// Convenience functions
export const reportError = (error: Error, context?: LogContext) => {
  errorReporter.reportError(error, context);
};

export const reportApiError = (
  endpoint: string,
  method: string,
  error: Error,
  responseStatus?: number,
  responseData?: unknown
) => {
  errorReporter.reportApiError(endpoint, method, error, responseStatus, responseData);
};

export const reportDbError = (operation: string, table: string, error: Error) => {
  errorReporter.reportDbError(operation, table, error);
};

export const reportAuthError = (action: string, error: Error, userId?: string) => {
  errorReporter.reportAuthError(action, error, userId);
};

export const reportFormError = (formName: string, field: string, error: Error) => {
  errorReporter.reportFormError(formName, field, error);
};

export const reportLocationError = (error: Error, action: string) => {
  errorReporter.reportLocationError(error, action);
};

export const reportUploadError = (
  fileName: string,
  fileSize: number,
  error: Error,
  stage: "validation" | "upload" | "processing"
) => {
  errorReporter.reportUploadError(fileName, fileSize, error, stage);
};
