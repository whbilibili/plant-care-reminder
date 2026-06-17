import type { CSSProperties } from "react";

interface SettingCardHeaderProps {
  /** 卡片图标 emoji，渲染在 32×32 chip 内（aria-hidden）。 */
  icon: string;
  /** 卡片小眉标，全大写式语义提示（不强制 uppercase）。 */
  eyebrow: string;
  /** 卡内主标题，语义为 <h3>，紧随分组 <h2> 之后保持层级连续。 */
  title: string;
}

/**
 * 设置卡统一头部（SET2-006）。左侧 32×32 图标 chip + 右侧 eyebrow 与 <h3> 标题，
 * 为家庭 / 邀请码 / 成员 / 通知 / 关于各卡建立一致的卡片头部语言。
 */
export function SettingCardHeader({ icon, eyebrow, title }: SettingCardHeaderProps) {
  return (
    <header style={headerStyle}>
      <span aria-hidden="true" style={iconChipStyle}>
        {icon}
      </span>
      <div style={textColumnStyle}>
        <p style={eyebrowStyle}>{eyebrow}</p>
        <h3 style={titleStyle}>{title}</h3>
      </div>
    </header>
  );
}

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-sm)",
};

const iconChipStyle: CSSProperties = {
  flexShrink: 0,
  width: "32px",
  height: "32px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "var(--radius-button)",
  background: "var(--color-mist)",
  fontSize: "18px",
  lineHeight: 1,
};

const textColumnStyle: CSSProperties = {
  display: "grid",
  gap: "2px",
  minWidth: 0,
};

const eyebrowStyle: CSSProperties = {
  margin: 0,
  color: "var(--color-leaf-light)",
  fontSize: "11px",
  fontWeight: 700,
  lineHeight: 1.3,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const titleStyle: CSSProperties = {
  margin: 0,
  color: "var(--color-ink)",
  fontFamily: "var(--font-heading)",
  fontSize: "16px",
  fontWeight: 600,
  lineHeight: 1.25,
};
