import { useCallback, useEffect, useRef, useState } from "react";
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
import { GroupedSurface, GroupedSurfaceDivider } from "../../components/ui/GroupedSurface";
import { TaskActionRow } from "../../components/ui/TaskActionRow";
import { StorageImage } from "../../components/ui/StorageImage";
import { Icon } from "../../components/ui/Icon";
import { showToast } from "../../components/ui/GlobalToast";
import { PlantManagementSection } from "./PlantManagementSection";
import { CareHistorySection } from "./CareHistorySection";
import { CareKnowledgeSection } from "./CareKnowledgeSection";
import { ImagePreviewOverlay } from "./ImagePreviewOverlay";
import { PlantGalleryStrip } from "./PlantGalleryStrip";
import { GalleryFullscreenViewer } from "./GalleryFullscreenViewer";
import { UndoToast } from "../tasks/UndoToast";
import type { CompletionUndoPayload } from "../tasks/undoComplete";
import { buildUndoPayload } from "../tasks/undoComplete";
import {
  formatTaskTypeLabel,
  getTaskTypeIcon,
} from "../tasks/taskTypes";
import { taskTypeColorVar } from "../tasks/TaskTypeBadge";
import { getUtcDayStart, computeCompletedToday } from "../tasks/scheduling";
import { formatScheduleDescription } from "../../lib/formatters";
import type { ScheduleMode, SeasonalIntervals } from "../../types/domain";
import { triggerHaptic } from "../../lib/motion";
import { compressImage } from "../../lib/imageCompression";
import { uploadImagePair } from "../../lib/imageUpload";
import { normalizeImageFile } from "./normalizeImageFile";
import type { GalleryItem } from "../../types/domain";

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
    speciesId: string | null;
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
    // FLEX-013: 排期模式字段
    scheduleMode?: ScheduleMode;
    weeklyDays?: number[] | null;
    seasonalIntervals?: SeasonalIntervals | null;
  }>;
  gallery: GalleryItem[];
  galleryCount: number;
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
    plantId ? { plantId } : "skip",
  ) as
    | PlantDetailResponse
    | null
    | undefined;
  const completeTask = useMutation(api.tasks.completePlantTask);
  const undoComplete = useMutation(api.tasks.undoCompletePlantTask);
  const addGalleryImage = useMutation(api.plants.addPlantGalleryImage);
  const removeGalleryImage = useMutation(api.plants.removePlantGalleryImage);
  const setCoverFromGallery = useMutation(api.plants.setPlantCoverFromGallery);
  const updateGalleryCaption = useMutation(api.plants.updateGalleryCaption);
  const generateUploadUrl = useMutation(api.plants.generatePlantImageUploadUrl);
  const [archivedStateOverride, setArchivedStateOverride] = useState<{
    archivedAt: number | null;
    isArchived: boolean;
  } | null>(null);
  const [undoPayload, setUndoPayload] = useState<CompletionUndoPayload | null>(null);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [planExpanded, setPlanExpanded] = useState(false);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(new Set());
  // GAL-015: 图集状态
  const [isGalleryUploading, setIsGalleryUploading] = useState(false);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [fullscreenInitialIndex, setFullscreenInitialIndex] = useState(0);
  const galleryFileInputRef = useRef<HTMLInputElement>(null);

  // fix-3: 任务完成后拍照入口
  const addTaskCompletionImage = useMutation(api.tasks.addTaskCompletionImage);
  const [lastCompletedLogId, setLastCompletedLogId] = useState<string | null>(null);
  const taskPhotoFileInputRef = useRef<HTMLInputElement>(null);
  const handleTaskPhotoCaptureClick = useCallback(() => {
    taskPhotoFileInputRef.current?.click();
  }, []);

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
        <div style={deletedPlantContainerStyle}>
          <div style={deletedPlantIconStyle}>
            <Icon icon={Sprout} size={48} colorVar="--color-muted" />
          </div>
          <p style={deletedPlantTitleStyle}>这株植物已不存在</p>
          <p style={deletedPlantSubtitleStyle}>可能已被家庭成员删除</p>
          <Button type="button" variant="primary" fullWidth={false} onClick={() => navigate("/todo")}>
            返回待办
          </Button>
        </div>
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

      const undoData = {
        ...buildUndoPayload(res),
        message,
      };
      setUndoPayload(undoData);
      setLastCompletedLogId(undoData.logId);
    } catch {
      // 静默处理
    } finally {
      setCompletingTaskId(null);
    }
  }

  async function handleTaskPhotoFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const originalFile = event.target.files?.[0];
    event.target.value = "";
    if (!originalFile || !lastCompletedLogId || !plantId) return;

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
        plantId: plantId as Id<"plants">,
        imageStorageId: imageStorageId as Id<"_storage">,
        thumbnailStorageId: thumbnailStorageId as Id<"_storage">,
      });
      showToast("照片已保存");
    } catch {
      showToast("照片保存失败");
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

  // ─── GAL-015: 图集操作 ──────────────────────────────────────

  const gallery = result.gallery ?? [];
  const galleryIsFull = gallery.length >= 20;

  function handleGalleryAddClick() {
    if (isGalleryUploading) return;
    galleryFileInputRef.current?.click();
  }

  async function handleGalleryFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const originalFile = event.target.files?.[0];
    event.target.value = "";
    if (!originalFile || !plantId) return;

    // 10MB 预检
    if (originalFile.size > 10 * 1024 * 1024) {
      showToast("图片过大，请选择 10MB 以内的照片");
      return;
    }

    setIsGalleryUploading(true);
    try {
      // HEIC 转码
      const normalizedFile = await normalizeImageFile(originalFile);
      // 压缩
      const { original, thumbnail } = await compressImage(normalizedFile);
      // 双图上传
      const { imageStorageId, thumbnailStorageId } = await uploadImagePair(
        () => generateUploadUrl({}),
        original,
        thumbnail,
      );
      // 写入 gallery
      await addGalleryImage({
        plantId: plantId as Id<"plants">,
        imageStorageId: imageStorageId as Id<"_storage">,
        thumbnailStorageId: thumbnailStorageId as Id<"_storage">,
      });
      showToast("照片已添加 · 可在大图中写备注");
      // UX-003：上传成功后自动打开全屏到最新图片，引导用户添加备注
      setFullscreenInitialIndex(0);
      setIsFullscreenOpen(true);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "图片上传失败");
    } finally {
      setIsGalleryUploading(false);
    }
  }

  async function handleGalleryDelete(imageStorageId: string) {
    if (!plantId) return;
    try {
      await removeGalleryImage({
        plantId: plantId as Id<"plants">,
        imageStorageId: imageStorageId as Id<"_storage">,
      });
      showToast("照片已删除");
    } catch {
      showToast("删除失败");
    }
  }

  async function handleGallerySetCover(imageStorageId: string) {
    if (!plantId) return;
    try {
      await setCoverFromGallery({
        plantId: plantId as Id<"plants">,
        imageStorageId: imageStorageId as Id<"_storage">,
      });
      // toast 由 GalleryFullscreenViewer 内部触发
    } catch {
      showToast("设置封面失败");
    }
  }

  async function handleGalleryCaptionUpdate(imageStorageId: string, caption: string | undefined) {
    if (!plantId) return;
    try {
      await updateGalleryCaption({
        plantId: plantId as Id<"plants">,
        imageStorageId: imageStorageId as Id<"_storage">,
        caption,
      });
    } catch {
      showToast("备注保存失败");
    }
  }

  function handleThumbnailPress(index: number) {
    setFullscreenInitialIndex(index);
    setIsFullscreenOpen(true);
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

      {/* Hero 区：大图 + 植物名称叠加 */}
      <div style={heroWrapperStyle}>
      <div style={heroContainerStyle}>
        {plant.imageUrl ? (
          <button
            type="button"
            onClick={() => setShowImagePreview(true)}
            style={heroImageButtonStyle}
            aria-label="查看大图"
          >
            <StorageImage
              alt={plant.name}
              fallback={<div style={heroPlaceholderStyle}><Icon icon={Sprout} size={48} colorVar="--color-leaf" /></div>}
              initialUrl={plant.imageUrl}
              storageId={plant.imageStorageId as any}
              style={heroImageStyle}
            />
          </button>
        ) : (
          <div style={heroPlaceholderStyle}>
            <Icon icon={Sprout} size={48} colorVar="--color-leaf" />
          </div>
        )}
        {/* 底部渐变遮罩 + 文字 */}
        <div style={heroOverlayStyle}>
          <h2 style={heroNameStyle}>{plant.name}</h2>
          <div style={heroMetaStyle}>
            {plant.location && (
              <span style={heroLocationStyle}>
                <Icon icon={MapPin} size={13} />
                {plant.location}
              </span>
            )}
            {hasActionable && !plant.isArchived && (
              <span style={heroStatusStyle}>
                <Icon icon={Sprout} size={13} />
                今天有任务
              </span>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* 图集 Gallery Strip - GAL-015 */}
      <div style={{ ...sectionSpacingStyle, ...sectionAnimStyle(0) }}>
        <PlantGalleryStrip
          gallery={gallery}
          isArchived={plant.isArchived}
          isFull={galleryIsFull}
          isUploading={isGalleryUploading}
          onAdd={handleGalleryAddClick}
          onThumbnailPress={handleThumbnailPress}
        />
      </div>

      {/* Hidden file input for gallery */}
      <input
        ref={galleryFileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleGalleryFileChange}
      />

      {/* 需要处理 section */}
      {!plant.isArchived && actionableTasks.length > 0 && (
        <div style={{ ...sectionSpacingStyle, ...sectionAnimStyle(0) }}>
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
      <div style={{ ...sectionSpacingStyle, ...sectionAnimStyle(1) }}>
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
            <button
              type="button"
              onClick={() => navigate(`/plants/${plant.id}/tasks/new`)}
              style={emptyPlanButtonStyle}
            >
              <span style={emptyPlanIconStyle}>
                <Icon icon={Plus} size={24} colorVar="--color-leaf" />
              </span>
              <span style={emptyPlanTitleStyle}>添加第一个养护计划</span>
              <span style={emptyPlanDescStyle}>设置浇水、施肥等提醒，不再错过养护时机</span>
            </button>
          ) : (
            <>
              {visiblePlanTasks.map((task, index) => {
                const label = formatTaskTypeLabel(task.taskType, task.customLabel);
                // FLEX-013: 使用排期描述替代简单间隔文案
                const interval = formatScheduleDescription({
                  scheduleMode: task.scheduleMode ?? "interval",
                  intervalDays: task.intervalDays,
                  weeklyDays: task.weeklyDays,
                  seasonalIntervals: task.seasonalIntervals,
                });
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

      {/* 养护指南知识板块（KNOW-006：在 PlanSection 与 CareHistorySection 之间） */}
      <div style={{ ...sectionSpacingStyle, ...sectionAnimStyle(2) }}>
        <CareKnowledgeSection speciesId={plant.speciesId} />
      </div>

      {/* 养护记录折叠区（CARE-HIST-003 / CARE-HIST-005：L3.5 位置） */}
      <div style={{ ...sectionSpacingStyle, ...sectionAnimStyle(3) }}>
        <CareHistorySection plantId={plant.id as Id<"plants">} />
      </div>

      {/* 植物档案 section */}
      <div style={{ ...sectionSpacingStyle, ...sectionAnimStyle(3) }}>
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
      <div style={{ ...managementSpacingStyle, ...sectionAnimStyle(4) }}>
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

      {/* 任务完成拍照隐藏 input */}
      <input
        ref={taskPhotoFileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleTaskPhotoFileChange}
      />

      {/* 全屏图片预览 */}
      {showImagePreview && plant.imageUrl && (
        <ImagePreviewOverlay
          imageUrl={plant.imageUrl}
          onClose={() => setShowImagePreview(false)}
          plantName={plant.name}
        />
      )}

      {/* 图集全屏浏览器 - GAL-015 */}
      {isFullscreenOpen && gallery.length > 0 && (
        <GalleryFullscreenViewer
          gallery={gallery}
          initialIndex={fullscreenInitialIndex}
          isArchived={plant.isArchived}
          onClose={() => setIsFullscreenOpen(false)}
          onDelete={handleGalleryDelete}
          onSetCover={handleGallerySetCover}
          onUpdateCaption={handleGalleryCaptionUpdate}
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

/* Hero 区样式 */

const heroWrapperStyle: React.CSSProperties = {
  padding: "0 var(--space-md)",
  marginTop: "var(--space-xs)",
};

const heroContainerStyle: React.CSSProperties = {
  position: "relative",
  width: "100%",
  height: "220px",
  borderRadius: "16px",
  overflow: "hidden",
  background: "linear-gradient(135deg, rgba(45,140,100,0.08) 0%, rgba(45,140,100,0.15) 100%)",
};

const heroImageButtonStyle: React.CSSProperties = {
  appearance: "none",
  border: "none",
  padding: 0,
  width: "100%",
  height: "100%",
  cursor: "pointer",
  display: "block",
};

const heroImageStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};

const heroPlaceholderStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "linear-gradient(135deg, rgba(45,140,100,0.06) 0%, rgba(45,140,100,0.14) 100%)",
};

const heroOverlayStyle: React.CSSProperties = {
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  padding: "32px 20px 16px",
  background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 100%)",
  display: "flex",
  flexDirection: "column",
  gap: "4px",
};

const heroNameStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "22px",
  fontWeight: 800,
  color: "#ffffff",
  textShadow: "0 1px 3px rgba(0,0,0,0.3)",
};

const heroMetaStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
};

const heroLocationStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  fontSize: "13px",
  color: "rgba(255,255,255,0.85)",
};

const heroStatusStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  fontSize: "12px",
  fontWeight: 600,
  color: "#a8e6cf",
};

const sectionSpacingStyle: React.CSSProperties = {
  padding: "0 var(--space-md)",
  marginTop: "var(--space-md)",
};

function sectionAnimStyle(index: number): React.CSSProperties {
  return {
    animation: "taskFadeSlideIn 360ms ease both",
    animationDelay: `${80 + index * 60}ms`,
  };
}

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

const emptyPlanButtonStyle: React.CSSProperties = {
  appearance: "none",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  width: "calc(100% - 32px)",
  margin: "16px auto",
  padding: "24px 16px",
  border: "2px dashed rgba(45, 140, 100, 0.3)",
  borderRadius: "14px",
  background: "rgba(45, 140, 100, 0.03)",
  cursor: "pointer",
  transition: "border-color 200ms ease, background 200ms ease",
};

const emptyPlanIconStyle: React.CSSProperties = {
  width: "44px",
  height: "44px",
  borderRadius: "50%",
  background: "rgba(45, 140, 100, 0.1)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const emptyPlanTitleStyle: React.CSSProperties = {
  fontSize: "15px",
  fontWeight: 600,
  color: "var(--color-ink)",
};

const emptyPlanDescStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "var(--color-muted)",
  textAlign: "center",
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

// ─── 植物已删除兜底 UI（PUSH-012）─────────────────────────────

const deletedPlantContainerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "var(--space-sm)",
  padding: "var(--space-xl) var(--space-md)",
  minHeight: "240px",
};

const deletedPlantIconStyle: React.CSSProperties = {
  marginBottom: "var(--space-sm)",
};

const deletedPlantTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "16px",
  fontWeight: 600,
  color: "var(--color-ink)",
  textAlign: "center",
};

const deletedPlantSubtitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "14px",
  color: "var(--color-muted)",
  textAlign: "center",
  marginBottom: "var(--space-md)",
};
