import type { CSSProperties } from "react";
import { ChevronRight } from "lucide-react";

import { Icon } from "../../components/ui/Icon";

interface GroupHeaderProps {
  title: string;
  count: number;
  isExpanded: boolean;
  onToggle: () => void;
}

/**
 * GroupHeader — 分组头组件。
 *
 * 白色卡片包裹式容器的头部，类似养护记录展开收起样式。
 * 左侧 chevron 旋转指示展开态，中间标题 + 数量徽标。
 */
export function GroupHeader({ title, count, isExpanded, onToggle }: GroupHeaderProps) {
  return (
    <button
      aria-expanded={isExpanded}
      onClick={onToggle}
      style={containerStyle}
      type="button"
    >
      <span
        style={{
          ...arrowStyle,
          transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
        }}
      >
        <Icon icon={ChevronRight} size={16} colorVar="--color-muted" />
      </span>
      <span style={titleStyle}>{title}</span>
      <span style={countStyle}>（{count}）</span>
    </button>
  );
}

const containerStyle: CSSProperties = {
  appearance: "none",
  display: "flex",
  alignItems: "center",
  width: "100%",
  height: "44px",
  padding: "0 var(--space-md)",
  background: "transparent",
  border: "none",
  borderRadius: "0",
  cursor: "pointer",
  boxSizing: "border-box",
  gap: "8px",
};

const titleStyle: CSSProperties = {
  fontSize: "14px",
  fontWeight: 600,
  color: "var(--color-ink)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  flex: 1,
  minWidth: 0,
  textAlign: "left",
};

const countStyle: CSSProperties = {
  fontSize: "13px",
  color: "var(--color-muted)",
  flexShrink: 0,
};

const arrowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  flexShrink: 0,
  transition: "transform 200ms ease",
};
