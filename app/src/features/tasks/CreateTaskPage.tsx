import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { ChevronDown, Droplet, Leaf, MapPin } from "lucide-react";

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
import { parseDateInputToTimestamp } from "./TaskForm";

interface CreateTaskPageProps {
  plantId: string | null;
}

interface TaskCreationPlant {
  imageUrl: string | null;
  location: string | null;
  plantId: string;
  plantName: string;
}

export function CreateTaskPage({ plantId }: CreateTaskPageProps) {
  const createPlantTask = useMutation(api.tasks.createPlantTask);
  const plant = useQuery(
    api.tasks.getTaskCreationPlant,
    plantId ? { plantId: plantId as Id<"plants"> } : "skip",
  ) as TaskCreationPlant | null | undefined;

  const [taskType, setTaskType] = useState<CareTaskType>("watering");
  const [customTaskName, setCustomTaskName] = useState("");
  const [intervalDays, setIntervalDays] = useState("7");
  const [baseCompletedOn, setBaseCompletedOn] = useState("");
  // FLEX-010: 排期模式状态
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

  async function handleSave() {
    if (!plantId) return;

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
      await createPlantTask({
        plantId: plantId as Id<"plants">,
        taskType,
        customTaskName: normalizeCustomTaskName(customTaskName),
        intervalDays: scheduleMode === "interval" ? interval : 7, // 非 interval 模式传 fallback 值
        baseCompletedAt: baseCompletedOn
          ? parseDateInputToTimestamp(baseCompletedOn)
          : null,
        // FLEX-010: 排期模式参数
        scheduleMode,
        weeklyDays: scheduleMode === "weekly" ? weeklyDays : undefined,
        seasonalIntervals: scheduleMode === "seasonal"
          ? { springSummer: Number(springSummer), autumnWinter: Number(autumnWinter) }
          : undefined,
      });
      navigate(`/plants/${plantId}`, true);
    } catch (error) {
      setFormError(friendlyError(error, "当前无法保存这条养护提醒，请稍后再试。"));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!plantId) {
    return (
      <EmptyState
        badge="养护任务"
        title="当前提醒页面缺少植物 ID"
        description="请返回植物详情页，从有效的家庭植物重新进入。"
        actions={
          <Button type="button" variant="secondary" onClick={() => navigate("/plants")}>
            返回植物列表
          </Button>
        }
      />
    );
  }

  if (plant === undefined) {
    return (
      <div style={pageStyle}>
        <ScreenNav
          title="新建养护"
          onBack={() => navigate(`/plants/${plantId}`, true)}
        />
        <div style={loadingStyle}>
          <p style={loadingTextStyle}>正在加载…</p>
        </div>
      </div>
    );
  }

  if (plant === null) {
    return (
      <EmptyState
        badge="不可用"
        title="这盆植物当前无法添加新提醒"
        description="它可能已经归档、被删除，或者不属于你当前的家庭。"
        actions={
          <Button type="button" variant="secondary" onClick={() => navigate("/plants")}>
            返回植物列表
          </Button>
        }
        minHeight="220px"
      />
    );
  }

  const taskLabel = formatTaskTypeLabel(taskType, customTaskName);
  const duePreview = getDuePreview(intervalDays, baseCompletedOn);

  return (
    <div style={pageStyle}>
      {/* ScreenNav */}
      <ScreenNav
        title="新建养护"
        onBack={() => navigate(`/plants/${plantId}`, true)}
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
            alt={plant.plantName}
            fallback={
              <div style={formSummaryThumbFallbackStyle}>
                <Icon icon={Leaf} size={24} colorVar="--color-leaf" />
              </div>
            }
            initialUrl={plant.imageUrl}
            style={formSummaryThumbImageStyle}
          />
        }
        title={`${plant.plantName} · ${taskLabel}`}
        subtitle={
          plant.location ? (
            <>
              <Icon icon={MapPin} size={13} colorVar="--color-muted" />
              {plant.location}
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
          {/* FLEX-010: 排期模式选择器 */}
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
            <span style={helperStyle}>选填，用于计算下次提醒日期</span>
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

        <FormError message={formError} />
      </div>

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

function getDuePreview(intervalDaysStr: string, baseCompletedOn: string): DuePreviewResult {
  const interval = Number(intervalDaysStr);
  if (!Number.isInteger(interval) || interval < 1) {
    return { label: "—", description: "请输入有效的整数天数" };
  }

  const baseTimestamp = baseCompletedOn
    ? parseDateInputToTimestamp(baseCompletedOn)
    : Date.now();

  if (!baseTimestamp) {
    return { label: "—", description: "请输入有效的完成日期" };
  }

  const nextDueAt = baseTimestamp + interval * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const msPerDay = 24 * 60 * 60 * 1000;
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
  padding: "var(--space-md) var(--space-md) var(--space-lg)",
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
