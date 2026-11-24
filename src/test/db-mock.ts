// test/db-mock.ts
// Shared test infrastructure for mocking Drizzle ORM and tRPC context
import { vi } from "vitest";

/**
 * Creates a chainable mock for Drizzle's SQL builder API.
 * Each call to createMockDb() returns a fresh set of mocks.
 *
 * Supports:
 *   db.query.<table>.findFirst(opts)
 *   db.query.<table>.findMany(opts)
 *   db.insert(table).values(data).returning()
 *   db.update(table).set(data).where(cond).returning()
 *   db.delete(table).where(cond).returning()
 *   db.select().from(table).where(cond)
 */
export function createMockDb() {
  // Relational query mocks
  const queryMocks = {
    playgrounds: { findFirst: vi.fn(), findMany: vi.fn() },
    users: { findFirst: vi.fn(), findMany: vi.fn() },
    equipment: { findFirst: vi.fn(), findMany: vi.fn() },
    playgroundEditSuggestions: { findFirst: vi.fn(), findMany: vi.fn() },
    playgroundEquipment: { findFirst: vi.fn(), findMany: vi.fn() },
    playgroundEditSuggestionEquipment: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  };

  // Chainable builder mocks
  const returning = vi.fn().mockResolvedValue([]);
  const whereWithReturning = vi.fn(() => ({ returning }));
  const set = vi.fn(() => ({ where: whereWithReturning, returning }));
  const values = vi.fn(() => ({ returning }));
  const deleteWhere = vi.fn(() => ({ returning }));

  // Select chain: db.select().from(table).where(cond) and .where(cond).for("update")
  const selectFor = vi.fn().mockResolvedValue([]);
  const selectWhere = vi.fn(() => {
    const promise = Promise.resolve([]) as Promise<unknown[]> & {
      for: typeof selectFor;
    };
    promise.for = selectFor;
    return promise;
  });
  const from = vi.fn(() => ({ where: selectWhere }));
  const execute = vi.fn().mockResolvedValue([]);

  const db = {
    query: queryMocks,
    insert: vi.fn(() => ({ values })),
    update: vi.fn(() => ({ set })),
    delete: vi.fn(() => ({ where: deleteWhere })),
    select: vi.fn(() => ({ from })),
    execute,
    transaction: vi.fn(),
    // Expose inner mocks for fine-grained control in tests
    _mocks: {
      returning,
      values,
      set,
      whereWithReturning,
      deleteWhere,
      from,
      selectWhere,
      selectFor,
      execute,
    },
  };

  db.transaction.mockImplementation(
    async <T>(callback: (tx: typeof db) => Promise<T>): Promise<T> => {
      return await callback(db);
    },
  );

  return db;
}

export type MockDb = ReturnType<typeof createMockDb>;

// ---------- Context factories ----------

type Role = "user" | "admin" | "super_admin";

interface SessionUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: Role;
  isBanned: boolean;
}

interface MockSession {
  user: SessionUser;
  expires: string;
}

interface MockContext {
  db: MockDb;
  session: MockSession | null;
  headers: Headers;
}

export function createMockContext(
  overrides?: Partial<MockContext>,
): MockContext {
  return {
    db: createMockDb(),
    session: null,
    headers: new Headers(),
    ...overrides,
  };
}

/** Authenticated user (role=user by default) */
export function createUserContext(overrides?: {
  userId?: string;
  userName?: string;
  email?: string;
  role?: Role;
  isBanned?: boolean;
}) {
  const userId = overrides?.userId ?? "test-user-id";
  const db = createMockDb();
  return {
    db,
    session: {
      user: {
        id: userId,
        name: overrides?.userName ?? "Test User",
        email: overrides?.email ?? "user@test.com",
        image: null,
        role: overrides?.role ?? "user",
        isBanned: overrides?.isBanned ?? false,
      } as SessionUser,
      expires: new Date(Date.now() + 86400000).toISOString(),
    },
    headers: new Headers(),
  };
}

/** Unauthenticated context (no session) */
export function createUnauthenticatedContext() {
  return createMockContext({ session: null });
}

// ---------- Session configuration helpers ----------
// Role and ban state live on `ctx.session.user` (loaded by the database session callback),
// so protectedProcedure and role checks no longer query the users table.

type ContextWithSession = { session: { user: SessionUser } | null };

function setSessionUser(ctx: ContextWithSession, patch: Partial<SessionUser>) {
  if (!ctx.session) throw new Error("configureMockUser* requires an authenticated context");
  Object.assign(ctx.session.user, patch);
}

/** Admin role → protectedProcedure and admin checks pass */
export function configureMockUserAsAdmin(ctx: ContextWithSession) {
  setSessionUser(ctx, { role: "admin", isBanned: false });
}

/** Super admin role */
export function configureMockUserAsSuperAdmin(ctx: ContextWithSession) {
  setSessionUser(ctx, { role: "super_admin", isBanned: false });
}

/** Regular user → protectedProcedure passes */
export function configureMockUserAsRegularUser(ctx: ContextWithSession) {
  setSessionUser(ctx, { role: "user", isBanned: false });
}

/** Regular user hitting an admin route → admin check fails with FORBIDDEN */
export function configureMockUserAsRegularUserForAdminRoute(
  ctx: ContextWithSession,
) {
  setSessionUser(ctx, { role: "user", isBanned: false });
}

/** Banned user → protectedProcedure throws FORBIDDEN */
export function configureMockUserAsBanned(ctx: ContextWithSession) {
  setSessionUser(ctx, { isBanned: true });
}
