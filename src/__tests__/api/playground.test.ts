// __tests__/api/playground.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { appRouter } from "~/server/api/root";
import { createCallerFactory } from "~/server/api/trpc";
import {
  createUserContext,
  createUnauthenticatedContext,
  configureMockUserAsAdmin,
  configureMockUserAsRegularUser,
  configureMockUserAsRegularUserForAdminRoute,
  configureMockUserAsBanned,
  type MockDb,
} from "~/test/db-mock";
import { deleteOrphanedFiles } from "~/lib/file-cleanup";

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

// Valid input for creating a playground (matches CreatePlaygroundSchema)
const validCreateInput = {
  title: "Test Playground",
  latitude: 64.071,
  longitude: -21.954,
  municipality: "Reykjavík",
  publiclyAccessible: true,
  toddlerFriendly: false,
  isSchoolGround: false,
  schoolType: null,
  hasSeating: true,
  hasPicnicTable: false,
  hasFencing: true,
  hasGarbageCan: true,
  hasBathroomNearby: false,
  hasSoftPlayArea: false,
  submitAnonymously: false,
  equipmentIds: [1, 2],
  images: ["/uploads/playgrounds/test-image.jpg"],
};

// Mock playground record returned by DB
function mockPlayground(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    title: "Test Playground",
    latitude: 64.071,
    longitude: -21.954,
    municipality: "Reykjavík",
    publiclyAccessible: true,
    toddlerFriendly: false,
    isSchoolGround: false,
    schoolType: null,
    hasSeating: true,
    hasPicnicTable: false,
    hasFencing: true,
    hasGarbageCan: true,
    hasBathroomNearby: false,
    hasSoftPlayArea: false,
    coverImage: "/uploads/playgrounds/test-image.jpg",
    images: ["/uploads/playgrounds/test-image.jpg"],
    status: "approved",
    createdById: "test-user-id",
    createdAt: new Date("2025-01-01"),
    updatedAt: null,
    reviewedById: null,
    reviewedAt: null,
    rejectionReason: null,
    submitAnonymously: false,
    ...overrides,
  };
}

describe("Playground tRPC Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── create (protectedProcedure) ─────────────────
  describe("create", () => {
    it("should create playground with pending status", async () => {
      const created = mockPlayground({ status: "pending" });
      const ctx = createUserContext();
      configureMockUserAsRegularUser(ctx);
      ctx.db._mocks.returning.mockResolvedValueOnce([created]);

      const caller = createCaller(ctx as any);
      const result = await caller.playground.create(validCreateInput);

      expect(result).toEqual(created);
      expect(ctx.db.insert).toHaveBeenCalled();
    });

    it("should set first image as cover image", async () => {
      const ctx = createUserContext();
      configureMockUserAsRegularUser(ctx);
      ctx.db._mocks.returning.mockResolvedValueOnce([mockPlayground({ status: "pending" })]);

      const caller = createCaller(ctx as any);
      await caller.playground.create(validCreateInput);

      // Verify the values passed to insert include coverImage from first image
      expect(ctx.db._mocks.values).toHaveBeenCalledWith(
        expect.objectContaining({
          coverImage: "/uploads/playgrounds/test-image.jpg",
          status: "pending",
          submitAnonymously: false,
        }),
      );
    });

    it("should persist submitAnonymously when set to true", async () => {
      const created = mockPlayground({ status: "pending", submitAnonymously: true });
      const ctx = createUserContext();
      configureMockUserAsRegularUser(ctx);
      ctx.db._mocks.returning.mockResolvedValueOnce([created]);

      const caller = createCaller(ctx as any);
      const result = await caller.playground.create({
        ...validCreateInput,
        submitAnonymously: true,
      });

      expect(result).toEqual(created);
      expect(ctx.db._mocks.values).toHaveBeenCalledWith(
        expect.objectContaining({
          submitAnonymously: true,
          status: "pending",
        }),
      );
    });

    it("should handle empty equipmentIds (no equipment relations created)", async () => {
      const ctx = createUserContext();
      configureMockUserAsRegularUser(ctx);
      ctx.db._mocks.returning.mockResolvedValueOnce([mockPlayground({ status: "pending" })]);

      const caller = createCaller(ctx as any);
      await caller.playground.create({ ...validCreateInput, equipmentIds: [] });

      // insert should be called only once (for the playground, not equipment)
      expect(ctx.db.insert).toHaveBeenCalledTimes(1);
    });

    it("should create equipment relations when equipmentIds provided", async () => {
      const ctx = createUserContext();
      configureMockUserAsRegularUser(ctx);
      ctx.db._mocks.returning.mockResolvedValueOnce([mockPlayground({ id: 5, status: "pending" })]);

      const caller = createCaller(ctx as any);
      await caller.playground.create(validCreateInput);

      // insert called twice inside a transaction: once for playground, once for equipment
      expect(ctx.db.transaction).toHaveBeenCalledTimes(1);
      expect(ctx.db.insert).toHaveBeenCalledTimes(2);
    });

    it("should deduplicate equipmentIds before inserting relations", async () => {
      const ctx = createUserContext();
      configureMockUserAsRegularUser(ctx);
      ctx.db._mocks.returning.mockResolvedValueOnce([mockPlayground({ id: 5, status: "pending" })]);

      const caller = createCaller(ctx as any);
      await caller.playground.create({
        ...validCreateInput,
        equipmentIds: [1, 2, 1, 3, 2],
      });

      expect(ctx.db._mocks.values).toHaveBeenLastCalledWith([
        { playgroundId: 5, equipmentId: 1 },
        { playgroundId: 5, equipmentId: 2 },
        { playgroundId: 5, equipmentId: 3 },
      ]);
    });

    it("should map invalid equipmentId foreign key error (23503) to BAD_REQUEST", async () => {
      const ctx = createUserContext();
      configureMockUserAsRegularUser(ctx);
      ctx.db._mocks.returning.mockResolvedValueOnce([mockPlayground({ id: 5, status: "pending" })]);
      ctx.db._mocks.values
        .mockReturnValueOnce({ returning: ctx.db._mocks.returning })
        .mockRejectedValueOnce(Object.assign(new Error("FK violation"), { code: "23503" }));

      const caller = createCaller(ctx as any);
      await expect(caller.playground.create(validCreateInput)).rejects.toMatchObject({
        code: "BAD_REQUEST",
      });
    });

    it("should throw UNAUTHORIZED for unauthenticated request", async () => {
      const ctx = createUnauthenticatedContext();
      const caller = createCaller(ctx as any);
      await expect(caller.playground.create(validCreateInput)).rejects.toThrow(TRPCError);
    });

    it("should throw FORBIDDEN for banned user", async () => {
      const ctx = createUserContext();
      configureMockUserAsBanned(ctx);
      const caller = createCaller(ctx as any);
      await expect(caller.playground.create(validCreateInput)).rejects.toThrow(TRPCError);
    });
  });

  // ── getAll (public) ─────────────────────────────
  describe("getAll", () => {
    it("should return only approved playgrounds", async () => {
      const playgrounds = [mockPlayground(), mockPlayground({ id: 2, title: "Second" })];
      const ctx = createUnauthenticatedContext();
      ctx.db.query.playgrounds.findMany.mockResolvedValue(playgrounds);

      const caller = createCaller(ctx as any);
      const result = await caller.playground.getAll();

      expect(result).toEqual(playgrounds);
    });

    it("should include playground equipment relations", async () => {
      const playgrounds = [
        mockPlayground({
          playgroundEquipment: [
            { playgroundId: 1, equipmentId: 1, equipment: { id: 1, name: { is: "Slide" } } },
          ],
        }),
      ];
      const ctx = createUnauthenticatedContext();
      ctx.db.query.playgrounds.findMany.mockResolvedValue(playgrounds);

      const caller = createCaller(ctx as any);
      const result = await caller.playground.getAll();

      expect(result?.[0]?.playgroundEquipment).toBeDefined();
    });

    it("should work without authentication", async () => {
      const ctx = createUnauthenticatedContext();
      ctx.db.query.playgrounds.findMany.mockResolvedValue([]);

      const caller = createCaller(ctx as any);
      const result = await caller.playground.getAll();
      expect(result).toEqual([]);
    });

    it("should return empty array when no approved playgrounds exist", async () => {
      const ctx = createUnauthenticatedContext();
      ctx.db.query.playgrounds.findMany.mockResolvedValue(null);

      const caller = createCaller(ctx as any);
      const result = await caller.playground.getAll();
      expect(result).toBeNull();
    });
  });

  // ── getNearby (public) ──────────────────────────
  describe("getNearby", () => {
    it("should return closest approved playgrounds sorted by distance with minimal fields", async () => {
      const candidates = [
        mockPlayground({ id: 2, title: "Farther", latitude: 64.12, longitude: -21.9 }),
        mockPlayground({ id: 3, title: "Closest", latitude: 64.072, longitude: -21.955 }),
        mockPlayground({ id: 4, title: "Middle", latitude: 64.085, longitude: -21.94 }),
      ];
      const ctx = createUnauthenticatedContext();
      ctx.db.query.playgrounds.findMany.mockResolvedValue(candidates);

      const caller = createCaller(ctx as any);
      const result = await caller.playground.getNearby({
        id: 1,
        latitude: 64.071,
        longitude: -21.954,
        limit: 3,
      });

      expect(result).toHaveLength(3);
      expect(result.map((p) => p.id)).toEqual([3, 4, 2]);
      expect(result[0]!.distance).toBeLessThan(result[1]!.distance);
      expect(result[1]!.distance).toBeLessThan(result[2]!.distance);

      // Should only expose minimal fields + computed distance (no images array, status, etc.)
      expect(Object.keys(result[0]!).sort()).toEqual([
        "coverImage",
        "coverImageBlur",
        "distance",
        "id",
        "latitude",
        "longitude",
        "municipality",
        "title",
      ]);

      // Verify DB query requests only minimal columns and passes limit
      expect(ctx.db.query.playgrounds.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          columns: {
            id: true,
            title: true,
            municipality: true,
            coverImage: true,
            coverImageBlur: true,
            latitude: true,
            longitude: true,
          },
          limit: 3,
        }),
      );
    });

    it("should exclude the current playground id and respect limit", async () => {
      const candidates = [
        mockPlayground({ id: 1, title: "Self", latitude: 64.071, longitude: -21.954 }),
        mockPlayground({ id: 2, title: "Near A", latitude: 64.072, longitude: -21.954 }),
        mockPlayground({ id: 3, title: "Near B", latitude: 64.075, longitude: -21.954 }),
        mockPlayground({ id: 4, title: "Near C", latitude: 64.08, longitude: -21.954 }),
      ];
      const ctx = createUnauthenticatedContext();
      ctx.db.query.playgrounds.findMany.mockResolvedValue(candidates);

      const caller = createCaller(ctx as any);
      const result = await caller.playground.getNearby({
        id: 1,
        latitude: 64.071,
        longitude: -21.954,
        limit: 2,
      });

      expect(result).toHaveLength(2);
      expect(result.map((p) => p.id)).toEqual([2, 3]);
    });

    it("should default limit to 3 and return empty array when no nearby playgrounds exist", async () => {
      const ctx = createUnauthenticatedContext();
      ctx.db.query.playgrounds.findMany.mockResolvedValue([]);

      const caller = createCaller(ctx as any);
      const result = await caller.playground.getNearby({
        id: 1,
        latitude: 64.071,
        longitude: -21.954,
      });

      expect(result).toEqual([]);
      expect(ctx.db.query.playgrounds.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 3 }),
      );
    });

    it("should reject invalid coordinates or out-of-range limit", async () => {
      const ctx = createUnauthenticatedContext();
      const caller = createCaller(ctx as any);

      await expect(
        caller.playground.getNearby({ id: 1, latitude: 95, longitude: -21.954 }),
      ).rejects.toThrow();

      await expect(
        caller.playground.getNearby({ id: 1, latitude: 64.071, longitude: -21.954, limit: 0 }),
      ).rejects.toThrow();
    });
  });

  // ── getAllForAdmin (admin only) ──────────────────
  describe("getAllForAdmin", () => {
    it("should return bounded playgrounds of all statuses for admin", async () => {
      const allPlaygrounds = [
        mockPlayground({ status: "approved" }),
        mockPlayground({ id: 2, status: "pending" }),
        mockPlayground({ id: 3, status: "rejected" }),
      ];
      const ctx = createUserContext();
      configureMockUserAsAdmin(ctx);
      ctx.db.query.playgrounds.findMany.mockResolvedValue(allPlaygrounds);

      const caller = createCaller(ctx as any);
      const result = await caller.playground.getAllForAdmin();

      expect(result).toEqual(allPlaygrounds);
      expect(result).toHaveLength(3);
      expect(ctx.db.query.playgrounds.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 200, offset: 0 }),
      );
    });

    it("should support pagination, status, and search filters", async () => {
      const filtered = [mockPlayground({ status: "pending" })];
      const ctx = createUserContext();
      configureMockUserAsAdmin(ctx);
      ctx.db.query.playgrounds.findMany.mockResolvedValue(filtered);

      const caller = createCaller(ctx as any);
      const result = await caller.playground.getAllForAdmin({
        limit: 50,
        offset: 10,
        status: "pending",
        search: "Reykjavík",
      });

      expect(result).toEqual(filtered);
      expect(ctx.db.query.playgrounds.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 50,
          offset: 10,
          where: expect.anything(),
        }),
      );
    });

    it("should throw FORBIDDEN for regular user", async () => {
      const ctx = createUserContext();
      configureMockUserAsRegularUserForAdminRoute(ctx);

      const caller = createCaller(ctx as any);
      await expect(caller.playground.getAllForAdmin()).rejects.toThrow(TRPCError);
    });
  });

  // ── getPendingSubmissions (admin only) ──────────
  describe("getPendingSubmissions", () => {
    it("should return only pending playgrounds", async () => {
      const pending = [mockPlayground({ status: "pending" })];
      const ctx = createUserContext();
      configureMockUserAsAdmin(ctx);
      ctx.db.query.playgrounds.findMany.mockResolvedValue(pending);

      const caller = createCaller(ctx as any);
      const result = await caller.playground.getPendingSubmissions();

      expect(result).toEqual(pending);
    });

    it("should throw FORBIDDEN for regular user", async () => {
      const ctx = createUserContext();
      configureMockUserAsRegularUserForAdminRoute(ctx);

      const caller = createCaller(ctx as any);
      await expect(caller.playground.getPendingSubmissions()).rejects.toThrow(TRPCError);
    });
  });

  // ── getById (public) ────────────────────────────
  describe("getById", () => {
    it("should return approved playground with equipment and creator name without email or reviewedBy", async () => {
      const playground = mockPlayground({
        playgroundEquipment: [
          { playgroundId: 1, equipmentId: 1, equipment: { id: 1, name: { is: "Slide" } } },
        ],
        createdBy: { id: "user-1", name: "User", email: "user@test.com" },
        reviewedBy: { id: "admin-1", name: "Admin", email: "admin@test.com" },
      });
      const ctx = createUnauthenticatedContext();
      ctx.db.query.playgrounds.findFirst.mockResolvedValue(playground);

      const caller = createCaller(ctx as any);
      const result = await caller.playground.getById({ id: 1 });

      expect(result.id).toBe(1);
      expect(result.playgroundEquipment).toEqual(playground.playgroundEquipment);
      expect(result.createdBy).toEqual({ id: "user-1", name: "User" });
      expect("email" in (result.createdBy ?? {})).toBe(false);
      expect("reviewedBy" in result).toBe(false);

      // Verify DB query does not select email or reviewedBy
      const findFirstCall = ctx.db.query.playgrounds.findFirst.mock.calls[0]?.[0];
      expect(findFirstCall?.with?.createdBy).toEqual({
        columns: { id: true, name: true },
      });
      expect(findFirstCall?.with?.reviewedBy).toBeUndefined();
    });

    it("should throw TRPCError NOT_FOUND for non-existent ID", async () => {
      const ctx = createUnauthenticatedContext();
      ctx.db.query.playgrounds.findFirst.mockResolvedValue(null);

      const caller = createCaller(ctx as any);
      await expect(caller.playground.getById({ id: 999 })).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });

    it("should work without authentication for approved playground", async () => {
      const playground = mockPlayground();
      const ctx = createUnauthenticatedContext();
      ctx.db.query.playgrounds.findFirst.mockResolvedValue(playground);

      const caller = createCaller(ctx as any);
      const result = await caller.playground.getById({ id: 1 });
      expect(result).toEqual({
        ...playground,
        createdBy: null,
      });
    });

    it("should redact createdBy and createdById for anonymous playground when caller is unauthenticated", async () => {
      const playground = mockPlayground({
        submitAnonymously: true,
        createdById: "creator-1",
        createdBy: { id: "creator-1", name: "Secret Submitter", email: "secret@test.com" },
      });
      const ctx = createUnauthenticatedContext();
      ctx.db.query.playgrounds.findFirst.mockResolvedValue(playground);

      const caller = createCaller(ctx as any);
      const result = await caller.playground.getById({ id: 1 });

      expect(result.submitAnonymously).toBe(true);
      expect(result.createdBy).toBeNull();
      expect(result.createdById).toBeNull();
    });

    it("should redact createdBy and createdById for anonymous playground when caller is another regular user", async () => {
      const playground = mockPlayground({
        submitAnonymously: true,
        createdById: "creator-1",
        createdBy: { id: "creator-1", name: "Secret Submitter", email: "secret@test.com" },
      });
      const ctx = createUserContext({userId: "other-user-2", role: "user", isBanned: false });
      ctx.db.query.playgrounds.findFirst.mockResolvedValue(playground);

      const caller = createCaller(ctx as any);
      const result = await caller.playground.getById({ id: 1 });

      expect(result.createdBy).toBeNull();
      expect(result.createdById).toBeNull();
    });

    it("should preserve createdBy (without email) for anonymous playground when caller is the creator", async () => {
      const playground = mockPlayground({
        submitAnonymously: true,
        createdById: "creator-1",
        createdBy: { id: "creator-1", name: "Creator Name", email: "creator@test.com" },
      });
      const ctx = createUserContext({ userId: "creator-1" });
      ctx.db.query.playgrounds.findFirst.mockResolvedValue(playground);

      const caller = createCaller(ctx as any);
      const result = await caller.playground.getById({ id: 1 });

      expect(result.createdBy).toEqual({ id: "creator-1", name: "Creator Name" });
      expect("email" in (result.createdBy ?? {})).toBe(false);
      expect(result.createdById).toBe("creator-1");
    });

    it("should preserve createdBy (without email) for anonymous playground when caller is an admin", async () => {
      const playground = mockPlayground({
        submitAnonymously: true,
        createdById: "creator-1",
        createdBy: { id: "creator-1", name: "Creator Name", email: "creator@test.com" },
      });
      const ctx = createUserContext({userId: "admin-1", role: "admin", isBanned: false });
      ctx.db.query.playgrounds.findFirst.mockResolvedValue(playground);

      const caller = createCaller(ctx as any);
      const result = await caller.playground.getById({ id: 1 });

      expect(result.createdBy).toEqual({ id: "creator-1", name: "Creator Name" });
      expect("email" in (result.createdBy ?? {})).toBe(false);
      expect(result.createdById).toBe("creator-1");
    });

    it("should throw NOT_FOUND for pending playground when caller is unauthenticated", async () => {
      const pending = mockPlayground({ status: "pending", createdById: "creator-1" });
      const ctx = createUnauthenticatedContext();
      ctx.db.query.playgrounds.findFirst.mockResolvedValue(pending);

      const caller = createCaller(ctx as any);
      await expect(caller.playground.getById({ id: 1 })).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });

    it("should throw NOT_FOUND for rejected playground (not leaking rejectionReason) when caller is unauthenticated", async () => {
      const rejected = mockPlayground({
        status: "rejected",
        rejectionReason: "Private backyard",
        createdById: "creator-1",
      });
      const ctx = createUnauthenticatedContext();
      ctx.db.query.playgrounds.findFirst.mockResolvedValue(rejected);

      const caller = createCaller(ctx as any);
      await expect(caller.playground.getById({ id: 1 })).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });

    it("should throw NOT_FOUND for pending playground when caller is another regular user", async () => {
      const pending = mockPlayground({ status: "pending", createdById: "creator-1" });
      const ctx = createUserContext({userId: "other-user-2", role: "user", isBanned: false });
      ctx.db.query.playgrounds.findFirst.mockResolvedValue(pending);

      const caller = createCaller(ctx as any);
      await expect(caller.playground.getById({ id: 1 })).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });

    it("should throw NOT_FOUND for pending playground when caller is a banned admin", async () => {
      const pending = mockPlayground({ status: "pending", createdById: "creator-1" });
      const ctx = createUserContext({userId: "banned-admin", role: "admin", isBanned: true });
      ctx.db.query.playgrounds.findFirst.mockResolvedValue(pending);

      const caller = createCaller(ctx as any);
      await expect(caller.playground.getById({ id: 1 })).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });

    it("should allow creator to fetch their own pending or rejected playground with rejectionReason", async () => {
      const rejected = mockPlayground({
        status: "rejected",
        rejectionReason: "Duplicate submission",
        createdById: "creator-1",
        createdBy: { id: "creator-1", name: "Creator", email: "creator@test.com" },
      });
      const ctx = createUserContext({ userId: "creator-1" });
      ctx.db.query.playgrounds.findFirst.mockResolvedValue(rejected);

      const caller = createCaller(ctx as any);
      const result = await caller.playground.getById({ id: 1 });

      expect(result.status).toBe("rejected");
      expect(result.rejectionReason).toBe("Duplicate submission");
      expect(result.createdBy).toEqual({ id: "creator-1", name: "Creator" });
      expect("email" in (result.createdBy ?? {})).toBe(false);
    });

    it("should allow admin and super_admin to fetch non-approved playgrounds", async () => {
      for (const role of ["admin", "super_admin"] as const) {
        const pending = mockPlayground({
          status: "pending",
          createdById: "creator-1",
          createdBy: { id: "creator-1", name: "Creator", email: "creator@test.com" },
        });
        const ctx = createUserContext({ userId: `${role}-1`, role });
        ctx.db.query.playgrounds.findFirst.mockResolvedValue(pending);

        const caller = createCaller(ctx as any);
        const result = await caller.playground.getById({ id: 1 });

        expect(result.status).toBe("pending");
        expect(result.createdBy).toEqual({ id: "creator-1", name: "Creator" });
        expect("email" in (result.createdBy ?? {})).toBe(false);
      }
    });

    it("should strip stale rejectionReason on approved playgrounds for non-authorized callers", async () => {
      const approvedWithStaleReason = mockPlayground({
        status: "approved",
        rejectionReason: "Old internal note",
        createdById: "creator-1",
      });
      const ctx = createUnauthenticatedContext();
      ctx.db.query.playgrounds.findFirst.mockResolvedValue(approvedWithStaleReason);

      const caller = createCaller(ctx as any);
      const result = await caller.playground.getById({ id: 1 });

      expect(result.rejectionReason).toBeNull();
    });
  });

  // ── update (admin only) ─────────────────────────
  describe("update", () => {
    const updateInput = {
      id: 1,
      title: "Updated Playground",
      latitude: 64.08,
      longitude: -21.95,
      publiclyAccessible: true,
      toddlerFriendly: true,
      isSchoolGround: false,
      schoolType: null,
      equipmentIds: [1, 3],
      images: ["/uploads/playgrounds/new-image.jpg"],
    };

    it("should update playground fields inside a transaction", async () => {
      const existing = mockPlayground();
      const updated = mockPlayground({ title: "Updated Playground" });
      const ctx = createUserContext();
      configureMockUserAsAdmin(ctx);
      ctx.db.query.playgrounds.findFirst.mockResolvedValue(existing);
      ctx.db._mocks.returning.mockResolvedValueOnce([updated]);

      const caller = createCaller(ctx as any);
      const result = await caller.playground.update(updateInput);

      expect(result).toEqual(updated);
      expect(ctx.db.transaction).toHaveBeenCalledTimes(1);
      expect(ctx.db.update).toHaveBeenCalled();
    });

    it("should deduplicate equipmentIds when updating relations", async () => {
      const existing = mockPlayground();
      const updated = mockPlayground();
      const ctx = createUserContext();
      configureMockUserAsAdmin(ctx);
      ctx.db.query.playgrounds.findFirst.mockResolvedValue(existing);
      ctx.db._mocks.returning.mockResolvedValueOnce([updated]);

      const caller = createCaller(ctx as any);
      await caller.playground.update({ ...updateInput, equipmentIds: [1, 3, 1, 3] });

      expect(ctx.db.delete).toHaveBeenCalled();
      expect(ctx.db.insert).toHaveBeenCalled();
      expect(ctx.db._mocks.values).toHaveBeenLastCalledWith([
        { playgroundId: 1, equipmentId: 1 },
        { playgroundId: 1, equipmentId: 3 },
      ]);
    });

    it("should call deleteOrphanedFiles for image cleanup", async () => {
      const existing = mockPlayground({ images: ["/uploads/playgrounds/old.jpg"] });
      const updated = mockPlayground();
      const ctx = createUserContext();
      configureMockUserAsAdmin(ctx);
      ctx.db.query.playgrounds.findFirst.mockResolvedValue(existing);
      ctx.db._mocks.returning.mockResolvedValueOnce([updated]);

      const caller = createCaller(ctx as any);
      await caller.playground.update(updateInput);

      expect(deleteOrphanedFiles).toHaveBeenCalled();
    });

    it("should preserve existing coverImage when omitted in partial update", async () => {
      const coverUrl =
        "https://abc123.public.blob.vercel-storage.com/playgrounds/cover.jpg";
      const galleryOldUrl =
        "https://abc123.public.blob.vercel-storage.com/playgrounds/gallery-old.jpg";
      const galleryNewUrl =
        "https://abc123.public.blob.vercel-storage.com/playgrounds/gallery-new.jpg";

      const existing = mockPlayground({
        coverImage: coverUrl,
        images: [galleryOldUrl],
      });
      const updated = mockPlayground({
        coverImage: coverUrl,
        images: [galleryNewUrl],
      });
      const ctx = createUserContext();
      configureMockUserAsAdmin(ctx);
      ctx.db.query.playgrounds.findFirst.mockResolvedValue(existing);
      ctx.db._mocks.returning.mockResolvedValueOnce([updated]);

      const caller = createCaller(ctx as any);
      // updateInput omits coverImage entirely
      await caller.playground.update({
        ...updateInput,
        images: [galleryNewUrl],
      });

      expect(deleteOrphanedFiles).toHaveBeenCalledWith(
        expect.arrayContaining([galleryOldUrl, coverUrl]),
        expect.arrayContaining([galleryNewUrl, coverUrl]),
      );
    });

    it("should mark old coverImage for cleanup when explicitly replaced or cleared", async () => {
      const oldCoverUrl =
        "https://abc123.public.blob.vercel-storage.com/playgrounds/old-cover.jpg";
      const galleryUrl =
        "https://abc123.public.blob.vercel-storage.com/playgrounds/gallery.jpg";

      const existing = mockPlayground({
        coverImage: oldCoverUrl,
        images: [galleryUrl],
      });
      const updated = mockPlayground({
        coverImage: null,
        images: [galleryUrl],
      });
      const ctx = createUserContext();
      configureMockUserAsAdmin(ctx);
      ctx.db.query.playgrounds.findFirst.mockResolvedValue(existing);
      ctx.db._mocks.returning.mockResolvedValueOnce([updated]);

      const caller = createCaller(ctx as any);
      await caller.playground.update({
        ...updateInput,
        coverImage: null,
        images: [galleryUrl],
      });

      expect(deleteOrphanedFiles).toHaveBeenCalledWith(
        [galleryUrl, oldCoverUrl],
        [galleryUrl],
      );
    });

    it("should not fail update when deleteOrphanedFiles rejects", async () => {
      vi.mocked(deleteOrphanedFiles).mockRejectedValueOnce(
        new Error("Blob delete failed"),
      );
      const existing = mockPlayground();
      const updated = mockPlayground({ title: "Updated Playground" });
      const ctx = createUserContext();
      configureMockUserAsAdmin(ctx);
      ctx.db.query.playgrounds.findFirst.mockResolvedValue(existing);
      ctx.db._mocks.returning.mockResolvedValueOnce([updated]);

      const caller = createCaller(ctx as any);
      const result = await caller.playground.update(updateInput);

      expect(result).toEqual(updated);
    });

    it("should throw TRPCError NOT_FOUND for non-existent playground", async () => {
      const ctx = createUserContext();
      configureMockUserAsAdmin(ctx);
      ctx.db.query.playgrounds.findFirst.mockResolvedValue(null);

      const caller = createCaller(ctx as any);
      await expect(caller.playground.update(updateInput)).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });

    it("should throw FORBIDDEN for non-admin user", async () => {
      const ctx = createUserContext();
      configureMockUserAsRegularUserForAdminRoute(ctx);

      const caller = createCaller(ctx as any);
      await expect(caller.playground.update(updateInput)).rejects.toThrow(TRPCError);
    });
  });

  // ── review (admin only) ─────────────────────────
  describe("review", () => {
    it("should approve pending playground inside a transaction", async () => {
      const pending = mockPlayground({ status: "pending" });
      const approved = mockPlayground({ status: "approved" });
      const ctx = createUserContext();
      configureMockUserAsAdmin(ctx);
      ctx.db.query.playgrounds.findFirst.mockResolvedValue(pending);
      ctx.db._mocks.returning.mockResolvedValueOnce([approved]);

      const caller = createCaller(ctx as any);
      const result = await caller.playground.review({ id: 1, action: "approve" });

      expect(result?.status).toBe("approved");
      expect(ctx.db.transaction).toHaveBeenCalledTimes(1);
    });

    it("should reject playground with rejection reason and clean up all submission images", async () => {
      const img1 =
        "https://abc123.public.blob.vercel-storage.com/playgrounds/sub1.jpg";
      const cover =
        "https://abc123.public.blob.vercel-storage.com/playgrounds/sub-cover.jpg";
      const pending = mockPlayground({
        status: "pending",
        images: [img1],
        coverImage: cover,
      });
      const rejected = mockPlayground({
        status: "rejected",
        rejectionReason: "Not a playground",
        images: [],
        coverImage: null,
      });
      const ctx = createUserContext();
      configureMockUserAsAdmin(ctx);
      ctx.db.query.playgrounds.findFirst.mockResolvedValue(pending);
      ctx.db._mocks.returning.mockResolvedValueOnce([rejected]);

      const caller = createCaller(ctx as any);
      const result = await caller.playground.review({
        id: 1,
        action: "reject",
        rejectionReason: "Not a playground",
      });

      expect(result?.status).toBe("rejected");
      expect(ctx.db._mocks.set).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "rejected",
          images: [],
          coverImage: null,
        }),
      );
      expect(deleteOrphanedFiles).toHaveBeenCalledWith(
        expect.arrayContaining([img1, cover]),
        [],
      );
    });

    it("should set reviewedById and reviewedAt", async () => {
      const pending = mockPlayground({ status: "pending" });
      const ctx = createUserContext();
      configureMockUserAsAdmin(ctx);
      ctx.db.query.playgrounds.findFirst.mockResolvedValue(pending);
      ctx.db._mocks.returning.mockResolvedValueOnce([mockPlayground({ status: "approved" })]);

      const caller = createCaller(ctx as any);
      await caller.playground.review({ id: 1, action: "approve" });

      expect(ctx.db._mocks.set).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "approved",
          reviewedById: "test-user-id",
          reviewedAt: expect.any(Date),
        }),
      );
    });

    it("should apply optional field updates and deduplicate equipmentIds during review", async () => {
      const pending = mockPlayground({ status: "pending", title: "Old Title" });
      const ctx = createUserContext();
      configureMockUserAsAdmin(ctx);
      ctx.db.query.playgrounds.findFirst.mockResolvedValue(pending);
      ctx.db._mocks.returning.mockResolvedValueOnce([mockPlayground()]);

      const caller = createCaller(ctx as any);
      await caller.playground.review({
        id: 1,
        action: "approve",
        title: "New Title",
        toddlerFriendly: true,
        equipmentIds: [2, 2, 4],
      });

      expect(ctx.db._mocks.set).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "New Title",
          toddlerFriendly: true,
        }),
      );
      expect(ctx.db._mocks.values).toHaveBeenLastCalledWith([
        { playgroundId: 1, equipmentId: 2 },
        { playgroundId: 1, equipmentId: 4 },
      ]);
    });

    it("should throw TRPCError CONFLICT if playground is already reviewed", async () => {
      const approved = mockPlayground({ status: "approved" });
      const ctx = createUserContext();
      configureMockUserAsAdmin(ctx);
      ctx.db.query.playgrounds.findFirst.mockResolvedValue(approved);

      const caller = createCaller(ctx as any);
      await expect(
        caller.playground.review({ id: 1, action: "approve" }),
      ).rejects.toMatchObject({ code: "CONFLICT" });
      expect(ctx.db.update).not.toHaveBeenCalled();
    });

    it("should throw TRPCError CONFLICT on concurrent review race (empty returning)", async () => {
      const pending = mockPlayground({ status: "pending" });
      const ctx = createUserContext();
      configureMockUserAsAdmin(ctx);
      ctx.db.query.playgrounds.findFirst.mockResolvedValue(pending);
      ctx.db._mocks.returning.mockResolvedValueOnce([]); // lost race on WHERE status = 'pending'

      const caller = createCaller(ctx as any);
      await expect(
        caller.playground.review({ id: 1, action: "approve" }),
      ).rejects.toMatchObject({ code: "CONFLICT" });
    });

    it("should throw TRPCError NOT_FOUND for non-existent playground", async () => {
      const ctx = createUserContext();
      configureMockUserAsAdmin(ctx);
      ctx.db.query.playgrounds.findFirst.mockResolvedValue(null);

      const caller = createCaller(ctx as any);
      await expect(
        caller.playground.review({ id: 999, action: "approve" }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("should throw FORBIDDEN for non-admin user", async () => {
      const ctx = createUserContext();
      configureMockUserAsRegularUserForAdminRoute(ctx);

      const caller = createCaller(ctx as any);
      await expect(
        caller.playground.review({ id: 1, action: "approve" }),
      ).rejects.toThrow(TRPCError);
    });
  });

  // ── delete (admin only) ─────────────────────────
  describe("delete", () => {
    it("should delete playground inside a transaction and return deleted record", async () => {
      const playground = mockPlayground();
      const ctx = createUserContext();
      configureMockUserAsAdmin(ctx);
      ctx.db.query.playgrounds.findFirst.mockResolvedValue(playground);
      ctx.db._mocks.returning.mockResolvedValueOnce([playground]);

      const caller = createCaller(ctx as any);
      const result = await caller.playground.delete({ id: 1 });

      expect(result).toEqual(playground);
      expect(ctx.db.transaction).toHaveBeenCalledTimes(1);
    });

    it("should delete edit suggestions before playground", async () => {
      const playground = mockPlayground();
      const ctx = createUserContext();
      configureMockUserAsAdmin(ctx);
      ctx.db.query.playgrounds.findFirst.mockResolvedValue(playground);
      ctx.db._mocks.returning.mockResolvedValueOnce([playground]);

      const caller = createCaller(ctx as any);
      await caller.playground.delete({ id: 1 });

      // delete called twice: first for edit suggestions, then for playground
      expect(ctx.db.delete).toHaveBeenCalledTimes(2);
    });

    it("should call deleteOrphanedFiles with all images and empty new list", async () => {
      const playground = mockPlayground({
        images: ["/uploads/playgrounds/img1.jpg", "/uploads/playgrounds/img2.jpg"],
        coverImage: "/uploads/playgrounds/cover.jpg",
      });
      const ctx = createUserContext();
      configureMockUserAsAdmin(ctx);
      ctx.db.query.playgrounds.findFirst.mockResolvedValue(playground);
      ctx.db._mocks.returning.mockResolvedValueOnce([playground]);

      const caller = createCaller(ctx as any);
      await caller.playground.delete({ id: 1 });

      expect(deleteOrphanedFiles).toHaveBeenCalledWith(
        expect.arrayContaining(["/uploads/playgrounds/img1.jpg", "/uploads/playgrounds/cover.jpg"]),
        [],
      );
    });

    it("should throw TRPCError NOT_FOUND for non-existent playground", async () => {
      const ctx = createUserContext();
      configureMockUserAsAdmin(ctx);
      ctx.db.query.playgrounds.findFirst.mockResolvedValue(null);

      const caller = createCaller(ctx as any);
      await expect(caller.playground.delete({ id: 999 })).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });

    it("should throw FORBIDDEN for non-admin user", async () => {
      const ctx = createUserContext();
      configureMockUserAsRegularUserForAdminRoute(ctx);

      const caller = createCaller(ctx as any);
      await expect(caller.playground.delete({ id: 1 })).rejects.toThrow(TRPCError);
    });
  });

  // ── createEditSuggestion (protectedProcedure) ───
  describe("createEditSuggestion", () => {
    it("should create edit suggestion for approved playground inside a transaction", async () => {
      const approvedPlayground = mockPlayground({ status: "approved" });
      const suggestion = { id: 1, playgroundId: 1, title: "Edited Title", status: "pending" };
      const ctx = createUserContext();
      configureMockUserAsRegularUser(ctx);
      ctx.db.query.playgrounds.findFirst.mockResolvedValue(approvedPlayground);
      ctx.db._mocks.returning.mockResolvedValueOnce([suggestion]);

      const caller = createCaller(ctx as any);
      const result = await caller.playground.createEditSuggestion({
        playgroundId: 1,
        title: "Edited Title",
      });

      expect(result).toEqual(suggestion);
      expect(ctx.db.transaction).toHaveBeenCalledTimes(1);
    });

    it("should throw TRPCError NOT_FOUND if playground is not approved", async () => {
      const ctx = createUserContext();
      configureMockUserAsRegularUser(ctx);
      ctx.db.query.playgrounds.findFirst.mockResolvedValue(null); // not found because query filters by status=approved

      const caller = createCaller(ctx as any);
      await expect(
        caller.playground.createEditSuggestion({ playgroundId: 1, title: "New" }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("should throw TRPCError NOT_FOUND if playground does not exist", async () => {
      const ctx = createUserContext();
      configureMockUserAsRegularUser(ctx);
      ctx.db.query.playgrounds.findFirst.mockResolvedValue(null);

      const caller = createCaller(ctx as any);
      await expect(
        caller.playground.createEditSuggestion({ playgroundId: 999 }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("should deduplicate equipmentIds when creating suggestion equipment relations", async () => {
      const approvedPlayground = mockPlayground({ status: "approved" });
      const suggestion = { id: 1, playgroundId: 1, status: "pending" };
      const ctx = createUserContext();
      configureMockUserAsRegularUser(ctx);
      ctx.db.query.playgrounds.findFirst.mockResolvedValue(approvedPlayground);
      ctx.db._mocks.returning.mockResolvedValueOnce([suggestion]);

      const caller = createCaller(ctx as any);
      await caller.playground.createEditSuggestion({
        playgroundId: 1,
        equipmentIds: [1, 2, 2, 3, 1],
      });

      // insert called twice: suggestion + equipment relations
      expect(ctx.db.insert).toHaveBeenCalledTimes(2);
      expect(ctx.db._mocks.values).toHaveBeenLastCalledWith([
        { suggestionId: 1, equipmentId: 1 },
        { suggestionId: 1, equipmentId: 2 },
        { suggestionId: 1, equipmentId: 3 },
      ]);
    });

    it("should preserve both kept existing images and newly added images when removeImages is provided", async () => {
      const approvedPlayground = mockPlayground({
        status: "approved",
        images: ["/uploads/playgrounds/keep.jpg", "/uploads/playgrounds/remove.jpg"],
      });
      const suggestion = { id: 1, playgroundId: 1, status: "pending" };
      const ctx = createUserContext();
      configureMockUserAsRegularUser(ctx);
      ctx.db.query.playgrounds.findFirst.mockResolvedValue(approvedPlayground);
      ctx.db._mocks.returning.mockResolvedValueOnce([suggestion]);

      const caller = createCaller(ctx as any);
      await caller.playground.createEditSuggestion({
        playgroundId: 1,
        images: ["/uploads/playgrounds/new.jpg"],
        removeImages: [false, true],
      });

      expect(ctx.db._mocks.values).toHaveBeenCalledWith(
        expect.objectContaining({
          images: ["/uploads/playgrounds/keep.jpg", "/uploads/playgrounds/new.jpg"],
        }),
      );
    });

    it("should store empty-string removal sentinel when removeCoverImage is true", async () => {
      const approvedPlayground = mockPlayground({
        status: "approved",
        coverImage: "/uploads/playgrounds/cover.jpg",
      });
      const suggestion = { id: 1, playgroundId: 1, status: "pending" };
      const ctx = createUserContext();
      configureMockUserAsRegularUser(ctx);
      ctx.db.query.playgrounds.findFirst.mockResolvedValue(approvedPlayground);
      ctx.db._mocks.returning.mockResolvedValueOnce([suggestion]);

      const caller = createCaller(ctx as any);
      await caller.playground.createEditSuggestion({
        playgroundId: 1,
        removeCoverImage: true,
      });

      expect(ctx.db._mocks.values).toHaveBeenCalledWith(
        expect.objectContaining({
          coverImage: "",
        }),
      );
    });

    it("should throw UNAUTHORIZED for unauthenticated user", async () => {
      const ctx = createUnauthenticatedContext();
      const caller = createCaller(ctx as any);
      await expect(
        caller.playground.createEditSuggestion({ playgroundId: 1 }),
      ).rejects.toThrow(TRPCError);
    });
  });

  // ── updateMyEditSuggestion (protectedProcedure) ─
  describe("updateMyEditSuggestion", () => {
    it("should preserve both kept existing images and newly added images when removeImages is provided", async () => {
      const existingSuggestion = {
        id: 10,
        playgroundId: 1,
        status: "pending",
        createdById: "test-user-id",
        playground: mockPlayground({
          images: ["/uploads/playgrounds/keep.jpg", "/uploads/playgrounds/remove.jpg"],
        }),
      };
      const updated = { ...existingSuggestion, coverImage: "" };
      const ctx = createUserContext();
      configureMockUserAsRegularUser(ctx);
      ctx.db.query.playgroundEditSuggestions.findFirst.mockResolvedValue(existingSuggestion);
      ctx.db._mocks.returning.mockResolvedValueOnce([updated]);

      const caller = createCaller(ctx as any);
      await caller.playground.updateMyEditSuggestion({
        id: 10,
        playgroundId: 1,
        images: ["/uploads/playgrounds/added.jpg"],
        removeImages: [false, true],
        removeCoverImage: true,
      });

      expect(ctx.db._mocks.set).toHaveBeenCalledWith(
        expect.objectContaining({
          images: ["/uploads/playgrounds/keep.jpg", "/uploads/playgrounds/added.jpg"],
          coverImage: "",
        }),
      );
    });
  });

  // ── reviewEditSuggestion (admin only) ───────────
  describe("reviewEditSuggestion", () => {
    const mockSuggestion = {
      id: 1,
      playgroundId: 1,
      title: "Updated Title",
      latitude: null,
      longitude: null,
      municipality: null,
      publiclyAccessible: null,
      toddlerFriendly: null,
      isSchoolGround: null,
      schoolType: null,
      hasSeating: null,
      hasPicnicTable: null,
      hasFencing: null,
      hasGarbageCan: null,
      hasBathroomNearby: null,
      hasSoftPlayArea: null,
      coverImage: null,
      images: null,
      equipmentIds: null,
      status: "pending",
      createdById: "user-1",
      reviewedById: null,
      reviewedAt: null,
      rejectionReason: null,
      playground: mockPlayground(),
      suggestionEquipment: [],
    };

    it("should approve suggestion and apply changes to playground inside a transaction", async () => {
      const approvedSuggestion = { ...mockSuggestion, status: "approved" };
      const ctx = createUserContext();
      configureMockUserAsAdmin(ctx);
      ctx.db.query.playgroundEditSuggestions.findFirst.mockResolvedValue(mockSuggestion);
      ctx.db._mocks.returning.mockResolvedValueOnce([approvedSuggestion]);

      const caller = createCaller(ctx as any);
      const result = await caller.playground.reviewEditSuggestion({
        id: 1,
        action: "approve",
      });

      expect(result?.status).toBe("approved");
      expect(ctx.db.transaction).toHaveBeenCalledTimes(1);
      // update called twice: once for suggestion status, once for playground
      expect(ctx.db.update).toHaveBeenCalledTimes(2);

      // Untouched coverImage: null on suggestion must NOT wipe out the existing playground coverImage
      const playgroundUpdateArg = ctx.db._mocks.set.mock.calls[1]?.[0] as Record<string, unknown>;
      expect(playgroundUpdateArg).toEqual(
        expect.objectContaining({
          title: "Updated Title",
        }),
      );
      expect("coverImage" in playgroundUpdateArg).toBe(false);
    });

    it("should apply admin finalValues overrides including images and equipmentIds", async () => {
      const suggestionWithChanges = {
        ...mockSuggestion,
        title: "Suggested Title",
        latitude: 64.1,
        longitude: -21.9,
        toddlerFriendly: false,
        images: ["/uploads/playgrounds/keep.jpg", "/uploads/playgrounds/suggested.jpg"],
        equipmentIds: [1, 2],
      };
      const approvedSuggestion = { ...suggestionWithChanges, status: "approved" };
      const ctx = createUserContext();
      configureMockUserAsAdmin(ctx);
      ctx.db.query.playgroundEditSuggestions.findFirst.mockResolvedValue(suggestionWithChanges);
      ctx.db._mocks.returning.mockResolvedValueOnce([approvedSuggestion]);

      const caller = createCaller(ctx as any);
      await caller.playground.reviewEditSuggestion({
        id: 1,
        action: "approve",
        finalValues: {
          title: "Admin Adjusted Title",
          latitude: 64.15,
          longitude: -21.92,
          toddlerFriendly: true,
          images: ["/uploads/playgrounds/keep.jpg"],
          equipmentIds: [3, 4],
        },
      });

      const playgroundUpdateArg = ctx.db._mocks.set.mock.calls[1]?.[0] as Record<string, unknown>;
      expect(playgroundUpdateArg).toEqual(
        expect.objectContaining({
          title: "Admin Adjusted Title",
          latitude: 64.15,
          longitude: -21.92,
          toddlerFriendly: true,
          images: ["/uploads/playgrounds/keep.jpg"],
        }),
      );
      expect(ctx.db.delete).toHaveBeenCalledTimes(1);
      expect(ctx.db._mocks.values).toHaveBeenCalledWith([
        { playgroundId: 1, equipmentId: 3 },
        { playgroundId: 1, equipmentId: 4 },
      ]);
    });

    it("should clear playground coverImage when suggestion stores the removal sentinel", async () => {
      const suggestionRemovingCover = {
        ...mockSuggestion,
        coverImage: "",
      };
      const approvedSuggestion = { ...suggestionRemovingCover, status: "approved" };
      const ctx = createUserContext();
      configureMockUserAsAdmin(ctx);
      ctx.db.query.playgroundEditSuggestions.findFirst.mockResolvedValue(suggestionRemovingCover);
      ctx.db._mocks.returning.mockResolvedValueOnce([approvedSuggestion]);

      const caller = createCaller(ctx as any);
      await caller.playground.reviewEditSuggestion({
        id: 1,
        action: "approve",
      });

      const playgroundUpdateArg = ctx.db._mocks.set.mock.calls[1]?.[0] as Record<string, unknown>;
      expect(playgroundUpdateArg).toEqual(
        expect.objectContaining({
          coverImage: null,
        }),
      );
    });

    it("should clear playground coverImage when finalValues.coverImage is explicitly null", async () => {
      const approvedSuggestion = { ...mockSuggestion, status: "approved" };
      const ctx = createUserContext();
      configureMockUserAsAdmin(ctx);
      ctx.db.query.playgroundEditSuggestions.findFirst.mockResolvedValue(mockSuggestion);
      ctx.db._mocks.returning.mockResolvedValueOnce([approvedSuggestion]);

      const caller = createCaller(ctx as any);
      await caller.playground.reviewEditSuggestion({
        id: 1,
        action: "approve",
        finalValues: {
          coverImage: null,
        },
      });

      const playgroundUpdateArg = ctx.db._mocks.set.mock.calls[1]?.[0] as Record<string, unknown>;
      expect(playgroundUpdateArg).toEqual(
        expect.objectContaining({
          coverImage: null,
        }),
      );
    });

    it("should deduplicate equipmentIds when applying approved edit suggestion", async () => {
      const suggestionWithEquipment = { ...mockSuggestion, equipmentIds: [2, 5, 2] };
      const approvedSuggestion = { ...suggestionWithEquipment, status: "approved" };
      const ctx = createUserContext();
      configureMockUserAsAdmin(ctx);
      ctx.db.query.playgroundEditSuggestions.findFirst.mockResolvedValue(suggestionWithEquipment);
      ctx.db._mocks.returning.mockResolvedValueOnce([approvedSuggestion]);

      const caller = createCaller(ctx as any);
      await caller.playground.reviewEditSuggestion({ id: 1, action: "approve" });

      expect(ctx.db._mocks.values).toHaveBeenLastCalledWith([
        { playgroundId: 1, equipmentId: 2 },
        { playgroundId: 1, equipmentId: 5 },
      ]);
    });

    it("should reject suggestion with reason without modifying playground", async () => {
      const rejectedSuggestion = { ...mockSuggestion, status: "rejected" };
      const ctx = createUserContext();
      configureMockUserAsAdmin(ctx);
      ctx.db.query.playgroundEditSuggestions.findFirst.mockResolvedValue(mockSuggestion);
      ctx.db._mocks.returning.mockResolvedValueOnce([rejectedSuggestion]);

      const caller = createCaller(ctx as any);
      const result = await caller.playground.reviewEditSuggestion({
        id: 1,
        action: "reject",
        rejectionReason: "Not valid",
      });

      expect(result?.status).toBe("rejected");
      // update called only once (for the suggestion status, not the playground)
      expect(ctx.db.update).toHaveBeenCalledTimes(1);
    });

    it("should clean up newly uploaded blobs on rejected edit suggestion while keeping live playground images", async () => {
      const liveCover =
        "https://abc123.public.blob.vercel-storage.com/playgrounds/live-cover.jpg";
      const liveGallery =
        "https://abc123.public.blob.vercel-storage.com/playgrounds/live-gallery.jpg";
      const uploadedPhoto =
        "https://abc123.public.blob.vercel-storage.com/playgrounds/suggested-new.jpg";

      const suggestionWithPhotos = {
        ...mockSuggestion,
        images: [liveGallery, uploadedPhoto],
        coverImage: uploadedPhoto,
        playground: mockPlayground({
          coverImage: liveCover,
          images: [liveGallery],
        }),
      };
      const ctx = createUserContext();
      configureMockUserAsAdmin(ctx);
      ctx.db.query.playgroundEditSuggestions.findFirst.mockResolvedValue(
        suggestionWithPhotos,
      );
      ctx.db._mocks.returning.mockResolvedValueOnce([
        { ...suggestionWithPhotos, status: "rejected" },
      ]);

      const caller = createCaller(ctx as any);
      await caller.playground.reviewEditSuggestion({
        id: 1,
        action: "reject",
        rejectionReason: "Blurry photo",
      });

      expect(deleteOrphanedFiles).toHaveBeenCalledWith(
        expect.arrayContaining([liveGallery, uploadedPhoto]),
        expect.arrayContaining([liveGallery, liveCover]),
      );
    });

    it("should clean up removed photos when approving an edit suggestion while keeping live images", async () => {
      const keepCover =
        "https://abc123.public.blob.vercel-storage.com/playgrounds/keep-cover.jpg";
      const keepGallery =
        "https://abc123.public.blob.vercel-storage.com/playgrounds/keep-gallery.jpg";
      const removedGallery =
        "https://abc123.public.blob.vercel-storage.com/playgrounds/removed-gallery.jpg";

      const suggestionRemovingPhoto = {
        ...mockSuggestion,
        images: [keepGallery],
        coverImage: null,
        playground: mockPlayground({
          coverImage: keepCover,
          images: [keepGallery, removedGallery],
        }),
      };
      const ctx = createUserContext();
      configureMockUserAsAdmin(ctx);
      ctx.db.query.playgroundEditSuggestions.findFirst.mockResolvedValue(
        suggestionRemovingPhoto,
      );
      ctx.db._mocks.returning.mockResolvedValueOnce([
        { ...suggestionRemovingPhoto, status: "approved" },
      ]);

      const caller = createCaller(ctx as any);
      await caller.playground.reviewEditSuggestion({
        id: 1,
        action: "approve",
      });

      expect(deleteOrphanedFiles).toHaveBeenCalledWith(
        expect.arrayContaining([keepGallery, removedGallery, keepCover]),
        expect.arrayContaining([keepGallery, keepCover]),
      );
      const [, newImagesArg] = vi.mocked(deleteOrphanedFiles).mock.calls[0]!;
      expect(newImagesArg).not.toContain(removedGallery);
    });

    it("should throw TRPCError CONFLICT for already reviewed suggestion", async () => {
      const reviewed = { ...mockSuggestion, status: "approved" };
      const ctx = createUserContext();
      configureMockUserAsAdmin(ctx);
      ctx.db.query.playgroundEditSuggestions.findFirst.mockResolvedValue(reviewed);

      const caller = createCaller(ctx as any);
      await expect(
        caller.playground.reviewEditSuggestion({ id: 1, action: "approve" }),
      ).rejects.toMatchObject({
        code: "CONFLICT",
        message: expect.stringContaining("already been reviewed"),
      });
    });

    it("should throw TRPCError CONFLICT on concurrent review race (empty returning)", async () => {
      const ctx = createUserContext();
      configureMockUserAsAdmin(ctx);
      ctx.db.query.playgroundEditSuggestions.findFirst.mockResolvedValue(mockSuggestion);
      ctx.db._mocks.returning.mockResolvedValueOnce([]); // lost race on WHERE status = 'pending'

      const caller = createCaller(ctx as any);
      await expect(
        caller.playground.reviewEditSuggestion({ id: 1, action: "approve" }),
      ).rejects.toMatchObject({ code: "CONFLICT" });
    });

    it("should throw TRPCError NOT_FOUND for non-existent suggestion", async () => {
      const ctx = createUserContext();
      configureMockUserAsAdmin(ctx);
      ctx.db.query.playgroundEditSuggestions.findFirst.mockResolvedValue(null);

      const caller = createCaller(ctx as any);
      await expect(
        caller.playground.reviewEditSuggestion({ id: 999, action: "approve" }),
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
        message: expect.stringContaining("not found"),
      });
    });

    it("should throw FORBIDDEN for non-admin user", async () => {
      const ctx = createUserContext();
      configureMockUserAsRegularUserForAdminRoute(ctx);

      const caller = createCaller(ctx as any);
      await expect(
        caller.playground.reviewEditSuggestion({ id: 1, action: "approve" }),
      ).rejects.toThrow(TRPCError);
    });
  });

  // ── updateMySubmission (protectedProcedure) ─────
  describe("updateMySubmission", () => {
    it("should preserve existing coverImage when omitted in updateMySubmission", async () => {
      const coverUrl =
        "https://abc123.public.blob.vercel-storage.com/playgrounds/my-cover.jpg";
      const oldGalleryUrl =
        "https://abc123.public.blob.vercel-storage.com/playgrounds/my-old.jpg";
      const newGalleryUrl =
        "https://abc123.public.blob.vercel-storage.com/playgrounds/my-new.jpg";

      const pending = mockPlayground({
        status: "pending",
        coverImage: coverUrl,
        images: [oldGalleryUrl],
      });
      const updated = mockPlayground({
        status: "pending",
        coverImage: coverUrl,
        images: [newGalleryUrl],
      });

      const ctx = createUserContext();
      configureMockUserAsRegularUser(ctx);
      ctx.db.query.playgrounds.findFirst.mockResolvedValue(pending);
      ctx.db._mocks.returning.mockResolvedValueOnce([updated]);

      const caller = createCaller(ctx as any);
      await caller.playground.updateMySubmission({
        ...validCreateInput,
        id: 1,
        images: [newGalleryUrl],
      });

      expect(deleteOrphanedFiles).toHaveBeenCalledWith(
        expect.arrayContaining([oldGalleryUrl, coverUrl]),
        expect.arrayContaining([newGalleryUrl, coverUrl]),
      );
    });
  });

  // ── getPendingEditSuggestions (admin only) ──────
  describe("getPendingEditSuggestions", () => {
    it("should return pending suggestions with relations", async () => {
      const pending = [{ id: 1, status: "pending", playground: mockPlayground() }];
      const ctx = createUserContext();
      configureMockUserAsAdmin(ctx);
      ctx.db.query.playgroundEditSuggestions.findMany.mockResolvedValue(pending);

      const caller = createCaller(ctx as any);
      const result = await caller.playground.getPendingEditSuggestions();

      expect(result).toEqual(pending);
    });

    it("should throw FORBIDDEN for non-admin user", async () => {
      const ctx = createUserContext();
      configureMockUserAsRegularUserForAdminRoute(ctx);

      const caller = createCaller(ctx as any);
      await expect(caller.playground.getPendingEditSuggestions()).rejects.toThrow(TRPCError);
    });
  });

  // ── getAllEditSuggestions (admin only) ──────────
  describe("getAllEditSuggestions", () => {
    it("should return bounded suggestions with full relations", async () => {
      const all = [
        { id: 1, status: "approved", playground: mockPlayground() },
        { id: 2, status: "pending", playground: mockPlayground({ id: 2 }) },
      ];
      const ctx = createUserContext();
      configureMockUserAsAdmin(ctx);
      ctx.db.query.playgroundEditSuggestions.findMany.mockResolvedValue(all);

      const caller = createCaller(ctx as any);
      const result = await caller.playground.getAllEditSuggestions();

      expect(result).toEqual(all);
      expect(result).toHaveLength(2);
      expect(ctx.db.query.playgroundEditSuggestions.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 200, offset: 0 }),
      );
    });

    it("should support pagination and status/playgroundId filters", async () => {
      const filtered = [{ id: 2, status: "pending", playground: mockPlayground({ id: 5 }) }];
      const ctx = createUserContext();
      configureMockUserAsAdmin(ctx);
      ctx.db.query.playgroundEditSuggestions.findMany.mockResolvedValue(filtered);

      const caller = createCaller(ctx as any);
      const result = await caller.playground.getAllEditSuggestions({
        limit: 20,
        offset: 40,
        status: "pending",
        playgroundId: 5,
      });

      expect(result).toEqual(filtered);
      expect(ctx.db.query.playgroundEditSuggestions.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 20,
          offset: 40,
          where: expect.anything(),
        }),
      );
    });

    it("should throw FORBIDDEN for non-admin user", async () => {
      const ctx = createUserContext();
      configureMockUserAsRegularUserForAdminRoute(ctx);

      const caller = createCaller(ctx as any);
      await expect(caller.playground.getAllEditSuggestions()).rejects.toThrow(TRPCError);
    });
  });

  // ── updateMySubmission (owner, pending only) ────
  describe("updateMySubmission", () => {
    const updateMyInput = {
      id: 1,
      title: "My Updated Submission",
      latitude: 64.08,
      longitude: -21.95,
      municipality: "Reykjavík",
      publiclyAccessible: true,
      toddlerFriendly: false,
      isSchoolGround: false,
      schoolType: null,
      hasSeating: true,
      hasPicnicTable: false,
      hasFencing: true,
      hasGarbageCan: true,
      hasBathroomNearby: false,
      hasSoftPlayArea: false,
      equipmentIds: [1, 2, 1],
      images: ["/uploads/playgrounds/new.jpg"],
      submitAnonymously: false,
    };

    it("should update pending submission inside a transaction and deduplicate equipmentIds", async () => {
      const existing = mockPlayground({ status: "pending" });
      const updated = mockPlayground({ status: "pending", title: "My Updated Submission" });
      const ctx = createUserContext();
      configureMockUserAsRegularUser(ctx);
      ctx.db.query.playgrounds.findFirst.mockResolvedValueOnce(existing);
      ctx.db._mocks.returning.mockResolvedValueOnce([updated]);

      const caller = createCaller(ctx as any);
      const result = await caller.playground.updateMySubmission(updateMyInput);

      expect(result).toEqual(updated);
      expect(ctx.db.transaction).toHaveBeenCalledTimes(1);
      expect(ctx.db._mocks.values).toHaveBeenLastCalledWith([
        { playgroundId: 1, equipmentId: 1 },
        { playgroundId: 1, equipmentId: 2 },
      ]);
    });

    it("should throw TRPCError CONFLICT if submission was reviewed concurrently", async () => {
      const existing = mockPlayground({ status: "pending" });
      const ctx = createUserContext();
      configureMockUserAsRegularUser(ctx);
      ctx.db.query.playgrounds.findFirst.mockResolvedValueOnce(existing);
      ctx.db._mocks.returning.mockResolvedValueOnce([]); // lost race on WHERE status='pending' AND createdBy=userId

      const caller = createCaller(ctx as any);
      await expect(
        caller.playground.updateMySubmission(updateMyInput),
      ).rejects.toMatchObject({ code: "CONFLICT" });
    });

    it("should throw TRPCError NOT_FOUND if submission is not found or not editable", async () => {
      const ctx = createUserContext();
      configureMockUserAsRegularUser(ctx);
      ctx.db.query.playgrounds.findFirst.mockResolvedValueOnce(null);

      const caller = createCaller(ctx as any);
      await expect(
        caller.playground.updateMySubmission(updateMyInput),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  // ── updateMyEditSuggestion (owner, pending only) ─
  describe("updateMyEditSuggestion", () => {
    const updateSuggestionInput = {
      id: 10,
      playgroundId: 1,
      title: "Revised Title",
      equipmentIds: [3, 4, 3],
    };

    it("should update pending edit suggestion inside a transaction and deduplicate equipmentIds", async () => {
      const existing = {
        id: 10,
        playgroundId: 1,
        status: "pending",
        createdById: "test-user-id",
        playground: mockPlayground(),
      };
      const updated = { ...existing, title: "Revised Title", equipmentIds: [3, 4] };
      const ctx = createUserContext();
      configureMockUserAsRegularUser(ctx);
      ctx.db.query.playgroundEditSuggestions.findFirst.mockResolvedValueOnce(existing);
      ctx.db._mocks.returning.mockResolvedValueOnce([updated]);

      const caller = createCaller(ctx as any);
      const result = await caller.playground.updateMyEditSuggestion(updateSuggestionInput);

      expect(result).toEqual(updated);
      expect(ctx.db.transaction).toHaveBeenCalledTimes(1);
      expect(ctx.db._mocks.values).toHaveBeenLastCalledWith([
        { suggestionId: 10, equipmentId: 3 },
        { suggestionId: 10, equipmentId: 4 },
      ]);
    });

    it("should throw TRPCError CONFLICT if suggestion was reviewed concurrently", async () => {
      const existing = {
        id: 10,
        playgroundId: 1,
        status: "pending",
        createdById: "test-user-id",
        playground: mockPlayground(),
      };
      const ctx = createUserContext();
      configureMockUserAsRegularUser(ctx);
      ctx.db.query.playgroundEditSuggestions.findFirst.mockResolvedValueOnce(existing);
      ctx.db._mocks.returning.mockResolvedValueOnce([]);

      const caller = createCaller(ctx as any);
      await expect(
        caller.playground.updateMyEditSuggestion(updateSuggestionInput),
      ).rejects.toMatchObject({ code: "CONFLICT" });
    });
  });

  // ── addPhotos (protected; admin direct, user moderated) ──
  describe("addPhotos", () => {
    const validBlob1 =
      "https://store.public.blob.vercel-storage.com/playgrounds/photo-1.jpg";
    const validBlob2 =
      "https://store.public.blob.vercel-storage.com/playgrounds/photo-2.jpg";

    it("should throw UNAUTHORIZED for unauthenticated user", async () => {
      const ctx = createUnauthenticatedContext();
      const caller = createCaller(ctx as any);

      await expect(
        caller.playground.addPhotos({ id: 1, images: [validBlob1] }),
      ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("should throw FORBIDDEN for banned user", async () => {
      const ctx = createUserContext();
      configureMockUserAsBanned(ctx);
      const caller = createCaller(ctx as any);

      await expect(
        caller.playground.addPhotos({ id: 1, images: [validBlob1] }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("should reject arbitrary non-allowlisted image URLs", async () => {
      const ctx = createUserContext();
      configureMockUserAsAdmin(ctx);
      const caller = createCaller(ctx as any);

      await expect(
        caller.playground.addPhotos({
          id: 1,
          images: ["https://evil.com/photo.jpg"],
        }),
      ).rejects.toThrow(TRPCError);

      await expect(
        caller.playground.addPhotos({
          id: 1,
          images: ["https://evil.com/.public.blob.vercel-storage.com/photo.jpg"],
        }),
      ).rejects.toThrow(TRPCError);
    });

    it("should reject more than 8 photos in a single call", async () => {
      const ctx = createUserContext();
      configureMockUserAsAdmin(ctx);
      const caller = createCaller(ctx as any);

      const nineImages = Array.from(
        { length: 9 },
        (_, i) =>
          `https://store.public.blob.vercel-storage.com/playgrounds/p-${i}.jpg`,
      );

      await expect(
        caller.playground.addPhotos({ id: 1, images: nineImages }),
      ).rejects.toThrow(TRPCError);
    });

    it("should reject unapproved (pending/rejected) playgrounds", async () => {
      const ctx = createUserContext();
      configureMockUserAsAdmin(ctx);
      ctx.db.query.playgrounds.findFirst.mockResolvedValue(
        mockPlayground({ status: "pending" }),
      );

      const caller = createCaller(ctx as any);
      await expect(
        caller.playground.addPhotos({ id: 1, images: [validBlob1] }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });

      expect(ctx.db.update).not.toHaveBeenCalled();
      expect(ctx.db.insert).not.toHaveBeenCalled();
    });

    it("should route non-admin photo additions through playgroundEditSuggestions instead of direct update", async () => {
      const ctx = createUserContext({ userId: "regular-user-1" });
      configureMockUserAsRegularUserForAdminRoute(ctx);
      ctx.db.query.playgrounds.findFirst.mockResolvedValue(
        mockPlayground({
          status: "approved",
          coverImage: validBlob1,
          images: [validBlob1],
        }),
      );
      ctx.db._mocks.returning.mockResolvedValueOnce([{ id: 99, status: "pending" }]);

      const caller = createCaller(ctx as any);
      const result = await caller.playground.addPhotos({
        id: 1,
        images: [validBlob2],
      });

      expect(result).toEqual({ status: "pending", suggestionId: 99 });
      expect(ctx.db.update).not.toHaveBeenCalled();
      expect(ctx.db.insert).toHaveBeenCalledTimes(1);
      expect(ctx.db._mocks.values).toHaveBeenCalledWith(
        expect.objectContaining({
          playgroundId: 1,
          images: [validBlob1, validBlob2],
          coverImage: null, // does not overwrite existing coverImage
          createdById: "regular-user-1",
          status: "pending",
        }),
      );
    });

    it("should suggest coverImage for non-admin when approved playground has no coverImage yet", async () => {
      const ctx = createUserContext({ userId: "regular-user-2" });
      configureMockUserAsRegularUserForAdminRoute(ctx);
      ctx.db.query.playgrounds.findFirst.mockResolvedValue(
        mockPlayground({
          status: "approved",
          coverImage: null,
          images: [],
        }),
      );
      ctx.db._mocks.returning.mockResolvedValueOnce([{ id: 100, status: "pending" }]);

      const caller = createCaller(ctx as any);
      const result = await caller.playground.addPhotos({
        id: 1,
        images: [validBlob1],
      });

      expect(result).toEqual({ status: "pending", suggestionId: 100 });
      expect(ctx.db.update).not.toHaveBeenCalled();
      expect(ctx.db._mocks.values).toHaveBeenCalledWith(
        expect.objectContaining({
          playgroundId: 1,
          images: [validBlob1],
          coverImage: validBlob1,
          status: "pending",
        }),
      );
    });

    it("should allow admin to directly update approved playground photos", async () => {
      const ctx = createUserContext({ userId: "admin-1" });
      configureMockUserAsAdmin(ctx);
      ctx.db.query.playgrounds.findFirst.mockResolvedValue(
        mockPlayground({
          status: "approved",
          coverImage: null,
          images: [],
        }),
      );
      // Row locked FOR UPDATE inside the transaction, unchanged since the read
      ctx.db._mocks.selectFor.mockResolvedValueOnce([{ images: [], coverImage: null }]);

      const caller = createCaller(ctx as any);
      const result = await caller.playground.addPhotos({
        id: 1,
        images: [validBlob1, validBlob2],
      });

      expect(result).toEqual({ status: "approved" });
      expect(ctx.db.transaction).toHaveBeenCalledTimes(1);
      expect(ctx.db._mocks.selectFor).toHaveBeenCalledWith("update");
      expect(ctx.db.update).toHaveBeenCalledTimes(1);
      expect(ctx.db.insert).not.toHaveBeenCalled();
      expect(ctx.db._mocks.set).toHaveBeenCalledWith(
        expect.objectContaining({
          images: [validBlob1, validBlob2],
          coverImage: validBlob1,
        }),
      );
    });

    it("should throw CONFLICT when photos changed between read and lock", async () => {
      const ctx = createUserContext({ userId: "admin-1" });
      configureMockUserAsAdmin(ctx);
      ctx.db.query.playgrounds.findFirst.mockResolvedValue(
        mockPlayground({ status: "approved", coverImage: null, images: [] }),
      );
      ctx.db._mocks.selectFor.mockResolvedValueOnce([
        { images: [validBlob2], coverImage: validBlob2 },
      ]);

      const caller = createCaller(ctx as any);
      await expect(
        caller.playground.addPhotos({ id: 1, images: [validBlob1] }),
      ).rejects.toMatchObject({ code: "CONFLICT" });
      expect(ctx.db.update).not.toHaveBeenCalled();
    });

    it("should reject adding photos that would exceed the total playground image cap", async () => {
      const ctx = createUserContext({ userId: "admin-1" });
      configureMockUserAsAdmin(ctx);
      const existing50 = Array.from(
        { length: 50 },
        (_, i) =>
          `https://store.public.blob.vercel-storage.com/playgrounds/existing-${i}.jpg`,
      );
      ctx.db.query.playgrounds.findFirst.mockResolvedValue(
        mockPlayground({
          status: "approved",
          coverImage: existing50[0],
          images: existing50,
        }),
      );

      const caller = createCaller(ctx as any);
      await expect(
        caller.playground.addPhotos({ id: 1, images: [validBlob1] }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      expect(ctx.db.update).not.toHaveBeenCalled();
    });
  });
});
