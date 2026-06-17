import { useState } from "react";

import { formatDueDate, formatTaskTypeLabel } from "../../lib/formatters";
import { clampLines } from "../../lib/textTruncate";
import { Button } from "../../components/ui/Button";
import { CompleteTaskButton } from "./CompleteTaskButton";

interface TaskListItemProps {
  onCompleted?: (result: { lastCompletedAt: number; nextDueAt: number; taskId: string }) => void;
  onEdit: () => void;
  task: {
    customLabel: string | null;
    id: string;
    intervalDays: number;
    lastCompletedAt: number | null;
    nextDueAt: number;
    taskType: "watering" | "fertilizing" | "misting" | "repotting" | "pruning" | "custom";
  };
}

const detailDateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

export function TaskListItem({ onCompleted, onEdit, task }: TaskListItemProps) {
  const title = formatTaskTypeLabel(task.taskType, task.customLabel);
  const completionCopy = task.lastCompletedAt
    ? `上次完成于 ${detailDateFormatter.format(new Date(task.lastCompletedAt))}`
    : "还没有完成记录";
  const [completed, setCompleted] = useState(false);

  function handleCompleted(result: { lastCompletedAt: number; nextDueAt: number; taskId: string }) {
    setCompleted(true);
    onCompleted?.(result);
  }

  return (
    <article
      style={{
        ...taskCardStyle,
        ...(completed ? completedCardStyle : undefined),
      }}
    >
      <div style={copyStackStyle}>
        <p style={taskEyebrowStyle}>已启用提醒</p>
        <h2 style={taskTitleStyle}>{title}</h2>
        <p style={taskMetaStyle}>
          {formatDueDate(task.nextDueAt)} · 每 {task.intervalDays} 天一次
        </p>
        <p style={taskHistoryStyle}>{completionCopy}</p>
      </div>
      <div style={actionsStyle}>
        <Button fullWidth={false} onClick={onEdit} type="button" variant="secondary">
          编辑
        </Button>
        <CompleteTaskButton onCompleted={handleCompleted} taskId={task.id} />
      </div>
    </article>
  );
}

const taskCardStyle: React.CSSProperties = {
  borderRadius: "var(--radius-card)",
  padding: "var(--space-md)",
  background: "var(--color-surface)",
  border: "1px solid var(--color-line)",
  boxShadow: "var(--shadow-card)",
  display: "grid",
  gap: "var(--space-md)",
  transition: "opacity 300ms ease-out",
  opacity: 1,
};

const completedCardStyle: React.CSSProperties = {
  opacity: 0,
  pointerEvents: "none",
};

const copyStackStyle: React.CSSProperties = {
  display: "grid",
  gap: "var(--space-xs)",
};

const taskEyebrowStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--color-leaf-light)",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  fontSize: "12px",
  fontWeight: 700,
};

const taskTitleStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--color-ink)",
  fontSize: "1.1rem",
  lineHeight: 1.2,
  ...clampLines(2),
};

const taskMetaStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--color-leaf-light)",
  fontSize: "0.88rem",
  lineHeight: 1.5,
};

const taskHistoryStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--color-muted)",
  fontSize: "0.85rem",
  lineHeight: 1.5,
};

const actionsStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "var(--space-sm)",
};
