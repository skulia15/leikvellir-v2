// __tests__/api/users.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { appRouter } from "~/server/api/root";
import { createCallerFactory } from "~/server/api/trpc";
import {
  createUserContext,
  createUnauthenticatedContext,
  configureMockUserAsRegularUser,
  configureMockUserAsBanned,
  type MockDb,
} from "~/test/db-mock";

vi.mock("~/server/db", () => ({
  db: {},
}));
vi.mock("~/server/auth", () => ({
  getServerAuthSession: vi.fn(),
}));
vi.mock("~/lib/logging/logger", () => ({
  logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
  logDbError: vi.fn(),
}));
vi.mock("~/lib/logging", () => ({
  reportUploadError: vi.fn(),
  logApiError: vi.fn(),
}));
vi.mock("~/lib/file-cleanup", () => ({
  deleteOrphanedFiles: vi.fn().mockResolvedValue(undefined),
}));

const createCaller = createCallerFactory(appRouter);

// Helper to create a mock user record
function mockUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "test-user-id",
    name: "Test User",
    email: "user@test.com",
    role: "user" as const,
    isBanned: false,
    bannedAt: null,
    bannedById: null,
    banReason: null,
    image: null,
    emailVerified: null,
    ...overrides,
  };
}

describe("Users tRPC Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── getCurrentUser ──────────────────────────────
  describe("getCurrentUser", () => {
    it("should return current user for authenticated user", async () => {
      const user = mockUser();
      const ctx = createUserContext();
      // protectedProcedure ban check
      configureMockUserAsRegularUser(ctx.db);
      // getCurrentUser queries the full user
      ctx.db.query.users.findFirst.mockResolvedValueOnce(user);

      const caller = createCaller(ctx as any);
      const result = await caller.users.getCurrentUser();
      expect(result).toEqual(user);
    });

    it("should throw NOT_FOUND if user not in database", async () => {
      const ctx = createUserContext();
      configureMockUserAsRegularUser(ctx.db);
      ctx.db.query.users.findFirst.mockResolvedValueOnce(null);

      const caller = createCaller(ctx as any);
      await expect(caller.users.getCurrentUser()).rejects.toThrow(TRPCError);
    });

    it("should throw UNAUTHORIZED for unauthenticated request", async () => {
      const ctx = createUnauthenticatedContext();
      const caller = createCaller(ctx as any);
      await expect(caller.users.getCurrentUser()).rejects.toThrow(TRPCError);
    });

    it("should throw FORBIDDEN for banned user", async () => {
      const ctx = createUserContext();
      configureMockUserAsBanned(ctx.db);

      const caller = createCaller(ctx as any);
      await expect(caller.users.getCurrentUser()).rejects.toThrow(TRPCError);
    });
  });

  // ── getAll (super_admin only) ───────────────────
  describe("getAll", () => {
    it("should return all users for super admin", async () => {
      const users = [mockUser({ id: "1", role: "super_admin" }), mockUser({ id: "2" })];
      const ctx = createUserContext();
      // protectedProcedure ban check
      ctx.db.query.users.findFirst.mockResolvedValueOnce({ isBanned: false });
      // getAll queries current user for super_admin check
      ctx.db.query.users.findFirst.mockResolvedValueOnce(
        mockUser({ id: "test-user-id", role: "super_admin" }),
      );
      // getAll queries all users
      ctx.db.query.users.findMany.mockResolvedValueOnce(users);

      const caller = createCaller(ctx as any);
      const result = await caller.users.getAll();
      expect(result).toEqual(users);
    });

    it("should throw FORBIDDEN for regular admin", async () => {
      const ctx = createUserContext();
      ctx.db.query.users.findFirst.mockResolvedValueOnce({ isBanned: false });
      ctx.db.query.users.findFirst.mockResolvedValueOnce(
        mockUser({ role: "admin" }),
      );

      const caller = createCaller(ctx as any);
      await expect(caller.users.getAll()).rejects.toThrow(TRPCError);
    });

    it("should throw FORBIDDEN for regular user", async () => {
      const ctx = createUserContext();
      ctx.db.query.users.findFirst.mockResolvedValueOnce({ isBanned: false });
      ctx.db.query.users.findFirst.mockResolvedValueOnce(
        mockUser({ role: "user" }),
      );

      const caller = createCaller(ctx as any);
      await expect(caller.users.getAll()).rejects.toThrow(TRPCError);
    });

    it("should throw UNAUTHORIZED for unauthenticated request", async () => {
      const ctx = createUnauthenticatedContext();
      const caller = createCaller(ctx as any);
      await expect(caller.users.getAll()).rejects.toThrow(TRPCError);
    });
  });

  // ── updateRole (super_admin only) ───────────────
  describe("updateRole", () => {
    it("should update user role successfully", async () => {
      const updatedUser = mockUser({ id: "target-user", role: "admin" });
      const ctx = createUserContext();
      ctx.db.query.users.findFirst.mockResolvedValueOnce({ isBanned: false });
      ctx.db.query.users.findFirst.mockResolvedValueOnce(
        mockUser({ role: "super_admin" }),
      );
      ctx.db._mocks.returning.mockResolvedValueOnce([updatedUser]);

      const caller = createCaller(ctx as any);
      const result = await caller.users.updateRole({
        userId: "target-user",
        role: "admin",
      });
      expect(result).toEqual(updatedUser);
    });

    it("should throw FORBIDDEN for non-super-admin", async () => {
      const ctx = createUserContext();
      ctx.db.query.users.findFirst.mockResolvedValueOnce({ isBanned: false });
      ctx.db.query.users.findFirst.mockResolvedValueOnce(
        mockUser({ role: "admin" }),
      );

      const caller = createCaller(ctx as any);
      await expect(
        caller.users.updateRole({ userId: "target", role: "admin" }),
      ).rejects.toThrow(TRPCError);
    });

    it("should prevent demoting the last super admin", async () => {
      const ctx = createUserContext();
      ctx.db.query.users.findFirst.mockResolvedValueOnce({ isBanned: false });
      ctx.db.query.users.findFirst.mockResolvedValueOnce(
        mockUser({ role: "super_admin" }),
      );
      // db.select().from(users).where(...) returns only 1 super_admin
      ctx.db._mocks.selectWhere.mockResolvedValueOnce([
        mockUser({ role: "super_admin" }),
      ]);

      const caller = createCaller(ctx as any);
      await expect(
        caller.users.updateRole({ userId: "test-user-id", role: "user" }),
      ).rejects.toThrow("Cannot demote the last super admin");
    });

    it("should allow demoting super_admin when other super_admins exist", async () => {
      const demotedUser = mockUser({ id: "test-user-id", role: "admin" });
      const ctx = createUserContext();
      ctx.db.query.users.findFirst.mockResolvedValueOnce({ isBanned: false });
      ctx.db.query.users.findFirst.mockResolvedValueOnce(
        mockUser({ role: "super_admin" }),
      );
      // Two super admins exist
      ctx.db._mocks.selectWhere.mockResolvedValueOnce([
        mockUser({ id: "1", role: "super_admin" }),
        mockUser({ id: "2", role: "super_admin" }),
      ]);
      ctx.db._mocks.returning.mockResolvedValueOnce([demotedUser]);

      const caller = createCaller(ctx as any);
      const result = await caller.users.updateRole({
        userId: "test-user-id",
        role: "admin",
      });
      expect(result).toEqual(demotedUser);
    });

    it("should throw NOT_FOUND for non-existent target user", async () => {
      const ctx = createUserContext();
      ctx.db.query.users.findFirst.mockResolvedValueOnce({ isBanned: false });
      ctx.db.query.users.findFirst.mockResolvedValueOnce(
        mockUser({ role: "super_admin" }),
      );
      ctx.db._mocks.returning.mockResolvedValueOnce([]); // no user returned

      const caller = createCaller(ctx as any);
      await expect(
        caller.users.updateRole({ userId: "nonexistent", role: "admin" }),
      ).rejects.toThrow(TRPCError);
    });
  });

  // ── banUser (admin/super_admin) ─────────────────
  describe("banUser", () => {
    it("should ban a regular user as admin", async () => {
      const targetUser = mockUser({ id: "target", role: "user" });
      const bannedUser = { ...targetUser, isBanned: true };
      const ctx = createUserContext();
      ctx.db.query.users.findFirst.mockResolvedValueOnce({ isBanned: false });
      ctx.db.query.users.findFirst.mockResolvedValueOnce(
        mockUser({ role: "admin" }),
      );
      ctx.db.query.users.findFirst.mockResolvedValueOnce(targetUser);
      ctx.db._mocks.returning.mockResolvedValueOnce([bannedUser]);

      const caller = createCaller(ctx as any);
      const result = await caller.users.banUser({
        userId: "target",
        reason: "Spam",
      });
      expect(result?.isBanned).toBe(true);
    });

    it("should ban a regular user as super admin", async () => {
      const targetUser = mockUser({ id: "target", role: "user" });
      const bannedUser = { ...targetUser, isBanned: true };
      const ctx = createUserContext();
      ctx.db.query.users.findFirst.mockResolvedValueOnce({ isBanned: false });
      ctx.db.query.users.findFirst.mockResolvedValueOnce(
        mockUser({ role: "super_admin" }),
      );
      ctx.db.query.users.findFirst.mockResolvedValueOnce(targetUser);
      ctx.db._mocks.returning.mockResolvedValueOnce([bannedUser]);

      const caller = createCaller(ctx as any);
      const result = await caller.users.banUser({
        userId: "target",
        reason: "Spam",
      });
      expect(result?.isBanned).toBe(true);
    });

    it("should prevent self-banning", async () => {
      const ctx = createUserContext();
      ctx.db.query.users.findFirst.mockResolvedValueOnce({ isBanned: false });
      ctx.db.query.users.findFirst.mockResolvedValueOnce(
        mockUser({ role: "admin" }),
      );
      ctx.db.query.users.findFirst.mockResolvedValueOnce(
        mockUser({ id: "test-user-id" }),
      );

      const caller = createCaller(ctx as any);
      await expect(
        caller.users.banUser({ userId: "test-user-id", reason: "Test" }),
      ).rejects.toThrow("Cannot ban yourself");
    });

    it("should prevent admin from banning another admin", async () => {
      const ctx = createUserContext();
      ctx.db.query.users.findFirst.mockResolvedValueOnce({ isBanned: false });
      ctx.db.query.users.findFirst.mockResolvedValueOnce(
        mockUser({ role: "admin" }),
      );
      ctx.db.query.users.findFirst.mockResolvedValueOnce(
        mockUser({ id: "other-admin", role: "admin" }),
      );

      const caller = createCaller(ctx as any);
      await expect(
        caller.users.banUser({ userId: "other-admin", reason: "Test" }),
      ).rejects.toThrow("Only super admins can ban other admins");
    });

    it("should allow super admin to ban an admin", async () => {
      const targetAdmin = mockUser({ id: "admin-user", role: "admin" });
      const bannedAdmin = { ...targetAdmin, isBanned: true };
      const ctx = createUserContext();
      ctx.db.query.users.findFirst.mockResolvedValueOnce({ isBanned: false });
      ctx.db.query.users.findFirst.mockResolvedValueOnce(
        mockUser({ role: "super_admin" }),
      );
      ctx.db.query.users.findFirst.mockResolvedValueOnce(targetAdmin);
      ctx.db._mocks.returning.mockResolvedValueOnce([bannedAdmin]);

      const caller = createCaller(ctx as any);
      const result = await caller.users.banUser({
        userId: "admin-user",
        reason: "Abuse",
      });
      expect(result?.isBanned).toBe(true);
    });

    it("should prevent banning a super admin", async () => {
      const ctx = createUserContext();
      ctx.db.query.users.findFirst.mockResolvedValueOnce({ isBanned: false });
      ctx.db.query.users.findFirst.mockResolvedValueOnce(
        mockUser({ role: "super_admin" }),
      );
      ctx.db.query.users.findFirst.mockResolvedValueOnce(
        mockUser({ id: "other-super", role: "super_admin" }),
      );

      const caller = createCaller(ctx as any);
      await expect(
        caller.users.banUser({ userId: "other-super", reason: "Test" }),
      ).rejects.toThrow("Cannot ban super admins");
    });

    it("should throw NOT_FOUND for non-existent target user", async () => {
      const ctx = createUserContext();
      ctx.db.query.users.findFirst.mockResolvedValueOnce({ isBanned: false });
      ctx.db.query.users.findFirst.mockResolvedValueOnce(
        mockUser({ role: "admin" }),
      );
      ctx.db.query.users.findFirst.mockResolvedValueOnce(null);

      const caller = createCaller(ctx as any);
      await expect(
        caller.users.banUser({ userId: "nonexistent", reason: "Test" }),
      ).rejects.toThrow(TRPCError);
    });

    it("should throw FORBIDDEN for regular user", async () => {
      const ctx = createUserContext();
      ctx.db.query.users.findFirst.mockResolvedValueOnce({ isBanned: false });
      ctx.db.query.users.findFirst.mockResolvedValueOnce(
        mockUser({ role: "user" }),
      );

      const caller = createCaller(ctx as any);
      await expect(
        caller.users.banUser({ userId: "someone", reason: "Test" }),
      ).rejects.toThrow(TRPCError);
    });

    it("should set isBanned, bannedAt, bannedById, and banReason", async () => {
      const targetUser = mockUser({ id: "target", role: "user" });
      const ctx = createUserContext();
      ctx.db.query.users.findFirst.mockResolvedValueOnce({ isBanned: false });
      ctx.db.query.users.findFirst.mockResolvedValueOnce(
        mockUser({ role: "admin" }),
      );
      ctx.db.query.users.findFirst.mockResolvedValueOnce(targetUser);
      ctx.db._mocks.returning.mockResolvedValueOnce([
        {
          ...targetUser,
          isBanned: true,
          bannedAt: new Date(),
          bannedById: "test-user-id",
          banReason: "Spam",
        },
      ]);

      const caller = createCaller(ctx as any);
      const result = await caller.users.banUser({
        userId: "target",
        reason: "Spam",
      });
      expect(ctx.db.update).toHaveBeenCalled();
      expect(ctx.db._mocks.set).toHaveBeenCalledWith(
        expect.objectContaining({
          isBanned: true,
          banReason: "Spam",
        }),
      );
    });
  });

  // ── unbanUser (admin/super_admin) ───────────────
  describe("unbanUser", () => {
    it("should unban a user successfully", async () => {
      const unbannedUser = mockUser({ id: "target", isBanned: false });
      const ctx = createUserContext();
      ctx.db.query.users.findFirst.mockResolvedValueOnce({ isBanned: false });
      ctx.db.query.users.findFirst.mockResolvedValueOnce(
        mockUser({ role: "admin" }),
      );
      ctx.db._mocks.returning.mockResolvedValueOnce([unbannedUser]);

      const caller = createCaller(ctx as any);
      const result = await caller.users.unbanUser({ userId: "target" });
      expect(result).toEqual(unbannedUser);
    });

    it("should clear all ban fields", async () => {
      const ctx = createUserContext();
      ctx.db.query.users.findFirst.mockResolvedValueOnce({ isBanned: false });
      ctx.db.query.users.findFirst.mockResolvedValueOnce(
        mockUser({ role: "admin" }),
      );
      ctx.db._mocks.returning.mockResolvedValueOnce([mockUser()]);

      const caller = createCaller(ctx as any);
      await caller.users.unbanUser({ userId: "target" });

      expect(ctx.db._mocks.set).toHaveBeenCalledWith({
        isBanned: false,
        bannedAt: null,
        bannedById: null,
        banReason: null,
      });
    });

    it("should throw FORBIDDEN for regular user", async () => {
      const ctx = createUserContext();
      ctx.db.query.users.findFirst.mockResolvedValueOnce({ isBanned: false });
      ctx.db.query.users.findFirst.mockResolvedValueOnce(
        mockUser({ role: "user" }),
      );

      const caller = createCaller(ctx as any);
      await expect(
        caller.users.unbanUser({ userId: "someone" }),
      ).rejects.toThrow(TRPCError);
    });

    it("should throw NOT_FOUND for non-existent target user", async () => {
      const ctx = createUserContext();
      ctx.db.query.users.findFirst.mockResolvedValueOnce({ isBanned: false });
      ctx.db.query.users.findFirst.mockResolvedValueOnce(
        mockUser({ role: "admin" }),
      );
      ctx.db._mocks.returning.mockResolvedValueOnce([]);

      const caller = createCaller(ctx as any);
      await expect(
        caller.users.unbanUser({ userId: "nonexistent" }),
      ).rejects.toThrow(TRPCError);
    });
  });
});
