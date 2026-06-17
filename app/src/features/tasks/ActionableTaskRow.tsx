import { useState } from "react";
import { useMutation } from "convex/react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Check, Loader2 } from "lucide-react";

import { Icon } from "../../components/ui/Icon";
import { prefersReducedMotion, triggerHaptic } from "../../lib/motion";
import { buildUndoPayload, type CompletionUndoPayload } from "./undoComplete";
import { formatTaskTypeLabel, getTaskTypeIcon, type CareTaskType } from "./taskTypes";
import { taskTypeColorVar } from "./TaskTypeBadge";

export interface ActionableTask {
  customLabel: string | null;
  id: string;
  intervalDays: number;
  lastCompletedAt: number | null;
  nextDueAt: number;
  taskType: CareTaskType;
}

interface ActionableTaskRowProps {
  isOverdue: boolean;
  onCompleted: (result: {
    nextDueAt: number;
    taskId: string;
    undo: CompletionUndoPayload;
  }) => void;
  task: ActionableTask;
}

export function ActionableTaskRow({ isOverdue, onCompleted, task }: ActionableTaskRowProps) {
  const completeTask = useMutation(api.tasks.completePlantTask);
  const [status, setStatus] = useState<"idle" | "pending" | "done">("idle");
  const [showFx, setShowFx] = useState(false);

  const label = formatTaskTypeLabel(task.taskType, task.customLabel);
  const colorVar = taskTypeColorVar(task.taskType);
  const dueText = isOverdue ? "逾期" : "今天";
  const dueColor = isOverdue ? "var(--color-warning)" : "var(--color-leaf-light)";

  async function handleComplete() {
    if (status !== "idle") return;
    setStatus("pending");

    try {
      const result = await completeTask({ taskId: task.id as Id<"plantTasks"> });
      setStatus("done");
      triggerHaptic();
      if (!prefersReducedMotion()) {
        setShowFx(true);
      }
      onCompleted({
        nextDueAt: result.nextDueAt,
        taskId: result.taskId,
        undo: buildUndoPayload(result),
      });
    } catch {
      setStatus("idle");
    }
  }

  const isDone = status === "done";

  return (
    <div style={rowStyle}>
      {/* 左侧色条 */}
      <div style={{ ...colorBarStyle, background: colorVar }} />

      {/* 任务类型图标 */}
      <span style={{ ...iconWrapStyle, color: colorVar }}>
        <Icon icon={getTaskTypeIcon(task.taskType)} size={16} />
      </span>

      {/* 标签 */}
      <span style={labelStyle}>{label}</span>

      {/* 到期状态 */}
      <span style={{ ...dueStyle, color: dueColor }}>{dueText}</span>

      {/* 完成按钮 */}
      <div style={buttonShellStyle}>
        <button
          aria-label={`完成${label}`}
          disabled={status !== "idle"}
          onClick={() => void handleComplete()}
          style={isDone ? circleButtonDoneStyle : circleButtonStyle}
          type="button"
        >
          <span aria-hidden="true" style={completeIconStyle}>
            {status === "pending" ? (
              <Icon className="complete-spin" icon={Loader2} size={18} />
            ) : (
              <Icon icon={Check} size={18} />
            )}
          </span>
        </button>
        {showFx && (
          <span
            aria-hidden="true"
            onAnimationEnd={() => setShowFx(false)}
            style={fxStyle}
          >
            🍃
          </span>
        )}
      </div>
    </div>
  );
}

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-sm)",
  height: "48px",
  padding: "0 var(--space-sm)",
};

const colorBarStyle: React.CSSProperties = {
  width: "3px",
  height: "24px",
  borderRadius: "var(--radius-pill)",
  flexShrink: 0,
};

const iconWrapStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  lineHeight: 1,
  flexShrink: 0,
};

const labelStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  fontSize: "14px",
  fontWeight: 600,
  color: "var(--color-ink)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const dueStyle: React.CSSProperties = {
  flexShrink: 0,
  fontSize: "12px",
  fontWeight: 400,
};

const buttonShellStyle: React.CSSProperties = {
  position: "relative",
  display: "inline-flex",
  flexShrink: 0,
};

// 圆形完成按钮内图标居中容器，与 CompleteTaskButton 图标语言对齐。
const completeIconStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  lineHeight: 1,
};

const circleButtonStyle: React.CSSProperties = {
  appearance: "none",
  width: "36px",
  height: "36px",
  padding: 0,
  borderRadius: "var(--radius-pill)",
  border: "1px solid var(--color-line)",
  background: "var(--color-mist)",
  fontSize: "16px",
  lineHeight: 1,
  color: "var(--color-leaf)",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "transform 80ms ease-out",
};

const circleButtonDoneStyle: React.CSSProperties = {
  ...circleButtonStyle,
  background: "var(--color-success)",
  borderColor: "var(--color-success)",
  color: "var(--color-surface)",
  cursor: "default",
};

const fxStyle: React.CSSProperties = {
  position: "absolute",
  left: "50%",
  top: "50%",
  transform: "translate(-50%, -50%)",
  fontSize: "18px",
  lineHeight: 1,
  pointerEvents: "none",
  animation: "complete-fx-rise 600ms ease-out forwards",
};
