import { describe, expect, it } from "vitest";

import type { Id } from "../../../convex/_generated/dataModel";
import {
  buildBatchUndoMessage,
  buildUndoPayload,
  UNDO_TOAST_DURATION_MS,
  type CompletionResult,
} from "../../../src/features/tasks/undoComplete";

const TASK_ID = "task_1" as Id<"plantTasks">;
const LOG_ID = "log_1" as Id<"taskCompletionLogs">;

function makeResult(overrides: Partial<CompletionResult> = {}): CompletionResult {
  return {
    taskId: TASK_ID,
    logId: LOG_ID,
    previous: {
      lastCompletedAt: 1000,
      nextDueAt: 5000,
      consecutivePostponeCount: 2,
    },
    ...overrides,
  };
}

describe("buildUndoPayload", () => {
  it("透传 taskId / logId / previous 快照", () => {
    const payload = buildUndoPayload(makeResult());

    expect(payload.taskId).toBe(TASK_ID);
    expect(payload.logId).toBe(LOG_ID);
    expect(payload.previous).toEqual({
      lastCompletedAt: 1000,
      nextDueAt: 5000,
      consecutivePostponeCount: 2,
    });
  });

  it("默认文案为「已完成，可撤销」", () => {
    expect(buildUndoPayload(makeResult()).message).toBe("已完成，可撤销");
  });

  it("支持自定义文案", () => {
    const payload = buildUndoPayload(makeResult(), "已完成 3 个浇水任务");
    expect(payload.message).toBe("已完成 3 个浇水任务");
  });

  it("保留 lastCompletedAt 为 null 的快照", () => {
    const payload = buildUndoPayload(
      makeResult({ previous: { lastCompletedAt: null, nextDueAt: 5000, consecutivePostponeCount: 0 } }),
    );
    expect(payload.previous.lastCompletedAt).toBeNull();
  });
});

describe("buildBatchUndoMessage", () => {
  it("拼接批量完成文案", () => {
    expect(buildBatchUndoMessage(3, "浇水")).toBe("已完成 3 个浇水任务");
  });
});

describe("UNDO_TOAST_DURATION_MS", () => {
  it("落在 PRD 规定的 3–5 秒区间", () => {
    expect(UNDO_TOAST_DURATION_MS).toBeGreaterThanOrEqual(3000);
    expect(UNDO_TOAST_DURATION_MS).toBeLessThanOrEqual(5000);
  });
});
