import type { CSSProperties } from "react";

interface CareKnowledgeBlockProps {
  emoji: string;
  label: string;
  content: string;
  /** 是否使用左边框高亮样式（用于季节性板块） */
  highlighted?: boolean;
  /** 交错入场延迟索引 */
  index?: number;
}

/**
 * CareKnowledgeBlock — 单个知识条目块。
 *
 * 用于展示浇水/光照/施肥/季节/问题等信息的独立卡片。
 */
export function CareKnowledgeBlock({
  emoji,
  label,
  content,
  highlighted = false,
  index = 0,
}: CareKnowledgeBlockProps) {
  const animDelay = `calc(80ms + ${index} * 60ms)`;

  return (
    <div
      style={{
        ...blockStyle,
        ...(highlighted ? highlightedStyle : undefined),
        animation: `taskFadeSlideIn 360ms ease both`,
        animationDelay: animDelay,
      }}
    >
      <div style={titleRowStyle}>
        <span style={emojiStyle}>{emoji}</span>
        <span style={labelStyle}>{label}</span>
      </div>
      <p style={contentStyle}>{content}</p>
    </div>
  );
}

/* ─── Styles ─── */

const blockStyle: CSSProperties = {
  background: "var(--color-mist)",
  borderRadius: "var(--radius-button)",
  padding: "var(--space-sm) var(--space-md)",
};

const highlightedStyle: CSSProperties = {
  borderLeft: "3px solid var(--color-leaf-light)",
  paddingLeft: "calc(var(--space-md) + 2px)",
};

const titleRowStyle: CSSProperties = {
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  gap: "var(--space-xs)",
};

const emojiStyle: CSSProperties = {
  fontSize: "16px",
  flexShrink: 0,
};

const labelStyle: CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
  color: "var(--color-ink)",
};

const contentStyle: CSSProperties = {
  fontSize: "13px",
  fontWeight: 400,
  color: "var(--color-muted)",
  lineHeight: 1.6,
  marginTop: "4px",
  margin: "4px 0 0 0",
};
