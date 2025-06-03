// lib/logging/trpc-middleware.ts
import { logger, logDbError } from "./logger";
import { reportError } from "./error-reporter";

interface TRPCError extends Error {
  code: string;
  cause?: unknown;
  data?: unknown;
}

export interface TRPCErrorContext {
  procedure: string;
  input?: unknown;
  userId?: string;
  type: 'query' | 'mutation' | 'subscription';
}

export function logTRPCError(
  error: TRPCError,
  context: TRPCErrorContext
): void {
  const isDatabase = error.code === "INTERNAL_SERVER_ERROR" &&
    (error.message.includes("database") || error.message.includes("SQL"));

  if (isDatabase) {
    logDbError(context.procedure, error, {
      component: "tRPC",
      action: context.procedure,
      userId: context.userId,
      metadata: {
        type: context.type,
        input: context.input ? JSON.stringify(context.input).substring(0, 1000) : undefined,
      },
    });
  } else {
    logger.error(`tRPC ${context.type} ${context.procedure} failed`, {
      component: "tRPC",
      action: context.procedure,
      userId: context.userId,
      metadata: {
        type: context.type,
        errorCode: error.code,
        input: context.input ? JSON.stringify(context.input).substring(0, 1000) : undefined,
      },
    }, error);
  }

  // Report to error tracking
  reportError(error, {
    component: "tRPC",
    action: context.procedure,
    userId: context.userId,
    metadata: {
      type: context.type,
      errorCode: error.code,
    },
  });
}

// Middleware function for tRPC
export const errorLoggingMiddleware = (opts: {
  procedure: string;
  type: 'query' | 'mutation' | 'subscription';
  input?: unknown;
  userId?: string;
}) => {
  return {
    onError: (error: TRPCError) => {
      logTRPCError(error, {
        procedure: opts.procedure,
        input: opts.input,
        userId: opts.userId,
        type: opts.type,
      });
    },
  };
};
