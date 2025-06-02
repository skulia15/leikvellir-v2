# Comprehensive Error Logging System

This documentation explains the comprehensive error logging system implemented in your Leikvellir application.

## Overview

The error logging system provides:

- Centralized logging with different log levels
- Automatic error tracking and reporting
- React error boundaries with enhanced logging
- API and database error monitoring
- Client-side error capture
- Performance monitoring
- Development error dashboard

## Components

### 1. Logger (`~/lib/logging/logger.ts`)

The central logging utility with methods for different log levels:

```typescript
import { logger } from "~/lib/logging";

// Different log levels
logger.debug("Debug message", { component: "MyComponent" });
logger.info("Info message", { component: "MyComponent" });
logger.warn("Warning message", { component: "MyComponent" }, error);
logger.error("Error message", { component: "MyComponent" }, error);
logger.fatal("Fatal error", { component: "MyComponent" }, error);

// Specialized logging
logger.userAction("button_click", { component: "MyComponent" });
logger.performance("page_load", 1500, { component: "MyComponent" });
logger.security("unauthorized_access", { component: "MyComponent" });
```

### 2. Error Reporter (`~/lib/logging/error-reporter.ts`)

Handles error reporting and tracking:

```typescript
import {
  reportError,
  reportApiError,
  reportLocationError,
} from "~/lib/logging";

// Generic error reporting
reportError(new Error("Something went wrong"), {
  component: "MyComponent",
  action: "user_action",
});

// Specific error types
reportApiError("/api/playgrounds", "POST", error, 500, responseData);
reportLocationError(error, "get_user_location");
```

### 3. Enhanced Error Boundaries

Wrap components with error boundaries for better error tracking:

```typescript
import { FormErrorBoundary, MapErrorBoundary, withErrorBoundary } from "~/components/ui/error-boundary";

// Predefined error boundaries
<FormErrorBoundary formName="playground-creation">
  <PlaygroundForm />
</FormErrorBoundary>

<MapErrorBoundary>
  <GoogleMap />
</MapErrorBoundary>

// HOC wrapper
const MyComponentWithErrorBoundary = withErrorBoundary(
  MyComponent,
  CustomErrorFallback,
  "MyComponent"
);
```

### 4. Error Provider

Global error tracking and performance monitoring:

```typescript
import { useErrorReporting } from "~/app/_components/error-provider";

function MyComponent() {
  const { reportError } = useErrorReporting();

  const handleError = (error: Error) => {
    reportError(error, {
      component: "MyComponent",
      action: "handle_user_input",
    });
  };
}
```

## Usage Examples

### 1. Component Error Handling

```typescript
"use client";

import { useEffect } from "react";
import { logger, reportError } from "~/lib/logging";
import { FormErrorBoundary } from "~/components/ui/error-boundary";

function PlaygroundForm() {
  useEffect(() => {
    logger.info("Playground form mounted", {
      component: "PlaygroundForm",
      action: "mount",
    });
  }, []);

  const handleSubmit = async (data: FormData) => {
    try {
      logger.userAction("form_submit", {
        component: "PlaygroundForm",
        metadata: { hasImages: data.images?.length > 0 },
      });

      const result = await createPlayground(data);

      logger.info("Playground created successfully", {
        component: "PlaygroundForm",
        action: "create_success",
        metadata: { playgroundId: result.id },
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      reportError(err, {
        component: "PlaygroundForm",
        action: "create_playground",
        metadata: { formData: data },
      });
      throw err; // Re-throw to trigger error boundary
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* form content */}
    </form>
  );
}

// Wrap with error boundary
export default function PlaygroundFormPage() {
  return (
    <FormErrorBoundary formName="playground-creation">
      <PlaygroundForm />
    </FormErrorBoundary>
  );
}
```

### 2. API Route Error Handling

```typescript
// app/api/example/route.ts
import { NextResponse } from "next/server";
import { logger, logApiError, logDbError } from "~/lib/logging";

export async function POST(request: Request) {
  try {
    logger.info("API request started", {
      component: "ExampleAPI",
      action: "post_request",
    });

    const data = await request.json();

    // Database operation with error handling
    try {
      const result = await db.insert(table).values(data);

      logger.info("Database operation successful", {
        component: "ExampleAPI",
        action: "db_insert",
        metadata: { recordId: result.id },
      });

      return NextResponse.json({ success: true, data: result });
    } catch (dbError) {
      const error =
        dbError instanceof Error ? dbError : new Error(String(dbError));
      logDbError("example_insert", error, {
        component: "ExampleAPI",
        action: "post_request",
      });
      throw error;
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logApiError("/api/example", "POST", err, {
      component: "ExampleAPI",
    });

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
```

### 3. tRPC Procedure Error Handling

```typescript
// server/api/routers/example.ts
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { logger, logDbError } from "~/lib/logging";

export const exampleRouter = createTRPCRouter({
  create: protectedProcedure
    .input(ExampleSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      logger.info("Creating example", {
        component: "ExampleRouter",
        action: "create_example",
        userId,
        metadata: { inputType: typeof input },
      });

      try {
        const result = await ctx.db
          .insert(examples)
          .values({
            ...input,
            createdById: userId,
          })
          .returning();

        if (!result[0]) {
          const error = new Error(
            "Failed to create example - no record returned",
          );
          logDbError("example_insert", error, {
            component: "ExampleRouter",
            action: "create_example",
            userId,
          });
          throw error;
        }

        logger.info("Example created successfully", {
          component: "ExampleRouter",
          action: "create_example_success",
          userId,
          metadata: { exampleId: result[0].id },
        });

        return result[0];
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logDbError("example_creation", err, {
          component: "ExampleRouter",
          action: "create_example",
          userId,
        });
        throw err;
      }
    }),
});
```

### 4. Custom Hook Error Handling

```typescript
// lib/hooks/use-example.ts
import { useState, useCallback } from "react";
import { logger, reportError } from "~/lib/logging";

export function useExample() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    logger.debug("Fetching example data", {
      component: "useExample",
      action: "fetch_data",
    });

    try {
      const response = await fetch("/api/example");

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      setData(result);

      logger.info("Example data fetched successfully", {
        component: "useExample",
        action: "fetch_success",
        metadata: { dataLength: result?.length },
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      const errorMessage = error.message;

      setError(errorMessage);

      logger.error(
        "Failed to fetch example data",
        {
          component: "useExample",
          action: "fetch_error",
        },
        error,
      );

      reportError(error, {
        component: "useExample",
        action: "fetch_data",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { data, isLoading, error, fetchData };
}
```

## Development Features

### Error Dashboard

In development mode, you'll see an error dashboard in the bottom-right corner that shows:

- Total error count
- Error rate per minute
- Top error-producing components
- Recent error details
- Actions to clear or inspect errors

### Console Logging

In development, all logs are output to the console with structured formatting:

- Timestamps
- Log levels
- Component names
- Context information
- Stack traces for errors

## Production Considerations

### External Logging Services

To integrate with external logging services (Sentry, DataDog, etc.), modify the `logToExternalService` method in `logger.ts`:

```typescript
private async logToExternalService(entry: LogEntry): Promise<void> {
  if (!this.shouldLog(entry.level)) return;

  // Example: Sentry integration
  if (entry.level === "error" || entry.level === "fatal") {
    Sentry.captureException(entry.error, {
      tags: {
        component: entry.context?.component,
        action: entry.context?.action,
      },
      extra: entry.context?.metadata,
    });
  }

  // Example: DataDog integration
  DD_LOGS.logger.log(entry.level, entry.message, entry.context);
}
```

### Performance Impact

The logging system is designed to be lightweight:

- Logs only warnings and errors in production
- Async external logging doesn't block operations
- Memory-efficient error queue with size limits
- Minimal performance monitoring overhead

## Best Practices

1. **Always include context**: Provide component name and action
2. **Use appropriate log levels**: Debug for development, error for issues
3. **Don't log sensitive data**: Sanitize user input and credentials
4. **Wrap critical components**: Use error boundaries for key features
5. **Monitor performance**: Log slow operations and high memory usage
6. **Handle async errors**: Use proper error handling in promises
7. **Test error scenarios**: Ensure error logging works in edge cases

This comprehensive error logging system will help you:

- Debug issues faster in development
- Monitor application health in production
- Track user experience problems
- Identify performance bottlenecks
- Maintain high code quality
