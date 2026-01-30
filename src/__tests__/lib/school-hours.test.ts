// __tests__/lib/school-hours.test.ts
import { describe, it, expect } from "vitest";
import {
  isSchoolHours,
  isAfterSchoolHours,
  isSchoolGroundAccessible,
  getAccessibilityStatus,
  getNextAccessibleTime,
  formatSchoolType,
  getPlaygroundMarkerColor,
  SCHOOL_HOURS,
} from "~/lib/school-hours";

// Helper to create a specific date
// month is 0-indexed, dayOfWeek: 0=Sun,1=Mon,...,6=Sat
function makeDate(year: number, month: number, day: number, hour: number, minute = 0): Date {
  return new Date(year, month, day, hour, minute, 0, 0);
}

// Known dates for testing:
// 2025-01-06 = Monday
// 2025-01-07 = Tuesday
// 2025-01-08 = Wednesday
// 2025-01-10 = Friday
// 2025-01-11 = Saturday
// 2025-01-12 = Sunday
//
// Known Icelandic holidays on weekdays:
// 2025-01-01 = Wednesday (Nýársdagur)
// 2025-12-25 = Thursday (Jóladagur)

describe("school-hours utilities", () => {
  describe("isSchoolHours", () => {
    it("should return true on Monday at 10:00", () => {
      const monday10am = makeDate(2025, 0, 6, 10);
      expect(isSchoolHours(monday10am)).toBe(true);
    });

    it("should return true on Friday at 08:00 (boundary start)", () => {
      const friday8am = makeDate(2025, 0, 10, 8);
      expect(isSchoolHours(friday8am)).toBe(true);
    });

    it("should return false on Monday at 07:59 (before start)", () => {
      const monday759 = makeDate(2025, 0, 6, 7, 59);
      expect(isSchoolHours(monday759)).toBe(false);
    });

    it("should return false on Wednesday at 17:00 (boundary end, exclusive)", () => {
      const wednesday5pm = makeDate(2025, 0, 8, 17, 0);
      expect(isSchoolHours(wednesday5pm)).toBe(false);
    });

    it("should return false on Saturday at 12:00", () => {
      const saturdayNoon = makeDate(2025, 0, 11, 12);
      expect(isSchoolHours(saturdayNoon)).toBe(false);
    });

    it("should return false on Sunday at 12:00", () => {
      const sundayNoon = makeDate(2025, 0, 12, 12);
      expect(isSchoolHours(sundayNoon)).toBe(false);
    });

    it("should return true on Wednesday at 16:59", () => {
      const wednesday459 = makeDate(2025, 0, 8, 16, 59);
      expect(isSchoolHours(wednesday459)).toBe(true);
    });
  });

  describe("isAfterSchoolHours", () => {
    it("should return false during school hours on Tuesday at 10:00", () => {
      const tuesday10am = makeDate(2025, 0, 7, 10);
      expect(isAfterSchoolHours(tuesday10am)).toBe(false);
    });

    it("should return true on Saturday at 10:00", () => {
      const saturday10am = makeDate(2025, 0, 11, 10);
      expect(isAfterSchoolHours(saturday10am)).toBe(true);
    });

    it("should return true on Monday at 18:00", () => {
      const monday6pm = makeDate(2025, 0, 6, 18);
      expect(isAfterSchoolHours(monday6pm)).toBe(true);
    });
  });

  describe("isSchoolGroundAccessible", () => {
    it("should return true for non-school grounds regardless of time", () => {
      const monday10am = makeDate(2025, 0, 6, 10);
      expect(isSchoolGroundAccessible(false, monday10am)).toBe(true);
    });

    it("should return true for school grounds outside school hours", () => {
      const monday6pm = makeDate(2025, 0, 6, 18);
      expect(isSchoolGroundAccessible(true, monday6pm)).toBe(true);
    });

    it("should return false for school grounds during school hours", () => {
      const monday10am = makeDate(2025, 0, 6, 10);
      expect(isSchoolGroundAccessible(true, monday10am)).toBe(false);
    });
  });

  describe("getAccessibilityStatus", () => {
    it("should return status 'always' for non-school playgrounds", () => {
      const result = getAccessibilityStatus(false, null);
      expect(result).toEqual({
        isAccessible: true,
        status: "always",
      });
    });

    it("should return 'school_hours_only' during school hours for school grounds", () => {
      const monday10am = makeDate(2025, 0, 6, 10);
      const result = getAccessibilityStatus(true, "preschool", monday10am);
      expect(result).toEqual({
        isAccessible: false,
        status: "school_hours_only",
        schoolType: "preschool",
      });
    });

    it("should return 'after_school_hours' outside school hours for school grounds", () => {
      const saturday10am = makeDate(2025, 0, 11, 10);
      const result = getAccessibilityStatus(true, "elementary", saturday10am);
      expect(result).toEqual({
        isAccessible: true,
        status: "after_school_hours",
        schoolType: "elementary",
      });
    });

    it("should include schoolType when playground is a school ground", () => {
      const monday6pm = makeDate(2025, 0, 6, 18);
      const result = getAccessibilityStatus(true, "preschool", monday6pm);
      expect(result.schoolType).toBe("preschool");
    });

    it("should not include schoolType for non-school playgrounds", () => {
      const result = getAccessibilityStatus(false, null);
      expect(result.schoolType).toBeUndefined();
    });
  });

  describe("getNextAccessibleTime", () => {
    it("should return 17:00 today when called during school hours on a weekday", () => {
      const monday10am = makeDate(2025, 0, 6, 10);
      const result = getNextAccessibleTime(monday10am);
      expect(result.getHours()).toBe(SCHOOL_HOURS.end);
      expect(result.getDate()).toBe(6); // same day
    });

    it("should return the same date when called after school hours on a weekday", () => {
      const monday6pm = makeDate(2025, 0, 6, 18);
      const result = getNextAccessibleTime(monday6pm);
      expect(result).toEqual(monday6pm);
    });

    it("should return the same date when called before school hours on a weekday", () => {
      const monday7am = makeDate(2025, 0, 6, 7);
      const result = getNextAccessibleTime(monday7am);
      expect(result).toEqual(monday7am);
    });

    it("should return Monday 17:00 when called on Saturday", () => {
      const saturday10am = makeDate(2025, 0, 11, 10);
      const result = getNextAccessibleTime(saturday10am);
      expect(result.getDay()).toBe(1); // Monday
      expect(result.getHours()).toBe(SCHOOL_HOURS.end);
    });

    it("should return Monday 17:00 when called on Sunday", () => {
      const sunday10am = makeDate(2025, 0, 12, 10);
      const result = getNextAccessibleTime(sunday10am);
      expect(result.getDay()).toBe(1); // Monday
      expect(result.getHours()).toBe(SCHOOL_HOURS.end);
    });
  });

  describe("formatSchoolType", () => {
    it("should return 'forms.preschoolType' for preschool", () => {
      expect(formatSchoolType("preschool")).toBe("forms.preschoolType");
    });

    it("should return 'forms.elementaryType' for elementary", () => {
      expect(formatSchoolType("elementary")).toBe("forms.elementaryType");
    });

    it("should return empty string for null", () => {
      expect(formatSchoolType(null)).toBe("");
    });
  });

  describe("getPlaygroundMarkerColor", () => {
    it("should return green for non-school playgrounds", () => {
      expect(getPlaygroundMarkerColor(false, null)).toBe("#22c55e");
    });

    it("should return amber for accessible school grounds", () => {
      const saturday10am = makeDate(2025, 0, 11, 10);
      expect(getPlaygroundMarkerColor(true, "preschool", saturday10am)).toBe("#f59e0b");
    });

    it("should return red for inaccessible school grounds during school hours", () => {
      const monday10am = makeDate(2025, 0, 6, 10);
      expect(getPlaygroundMarkerColor(true, "elementary", monday10am)).toBe("#ef4444");
    });
  });

  describe("Icelandic public holidays (fridagar)", () => {
    // 2025-01-01 is a Wednesday (Nýársdagur) — schools are closed
    const nyarsdagur10am = makeDate(2025, 0, 1, 10);
    // 2025-12-25 is a Thursday (Jóladagur) — schools are closed
    const joladagur10am = makeDate(2025, 11, 25, 10);

    it("isSchoolHours should return false on Nýársdagur even during weekday work hours", () => {
      expect(isSchoolHours(nyarsdagur10am)).toBe(false);
    });

    it("isSchoolHours should return false on Jóladagur even during weekday work hours", () => {
      expect(isSchoolHours(joladagur10am)).toBe(false);
    });

    it("isSchoolGroundAccessible should return true for school grounds on a holiday", () => {
      expect(isSchoolGroundAccessible(true, nyarsdagur10am)).toBe(true);
    });

    it("getAccessibilityStatus should return 'after_school_hours' on a holiday", () => {
      const result = getAccessibilityStatus(true, "elementary", nyarsdagur10am);
      expect(result).toEqual({
        isAccessible: true,
        status: "after_school_hours",
        schoolType: "elementary",
      });
    });

    it("getPlaygroundMarkerColor should return amber (not red) on a holiday", () => {
      expect(getPlaygroundMarkerColor(true, "preschool", nyarsdagur10am)).toBe("#f59e0b");
    });

    it("getNextAccessibleTime should return the same date on a holiday (already accessible)", () => {
      const result = getNextAccessibleTime(nyarsdagur10am);
      expect(result).toEqual(nyarsdagur10am);
    });
  });
});
