import type { CSSProperties } from "react";
import { useQuery } from "convex/react";

import { api } from "../../../convex/_generated/api";
import { GroupedSurface, GroupedSurfaceDivider } from "../../components/ui/GroupedSurface";
import { CompletionLogRow } from "../plants/CompletionLogRow";
import type { CareTaskType } from "./taskTypes";

/**
 * 待办页·家庭动态区（CARE-HIST-004）。
 *
 * 通过 useQuery 调用 listFamilyRecentActivity 展示最近 5 条
 * 全家庭养护活动流。空数据时整个区域不渲染（不占空间）。
 *
 * 设计契约：
 * - 区域标题「家庭动态」独立于卡片外部，与「今天」「即将到期」分组标题一致
 * - 标题前带小绿点暗示实时动态
 * - 每条格式：[TaskIcon] [Avatar] 成员名 给 植物名 完成了 任务名 · 相对时间
 * - 复用 CompletionLogRow（带 plantName 维度）
 * - 空数据时整个区域不渲染
 */
export function FamilyRecentActivity() {
  const activities = useQuery(api.tasks.listFamilyRecentActivity, {});

  // loading 或空数据时不渲染
  if (!activities || activities.length === 0) {
    return null;
  }

  return (
    <div style={containerStyle}>
      {/* 独立标题 — 与「今天」「即将到期」分组标题视觉层级一致 */}
      <h2 style={groupTitleStyle}>
        <span style={dotStyle} />
        家庭动态
      </h2>

      <GroupedSurface>
        {activities.map((activity, index) => (
          <div key={activity.logId as string}>
            {index > 0 && <GroupedSurfaceDivider />}
            <CompletionLogRow
              taskType={activity.taskType as CareTaskType}
              customLabel={activity.customLabel}
              completedByName={activity.completedByName}
              completedByImageStorageId={activity.completedByImageStorageId}
              completedAt={activity.completedAt}
              plantName={activity.plantName}
            />
          </div>
        ))}
      </GroupedSurface>
    </div>
  );
}

// ─── 样式 ───────────────────────────────────────────────────────

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-sm)",
};

/** 与 TodoPage 中 groupTitleDefaultStyle 保持一致。 */
const groupTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "15px",
  fontWeight: 700,
  lineHeight: 1.3,
  display: "flex",
  alignItems: "center",
  gap: "8px",
  color: "var(--color-leaf)",
};

/** 小绿点，暗示「实时动态」语义。 */
const dotStyle: CSSProperties = {
  display: "inline-block",
  width: "6px",
  height: "6px",
  borderRadius: "50%",
  background: "var(--color-success)",
  flexShrink: 0,
};
