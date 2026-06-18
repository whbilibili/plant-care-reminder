import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  Pencil,
  ChevronRight,
  ChevronDown,
  Info,
  Check,
  Loader2,
  Plus,
  ClipboardList,
  FileText,
  StickyNote,
  Calendar,
  MapPin,
  Sprout,
} from "lucide-react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { navigate } from "../../app/router";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { ScreenNav } from "../../components/ui/ScreenNav";
import { ObjectSummaryBand } from "../../components/ui/ObjectSummaryBand";
import { GroupedSurface, GroupedSurfaceDivider } from "../../components/ui/GroupedSurface";
import { TaskActionRow } from "../../components/ui/TaskActionRow";
import { StorageImage } from "../../components/ui/StorageImage";
import { Icon } from "../../components/ui/Icon";
import { PlantManagementSection } from "./PlantManagementSection";
import { CareHistorySection } from "./CareHistorySection";
import { ImagePreviewOverlay } from "./ImagePreviewOverlay";
import { UndoToast } from "../tasks/UndoToast";
import type { CompletionUndoPayload } from "../tasks/undoComplete";
import { buildUndoPayload } from "../tasks/undoComplete";
import {
  formatTaskTypeLabel,
  getTaskTypeIcon,
  type CareTaskType,
} from "../tasks/taskTypes";
import { taskTypeColorVar } from "../tasks/TaskTypeBadge";
import { getUtcDayStart, computeCompletedToday } from "../tasks/scheduling";
import { prefersReducedMotion, triggerHaptic } from "../../lib/motion";

interface PlantDetailPageProps {
  plantId: string | null;
}

interface PlantDetailResponse {
  plant: {
    archivedAt: number | null;
    createdAt: number;
    description: string | null;
    familyId: string;
    id: string;
    imageStorageId: string | null;
    imageUrl: string | null;
    isArchived: boolean;
    location: string | null;
    name: string;
    note: string | null;
    updatedAt: number;
  };
  tasks: Array<{
    customLabel: string | null;
    enabled: boolean;
    id: string;
    intervalDays: number;
    lastCompletedAt: number | null;
    nextDueAt: number;
    taskType: "watering" | "fertilizing" | "misting" | "repotting" | "pruning" | "custom";
  }>;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  month: "numeric",
  day: "numeric",
});

const fullDateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

/** 默认展示的计划行数 */
const PLAN_PREVIEW_COUNT = 2;

export function PlantDetailPage({ plantId }: PlantDetailPageProps) {
  const result = useQuery(
    api.plants.getPlantDetail,
    plantId ? { plantId: plantId as Id<"plants"> } : "skip",
  ) as
    | PlantDetailResponse
    | null
    | undefined;
  const completeTask = useMutation(api.tasks.completePlantTask);
  const undoComplete = useMutation(api.tasks.undoCompletePlantTask);
  const [archivedStateOverride, setArchivedStateOverride] = useState<{
    archivedAt: number | null;
    isArchived: boolean;
  } | null>(null);
  const [undoPayload, setUndoPayload] = useState<CompletionUndoPayload | null>(null);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [planExpanded, setPlanExpanded] = useState(false);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setArchivedStateOverride(null);
    setPlanExpanded(false);
    setCompletedTaskIds(new Set());
  }, [plantId]);

  // ─── 边界状态 ───────────────────────────────────────────────

  if (!plantId) {
    return (
      <EmptyState
        badge="植物详情"
        title="当前植物详情缺少路由参数"
        description="请返回植物列表，从有效的植物卡片重新进入。"
        actions={
          <Button type="button" variant="secondary" onClick={() => navigate("/plants")}>
            返回植物列表
          </Button>
        }
      />
    );
  }

  if (result === undefined) {
    return (
      <main style={pageStyle}>
        <ScreenNav title="…" onBack={() => navigate("/plants")} />
        <p role="status" style={loadingBodyStyle}>正在加载植物信息…</p>
      </main>
    );
  }

  if (result === null) {
    return (
      <main style={pageStyle}>
        <ScreenNav title="" onBack={() => navigate("/plants")} />
        <EmptyState
          badge="不可用"
          title="当前家庭中找不到这盆植物"
          description="这条植物资料可能已删除，或者属于其他家庭。"
          actions={
            <Button type="button" variant="secondary" onClick={() => navigate("/plants")}>
              返回植物列表
            </Button>
          }
          minHeight="240px"
        />
      </main>
    );
  }

  // ─── 数据准备 ───────────────────────────────────────────────

  const plant = archivedStateOverride
    ? { ...result.plant, ...archivedStateOverride }
    : result.plant;

  const now = Date.now();
  const startOfToday = getUtcDayStart(now);
  const startOfTomorrow = startOfToday + MS_PER_DAY;

  // 需要处理的任务：仅启用的、逾期+今天到期且今日未完成
  const actionableTasks = result.tasks.filter((task) => {
    if (!task.enabled) return false;
    if (task.nextDueAt >= startOfTomorrow) return false;
    const completedToday = computeCompletedToday(task.lastCompletedAt, startOfToday, startOfTomorrow);
    return !completedToday && !completedTaskIds.has(task.id);
  });

  // 养护计划：所有任务（含停用），启用的排前面，停用的排后面
  const sortedTasks = [...result.tasks].sort((a, b) => {
    if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
    return a.nextDueAt - b.nextDueAt;
  });
  const visiblePlanTasks = planExpanded ? sortedTasks : sortedTasks.slice(0, PLAN_PREVIEW_COUNT);
  const totalPlanCount = sortedTasks.length;

  // 状态 badge
  const hasActionable = actionableTasks.length > 0;

  async function handleCompleteTask(task: PlantDetailResponse["tasks"][number]) {
    if (completingTaskId) return;
    setCompletingTaskId(task.id);

    try {
      const res = await completeTask({ taskId: task.id as Id<"plantTasks"> });
      triggerHaptic();
      setCompletedTaskIds((prev) => new Set(prev).add(task.id));

      const label = formatTaskTypeLabel(task.taskType, task.customLabel);
      const nextDateStr = dateFormatter.format(new Date(res.nextDueAt));
      const message = `🍃 ${label}已完成，下次 ${nextDateStr}`;

      setUndoPayload({
        ...buildUndoPayload(res),
        message,
      });
    } catch {
      // 静默处理
    } finally {
      setCompletingTaskId(null);
    }
  }

  async function handleUndo(payload: CompletionUndoPayload) {
    setUndoPayload(null);
    try {
      await undoComplete({
        taskId: payload.taskId,
        logId: payload.logId,
        previous: payload.previous,
      });
      setCompletedTaskIds((prev) => {
        const next = new Set(prev);
        next.delete(payload.taskId);
        return next;
      });
    } catch {
      // 静默处理
    }
  }

  function formatNextDue(nextDueAt: number): { text: string; color: string } {
    if (nextDueAt < startOfToday) {
      const overdueDays = Math.floor((startOfToday - getUtcDayStart(nextDueAt)) / MS_PER_DAY);
      return { text: `逾期${overdueDays}天`, color: "var(--color-warning)" };
    }
    if (nextDueAt < startOfTomorrow) {
      return { text: "今天", color: "var(--color-leaf)" };
    }
    const daysUntil = Math.floor((getUtcDayStart(nextDueAt) - startOfToday) / MS_PER_DAY);
    if (daysUntil === 1) {
      return { text: "明天", color: "var(--color-muted)" };
    }
    if (daysUntil <= 7) {
      return { text: `${daysUntil}天后`, color: "var(--color-muted)" };
    }
    return { text: dateFormatter.format(new Date(nextDueAt)), color: "var(--color-muted)" };
  }

  // ─── 渲染 ───────────────────────────────────────────────────

  return (
    <main style={pageStyle}>
      {/* ScreenNav: 透明导航 */}
      <ScreenNav
        title={plant.name}
        onBack={() => navigate("/plants")}
        rightAction={
          <button
            aria-label="编辑植物"
            onClick={() => navigate(`/plants/${plant.id}/edit`)}
            style={editButtonStyle}
            type="button"
          >
            <Icon icon={Pencil} size={18} />
          </button>
        }
      />

      {/* ObjectSummaryBand: 植物摘要（卡片包裹） */}
      <div style={sectionSpacingStyle}>
        <GroupedSurface>
          <ObjectSummaryBand
            thumbnail={
              <StorageImage
                alt={plant.name}
                fallback={<div style={thumbnailPlaceholderStyle}>🌿</div>}
                initialUrl={plant.imageUrl}
                storageId={plant.imageStorageId as any}
                style={thumbnailImgStyle}
              />
            }
            title={plant.name}
            subtitle={
              plant.location ? (
                <span style={subtitleWithIconStyle}>
                  <Icon icon={MapPin} size={13} colorVar="--color-muted" />
                  {plant.location}
                </span>
              ) : undefined
            }
            statusBadge={
              hasActionable && !plant.isArchived ? (
                <span style={statusBadgeStyle}>
                  <Icon icon={Sprout} size={13} colorVar="--color-leaf" />
                  今天有任务待完成
                </span>
              ) : undefined
            }
            onThumbnailClick={plant.imageUrl ? () => setShowImagePreview(true) : undefined}
          />
        </GroupedSurface>
      </div>

      {/* 需要处理 section */}
      {!plant.isArchived && actionableTasks.length > 0 && (
        <div style={sectionSpacingStyle}>
          <GroupedSurface titleIcon={Info} title={`需要处理（${actionableTasks.length}）`}>
            {actionableTasks.map((task, index) => {
              const label = formatTaskTypeLabel(task.taskType, task.customLabel);
              const isOverdue = task.nextDueAt < startOfToday;
              const dueText = isOverdue ? "逾期" : "今天";
              const isCompleting = completingTaskId === task.id;

              return (
                <div key={task.id}>
                  {index > 0 && <GroupedSurfaceDivider />}
                  <TaskActionRow
                    icon={
                      <span style={{ color: taskTypeColorVar(task.taskType) }}>
                        <Icon icon={getTaskTypeIcon(task.taskType)} size={18} />
                      </span>
                    }
                    label={label}
                    statusText={dueText}
                    accentColor="var(--color-leaf)"
                    action={
                      <button
                        aria-label={`完成${label}`}
                        disabled={isCompleting}
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleCompleteTask(task);
                        }}
                        style={completeButtonStyle}
                        type="button"
                      >
                        {isCompleting ? (
                          <Icon className="complete-spin" icon={Loader2} size={18} />
                        ) : (
                          <Icon icon={Check} size={18} />
                        )}
                      </button>
                    }
                  />
                </div>
              );
            })}
          </GroupedSurface>
        </div>
      )}

      {/* 养护计划 section */}
      <div style={sectionSpacingStyle}>
        <GroupedSurface
          titleIcon={ClipboardList}
          title={`养护计划（${totalPlanCount}）`}
          titleAction={
            <button
              aria-label="添加养护计划"
              onClick={() => navigate(`/plants/${plant.id}/tasks/new`)}
              style={addPlanButtonStyle}
              type="button"
            >
              <Icon icon={Plus} size={14} />
              <span>添加</span>
            </button>
          }
        >
          {sortedTasks.length === 0 ? (
            <div style={emptyPlanStyle}>
              <span style={{ fontSize: "24px" }}>🌱</span>
              <p style={emptyPlanTextStyle}>暂无养护计划，点击添加</p>
            </div>
          ) : (
            <>
              {visiblePlanTasks.map((task, index) => {
                const label = formatTaskTypeLabel(task.taskType, task.customLabel);
                const interval = `每${task.intervalDays}天`;
                const { text: dueText } = formatNextDue(task.nextDueAt);
                const isDisabled = !task.enabled;

                return (
                  <div key={task.id} style={isDisabled ? disabledTaskRowStyle : undefined}>
                    {index > 0 && <GroupedSurfaceDivider />}
                    <TaskActionRow
                      icon={
                        <span style={{ color: isDisabled ? "var(--color-muted)" : taskTypeColorVar(task.taskType) }}>
                          <Icon icon={getTaskTypeIcon(task.taskType)} size={18} />
                        </span>
                      }
                      label={isDisabled ? `${label}（已停用）` : label}
                      meta={interval}
                      statusText={isDisabled ? "已停用" : dueText}
                      action={
                        <Icon icon={ChevronRight} size={16} colorVar="--color-muted" />
                      }
                      onClick={() => navigate(`/plants/${plant.id}/tasks/${task.id}/edit`)}
                    />
                  </div>
                );
              })}

              {/* 查看全部 / 收起 */}
              {totalPlanCount > PLAN_PREVIEW_COUNT && (
                <>
                  <GroupedSurfaceDivider />
                  <button
                    onClick={() => setPlanExpanded(!planExpanded)}
                    style={expandButtonStyle}
                    type="button"
                  >
                    <span>
                      {planExpanded ? "收起" : `查看全部（${totalPlanCount}）`}
                    </span>
                    <Icon
                      icon={ChevronDown}
                      size={14}
                      style={{
                        transform: planExpanded ? "rotate(180deg)" : undefined,
                        transition: "transform 200ms ease",
                      }}
                    />
                  </button>
                </>
              )}
            </>
          )}
        </GroupedSurface>
      </div>

      {/* 养护记录折叠区（CARE-HIST-003 / CARE-HIST-005：L3.5 位置） */}
      <div style={sectionSpacingStyle}>
        <CareHistorySection plantId={plant.id as Id<"plants">} />
      </div>

      {/* 植物档案 section */}
      <div style={sectionSpacingStyle}>
        <GroupedSurface title="植物档案">
          {/* 简介 */}
          {plant.description && (
            <>
              <div style={archiveRowStyle}>
                <span style={archiveRowLabelStyle}><Icon icon={FileText} size={14} /> 简介</span>
                <span style={archiveRowValueStyle}>{plant.description}</span>
              </div>
              <GroupedSurfaceDivider />
            </>
          )}

          {/* 入手时间 */}
          <div style={archiveRowStyle}>
            <span style={archiveRowLabelStyle}><Icon icon={Calendar} size={14} /> 入手时间</span>
            <span style={archiveRowValueStyle}>
              {fullDateFormatter.format(new Date(plant.createdAt))}
            </span>
          </div>

          {/* 备注 */}
          {plant.note && (
            <>
              <GroupedSurfaceDivider />
              <div style={archiveRowStyle}>
                <span style={archiveRowLabelStyle}><Icon icon={StickyNote} size={14} /> 备注</span>
                <span style={archiveRowValueStyle}>{plant.note}</span>
              </div>
            </>
          )}
        </GroupedSurface>
      </div>

      {/* 管理区（归档/删除） */}
      <div style={managementSpacingStyle}>
        <PlantManagementSection
          isArchived={plant.isArchived}
          onArchivedStateChange={setArchivedStateOverride}
          onDeleted={() => navigate("/plants")}
          plantId={plant.id}
          plantName={plant.name}
        />
      </div>

      {/* 底部 motivation */}
      <p style={motivationStyle}>用心记录，让植物陪伴每一天</p>

      {/* 底部安全区占位 */}
      <div style={bottomSafeAreaStyle} />

      {/* UndoToast */}
      {undoPayload && (
        <UndoToast
          payload={undoPayload}
          onUndo={(p) => void handleUndo(p as CompletionUndoPayload)}
          onDismiss={() => setUndoPayload(null)}
        />
      )}

      {/* 全屏图片预览 */}
      {showImagePreview && plant.imageUrl && (
        <ImagePreviewOverlay
          imageUrl={plant.imageUrl}
          onClose={() => setShowImagePreview(false)}
          plantName={plant.name}
        />
      )}
    </main>
  );
}

// ─── 样式 ─────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  minHeight: "100%",
  animation: "page-enter 200ms ease-out",
};

const loadingBodyStyle: React.CSSProperties = {
  margin: 0,
  padding: "var(--space-xl) var(--space-md)",
  color: "var(--color-muted)",
  fontSize: "14px",
  lineHeight: 1.6,
  textAlign: "center",
};

const editButtonStyle: React.CSSProperties = {
  appearance: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "44px",
  height: "44px",
  padding: 0,
  border: "none",
  borderRadius: "var(--radius-button)",
  background: "transparent",
  color: "var(--color-leaf)",
  cursor: "pointer",
};

const thumbnailImgStyle: React.CSSProperties = {
  width: "56px",
  height: "56px",
  objectFit: "cover",
  borderRadius: "var(--radius-button)",
};

const thumbnailPlaceholderStyle: React.CSSProperties = {
  width: "56px",
  height: "56px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "var(--color-mist)",
  borderRadius: "var(--radius-button)",
  fontSize: "24px",
};

const subtitleWithIconStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "3px",
};

const statusBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  alignSelf: "flex-start",
  gap: "4px",
  padding: "2px 10px",
  borderRadius: "var(--radius-pill)",
  background: "var(--color-mist)",
  color: "var(--color-leaf)",
  fontSize: "12px",
  fontWeight: 500,
  lineHeight: 1.6,
};

const sectionSpacingStyle: React.CSSProperties = {
  padding: "0 var(--space-md)",
  marginTop: "var(--space-md)",
};

const completeButtonStyle: React.CSSProperties = {
  appearance: "none",
  width: "36px",
  height: "36px",
  padding: 0,
  borderRadius: "var(--radius-pill)",
  border: "1px solid var(--color-line)",
  background: "var(--color-mist)",
  color: "var(--color-leaf)",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "transform 80ms ease-out",
};

const addPlanButtonStyle: React.CSSProperties = {
  appearance: "none",
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  padding: "4px var(--space-sm)",
  border: "none",
  borderRadius: "var(--radius-button)",
  background: "transparent",
  fontSize: "13px",
  fontWeight: 500,
  color: "var(--color-leaf)",
  cursor: "pointer",
};

const emptyPlanStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "var(--space-lg) var(--space-md)",
  gap: "var(--space-xs)",
};

const emptyPlanTextStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "13px",
  color: "var(--color-muted)",
};

const expandButtonStyle: React.CSSProperties = {
  appearance: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "4px",
  width: "100%",
  padding: "var(--space-sm) var(--space-md)",
  border: "none",
  background: "transparent",
  fontSize: "13px",
  fontWeight: 500,
  color: "var(--color-leaf)",
  cursor: "pointer",
};

const archiveRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "var(--space-md)",
  minHeight: "48px",
};

const archiveRowLabelStyle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 500,
  color: "var(--color-ink)",
  flexShrink: 0,
};

const archiveRowValueStyle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 400,
  color: "var(--color-muted)",
  textAlign: "right",
  marginLeft: "var(--space-md)",
  wordBreak: "break-word",
};

const managementSpacingStyle: React.CSSProperties = {
  padding: "0 var(--space-md)",
  marginTop: "var(--space-xl)",
};

const motivationStyle: React.CSSProperties = {
  margin: 0,
  marginTop: "var(--space-xl)",
  padding: "0 var(--space-md)",
  fontSize: "13px",
  fontWeight: 400,
  color: "var(--color-muted)",
  textAlign: "center",
};

const disabledTaskRowStyle: React.CSSProperties = {
  opacity: 0.55,
};

const bottomSafeAreaStyle: React.CSSProperties = {
  height: "calc(env(safe-area-inset-bottom, 0px) + 40px)",
  flexShrink: 0,
};
