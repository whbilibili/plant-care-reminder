import type { CSSProperties, ReactNode } from "react";

interface SettingsGroupProps {
  /** 分组小标题，语义为 <h2>，保持页面标题层级连续（h1 → h2 → h3）。 */
  title: string;
  children: ReactNode;
}

/**
 * 设置页分组容器（SET2-006）。承载「个人 / 家庭 / 通知与应用」三组之一：
 * 顶部一个 <h2> 分组小标题，下方堆叠该组卡片。组内卡片间距 --space-md，
 * 组与组之间的间距由父级 grid 的 --space-lg 控制。
 */
export function SettingsGroup({ title, children }: SettingsGroupProps) {
  return (
    <section style={groupStyle}>
      <h2 style={groupTitleStyle}>{title}</h2>
      <div style={groupBodyStyle}>{children}</div>
    </section>
  );
}

const groupStyle: CSSProperties = {
  display: "grid",
  // 分组小标题贴紧首卡。
  gap: "var(--space-sm)",
};

const groupTitleStyle: CSSProperties = {
  margin: 0,
  color: "var(--color-leaf-light)",
  fontFamily: "var(--font-heading)",
  fontSize: "13px",
  fontWeight: 700,
  lineHeight: 1.3,
  letterSpacing: "0.06em",
};

const groupBodyStyle: CSSProperties = {
  display: "grid",
  // 组内卡片间距。
  gap: "var(--space-md)",
};
