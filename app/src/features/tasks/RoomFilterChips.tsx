import type { CSSProperties } from "react";

interface RoomFilterChipsProps {
  /** 可用的位置列表（已去重、按频率降序）。 */
  locations: string[];
  /** 当前选中的位置；null 表示"全部"。 */
  selected: string | null;
  /** 选中变更回调；null 表示选中"全部"。 */
  onChange: (location: string | null) => void;
}

/**
 * RoomFilterChips — 房间筛选标签栏。
 *
 * 横向滚动 pill chips，第一个永远是"全部"，
 * 选中态 --color-leaf 背景白色文字，支持超长文本截断。
 */
export function RoomFilterChips({ locations, selected, onChange }: RoomFilterChipsProps) {
  return (
    <div style={containerStyle}>
      <button
        onClick={() => onChange(null)}
        style={{
          ...chipStyle,
          ...(selected === null ? chipSelectedStyle : chipUnselectedStyle),
        }}
        type="button"
      >
        全部
      </button>
      {locations.map((location) => (
        <button
          key={location}
          onClick={() => onChange(location)}
          style={{
            ...chipStyle,
            ...(selected === location ? chipSelectedStyle : chipUnselectedStyle),
          }}
          type="button"
        >
          <span style={chipTextStyle}>{location}</span>
        </button>
      ))}
    </div>
  );
}

const containerStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
  overflowX: "auto",
  paddingBottom: "2px",
  /* Hide scrollbar */
  scrollbarWidth: "none",
  msOverflowStyle: "none",
};

const chipStyle: CSSProperties = {
  appearance: "none",
  border: "none",
  height: "32px",
  borderRadius: "16px",
  padding: "0 12px",
  fontSize: "13px",
  fontFamily: "var(--font-body)",
  fontWeight: 500,
  cursor: "pointer",
  whiteSpace: "nowrap",
  flexShrink: 0,
  maxWidth: "120px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "background 200ms ease, color 200ms ease",
};

const chipSelectedStyle: CSSProperties = {
  background: "var(--color-leaf)",
  color: "#ffffff",
};

const chipUnselectedStyle: CSSProperties = {
  background: "var(--color-surface-secondary, var(--color-mist))",
  color: "var(--color-ink)",
};

const chipTextStyle: CSSProperties = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};
