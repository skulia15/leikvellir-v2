"use client";

import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { DefaultErrorFallback } from "./error-fallbacks";
import { logReactError, reportError } from "~/lib/logging";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  component?: string; // Component identifier for better logging
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Enhanced logging with context
    const context = {
      component: this.props.component || "UnknownComponent",
      action: "component_render_error",
      metadata: {
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
      },
    };

    // Log to our centralized logger
    logReactError(error, errorInfo, context);

    // Report to error tracking
    reportError(error, context);

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback ?? DefaultErrorFallback;

      return (
        <FallbackComponent error={this.state.error} reset={this.handleReset} />
      );
    }

    return this.props.children;
  }
}

// Hook-based error handler for functional components
export function useErrorHandler() {
  return (error: Error, errorInfo?: ErrorInfo) => {
    const context = {
      component: "FunctionalComponent",
      action: "hook_error_handler",
    };

    // Log using centralized logger
    logReactError(error, errorInfo || {}, context);
    reportError(error, context);

    throw error; // Re-throw to trigger error boundary
  };
}

// Higher-order component wrapper for easier usage
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>,
  componentName?: string,
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary 
      fallback={fallback}
      component={componentName || Component.displayName || Component.name}
    >
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName ?? Component.name})`;

  return WrappedComponent;
}

// Predefined error boundary wrappers for common use cases
export function AppErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      component="App"
      onError={(error, errorInfo) => {
        // Additional app-level error handling if needed
        console.error("Application-level error:", error.message);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

export function FormErrorBoundary({
  children,
  fallback,
  formName,
}: {
  children: ReactNode;
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
  formName?: string;
}) {
  return (
    <ErrorBoundary
      fallback={fallback}
      component={`Form_${formName || "Unknown"}`}
    >
      {children}
    </ErrorBoundary>
  );
}

export function MapErrorBoundary({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
}) {
  return (
    <ErrorBoundary
      fallback={fallback}
      component="Map"
    >
      {children}
    </ErrorBoundary>
  );
}

export function DataErrorBoundary({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
}) {
  return (
    <ErrorBoundary
      fallback={fallback}
      component="Data"
    >
      {children}
    </ErrorBoundary>
  );
}
