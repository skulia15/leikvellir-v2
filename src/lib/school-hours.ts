/**
 * Utility functions for handling school hours and accessibility
 */

import { isHoliday } from "fridagar";
import { type SchoolType } from "~/types";

// School hours configuration
export const SCHOOL_HOURS = {
  start: 8, // 08:00
  end: 17, // 17:00
} as const;

// Days of the week (0 = Sunday, 1 = Monday, etc.)
export const WORKING_DAYS = [1, 2, 3, 4, 5] as const; // Monday to Friday

// Cache fridagar isHoliday results per calendar day (YYYY-M-D) so repeated
// per-marker/per-card checks don't recompute Icelandic holiday tables.
const holidayCache = new Map<string, boolean>();

function isIcelandicHoliday(date: Date): boolean {
  const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  const cached = holidayCache.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const result = Boolean(isHoliday(date));
  // Keep cache bounded in long-lived server processes
  if (holidayCache.size > 366) {
    holidayCache.clear();
  }
  holidayCache.set(key, result);
  return result;
}

/**
 * Check if current time is during school hours
 * School hours are Monday-Friday 08:00-17:00
 */
export function isSchoolHours(date: Date = new Date()): boolean {
  // Icelandic public holidays — schools are closed
  if (isIcelandicHoliday(date)) {
    return false;
  }

  const dayOfWeek = date.getDay();
  const hour = date.getHours();

  // Check if it's a working day (Monday to Friday)
  const isWorkingDay = WORKING_DAYS.includes(dayOfWeek as typeof WORKING_DAYS[number]);

  // Check if it's during school hours
  const isDuringSchoolHours = hour >= SCHOOL_HOURS.start && hour < SCHOOL_HOURS.end;

  return isWorkingDay && isDuringSchoolHours;
}

/**
 * Check if current time is after school hours
 */
export function isAfterSchoolHours(date: Date = new Date()): boolean {
  return !isSchoolHours(date);
}

/**
 * Check if a school ground playground is currently accessible
 * School grounds are accessible outside of school hours
 */
export function isSchoolGroundAccessible(
  isSchoolGround: boolean,
  date: Date = new Date()
): boolean {
  if (!isSchoolGround) {
    return true; // Non-school playgrounds are always accessible if publicly accessible
  }

  return isAfterSchoolHours(date);
}

/**
 * Get the accessibility status text for a playground
 */
export function getAccessibilityStatus(
  isSchoolGround: boolean,
  schoolType: SchoolType | null,
  date: Date = new Date()
): {
  isAccessible: boolean;
  status: 'always' | 'school_hours_only' | 'after_school_hours';
  schoolType?: SchoolType;
} {
  if (!isSchoolGround) {
    return {
      isAccessible: true,
      status: 'always'
    };
  }

  const accessible = isSchoolGroundAccessible(isSchoolGround, date);

  return {
    isAccessible: accessible,
    status: accessible ? 'after_school_hours' : 'school_hours_only',
    schoolType: schoolType ?? undefined
  };
}

/**
 * Get the next time when a school ground will be accessible
 */
export function getNextAccessibleTime(date: Date = new Date()): Date {
  const nextAccessible = new Date(date);

  if (isSchoolHours(date)) {
    // If it's currently school hours, accessibility starts at 17:00 today
    nextAccessible.setHours(SCHOOL_HOURS.end, 0, 0, 0);
  } else {
    // If it's weekend or after hours, find next school day end
    const dayOfWeek = date.getDay();

    if (dayOfWeek === 0) { // Sunday
      nextAccessible.setDate(nextAccessible.getDate() + 1); // Monday
      nextAccessible.setHours(SCHOOL_HOURS.end, 0, 0, 0);
    } else if (dayOfWeek === 6) { // Saturday
      nextAccessible.setDate(nextAccessible.getDate() + 2); // Monday
      nextAccessible.setHours(SCHOOL_HOURS.end, 0, 0, 0);
    } else if (date.getHours() < SCHOOL_HOURS.start) {
      // Before school hours on a weekday - accessible now
      return date;
    } else {
      // After school hours on a weekday - accessible now
      return date;
    }
  }

  return nextAccessible;
}

/**
 * Format school type for display
 * Note: This function returns translation keys that should be translated by the caller
 */
export function formatSchoolType(schoolType: SchoolType | null): string {
  switch (schoolType) {
    case 'preschool':
      return 'forms.preschoolType';
    case 'elementary':
      return 'forms.elementaryType';
    default:
      return '';
  }
}

/**
 * Marker fill colours. Shared by the map pins and the map legend so the two
 * cannot drift apart.
 */
export const MARKER_COLORS = {
  open: '#22c55e', // Regular playground — always open
  limited: '#f59e0b', // School ground, currently accessible
  closed: '#ef4444', // School ground, closed during school hours
} as const;

/**
 * Get map marker color based on playground type and accessibility
 */
export function getPlaygroundMarkerColor(
  isSchoolGround: boolean,
  schoolType: SchoolType | null,
  date: Date = new Date()
): string {
  if (!isSchoolGround) {
    return MARKER_COLORS.open;
  }

  return isSchoolGroundAccessible(isSchoolGround, date)
    ? MARKER_COLORS.limited
    : MARKER_COLORS.closed;
}
