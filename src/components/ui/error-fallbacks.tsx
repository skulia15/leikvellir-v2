"use client";

import { AlertCircle, ArrowLeft, MapPin, RefreshCw } from "lucide-react";
import { Button } from "./button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./card";
import Link from "next/link";

// Generic error fallback component
export function DefaultErrorFallback({
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
          <AlertCircle className="h-5 w-5" />
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

// Form-specific error fallback
export function FormErrorFallback({
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
          <AlertCircle className="h-5 w-5" />
          Form Error
        </CardTitle>
        <CardDescription>
          There was an issue with the form. This might be due to a validation
          error or connection issue.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {error.message ||
            "An unexpected error occurred while loading the form."}
        </p>
        <div className="flex gap-2">
          <Button onClick={reset} variant="default">
            Try Again
          </Button>
          <Button asChild variant="outline">
            <Link href="/" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Map
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Map-specific error fallback
export function MapErrorFallback({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="flex h-[calc(100vh-5rem)] items-center justify-center bg-muted/20">
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <MapPin className="h-5 w-5" />
            Map Loading Error
          </CardTitle>
          <CardDescription>
            Unable to load the map. This might be due to a network issue or
            Google Maps API problem.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {error.message || "Failed to initialize the map component."}
          </p>
          <Button onClick={reset} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Retry Map
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Data loading error fallback
export function DataErrorFallback({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Data Loading Error
          </CardTitle>
          <CardDescription>
            Unable to load the data. This might be a database connection issue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {error.message || "Failed to fetch data."}
          </p>
          <Button
            onClick={reset}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Retry Loading
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
