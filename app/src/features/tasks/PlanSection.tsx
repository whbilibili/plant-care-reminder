import { ClipboardList } from "lucide-react";

import { Icon } from "../../components/ui/Icon";
import { PlanTaskRow, type PlanTask } from "./PlanTaskRow";

interface PlanSectionProps {
  onAdd: () => void;
  onEdit: (taskId: string) => void;
  tasks: PlanTask[];
}

export function PlanSection({ onAdd, onEdit, tasks }: PlanSectionProps) {
  // 按 nextDueAt 升序排列
  const sortedTasks = [...tasks].sort((a, b) => a.nextDueAt - b.nextDueAt);

  if (sortedTasks.length === 0) {
    return (
      <section style={containerStyle}>
        <div style={emptyStateStyle}>
          <span aria-hidden="true" style={emptyEmojiStyle}>
            🌱
          </span>
          <p style={emptyTitleStyle}>暂无养护计划</p>
          <p style={emptyDescStyle}>为这盆植物添加浇水、施肥等养护提醒</p>
          <button onClick={onAdd} style={emptyCtaStyle} type="button">
            + 添加养护计划
          </button>
        </div>
      </section>
    );
  }

  return (
    <section style={containerStyle}>
      {/* 区域标题 */}
      <div style={headerStyle}>
        <h2 style={titleStyle}>
          <Icon icon={ClipboardList} size={13} strokeWidth={2.5} />
          养护计划（{sortedTasks.length}）
        </h2>
        <button aria-label="添加养护计划" onClick={onAdd} style={addButtonStyle} type="button">
          + 添加
        </button>
      </div>

      {/* 任务行列表 */}
      <div style={listStyle}>
        {sortedTasks.map((task, index) => (
          <div key={task.id}>
            {index > 0 && <div style={dividerStyle} />}
            <PlanTaskRow onEdit={onEdit} task={task} />
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
  padding: "var(--space-md)",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
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
  color: "var(--color-leaf-light)",
  lineHeight: 1.4,
};

const addButtonStyle: React.CSSProperties = {
  appearance: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "44px",
  minHeight: "44px",
  padding: "0 var(--space-sm)",
  border: "none",
  borderRadius: "var(--radius-button)",
  background: "transparent",
  fontSize: "13px",
  fontWeight: 500,
  color: "var(--color-leaf)",
  cursor: "pointer",
};

const listStyle: React.CSSProperties = {
  marginTop: "var(--space-sm)",
};

const dividerStyle: React.CSSProperties = {
  height: "1px",
  background: "var(--color-line)",
  margin: "0 var(--space-sm)",
};

const emptyStateStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "160px",
  gap: "var(--space-xs)",
  textAlign: "center",
};

const emptyEmojiStyle: React.CSSProperties = {
  fontSize: "32px",
  lineHeight: 1,
};

const emptyTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "14px",
  fontWeight: 600,
  color: "var(--color-ink)",
};

const emptyDescStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "13px",
  fontWeight: 400,
  color: "var(--color-muted)",
};

const emptyCtaStyle: React.CSSProperties = {
  appearance: "none",
  marginTop: "var(--space-sm)",
  padding: "var(--space-sm) var(--space-md)",
  border: "none",
  borderRadius: "var(--radius-button)",
  background: "var(--color-gold)",
  color: "var(--color-ink)",
  fontSize: "14px",
  fontWeight: 600,
  cursor: "pointer",
};
