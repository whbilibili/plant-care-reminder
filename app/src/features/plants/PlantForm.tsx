import { FormError } from "../../components/ui/FormError";
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
 * PlantForm — 精致表单布局。
 *
 * 字段分组卡片化 + 左侧绿色竖线 label + focus 态增强 + 入场动画。
 */
export function PlantForm({ form, submitLabel, locationSuggestions }: PlantFormProps) {
  return (
    <form noValidate style={formStyle} onSubmit={form.handleSubmit}>
      {/* 第一组：基本信息 */}
      <div style={cardGroupStyle} className="plant-form-card-stagger">
        <div style={fieldWrapStyle}>
          <span style={fieldLabelWithBarStyle}>植物名称</span>
          <input
            autoComplete="off"
            maxLength={PLANT_NAME_MAX_LENGTH}
            onChange={(event) => form.setFieldValue("name", event.target.value)}
            placeholder="给它起个名字"
            required
            value={form.values.name}
            className="form-input-enhanced"
            style={{
              ...textInputStyle,
              ...(form.errors.name ? textInputErrorStyle : null),
            }}
          />
          <span style={hintRowStyle}>
            <span style={hintStyle}>必填。建议使用家里平时对这盆植物的叫法。</span>
          </span>
          <FormError message={form.errors.name} />
        </div>

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
      </div>

      {/* 第二组：养护备注 */}
      <div style={cardGroupStyle} className="plant-form-card-stagger">
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
      </div>

      {/* 第三组：位置 */}
      <div style={cardGroupStyle} className="plant-form-card-stagger">
        {locationSuggestions && locationSuggestions.length > 0 ? (
          <LocationAutocomplete
            suggestions={locationSuggestions}
            value={form.values.location}
            onChange={(val) => form.setFieldValue("location", val)}
            errorMessage={form.errors.location}
          />
        ) : (
          <div style={fieldWrapStyle}>
            <span style={fieldLabelWithBarStyle}>摆放位置</span>
            <input
              autoComplete="off"
              maxLength={PLANT_LOCATION_MAX_LENGTH}
              onChange={(event) => form.setFieldValue("location", event.target.value)}
              placeholder="它放在哪里？"
              value={form.values.location}
              className="form-input-enhanced"
              style={{
                ...textInputStyle,
                ...(form.errors.location ? textInputErrorStyle : null),
              }}
            />
            <span style={hintRowStyle}>
              <span style={hintStyle}>选填。方便家人快速找到这盆植物。</span>
            </span>
            <FormError message={form.errors.location} />
          </div>
        )}
      </div>

      {/* 第四组：封面图 */}
      <div style={cardGroupStyle} className="plant-form-card-stagger">
        <div style={fieldWrapStyle}>
          <span style={fieldLabelWithBarStyle}>封面图片</span>
          <PlantImageField
            onChange={form.setImageValue}
            value={form.values.image}
          />
        </div>
      </div>

      {/* 隐藏的提交按钮：测试兼容 + 键盘 Enter 提交。
          页面级保存动作由 ScreenNav 右侧按钮驱动。 */}
      <button
        disabled={form.isSubmitting}
        type="submit"
        style={hiddenSubmitStyle}
      >
        {form.isSubmitting ? "保存中..." : submitLabel}
      </button>

      {/* 入场动画 + focus 态 CSS */}
      <style>{plantFormCSS}</style>
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
      <span style={fieldLabelWithBarStyle}>{label}</span>
      <textarea
        {...props}
        aria-describedby={counterId}
        id={fieldId}
        maxLength={maxLength}
        className="form-input-enhanced"
        style={{
          ...textAreaStyle,
          ...(errorMessage ? textInputErrorStyle : null),
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

/* ─── Enhanced CSS ─── */

const plantFormCSS = `
  .form-input-enhanced:focus {
    outline: none;
    border-color: var(--color-leaf) !important;
    box-shadow: 0 0 0 3px rgba(31, 71, 61, 0.10), 0 1px 3px rgba(31, 71, 61, 0.06) !important;
  }

  @keyframes plantFormCardStagger {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .plant-form-card-stagger {
    animation: plantFormCardStagger 0.4s ease-out both;
  }
  .plant-form-card-stagger:nth-child(1) { animation-delay: 0.05s; }
  .plant-form-card-stagger:nth-child(2) { animation-delay: 0.12s; }
  .plant-form-card-stagger:nth-child(3) { animation-delay: 0.19s; }
  .plant-form-card-stagger:nth-child(4) { animation-delay: 0.26s; }

  @media (prefers-reduced-motion: reduce) {
    .plant-form-card-stagger { animation: none; opacity: 1; transform: none; }
  }
`;

/* ─── Styles ─── */

const formStyle: React.CSSProperties = {
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

const fieldWrapStyle: React.CSSProperties = {
  display: "grid",
  gap: "var(--space-xs)",
};

/** label 带左侧绿色竖线 */
const fieldLabelWithBarStyle: React.CSSProperties = {
  color: "var(--color-ink)",
  fontSize: "14px",
  fontWeight: 600,
  paddingLeft: "10px",
  borderLeft: "3px solid var(--color-leaf)",
};

const textInputStyle: React.CSSProperties = {
  minHeight: "48px",
  borderRadius: "var(--radius-input)",
  border: "1px solid var(--color-line)",
  background: "var(--color-paper)",
  color: "var(--color-ink)",
  padding: "0 14px",
  fontSize: "14px",
  fontFamily: "inherit",
  transition: "border-color 0.2s, box-shadow 0.2s",
};

const textAreaStyle: React.CSSProperties = {
  minHeight: "88px",
  borderRadius: "var(--radius-input)",
  border: "1px solid var(--color-line)",
  background: "var(--color-paper)",
  color: "var(--color-ink)",
  padding: "14px",
  fontSize: "14px",
  resize: "vertical",
  fontFamily: "inherit",
  transition: "border-color 0.2s, box-shadow 0.2s",
};

const textInputErrorStyle: React.CSSProperties = {
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
