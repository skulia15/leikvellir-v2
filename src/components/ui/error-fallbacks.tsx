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
import { useT } from "~/lib/i18n";

// Generic error fallback component
export function DefaultErrorFallback({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const t = useT();

  return (
    <Card className="mx-auto w-full max-w-lg mt-20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          {t('errors.somethingWentWrong')}
        </CardTitle>
        <CardDescription>
          {t('errors.unexpectedError')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {process.env.NODE_ENV === "development" && (
          <details className="rounded border p-2 text-sm">
            <summary className="cursor-pointer font-medium">
              {t('errors.errorDetails')}
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
            {t('errors.tryAgain')}
          </Button>
          <Button onClick={() => window.location.reload()} variant="outline">
            {t('errors.reloadPage')}
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
  const t = useT();

  return (
    <Card className="mx-auto w-full max-w-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          {t('errors.formError')}
        </CardTitle>
        <CardDescription>
          {t('errors.formErrorDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {error.message ||
            "An unexpected error occurred while loading the form."}
        </p>
        <div className="flex gap-2">
          <Button onClick={reset} variant="default">
            {t('errors.tryAgain')}
          </Button>
          <Button asChild variant="outline">
            <Link href="/" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t('errors.backToMap')}
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
  const t = useT();

  return (
    <div className="flex h-[calc(100vh-5rem)] items-center justify-center bg-muted/20">
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <MapPin className="h-5 w-5" />
            {t('errors.mapLoadingError')}
          </CardTitle>
          <CardDescription>
            {t('errors.mapErrorDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {error.message || "Failed to initialize the map component."}
          </p>
          <Button onClick={reset} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            {t('errors.retryMap')}
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
  const t = useT();

  return (
    <div className="p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            {t('errors.dataLoadingError')}
          </CardTitle>
          <CardDescription>
            {t('errors.dataErrorDescription')}
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
            {t('errors.retryLoading')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
