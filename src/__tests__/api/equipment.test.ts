// __tests__/api/equipment.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { appRouter } from "~/server/api/root";
import { createCallerFactory } from "~/server/api/trpc";
import {
  createMockDb,
  createUserContext,
  createUnauthenticatedContext,
  configureMockUserAsAdmin,
  configureMockUserAsSuperAdmin,
  configureMockUserAsRegularUserForAdminRoute,
  configureMockUserAsBanned,
  type MockDb,
} from "~/test/db-mock";

// Mock external dependencies
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

describe("Equipment tRPC Router", () => {
  let mockDb: MockDb;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── getAll (public) ──────────────────────────────
  describe("getAll", () => {
    it("should return active equipment", async () => {
      const mockEquipment = [
        { id: 1, name: { is: "Rennibraut" }, category: "core_equipment", isActive: true },
        { id: 2, name: { is: "Róla" }, category: "core_equipment", isActive: true },
      ];

      const ctx = createUnauthenticatedContext();
      ctx.db.query.equipment.findMany.mockResolvedValue(mockEquipment);

      const caller = createCaller(ctx as any);
      const result = await caller.equipment.getAll();

      expect(result).toEqual(mockEquipment);
      expect(ctx.db.query.equipment.findMany).toHaveBeenCalled();
    });

    it("should work without authentication", async () => {
      const ctx = createUnauthenticatedContext();
      ctx.db.query.equipment.findMany.mockResolvedValue([]);

      const caller = createCaller(ctx as any);
      const result = await caller.equipment.getAll();

      expect(result).toEqual([]);
    });
  });

  // ── getAllAdmin (admin only) ─────────────────────
  describe("getAllAdmin", () => {
    it("should return all equipment including inactive for admin", async () => {
      const allEquipment = [
        { id: 1, name: { is: "Active" }, isActive: true },
        { id: 2, name: { is: "Inactive" }, isActive: false },
      ];

      const ctx = createUserContext();
      configureMockUserAsAdmin(ctx);
      ctx.db.query.equipment.findMany.mockResolvedValue(allEquipment);

      const caller = createCaller(ctx as any);
      const result = await caller.equipment.getAllAdmin();

      expect(result).toEqual(allEquipment);
    });

    it("should throw FORBIDDEN for regular user", async () => {
      const ctx = createUserContext();
      configureMockUserAsRegularUserForAdminRoute(ctx);

      const caller = createCaller(ctx as any);
      await expect(caller.equipment.getAllAdmin()).rejects.toThrow(TRPCError);
      await expect(caller.equipment.getAllAdmin()).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    });

    it("should throw UNAUTHORIZED for unauthenticated request", async () => {
      const ctx = createUnauthenticatedContext();
      const caller = createCaller(ctx as any);

      await expect(caller.equipment.getAllAdmin()).rejects.toThrow(TRPCError);
    });

    it("should throw FORBIDDEN for banned user", async () => {
      const ctx = createUserContext();
      configureMockUserAsBanned(ctx);

      const caller = createCaller(ctx as any);
      await expect(caller.equipment.getAllAdmin()).rejects.toThrow(TRPCError);
    });
  });

  // ── getByCategory (public) ──────────────────────
  describe("getByCategory", () => {
    it("should return equipment filtered by category", async () => {
      const filtered = [
        { id: 1, name: { is: "Rennibraut" }, category: "core_equipment" },
      ];

      const ctx = createUnauthenticatedContext();
      ctx.db.query.equipment.findMany.mockResolvedValue(filtered);

      const caller = createCaller(ctx as any);
      const result = await caller.equipment.getByCategory({ category: "core_equipment" });

      expect(result).toEqual(filtered);
    });

    it("should work without authentication", async () => {
      const ctx = createUnauthenticatedContext();
      ctx.db.query.equipment.findMany.mockResolvedValue([]);

      const caller = createCaller(ctx as any);
      const result = await caller.equipment.getByCategory({ category: "core_equipment" });

      expect(result).toEqual([]);
    });
  });

  // ── getById (public) ────────────────────────────
  describe("getById", () => {
    it("should return single equipment item by ID", async () => {
      const mockItem = { id: 1, name: { is: "Róla" }, category: "core_equipment" };

      const ctx = createUnauthenticatedContext();
      ctx.db.query.equipment.findFirst.mockResolvedValue(mockItem);

      const caller = createCaller(ctx as any);
      const result = await caller.equipment.getById({ id: 1 });

      expect(result).toEqual(mockItem);
    });

    it("should throw NOT_FOUND for non-existent equipment", async () => {
      const ctx = createUnauthenticatedContext();
      ctx.db.query.equipment.findFirst.mockResolvedValue(null);

      const caller = createCaller(ctx as any);
      await expect(caller.equipment.getById({ id: 999 })).rejects.toThrow(TRPCError);
    });
  });

  // ── create (admin only) ─────────────────────────
  describe("create", () => {
    const validInput = {
      name: { is: "Rennibraut", en: "Slide" },
      category: "core_equipment" as const,
    };

    it("should create equipment with multilingual name", async () => {
      const created = { id: 1, ...validInput, isActive: true, description: null, image: null };

      const ctx = createUserContext();
      configureMockUserAsAdmin(ctx);
      ctx.db._mocks.returning.mockResolvedValueOnce([created]);

      const caller = createCaller(ctx as any);
      const result = await caller.equipment.create(validInput);

      expect(result).toEqual(created);
      expect(ctx.db.insert).toHaveBeenCalled();
    });

    it("should create equipment with optional description and image", async () => {
      const inputWithOptionals = {
        ...validInput,
        description: "A fun slide",
        image: "/images/slide.png",
      };
      const created = { id: 2, ...inputWithOptionals, isActive: true };

      const ctx = createUserContext();
      configureMockUserAsAdmin(ctx);
      ctx.db._mocks.returning.mockResolvedValueOnce([created]);

      const caller = createCaller(ctx as any);
      const result = await caller.equipment.create(inputWithOptionals);

      expect(result).toEqual(created);
    });

    it("should throw FORBIDDEN for non-admin user", async () => {
      const ctx = createUserContext();
      configureMockUserAsRegularUserForAdminRoute(ctx);

      const caller = createCaller(ctx as any);
      await expect(caller.equipment.create(validInput)).rejects.toThrow(TRPCError);
    });

    it("should throw UNAUTHORIZED for unauthenticated request", async () => {
      const ctx = createUnauthenticatedContext();
      const caller = createCaller(ctx as any);

      await expect(caller.equipment.create(validInput)).rejects.toThrow(TRPCError);
    });
  });

  // ── update (admin only) ─────────────────────────
  describe("update", () => {
    it("should update equipment name", async () => {
      const existing = { id: 1, name: { is: "Old" }, category: "core_equipment", isActive: true };
      const updated = { ...existing, name: { is: "New" } };

      const ctx = createUserContext();
      configureMockUserAsAdmin(ctx);
      ctx.db.query.equipment.findFirst.mockResolvedValue(existing);
      ctx.db._mocks.returning.mockResolvedValueOnce([updated]);

      const caller = createCaller(ctx as any);
      const result = await caller.equipment.update({ id: 1, name: { is: "New" } });

      expect(result).toEqual(updated);
    });

    it("should handle partial updates (only name)", async () => {
      const existing = { id: 1, name: { is: "Slide" }, category: "core_equipment", isActive: true };

      const ctx = createUserContext();
      configureMockUserAsAdmin(ctx);
      ctx.db.query.equipment.findFirst.mockResolvedValue(existing);
      ctx.db._mocks.returning.mockResolvedValueOnce([{ ...existing, name: { is: "Updated" } }]);

      const caller = createCaller(ctx as any);
      const result = await caller.equipment.update({ id: 1, name: { is: "Updated" } });

      expect(result?.name?.is).toBe("Updated");
    });

    it("should throw NOT_FOUND for non-existent equipment", async () => {
      const ctx = createUserContext();
      configureMockUserAsAdmin(ctx);
      ctx.db.query.equipment.findFirst.mockResolvedValue(null);

      const caller = createCaller(ctx as any);
      await expect(
        caller.equipment.update({ id: 999, name: { is: "X" } }),
      ).rejects.toThrow(TRPCError);
    });

    it("should throw FORBIDDEN for non-admin user", async () => {
      const ctx = createUserContext();
      configureMockUserAsRegularUserForAdminRoute(ctx);

      const caller = createCaller(ctx as any);
      await expect(
        caller.equipment.update({ id: 1, name: { is: "X" } }),
      ).rejects.toThrow(TRPCError);
    });
  });

  // ── delete (soft delete, admin only) ────────────
  describe("delete", () => {
    it("should soft delete by setting isActive to false", async () => {
      const existing = { id: 1, name: { is: "Slide" }, isActive: true };
      const deleted = { ...existing, isActive: false };

      const ctx = createUserContext();
      configureMockUserAsAdmin(ctx);
      ctx.db.query.equipment.findFirst.mockResolvedValue(existing);
      ctx.db._mocks.returning.mockResolvedValueOnce([deleted]);

      const caller = createCaller(ctx as any);
      const result = await caller.equipment.delete({ id: 1 });

      expect(result?.isActive).toBe(false);
    });

    it("should throw NOT_FOUND for non-existent equipment", async () => {
      const ctx = createUserContext();
      configureMockUserAsAdmin(ctx);
      ctx.db.query.equipment.findFirst.mockResolvedValue(null);

      const caller = createCaller(ctx as any);
      await expect(caller.equipment.delete({ id: 999 })).rejects.toThrow(TRPCError);
    });

    it("should throw FORBIDDEN for non-admin user", async () => {
      const ctx = createUserContext();
      configureMockUserAsRegularUserForAdminRoute(ctx);

      const caller = createCaller(ctx as any);
      await expect(caller.equipment.delete({ id: 1 })).rejects.toThrow(TRPCError);
    });
  });

  // ── restore (admin only) ────────────────────────
  describe("restore", () => {
    it("should restore by setting isActive to true", async () => {
      const existing = { id: 1, name: { is: "Slide" }, isActive: false };
      const restored = { ...existing, isActive: true };

      const ctx = createUserContext();
      configureMockUserAsAdmin(ctx);
      ctx.db.query.equipment.findFirst.mockResolvedValue(existing);
      ctx.db._mocks.returning.mockResolvedValueOnce([restored]);

      const caller = createCaller(ctx as any);
      const result = await caller.equipment.restore({ id: 1 });

      expect(result?.isActive).toBe(true);
    });

    it("should throw NOT_FOUND for non-existent equipment", async () => {
      const ctx = createUserContext();
      configureMockUserAsAdmin(ctx);
      ctx.db.query.equipment.findFirst.mockResolvedValue(null);

      const caller = createCaller(ctx as any);
      await expect(caller.equipment.restore({ id: 999 })).rejects.toThrow(TRPCError);
    });

    it("should throw FORBIDDEN for non-admin user", async () => {
      const ctx = createUserContext();
      configureMockUserAsRegularUserForAdminRoute(ctx);

      const caller = createCaller(ctx as any);
      await expect(caller.equipment.restore({ id: 1 })).rejects.toThrow(TRPCError);
    });
  });
});
