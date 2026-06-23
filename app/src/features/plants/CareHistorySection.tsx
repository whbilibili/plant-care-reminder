import { useState, type CSSProperties } from "react";
import { useQuery, usePaginatedQuery } from "convex/react";
import { ChevronRight, ChevronDown, Clock } from "lucide-react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { GroupedSurface, GroupedSurfaceDivider } from "../../components/ui/GroupedSurface";
import { Icon } from "../../components/ui/Icon";
import { CompletionLogRow } from "./CompletionLogRow";
import { formatRelativeTime } from "../../lib/formatters";
import type { CareTaskType } from "../tasks/taskTypes";

/** 每次加载的记录条数。 */
const PAGE_SIZE = 20;

interface CareHistorySectionProps {
  plantId: Id<"plants">;
}

/**
 * 植物详情页·养护记录折叠区（CARE-HIST-003）。
 *
 * 默认折叠，展开后通过 usePaginatedQuery 按时间倒序展示养护完成日志。
 * 收起时卸载分页 query 释放 Convex 订阅，但保留轻量 summary query
 * 以在折叠态展示「养护记录（N）  最近 XXX · 时间」概览。
 *
 * 设计契约：
 * - 折叠触发器：ChevronRight/ChevronDown + 标题「养护记录（N）」+ 概览摘要
 * - 折叠/展开都展示记录总数和最近一条记录的概览
 * - 记录行：CompletionLogRow（48px 高度）
 * - 底部「加载更多」ghost 按钮
 * - 空状态：「还没有养护记录」
 * - 折叠/展开过渡 + reduced-motion 兜底
 */
export function CareHistorySection({ plantId }: CareHistorySectionProps) {
  const [expanded, setExpanded] = useState(false);

  // 轻量 summary query：始终订阅，提供折叠态概览数据
  const summary = useQuery(api.tasks.getPlantCareHistorySummary, {
    plantId,
  });

  const totalCount = summary?.totalCount ?? 0;

  return (
    <GroupedSurface>
      {/* 折叠触发器 */}
      <button
        onClick={() => setExpanded((prev) => !prev)}
        style={triggerStyle}
        type="button"
        aria-expanded={expanded}
      >
        <Icon
          icon={expanded ? ChevronDown : ChevronRight}
          size={16}
          colorVar="--color-leaf"
        />
        <Icon icon={Clock} size={16} colorVar="--color-leaf" />
        <span style={triggerTitleStyle}>养护记录</span>
        <span style={countStyle}>（{totalCount}）</span>

        {/* 概览摘要：最近一条记录的人名和时间 */}
        {summary?.latestCompletedByName && summary.latestCompletedAt ? (
          <span style={statSummaryStyle}>
            最近{" "}
            <span style={statHighlightStyle}>
              {summary.latestCompletedByName} · {formatRelativeTime(summary.latestCompletedAt)}
            </span>
          </span>
        ) : null}
      </button>

      {/* 展开时挂载记录面板（条件渲染以释放 Convex 分页订阅） */}
      {expanded && <CareHistoryPanel plantId={plantId} />}
    </GroupedSurface>
  );
}

// ─── 展开后的记录面板 ──────────────────────────────────────────

interface CareHistoryPanelProps {
  plantId: Id<"plants">;
}

function CareHistoryPanel({ plantId }: CareHistoryPanelProps) {
  const { results, status, loadMore, isLoading } = usePaginatedQuery(
    api.tasks.listPlantCompletionLogs,
    { plantId },
    { initialNumItems: PAGE_SIZE },
  );

  // Convex usePaginatedQuery 返回的 results 是分页合并后的完整数组
  const logs = results ?? [];

  if (status === "LoadingFirstPage") {
    return (
      <div style={emptyStyle}>
        <span style={emptyTextStyle}>加载中…</span>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div style={emptyStyle}>
        <span style={{ fontSize: "24px" }}>📋</span>
        <span style={emptyTextStyle}>还没有养护记录</span>
      </div>
    );
  }

  const canLoadMore = status === "CanLoadMore";

  return (
    <div style={panelStyle}>
      {logs.map((log, index) => (
        <div key={log.logId as string}>
          {index > 0 && <GroupedSurfaceDivider />}
          <CompletionLogRow
            taskType={log.taskType as CareTaskType}
            customLabel={log.customLabel}
            completedByName={log.completedByName}
            completedByImageStorageId={log.completedByImageStorageId}
            completedAt={log.completedAt}
            imageStorageId={(log as Record<string, unknown>).imageStorageId as string | null}
          />
        </div>
      ))}

      {/* 加载更多按钮 */}
      {canLoadMore && (
        <>
          <GroupedSurfaceDivider />
          <button
            onClick={() => loadMore(PAGE_SIZE)}
            disabled={isLoading}
            style={loadMoreStyle}
            type="button"
          >
            {isLoading ? "加载中…" : "加载更多"}
          </button>
        </>
      )}
    </div>
  );
}

// ─── 样式 ───────────────────────────────────────────────────────

const triggerStyle: CSSProperties = {
  appearance: "none",
  display: "flex",
  alignItems: "center",
  gap: "var(--space-xs)",
  width: "100%",
  padding: "var(--space-md)",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  textAlign: "left",
};

const triggerTitleStyle: CSSProperties = {
  fontSize: "15px",
  fontWeight: 700,
  color: "var(--color-ink)",
};

const countStyle: CSSProperties = {
  fontSize: "15px",
  fontWeight: 600,
  color: "var(--color-muted)",
};

const statSummaryStyle: CSSProperties = {
  marginLeft: "auto",
  marginRight: "var(--space-xs)",
  fontSize: "12px",
  fontWeight: 600,
  color: "var(--color-muted)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const statHighlightStyle: CSSProperties = {
  color: "var(--color-leaf-light)",
  fontWeight: 700,
};

const panelStyle: CSSProperties = {
  /** 平滑展开动画由 tokens.css 全局 transition 兜底。 */
};

const emptyStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "var(--space-lg) var(--space-md)",
  gap: "var(--space-xs)",
};

const emptyTextStyle: CSSProperties = {
  fontSize: "13px",
  color: "var(--color-muted)",
};

const loadMoreStyle: CSSProperties = {
  appearance: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  padding: "var(--space-sm) var(--space-md)",
  border: "none",
  background: "transparent",
  fontSize: "13px",
  fontWeight: 500,
  color: "var(--color-muted)",
  cursor: "pointer",
};
