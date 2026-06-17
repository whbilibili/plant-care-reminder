import { describe, expect, it } from "vitest";

import {
  POSTPONE_DAYS,
  computePostponePreview,
  computePostponedNextDueAt,
} from "../../../src/features/tasks/scheduling";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// 固定一个 UTC 自然日中午作为「现在」，避免边界抖动。
const NOW = Date.UTC(2026, 5, 10, 12, 0, 0);
const startOfToday = Date.UTC(2026, 5, 10);

describe("computePostponedNextDueAt", () => {
  it("以今天 0 点为基准顺延 N 天（默认 1 天），而非基于原 nextDueAt", () => {
    expect(computePostponedNextDueAt(NOW)).toBe(startOfToday + POSTPONE_DAYS * MS_PER_DAY);
    expect(computePostponedNextDueAt(NOW)).toBe(startOfToday + MS_PER_DAY);
  });

  it("无论当天什么时间点推迟，结果都落在同一个自然日 0 点 + N", () => {
    const earlyMorning = Date.UTC(2026, 5, 10, 0, 30, 0);
    const lateNight = Date.UTC(2026, 5, 10, 23, 45, 0);
    expect(computePostponedNextDueAt(earlyMorning)).toBe(computePostponedNextDueAt(lateNight));
  });

  it("支持自定义天数", () => {
    expect(computePostponedNextDueAt(NOW, 3)).toBe(startOfToday + 3 * MS_PER_DAY);
  });
});

describe("computePostponePreview", () => {
  it("逾期任务：标记 isOverdue 并给出逾期天数，预览日期为今天 + 1", () => {
    const overdueNextDueAt = startOfToday - 2 * MS_PER_DAY; // 逾期 2 天
    const preview = computePostponePreview(overdueNextDueAt, NOW);

    expect(preview.isOverdue).toBe(true);
    expect(preview.overdueDays).toBe(2);
    expect(preview.nextDueAtPreview).toBe(startOfToday + MS_PER_DAY);
  });

  it("今日到期任务：非逾期，逾期天数为 0，预览日期为今天 + 1", () => {
    const dueTodayNextDueAt = startOfToday + 6 * 60 * 60 * 1000; // 今天稍晚
    const preview = computePostponePreview(dueTodayNextDueAt, NOW);

    expect(preview.isOverdue).toBe(false);
    expect(preview.overdueDays).toBe(0);
    expect(preview.nextDueAtPreview).toBe(startOfToday + MS_PER_DAY);
  });

  it("未来到期任务：非逾期", () => {
    const futureNextDueAt = startOfToday + 5 * MS_PER_DAY;
    const preview = computePostponePreview(futureNextDueAt, NOW);

    expect(preview.isOverdue).toBe(false);
    expect(preview.overdueDays).toBe(0);
  });
});
