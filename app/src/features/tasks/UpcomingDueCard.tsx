import { formatTaskTypeLabel } from "../../lib/formatters";
import { clampLines, truncateSingleLine } from "../../lib/textTruncate";
import type { DueTaskCardData } from "./DueTaskCard";
import { TaskTypeBadge } from "./TaskTypeBadge";

const nextDueFormatter = new Intl.DateTimeFormat("zh-CN", {
  month: "numeric",
  day: "numeric",
});

interface UpcomingDueCardProps {
  onOpenPlant: (plantId: string) => void;
  task: DueTaskCardData;
}

/**
 * 今日已完成、下次到期日落在即将到期窗口内的任务的灰态展示卡。
 * 文案：「✅ 已完成 · 下次 X 月 X 日」，左侧浅绿对勾，整卡降饱和度。
 */
export function UpcomingDueCard({ onOpenPlant, task }: UpcomingDueCardProps) {
  const taskLabel = formatTaskTypeLabel(task.taskType, task.customLabel);
  const nextDueCopy = `✅ 已完成 · 下次 ${nextDueFormatter.format(new Date(task.nextDueAt))}`;

  return (
    <article style={cardStyle}>
      <span aria-hidden="true" style={checkStripStyle} />
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
        <p style={nextDueStyle}>{nextDueCopy}</p>
      </div>
    </article>
  );
}

const cardStyle: React.CSSProperties = {
  position: "relative",
  display: "flex",
  alignItems: "center",
  gap: "var(--space-md)",
  borderRadius: "var(--radius-card)",
  padding: "var(--space-md)",
  paddingLeft: "calc(var(--space-md) + 4px)",
  background: "var(--color-surface)",
  border: "1px solid var(--color-line)",
  boxShadow: "var(--shadow-card)",
  opacity: 0.7,
  overflow: "hidden",
};

const checkStripStyle: React.CSSProperties = {
  position: "absolute",
  left: 0,
  top: 0,
  bottom: 0,
  width: "4px",
  background: "var(--color-success)",
  borderTopLeftRadius: "var(--radius-card)",
  borderBottomLeftRadius: "var(--radius-card)",
};

const thumbWrapStyle: React.CSSProperties = {
  position: "relative",
  flexShrink: 0,
  display: "inline-flex",
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
  color: "var(--color-muted)",
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

const nextDueStyle: React.CSSProperties = {
  margin: "2px 0 0",
  color: "var(--color-success)",
  fontSize: "0.82rem",
  fontWeight: 600,
  lineHeight: 1.4,
};
