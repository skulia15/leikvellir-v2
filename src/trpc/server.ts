import "server-only";

import { createHydrationHelpers } from "@trpc/react-query/rsc";
import { headers } from "next/headers";
import { cache } from "react";

import { createCaller, type AppRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";
import { createQueryClient } from "./query-client";

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a tRPC call from a React Server Component.
 *
 * Reading `headers()` and the session opts the route into dynamic rendering, so only use `api` on
 * routes that need request-scoped auth (admin, my-submissions, ...). Public pages use `publicApi`.
 */
const createContext = cache(async () => {
  const headersList = await headers();
  // Convert ReadonlyHeaders to a plain object for Headers constructor
  const headerEntries = Array.from(headersList.entries());
  const heads = new Headers();

  // Add each header manually
  for (const [key, value] of headerEntries) {
    heads.set(key, value);
  }

  heads.set("x-trpc-source", "rsc");

  return createTRPCContext({
    headers: heads,
  });
});

/**
 * Request-independent context for public, read-only procedures. Never touches `headers()`,
 * cookies or the session, so pages using it stay eligible for static generation / ISR.
 * Protected procedures called through it throw UNAUTHORIZED.
 */
const createPublicContext = cache(() =>
  createTRPCContext({
    headers: new Headers({ "x-trpc-source": "rsc-static" }),
    session: null,
  }),
);

const getQueryClient = cache(createQueryClient);
const caller = createCaller(createContext);
const publicCaller = createCaller(createPublicContext);

export const { trpc: api, HydrateClient } = createHydrationHelpers<AppRouter>(
  caller,
  getQueryClient,
);

// Shares `getQueryClient`, so `HydrateClient` dehydrates prefetches from either caller.
export const { trpc: publicApi } = createHydrationHelpers<AppRouter>(
  publicCaller,
  getQueryClient,
);
