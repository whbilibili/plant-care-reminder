import { Button } from "../../components/ui/Button";
import { FormError } from "../../components/ui/FormError";
import { InputField } from "../../components/ui/InputField";
import { PageHeader } from "../../components/ui/PageHeader";
import { CUSTOM_TASK_NAME_MAX_LENGTH } from "../../lib/constants";
import { formatDueDate } from "../../lib/formatters";
import {
  careTaskTypeOptions,
  formatTaskTypeLabel,
  requiresCustomTaskName,
  type CareTaskType,
} from "./taskTypes";

export interface TaskFormValues {
  baseCompletedOn: string;
  customTaskName: string;
  intervalDays: string;
  taskType: CareTaskType;
}

export interface TaskFormErrors {
  customTaskName?: string | null;
  intervalDays?: string | null;
}

interface TaskFormProps {
  actionsSlot?: React.ReactNode;
  description?: React.ReactNode;
  errors: TaskFormErrors;
  formError?: string | null;
  isSubmitting: boolean;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
  onValueChange: <Field extends keyof TaskFormValues>(
    field: Field,
    value: TaskFormValues[Field],
  ) => void;
  plantName: string;
  submitLabel: string;
  title?: React.ReactNode;
  values: TaskFormValues;
}

export function TaskForm({
  actionsSlot,
  description = (
    <p style={bodyStyle}>
      为这盆植物添加一个按间隔执行的提醒。系统会根据间隔和可选的上次完成日期自动计算下次到期时间。
    </p>
  ),
  errors,
  formError,
  isSubmitting,
  onSubmit,
  onValueChange,
  plantName,
  submitLabel,
  title = `为 ${plantName} 创建提醒`,
  values,
}: TaskFormProps) {
  const selectedTaskType = careTaskTypeOptions.find((option) => option.value === values.taskType);
  const duePreview = getDuePreview(values);

  return (
    <section style={cardStyle}>
      <PageHeader
        eyebrow="养护任务"
        title={title}
        description={description}
      />
      <form noValidate onSubmit={onSubmit} style={formStyle}>
        <SelectField
          hint={selectedTaskType?.description}
          label="任务类型"
          onChange={(event) => onValueChange("taskType", event.target.value as CareTaskType)}
          value={values.taskType}
        >
          {careTaskTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectField>
        {requiresCustomTaskName(values.taskType) ? (
          <InputField
            autoComplete="off"
            errorMessage={errors.customTaskName}
            hint="仅在选择自定义任务时必填。"
            label="自定义任务名称"
            maxLength={CUSTOM_TASK_NAME_MAX_LENGTH}
            onChange={(event) => onValueChange("customTaskName", event.target.value)}
            placeholder="擦拭叶片"
            value={values.customTaskName}
          />
        ) : null}
        <InputField
          errorMessage={errors.intervalDays}
          hint="必填。表示两次提醒之间相隔的完整天数。"
          inputMode="numeric"
          label="提醒间隔天数"
          min={1}
          onChange={(event) => onValueChange("intervalDays", event.target.value)}
          placeholder="7"
          type="number"
          value={values.intervalDays}
        />
        <InputField
          hint="选填。填写后会基于这次完成日期计算下一次提醒时间。"
          label="上次完成日期"
          onChange={(event) => onValueChange("baseCompletedOn", event.target.value)}
          type="date"
          value={values.baseCompletedOn}
        />
        <div style={previewPanelStyle}>
          <p style={previewEyebrowStyle}>下次任务预览</p>
          <p style={previewTitleStyle}>{formatTaskTypeLabel(values.taskType, values.customTaskName)}</p>
          <p style={previewCopyStyle}>{duePreview}</p>
        </div>
        <FormError message={formError} />
        <Button disabled={isSubmitting} type="submit">
          {isSubmitting ? "保存中..." : submitLabel}
        </Button>
        {actionsSlot ? <div style={actionsSlotStyle}>{actionsSlot}</div> : null}
      </form>
    </section>
  );
}

export function parseDateInputToTimestamp(value: string) {
  const [year, month, day] = value.split("-").map((part) => Number(part));
  if (!year || !month || !day) {
    return null;
  }

  return Date.UTC(year, month - 1, day, 12, 0, 0);
}

function getDuePreview(values: TaskFormValues) {
  const interval = Number(values.intervalDays);
  if (!Number.isInteger(interval) || interval < 1) {
    return "请输入有效的整数天数，才能预览下一次提醒时间。";
  }

  const baseTimestamp = values.baseCompletedOn
    ? parseDateInputToTimestamp(values.baseCompletedOn)
    : Date.now();

  if (!baseTimestamp) {
    return "请输入有效的完成日期，才能预览下一次提醒时间。";
  }

  return formatDueDate(baseTimestamp + interval * 24 * 60 * 60 * 1000);
}

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  children: React.ReactNode;
  hint?: React.ReactNode;
  label: string;
}

function SelectField({ children, hint, id, label, style, ...props }: SelectFieldProps) {
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <label htmlFor={fieldId} style={fieldWrapStyle}>
      <span style={fieldLabelStyle}>{label}</span>
      <select
        {...props}
        id={fieldId}
        style={{
          ...selectStyle,
          ...style,
        }}
      >
        {children}
      </select>
      {hint ? <span style={hintStyle}>{hint}</span> : null}
    </label>
  );
}

const cardStyle: React.CSSProperties = {
  borderRadius: "24px",
  padding: "28px 22px",
  background: "var(--color-surface)",
  border: "1px solid var(--color-line)",
  boxShadow: "var(--shadow-card)",
  display: "grid",
  gap: "22px",
};

const bodyStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--color-muted)",
  fontSize: "1rem",
  lineHeight: 1.7,
};

const formStyle: React.CSSProperties = {
  display: "grid",
  gap: "18px",
};

const fieldWrapStyle: React.CSSProperties = {
  display: "grid",
  gap: "8px",
};

const fieldLabelStyle: React.CSSProperties = {
  color: "var(--color-ink)",
  fontSize: "0.95rem",
  fontWeight: 700,
};

const selectStyle: React.CSSProperties = {
  minHeight: "50px",
  borderRadius: "16px",
  border: "1px solid var(--color-line)",
  background: "var(--color-surface)",
  color: "var(--color-ink)",
  padding: "0 14px",
  fontSize: "0.98rem",
};

const hintStyle: React.CSSProperties = {
  color: "var(--color-muted)",
  fontSize: "0.86rem",
  lineHeight: 1.5,
};

const previewPanelStyle: React.CSSProperties = {
  borderRadius: "18px",
  padding: "16px",
  background: "var(--color-mist)",
  border: "1px solid var(--color-line)",
  display: "grid",
  gap: "6px",
};

const previewEyebrowStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--color-leaf)",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  fontSize: "0.72rem",
  fontWeight: 700,
};

const previewTitleStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--color-ink)",
  fontSize: "1.05rem",
  fontWeight: 700,
};

const previewCopyStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--color-muted)",
  fontSize: "0.92rem",
  lineHeight: 1.5,
};

const actionsSlotStyle: React.CSSProperties = {
  display: "grid",
  gap: "12px",
};
