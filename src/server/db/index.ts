// server/db/index.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "~/env";
import * as schema from "./schema";
import { buildPostgresOptions } from "./pool-config";

type Database = ReturnType<typeof drizzle<typeof schema>>;

function createConnection(): postgres.Sql {
  return postgres(
    env.DATABASE_URL,
    buildPostgresOptions({
      databaseUrl: env.DATABASE_URL,
      nodeEnv: env.NODE_ENV,
      poolMax: env.DATABASE_POOL_MAX,
      prepare: env.DATABASE_PREPARE,
    }),
  );
}

/**
 * Cache the database connection in development. This avoids creating a new connection on every HMR
 * update.
 */
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

// postgres.js connects lazily, so this costs nothing until the first query.
const conn = globalForDb.conn ?? createConnection();
if (env.NODE_ENV !== "production") globalForDb.conn = conn;

const sharedDb: Database = drizzle(conn, { schema });

/**
 * On Cloudflare Workers a socket opened while handling one request cannot be
 * used by another ("Cannot perform I/O on behalf of a different request"), so a
 * module-level pool fails or hangs once a second request reuses it. There, each
 * request gets its own client, keyed by the request's ExecutionContext.
 *
 * OpenNext exposes the per-request context (backed by AsyncLocalStorage) on this
 * global symbol; it is undefined under Node (`next dev`, tests, scripts), which
 * keep using the shared pool above.
 */
const CLOUDFLARE_CONTEXT = Symbol.for("__cloudflare-context__");
const requestDbs = new WeakMap<object, Database>();

function currentRequestContext(): object | undefined {
  const cfContext = (globalThis as Record<symbol, { ctx?: object } | undefined>)[
    CLOUDFLARE_CONTEXT
  ];
  return cfContext?.ctx;
}

function resolveDb(): Database {
  const requestCtx = currentRequestContext();
  if (!requestCtx) return sharedDb;

  let requestDb = requestDbs.get(requestCtx);
  if (!requestDb) {
    requestDb = drizzle(createConnection(), { schema });
    requestDbs.set(requestCtx, requestDb);
  }
  return requestDb;
}

/**
 * Proxies to the right client for the current runtime. The shared instance is
 * the proxy target so identity checks done at module load (e.g. the Auth.js
 * Drizzle adapter's `is(db, PgDatabase)`) still see a real PgDatabase.
 */
export const db: Database = new Proxy(sharedDb, {
  get(_target, prop) {
    const target = resolveDb();
    const value = Reflect.get(target, prop, target) as unknown;
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(target) : value;
  },
});
