"use client";

import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { DefaultErrorFallback } from "./error-fallbacks";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
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
    // Log error details
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // Call optional error handler
    this.props.onError?.(error, errorInfo);

    // You can also log the error to an error reporting service here
    // Example: errorReportingService.captureException(error, { extra: errorInfo });
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

// Hook-based error boundary for functional components
export function useErrorHandler() {
  return (error: Error, errorInfo?: ErrorInfo) => {
    console.error("Error caught by error handler:", error, errorInfo);

    // TODO: In a real app I will
    // - Send error to monitoring service
    // - Show a toast notification
    // - Log to analytics

    throw error; // Re-throw to trigger error boundary
  };
}

// Higher-order component wrapper for easier usage
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>,
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName ?? Component.name})`;

  return WrappedComponent;
}

// Predefined error boundary wrappers for common use cases
// These components handle error logging internally to avoid server component issues

export function AppErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error("Application error:", error, errorInfo);
        // In production, send to error monitoring service
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

export function FormErrorBoundary({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
}) {
  return (
    <ErrorBoundary
      fallback={fallback}
      onError={(error, errorInfo) => {
        console.error("Form component error:", error, errorInfo);
        // Could send to error monitoring service with form-specific context
      }}
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
      onError={(error, errorInfo) => {
        console.error("Map component error:", error, errorInfo);
        // Could send specific map errors to monitoring service
      }}
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
      onError={(error, errorInfo) => {
        console.error("Data loading error:", error, errorInfo);
        // Could send specific data loading errors to monitoring service
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
