import type { CSSProperties } from "react";
import { Pencil } from "lucide-react";

import { Icon } from "../../components/ui/Icon";

interface FamilyHeroCardProps {
  familyName: string;
  memberCount: number;
  /**
   * 管理员改名入口回调（SET3-002）。传入时家庭名行可点击进入编辑 sheet；
   * 普通成员视角不传，家庭名渲染为只读文本（不渲染入口、不置灰）。
   */
  onRename?: () => void;
}

/**
 * 家庭头图卡（SET2-007 / SET3-002）。全页唯一的强色块情感锚点：品牌绿渐变背景 +
 * 右上角半透明 🌿 装饰 + 白底半透明 chip + 家庭名（卡内信息，非 h1）+ 副文案。
 * 副文案随人数切换：1 人引导发邀请码，≥2 人传达「一起照顾」的协作感。
 * 管理员视角（onRename 存在）家庭名行可点击进入改名 sheet，尾部带编辑指示；
 * 普通成员视角为纯只读文本。无论哪种视角，家庭名文本均原样渲染以兼容 getByText。
 */
export function FamilyHeroCard({
  familyName,
  memberCount,
  onRename,
}: FamilyHeroCardProps) {
  const subtext =
    memberCount <= 1
      ? "还没有家人加入，把邀请码发出去吧"
      : `${memberCount} 位家人 · 一起照顾这片植物`;

  return (
    <section style={heroStyle}>
      <span aria-hidden="true" style={leafDecorationStyle}>
        🌿
      </span>
      <span style={chipStyle}>家庭</span>
      {onRename ? (
        <button
          aria-label="修改家庭名"
          onClick={onRename}
          style={familyNameButtonStyle}
          type="button"
        >
          <span style={familyNameStyle}>{familyName}</span>
          <span aria-hidden="true" style={editIndicatorStyle}>
            <Icon icon={Pencil} size={14} />
          </span>
        </button>
      ) : (
        <p style={familyNameStyle}>{familyName}</p>
      )}
      <p style={subtextStyle}>{subtext}</p>
    </section>
  );
}

const heroStyle: CSSProperties = {
  position: "relative",
  overflow: "hidden",
  borderRadius: "var(--radius-card)",
  padding: "var(--space-md)",
  background: "linear-gradient(135deg, var(--color-leaf), var(--color-leaf-light))",
  display: "grid",
  gap: "var(--space-xs)",
  boxShadow: "var(--shadow-card)",
};

const leafDecorationStyle: CSSProperties = {
  position: "absolute",
  top: "-6px",
  right: "8px",
  fontSize: "48px",
  lineHeight: 1,
  opacity: 0.18,
  pointerEvents: "none",
};

const chipStyle: CSSProperties = {
  justifySelf: "start",
  padding: "2px var(--space-sm)",
  borderRadius: "var(--radius-pill)",
  /* 纸白 18% 透明，用于品牌绿底上的半透明 chip */
  background: "color-mix(in srgb, var(--color-paper) 18%, transparent)",
  color: "var(--color-paper)",
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.08em",
};

const familyNameStyle: CSSProperties = {
  margin: "var(--space-xs) 0 0",
  position: "relative",
  color: "var(--color-paper)",
  fontFamily: "var(--font-heading)",
  fontSize: "22px",
  fontWeight: 700,
  lineHeight: 1.2,
};

const familyNameButtonStyle: CSSProperties = {
  appearance: "none",
  position: "relative",
  display: "inline-flex",
  alignItems: "center",
  gap: "var(--space-xs)",
  justifySelf: "start",
  padding: 0,
  border: "none",
  background: "transparent",
  color: "var(--color-paper)",
  cursor: "pointer",
  textAlign: "left",
};

const editIndicatorStyle: CSSProperties = {
  /* 纸白 75% 透明的轻量编辑指示，提示该行可点击 */
  color: "color-mix(in srgb, var(--color-paper) 75%, transparent)",
  fontSize: "14px",
  lineHeight: 1,
  display: "inline-flex",
  alignItems: "center",
};

const subtextStyle: CSSProperties = {
  margin: 0,
  position: "relative",
  /* 纸白 85% 透明，保证与品牌绿底对比度 ≥ 4.5:1 */
  color: "color-mix(in srgb, var(--color-paper) 85%, transparent)",
  fontSize: "13px",
  lineHeight: 1.5,
};
