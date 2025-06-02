// lib/logging/trpc-middleware.ts
import { type ProcedureType } from "@trpc/server";
import { type TRPC_ERROR_CODE_KEY } from "@trpc/server/rpc";
import { logger, logDbError } from "./logger";
import { reportError } from "./error-reporter";

export interface TRPCErrorContext {
  procedure: string;
  input?: any;
  userId?: string;
  type: ProcedureType;
}

export function logTRPCError(
  error: any,
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
        input: JSON.stringify(context.input).substring(0, 1000),
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
        input: JSON.stringify(context.input).substring(0, 1000),
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
  type: ProcedureType;
  input?: any;
  userId?: string;
}) => {
  return {
    onError: (error: any) => {
      logTRPCError(error, {
        procedure: opts.procedure,
        input: opts.input,
        userId: opts.userId,
        type: opts.type,
      });
    },
  };
};
