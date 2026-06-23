/**
 * FLEX-015: Integration tests for schedule mode create→complete→verify cycle.
 * Tests the full lifecycle of each schedule mode by simulating:
 * 1. Creating a task with specific mode parameters
 * 2. Computing next due after "completion"
 * 3. Verifying the resulting nextDueAt is correct
 */
import { describe, it, expect } from "vitest";
import {
  computeNextDueAtByMode,
  validateWeeklyDays,
  validateSeasonalIntervals,
  type ScheduleMode,
  type SeasonalIntervals,
} from "../../../src/features/tasks/scheduling";
import { formatScheduleDescription } from "../../../src/lib/formatters";

describe("Schedule Mode Integration: create→complete→verify", () => {
  describe("interval mode (existing behavior)", () => {
    it("creates task with 7-day interval and computes correct next due", () => {
      const now = Date.UTC(2026, 5, 20, 12, 0, 0); // June 20, 2026
      const intervalDays = 7;

      // Simulate creation (no prior completion)
      const nextDue = computeNextDueAtByMode({
        scheduleMode: "interval",
        intervalDays,
        now,
      });

      // Should be 7 days from now
      expect(nextDue).toBe(now + 7 * 24 * 60 * 60 * 1000);
    });

    it("after completion, next due advances by interval from completedAt", () => {
      const completedAt = Date.UTC(2026, 5, 22, 8, 0, 0); // June 22, 2026 08:00
      const intervalDays = 3;

      const nextDue = computeNextDueAtByMode({
        scheduleMode: "interval",
        intervalDays,
        completedAt,
        now: completedAt,
      });

      expect(nextDue).toBe(completedAt + 3 * 24 * 60 * 60 * 1000);
    });
  });

  describe("weekly mode lifecycle", () => {
    it("validates weeklyDays before creation", () => {
      expect(validateWeeklyDays([])).not.toBeNull(); // empty is invalid
      expect(validateWeeklyDays([1, 3, 5])).toBeNull(); // Mon, Wed, Fri is valid
      expect(validateWeeklyDays([0, 1, 2, 3, 4, 5, 6])).toBeNull(); // all days valid
      expect(validateWeeklyDays([8])).not.toBeNull(); // 8 is out of range
    });

    it("creates weekly task and first due is next matching day", () => {
      // June 20, 2026 is a Saturday (day=6)
      const now = Date.UTC(2026, 5, 20, 10, 0, 0);
      const weeklyDays = [1, 4]; // Mon, Thu

      const nextDue = computeNextDueAtByMode({
        scheduleMode: "weekly",
        intervalDays: 7, // fallback, not used
        weeklyDays,
        now,
      });

      // Next Mon after Sat is June 22
      const expectedMonday = Date.UTC(2026, 5, 22, 0, 0, 0);
      expect(nextDue).toBe(expectedMonday);
    });

    it("after completion on Monday, next due is Thursday (next matching day)", () => {
      // Completed on Monday June 22, 2026
      const completedAt = Date.UTC(2026, 5, 22, 14, 0, 0);
      const weeklyDays = [1, 4]; // Mon, Thu

      const nextDue = computeNextDueAtByMode({
        scheduleMode: "weekly",
        intervalDays: 7,
        weeklyDays,
        completedAt,
        now: completedAt,
      });

      // Next Thu after Mon June 22 is June 25
      const expectedThursday = Date.UTC(2026, 5, 25, 0, 0, 0);
      expect(nextDue).toBe(expectedThursday);
    });

    it("after completion on Thursday, wraps to next Monday", () => {
      // Completed on Thursday June 25, 2026
      const completedAt = Date.UTC(2026, 5, 25, 16, 0, 0);
      const weeklyDays = [1, 4]; // Mon, Thu

      const nextDue = computeNextDueAtByMode({
        scheduleMode: "weekly",
        intervalDays: 7,
        weeklyDays,
        completedAt,
        now: completedAt,
      });

      // Next Mon after Thu June 25 is June 29
      const expectedMonday = Date.UTC(2026, 5, 29, 0, 0, 0);
      expect(nextDue).toBe(expectedMonday);
    });
  });

  describe("seasonal mode lifecycle", () => {
    it("validates seasonal intervals before creation", () => {
      expect(validateSeasonalIntervals({ springSummer: 5, autumnWinter: 14 })).toBeNull();
      expect(validateSeasonalIntervals({ springSummer: 0, autumnWinter: 14 })).not.toBeNull();
      expect(validateSeasonalIntervals({ springSummer: 5, autumnWinter: 0 })).not.toBeNull();
    });

    it("creates seasonal task in summer and uses springSummer interval", () => {
      // July 10, 2026 — summer month
      const now = Date.UTC(2026, 6, 10, 10, 0, 0);
      const seasonalIntervals: SeasonalIntervals = { springSummer: 5, autumnWinter: 14 };

      const nextDue = computeNextDueAtByMode({
        scheduleMode: "seasonal",
        intervalDays: 7, // fallback
        seasonalIntervals,
        now,
      });

      // Should use springSummer=5 days from now
      expect(nextDue).toBe(now + 5 * 24 * 60 * 60 * 1000);
    });

    it("creates seasonal task in winter and uses autumnWinter interval", () => {
      // December 15, 2026 — winter month
      const now = Date.UTC(2026, 11, 15, 10, 0, 0);
      const seasonalIntervals: SeasonalIntervals = { springSummer: 5, autumnWinter: 14 };

      const nextDue = computeNextDueAtByMode({
        scheduleMode: "seasonal",
        intervalDays: 7,
        seasonalIntervals,
        now,
      });

      // Should use autumnWinter=14 days from now
      expect(nextDue).toBe(now + 14 * 24 * 60 * 60 * 1000);
    });

    it("after completion in March (spring), uses springSummer from completedAt month", () => {
      // Completed March 20, 2026
      const completedAt = Date.UTC(2026, 2, 20, 12, 0, 0);
      const seasonalIntervals: SeasonalIntervals = { springSummer: 4, autumnWinter: 10 };

      const nextDue = computeNextDueAtByMode({
        scheduleMode: "seasonal",
        intervalDays: 7,
        seasonalIntervals,
        completedAt,
        now: completedAt,
      });

      expect(nextDue).toBe(completedAt + 4 * 24 * 60 * 60 * 1000);
    });

    it("after completion in November (autumn), uses autumnWinter", () => {
      // Completed November 5, 2026
      const completedAt = Date.UTC(2026, 10, 5, 9, 0, 0);
      const seasonalIntervals: SeasonalIntervals = { springSummer: 4, autumnWinter: 10 };

      const nextDue = computeNextDueAtByMode({
        scheduleMode: "seasonal",
        intervalDays: 7,
        seasonalIntervals,
        completedAt,
        now: completedAt,
      });

      expect(nextDue).toBe(completedAt + 10 * 24 * 60 * 60 * 1000);
    });
  });

  describe("formatScheduleDescription", () => {
    it("formats interval mode", () => {
      expect(formatScheduleDescription({
        scheduleMode: "interval",
        intervalDays: 7,
      })).toBe("每 7 天");
    });

    it("formats weekly mode with multiple days", () => {
      expect(formatScheduleDescription({
        scheduleMode: "weekly",
        intervalDays: 7,
        weeklyDays: [1, 3, 5],
      })).toBe("每周一、周三、周五");
    });

    it("formats seasonal mode", () => {
      expect(formatScheduleDescription({
        scheduleMode: "seasonal",
        intervalDays: 7,
        seasonalIntervals: { springSummer: 5, autumnWinter: 14 },
      })).toBe("春夏5 / 秋冬14天");
    });

    it("falls back to interval display when weekly has no days", () => {
      expect(formatScheduleDescription({
        scheduleMode: "weekly",
        intervalDays: 7,
        weeklyDays: [],
      })).toBe("每 7 天");
    });

    it("falls back to interval display when seasonal has no data", () => {
      expect(formatScheduleDescription({
        scheduleMode: "seasonal",
        intervalDays: 7,
        seasonalIntervals: null,
      })).toBe("每 7 天");
    });
  });

  describe("mode switching (updatePlantTask simulation)", () => {
    it("switching from interval to weekly recalculates nextDueAt correctly", () => {
      // Task was interval mode, lastCompleted June 20
      const lastCompletedAt = Date.UTC(2026, 5, 20, 12, 0, 0);
      const now = Date.UTC(2026, 5, 21, 10, 0, 0); // June 21, Sunday

      // User switches to weekly [1, 4] (Mon, Thu)
      const nextDue = computeNextDueAtByMode({
        scheduleMode: "weekly",
        intervalDays: 7,
        weeklyDays: [1, 4],
        completedAt: lastCompletedAt,
        now,
      });

      // Next day after June 20 (Sat) that is Mon or Thu → June 22 (Mon)
      expect(nextDue).toBe(Date.UTC(2026, 5, 22, 0, 0, 0));
    });

    it("switching from weekly to seasonal uses correct interval", () => {
      // Completed in July (summer)
      const completedAt = Date.UTC(2026, 6, 15, 10, 0, 0);

      const nextDue = computeNextDueAtByMode({
        scheduleMode: "seasonal",
        intervalDays: 7,
        seasonalIntervals: { springSummer: 3, autumnWinter: 12 },
        completedAt,
        now: completedAt,
      });

      expect(nextDue).toBe(completedAt + 3 * 24 * 60 * 60 * 1000);
    });
  });
});
