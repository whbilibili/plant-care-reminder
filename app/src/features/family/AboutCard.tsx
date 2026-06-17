import type { CSSProperties } from "react";

import { SettingCardHeader } from "./SettingCardHeader";

/**
 * 关于卡（SET2-011）。统一卡片头部（ℹ️ chip + eyebrow「关于」）+ 一句话定位正文，
 * 末尾版本行使用等宽字体；版本号来自构建注入的 __APP_VERSION__，不在源码中硬编码。
 */
export function AboutCard() {
  return (
    <section style={cardStyle}>
      <SettingCardHeader eyebrow="关于" icon="ℹ️" title="关于本应用" />
      <p style={bodyStyle}>家庭内部植物养护提醒工具，帮你和家人一起照顾好每一盆植物。</p>
      <p style={versionStyle}>版本 v{__APP_VERSION__}</p>
    </section>
  );
}

const cardStyle: CSSProperties = {
  borderRadius: "var(--radius-card)",
  padding: "var(--space-md)",
  background: "var(--color-surface)",
  border: "1px solid var(--color-line)",
  boxShadow: "var(--shadow-card)",
  display: "grid",
  gap: "var(--space-sm)",
};

const bodyStyle: CSSProperties = {
  margin: 0,
  color: "var(--color-muted)",
  fontSize: "14px",
  lineHeight: 1.5,
};

const versionStyle: CSSProperties = {
  margin: 0,
  color: "var(--color-muted)",
  fontFamily: "var(--font-mono)",
  fontSize: "12px",
  lineHeight: 1.4,
};
