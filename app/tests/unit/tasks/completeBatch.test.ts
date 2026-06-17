import { describe, expect, it } from "vitest";

import type { Id } from "../../../convex/_generated/dataModel";
import {
  buildBatchUndoMessage,
  buildBatchUndoPayload,
  type CompletionResult,
} from "../../../src/features/tasks/undoComplete";

function makeResult(n: number): CompletionResult {
  return {
    taskId: `task_${n}` as Id<"plantTasks">,
    logId: `log_${n}` as Id<"taskCompletionLogs">,
    previous: {
      lastCompletedAt: n === 0 ? null : n * 100,
      nextDueAt: n * 1000,
      consecutivePostponeCount: n,
    },
  };
}

describe("buildBatchUndoMessage", () => {
  it("按数量与类型标签拼接文案", () => {
    expect(buildBatchUndoMessage(5, "浇水")).toBe("已完成 5 个浇水任务");
    expect(buildBatchUndoMessage(2, "施肥")).toBe("已完成 2 个施肥任务");
  });
});

describe("buildBatchUndoPayload", () => {
  it("kind 标记为 batch", () => {
    const payload = buildBatchUndoPayload([makeResult(1), makeResult(2)], "浇水");
    expect(payload.kind).toBe("batch");
  });

  it("items 数量与传入结果一致，且逐条透传快照", () => {
    const results = [makeResult(1), makeResult(2), makeResult(3)];
    const payload = buildBatchUndoPayload(results, "浇水");

    expect(payload.items).toHaveLength(3);
    expect(payload.items[0].taskId).toBe(results[0].taskId);
    expect(payload.items[0].logId).toBe(results[0].logId);
    expect(payload.items[2].previous).toEqual(results[2].previous);
  });

  it("聚合文案随数量变化", () => {
    const payload = buildBatchUndoPayload([makeResult(1), makeResult(2)], "浇水");
    expect(payload.message).toBe("已完成 2 个浇水任务");
    // 每条 item 共享同一聚合文案，便于浮条显示。
    expect(payload.items.every((item) => item.message === "已完成 2 个浇水任务")).toBe(true);
  });

  it("空结果时数量为 0", () => {
    const payload = buildBatchUndoPayload([], "浇水");
    expect(payload.items).toHaveLength(0);
    expect(payload.message).toBe("已完成 0 个浇水任务");
  });

  it("保留 lastCompletedAt 为 null 的条目", () => {
    const payload = buildBatchUndoPayload([makeResult(0)], "施肥");
    expect(payload.items[0].previous.lastCompletedAt).toBeNull();
  });
});
