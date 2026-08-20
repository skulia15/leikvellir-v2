// server/api/routers/checkin.ts
import { z } from "zod";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { checkIns, playgrounds, users } from "~/server/db/schema";
import {
  CreateCheckInSchema,
  GetLeaderboardSchema,
  UpdateLeaderboardProfileSchema,
  type CheckInResult,
  type LeaderboardProfile,
  type LeaderboardResponse,
  type LeaderboardRow,
  type PlaygroundCheckInStats,
  type UpdateLeaderboardProfileResult,
} from "~/types";
import { calculateDistance } from "~/lib/geo-utils";
import { logger } from "~/lib/logging/logger";
import {
  allowedRadiusMeters,
  icelandDateString,
  judgeHop,
  MAX_ACCEPTABLE_ACCURACY_METERS,
  MAX_CHECK_INS_PER_USER_PER_DAY,
} from "~/server/api/checkin-rules";

/** count(*) as an int — Postgres returns bigint, which arrives as a string. */
const countAll = sql<number>`count(*)::int`;

/** Postgres unique_violation. */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505"
  );
}

export const checkInRouter = createTRPCRouter({
  /**
   * Record a visit. The client sends where it thinks it is; the server decides
   * whether that is near enough. A client-computed distance is never accepted,
   * because the whole check is worthless if the thing being checked is supplied
   * by the party being checked.
   */
  create: protectedProcedure
    .input(CreateCheckInSchema)
    .mutation(async ({ ctx, input }): Promise<CheckInResult> => {
      const userId = ctx.session.user.id;
      const accuracyMeters = Math.round(input.accuracy);

      // A fix this vague can never succeed, so reject before paying for a read.
      if (accuracyMeters > MAX_ACCEPTABLE_ACCURACY_METERS) {
        return { status: "accuracy_too_poor", accuracyMeters };
      }

      const playground = await ctx.db.query.playgrounds.findFirst({
        where: eq(playgrounds.id, input.playgroundId),
        columns: { id: true, latitude: true, longitude: true, status: true },
      });

      if (!playground) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Playground not found" });
      }
      if (playground.status !== "approved") {
        return { status: "not_available" };
      }

      // calculateDistance returns KILOMETRES.
      const distanceMeters = Math.round(
        calculateDistance(
          input.latitude,
          input.longitude,
          playground.latitude,
          playground.longitude,
        ) * 1000,
      );
      const allowedMeters = allowedRadiusMeters(accuracyMeters);

      if (distanceMeters > allowedMeters) {
        return { status: "too_far", distanceMeters, allowedMeters };
      }

      const checkInDate = icelandDateString();

      // Coarse abuse ceiling. The per-playground cooldown below is the real
      // constraint; this only bounds someone sweeping many playgrounds at once.
      const [todayTotal] = await ctx.db
        .select({ n: countAll })
        .from(checkIns)
        .where(and(eq(checkIns.userId, userId), eq(checkIns.checkInDate, checkInDate)));

      if ((todayTotal?.n ?? 0) >= MAX_CHECK_INS_PER_USER_PER_DAY) {
        return { status: "daily_limit_reached" };
      }

      // Teleport detection. Uses only playground coordinates — public data we
      // already hold — so no user position ever needs storing.
      const [previous] = await ctx.db
        .select({
          createdAt: checkIns.createdAt,
          latitude: playgrounds.latitude,
          longitude: playgrounds.longitude,
        })
        .from(checkIns)
        .innerJoin(playgrounds, eq(checkIns.playgroundId, playgrounds.id))
        .where(eq(checkIns.userId, userId))
        .orderBy(desc(checkIns.createdAt))
        .limit(1);

      let isFlagged = false;
      let impliedSpeedKmh: number | null = null;

      if (previous) {
        const hopKm = calculateDistance(
          previous.latitude,
          previous.longitude,
          playground.latitude,
          playground.longitude,
        );
        const gapSeconds = (Date.now() - previous.createdAt.getTime()) / 1000;
        const verdict = judgeHop(hopKm, gapSeconds);
        isFlagged = verdict.isFlagged;
        impliedSpeedKmh = verdict.impliedSpeedKmh;
      }

      // The unique index is the cooldown. onConflictDoNothing turns a
      // concurrent double-submit into a clean "already checked in" rather than
      // a 500, with no read-then-write race to lose.
      const inserted = await ctx.db
        .insert(checkIns)
        .values({
          userId,
          playgroundId: playground.id,
          checkInDate,
          distanceMeters,
          accuracyMeters,
          isFlagged,
          flagReason: isFlagged ? "implausible_speed" : null,
          impliedSpeedKmh,
        })
        .onConflictDoNothing({
          target: [checkIns.userId, checkIns.playgroundId, checkIns.checkInDate],
        })
        .returning({ id: checkIns.id });

      const row = inserted[0];
      if (!row) {
        return { status: "already_checked_in_today" };
      }

      const [totals] = await ctx.db
        .select({ n: countAll })
        .from(checkIns)
        .where(eq(checkIns.playgroundId, playground.id));

      logger.info("Check-in created", {
        component: "CheckInRouter",
        action: "create_check_in",
        userId,
        // No coordinates here, by design.
        metadata: { playgroundId: playground.id, distanceMeters, accuracyMeters, isFlagged },
      });

      // isFlagged is deliberately not returned: a user who learns they were
      // flagged learns where the threshold is.
      return {
        status: "success",
        checkInId: row.id,
        distanceMeters,
        totalCheckIns: totals?.n ?? 1,
      };
    }),

  /** Public so the counter renders for signed-out visitors too. */
  getPlaygroundStats: publicProcedure
    .input(z.object({ playgroundId: z.number().int().positive() }))
    .query(async ({ ctx, input }): Promise<PlaygroundCheckInStats> => {
      const [totals] = await ctx.db
        .select({
          total: countAll,
          unique: sql<number>`count(distinct ${checkIns.userId})::int`,
        })
        .from(checkIns)
        .where(eq(checkIns.playgroundId, input.playgroundId));

      const userId = ctx.session?.user?.id;
      if (!userId) {
        return {
          totalCheckIns: totals?.total ?? 0,
          uniqueVisitors: totals?.unique ?? 0,
          viewerCheckedInToday: false,
          viewerHasEverCheckedIn: false,
        };
      }

      const mine = await ctx.db
        .select({ checkInDate: checkIns.checkInDate })
        .from(checkIns)
        .where(
          and(eq(checkIns.playgroundId, input.playgroundId), eq(checkIns.userId, userId)),
        )
        .orderBy(desc(checkIns.checkInDate))
        .limit(1);

      const latest = mine[0];
      return {
        totalCheckIns: totals?.total ?? 0,
        uniqueVisitors: totals?.unique ?? 0,
        viewerCheckedInToday: latest?.checkInDate === icelandDateString(),
        viewerHasEverCheckedIn: Boolean(latest),
      };
    }),

  /** Drives the visited badge on map pins. */
  getMyPlaygroundIds: protectedProcedure.query(async ({ ctx }): Promise<number[]> => {
    const rows = await ctx.db
      .selectDistinct({ playgroundId: checkIns.playgroundId })
      .from(checkIns)
      .where(eq(checkIns.userId, ctx.session.user.id));

    return rows.map((row) => row.playgroundId);
  }),

  /**
   * Public: the boards are readable signed-out, which is what makes them worth
   * competing on.
   *
   * Ranking is done in JS over every opted-in user rather than in SQL. Opted-in
   * users are a small, self-selected subset, and having the whole ordered set
   * in hand is what lets the caller see their own standing without a second
   * query. If that population ever grows past a few thousand, move the ranking
   * into a window function.
   */
  getLeaderboard: publicProcedure
    .input(GetLeaderboardSchema)
    .query(async ({ ctx, input }): Promise<LeaderboardResponse> => {
      const score =
        input.board === "explorers"
          ? sql<number>`count(distinct ${checkIns.playgroundId})::int`
          : countAll;

      const scored = await ctx.db
        .select({
          userId: checkIns.userId,
          displayName: users.leaderboardName,
          score,
        })
        .from(checkIns)
        .innerJoin(users, eq(checkIns.userId, users.id))
        .where(
          and(
            // Flagged check-ins never score. They still count toward a
            // playground's visitor total, but they do not win anything.
            eq(checkIns.isFlagged, false),
            eq(users.leaderboardOptIn, true),
            eq(users.isBanned, false),
          ),
        )
        .groupBy(checkIns.userId, users.leaderboardName)
        .orderBy(desc(score));

      const viewerId = ctx.session?.user?.id;

      // Dense ranking: equal scores share a rank, and the next distinct score
      // follows immediately rather than skipping.
      let rank = 0;
      let previousScore: number | null = null;
      const ranked: LeaderboardRow[] = scored.map((row) => {
        if (row.score !== previousScore) {
          rank += 1;
          previousScore = row.score;
        }
        return {
          rank,
          displayName: row.displayName ?? "",
          score: row.score,
          isMe: row.userId === viewerId,
        };
      });

      const rows = ranked.slice(0, input.limit);
      const mine = ranked.find((row) => row.isMe) ?? null;

      return {
        rows,
        // Only worth returning when they fell outside the visible slice.
        me: mine && !rows.includes(mine) ? mine : null,
      };
    }),

  getMyLeaderboardProfile: protectedProcedure.query(
    async ({ ctx }): Promise<LeaderboardProfile> => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.session.user.id),
        columns: { leaderboardOptIn: true, leaderboardName: true },
      });

      return {
        optIn: user?.leaderboardOptIn ?? false,
        displayName: user?.leaderboardName ?? null,
      };
    },
  ),

  updateLeaderboardProfile: protectedProcedure
    .input(UpdateLeaderboardProfileSchema)
    .mutation(async ({ ctx, input }): Promise<UpdateLeaderboardProfileResult> => {
      const userId = ctx.session.user.id;

      const existing = await ctx.db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { leaderboardName: true },
      });

      const displayName = input.displayName ?? existing?.leaderboardName ?? null;

      // Opting in without a name would put a blank row on a public board.
      if (input.optIn && !displayName) {
        return { status: "name_required" };
      }

      const normalized = displayName?.toLowerCase() ?? null;

      if (normalized) {
        const clash = await ctx.db.query.users.findFirst({
          where: and(
            eq(users.leaderboardNameNormalized, normalized),
            ne(users.id, userId),
          ),
          columns: { id: true },
        });
        if (clash) return { status: "name_taken" };
      }

      try {
        await ctx.db
          .update(users)
          .set({
            leaderboardOptIn: input.optIn,
            leaderboardName: displayName,
            leaderboardNameNormalized: normalized,
          })
          .where(eq(users.id, userId));
      } catch (error) {
        // The check above is advisory; the unique index is what actually
        // decides, and two people can pick the same name at the same moment.
        if (isUniqueViolation(error)) return { status: "name_taken" };
        throw error;
      }

      return { status: "ok" };
    }),
});
