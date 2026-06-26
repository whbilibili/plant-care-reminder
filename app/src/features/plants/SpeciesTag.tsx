import type { CSSProperties } from "react";
import { findSpeciesById } from "../../lib/speciesMatch";
import { plantSpeciesList } from "../../data";

/** 难度标签文案映射 */
const difficultyTextMap: Record<string, string> = {
  easy: "好养",
  medium: "适中",
  hard: "进阶",
};

/** 难度标签颜色映射 */
const difficultyColorMap: Record<string, string> = {
  easy: "var(--color-success)",
  medium: "var(--color-muted)",
  hard: "var(--color-warning)",
};

interface SpeciesTagProps {
  /** 当前关联的物种 ID */
  speciesId: string;
  /** 点击 ✕ 移除关联的回调 */
  onRemove: () => void;
}

/**
 * SpeciesTag — 物种关联信息条。
 *
 * 用于编辑页展示当前关联品种，以卡片形态清晰展示品种名、难度和分类，支持移除操作。
 */
export function SpeciesTag({ speciesId, onRemove }: SpeciesTagProps) {
  const species = findSpeciesById(speciesId, plantSpeciesList);

  if (!species) return null;

  const difficultyColor = difficultyColorMap[species.difficulty] ?? "var(--color-muted)";

  return (
    <div style={rowStyle}>
      <span style={emojiStyle}>🪴</span>
      <span style={nameStyle}>{species.names[0]}</span>
      <span style={dotStyle}>·</span>
      <span style={{ ...difficultyPillStyle, color: difficultyColor }}>
        {difficultyTextMap[species.difficulty] ?? species.difficulty}
      </span>
      <span style={dotStyle}>·</span>
      <span style={categoryStyle}>{species.category}</span>
      <button
        type="button"
        style={removeBtnStyle}
        onClick={onRemove}
        aria-label="取消关联品种"
      >
        ✕
      </button>
    </div>
  );
}

/* ─── Styles ─── */

const rowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
};

const emojiStyle: CSSProperties = {
  fontSize: "14px",
  flexShrink: 0,
};

const nameStyle: CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
  color: "var(--color-leaf)",
};

const dotStyle: CSSProperties = {
  fontSize: "10px",
  color: "var(--color-line)",
};

const difficultyPillStyle: CSSProperties = {
  fontSize: "11px",
  fontWeight: 500,
  flexShrink: 0,
};

const categoryStyle: CSSProperties = {
  fontSize: "11px",
  color: "var(--color-muted)",
};

const removeBtnStyle: CSSProperties = {
  appearance: "none",
  border: "none",
  background: "transparent",
  fontSize: "11px",
  color: "var(--color-muted)",
  cursor: "pointer",
  padding: "2px 6px",
  marginLeft: "auto",
  flexShrink: 0,
  borderRadius: "var(--radius-pill)",
  transition: "color 150ms ease",
};
