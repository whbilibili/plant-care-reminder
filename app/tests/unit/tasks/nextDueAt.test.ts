import { describe, expect, it } from "vitest";

import { computeNextDueAt } from "../../../src/features/tasks/scheduling";

describe("nextDueAt completion recomputation", () => {
  it("uses the actual completion timestamp as the next schedule baseline", () => {
    const completedAt = Date.UTC(2026, 5, 9, 16, 45, 0);

    expect(
      computeNextDueAt({
        intervalDays: 5,
        baseCompletedAt: completedAt,
      }),
    ).toBe(completedAt + 5 * 24 * 60 * 60 * 1000);
  });
});
