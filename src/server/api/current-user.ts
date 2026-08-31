// server/api/current-user.ts
import { eq, type InferSelectModel } from "drizzle-orm";

import { users } from "~/server/db/schema";
import type { db as dbType } from "~/server/db";

type UserRow = InferSelectModel<typeof users>;

/**
 * Per-request memo of user rows, created once by `createTRPCContext`.
 *
 * A single admin page load can trigger several procedures that each need the
 * caller's row - the page's own permission check plus a `requireAdmin` inside
 * every procedure it calls. Each is a ~100ms round-trip to Postgres, so
 * fetching the same row three times was most of the page's latency.
 *
 * Deliberately not React's `cache`: react@18 only exports that under the
 * react-server condition, so importing it here would break the tRPC HTTP
 * route that serves client-side calls.
 */
export type UserCache = Map<string, Promise<UserRow | undefined>>;

export const createUserCache = (): UserCache => new Map();

interface ContextWithUserCache {
  db: typeof dbType;
  /**
   * Optional so a context assembled without one (test callers, for instance)
   * still works - it simply queries every time, as this did before.
   */
  userCache?: UserCache;
}

/**
 * Load a user row, reusing the in-flight promise if this request already asked
 * for it. The cache lives on the request context and is never shared between
 * requests, so a role or ban change takes effect on the very next one.
 */
export function getUserById(
  ctx: ContextWithUserCache,
  userId: string,
): Promise<UserRow | undefined> {
  const cached = ctx.userCache?.get(userId);
  if (cached) return cached;

  const pending = ctx.db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  ctx.userCache?.set(userId, pending);
  return pending;
}
