import { useMutation } from "convex/react";
import { useState } from "react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { buildBatchUndoPayload, type BatchCompletionUndoPayload } from "./undoComplete";

interface CompleteAllButtonProps {
  /** 同类型分组内的任务 id 列表（已过滤掉今日已完成）。 */
  taskIds: string[];
  /** 分组类型标签，用于批量撤销文案，例如「浇水」。 */
  taskTypeLabel: string;
  onCompleted?: (undo: BatchCompletionUndoPayload) => void;
}

/**
 * 分区级「全部完成」轻按钮（PRD §9.3）：命中「拿起喷壶一次浇完一类」的家务动线。
 * 视觉权重低于单卡完成按钮（弱描边/文字），仅由父级在同类型 ≥2 个时渲染。
 */
export function CompleteAllButton({ onCompleted, taskIds, taskTypeLabel }: CompleteAllButtonProps) {
  const completeBatch = useMutation(api.tasks.completePlantTasksBatch);
  const [status, setStatus] = useState<"idle" | "pending" | "error">("idle");

  async function handleClick() {
    setStatus("pending");
    try {
      const { results } = await completeBatch({
        taskIds: taskIds as Id<"plantTasks">[],
      });
      setStatus("idle");
      if (results.length > 0) {
        onCompleted?.(buildBatchUndoPayload(results, taskTypeLabel));
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <button
      disabled={status === "pending"}
      onClick={handleClick}
      style={buttonStyle}
      type="button"
    >
      {status === "pending" ? "完成中..." : "✅ 全部完成"}
    </button>
  );
}

const buttonStyle: React.CSSProperties = {
  appearance: "none",
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  padding: "2px 8px",
  borderRadius: "var(--radius-pill)",
  border: "1px solid var(--color-leaf-light)",
  background: "transparent",
  color: "var(--color-leaf-light)",
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: 0,
  textTransform: "none",
  cursor: "pointer",
};
