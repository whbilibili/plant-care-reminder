import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { ChevronDown, Droplet, Leaf, MapPin, Trash2 } from "lucide-react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { navigate } from "../../app/router";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { Icon } from "../../components/ui/Icon";
import {
  FormSummaryCard,
  formSummaryThumbFallbackStyle,
  formSummaryThumbImageStyle,
} from "../../components/ui/FormSummaryCard";
import { ScreenNav } from "../../components/ui/ScreenNav";
import { StorageImage } from "../../components/ui/StorageImage";
import { FormError } from "../../components/ui/FormError";
import { ConfirmSheet } from "../../components/ui/ConfirmSheet";
import { ToggleSwitch } from "../../components/ui/ToggleSwitch";
import { friendlyError } from "../family/friendlyError";
import type { ScheduleMode } from "../../types/domain";
import { ScheduleModeFieldGroup } from "./ScheduleModeFields";
import {
  careTaskTypeOptions,
  formatTaskTypeLabel,
  normalizeCustomTaskName,
  requiresCustomTaskName,
  validateCustomTaskName,
  type CareTaskType,
} from "./taskTypes";
import { validateIntervalDays, validateWeeklyDays, validateSeasonalIntervals } from "./scheduling";
import type { TaskFormValues } from "./TaskForm";

interface EditTaskPageProps {
  plantId: string | null;
  taskId: string | null;
}

interface TaskEditPayload {
  plantId: string;
  plantName: string;
  plantLocation: string | null;
  plantImageUrl: string | null;
  task: {
    customTaskName: string | null;
    enabled: boolean;
    intervalDays: number;
    lastCompletedAt: number | null;
    taskId: string;
    taskType: TaskFormValues["taskType"];
    // FLEX-011: 排期模式字段
    scheduleMode: ScheduleMode;
    weeklyDays: number[] | null;
    seasonalIntervals: { springSummer: number; autumnWinter: number } | null;
  };
}

function toDateInputValue(timestamp: number | null) {
  if (!timestamp) {
    return "";
  }

  const date = new Date(timestamp);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function EditTaskPage({ plantId, taskId }: EditTaskPageProps) {
  const updatePlantTask = useMutation(api.tasks.updatePlantTask);
  const deletePlantTask = useMutation(api.tasks.deletePlantTask);
  const task = useQuery(
    api.tasks.getTaskForEdit,
    plantId && taskId
      ? { plantId: plantId as Id<"plants">, taskId: taskId as Id<"plantTasks"> }
      : "skip",
  ) as TaskEditPayload | null | undefined;

  const [taskType, setTaskType] = useState<CareTaskType>("watering");
  const [customTaskName, setCustomTaskName] = useState("");
  const [intervalDays, setIntervalDays] = useState("1");
  const [baseCompletedOn, setBaseCompletedOn] = useState("");
  const [enabled, setEnabled] = useState(true);
  // FLEX-011: 排期模式状态
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>("interval");
  const [weeklyDays, setWeeklyDays] = useState<number[]>([]);
  const [springSummer, setSpringSummer] = useState("5");
  const [autumnWinter, setAutumnWinter] = useState("14");
  const [errors, setErrors] = useState<{
    customTaskName?: string | null;
    intervalDays?: string | null;
    weeklyDays?: string | null;
    seasonal?: string | null;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (task) {
      setTaskType(task.task.taskType);
      setCustomTaskName(task.task.customTaskName ?? "");
      setIntervalDays(String(task.task.intervalDays));
      setBaseCompletedOn(toDateInputValue(task.task.lastCompletedAt));
      setEnabled(task.task.enabled);
      // FLEX-011: 从服务端数据初始化排期模式
      setScheduleMode(task.task.scheduleMode ?? "interval");
      setWeeklyDays(task.task.weeklyDays ?? []);
      setSpringSummer(String(task.task.seasonalIntervals?.springSummer ?? 5));
      setAutumnWinter(String(task.task.seasonalIntervals?.autumnWinter ?? 14));
      setErrors({});
      setFormError(null);
    }
  }, [task]);

  async function handleSave() {
    if (!task) return;

    const interval = Number(intervalDays);
    const nextErrors: typeof errors = {
      customTaskName: validateCustomTaskName(taskType, customTaskName),
      intervalDays: scheduleMode === "interval" ? validateIntervalDays(interval) : null,
      weeklyDays: scheduleMode === "weekly" ? validateWeeklyDays(weeklyDays) : null,
      seasonal: scheduleMode === "seasonal"
        ? validateSeasonalIntervals({ springSummer: Number(springSummer), autumnWinter: Number(autumnWinter) })
        : null,
    };
    setErrors(nextErrors);

    if (nextErrors.customTaskName || nextErrors.intervalDays || nextErrors.weeklyDays || nextErrors.seasonal) return;

    setIsSubmitting(true);
    setFormError(null);

    try {
      await updatePlantTask({
        taskId: task.task.taskId as Id<"plantTasks">,
        taskType,
        customTaskName: normalizeCustomTaskName(customTaskName),
        intervalDays: scheduleMode === "interval" ? interval : 7, // 非 interval 模式传 fallback 值
        enabled,
        // FLEX-011: 排期模式参数
        scheduleMode,
        weeklyDays: scheduleMode === "weekly" ? weeklyDays : undefined,
        seasonalIntervals: scheduleMode === "seasonal"
          ? { springSummer: Number(springSummer), autumnWinter: Number(autumnWinter) }
          : undefined,
      });
      navigate(`/plants/${task.plantId}`, true);
    } catch (error) {
      setFormError(friendlyError(error, "当前无法更新这条养护提醒，请稍后再试。"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!task) return;
    setIsDeleting(true);
    try {
      await deletePlantTask({ taskId: task.task.taskId as Id<"plantTasks"> });
      navigate(`/plants/${task.plantId}`, true);
    } catch {
      setIsDeleting(false);
    }
  }

  if (!plantId || !taskId) {
    return (
      <EmptyState
        badge="养护任务"
        title="当前提醒编辑页缺少必要 ID"
        description="请返回植物详情页，从有效的家庭植物任务重新进入。"
        actions={
          <Button type="button" variant="secondary" onClick={() => navigate("/plants")}>
            返回植物列表
          </Button>
        }
      />
    );
  }

  if (task === undefined) {
    return (
      <div style={pageStyle}>
        <ScreenNav
          title="编辑养护"
          onBack={() => navigate(`/plants/${plantId}`, true)}
        />
        <div style={loadingStyle}>
          <p style={loadingTextStyle}>正在加载…</p>
        </div>
      </div>
    );
  }

  if (task === null) {
    return (
      <EmptyState
        badge="不可用"
        title="当前家庭中找不到这条养护提醒"
        description="它可能属于其他家庭，或者已经被删除。"
        actions={
          <Button type="button" variant="secondary" onClick={() => navigate(`/plants/${plantId}`)}>
            返回植物详情
          </Button>
        }
        minHeight="220px"
      />
    );
  }

  const taskLabel = formatTaskTypeLabel(taskType, customTaskName);
  const duePreview = getDuePreview({ scheduleMode, intervalDays, weeklyDays, springSummer, autumnWinter, baseCompletedOn });

  return (
    <div style={pageStyle}>
      {/* ScreenNav */}
      <ScreenNav
        title="编辑养护"
        onBack={() => navigate(`/plants/${task.plantId}`, true)}
        rightAction={
          <button
            disabled={isSubmitting}
            onClick={() => void handleSave()}
            style={{
              ...saveButtonStyle,
              opacity: isSubmitting ? 0.6 : 1,
              cursor: isSubmitting ? "not-allowed" : "pointer",
            }}
            type="button"
          >
            {isSubmitting ? "保存中…" : "保存"}
          </button>
        }
      />

      {/* FormSummaryCard — 白色自适应 */}
      <FormSummaryCard
        thumbnail={
          <StorageImage
            alt={task.plantName}
            fallback={
              <div style={formSummaryThumbFallbackStyle}>
                <Icon icon={Leaf} size={24} colorVar="--color-leaf" />
              </div>
            }
            initialUrl={task.plantImageUrl}
            style={formSummaryThumbImageStyle}
          />
        }
        title={`${task.plantName} · ${taskLabel}`}
        subtitle={
          task.plantLocation ? (
            <>
              <Icon icon={MapPin} size={13} colorVar="--color-muted" />
              {task.plantLocation}
            </>
          ) : undefined
        }
      />

      {/* Form fields — 分组卡片 */}
      <div style={formAreaStyle}>
        {/* 第一组：任务类型 */}
        <div style={cardGroupStyle} className="form-card-stagger">
          <div style={fieldGroupStyle}>
            <label style={fieldLabelWithBarStyle}><Icon icon={Droplet} size={14} colorVar="--color-leaf" /> 任务类型</label>
            <div style={selectWrapStyle}>
              <select
                value={taskType}
                onChange={(e) => setTaskType(e.target.value as CareTaskType)}
                style={selectInputStyle}
                className="form-input-enhanced"
              >
                {careTaskTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <span style={selectArrowStyle}>
                <Icon icon={ChevronDown} size={18} colorVar="--color-muted" />
              </span>
            </div>
          </div>

          {/* 自定义任务名称 (conditional) */}
          {requiresCustomTaskName(taskType) ? (
            <div style={fieldGroupStyle}>
              <label style={fieldLabelWithBarStyle}>自定义任务名称</label>
              <input
                type="text"
                value={customTaskName}
                onChange={(e) => setCustomTaskName(e.target.value)}
                placeholder="擦拭叶片"
                className="form-input-enhanced"
                style={{
                  ...textInputStyle,
                  ...(errors.customTaskName ? inputErrorBorderStyle : undefined),
                }}
              />
              {errors.customTaskName ? (
                <span style={errorTextStyle}>{errors.customTaskName}</span>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* 第二组：排期模式 + 间隔与日期 */}
        <div style={cardGroupStyle} className="form-card-stagger">
          {/* FLEX-011: 排期模式选择器 */}
          <ScheduleModeFieldGroup
            mode={scheduleMode}
            onModeChange={setScheduleMode}
            weeklyDays={weeklyDays}
            onWeeklyDaysChange={setWeeklyDays}
            weeklyError={errors.weeklyDays}
            springSummer={springSummer}
            autumnWinter={autumnWinter}
            onSpringSummerChange={setSpringSummer}
            onAutumnWinterChange={setAutumnWinter}
            seasonalError={errors.seasonal}
          />

          {/* 提醒间隔天数（仅固定间隔模式下显示） */}
          {scheduleMode === "interval" && (
            <div style={fieldGroupStyle}>
              <label style={fieldLabelWithBarStyle}>提醒间隔天数</label>
              <div style={inputBoxWrapStyle}>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={intervalDays}
                  onChange={(e) => setIntervalDays(e.target.value)}
                  className="form-input-enhanced"
                  style={{
                    ...inboxInputStyle,
                    ...(errors.intervalDays ? inputErrorBorderStyle : undefined),
                  }}
                />
                <span style={inboxSuffixStyle}>天</span>
              </div>
              {errors.intervalDays ? (
                <span style={errorTextStyle}>{errors.intervalDays}</span>
              ) : (
                <span style={helperStyle}>
                  {`每 ${intervalDays || "?"} 天提醒一次`}
                </span>
              )}
            </div>
          )}

          {/* 上次完成日期 */}
          <div style={fieldGroupStyle}>
            <label style={fieldLabelWithBarStyle}>上次完成日期</label>
            <input
              type="date"
              value={baseCompletedOn}
              onChange={(e) => setBaseCompletedOn(e.target.value)}
              className="form-input-enhanced"
              style={textInputStyle}
            />
            <span style={helperStyle}>用于计算下次提醒日期</span>
          </div>
        </div>

        {/* 第三组：预览 */}
        <div style={previewCardStyle} className="form-card-stagger">
          <label style={fieldLabelWithBarStyle}>下次任务预览</label>
          <div style={previewContentStyle}>
            <div style={previewCardInnerStyle}>
              <div style={previewIconWrapStyle}>
                <Icon icon={Leaf} size={18} colorVar="--color-leaf" />
              </div>
              <div>
                <span style={previewCardTitleStyle}>{duePreview.label}</span>
                <span style={previewCardDescStyle}>{duePreview.description}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 第四组：提醒状态 */}
        <div style={cardGroupStyle} className="form-card-stagger">
          <div style={fieldGroupStyle}>
            <label style={fieldLabelWithBarStyle}>提醒状态</label>
            <div style={toggleCardStyle}>
              <div style={toggleCardInnerStyle}>
                <span style={toggleCardDotStyle(enabled)} />
                <span style={toggleCardLabelStyle}>{enabled ? "已启用" : "已停用"}</span>
                <ToggleSwitch
                  checked={enabled}
                  onChange={setEnabled}
                  aria-label={enabled ? "停用提醒" : "启用提醒"}
                />
              </div>
            </div>
            <span style={helperStyle}>
              关闭后将不会在待办中显示，也不会收到提醒
            </span>
          </div>
        </div>

        <FormError message={formError} />
      </div>

      {/* Danger zone */}
      <div style={dangerZoneStyle}>
        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          style={deleteButtonStyle}
        >
          <Icon icon={Trash2} size={18} colorVar="--color-error" />
          <span>删除任务</span>
        </button>
      </div>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <ConfirmSheet
          title={`确认删除"${taskLabel}"？`}
          description="删除后，这条养护提醒会从这盆植物上彻底消失，无法恢复。"
          confirmLabel={isDeleting ? "删除中…" : "删除"}
          cancelLabel="取消"
          variant="danger-solid"
          isSubmitting={isDeleting}
          onConfirm={() => void handleDelete()}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      {/* 全局 CSS for focus 态和入场动画 */}
      <style>{formEnhancementCSS}</style>
    </div>
  );
}

/* ─── Helpers ─── */

interface DuePreviewResult {
  label: string;
  description: string;
}

interface DuePreviewInput {
  scheduleMode: ScheduleMode;
  intervalDays: string;
  weeklyDays: number[];
  springSummer: string;
  autumnWinter: string;
  baseCompletedOn: string;
}

function getDuePreview(input: DuePreviewInput): DuePreviewResult {
  const { scheduleMode, intervalDays: intervalDaysStr, weeklyDays, springSummer, autumnWinter, baseCompletedOn } = input;

  const baseTimestamp = baseCompletedOn
    ? parseDateInputToTimestamp(baseCompletedOn)
    : Date.now();

  if (!baseTimestamp) {
    return { label: "—", description: "请输入有效的完成日期" };
  }

  const msPerDay = 24 * 60 * 60 * 1000;
  let nextDueAt: number;

  if (scheduleMode === "weekly") {
    if (!weeklyDays || weeklyDays.length === 0) {
      return { label: "—", description: "请选择至少一个星期几" };
    }
    // 计算下一个匹配日
    nextDueAt = baseTimestamp + msPerDay; // fallback
    for (let offset = 1; offset <= 7; offset++) {
      const candidateMs = baseTimestamp + offset * msPerDay;
      const candidateDate = new Date(candidateMs);
      if (weeklyDays.includes(candidateDate.getUTCDay())) {
        nextDueAt = Date.UTC(
          candidateDate.getUTCFullYear(),
          candidateDate.getUTCMonth(),
          candidateDate.getUTCDate(),
        );
        break;
      }
    }
  } else if (scheduleMode === "seasonal") {
    const ss = Number(springSummer);
    const aw = Number(autumnWinter);
    if ((!Number.isInteger(ss) || ss < 1) && (!Number.isInteger(aw) || aw < 1)) {
      return { label: "—", description: "请输入有效的季节间隔天数" };
    }
    const month = new Date(baseTimestamp).getUTCMonth();
    const effectiveInterval = (month >= 2 && month <= 7) ? ss : aw;
    if (!Number.isInteger(effectiveInterval) || effectiveInterval < 1) {
      return { label: "—", description: "请输入有效的季节间隔天数" };
    }
    nextDueAt = baseTimestamp + effectiveInterval * msPerDay;
  } else {
    // interval mode
    const interval = Number(intervalDaysStr);
    if (!Number.isInteger(interval) || interval < 1) {
      return { label: "—", description: "请输入有效的整数天数" };
    }
    nextDueAt = baseTimestamp + interval * msPerDay;
  }

  // Determine short pill label
  const now = Date.now();
  const dueDate = new Date(nextDueAt);
  const today = new Date(now);
  const dayDelta = Math.floor(
    (Date.UTC(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()) -
      Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) /
      msPerDay,
  );

  let pillLabel: string;
  if (dayDelta < 0) pillLabel = "已逾期";
  else if (dayDelta === 0) pillLabel = "今天";
  else if (dayDelta === 1) pillLabel = "明天";
  else pillLabel = `${dayDelta}天后`;

  return { label: pillLabel, description: "预计提醒日期" };
}

function parseDateInputToTimestamp(value: string) {
  const [year, month, day] = value.split("-").map((part) => Number(part));
  if (!year || !month || !day) return null;
  return Date.UTC(year, month - 1, day, 12, 0, 0);
}

/* ─── Enhanced CSS ─── */

const formEnhancementCSS = `
  .form-input-enhanced:focus {
    outline: none;
    border-color: var(--color-leaf) !important;
    box-shadow: 0 0 0 3px rgba(31, 71, 61, 0.10), 0 1px 3px rgba(31, 71, 61, 0.06) !important;
  }

  @keyframes formCardStagger {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .form-card-stagger {
    animation: formCardStagger 0.4s ease-out both;
  }
  .form-card-stagger:nth-child(1) { animation-delay: 0.05s; }
  .form-card-stagger:nth-child(2) { animation-delay: 0.12s; }
  .form-card-stagger:nth-child(3) { animation-delay: 0.19s; }
  .form-card-stagger:nth-child(4) { animation-delay: 0.26s; }

  @media (prefers-reduced-motion: reduce) {
    .form-card-stagger { animation: none; opacity: 1; transform: none; }
  }
`;

/* ─── Styles ─── */

const pageStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  minHeight: "100dvh",
  background: "var(--color-paper)",
};

const loadingStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "var(--space-xl)",
};

const loadingTextStyle: React.CSSProperties = {
  color: "var(--color-muted)",
  fontSize: "14px",
};

const saveButtonStyle: React.CSSProperties = {
  appearance: "none",
  border: "none",
  background: "var(--color-leaf)",
  color: "#fff",
  fontSize: "14px",
  fontWeight: 600,
  padding: "6px 16px",
  borderRadius: "var(--radius-pill)",
  boxShadow: "0 2px 6px rgba(31,71,61,0.18)",
};


const formAreaStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-md)",
  padding: "var(--space-md) var(--space-md) 0",
};

/** 白色卡片分组容器 */
const cardGroupStyle: React.CSSProperties = {
  background: "var(--color-surface)",
  borderRadius: "var(--radius-card)",
  border: "1px solid var(--color-line)",
  padding: "var(--space-md)",
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-lg)",
  boxShadow: "0 1px 4px rgba(31,71,61,0.04)",
};

const fieldGroupStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-xs)",
};

/** label 带左侧绿色竖线 */
const fieldLabelWithBarStyle: React.CSSProperties = {
  color: "var(--color-ink)",
  fontSize: "14px",
  fontWeight: 600,
  margin: 0,
  paddingLeft: "10px",
  borderLeft: "3px solid var(--color-leaf)",
  display: "flex",
  alignItems: "center",
  gap: "6px",
};

const selectWrapStyle: React.CSSProperties = {
  position: "relative",
  display: "flex",
  alignItems: "center",
};

const selectInputStyle: React.CSSProperties = {
  appearance: "none",
  flex: 1,
  minHeight: "48px",
  borderRadius: "var(--radius-input)",
  border: "1px solid var(--color-line)",
  background: "var(--color-paper)",
  color: "var(--color-ink)",
  padding: "0 40px 0 14px",
  fontSize: "14px",
  transition: "border-color 0.2s, box-shadow 0.2s",
};

const selectArrowStyle: React.CSSProperties = {
  position: "absolute",
  right: "14px",
  display: "flex",
  alignItems: "center",
  pointerEvents: "none",
};

const textInputStyle: React.CSSProperties = {
  minHeight: "48px",
  borderRadius: "var(--radius-input)",
  border: "1px solid var(--color-line)",
  background: "var(--color-paper)",
  color: "var(--color-ink)",
  padding: "0 14px",
  fontSize: "14px",
  transition: "border-color 0.2s, box-shadow 0.2s",
};

const inputErrorBorderStyle: React.CSSProperties = {
  borderColor: "var(--color-error)",
  boxShadow: "0 0 0 3px rgba(197,48,48,0.12)",
};

/* ── 输入框内嵌后缀/图标 ── */

const inputBoxWrapStyle: React.CSSProperties = {
  position: "relative",
  display: "flex",
  alignItems: "center",
};

const inboxInputStyle: React.CSSProperties = {
  ...textInputStyle,
  flex: 1,
  paddingRight: "44px",
};

const inboxSuffixStyle: React.CSSProperties = {
  position: "absolute",
  right: "14px",
  color: "var(--color-muted)",
  fontSize: "14px",
  fontWeight: 500,
  pointerEvents: "none",
};

const inboxIconStyle: React.CSSProperties = {
  position: "absolute",
  right: "14px",
  display: "flex",
  alignItems: "center",
  pointerEvents: "none",
};

const helperStyle: React.CSSProperties = {
  color: "var(--color-muted)",
  fontSize: "12px",
  lineHeight: 1.5,
};

const errorTextStyle: React.CSSProperties = {
  color: "var(--color-error)",
  fontSize: "12px",
  lineHeight: 1.5,
};

/* ── 预览卡片（带左侧彩色边条） ── */

const previewCardStyle: React.CSSProperties = {
  background: "var(--color-surface)",
  borderRadius: "var(--radius-card)",
  border: "1px solid var(--color-line)",
  padding: "var(--space-md)",
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-sm)",
  boxShadow: "0 1px 4px rgba(31,71,61,0.04)",
};

const previewContentStyle: React.CSSProperties = {
  borderLeft: "3px solid var(--color-leaf)",
  borderRadius: "var(--radius-input)",
  background: "var(--color-mist)",
  padding: "14px 16px",
};

const previewCardInnerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
};

const previewIconWrapStyle: React.CSSProperties = {
  width: "36px",
  height: "36px",
  borderRadius: "50%",
  background: "rgba(31,71,61,0.08)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const previewCardTitleStyle: React.CSSProperties = {
  display: "block",
  color: "var(--color-ink)",
  fontSize: "14px",
  fontWeight: 600,
};

const previewCardDescStyle: React.CSSProperties = {
  display: "block",
  color: "var(--color-muted)",
  fontSize: "12px",
};

/* ── 提醒状态卡片 ── */

const toggleCardStyle: React.CSSProperties = {
  borderRadius: "var(--radius-input)",
  background: "var(--color-paper)",
  padding: "12px 16px",
};

const toggleCardInnerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
};

function toggleCardDotStyle(active: boolean): React.CSSProperties {
  return {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: active ? "var(--color-leaf)" : "var(--color-line)",
    flexShrink: 0,
    boxShadow: active ? "0 0 6px rgba(31,71,61,0.3)" : "none",
    transition: "background 0.2s, box-shadow 0.2s",
  };
}

const toggleCardLabelStyle: React.CSSProperties = {
  flex: 1,
  fontSize: "14px",
  color: "var(--color-ink)",
  fontWeight: 500,
};


const dangerZoneStyle: React.CSSProperties = {
  padding: "var(--space-xl) var(--space-md) var(--space-lg)",
  marginTop: "auto",
};

const deleteButtonStyle: React.CSSProperties = {
  appearance: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "var(--space-xs)",
  width: "100%",
  minHeight: "48px",
  borderRadius: "var(--radius-button)",
  border: "1px solid rgba(197,48,48,0.3)",
  background: "rgba(197,48,48,0.04)",
  color: "var(--color-error)",
  fontSize: "15px",
  fontWeight: 600,
  cursor: "pointer",
  transition: "background 0.2s, border-color 0.2s",
};
