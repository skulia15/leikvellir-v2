// __tests__/api/checkin.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "~/server/api/root";
import { createCallerFactory } from "~/server/api/trpc";

vi.mock("~/server/db", () => ({ db: {} }));
vi.mock("~/server/auth", () => ({ getServerAuthSession: vi.fn() }));
vi.mock("~/lib/logging/logger", () => ({
  logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
  logDbError: vi.fn(),
}));

const createCaller = createCallerFactory(appRouter);

/**
 * The shared db-mock in ~/test/db-mock has no onConflictDoNothing, innerJoin
 * or limit chain, and four other suites depend on its exact shape — so this
 * suite builds its own fake rather than widening a helper it does not own.
 */
function createCheckInDb(options: {
  playground?: { id: number; latitude: number; longitude: number; status: string } | null;
  /** Rows already recorded today, for the daily-volume guard. */
  todayCount?: number;
  /** The user's previous check-in, as the teleport check sees it. */
  previous?: { createdAt: Date; latitude: number; longitude: number };
  /** Empty array simulates the unique index rejecting a duplicate. */
  insertReturns?: Array<{ id: number }>;
  totalForPlayground?: number;
}) {
  const {
    playground = { id: 1, latitude: 64.0708, longitude: -21.9554, status: "approved" },
    todayCount = 0,
    previous,
    insertReturns = [{ id: 42 }],
    totalForPlayground = 1,
  } = options;

  const insertedValues = vi.fn();
  const playgroundFindFirst = vi.fn().mockResolvedValue(playground);

  // Keyed off query *shape* rather than call order: only the teleport lookup
  // joins playgrounds, and the two count queries are told apart by sequence.
  let countCall = 0;
  const select = vi.fn(() => {
    let joined = false;

    const resolveRows = (): Promise<unknown[]> => {
      if (joined) return Promise.resolve(previous ? [previous] : []);
      const call = countCall++;
      return Promise.resolve([
        call === 0
          ? { n: todayCount }
          : { n: totalForPlayground, total: totalForPlayground, unique: totalForPlayground },
      ]);
    };

    const chain = {
      from: () => chain,
      innerJoin: () => {
        joined = true;
        return chain;
      },
      where: () => chain,
      orderBy: () => chain,
      limit: () => resolveRows(),
      then: (...args: Parameters<Promise<unknown[]>["then"]>) =>
        resolveRows().then(...args),
    };
    return chain;
  });

  return {
    query: {
      users: { findFirst: vi.fn().mockResolvedValue({ id: "test-user-id", isBanned: false }) },
      playgrounds: { findFirst: playgroundFindFirst },
    },
    select,
    insert: vi.fn(() => ({
      values: (v: unknown) => {
        insertedValues(v);
        return {
          onConflictDoNothing: () => ({ returning: () => Promise.resolve(insertReturns) }),
        };
      },
    })),
    _spies: { playgroundFindFirst, insertedValues },
  };
}

function contextFor(db: ReturnType<typeof createCheckInDb>) {
  return {
    db: db as never,
    session: {
      user: { id: "test-user-id", name: "Test", email: "t@test.com", image: null },
      expires: new Date(Date.now() + 86400000).toISOString(),
    },
    headers: new Headers(),
  };
}

// Hafnarfjörður-ish. Roughly 0.001° of latitude is ~111 m.
const PLAYGROUND = { lat: 64.0708, lng: -21.9554 };

describe("checkIn.create — distance validation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("accepts a check-in at the playground", async () => {
    const db = createCheckInDb({});
    const caller = createCaller(contextFor(db));

    const result = await caller.checkIn.create({
      playgroundId: 1,
      latitude: PLAYGROUND.lat,
      longitude: PLAYGROUND.lng,
      accuracy: 10,
    });

    expect(result.status).toBe("success");
  });

  it("rejects a check-in a kilometre away", async () => {
    const db = createCheckInDb({});
    const caller = createCaller(contextFor(db));

    const result = await caller.checkIn.create({
      playgroundId: 1,
      latitude: PLAYGROUND.lat + 0.01, // ~1.1 km north
      longitude: PLAYGROUND.lng,
      accuracy: 10,
    });

    expect(result.status).toBe("too_far");
    if (result.status === "too_far") {
      expect(result.distanceMeters).toBeGreaterThan(1000);
      expect(result.allowedMeters).toBe(160);
    }
  });

  it("widens the radius for a poor-but-usable fix", async () => {
    const db = createCheckInDb({});
    const caller = createCaller(contextFor(db));

    // ~222 m away: outside the 150 m base, inside 150 + 100.
    const result = await caller.checkIn.create({
      playgroundId: 1,
      latitude: PLAYGROUND.lat + 0.002,
      longitude: PLAYGROUND.lng,
      accuracy: 100,
    });

    expect(result.status).toBe("success");
  });

  it("rejects an unusable fix without touching the database", async () => {
    const db = createCheckInDb({});
    const caller = createCaller(contextFor(db));

    const result = await caller.checkIn.create({
      playgroundId: 1,
      latitude: PLAYGROUND.lat,
      longitude: PLAYGROUND.lng,
      accuracy: 201,
    });

    expect(result.status).toBe("accuracy_too_poor");
    // The point of ordering this check first is to avoid the query entirely.
    expect(db._spies.playgroundFindFirst).not.toHaveBeenCalled();
  });

  it("refuses check-ins to a playground that is not approved", async () => {
    const db = createCheckInDb({
      playground: { id: 1, latitude: PLAYGROUND.lat, longitude: PLAYGROUND.lng, status: "pending" },
    });
    const caller = createCaller(contextFor(db));

    const result = await caller.checkIn.create({
      playgroundId: 1,
      latitude: PLAYGROUND.lat,
      longitude: PLAYGROUND.lng,
      accuracy: 10,
    });

    expect(result.status).toBe("not_available");
  });
});

describe("checkIn.create — cooldown and limits", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reports an existing same-day check-in rather than throwing", async () => {
    // An empty returning() is what the unique index produces on conflict.
    const db = createCheckInDb({ insertReturns: [] });
    const caller = createCaller(contextFor(db));

    const result = await caller.checkIn.create({
      playgroundId: 1,
      latitude: PLAYGROUND.lat,
      longitude: PLAYGROUND.lng,
      accuracy: 10,
    });

    expect(result.status).toBe("already_checked_in_today");
  });

  it("stops a user sweeping many playgrounds in one day", async () => {
    const db = createCheckInDb({ todayCount: 30 });
    const caller = createCaller(contextFor(db));

    const result = await caller.checkIn.create({
      playgroundId: 1,
      latitude: PLAYGROUND.lat,
      longitude: PLAYGROUND.lng,
      accuracy: 10,
    });

    expect(result.status).toBe("daily_limit_reached");
  });
});

describe("checkIn.create — teleport detection", () => {
  beforeEach(() => vi.clearAllMocks());

  it("flags an impossible hop but still records the check-in", async () => {
    const db = createCheckInDb({
      // Akureyri, ten minutes ago.
      previous: {
        createdAt: new Date(Date.now() - 10 * 60 * 1000),
        latitude: 65.6835,
        longitude: -18.1262,
      },
    });
    const caller = createCaller(contextFor(db));

    const result = await caller.checkIn.create({
      playgroundId: 1,
      latitude: PLAYGROUND.lat,
      longitude: PLAYGROUND.lng,
      accuracy: 10,
    });

    expect(result.status).toBe("success");
    expect(db._spies.insertedValues).toHaveBeenCalledWith(
      expect.objectContaining({ isFlagged: true, flagReason: "implausible_speed" }),
    );
  });

  it("does not flag the same trip made overnight", async () => {
    const db = createCheckInDb({
      previous: {
        createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
        latitude: 65.6835,
        longitude: -18.1262,
      },
    });
    const caller = createCaller(contextFor(db));

    await caller.checkIn.create({
      playgroundId: 1,
      latitude: PLAYGROUND.lat,
      longitude: PLAYGROUND.lng,
      accuracy: 10,
    });

    expect(db._spies.insertedValues).toHaveBeenCalledWith(
      expect.objectContaining({ isFlagged: false, flagReason: null }),
    );
  });

  it("never reveals the flag to the client", async () => {
    const db = createCheckInDb({
      previous: {
        createdAt: new Date(Date.now() - 60 * 1000),
        latitude: 65.6835,
        longitude: -18.1262,
      },
    });
    const caller = createCaller(contextFor(db));

    const result = await caller.checkIn.create({
      playgroundId: 1,
      latitude: PLAYGROUND.lat,
      longitude: PLAYGROUND.lng,
      accuracy: 10,
    });

    expect(result).not.toHaveProperty("isFlagged");
  });
});

describe("checkIn.create — privacy", () => {
  beforeEach(() => vi.clearAllMocks());

  it("never persists the reported coordinates", async () => {
    const db = createCheckInDb({});
    const caller = createCaller(contextFor(db));

    await caller.checkIn.create({
      playgroundId: 1,
      latitude: PLAYGROUND.lat,
      longitude: PLAYGROUND.lng,
      accuracy: 10,
    });

    const written = db._spies.insertedValues.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(written).toBeDefined();
    expect(Object.keys(written)).not.toContain("latitude");
    expect(Object.keys(written)).not.toContain("longitude");
    expect(written.distanceMeters).toBeTypeOf("number");
  });
});

/**
 * The leaderboard query shape differs from create's (it groups instead of
 * limiting), so it gets its own fake rather than more flags on the one above.
 */
function createLeaderboardDb(
  scored: Array<{ userId: string; displayName: string; score: number }>,
) {
  const chain = {
    from: () => chain,
    innerJoin: () => chain,
    where: () => chain,
    groupBy: () => chain,
    orderBy: () => Promise.resolve(scored),
  };

  return {
    query: {
      users: { findFirst: vi.fn().mockResolvedValue({ id: "test-user-id", isBanned: false }) },
    },
    select: vi.fn(() => chain),
  };
}

function publicContextFor(db: unknown) {
  return { db: db as never, session: null, headers: new Headers() };
}

describe("checkIn.getLeaderboard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("ranks highest score first", async () => {
    const db = createLeaderboardDb([
      { userId: "a", displayName: "Alda", score: 12 },
      { userId: "b", displayName: "Bjarki", score: 7 },
    ]);
    const caller = createCaller(publicContextFor(db));

    const result = await caller.checkIn.getLeaderboard({ board: "explorers", limit: 50 });

    expect(result.rows.map((r) => [r.rank, r.displayName])).toEqual([
      [1, "Alda"],
      [2, "Bjarki"],
    ]);
  });

  it("gives tied scores the same rank, without skipping the next one", async () => {
    const db = createLeaderboardDb([
      { userId: "a", displayName: "Alda", score: 9 },
      { userId: "b", displayName: "Bjarki", score: 9 },
      { userId: "c", displayName: "Katla", score: 4 },
    ]);
    const caller = createCaller(publicContextFor(db));

    const result = await caller.checkIn.getLeaderboard({ board: "active", limit: 50 });

    expect(result.rows.map((r) => r.rank)).toEqual([1, 1, 2]);
  });

  it("is readable signed out and marks nobody as the viewer", async () => {
    const db = createLeaderboardDb([{ userId: "a", displayName: "Alda", score: 3 }]);
    const caller = createCaller(publicContextFor(db));

    const result = await caller.checkIn.getLeaderboard({ board: "explorers", limit: 50 });

    expect(result.rows[0]?.isMe).toBe(false);
    expect(result.me).toBeNull();
  });

  it("returns the viewer's own standing when they fall outside the visible slice", async () => {
    const db = createLeaderboardDb([
      { userId: "a", displayName: "Alda", score: 30 },
      { userId: "b", displayName: "Bjarki", score: 20 },
      { userId: "test-user-id", displayName: "Ég", score: 1 },
    ]);
    const caller = createCaller(contextFor(db as never));

    const result = await caller.checkIn.getLeaderboard({ board: "explorers", limit: 2 });

    expect(result.rows).toHaveLength(2);
    expect(result.me).toEqual({ rank: 3, displayName: "Ég", score: 1, isMe: true });
  });

  it("does not duplicate the viewer when they are already visible", async () => {
    const db = createLeaderboardDb([
      { userId: "test-user-id", displayName: "Ég", score: 30 },
    ]);
    const caller = createCaller(contextFor(db as never));

    const result = await caller.checkIn.getLeaderboard({ board: "explorers", limit: 50 });

    expect(result.rows[0]?.isMe).toBe(true);
    expect(result.me).toBeNull();
  });

  it("shows an empty board rather than failing when nobody has opted in", async () => {
    const db = createLeaderboardDb([]);
    const caller = createCaller(publicContextFor(db));

    const result = await caller.checkIn.getLeaderboard({ board: "active", limit: 50 });

    expect(result).toEqual({ rows: [], me: null });
  });
});

describe("checkIn.updateLeaderboardProfile", () => {
  beforeEach(() => vi.clearAllMocks());

  function createProfileDb(options: {
    existingName?: string | null;
    clashingUser?: { id: string } | null;
    updateThrows?: unknown;
  }) {
    const { existingName = null, clashingUser = null, updateThrows } = options;
    let findCall = 0;
    const setSpy = vi.fn();

    return {
      query: {
        users: {
          findFirst: vi.fn().mockImplementation(() => {
            // 1: existing name, 2: clash check (ban state comes from the session)
            findCall += 1;
            if (findCall === 1) return Promise.resolve({ leaderboardName: existingName });
            return Promise.resolve(clashingUser);
          }),
        },
      },
      update: vi.fn(() => ({
        set: (v: unknown) => {
          setSpy(v);
          return {
            where: () => (updateThrows ? Promise.reject(updateThrows) : Promise.resolve([])),
          };
        },
      })),
      _spies: { setSpy },
    };
  }

  it("stores a normalized copy so uniqueness is case-insensitive", async () => {
    const db = createProfileDb({});
    const caller = createCaller(contextFor(db as never));

    const result = await caller.checkIn.updateLeaderboardProfile({
      optIn: true,
      displayName: "Fjallageit",
    });

    expect(result).toEqual({ status: "ok" });
    expect(db._spies.setSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        leaderboardName: "Fjallageit",
        leaderboardNameNormalized: "fjallageit",
        leaderboardOptIn: true,
      }),
    );
  });

  it("rejects a name another user already holds", async () => {
    const db = createProfileDb({ clashingUser: { id: "someone-else" } });
    const caller = createCaller(contextFor(db as never));

    const result = await caller.checkIn.updateLeaderboardProfile({
      optIn: true,
      displayName: "Fjallageit",
    });

    expect(result).toEqual({ status: "name_taken" });
    expect(db._spies.setSpy).not.toHaveBeenCalled();
  });

  it("treats a lost race on the unique index as a taken name, not a crash", async () => {
    const db = createProfileDb({ updateThrows: Object.assign(new Error("dup"), { code: "23505" }) });
    const caller = createCaller(contextFor(db as never));

    const result = await caller.checkIn.updateLeaderboardProfile({
      optIn: true,
      displayName: "Fjallageit",
    });

    expect(result).toEqual({ status: "name_taken" });
  });

  it("refuses to opt in without a name, which would put a blank row on the board", async () => {
    const db = createProfileDb({ existingName: null });
    const caller = createCaller(contextFor(db as never));

    const result = await caller.checkIn.updateLeaderboardProfile({ optIn: true });

    expect(result).toEqual({ status: "name_required" });
  });

  it("lets an already-named user leave without resupplying their name", async () => {
    const db = createProfileDb({ existingName: "Fjallageit" });
    const caller = createCaller(contextFor(db as never));

    const result = await caller.checkIn.updateLeaderboardProfile({ optIn: false });

    expect(result).toEqual({ status: "ok" });
    expect(db._spies.setSpy).toHaveBeenCalledWith(
      expect.objectContaining({ leaderboardOptIn: false, leaderboardName: "Fjallageit" }),
    );
  });

  it("rejects a name with markup before it reaches the database", async () => {
    const db = createProfileDb({});
    const caller = createCaller(contextFor(db as never));

    await expect(
      caller.checkIn.updateLeaderboardProfile({
        optIn: true,
        displayName: "<script>alert(1)</script>",
      }),
    ).rejects.toThrow();
  });
});
