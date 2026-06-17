import type { Id } from "../../../convex/_generated/dataModel";

/** 完成动作前的字段快照，撤销时用于精确还原（PRD §9.1）。 */
export interface CompletionUndoPayload {
  taskId: Id<"plantTasks">;
  logId: Id<"taskCompletionLogs">;
  previous: {
    lastCompletedAt: number | null;
    nextDueAt: number;
    consecutivePostponeCount: number;
  };
  /** 浮条文案：单个完成 vs 批量完成（PRD §9.3）。 */
  message: string;
}

/** 撤销浮条停留时长（毫秒）：PRD §9.1 规定 3–5 秒，取 4 秒。 */
export const UNDO_TOAST_DURATION_MS = 4000;

/** completePlantTask mutation 返回中与撤销相关的部分。 */
export interface CompletionResult {
  taskId: Id<"plantTasks">;
  logId: Id<"taskCompletionLogs">;
  previous: {
    lastCompletedAt: number | null;
    nextDueAt: number;
    consecutivePostponeCount: number;
  };
}

/**
 * 把单次完成结果转成撤销浮条载荷。把字段映射收敛到纯函数，便于复用与测试。
 */
export function buildUndoPayload(
  result: CompletionResult,
  message = "已完成，可撤销",
): CompletionUndoPayload {
  return {
    taskId: result.taskId,
    logId: result.logId,
    previous: result.previous,
    message,
  };
}

/** 批量完成浮条文案（PRD §9.3）：「已完成 N 个浇水任务」。 */
export function buildBatchUndoMessage(count: number, taskTypeLabel: string) {
  return `已完成 ${count} 个${taskTypeLabel}任务`;
}

/** 一次批量完成的撤销载荷：保留每条 undo 信息，撤销时整批回滚。 */
export interface BatchCompletionUndoPayload {
  kind: "batch";
  items: CompletionUndoPayload[];
  message: string;
}

/**
 * 把批量完成结果转成批量撤销载荷。逐条复用 buildUndoPayload，并生成聚合文案。
 */
export function buildBatchUndoPayload(
  results: CompletionResult[],
  taskTypeLabel: string,
): BatchCompletionUndoPayload {
  const message = buildBatchUndoMessage(results.length, taskTypeLabel);
  return {
    kind: "batch",
    items: results.map((result) => buildUndoPayload(result, message)),
    message,
  };
}
