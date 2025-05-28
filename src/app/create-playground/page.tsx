//app/create-playground/page.tsx

import { getServerAuthSession } from "~/server/auth";
import { ErrorBoundary } from "~/components/ui/error-boundary";
import { CreatePlaygroundForm } from "../_components/create-playground-form";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import Link from "next/link";

// Custom error fallback for the form
function FormErrorFallback({
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
          There was an issue with the playground form. This might be due to a
          validation error or connection issue.
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
            <Link href="/home" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Map
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function CreatePlayground() {
  const session = await getServerAuthSession();

  return (
    <div
      className="flex flex-col items-center justify-center gap-12 pt-12"
      id="create-playground"
    >
      <h1 className="text-3xl font-bold">Create Playground</h1>
      {session?.user ? (
        <ErrorBoundary
          fallback={FormErrorFallback}
          onError={(error, errorInfo) => {
            console.error("CreatePlaygroundForm error:", error, errorInfo);
            // Could send to error monitoring service with form-specific context
          }}
        >
          <CreatePlaygroundForm />
        </ErrorBoundary>
      ) : (
        <Card className="mx-auto w-full max-w-lg">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>
              Please sign in to create a new playground.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/api/auth/signin">Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
