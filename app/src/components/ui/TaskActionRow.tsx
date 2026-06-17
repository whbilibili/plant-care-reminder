import type { CSSProperties, ReactNode } from "react";

interface TaskActionRowProps {
  /** 左侧图标（任务类型图标或植物缩略图）。 */
  icon?: ReactNode;
  /** 主标签（任务名或植物名）。 */
  label: string;
  /** 次要信息（周期/到期文案）。 */
  meta?: string;
  /** 右侧状态文案。 */
  statusText?: string;
  /** 右侧动作按钮。 */
  action?: ReactNode;
  /** 行点击回调（用于导航到详情）。 */
  onClick?: () => void;
  /** 左侧色条颜色（逾期时显示）。 */
  accentColor?: string;
}

/**
 * TaskActionRow — 任务操作行。
 *
 * 用于待办页、详情页需要处理区、计划列表。
 * 左侧图标 + 中间任务名/周期 + 右侧状态/完成按钮。
 */
export function TaskActionRow({
  icon,
  label,
  meta,
  statusText,
  action,
  onClick,
  accentColor,
}: TaskActionRowProps) {
  const isClickable = !!onClick;

  return (
    <div
      onClick={onClick}
      role={isClickable ? "button" : undefined}
      style={{
        ...rowStyle,
        cursor: isClickable ? "pointer" : "default",
      }}
      tabIndex={isClickable ? 0 : undefined}
    >
      {accentColor ? (
        <div
          style={{
            ...accentBarStyle,
            background: accentColor,
          }}
        />
      ) : null}

      {icon ? <div style={iconSlotStyle}>{icon}</div> : null}

      <div style={contentStyle}>
        <span style={labelStyle}>{label}</span>
      </div>

      <div style={rightStyle}>
        {meta ? <span style={metaStyle}>{meta}</span> : null}
        {statusText ? <span style={statusTextStyle}>{statusText}</span> : null}
        {action ?? null}
      </div>
    </div>
  );
}

const rowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-sm)",
  padding: "var(--space-md)",
  minHeight: "56px",
  position: "relative",
};

const accentBarStyle: CSSProperties = {
  position: "absolute",
  left: 0,
  top: "var(--space-sm)",
  bottom: "var(--space-sm)",
  width: "3px",
  borderRadius: "2px",
};

const iconSlotStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  width: "32px",
  height: "32px",
};

const contentStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  flex: 1,
  minWidth: 0,
};

const labelStyle: CSSProperties = {
  fontSize: "15px",
  fontWeight: 600,
  color: "var(--color-ink)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const metaStyle: CSSProperties = {
  fontSize: "13px",
  color: "var(--color-muted)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const rightStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-sm)",
  flexShrink: 0,
};

const statusTextStyle: CSSProperties = {
  fontSize: "13px",
  color: "var(--color-muted)",
  whiteSpace: "nowrap",
};
