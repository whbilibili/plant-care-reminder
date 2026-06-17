import type { CSSProperties } from "react";

interface ToggleSwitchProps {
  /** 当前开关状态。 */
  checked: boolean;
  /** 状态变化回调。 */
  onChange: (checked: boolean) => void;
  /** 无障碍标签。 */
  "aria-label"?: string;
  /** 是否禁用。 */
  disabled?: boolean;
}

/**
 * ToggleSwitch — 标准开关组件。
 *
 * 尺寸：track 48×28，thumb 22×22，间距 3px。
 * 开启态 thumb 右移 track宽 - thumb宽 - 2×padding = 48 - 22 - 6 = 20px。
 */
export function ToggleSwitch({
  checked,
  onChange,
  "aria-label": ariaLabel,
  disabled = false,
}: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{
        ...trackStyle,
        background: checked ? "var(--color-leaf)" : "var(--color-line)",
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      <span
        style={{
          ...thumbStyle,
          transform: checked ? "translateX(20px)" : "translateX(0px)",
        }}
      />
    </button>
  );
}

const trackStyle: CSSProperties = {
  appearance: "none",
  position: "relative",
  display: "inline-flex",
  alignItems: "center",
  width: "48px",
  height: "28px",
  borderRadius: "14px",
  border: "none",
  padding: "3px",
  flexShrink: 0,
  transition: "background 200ms ease",
};

const thumbStyle: CSSProperties = {
  display: "block",
  width: "22px",
  height: "22px",
  borderRadius: "50%",
  background: "#ffffff",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.15)",
  transition: "transform 200ms ease",
};
