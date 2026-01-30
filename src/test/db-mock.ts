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

  // Select chain: db.select().from(table).where(cond)
  const selectWhere = vi.fn().mockResolvedValue([]);
  const from = vi.fn(() => ({ where: selectWhere }));

  const db = {
    query: queryMocks,
    insert: vi.fn(() => ({ values })),
    update: vi.fn(() => ({ set })),
    delete: vi.fn(() => ({ where: deleteWhere })),
    select: vi.fn(() => ({ from })),
    // Expose inner mocks for fine-grained control in tests
    _mocks: {
      returning,
      values,
      set,
      whereWithReturning,
      deleteWhere,
      from,
      selectWhere,
    },
  };

  return db;
}

export type MockDb = ReturnType<typeof createMockDb>;

// ---------- Context factories ----------

interface SessionUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
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
      },
      expires: new Date(Date.now() + 86400000).toISOString(),
    },
    headers: new Headers(),
  };
}

/** Unauthenticated context (no session) */
export function createUnauthenticatedContext() {
  return createMockContext({ session: null });
}

// ---------- DB mock configuration helpers ----------
// These handle the sequential db.query.users.findFirst calls:
//   1. protectedProcedure middleware → checks { isBanned }
//   2. requireAdmin / inline role check → checks full user object

/** Configure mock so protectedProcedure passes and requireAdmin passes (admin role) */
export function configureMockUserAsAdmin(db: MockDb, userId = "test-user-id") {
  db.query.users.findFirst
    .mockResolvedValueOnce({ isBanned: false }) // protectedProcedure ban check
    .mockResolvedValueOnce({
      id: userId,
      role: "admin",
      isBanned: false,
      name: "Admin User",
      email: "admin@test.com",
    }); // requireAdmin / inline role check
}

/** Configure mock so protectedProcedure passes and requireAdmin passes (super_admin role) */
export function configureMockUserAsSuperAdmin(
  db: MockDb,
  userId = "test-user-id",
) {
  db.query.users.findFirst
    .mockResolvedValueOnce({ isBanned: false }) // protectedProcedure ban check
    .mockResolvedValueOnce({
      id: userId,
      role: "super_admin",
      isBanned: false,
      name: "Super Admin",
      email: "superadmin@test.com",
    }); // requireAdmin / inline role check
}

/** Configure mock so protectedProcedure passes (regular user, no admin check) */
export function configureMockUserAsRegularUser(db: MockDb) {
  db.query.users.findFirst.mockResolvedValueOnce({ isBanned: false }); // protectedProcedure ban check only
}

/** Configure mock so protectedProcedure passes, but requireAdmin/inline check fails (regular user role) */
export function configureMockUserAsRegularUserForAdminRoute(
  db: MockDb,
  userId = "test-user-id",
) {
  db.query.users.findFirst
    .mockResolvedValueOnce({ isBanned: false }) // protectedProcedure ban check
    .mockResolvedValueOnce({
      id: userId,
      role: "user",
      isBanned: false,
      name: "Regular User",
      email: "user@test.com",
    }); // requireAdmin / inline role check → will fail
}

/** Configure mock so protectedProcedure throws FORBIDDEN (banned user) */
export function configureMockUserAsBanned(db: MockDb) {
  db.query.users.findFirst.mockResolvedValueOnce({ isBanned: true }); // protectedProcedure ban check → throws
}
