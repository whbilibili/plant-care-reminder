import type { CSSProperties, ReactNode } from "react";

interface SettingRowProps {
  /** 行首图标（emoji），aria-hidden 装饰用。 */
  icon?: string;
  /** 行标签（左侧）。 */
  label: string;
  /** 行值（右侧，可点行展示当前值、只读行展示内容）。 */
  value?: ReactNode;
  /** 点击回调；提供后整行为可点项，尾部出现 chevron。 */
  onClick?: () => void;
  /** 无障碍标签，仅可点项需要。 */
  ariaLabel?: string;
}

/**
 * 通用设置行（SET2-009）：标签 — 值 — chevron 横向结构。
 * - 可点项：role="button"，尾部 chevron，键盘可聚焦。
 * - 只读项：无箭头，纯展示。
 * 多个 SettingRow 叠放时由父容器用 1px --color-line 分割。
 */
export function SettingRow({
  icon,
  label,
  value,
  onClick,
  ariaLabel,
}: SettingRowProps) {
  const isClickable = typeof onClick === "function";

  return (
    <div
      aria-label={isClickable ? (ariaLabel ?? label) : undefined}
      onClick={onClick}
      onKeyDown={
        isClickable
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      role={isClickable ? "button" : undefined}
      style={{ ...rowStyle, cursor: isClickable ? "pointer" : "default" }}
      tabIndex={isClickable ? 0 : undefined}
    >
      {icon ? (
        <span aria-hidden="true" style={iconStyle}>
          {icon}
        </span>
      ) : null}
      <span style={labelStyle}>{label}</span>
      {value !== undefined ? <span style={valueStyle}>{value}</span> : null}
      {isClickable ? (
        <span aria-hidden="true" style={chevronStyle}>
          ›
        </span>
      ) : null}
    </div>
  );
}

const rowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-sm)",
  minHeight: "52px",
};

const iconStyle: CSSProperties = {
  flex: "none",
  width: "20px",
  textAlign: "center",
  color: "var(--color-leaf-light)",
  fontSize: "18px",
  lineHeight: 1,
};

const labelStyle: CSSProperties = {
  flex: "none",
  color: "var(--color-ink)",
  fontSize: "15px",
  fontWeight: 500,
};

const valueStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  textAlign: "right",
  color: "var(--color-muted)",
  fontSize: "15px",
  fontWeight: 400,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const chevronStyle: CSSProperties = {
  flex: "none",
  color: "var(--color-muted)",
  fontSize: "20px",
  lineHeight: 1,
};
