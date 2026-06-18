import { useState } from "react";

import { formatDueDate, formatTaskTypeLabel } from "../../lib/formatters";
import { clampLines, truncateSingleLine } from "../../lib/textTruncate";
import { CompleteTaskButton } from "./CompleteTaskButton";
import { PostponeButton } from "./PostponeButton";
import { PostponeHintBanner, shouldShowPostponeHint } from "./PostponeHintBanner";
import { TaskTypeBadge, taskTypeColorVar } from "./TaskTypeBadge";
import type { CompletionUndoPayload } from "./UndoToast";

export interface DueTaskCardData {
  completedToday: boolean;
  consecutivePostponeCount: number;
  customLabel: string | null;
  intervalDays: number;
  lastCompletedAt: number | null;
  nextDueAt: number;
  plantId: string;
  plantImageUrl: string | null;
  plantLocation: string | null;
  plantName: string;
  taskId: string;
  taskType: "watering" | "fertilizing" | "misting" | "repotting" | "pruning" | "custom";
}

interface DueTaskCardProps {
  onCompleted?: (undo: CompletionUndoPayload) => void;
  onOpenPlant: (plantId: string) => void;
  task: DueTaskCardData;
}

export function DueTaskCard({ onCompleted, onOpenPlant, task }: DueTaskCardProps) {
  const taskLabel = formatTaskTypeLabel(task.taskType, task.customLabel);
  const dueCopy = formatDueDate(task.nextDueAt);
  const isOverdue = task.nextDueAt < Date.now();
  const showPostponeHint = shouldShowPostponeHint(task.consecutivePostponeCount);
  const [completed, setCompleted] = useState(false);

  return (
    <article
      style={{
        ...cardStyle,
        ...(completed ? completedCardStyle : undefined),
      }}
    >
      <span
        aria-hidden="true"
        style={{ ...typeStripStyle, background: taskTypeColorVar(task.taskType) }}
      />
      <span style={thumbWrapStyle}>
        <button
          aria-label={`查看 ${task.plantName}`}
          onClick={() => onOpenPlant(task.plantId)}
          style={thumbButtonStyle}
          type="button"
        >
          {task.plantImageUrl ? (
            <img alt={`${task.plantName}封面图`} src={task.plantImageUrl} style={thumbImageStyle} />
          ) : (
            <span aria-hidden="true" style={thumbFallbackStyle}>
              🌿
            </span>
          )}
        </button>
        <TaskTypeBadge taskType={task.taskType} />
      </span>

      <div style={contentStyle}>
        <p style={plantNameStyle}>{task.plantName}</p>
        <p style={taskLabelStyle}>{taskLabel}</p>
        {isOverdue ? (
          <span style={overduePillStyle}>{dueCopy}</span>
        ) : (
          <p style={dueCopyStyle}>{dueCopy}</p>
        )}
      </div>

      <div style={actionsStyle}>
        <CompleteTaskButton
          appearance="circle"
          celebrateEmoji="🍃"
          onCompleted={(result) => {
            setCompleted(true);
            onCompleted?.(result.undo);
          }}
          taskId={task.taskId}
        />
        <PostponeButton currentNextDueAt={task.nextDueAt} taskId={task.taskId} />
      </div>

      {showPostponeHint ? (
        <div style={hintRowStyle}>
          <PostponeHintBanner plantId={task.plantId} taskId={task.taskId} />
        </div>
      ) : null}
    </article>
  );
}

const cardStyle: React.CSSProperties = {
  position: "relative",
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "var(--space-md)",
  borderRadius: "var(--radius-card)",
  padding: "var(--space-md)",
  paddingLeft: "calc(var(--space-md) + 4px)",
  background: "var(--color-surface)",
  border: "1px solid var(--color-line)",
  boxShadow: "var(--shadow-card)",
  transition: "opacity 300ms ease-out",
  opacity: 1,
  overflow: "hidden",
};

const actionsStyle: React.CSSProperties = {
  flexShrink: 0,
  display: "grid",
  gap: "4px",
  justifyItems: "center",
};

// 建议条占满整行，挂在卡片底部不抢主操作（PRD §8.5）。
const hintRowStyle: React.CSSProperties = {
  flexBasis: "100%",
  width: "100%",
};

const typeStripStyle: React.CSSProperties = {
  position: "absolute",
  left: 0,
  top: 0,
  bottom: 0,
  width: "4px",
  borderTopLeftRadius: "var(--radius-card)",
  borderBottomLeftRadius: "var(--radius-card)",
};

const thumbWrapStyle: React.CSSProperties = {
  position: "relative",
  flexShrink: 0,
  display: "inline-flex",
};

const completedCardStyle: React.CSSProperties = {
  opacity: 0,
  pointerEvents: "none",
};

const thumbButtonStyle: React.CSSProperties = {
  appearance: "none",
  flexShrink: 0,
  width: "40px",
  height: "40px",
  padding: 0,
  borderRadius: "var(--radius-pill)",
  border: "1px solid var(--color-line)",
  overflow: "hidden",
  background: "var(--color-mist)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

const thumbImageStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};

const thumbFallbackStyle: React.CSSProperties = {
  fontSize: "20px",
  lineHeight: 1,
};

const contentStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: "grid",
  gap: "2px",
};

const plantNameStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--color-ink)",
  fontSize: "1rem",
  fontWeight: 700,
  lineHeight: 1.3,
  ...truncateSingleLine,
};

const taskLabelStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--color-muted)",
  fontSize: "0.9rem",
  lineHeight: 1.4,
  ...clampLines(2),
};

const dueCopyStyle: React.CSSProperties = {
  margin: "2px 0 0",
  color: "var(--color-leaf-light)",
  fontSize: "0.82rem",
  lineHeight: 1.4,
};

const overduePillStyle: React.CSSProperties = {
  marginTop: "4px",
  width: "fit-content",
  padding: "4px 8px",
  borderRadius: "var(--radius-pill)",
  background: "rgba(221,107,32,0.08)",
  color: "var(--color-warning)",
  fontSize: "0.76rem",
  fontWeight: 700,
  lineHeight: 1,
};
