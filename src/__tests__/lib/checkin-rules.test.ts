// __tests__/lib/checkin-rules.test.ts
import { describe, it, expect } from "vitest";
import {
  allowedRadiusMeters,
  icelandDateString,
  judgeHop,
  BASE_RADIUS_METERS,
  MAX_RECORDED_SPEED_KMH,
} from "~/server/api/checkin-rules";

describe("allowedRadiusMeters", () => {
  it("uses the base radius for a perfect fix", () => {
    expect(allowedRadiusMeters(0)).toBe(BASE_RADIUS_METERS);
  });

  it("widens by the reported accuracy so a mediocre fix is not falsely rejected", () => {
    expect(allowedRadiusMeters(50)).toBe(200);
  });

  it("caps the allowance so a huge claimed accuracy cannot buy an arbitrary radius", () => {
    expect(allowedRadiusMeters(100)).toBe(250);
    expect(allowedRadiusMeters(5000)).toBe(250);
  });
});

describe("icelandDateString", () => {
  it("formats as YYYY-MM-DD", () => {
    expect(icelandDateString(new Date("2026-03-15T12:00:00Z"))).toBe("2026-03-15");
  });

  it("keeps late-evening check-ins on the same Icelandic day", () => {
    // Iceland stays on UTC year-round, so 23:30Z is still the 15th locally.
    expect(icelandDateString(new Date("2026-03-15T23:30:00Z"))).toBe("2026-03-15");
  });

  it("rolls over at Icelandic midnight, not the caller's", () => {
    expect(icelandDateString(new Date("2026-03-16T00:30:00Z"))).toBe("2026-03-16");
  });

  it("does not shift during northern-hemisphere summer (Iceland has no DST)", () => {
    expect(icelandDateString(new Date("2026-07-01T23:30:00Z"))).toBe("2026-07-01");
  });
});

describe("judgeHop", () => {
  const HOUR = 3600;

  it("ignores short hops, where the playground-proxy error could dominate", () => {
    // 300 m in 10 s is ~108 km/h, but both positions carry up to ~250 m of
    // error, so the number is meaningless at this distance.
    expect(judgeHop(0.3, 10)).toEqual({ isFlagged: false, impliedSpeedKmh: null });
  });

  it("flags a meaningful hop completed in under two minutes", () => {
    expect(judgeHop(5, 30)).toEqual({
      isFlagged: true,
      impliedSpeedKmh: MAX_RECORDED_SPEED_KMH,
    });
  });

  it("flags Reykjavík-to-Akureyri in half an hour", () => {
    const verdict = judgeHop(400, 0.5 * HOUR);
    expect(verdict.isFlagged).toBe(true);
    expect(verdict.impliedSpeedKmh).toBe(800);
  });

  it("accepts the same trip made by road", () => {
    const verdict = judgeHop(400, 6 * HOUR);
    expect(verdict.isFlagged).toBe(false);
    expect(verdict.impliedSpeedKmh).toBe(67);
  });

  it("accepts an ordinary drive between two playgrounds", () => {
    // 8 km in 20 minutes — 24 km/h, a normal urban trip.
    expect(judgeHop(8, 20 * 60).isFlagged).toBe(false);
  });

  it("records a speed even when it does not flag, so borderline cases are auditable", () => {
    expect(judgeHop(10, HOUR).impliedSpeedKmh).toBe(10);
  });
});
