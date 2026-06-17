import { useState } from "react";

import { formatTaskTypeLabel } from "../../lib/formatters";
import { CompleteAllButton } from "./CompleteAllButton";
import { DueTaskCard, type DueTaskCardData } from "./DueTaskCard";
import { UpcomingDueCard } from "./UpcomingDueCard";
import type { BatchCompletionUndoPayload, CompletionUndoPayload } from "./undoComplete";

interface DueTaskGroupProps {
  /** 是否允许点击标题折叠该分区（默认 false，始终展开）。 */
  collapsible?: boolean;
  /** 折叠状态持久化的 localStorage key；提供后跨会话记住用户选择。 */
  collapseStorageKey?: string;
  onCompleted?: (undo: CompletionUndoPayload) => void;
  onCompletedAll?: (undo: BatchCompletionUndoPayload) => void;
  onOpenPlant: (plantId: string) => void;
  tasks: DueTaskCardData[];
  title: string;
}

/** 读取持久化的折叠状态；默认展开（false=未折叠）。 */
function readCollapsed(storageKey?: string): boolean {
  if (!storageKey || typeof window === "undefined") {
    return false;
  }
  try {
    return window.localStorage.getItem(storageKey) === "1";
  } catch {
    return false;
  }
}

/** 按 taskType + 自定义标签聚合，使同名自定义任务也能合并成一类。 */
function typeKeyOf(task: DueTaskCardData) {
  return `${task.taskType}::${task.customLabel ?? ""}`;
}

export function DueTaskGroup({
  collapsible = false,
  collapseStorageKey,
  onCompleted,
  onCompletedAll,
  onOpenPlant,
  tasks,
  title,
}: DueTaskGroupProps) {
  const [collapsed, setCollapsed] = useState(() =>
    collapsible ? readCollapsed(collapseStorageKey) : false,
  );

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      if (collapseStorageKey && typeof window !== "undefined") {
        try {
          window.localStorage.setItem(collapseStorageKey, next ? "1" : "0");
        } catch {
          // localStorage 不可用时仅退化为会话内折叠，不影响功能。
        }
      }
      return next;
    });
  }

  if (tasks.length === 0) {
    return null;
  }

  const isCollapsed = collapsible && collapsed;

  // 今日已完成的卡片只做灰态展示，不参与「全部完成」批量动线。
  const actionableByType = new Map<string, DueTaskCardData[]>();
  for (const task of tasks) {
    if (task.completedToday) {
      continue;
    }
    const key = typeKeyOf(task);
    const list = actionableByType.get(key) ?? [];
    list.push(task);
    actionableByType.set(key, list);
  }

  return (
    <section style={sectionStyle}>
      {collapsible ? (
        <button
          aria-expanded={!isCollapsed}
          onClick={toggleCollapsed}
          style={collapseHeaderStyle}
          type="button"
        >
          <span style={labelStyle}>
            {title}
            <span style={countStyle}>{tasks.length}</span>
          </span>
          <span aria-hidden="true" style={chevronStyle}>
            {isCollapsed ? "▾" : "▴"}
          </span>
        </button>
      ) : (
        <h2 style={labelStyle}>
          {title}
          <span style={countStyle}>{tasks.length}</span>
        </h2>
      )}
      {isCollapsed ? null : (
      <div style={listStyle}>
        {tasks.map((task) => {
          if (task.completedToday) {
            return <UpcomingDueCard key={task.taskId} onOpenPlant={onOpenPlant} task={task} />;
          }

          const typeGroup = actionableByType.get(typeKeyOf(task)) ?? [];
          // 「全部完成」只在该类型的首张卡片上方出现，且同类型 ≥2 个才显示（PRD §9.3）。
          const isFirstOfType = typeGroup[0]?.taskId === task.taskId;
          const showCompleteAll = isFirstOfType && typeGroup.length >= 2;

          return (
            <div key={task.taskId} style={typeBlockStyle}>
              {showCompleteAll ? (
                <div style={typeHeaderStyle}>
                  <span style={typeHeaderLabelStyle}>
                    {formatTaskTypeLabel(task.taskType, task.customLabel)}
                    <span style={typeHeaderCountStyle}>{typeGroup.length}</span>
                  </span>
                  <CompleteAllButton
                    onCompleted={onCompletedAll}
                    taskIds={typeGroup.map((item) => item.taskId)}
                    taskTypeLabel={formatTaskTypeLabel(task.taskType, task.customLabel)}
                  />
                </div>
              ) : null}
              <DueTaskCard
                onCompleted={onCompleted}
                onOpenPlant={onOpenPlant}
                task={task}
              />
            </div>
          );
        })}
      </div>
      )}
    </section>
  );
}

const sectionStyle: React.CSSProperties = {
  display: "grid",
  gap: "var(--space-sm)",
};

const labelStyle: React.CSSProperties = {
  margin: 0,
  display: "flex",
  alignItems: "center",
  gap: "var(--space-sm)",
  color: "var(--color-leaf-light)",
  fontSize: "12px",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const collapseHeaderStyle: React.CSSProperties = {
  appearance: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "var(--space-sm)",
  width: "100%",
  padding: 0,
  background: "transparent",
  border: "none",
  cursor: "pointer",
  textAlign: "left",
};

const chevronStyle: React.CSSProperties = {
  color: "var(--color-leaf-light)",
  fontSize: "12px",
  lineHeight: 1,
};

const countStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "18px",
  height: "18px",
  padding: "0 5px",
  borderRadius: "var(--radius-pill)",
  background: "var(--color-mist)",
  color: "var(--color-leaf)",
  fontSize: "11px",
  letterSpacing: 0,
};

const listStyle: React.CSSProperties = {
  display: "grid",
  gap: "var(--space-sm)",
};

const typeBlockStyle: React.CSSProperties = {
  display: "grid",
  gap: "6px",
};

const typeHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "var(--space-sm)",
  paddingInline: "2px",
};

const typeHeaderLabelStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  color: "var(--color-muted)",
  fontSize: "12px",
  fontWeight: 700,
};

const typeHeaderCountStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "16px",
  height: "16px",
  padding: "0 4px",
  borderRadius: "var(--radius-pill)",
  background: "var(--color-mist)",
  color: "var(--color-leaf)",
  fontSize: "10px",
};
