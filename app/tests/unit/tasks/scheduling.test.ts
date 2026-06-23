import { describe, expect, it } from "vitest";

import {
  computeNextWeeklyDueAt,
  computeNextSeasonalDueAt,
  computeNextDueAtByMode,
  getEffectiveIntervalDays,
  validateWeeklyDays,
  validateSeasonalIntervals,
  type SeasonalIntervals,
} from "../../../src/features/tasks/scheduling";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

describe("computeNextWeeklyDueAt", () => {
  it("finds next matching weekday from completedAt (never today)", () => {
    // Wednesday June 17, 2026 12:00 UTC (day=3)
    const wednesday = Date.UTC(2026, 5, 17, 12, 0, 0);
    // weeklyDays = [3] means Wednesday
    // Should find next Wednesday = June 24 (not today)
    const result = computeNextWeeklyDueAt({
      weeklyDays: [3], // Wednesday
      completedAt: wednesday,
    });
    expect(result).toBe(Date.UTC(2026, 5, 24)); // Next Wednesday start of day
  });

  it("returns tomorrow if completed today and tomorrow is a match", () => {
    // Monday June 15, 2026 at noon UTC
    const monday = Date.UTC(2026, 5, 15, 12, 0, 0);
    // weeklyDays = [2] means Tuesday
    const result = computeNextWeeklyDueAt({
      weeklyDays: [2], // Tuesday
      completedAt: monday,
    });
    // Should be Tuesday June 16
    expect(result).toBe(Date.UTC(2026, 5, 16));
  });

  it("handles multi-day selection", () => {
    // Monday June 15, 2026 at noon
    const monday = Date.UTC(2026, 5, 15, 12, 0, 0);
    // weeklyDays = [1, 3, 5] means Mon, Wed, Fri
    const result = computeNextWeeklyDueAt({
      weeklyDays: [1, 3, 5], // Mon, Wed, Fri
      completedAt: monday,
    });
    // Next match after Monday is Wednesday June 17
    expect(result).toBe(Date.UTC(2026, 5, 17));
  });

  it("handles cross-week scenario", () => {
    // Friday June 19, 2026 (day=5)
    const friday = Date.UTC(2026, 5, 19, 12, 0, 0);
    // weeklyDays = [1] means Monday
    const result = computeNextWeeklyDueAt({
      weeklyDays: [1], // Monday
      completedAt: friday,
    });
    // Next Monday = June 22
    expect(result).toBe(Date.UTC(2026, 5, 22));
  });

  it("handles overdue-then-complete (uses completion time as base)", () => {
    // Task was due Monday but completed on Thursday June 18 (day=4)
    const thursdayLate = Date.UTC(2026, 5, 18, 15, 0, 0);
    // weeklyDays = [1] means Monday
    const result = computeNextWeeklyDueAt({
      weeklyDays: [1],
      completedAt: thursdayLate,
    });
    // Next Monday after Thursday June 18 = June 22
    expect(result).toBe(Date.UTC(2026, 5, 22));
  });

  it("uses now as baseline when completedAt is null", () => {
    const monday = Date.UTC(2026, 5, 15, 12, 0, 0);
    const result = computeNextWeeklyDueAt({
      weeklyDays: [3], // Wednesday
      completedAt: null,
      now: monday,
    });
    // Wednesday June 17
    expect(result).toBe(Date.UTC(2026, 5, 17));
  });

  it("throws when weeklyDays is empty", () => {
    expect(() =>
      computeNextWeeklyDueAt({
        weeklyDays: [],
        completedAt: Date.now(),
      }),
    ).toThrow("每周至少需要选择一天");
  });

  it("single day = today's weekday still goes to next week", () => {
    // Wednesday June 17, 2026 at 8am (day=3)
    const wednesday = Date.UTC(2026, 5, 17, 8, 0, 0);
    const result = computeNextWeeklyDueAt({
      weeklyDays: [3], // Wednesday
      completedAt: wednesday,
    });
    // Should be next Wednesday = June 24
    expect(result).toBe(Date.UTC(2026, 5, 24));
  });
});

describe("computeNextSeasonalDueAt", () => {
  it("uses springSummer interval for month 3 (March)", () => {
    // March 15, 2026
    const march = Date.UTC(2026, 2, 15, 12, 0, 0);
    const intervals: SeasonalIntervals = { springSummer: 5, autumnWinter: 14 };
    const result = computeNextSeasonalDueAt({
      seasonalIntervals: intervals,
      completedAt: march,
    });
    expect(result).toBe(march + 5 * MS_PER_DAY);
  });

  it("uses springSummer interval for month 8 (August)", () => {
    // August 20, 2026
    const august = Date.UTC(2026, 7, 20, 12, 0, 0);
    const intervals: SeasonalIntervals = { springSummer: 7, autumnWinter: 21 };
    const result = computeNextSeasonalDueAt({
      seasonalIntervals: intervals,
      completedAt: august,
    });
    expect(result).toBe(august + 7 * MS_PER_DAY);
  });

  it("uses autumnWinter interval for month 9 (September)", () => {
    // September 10, 2026
    const september = Date.UTC(2026, 8, 10, 12, 0, 0);
    const intervals: SeasonalIntervals = { springSummer: 5, autumnWinter: 14 };
    const result = computeNextSeasonalDueAt({
      seasonalIntervals: intervals,
      completedAt: september,
    });
    expect(result).toBe(september + 14 * MS_PER_DAY);
  });

  it("uses autumnWinter interval for month 2 (February)", () => {
    // February 1, 2026
    const february = Date.UTC(2026, 1, 1, 12, 0, 0);
    const intervals: SeasonalIntervals = { springSummer: 5, autumnWinter: 14 };
    const result = computeNextSeasonalDueAt({
      seasonalIntervals: intervals,
      completedAt: february,
    });
    expect(result).toBe(february + 14 * MS_PER_DAY);
  });

  it("does not switch interval mid-calculation when crossing season boundary", () => {
    // August 28, 2026 — springSummer, even if result lands in September
    const lateSummer = Date.UTC(2026, 7, 28, 12, 0, 0);
    const intervals: SeasonalIntervals = { springSummer: 7, autumnWinter: 21 };
    const result = computeNextSeasonalDueAt({
      seasonalIntervals: intervals,
      completedAt: lateSummer,
    });
    // Uses springSummer=7 based on completedAt month
    expect(result).toBe(lateSummer + 7 * MS_PER_DAY);
  });

  it("uses now when completedAt is null", () => {
    const april = Date.UTC(2026, 3, 10, 12, 0, 0);
    const intervals: SeasonalIntervals = { springSummer: 3, autumnWinter: 10 };
    const result = computeNextSeasonalDueAt({
      seasonalIntervals: intervals,
      completedAt: null,
      now: april,
    });
    expect(result).toBe(april + 3 * MS_PER_DAY);
  });
});

describe("getEffectiveIntervalDays", () => {
  const intervals: SeasonalIntervals = { springSummer: 5, autumnWinter: 14 };

  it("returns springSummer for March", () => {
    expect(getEffectiveIntervalDays(intervals, Date.UTC(2026, 2, 15))).toBe(5);
  });

  it("returns springSummer for August", () => {
    expect(getEffectiveIntervalDays(intervals, Date.UTC(2026, 7, 1))).toBe(5);
  });

  it("returns autumnWinter for September", () => {
    expect(getEffectiveIntervalDays(intervals, Date.UTC(2026, 8, 1))).toBe(14);
  });

  it("returns autumnWinter for January", () => {
    expect(getEffectiveIntervalDays(intervals, Date.UTC(2026, 0, 15))).toBe(14);
  });

  it("returns autumnWinter for February", () => {
    expect(getEffectiveIntervalDays(intervals, Date.UTC(2026, 1, 15))).toBe(14);
  });
});

describe("validateWeeklyDays", () => {
  it("rejects empty array", () => {
    expect(validateWeeklyDays([])).not.toBeNull();
  });

  it("rejects out-of-range values (< 0)", () => {
    expect(validateWeeklyDays([-1])).not.toBeNull();
  });

  it("rejects out-of-range values (> 6)", () => {
    expect(validateWeeklyDays([7])).not.toBeNull();
  });

  it("rejects duplicates", () => {
    expect(validateWeeklyDays([1, 1, 3])).not.toBeNull();
  });

  it("accepts valid single day", () => {
    expect(validateWeeklyDays([3])).toBeNull();
  });

  it("accepts valid multi-day", () => {
    expect(validateWeeklyDays([0, 1, 2, 3, 4, 5, 6])).toBeNull();
  });

  it("rejects non-integer values", () => {
    expect(validateWeeklyDays([1.5])).not.toBeNull();
  });
});

describe("validateSeasonalIntervals", () => {
  it("rejects springSummer <= 0", () => {
    expect(validateSeasonalIntervals({ springSummer: 0, autumnWinter: 7 })).not.toBeNull();
  });

  it("rejects autumnWinter <= 0", () => {
    expect(validateSeasonalIntervals({ springSummer: 7, autumnWinter: 0 })).not.toBeNull();
  });

  it("rejects springSummer > 365", () => {
    expect(validateSeasonalIntervals({ springSummer: 366, autumnWinter: 7 })).not.toBeNull();
  });

  it("rejects autumnWinter > 365", () => {
    expect(validateSeasonalIntervals({ springSummer: 7, autumnWinter: 400 })).not.toBeNull();
  });

  it("rejects non-integer values", () => {
    expect(validateSeasonalIntervals({ springSummer: 3.5, autumnWinter: 7 })).not.toBeNull();
  });

  it("accepts valid intervals", () => {
    expect(validateSeasonalIntervals({ springSummer: 7, autumnWinter: 14 })).toBeNull();
  });

  it("accepts boundary values (1 and 365)", () => {
    expect(validateSeasonalIntervals({ springSummer: 1, autumnWinter: 365 })).toBeNull();
  });
});

describe("computeNextDueAtByMode", () => {
  it("dispatches to interval mode by default (undefined scheduleMode)", () => {
    const now = Date.UTC(2026, 5, 15, 12, 0, 0);
    const result = computeNextDueAtByMode({
      scheduleMode: undefined,
      intervalDays: 5,
      completedAt: now,
      now,
    });
    expect(result).toBe(now + 5 * MS_PER_DAY);
  });

  it("dispatches to interval mode explicitly", () => {
    const now = Date.UTC(2026, 5, 15, 12, 0, 0);
    const result = computeNextDueAtByMode({
      scheduleMode: "interval",
      intervalDays: 3,
      completedAt: now,
      now,
    });
    expect(result).toBe(now + 3 * MS_PER_DAY);
  });

  it("dispatches to weekly mode", () => {
    // Monday June 15, 2026
    const monday = Date.UTC(2026, 5, 15, 12, 0, 0);
    const result = computeNextDueAtByMode({
      scheduleMode: "weekly",
      intervalDays: 7, // ignored
      weeklyDays: [3], // Wednesday
      completedAt: monday,
      now: monday,
    });
    expect(result).toBe(Date.UTC(2026, 5, 17)); // Wednesday
  });

  it("dispatches to seasonal mode", () => {
    // June 15, 2026 (spring/summer)
    const june = Date.UTC(2026, 5, 15, 12, 0, 0);
    const result = computeNextDueAtByMode({
      scheduleMode: "seasonal",
      intervalDays: 99, // ignored
      seasonalIntervals: { springSummer: 5, autumnWinter: 14 },
      completedAt: june,
      now: june,
    });
    expect(result).toBe(june + 5 * MS_PER_DAY);
  });

  it("throws for weekly mode without weeklyDays", () => {
    expect(() =>
      computeNextDueAtByMode({
        scheduleMode: "weekly",
        intervalDays: 7,
        completedAt: Date.now(),
      }),
    ).toThrow();
  });

  it("throws for seasonal mode without seasonalIntervals", () => {
    expect(() =>
      computeNextDueAtByMode({
        scheduleMode: "seasonal",
        intervalDays: 7,
        completedAt: Date.now(),
      }),
    ).toThrow();
  });
});
