import type { CSSProperties } from "react";

import { Icon } from "../../components/ui/Icon";
import { MemberAvatar } from "../family/MemberAvatar";
import {
  formatTaskTypeLabel,
  getTaskTypeIcon,
  type CareTaskType,
} from "../tasks/taskTypes";
import { taskTypeColorVar } from "../tasks/TaskTypeBadge";
import { formatRelativeTime } from "../../lib/formatters";

interface CompletionLogRowProps {
  taskType: CareTaskType;
  customLabel: string | null;
  completedByName: string;
  completedByImageStorageId: string | null;
  completedAt: number;
  /** 可选：植物名维度（家庭动态用）。 */
  plantName?: string;
}

/**
 * 单条养护完成记录行（CARE-HIST-003 / CARE-HIST-004 共用）。
 *
 * 布局：[TaskIcon 20×20] [Avatar 24×24] 成员名 完成了 任务名 · 相对时间
 * 家庭动态模式额外显示：成员名 给 植物名 完成了 任务名 · 相对时间
 */
export function CompletionLogRow({
  taskType,
  customLabel,
  completedByName,
  completedByImageStorageId,
  completedAt,
  plantName,
}: CompletionLogRowProps) {
  const label = formatTaskTypeLabel(taskType, customLabel);
  const relativeTime = formatRelativeTime(completedAt);

  return (
    <div style={rowStyle}>
      {/* 任务类型图标 */}
      <span style={{ ...iconWrapStyle, color: taskTypeColorVar(taskType) }}>
        <Icon icon={getTaskTypeIcon(taskType)} size={20} />
      </span>

      {/* 成员头像（24×24） */}
      <MemberAvatar
        name={completedByName}
        imageStorageId={completedByImageStorageId}
        size={24}
      />

      {/* 文案内容 */}
      <span style={textStyle}>
        <span style={nameStyle}>{completedByName}</span>
        {plantName ? (
          <>
            <span style={mutedStyle}> 给 </span>
            <span style={plantNameStyle}>{plantName}</span>
          </>
        ) : null}
        <span style={mutedStyle}> 完成了 </span>
        <span style={taskLabelStyle}>{label}</span>
        <span style={timeStyle}> · {relativeTime}</span>
      </span>
    </div>
  );
}

// ─── 样式 ───────────────────────────────────────────────────────

const rowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-sm)",
  padding: "0 var(--space-md)",
  minHeight: "48px",
};

const iconWrapStyle: CSSProperties = {
  flexShrink: 0,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "20px",
  height: "20px",
};

const textStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  fontSize: "13px",
  lineHeight: 1.5,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const nameStyle: CSSProperties = {
  color: "var(--color-ink)",
  fontWeight: 500,
};

const mutedStyle: CSSProperties = {
  color: "var(--color-muted)",
};

const plantNameStyle: CSSProperties = {
  color: "var(--color-muted)",
  fontWeight: 500,
};

const taskLabelStyle: CSSProperties = {
  color: "var(--color-leaf-light)",
  fontWeight: 500,
};

const timeStyle: CSSProperties = {
  color: "var(--color-muted)",
  fontSize: "12px",
};
