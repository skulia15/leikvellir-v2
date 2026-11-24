import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest } from "next/server";

import { logger } from "~/lib/logging/logger";
import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a HTTP request (e.g. when you make requests from Client Components).
 */
const createContext = async (req: NextRequest) => {
  return createTRPCContext({
    headers: req.headers,
  });
};

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext(req),
    onError: ({ path, error, type, ctx }) => {
      const procedurePath = path ?? "<no-path>";

      logger.error(
        `tRPC ${type} failed on ${procedurePath}: ${error.message}`,
        {
          component: "tRPC",
          action: procedurePath,
          userId: ctx?.session?.user?.id,
          metadata: {
            type,
            path: procedurePath,
            code: error.code,
            cause:
              error.cause instanceof Error
                ? {
                    name: error.cause.name,
                    message: error.cause.message,
                  }
                : undefined,
          },
        },
        error,
      );
    },
  });

export { handler as GET, handler as POST };
