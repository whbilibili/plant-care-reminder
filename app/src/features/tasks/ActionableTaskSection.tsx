import { Info } from "lucide-react";

import { Icon } from "../../components/ui/Icon";
import { getUtcDayStart, computeCompletedToday } from "./scheduling";
import { ActionableTaskRow, type ActionableTask } from "./ActionableTaskRow";
import type { CompletionUndoPayload } from "./undoComplete";

interface ActionableTaskSectionProps {
  onCompleted: (result: {
    nextDueAt: number;
    taskId: string;
    undo: CompletionUndoPayload;
  }) => void;
  tasks: ActionableTask[];
}

export function ActionableTaskSection({ onCompleted, tasks }: ActionableTaskSectionProps) {
  const now = Date.now();
  const startOfToday = getUtcDayStart(now);
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const startOfTomorrow = startOfToday + MS_PER_DAY;

  // 筛选逾期+今天到期且今日未完成的任务
  const actionableTasks = tasks.filter((task) => {
    if (task.nextDueAt >= startOfTomorrow) return false;
    const completedToday = computeCompletedToday(task.lastCompletedAt, startOfToday, startOfTomorrow);
    return !completedToday;
  });

  if (actionableTasks.length === 0) return null;

  const hasOverdue = actionableTasks.some((t) => t.nextDueAt < startOfToday);
  const accentColor = hasOverdue ? "var(--color-warning)" : "var(--color-leaf-light)";

  return (
    <section
      aria-label="需要处理的养护任务"
      role="region"
      style={{ ...containerStyle, borderLeftColor: accentColor }}
    >
      {/* 区域标题 */}
      <h2 style={{ ...titleStyle, color: accentColor }}>
        <Icon icon={Info} size={13} strokeWidth={2.5} />
        需要处理（{actionableTasks.length}）
      </h2>

      {/* 任务行列表 */}
      <div style={listStyle}>
        {actionableTasks.map((task, index) => (
          <div key={task.id}>
            {index > 0 && <div style={dividerStyle} />}
            <ActionableTaskRow
              isOverdue={task.nextDueAt < startOfToday}
              onCompleted={onCompleted}
              task={task}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

const containerStyle: React.CSSProperties = {
  background: "var(--color-surface)",
  borderRadius: "var(--radius-card)",
  border: "1px solid var(--color-line)",
  borderLeft: "3px solid",
  padding: "var(--space-md)",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  display: "flex",
  alignItems: "center",
  gap: "6px",
  fontSize: "12px",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  lineHeight: 1.4,
};

const listStyle: React.CSSProperties = {
  marginTop: "var(--space-sm)",
};

const dividerStyle: React.CSSProperties = {
  height: "1px",
  background: "var(--color-line)",
  margin: "0 var(--space-sm)",
};
