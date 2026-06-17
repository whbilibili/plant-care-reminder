import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { ChevronDown, Calendar, Droplet, Leaf, MapPin } from "lucide-react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { navigate } from "../../app/router";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { Icon } from "../../components/ui/Icon";
import { ObjectSummaryBand } from "../../components/ui/ObjectSummaryBand";
import { ScreenNav } from "../../components/ui/ScreenNav";
import { StorageImage } from "../../components/ui/StorageImage";
import { FormError } from "../../components/ui/FormError";
import { GroupedSurface } from "../../components/ui/GroupedSurface";
import {
  careTaskTypeOptions,
  formatTaskTypeLabel,
  normalizeCustomTaskName,
  requiresCustomTaskName,
  validateCustomTaskName,
  type CareTaskType,
} from "./taskTypes";
import { validateIntervalDays } from "./scheduling";
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
  const [errors, setErrors] = useState<{ customTaskName?: string | null; intervalDays?: string | null }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSave() {
    if (!plantId) return;

    const interval = Number(intervalDays);
    const nextErrors = {
      customTaskName: validateCustomTaskName(taskType, customTaskName),
      intervalDays: validateIntervalDays(interval),
    };
    setErrors(nextErrors);

    if (nextErrors.customTaskName || nextErrors.intervalDays) return;

    setIsSubmitting(true);
    setFormError(null);

    try {
      await createPlantTask({
        plantId: plantId as Id<"plants">,
        taskType,
        customTaskName: normalizeCustomTaskName(customTaskName),
        intervalDays: interval,
        baseCompletedAt: baseCompletedOn
          ? parseDateInputToTimestamp(baseCompletedOn)
          : null,
      });
      navigate(`/plants/${plantId}`, true);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "当前无法保存这条养护提醒，请稍后再试。",
      );
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

      {/* ObjectSummaryBand in card */}
      <div style={summaryCardWrapStyle}>
        <GroupedSurface>
          <ObjectSummaryBand
            thumbnail={
              <StorageImage
                alt={plant.plantName}
                fallback={
                  <div style={thumbFallbackStyle}>
                    <Icon icon={Leaf} size={24} colorVar="--color-leaf" />
                  </div>
                }
                initialUrl={plant.imageUrl}
                style={thumbImageStyle}
              />
            }
            title={`${plant.plantName} · ${taskLabel}`}
            subtitle={
              plant.location ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
                  <Icon icon={MapPin} size={13} colorVar="--color-muted" />
                  {plant.location}
                </span>
              ) : undefined
            }
          />
        </GroupedSurface>
      </div>

      {/* Form fields */}
      <div style={formAreaStyle}>
        {/* 任务类型 */}
        <div style={fieldGroupStyle}>
          <label style={fieldLabelStyle}><Icon icon={Droplet} size={14} colorVar="--color-leaf" /> 任务类型</label>
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
            <label style={fieldLabelStyle}>自定义任务名称</label>
            <input
              type="text"
              value={customTaskName}
              onChange={(e) => setCustomTaskName(e.target.value)}
              placeholder="擦拭叶片"
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

        {/* 提醒间隔天数 */}
        <div style={fieldGroupStyle}>
          <label style={fieldLabelStyle}>提醒间隔天数</label>
          <div style={inputBoxWrapStyle}>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={intervalDays}
              onChange={(e) => setIntervalDays(e.target.value)}
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
            <span style={helperStyle}>每 {intervalDays || "?"} 天提醒一次</span>
          )}
        </div>

        {/* 上次完成日期 */}
        <div style={fieldGroupStyle}>
          <label style={fieldLabelStyle}>上次完成日期</label>
          <div style={inputBoxWrapStyle}>
            <input
              type="date"
              value={baseCompletedOn}
              onChange={(e) => setBaseCompletedOn(e.target.value)}
              style={inboxInputStyle}
            />
            <span style={inboxIconStyle}>
              <Icon icon={Calendar} size={18} colorVar="--color-muted" />
            </span>
          </div>
          <span style={helperStyle}>选填，用于计算下次提醒日期</span>
        </div>

        {/* 下次任务预览 */}
        <div style={fieldGroupStyle}>
          <label style={fieldLabelStyle}>下次任务预览</label>
          <div style={previewCardStyle}>
            <div style={previewCardInnerStyle}>
              <Icon icon={Leaf} size={18} colorVar="--color-leaf" />
              <div>
                <span style={previewCardTitleStyle}>{duePreview.label}</span>
                <span style={previewCardDescStyle}>{duePreview.description}</span>
              </div>
            </div>
          </div>
        </div>

        <FormError message={formError} />
      </div>
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
  background: "transparent",
  color: "var(--color-leaf)",
  fontSize: "16px",
  fontWeight: 600,
  padding: "var(--space-xs) var(--space-sm)",
};

const summaryCardWrapStyle: React.CSSProperties = {
  padding: "0 var(--space-md)",
  marginTop: "var(--space-sm)",
};

const thumbFallbackStyle: React.CSSProperties = {
  width: "56px",
  height: "56px",
  borderRadius: "var(--radius-button)",
  background: "var(--color-mist)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const thumbImageStyle: React.CSSProperties = {
  width: "56px",
  height: "56px",
  objectFit: "cover",
  borderRadius: "var(--radius-button)",
};

const formAreaStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-lg)",
  padding: "var(--space-md) var(--space-md) var(--space-lg)",
};

const fieldGroupStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-xs)",
};

const fieldLabelStyle: React.CSSProperties = {
  color: "var(--color-ink)",
  fontSize: "14px",
  fontWeight: 600,
  margin: 0,
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
  background: "var(--color-surface)",
  color: "var(--color-ink)",
  padding: "0 40px 0 14px",
  fontSize: "14px",
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
  background: "var(--color-surface)",
  color: "var(--color-ink)",
  padding: "0 14px",
  fontSize: "14px",
};

const inputErrorBorderStyle: React.CSSProperties = {
  borderColor: "var(--color-error)",
  boxShadow: "0 0 0 3px rgba(197,48,48,0.12)",
};

/* ── 输入框内嵌后缀/图标（设计稿要求辅助元素在框内） ── */

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

/* ── 下次任务预览卡片（设计稿要求独立容器） ── */

const previewCardStyle: React.CSSProperties = {
  borderRadius: "var(--radius-input)",
  background: "var(--color-mist)",
  padding: "14px 16px",
};

const previewCardInnerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
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
