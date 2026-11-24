import {
  defaultShouldDehydrateQuery,
  QueryClient,
} from "@tanstack/react-query";
import SuperJSON from "superjson";

const isDev = process.env.NODE_ENV === "development";

/**
 * Public, read-heavy catalog queries that change rarely. Mutations still call
 * `utils.<proc>.invalidate()`, which refetches regardless of staleTime.
 * Keys are tRPC procedure paths; React Query partially matches them against
 * `[[...path], { input, type }]`.
 */
const CATALOG_QUERY_PATHS = [
  ["playground", "getAll"],
  ["playground", "getSummaries"],
  ["playground", "getNearby"],
  ["playground", "getById"],
  ["equipment", "getAll"],
  ["equipment", "getCatalog"],
  ["equipment", "getByCategory"],
  ["equipment", "getById"],
] as const;

const CATALOG_STALE_TIME_MS = 5 * 60 * 1000;

export const createQueryClient = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // In production, avoid refetching immediately after SSR hydration.
        // In development, always refetch for fresh data.
        staleTime: isDev ? 0 : 30 * 1000,
      },
      dehydrate: {
        serializeData: SuperJSON.serialize,
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
      },
      hydrate: {
        deserializeData: SuperJSON.deserialize,
      },
    },
  });

  if (!isDev) {
    for (const path of CATALOG_QUERY_PATHS) {
      queryClient.setQueryDefaults([path], {
        staleTime: CATALOG_STALE_TIME_MS,
      });
    }
  }

  return queryClient;
};
