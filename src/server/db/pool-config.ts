import { URL } from "node:url";
import type postgres from "postgres";

export interface PoolConfigInput {
  databaseUrl: string;
  nodeEnv: "development" | "test" | "production";
  poolMax?: number;
  prepare?: boolean;
}

/**
 * Detects whether a PostgreSQL connection URL targets a transaction pooler
 * (PgBouncer, Supabase pooler, Neon pooler) where prepared statements must be disabled.
 */
export function isPooledDatabaseUrl(databaseUrl: string): boolean {
  try {
    // Normalize non-special postgres(ql):// scheme to http:// so WHATWG URL
    // reliably parses hostname, port, and searchParams across all JS runtimes.
    const normalized = databaseUrl.replace(/^postgres(?:ql)?:\/\//i, "http://");
    const parsed = new URL(normalized);
    const host = parsed.hostname.toLowerCase();
    const port = parsed.port;
    const pgbouncer = parsed.searchParams.get("pgbouncer");

    if (pgbouncer === "true" || pgbouncer === "1") {
      return true;
    }
    if (port === "6543") {
      return true;
    }
    if (host.includes("pooler") || host.includes("pgbouncer")) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Builds serverless-safe postgres.js client options.
 * - Keeps pool size conservative (`max: 3` in production, `5` in dev/test; overridable via DATABASE_POOL_MAX)
 * - Sets `idle_timeout` (20s), `connect_timeout` (10s), and `max_lifetime` (30m)
 * - Disables prepared statements (`prepare: false`) in production or behind poolers (overridable via DATABASE_PREPARE)
 */
export function buildPostgresOptions(
  input: PoolConfigInput,
): postgres.Options<Record<string, postgres.PostgresType>> {
  const isProd = input.nodeEnv === "production";
  const max = input.poolMax ?? (isProd ? 3 : 5);
  const prepare =
    input.prepare !== undefined
      ? input.prepare
      : !(isProd || isPooledDatabaseUrl(input.databaseUrl));

  return {
    max,
    idle_timeout: 20,
    connect_timeout: 10,
    max_lifetime: 60 * 30,
    prepare,
  };
}
