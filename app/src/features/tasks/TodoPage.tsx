import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  ChevronDown,
  ChevronRight,
  Droplet,
  Flower2,
  Leaf,
  SprayCan,
} from "lucide-react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { navigate } from "../../app/router";
import { GroupedSurface, GroupedSurfaceDivider } from "../../components/ui/GroupedSurface";
import { Icon } from "../../components/ui/Icon";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { showToast } from "../../components/ui/GlobalToast";
import { CompleteTaskButton } from "./CompleteTaskButton";
import { FamilyRecentActivity } from "./FamilyRecentActivity";
import { RoomFilterChips } from "./RoomFilterChips";
import { UndoToast } from "./UndoToast";
import { formatTaskTypeLabel } from "./taskTypes";
import { compressImage } from "../../lib/imageCompression";
import { uploadImagePair } from "../../lib/imageUpload";
import { normalizeImageFile } from "../plants/normalizeImageFile";
import type { DueTaskCardData } from "./DueTaskCard";
import type { BatchCompletionUndoPayload, CompletionUndoPayload } from "./undoComplete";
import type { CareTaskType } from "./taskTypes";

/** 浮条当前持有的撤销载荷：单条或批量。 */
type ActiveUndo = CompletionUndoPayload | BatchCompletionUndoPayload;

interface TodoQueryResult {
  overdue: DueTaskCardData[];
  today: DueTaskCardData[];
  upcoming: DueTaskCardData[];
}

/** 统计一组待办涉及的去重植物株数。 */
function countDistinctPlants(tasks: DueTaskCardData[]) {
  return new Set(tasks.map((task) => task.plantId)).size;
}

/** 获取今天的日期文案，如 "6月16日 周二" */
function getTodayLabel(): string {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const weekday = weekdays[now.getDay()];
  return `${month}月${day}日 ${weekday}`;
}

/** 获取任务类型对应的 lucide 图标 */
function getTaskIcon(taskType: CareTaskType) {
  switch (taskType) {
    case "watering":
      return Droplet;
    case "misting":
      return SprayCan;
    case "fertilizing":
      return Flower2;
    default:
      return Leaf;
  }
}

/** 获取任务类型对应的图标颜色 */
function getTaskIconColor(taskType: CareTaskType): string {
  switch (taskType) {
    case "watering":
      return "#4A90D9";
    case "misting":
      return "#7BB3D9";
    case "fertilizing":
      return "#8B6914";
    default:
      return "var(--color-leaf)";
  }
}

/** 格式化到期日期为简短文案 */
function formatShortDue(dueAt: number): { label: string; date: string; isOverdue: boolean; daysOverdue: number } {
  const now = new Date();
  const due = new Date(dueAt);
  const msPerDay = 24 * 60 * 60 * 1000;
  const dayDelta = Math.floor(
    (Date.UTC(due.getFullYear(), due.getMonth(), due.getDate()) -
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) /
      msPerDay,
  );

  const month = due.getMonth() + 1;
  const day = due.getDate();
  const dateStr = `${month}月${day}日`;

  if (dayDelta < 0) {
    return { label: `逾期 ${Math.abs(dayDelta)} 天`, date: `原定：${dateStr}`, isOverdue: true, daysOverdue: Math.abs(dayDelta) };
  }
  if (dayDelta === 0) {
    return { label: "今天", date: dateStr, isOverdue: false, daysOverdue: 0 };
  }
  if (dayDelta === 1) {
    return { label: "明天", date: dateStr, isOverdue: false, daysOverdue: 0 };
  }
  return { label: `${dayDelta}天后`, date: dateStr, isOverdue: false, daysOverdue: 0 };
}

export function TodoPage() {
  const result = useQuery(api.tasks.listDueTasks, {}) as TodoQueryResult | undefined;
  const plants = useQuery(api.plants.listPlantsWithNextDue, {}) as unknown as { plants: unknown[] } | undefined;
  const undoComplete = useMutation(api.tasks.undoCompletePlantTask);
  const addTaskCompletionImage = useMutation(api.tasks.addTaskCompletionImage);
  const generateUploadUrl = useMutation(api.plants.generatePlantImageUploadUrl);
  const [undoPayload, setUndoPayload] = useState<ActiveUndo | null>(null);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);

  // GAL-017: 任务完成后拍照提示
  const [lastCompletedLogId, setLastCompletedLogId] = useState<string | null>(null);
  const [lastCompletedPlantId, setLastCompletedPlantId] = useState<string | null>(null);
  const photoFileInputRef = useRef<HTMLInputElement>(null);

  // 方案 C：缓存刚完成的任务快照，防止 Convex realtime 更新后行被卸载
  const [recentlyCompleted, setRecentlyCompleted] = useState<
    Array<{ task: DueTaskCardData; completedAt: number; variant: "overdue" | "today" | "upcoming" }>
  >([]);

  /** 从所有任务中提取去重位置列表（按出现频率降序）。 */
  const roomLocations = useMemo(() => {
    if (!result) return [];
    const allTasks = [...result.overdue, ...result.today, ...result.upcoming];
    const freq = new Map<string, number>();
    for (const t of allTasks) {
      if (t.plantLocation) {
        freq.set(t.plantLocation, (freq.get(t.plantLocation) ?? 0) + 1);
      }
    }
    return [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([loc]) => loc);
  }, [result]);

  /** 按选中房间过滤任务列表。 */
  function filterByRoom(tasks: DueTaskCardData[]): DueTaskCardData[] {
    if (selectedRoom === null) return tasks;
    return tasks.filter((t) => t.plantLocation === selectedRoom);
  }

  async function undoOne(item: CompletionUndoPayload) {
    await undoComplete({
      taskId: item.taskId,
      logId: item.logId,
      previous: item.previous,
    });
  }

  async function handleUndo(payload: ActiveUndo) {
    setUndoPayload(null);

    // 撤销时立即移除对应的 CompletedTaskRow（触发滑出动画）
    if ("kind" in payload) {
      const ids = new Set(payload.items.map((i) => i.taskId));
      setRecentlyCompleted((prev) => prev.filter((r) => !ids.has(r.task.taskId)));
    } else {
      setRecentlyCompleted((prev) => prev.filter((r) => r.task.taskId !== payload.taskId));
    }

    try {
      if ("kind" in payload) {
        await Promise.all(payload.items.map(undoOne));
      } else {
        await undoOne(payload);
      }
    } catch {
      // 撤销失败时静默
    }
  }

  // GAL-017: 任务完成后触发拍照提示 + 方案 C 快照
  function handleTaskCompleted(undo: CompletionUndoPayload, plantId: string) {
    setUndoPayload(undo);
    setLastCompletedLogId(undo.logId);
    setLastCompletedPlantId(plantId);

    // 方案 C：在 Convex 实时更新删除行之前，保存 task 快照（含原始分组）
    if (result) {
      let taskSnapshot: DueTaskCardData | undefined;
      let variant: "overdue" | "today" | "upcoming" = "today";
      taskSnapshot = result.overdue.find((t) => t.taskId === undo.taskId);
      if (taskSnapshot) { variant = "overdue"; }
      if (!taskSnapshot) {
        taskSnapshot = result.today.find((t) => t.taskId === undo.taskId);
        if (taskSnapshot) { variant = "today"; }
      }
      if (!taskSnapshot) {
        taskSnapshot = result.upcoming.find((t) => t.taskId === undo.taskId);
        if (taskSnapshot) { variant = "upcoming"; }
      }
      if (taskSnapshot) {
        setRecentlyCompleted((prev) => [
          ...prev.filter((r) => r.task.taskId !== undo.taskId),
          { task: taskSnapshot!, completedAt: Date.now(), variant },
        ]);
      }
    }
  }

  /** 方案 C：从 TaskRow 变形态触发拍照 */
  function handlePhotoCaptureForPlant(plantId: string) {
    setLastCompletedPlantId(plantId);
    photoFileInputRef.current?.click();
  }

  async function handlePhotoFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const originalFile = event.target.files?.[0];
    event.target.value = "";
    if (!originalFile || !lastCompletedLogId || !lastCompletedPlantId) return;

    if (originalFile.size > 10 * 1024 * 1024) {
      showToast("图片过大，请选择 10MB 以内的照片");
      return;
    }

    try {
      const normalizedFile = await normalizeImageFile(originalFile);
      const { original, thumbnail } = await compressImage(normalizedFile);
      const { imageStorageId, thumbnailStorageId } = await uploadImagePair(
        () => generateUploadUrl({}),
        original,
        thumbnail,
      );
      await addTaskCompletionImage({
        logId: lastCompletedLogId as Id<"taskCompletionLogs">,
        plantId: lastCompletedPlantId as Id<"plants">,
        imageStorageId: imageStorageId as Id<"_storage">,
        thumbnailStorageId: thumbnailStorageId as Id<"_storage">,
      });
      showToast("照片已保存");
    } catch {
      showToast("照片保存失败");
    }
  }

  if (result === undefined) {
    return (
      <section style={pageStyle}>
        <header style={headerStyle}>
          <div>
            <h1 style={titleStyle}>今日待办</h1>
            <p style={subtitleStyle}>{getTodayLabel()}</p>
          </div>
        </header>
        <p style={loadingStyle}>正在加载待办任务…</p>
      </section>
    );
  }

  const needCareCount = countDistinctPlants([
    ...result.overdue.filter((t) => !t.completedToday),
    ...result.today.filter((t) => !t.completedToday),
  ]);
  const pendingTaskCount = result.overdue.filter((t) => !t.completedToday).length
    + result.today.filter((t) => !t.completedToday).length;
  const totalTaskCount = result.overdue.length + result.today.length + result.upcoming.length;
  const hasNoPlants = plants != null && plants.plants.length === 0;

  return (
    <section style={pageStyle}>
      {/* Header */}
      <header style={headerStyle}>
        <div>
          <h1 style={titleStyle}>今日待办</h1>
          <p style={subtitleStyle}>{getTodayLabel()}</p>
        </div>
        </header>

      {/* Status Band */}
      <div style={statusBandStyle}>
        <div style={statusLeftStyle}>
          <span style={statusIconStyle}>🌱</span>
          <div style={statusTextWrapStyle}>
            <span style={statusMainStyle}>
              {needCareCount > 0
                ? `${needCareCount} 株植物需要照顾`
                : "所有植物都照顾好了"}
            </span>
            <span style={statusSubStyle}>
              {needCareCount > 0 ? "别忘了给它们一点关爱 🌿" : "继续保持 🌿"}
            </span>
          </div>
        </div>
        <span style={statusRightStyle}>
          {pendingTaskCount > 0
            ? `还剩 ${pendingTaskCount} 项`
            : "全部完成 ✓"}
        </span>
      </div>

      {/* Room Filter Chips — 情感反馈区下方 */}
      {roomLocations.length > 0 && (
        <RoomFilterChips
          locations={roomLocations}
          selected={selectedRoom}
          onChange={setSelectedRoom}
        />
      )}

      {/* Empty state */}
      {totalTaskCount === 0 ? (
        hasNoPlants ? (
          <EmptyState
            actions={
              <Button variant="secondary" fullWidth={false} onClick={() => navigate("/plants")} type="button">
                去添加第一株植物
              </Button>
            }
            badge="欢迎"
            title="先添加一株植物吧"
            description="添加植物并设置养护提醒后，待办任务会出现在这里。"
            minHeight="180px"
          />
        ) : (
          <EmptyState
            actions={
              <Button variant="secondary" fullWidth={false} onClick={() => navigate("/plants")} type="button">
                去看看你的植物
              </Button>
            }
            badge="待办"
            title="🌿 今天无需养护"
            description="未来三天没有待处理的养护任务，新的提醒到期时会优先出现在这里。"
            minHeight="180px"
          />
        )
      ) : (
        <div style={groupsContainerStyle}>
          {/* Overdue Group */}
          {(filterByRoom(result.overdue).length > 0 || recentlyCompleted.some((r) => r.variant === "overdue")) && (
            <div style={groupBlockStyle}>
              <h2 style={groupTitleOverdueStyle}><span style={groupTitleBarOverdueStyle} />逾期（{filterByRoom(result.overdue).length}）<span style={groupTitleLineStyle} /></h2>
              <GroupedSurface style={overdueGroupStyle}>
                {filterByRoom(result.overdue).map((task, index) => (
                  <div key={task.taskId} style={getStaggerStyle(index)}>
                    {index > 0 && <GroupedSurfaceDivider />}
                    <TaskRow
                      task={task}
                      onCompleted={handleTaskCompleted}
                      onOpenPlant={(plantId) => navigate(`/plants/${plantId}`)}
                      variant="overdue"
                    />
                  </div>
                ))}
                {recentlyCompleted
                  .filter((r) => r.variant === "overdue")
                  .map((entry) => (
                    <div key={`completed-${entry.task.taskId}`}>
                      <GroupedSurfaceDivider />
                      <CompletedTaskRow
                        task={entry.task}
                        onCapture={handlePhotoCaptureForPlant}
                        onOpenPlant={(plantId) => navigate(`/plants/${plantId}`)}
                        onDismiss={() =>
                          setRecentlyCompleted((prev) =>
                            prev.filter((r) => r.task.taskId !== entry.task.taskId),
                          )
                        }
                      />
                    </div>
                  ))}
              </GroupedSurface>
            </div>
          )}

          {/* Today Group */}
          {(filterByRoom(result.today).length > 0 || recentlyCompleted.some((r) => r.variant === "today")) && (
            <div style={groupBlockStyle}>
              <h2 style={groupTitleDefaultStyle}><span style={groupTitleBarDefaultStyle} />今天（{filterByRoom(result.today).length}）<span style={groupTitleLineStyle} /></h2>
              <GroupedSurface style={todayGroupStyle}>
                {filterByRoom(result.today).map((task, index) => (
                  <div key={task.taskId} style={getStaggerStyle(index)}>
                    {index > 0 && <GroupedSurfaceDivider />}
                    <TaskRow
                      task={task}
                      onCompleted={handleTaskCompleted}
                      onOpenPlant={(plantId) => navigate(`/plants/${plantId}`)}
                      variant="today"
                    />
                  </div>
                ))}
                {recentlyCompleted
                  .filter((r) => r.variant === "today")
                  .map((entry) => (
                    <div key={`completed-${entry.task.taskId}`}>
                      <GroupedSurfaceDivider />
                      <CompletedTaskRow
                        task={entry.task}
                        onCapture={handlePhotoCaptureForPlant}
                        onOpenPlant={(plantId) => navigate(`/plants/${plantId}`)}
                        onDismiss={() =>
                          setRecentlyCompleted((prev) =>
                            prev.filter((r) => r.task.taskId !== entry.task.taskId),
                          )
                        }
                      />
                    </div>
                  ))}
              </GroupedSurface>
            </div>
          )}

          {/* Upcoming Group */}
          {filterByRoom(result.upcoming).length > 0 && (
            <div style={groupBlockStyle}>
              <h2 style={groupTitleDefaultStyle}><span style={groupTitleBarDefaultStyle} />即将到期（{filterByRoom(result.upcoming).length}）<span style={groupTitleLineStyle} /></h2>
              <GroupedSurface>
              {(showAllUpcoming ? filterByRoom(result.upcoming) : filterByRoom(result.upcoming).slice(0, 3)).map(
                (task, index) => (
                  <div key={task.taskId} style={getStaggerStyle(index)}>
                    {index > 0 && <GroupedSurfaceDivider />}
                    <TaskRow
                      task={task}
                      onCompleted={handleTaskCompleted}
                      onOpenPlant={(plantId) => navigate(`/plants/${plantId}`)}
                      variant="upcoming"
                    />
                  </div>
                ),
              )}
              {filterByRoom(result.upcoming).length > 3 && (
                <>
                  <GroupedSurfaceDivider />
                  <button
                    onClick={() => setShowAllUpcoming((prev) => !prev)}
                    style={viewAllButtonStyle}
                    type="button"
                  >
                    <span>{showAllUpcoming ? "收起" : "查看全部任务"}</span>
                    <Icon
                      icon={ChevronDown}
                      size={14}
                      style={{
                        transform: showAllUpcoming ? "rotate(180deg)" : undefined,
                        transition: "transform 200ms ease",
                      }}
                    />
                  </button>
                </>
              )}
              </GroupedSurface>
            </div>
          )}
        </div>
      )}

      {/* 家庭动态（CARE-HIST-004）——空数据时整个区域不渲染 */}
      <FamilyRecentActivity />

      {/* Footer */}
      <div style={footerStyle}>
        <p style={footerTextStyle}>用心照顾，让每一株植物都被温柔以待</p>
      </div>

      {/* Undo Toast */}
      {undoPayload ? (
        <UndoToast
          onDismiss={() => setUndoPayload(null)}
          onUndo={handleUndo}
          payload={undoPayload}
        />
      ) : null}
      <input
        ref={photoFileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handlePhotoFileChange}
      />
    </section>
  );
}

/* ─── CompletedTaskRow（方案 C 变形态） ─── */

/** 变形态停留后自动消失时长（ms） */
const CONFIRMED_LINGER_MS = 5000;

interface CompletedTaskRowProps {
  task: DueTaskCardData;
  onCapture: (plantId: string) => void;
  onOpenPlant: (plantId: string) => void;
  onDismiss: () => void;
}

function CompletedTaskRow({ task, onCapture, onOpenPlant, onDismiss }: CompletedTaskRowProps) {
  const taskLabel = formatTaskTypeLabel(task.taskType, task.customLabel);

  // 三阶段动画：entering → visible → exiting
  const [phase, setPhase] = useState<"entering" | "visible" | "exiting">("entering");

  // 入场：下一帧展开
  useEffect(() => {
    const raf = requestAnimationFrame(() => setPhase("visible"));
    return () => cancelAnimationFrame(raf);
  }, []);

  // 自动消失倒计时
  useEffect(() => {
    if (phase !== "visible") return;
    const timer = setTimeout(() => setPhase("exiting"), CONFIRMED_LINGER_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  // 退场动画结束后从列表移除
  useEffect(() => {
    if (phase !== "exiting") return;
    const timer = setTimeout(onDismiss, 350);
    return () => clearTimeout(timer);
  }, [phase, onDismiss]);

  const wrapperStyle: React.CSSProperties = {
    overflow: "hidden",
    maxHeight: phase === "entering" ? "0px" : phase === "visible" ? "80px" : "0px",
    opacity: phase === "entering" ? 0 : phase === "visible" ? 1 : 0,
    transition: "max-height 350ms ease, opacity 300ms ease",
  };

  return (
    <div style={wrapperStyle} onTransitionEnd={() => { if (phase === "exiting") onDismiss(); }}>
      <div
        style={{
          ...taskRowStyle,
          ...confirmedRowStyle,
        }}
      >
        <button
          aria-label={`查看 ${task.plantName}`}
          onClick={() => onOpenPlant(task.plantId)}
          style={plantThumbButtonStyle}
          type="button"
        >
          {task.plantImageUrl ? (
            <img alt={task.plantName} src={task.plantImageUrl} style={plantThumbImageStyle} />
          ) : (
            <span style={plantThumbFallbackStyle}>🌿</span>
          )}
        </button>

        <div style={taskContentStyle}>
          <span style={confirmedNameStyle}>{task.plantName}</span>
          <span style={confirmedMetaStyle}>✓ {taskLabel}已完成</span>
        </div>

        <button
          onClick={() => onCapture(task.plantId)}
          style={captureInlineButtonStyle}
          type="button"
          aria-label="拍照记录"
        >
          <Icon icon={Camera} size={15} colorVar="--color-leaf" />
          <span style={captureInlineTextStyle}>记录</span>
        </button>
      </div>
    </div>
  );
}

/* ─── TaskRow Component ─── */

interface TaskRowProps {
  task: DueTaskCardData;
  onCompleted?: (undo: CompletionUndoPayload, plantId: string) => void;
  onOpenPlant: (plantId: string) => void;
  variant: "overdue" | "today" | "upcoming";
}

function TaskRow({ task, onCompleted, onOpenPlant, variant }: TaskRowProps) {
  const taskLabel = formatTaskTypeLabel(task.taskType, task.customLabel);
  const TaskIcon = getTaskIcon(task.taskType);
  const iconColor = getTaskIconColor(task.taskType);
  const dueInfo = formatShortDue(task.nextDueAt);
  const isUpcoming = variant === "upcoming";

  return (
    <div
      style={{
        ...taskRowStyle,
        ...(variant === "overdue" ? taskRowOverdueStyle : undefined),
      }}
      onClick={isUpcoming ? () => onOpenPlant(task.plantId) : undefined}
      role={isUpcoming ? "button" : undefined}
      tabIndex={isUpcoming ? 0 : undefined}
    >
      {/* Left accent bar for overdue */}
      {variant === "overdue" && <span style={overdueAccentBarStyle} />}

      {/* Plant Photo */}
      <button
        aria-label={`查看 ${task.plantName}`}
        onClick={(e) => {
          e.stopPropagation();
          onOpenPlant(task.plantId);
        }}
        style={plantThumbButtonStyle}
        type="button"
      >
        {task.plantImageUrl ? (
          <img
            alt={`${task.plantName}封面图`}
            src={task.plantImageUrl}
            style={plantThumbImageStyle}
          />
        ) : (
          <span style={plantThumbFallbackStyle}>🌿</span>
        )}
      </button>

      {/* Content */}
      <div style={taskContentStyle}>
        <span style={taskPlantNameStyle}>{task.plantName}</span>
        <div style={taskMetaRowStyle}>
          <Icon icon={TaskIcon} size={14} style={{ color: iconColor }} />
          <span style={taskTypeTextStyle}>{taskLabel}</span>
          <span style={taskDateDotStyle}>·</span>
          <span style={taskDateStyle}>{dueInfo.date}</span>
        </div>
      </div>

      {/* Due tag — vertically centered via parent alignItems:"center" */}
      {dueInfo.isOverdue ? (
        <span style={overdueBadgeStyle}>逾期 {dueInfo.daysOverdue} 天</span>
      ) : (
        <span style={dueTagStyle}>{dueInfo.label}</span>
      )}

      {/* Right Action */}
      <div style={taskActionStyle}>
        {isUpcoming ? (
          <Icon icon={ChevronRight} size={18} style={{ color: "var(--color-muted)" }} />
        ) : (
          <CompleteTaskButton
            appearance="circle"
            celebrateEmoji={task.taskType === "watering" ? "💧" : "🍃"}
            onCompleted={(result) => {
              onCompleted?.(result.undo, task.plantId);
            }}
            taskId={task.taskId}
          />
        )}
      </div>
    </div>
  );
}

/* ─── Styles ─── */

const pageStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-md)",
  paddingBottom: "80px",
  minHeight: "100dvh",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  paddingTop: "var(--space-sm)",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "28px",
  lineHeight: 1.2,
  fontWeight: 800,
  color: "var(--color-ink)",
};

const subtitleStyle: React.CSSProperties = {
  margin: "4px 0 0",
  fontSize: "14px",
  color: "var(--color-muted)",
  fontWeight: 400,
};

const statusBandStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "var(--space-sm)",
  padding: "var(--space-md)",
  borderRadius: "16px",
  background: "linear-gradient(135deg, rgba(45,140,100,0.06) 0%, rgba(45,140,100,0.02) 100%)",
  border: "1px solid rgba(45,140,100,0.1)",
  boxShadow: "0 2px 8px rgba(45,140,100,0.06)",
};

const statusLeftStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-sm)",
  flex: 1,
  minWidth: 0,
};

const statusIconStyle: React.CSSProperties = {
  fontSize: "20px",
  flexShrink: 0,
};

const statusTextWrapStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "2px",
  minWidth: 0,
};

const statusMainStyle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 600,
  color: "var(--color-ink)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const statusSubStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "var(--color-muted)",
};

const statusRightStyle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 600,
  color: "var(--color-leaf)",
  whiteSpace: "nowrap",
  flexShrink: 0,
};

const loadingStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--color-muted)",
  fontSize: "0.95rem",
  lineHeight: 1.6,
};

const groupsContainerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-lg)",
};

const groupBlockStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-sm)",
};

const groupTitleBaseStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "14px",
  fontWeight: 700,
  lineHeight: 1.3,
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

/* 分组标题后的延伸横线 */
const groupTitleLineStyle: React.CSSProperties = {
  flex: 1,
  height: "1px",
  background: "linear-gradient(to right, var(--color-line), transparent)",
};

const groupTitleOverdueStyle: React.CSSProperties = {
  ...groupTitleBaseStyle,
  color: "var(--color-warning)",
};

const groupTitleDefaultStyle: React.CSSProperties = {
  ...groupTitleBaseStyle,
  color: "var(--color-leaf)",
};

const groupTitleBarOverdueStyle: React.CSSProperties = {
  display: "inline-block",
  width: "3px",
  height: "16px",
  borderRadius: "2px",
  background: "var(--color-warning)",
  flexShrink: 0,
};

const groupTitleBarDefaultStyle: React.CSSProperties = {
  display: "inline-block",
  width: "3px",
  height: "16px",
  borderRadius: "2px",
  background: "var(--color-leaf)",
  flexShrink: 0,
};

const overdueGroupStyle: React.CSSProperties = {
  borderColor: "rgba(229,57,53,0.2)",
  background: "linear-gradient(135deg, rgba(229,57,53,0.03) 0%, var(--color-surface) 60%)",
};

const todayGroupStyle: React.CSSProperties = {
  borderColor: "rgba(45,140,100,0.15)",
  boxShadow: "0 2px 10px rgba(45,140,100,0.06)",
};

/* Stagger animation helper */
function getStaggerStyle(index: number): React.CSSProperties {
  return {
    animation: `taskFadeSlideIn 320ms ease both`,
    animationDelay: `${index * 50}ms`,
  };
}

/* Task Row Styles */

const taskRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-sm)",
  padding: "var(--space-md)",
  position: "relative",
};

const taskRowOverdueStyle: React.CSSProperties = {
  paddingLeft: "calc(var(--space-md) + 4px)",
};

const overdueAccentBarStyle: React.CSSProperties = {
  position: "absolute",
  left: 0,
  top: "var(--space-sm)",
  bottom: "var(--space-sm)",
  width: "3px",
  borderRadius: "2px",
  background: "var(--color-error, #E53935)",
};

const plantThumbButtonStyle: React.CSSProperties = {
  appearance: "none",
  flexShrink: 0,
  width: "48px",
  height: "48px",
  padding: 0,
  borderRadius: "12px",
  border: "2px solid #fff",
  overflow: "hidden",
  background: "var(--color-mist)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
};

const plantThumbImageStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};

const plantThumbFallbackStyle: React.CSSProperties = {
  fontSize: "24px",
  lineHeight: 1,
};

const taskContentStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: "4px",
};

const taskPlantNameStyle: React.CSSProperties = {
  fontSize: "15px",
  fontWeight: 700,
  color: "var(--color-ink)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  flex: 1,
  minWidth: 0,
};

const taskMetaRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
};

const taskTypeTextStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "var(--color-muted)",
  fontWeight: 500,
};

const overdueBadgeStyle: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 700,
  color: "#E53935",
  background: "rgba(229,57,53,0.08)",
  padding: "2px 6px",
  borderRadius: "var(--radius-pill)",
  whiteSpace: "nowrap",
  flexShrink: 0,
};

const dueTagStyle: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 600,
  color: "var(--color-leaf)",
  background: "rgba(45, 140, 100, 0.08)",
  padding: "2px 6px",
  borderRadius: "var(--radius-pill)",
  whiteSpace: "nowrap",
  flexShrink: 0,
};

const taskDateDotStyle: React.CSSProperties = {
  color: "var(--color-muted)",
  fontSize: "13px",
  lineHeight: 1,
};

const taskDateStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "var(--color-muted)",
};

const taskActionStyle: React.CSSProperties = {
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

/* View All Button */

const viewAllButtonStyle: React.CSSProperties = {
  appearance: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "4px",
  width: "100%",
  padding: "var(--space-sm) var(--space-md)",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  fontSize: "13px",
  color: "var(--color-leaf)",
  fontWeight: 500,
};

/* Footer */

const footerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  padding: "var(--space-md) 0 var(--space-sm)",
};

const footerTextStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "12px",
  color: "var(--color-muted)",
  fontStyle: "italic",
  opacity: 0.7,
};

/* ─── Confirmed Row (方案 C) ─── */

const confirmedRowStyle: React.CSSProperties = {
  background: "rgba(45, 140, 100, 0.06)",
  borderRadius: "12px",
  transition: "opacity 400ms ease, transform 400ms ease",
};

const confirmedNameStyle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 600,
  color: "var(--color-ink)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const confirmedMetaStyle: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 500,
  color: "var(--color-leaf)",
};

const captureInlineButtonStyle: React.CSSProperties = {
  appearance: "none",
  flexShrink: 0,
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  height: "32px",
  padding: "0 12px",
  borderRadius: "16px",
  border: "1.5px solid rgba(45, 140, 100, 0.25)",
  background: "var(--color-surface)",
  cursor: "pointer",
  whiteSpace: "nowrap",
  transition: "background 150ms ease",
};

const captureInlineTextStyle: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 500,
  color: "var(--color-leaf)",
  lineHeight: 1,
};
