import type { CSSProperties } from "react";

export interface SegmentedOption {
  label: string;
  value: string;
}

interface SegmentedControlProps {
  options: SegmentedOption[];
  selected: string;
  onChange: (value: string) => void;
}

/**
 * SegmentedControl — 两选项分段控制器。
 *
 * 选中指示器 200ms 滑动动画，全宽布局，复用 --color-leaf 选中态。
 * 尊重 prefers-reduced-motion（tokens.css 全局兜底）。
 */
export function SegmentedControl({ options, selected, onChange }: SegmentedControlProps) {
  const selectedIndex = options.findIndex((opt) => opt.value === selected);

  return (
    <div style={containerStyle}>
      {/* Sliding indicator */}
      <span
        aria-hidden="true"
        style={{
          ...indicatorStyle,
          width: `${100 / options.length}%`,
          transform: `translateX(${selectedIndex * 100}%)`,
        }}
      />
      {options.map((option) => {
        const isSelected = option.value === selected;
        return (
          <button
            key={option.value}
            aria-pressed={isSelected}
            onClick={() => onChange(option.value)}
            style={{
              ...buttonStyle,
              color: isSelected ? "var(--color-ink)" : "var(--color-muted)",
              fontWeight: isSelected ? 600 : 400,
            }}
            type="button"
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

const containerStyle: CSSProperties = {
  position: "relative",
  display: "flex",
  height: "40px",
  borderRadius: "var(--radius-pill)",
  background: "var(--color-mist)",
  padding: "4px",
  boxSizing: "border-box",
};

const indicatorStyle: CSSProperties = {
  position: "absolute",
  top: "4px",
  left: "4px",
  bottom: "4px",
  borderRadius: "var(--radius-pill)",
  background: "var(--color-surface)",
  boxShadow: "0 1px 4px rgba(0, 0, 0, 0.08)",
  transition: "transform 200ms ease",
  pointerEvents: "none",
};

const buttonStyle: CSSProperties = {
  flex: 1,
  position: "relative",
  zIndex: 1,
  appearance: "none",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  fontSize: "14px",
  fontFamily: "var(--font-body)",
  lineHeight: 1,
  padding: 0,
  transition: "color 200ms ease",
};
