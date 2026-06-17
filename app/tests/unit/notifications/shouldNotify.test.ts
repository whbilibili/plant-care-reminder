import { describe, expect, it } from "vitest";

import { shouldNotifyTask } from "../../../convex/notifications";

describe("shouldNotifyTask", () => {
  it("includes enabled tasks that are due within the upcoming notification window", () => {
    const now = Date.UTC(2026, 5, 9, 12, 0, 0);

    expect(
      shouldNotifyTask({
        enabled: true,
        lastNotifiedAt: null,
        nextDueAt: now + 30 * 60 * 1000,
        now,
      }),
    ).toBe(true);
  });

  it("deduplicates tasks already notified in the current reminder window", () => {
    const now = Date.UTC(2026, 5, 9, 12, 0, 0);

    expect(
      shouldNotifyTask({
        enabled: true,
        lastNotifiedAt: now - 15 * 60 * 1000,
        nextDueAt: now - 5 * 60 * 1000,
        now,
      }),
    ).toBe(false);
  });

  it("keeps overdue tasks eligible after the prior reminder window expires", () => {
    const now = Date.UTC(2026, 5, 9, 12, 0, 0);

    expect(
      shouldNotifyTask({
        enabled: true,
        lastNotifiedAt: now - 2 * 60 * 60 * 1000,
        nextDueAt: now - 24 * 60 * 60 * 1000,
        now,
      }),
    ).toBe(true);
  });
});
