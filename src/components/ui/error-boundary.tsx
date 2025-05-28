"use client";

import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "./button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./card";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Default error fallback component
function DefaultErrorFallback({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <Card className="mx-auto w-full max-w-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Something went wrong
        </CardTitle>
        <CardDescription>
          An unexpected error occurred. Please try refreshing the page or
          contact support if the problem persists.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {process.env.NODE_ENV === "development" && (
          <details className="rounded border p-2 text-sm">
            <summary className="cursor-pointer font-medium">
              Error Details
            </summary>
            <pre className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">
              {error.message}
              {error.stack && (
                <>
                  {"\n\n"}
                  {error.stack}
                </>
              )}
            </pre>
          </details>
        )}
        <div className="flex gap-2">
          <Button
            onClick={reset}
            variant="default"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
          <Button onClick={() => window.location.reload()} variant="outline">
            Reload Page
          </Button>
        </div>
      </CardContent>
    </Card>
  );
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

    // In a real app, you might want to:
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
