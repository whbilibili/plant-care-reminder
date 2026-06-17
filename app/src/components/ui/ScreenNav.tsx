import type { CSSProperties, ReactNode } from "react";
import { ChevronLeft } from "lucide-react";

import { Icon } from "./Icon";

interface ScreenNavProps {
  /** 居中标题。 */
  title: string;
  /** 返回操作回调。 */
  onBack: () => void;
  /** 右侧动作区（如保存按钮或编辑图标）。 */
  rightAction?: ReactNode;
}

/**
 * ScreenNav — 轻量原生导航行。
 *
 * 替代 DetailNavBar / FormNavBar 的突兀白条贴片感。
 * 背景透明或纸面色，不画全宽白色卡片。
 * 高度 48-56px，左 44px icon-only 返回，中标题省略，右可选。
 */
export function ScreenNav({ title, onBack, rightAction }: ScreenNavProps) {
  return (
    <nav aria-label="页面导航" style={navStyle}>
      <button
        aria-label="返回"
        onClick={onBack}
        style={backButtonStyle}
        type="button"
      >
        <Icon icon={ChevronLeft} size={22} strokeWidth={2} />
      </button>

      <span style={titleStyle}>{title}</span>

      {rightAction ? (
        <div style={rightSlotStyle}>{rightAction}</div>
      ) : (
        <span style={spacerStyle} />
      )}
    </nav>
  );
}

const navStyle: CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 40,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  height: "52px",
  padding: "0 var(--space-md)",
  background: "var(--color-paper)",
};

const backButtonStyle: CSSProperties = {
  appearance: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "44px",
  height: "44px",
  padding: 0,
  border: "none",
  borderRadius: "var(--radius-button)",
  background: "transparent",
  color: "var(--color-leaf)",
  cursor: "pointer",
  flexShrink: 0,
  /* 负 margin 补偿按钮内边距，让箭头图标视觉左对齐下方内容 */
  marginLeft: "-10px",
};

const titleStyle: CSSProperties = {
  position: "absolute",
  left: "50%",
  transform: "translateX(-50%)",
  maxWidth: "55%",
  fontFamily: "var(--font-body)",
  fontSize: "16px",
  fontWeight: 600,
  color: "var(--color-ink)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const rightSlotStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  flexShrink: 0,
};

const spacerStyle: CSSProperties = {
  width: "44px",
  height: "44px",
  flexShrink: 0,
};
