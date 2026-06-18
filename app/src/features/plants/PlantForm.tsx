import { FormError } from "../../components/ui/FormError";
import { InputField } from "../../components/ui/InputField";
import {
  PLANT_DESCRIPTION_MAX_LENGTH,
  PLANT_LOCATION_MAX_LENGTH,
  PLANT_NAME_MAX_LENGTH,
  PLANT_NOTE_MAX_LENGTH,
} from "../../lib/constants";
import { LocationAutocomplete } from "./LocationAutocomplete";
import { PlantImageField } from "./PlantImageField";
import type { PlantFormController } from "./usePlantForm";

interface PlantFormProps {
  form: PlantFormController;
  /** 内部提交按钮的文案（供测试和无 ScreenNav 场景使用）。 */
  submitLabel: string;
  /** 家庭内已有的位置建议列表（去重、按频率降序）。 */
  locationSuggestions?: string[];
}

/**
 * PlantForm — 安静表单布局。
 *
 * 遵循 06-quiet-form 设计稿：
 * - 不使用 PageHeader / eyebrow / 大标题
 * - 不使用外层大白卡片包裹
 * - 字段直接平铺在 paper 底色上
 * - 提交按钮保留在表单底部（测试兼容 + 无障碍 fallback）
 */
export function PlantForm({ form, submitLabel, locationSuggestions }: PlantFormProps) {
  return (
    <form noValidate style={formStyle} onSubmit={form.handleSubmit}>
      <InputField
        autoComplete="off"
        errorMessage={form.errors.name}
        hint="必填。建议使用家里平时对这盆植物的叫法。"
        label="植物名称"
        maxLength={PLANT_NAME_MAX_LENGTH}
        onChange={(event) => form.setFieldValue("name", event.target.value)}
        placeholder="给它起个名字"
        required
        value={form.values.name}
      />
      <TextAreaField
        errorMessage={form.errors.description}
        hint="选填。可以写外观特征或基础养护信息。"
        label="简介"
        maxLength={PLANT_DESCRIPTION_MAX_LENGTH}
        onChange={(event) => form.setFieldValue("description", event.target.value)}
        placeholder="简单介绍一下这盆植物"
        rows={3}
        value={form.values.description}
      />
      <TextAreaField
        errorMessage={form.errors.note}
        hint="选填。可以记录家庭内部才会用到的提醒或习惯。"
        label="养护备注"
        maxLength={PLANT_NOTE_MAX_LENGTH}
        onChange={(event) => form.setFieldValue("note", event.target.value)}
        placeholder="记录养护习惯或注意事项"
        rows={3}
        value={form.values.note}
      />
      {locationSuggestions && locationSuggestions.length > 0 ? (
        <LocationAutocomplete
          suggestions={locationSuggestions}
          value={form.values.location}
          onChange={(val) => form.setFieldValue("location", val)}
          errorMessage={form.errors.location}
        />
      ) : (
        <InputField
          autoComplete="off"
          errorMessage={form.errors.location}
          hint="选填。方便家人快速找到这盆植物。"
          label="摆放位置"
          maxLength={PLANT_LOCATION_MAX_LENGTH}
          onChange={(event) => form.setFieldValue("location", event.target.value)}
          placeholder="它放在哪里？"
          value={form.values.location}
        />
      )}
      <PlantImageField
        onChange={form.setImageValue}
        value={form.values.image}
      />
      {/* 隐藏的提交按钮：测试兼容 + 键盘 Enter 提交。
          页面级保存动作由 ScreenNav 右侧按钮驱动。 */}
      <button
        disabled={form.isSubmitting}
        type="submit"
        style={hiddenSubmitStyle}
      >
        {form.isSubmitting ? "保存中..." : submitLabel}
      </button>
    </form>
  );
}

interface TextAreaFieldProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "children"> {
  errorMessage?: string;
  hint?: React.ReactNode;
  label: string;
}

function TextAreaField({
  errorMessage,
  hint,
  id,
  label,
  maxLength,
  style,
  value,
  ...props
}: TextAreaFieldProps) {
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, "-");
  const currentLength = typeof value === "string" ? value.length : 0;
  const hasCounter = typeof maxLength === "number";
  const isNearLimit = hasCounter && currentLength >= maxLength * 0.9;
  const counterId = hasCounter ? `${fieldId}-counter` : undefined;

  return (
    <label htmlFor={fieldId} style={fieldWrapStyle}>
      <span style={fieldLabelStyle}>{label}</span>
      <textarea
        {...props}
        aria-describedby={counterId}
        id={fieldId}
        maxLength={maxLength}
        style={{
          ...textAreaStyle,
          ...(errorMessage ? textAreaErrorStyle : null),
          ...style,
        }}
        value={value}
      />
      <span style={hintRowStyle}>
        {hint ? <span style={hintStyle}>{hint}</span> : <span />}
        {hasCounter ? (
          <span
            id={counterId}
            style={{
              ...counterStyle,
              ...(isNearLimit ? counterNearLimitStyle : null),
            }}
          >
            {currentLength}/{maxLength}
          </span>
        ) : null}
      </span>
      <FormError message={errorMessage} />
    </label>
  );
}

/* ─── Styles ─── */

const formStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-lg)",
  padding: "var(--space-md) var(--space-md) 0",
};

const fieldWrapStyle: React.CSSProperties = {
  display: "grid",
  gap: "var(--space-xs)",
};

const fieldLabelStyle: React.CSSProperties = {
  color: "var(--color-ink)",
  fontSize: "14px",
  fontWeight: 600,
};

const textAreaStyle: React.CSSProperties = {
  minHeight: "88px",
  borderRadius: "var(--radius-input)",
  border: "1px solid var(--color-line)",
  background: "var(--color-surface)",
  color: "var(--color-ink)",
  padding: "14px",
  fontSize: "14px",
  resize: "vertical",
  fontFamily: "inherit",
};

const textAreaErrorStyle: React.CSSProperties = {
  borderColor: "var(--color-error)",
  boxShadow: "0 0 0 3px rgba(197,48,48,0.12)",
};

const hintStyle: React.CSSProperties = {
  color: "var(--color-muted)",
  fontSize: "12px",
  lineHeight: 1.5,
};

const hintRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: "12px",
};

const counterStyle: React.CSSProperties = {
  color: "var(--color-muted)",
  fontSize: "12px",
  fontVariantNumeric: "tabular-nums",
  flexShrink: 0,
  marginLeft: "auto",
};

const counterNearLimitStyle: React.CSSProperties = {
  color: "var(--color-warning)",
  fontWeight: 700,
};

const hiddenSubmitStyle: React.CSSProperties = {
  /* 视觉不可见但保留在 DOM 中：
     - 测试可通过 getByRole("button") 找到
     - 键盘用户 Enter 可触发 form submit */
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};
