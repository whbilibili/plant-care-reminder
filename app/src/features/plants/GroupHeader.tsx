import type { CSSProperties } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

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
 * 显示位置名称 + 数量，可折叠/展开，ChevronDown/Up 箭头，
 * 40px 高度，surface-secondary 背景。整行可点击。
 */
export function GroupHeader({ title, count, isExpanded, onToggle }: GroupHeaderProps) {
  return (
    <button
      aria-expanded={isExpanded}
      onClick={onToggle}
      style={containerStyle}
      type="button"
    >
      <span style={titleStyle}>{title}</span>
      <span style={countStyle}>（{count}）</span>
      <span style={arrowStyle}>
        <Icon icon={isExpanded ? ChevronUp : ChevronDown} size={16} colorVar="--color-muted" />
      </span>
    </button>
  );
}

const containerStyle: CSSProperties = {
  appearance: "none",
  display: "flex",
  alignItems: "center",
  width: "100%",
  height: "40px",
  padding: "0 var(--space-md)",
  background: "var(--color-surface-secondary, var(--color-mist))",
  border: "none",
  borderRadius: "var(--radius-md, 8px)",
  cursor: "pointer",
  boxSizing: "border-box",
};

const titleStyle: CSSProperties = {
  fontSize: "var(--font-body-sm, 13px)",
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
  fontSize: "var(--font-body-sm, 13px)",
  color: "var(--color-muted)",
  flexShrink: 0,
  marginLeft: "4px",
};

const arrowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  flexShrink: 0,
  marginLeft: "8px",
};
