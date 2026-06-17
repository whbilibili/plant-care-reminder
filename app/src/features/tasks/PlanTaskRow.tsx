import { Icon } from "../../components/ui/Icon";
import { truncateSingleLine } from "../../lib/textTruncate";
import { getUtcDayStart } from "./scheduling";
import { formatTaskTypeLabel, getTaskTypeIcon, type CareTaskType } from "./taskTypes";
import { taskTypeColorVar } from "./TaskTypeBadge";

export interface PlanTask {
  customLabel: string | null;
  id: string;
  intervalDays: number;
  nextDueAt: number;
  taskType: CareTaskType;
}

interface PlanTaskRowProps {
  onEdit: (taskId: string) => void;
  task: PlanTask;
}

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  month: "numeric",
  day: "numeric",
});

function formatNextDue(nextDueAt: number): { text: string; color: string } {
  const now = Date.now();
  const startOfToday = getUtcDayStart(now);
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const startOfTomorrow = startOfToday + MS_PER_DAY;

  if (nextDueAt < startOfToday) {
    const overdueDays = Math.floor((startOfToday - getUtcDayStart(nextDueAt)) / MS_PER_DAY);
    return { text: `逾期${overdueDays}天`, color: "var(--color-warning)" };
  }
  if (nextDueAt < startOfTomorrow) {
    return { text: "今天", color: "var(--color-leaf-light)" };
  }
  const daysUntil = Math.floor((getUtcDayStart(nextDueAt) - startOfToday) / MS_PER_DAY);
  if (daysUntil === 1) {
    return { text: "明天", color: "var(--color-leaf-light)" };
  }
  if (daysUntil <= 7) {
    return { text: `${daysUntil}天后`, color: "var(--color-muted)" };
  }
  return { text: dateFormatter.format(new Date(nextDueAt)), color: "var(--color-muted)" };
}

export function PlanTaskRow({ onEdit, task }: PlanTaskRowProps) {
  const label = formatTaskTypeLabel(task.taskType, task.customLabel);
  const interval = `每${task.intervalDays}天`;
  const { text: dueText, color: dueColor } = formatNextDue(task.nextDueAt);

  return (
    <button
      aria-label={`编辑${label}任务，${interval}，下次${dueText}`}
      onClick={() => onEdit(task.id)}
      style={rowStyle}
      type="button"
    >
      <span style={{ ...iconWrapStyle, color: taskTypeColorVar(task.taskType) }}>
        <Icon icon={getTaskTypeIcon(task.taskType)} size={16} />
      </span>
      <span style={labelStyle}>{label}</span>
      <span style={intervalStyle}>{interval}</span>
      <span style={{ ...dueStyle, color: dueColor }}>{dueText}</span>
      <span aria-hidden="true" style={arrowStyle}>
        ›
      </span>
    </button>
  );
}

const rowStyle: React.CSSProperties = {
  appearance: "none",
  display: "flex",
  alignItems: "center",
  gap: "var(--space-sm)",
  width: "100%",
  height: "44px",
  padding: "0 var(--space-sm)",
  border: "none",
  borderRadius: "var(--radius-button)",
  background: "transparent",
  cursor: "pointer",
  textAlign: "left",
};

const iconWrapStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  lineHeight: 1,
  flexShrink: 0,
};

const labelStyle: React.CSSProperties = {
  flex: 1,
  fontSize: "14px",
  fontWeight: 600,
  color: "var(--color-ink)",
  ...truncateSingleLine,
};

const intervalStyle: React.CSSProperties = {
  flexShrink: 0,
  minWidth: 0,
  fontSize: "12px",
  fontWeight: 400,
  color: "var(--color-muted)",
};

const dueStyle: React.CSSProperties = {
  flexShrink: 0,
  fontSize: "12px",
  fontWeight: 500,
};

const arrowStyle: React.CSSProperties = {
  flexShrink: 0,
  fontSize: "14px",
  color: "var(--color-muted)",
  opacity: 0.5,
};
