/**
 * Rules governing when a check-in is accepted, and when it is flagged.
 *
 * Kept apart from the router so the arithmetic is unit-testable without a
 * database, and so the thresholds sit in one place where they can be argued
 * about rather than scattered through query code.
 *
 * None of this makes check-ins tamper-proof. Browser geolocation can be
 * overridden from DevTools in two clicks, so the goal is only to make casual
 * cheating inconvenient and keep the leaderboards in the "fun" category.
 */

/** Generous enough for a large playground plus ordinary urban GPS drift. */
export const BASE_RADIUS_METERS = 150;

/** Extra slack granted for the device's own reported accuracy radius. */
export const MAX_ACCURACY_ALLOWANCE_METERS = 100;

/** Beyond this the fix cannot tell "at the playground" from "somewhere nearby". */
export const MAX_ACCEPTABLE_ACCURACY_METERS = 200;

/**
 * Implied travel speed above which a check-in is flagged. Reykjavík→Akureyri
 * by road is ~390 km over ~5 h (~78 km/h), comfortably under. The known false
 * positive is the domestic flight (~250 km in ~45 min, ~330 km/h); that is
 * accepted rather than whitelisted, because a "plausible flight" exemption
 * would just hand cheaters a 900 km/h allowance.
 */
export const MAX_PLAUSIBLE_SPEED_KMH = 150;

/** Under this gap, any real displacement is treated as instantaneous. */
export const MIN_SPEED_WINDOW_SECONDS = 120;

/**
 * Hops shorter than this are never judged. Two check-ins can each be up to
 * ~250 m from their playground, so playground-to-playground distance carries
 * up to ~500 m of error; below 1 km that error could dominate the speed.
 */
export const MIN_SPEED_DISTANCE_KM = 1;

/** Cheap abuse ceiling. There is no real rate limiter on tRPC in this app. */
export const MAX_CHECK_INS_PER_USER_PER_DAY = 30;

/** Sentinel for a hop fast enough that the exact number stops being useful. */
export const MAX_RECORDED_SPEED_KMH = 9999;

/**
 * The radius a check-in must fall inside, widened by whatever accuracy the
 * device reported so a mediocre fix does not produce a false rejection.
 */
export function allowedRadiusMeters(accuracyMeters: number): number {
    return BASE_RADIUS_METERS + Math.min(accuracyMeters, MAX_ACCURACY_ALLOWANCE_METERS);
}

/**
 * The calendar day in Iceland, as YYYY-MM-DD.
 *
 * The cooldown is tied to Icelandic playgrounds, so it uses Icelandic days
 * rather than the caller's timezone — deterministic beats intuitive here,
 * since the alternative is trusting a client-supplied offset. en-CA is used
 * purely because its date format is already ISO-ordered.
 */
export function icelandDateString(now: Date = new Date()): string {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Atlantic/Reykjavik",
    }).format(now);
}

export interface SpeedVerdict {
    isFlagged: boolean;
    impliedSpeedKmh: number | null;
}

/**
 * Judge the hop between a user's previous check-in and this one.
 *
 * Both positions are *playground* coordinates, not user coordinates — we never
 * stored the latter, and do not need them: the playground a user checked into
 * is a ≤250 m proxy for where they stood. The MIN_SPEED_DISTANCE_KM floor is
 * what keeps that proxy error from dominating the result.
 */
export function judgeHop(hopKm: number, gapSeconds: number): SpeedVerdict {
    if (hopKm < MIN_SPEED_DISTANCE_KM) {
        return { isFlagged: false, impliedSpeedKmh: null };
    }

    // Meaningful displacement in under two minutes is implausible whatever the
    // arithmetic says, and guards against a divide-by-near-zero.
    if (gapSeconds < MIN_SPEED_WINDOW_SECONDS) {
        return { isFlagged: true, impliedSpeedKmh: MAX_RECORDED_SPEED_KMH };
    }

    const speedKmh = hopKm / (gapSeconds / 3600);
    return {
        isFlagged: speedKmh > MAX_PLAUSIBLE_SPEED_KMH,
        impliedSpeedKmh: Math.round(Math.min(speedKmh, MAX_RECORDED_SPEED_KMH)),
    };
}
