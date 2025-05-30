"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Bomb, Bug } from "lucide-react";

interface ErrorTestProps {
  shouldThrow?: boolean;
}

// Component that throws errors for testing
export function ErrorTestComponent({ shouldThrow = false }: ErrorTestProps) {
  if (shouldThrow) {
    throw new Error("Test error thrown by ErrorTestComponent!");
  }

  return (
    <div className="rounded border border-dashed border-muted-foreground/25 p-4">
      <p className="text-sm text-muted-foreground">
        This component is working normally. No errors thrown.
      </p>
    </div>
  );
}

// Interactive component to test error boundaries
export function ErrorBoundaryTest() {
  const [shouldThrowError, setShouldThrowError] = useState(false);
  const [asyncError, setAsyncError] = useState(false);

  const throwAsyncError = () => {
    // Simulate an async error (these won't be caught by error boundaries)
    setTimeout(() => {
      setAsyncError(true);
      throw new Error("Async error - this won't be caught by ErrorBoundary!");
    }, 100);
  };

  const throwRenderError = () => {
    // This will be caught by the error boundary
    setShouldThrowError(true);
  };

  if (asyncError) {
    throw new Error("State-triggered error for testing");
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="h-5 w-5" />
          Error Boundary Testing
        </CardTitle>
        <CardDescription>
          Test the error boundary functionality with different error types.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ErrorTestComponent shouldThrow={shouldThrowError} />

        <div className="space-y-2">
          <Button
            onClick={throwRenderError}
            variant="destructive"
            size="sm"
            className="flex items-center gap-2"
          >
            <Bomb className="h-4 w-4" />
            Throw Render Error
          </Button>

          <Button
            onClick={throwAsyncError}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Bomb className="h-4 w-4" />
            Throw Async Error
          </Button>

          {shouldThrowError && (
            <Button
              onClick={() => setShouldThrowError(false)}
              variant="secondary"
              size="sm"
            >
              Reset Error State
            </Button>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          <p>
            <strong>Render Error:</strong> Will be caught by ErrorBoundary
          </p>
          <p>
            <strong>Async Error:</strong> Won&apos;t be caught (see console)
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
