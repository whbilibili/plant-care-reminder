import { describe, expect, it } from "vitest";

import { bucketDueTasks } from "../../../src/features/tasks/scheduling";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// 固定一个 UTC 自然日中午作为「现在」，避免边界抖动。
const NOW = Date.UTC(2026, 5, 10, 12, 0, 0);
const startOfToday = Date.UTC(2026, 5, 10);
const startOfTomorrow = startOfToday + MS_PER_DAY;

function task(overrides: {
  taskId: string;
  nextDueAt: number;
  lastCompletedAt?: number | null;
}) {
  return {
    lastCompletedAt: overrides.lastCompletedAt ?? null,
    nextDueAt: overrides.nextDueAt,
    taskId: overrides.taskId,
  };
}

describe("bucketDueTasks 分桶", () => {
  it("把逾期/今天/即将到期的任务分到对应桶", () => {
    const result = bucketDueTasks(
      [
        task({ taskId: "overdue", nextDueAt: startOfToday - MS_PER_DAY }),
        task({ taskId: "today", nextDueAt: startOfToday + 6 * 60 * 60 * 1000 }),
        task({ taskId: "soon", nextDueAt: startOfTomorrow + MS_PER_DAY }),
      ],
      NOW,
    );

    expect(result.overdue.map((t) => t.taskId)).toEqual(["overdue"]);
    expect(result.today.map((t) => t.taskId)).toEqual(["today"]);
    expect(result.upcoming.map((t) => t.taskId)).toEqual(["soon"]);
  });

  it("超出即将到期窗口（>3 天）的任务不进入任何桶", () => {
    const result = bucketDueTasks(
      [task({ taskId: "far", nextDueAt: startOfTomorrow + 5 * MS_PER_DAY })],
      NOW,
    );

    expect(result.overdue).toHaveLength(0);
    expect(result.today).toHaveLength(0);
    expect(result.upcoming).toHaveLength(0);
  });

  it("今日完成后，任务因 nextDueAt 推到未来而落入即将到期区并标记 completedToday", () => {
    // 模拟完成水培任务（间隔 2 天）：nextDueAt = 今天 + 2 天，lastCompletedAt = 今天
    const result = bucketDueTasks(
      [
        task({
          taskId: "done-today",
          nextDueAt: startOfToday + 2 * MS_PER_DAY,
          lastCompletedAt: NOW,
        }),
      ],
      NOW,
    );

    expect(result.overdue).toHaveLength(0);
    expect(result.today).toHaveLength(0);
    expect(result.upcoming).toHaveLength(1);
    expect(result.upcoming[0]?.completedToday).toBe(true);
  });

  it("间隔=1 天的任务次日正常重现，不被今日完成误去重", () => {
    // 昨天完成的每日任务：lastCompletedAt = 昨天，nextDueAt = 今天
    const result = bucketDueTasks(
      [
        task({
          taskId: "daily",
          nextDueAt: startOfToday + 60 * 60 * 1000,
          lastCompletedAt: startOfToday - MS_PER_DAY + 60 * 60 * 1000,
        }),
      ],
      NOW,
    );

    expect(result.today.map((t) => t.taskId)).toEqual(["daily"]);
    expect(result.today[0]?.completedToday).toBe(false);
  });

  it("主区（逾期+今日）只包含今日未完成的任务", () => {
    const result = bucketDueTasks(
      [
        task({ taskId: "pending-today", nextDueAt: startOfToday + 3 * 60 * 60 * 1000 }),
        task({
          taskId: "done-today",
          nextDueAt: startOfToday + 2 * MS_PER_DAY,
          lastCompletedAt: NOW,
        }),
      ],
      NOW,
    );

    const mainArea = [...result.overdue, ...result.today];
    expect(mainArea.every((t) => t.completedToday === false)).toBe(true);
    expect(mainArea.map((t) => t.taskId)).toEqual(["pending-today"]);
  });
});
