// server/db/index.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "~/env";
import * as schema from "./schema";
import { buildPostgresOptions } from "./pool-config";

/**
 * Cache the database connection in development. This avoids creating a new connection on every HMR
 * update.
 */
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

const conn =
  globalForDb.conn ??
  postgres(
    env.DATABASE_URL,
    buildPostgresOptions({
      databaseUrl: env.DATABASE_URL,
      nodeEnv: env.NODE_ENV,
      poolMax: env.DATABASE_POOL_MAX,
      prepare: env.DATABASE_PREPARE,
    }),
  );
if (env.NODE_ENV !== "production") globalForDb.conn = conn;

export const db = drizzle(conn, { schema });
