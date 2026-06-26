import { useCallback, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { PlantSpecies } from "../../data/plant-species.types";

/** 光照等级中文映射 */
const lightLevelMap: Record<string, string> = {
  low: "耐阴",
  medium: "散射光",
  bright: "明亮光",
  direct: "直射光",
};

/** 难度标签映射 */
const difficultyLabelMap: Record<string, string> = {
  easy: "好养",
  medium: "适中",
  hard: "进阶",
};

/** 难度标签颜色映射 */
const difficultyColorMap: Record<string, { bg: string; text: string }> = {
  easy: { bg: "rgba(47, 133, 90, 0.12)", text: "var(--color-success)" },
  medium: { bg: "rgba(99, 123, 113, 0.12)", text: "var(--color-muted)" },
  hard: { bg: "rgba(221, 107, 32, 0.12)", text: "var(--color-warning)" },
};

export interface RecommendApplyPayload {
  speciesId: string;
  wateringInterval: number;
  fertilizingInterval: number;
  /** 推荐的植物简介文案 */
  description: string;
  /** 推荐的养护备注文案 */
  note: string;
}

interface SpeciesRecommendCardProps {
  species: PlantSpecies;
  /** 点击"应用推荐"时回调 */
  onApply: (payload: RecommendApplyPayload) => void;
  /** 点击"仅供参考，不应用"时回调 */
  onDismiss: () => void;
}

/**
 * SpeciesRecommendCard — 物种养护推荐卡片。
 *
 * 匹配到物种后展示推荐养护参数，用户可选择应用或跳过。
 * 应用时计算 interval 中值：Math.ceil((min + max) / 2)。
 */
export function SpeciesRecommendCard({
  species,
  onApply,
  onDismiss,
}: SpeciesRecommendCardProps) {
  const [isApplying, setIsApplying] = useState(false);
  const [exitState, setExitState] = useState<"none" | "apply" | "dismiss">("none");
  const cardRef = useRef<HTMLDivElement>(null);

  const wateringMid = computeMid(species.care.watering.intervalRange);
  const fertilizingMid = computeMid(species.care.fertilizing.intervalRange);

  const handleApply = useCallback(() => {
    if (isApplying) return;
    setIsApplying(true);
    setExitState("apply");

    // 构建推荐简介：品类 + 简述 + 光照贴士
    const descParts = [species.category, species.briefDescription, species.care.light.tip].filter(Boolean);
    const description = descParts.join("，") + "。";

    // 构建养护备注：常见问题 + 当季要点
    const noteParts: string[] = [];
    if (species.commonIssues.length > 0) {
      noteParts.push(`常见问题：${species.commonIssues[0]}`);
    }
    const currentSeason = getCurrentSeason();
    const seasonalTip = currentSeason === "springSummer"
      ? species.seasonalNotes.springSummer
      : species.seasonalNotes.autumnWinter;
    if (seasonalTip) {
      noteParts.push(`当季要点：${seasonalTip}`);
    }
    const note = noteParts.join("。") + (noteParts.length > 0 ? "。" : "");

    // 等待退出动画完成后触发回调
    setTimeout(() => {
      onApply({
        speciesId: species.id,
        wateringInterval: wateringMid,
        fertilizingInterval: fertilizingMid,
        description,
        note,
      });
    }, 250);
  }, [isApplying, onApply, species, wateringMid, fertilizingMid]);

  const handleDismiss = useCallback(() => {
    setExitState("dismiss");
    setTimeout(() => {
      onDismiss();
    }, 200);
  }, [onDismiss]);

  const difficultyColors = difficultyColorMap[species.difficulty];
  const exitAnimation =
    exitState === "apply"
      ? "speciesCardExitApply 250ms ease-in forwards"
      : exitState === "dismiss"
        ? "speciesCardExitDismiss 200ms ease-in forwards"
        : undefined;

  return (
    <div
      ref={cardRef}
      role="complementary"
      aria-label="品种养护推荐"
      style={{
        ...containerStyle,
        animation: exitAnimation ?? "speciesCardEnter 300ms ease-out",
      }}
    >
      {/* Header */}
      <div style={headerStyle}>
        <span style={headerEmojiStyle}>🌿</span>
        <span style={headerNameStyle}>{species.names[0]}</span>
        <span
          style={{
            ...difficultyPillStyle,
            background: difficultyColors.bg,
            color: difficultyColors.text,
          }}
        >
          {difficultyLabelMap[species.difficulty]}
        </span>
        <button
          type="button"
          style={applyButtonStyle}
          disabled={isApplying}
          onClick={handleApply}
          aria-label={`应用${species.names[0]}的推荐养护参数`}
        >
          应用推荐
        </button>
      </div>

      {/* Care Grid */}
      <div style={gridStyle}>
        {/* 浇水 */}
        <div style={gridCellStyle}>
          <span style={cellEmojiStyle}>💧</span>
          <span style={cellLabelStyle}>浇水</span>
          <span style={cellValueStyle}>
            {formatIntervalRange(species.care.watering.intervalRange)}
          </span>
          <span style={cellTipStyle}>{species.care.watering.tip}</span>
        </div>

        {/* 光照 */}
        <div style={gridCellStyle}>
          <span style={cellEmojiStyle}>☀️</span>
          <span style={cellLabelStyle}>光照</span>
          <span style={cellValueStyle}>
            {lightLevelMap[species.care.light.level] ?? species.care.light.level}
          </span>
          <span style={cellTipStyle}>{species.care.light.tip}</span>
        </div>

        {/* 施肥 */}
        <div style={gridCellStyle}>
          <span style={cellEmojiStyle}>🧪</span>
          <span style={cellLabelStyle}>施肥</span>
          <span style={cellValueStyle}>
            {formatIntervalRange(species.care.fertilizing.intervalRange)}
          </span>
          <span style={cellTipStyle}>{species.care.fertilizing.tip}</span>
        </div>
      </div>

      {/* Dismiss Link */}
      <div style={dismissWrapperStyle}>
        <button type="button" style={dismissLinkStyle} onClick={handleDismiss}>
          仅供参考，不应用 →
        </button>
      </div>
    </div>
  );
}

/* ─── Helpers ─── */

function computeMid(range: [number, number]): number {
  return Math.ceil((range[0] + range[1]) / 2);
}

/** 根据当前月份判断季节：3~8 月为春夏，9~2 月为秋冬 */
function getCurrentSeason(): "springSummer" | "autumnWinter" {
  const month = new Date().getMonth() + 1; // 1-12
  return month >= 3 && month <= 8 ? "springSummer" : "autumnWinter";
}

function formatIntervalRange(range: [number, number]): string {
  if (range[0] === range[1]) return `${range[0]}天`;
  return `${range[0]}~${range[1]}天`;
}

/* ─── Styles ─── */

const containerStyle: CSSProperties = {
  background: "var(--color-mist)",
  borderRadius: "var(--radius-card)",
  border: "1px solid var(--color-line)",
  padding: "var(--space-md)",
  marginTop: "var(--space-sm)",
  marginBottom: "var(--space-md)",
  overflow: "hidden",
};

const headerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  gap: "var(--space-sm)",
};

const headerEmojiStyle: CSSProperties = {
  fontSize: "18px",
  flexShrink: 0,
};

const headerNameStyle: CSSProperties = {
  fontFamily: "var(--font-heading)",
  fontSize: "16px",
  fontWeight: 700,
  color: "var(--color-ink)",
};

const difficultyPillStyle: CSSProperties = {
  borderRadius: "var(--radius-pill)",
  padding: "3px 10px",
  fontSize: "11px",
  fontWeight: 600,
  flexShrink: 0,
};

const applyButtonStyle: CSSProperties = {
  marginLeft: "auto",
  background: "var(--color-leaf)",
  color: "#ffffff",
  fontSize: "13px",
  fontWeight: 600,
  padding: "8px 16px",
  borderRadius: "var(--radius-button)",
  border: "none",
  cursor: "pointer",
  minHeight: "36px",
  transition: "background-color 150ms ease, transform 150ms ease, opacity 150ms ease",
  flexShrink: 0,
};

const gridStyle: CSSProperties = {
  display: "flex",
  flexDirection: "row",
  gap: "var(--space-sm)",
  marginTop: "var(--space-md)",
  flexWrap: "wrap",
};

const gridCellStyle: CSSProperties = {
  flex: "1 1 0",
  minWidth: 0,
  background: "var(--color-surface)",
  borderRadius: "var(--radius-button)",
  padding: "var(--space-sm) var(--space-md)",
  display: "flex",
  flexDirection: "column",
  gap: "2px",
};

const cellEmojiStyle: CSSProperties = {
  fontSize: "16px",
};

const cellLabelStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 600,
  color: "var(--color-ink)",
};

const cellValueStyle: CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
  color: "var(--color-leaf)",
};

const cellTipStyle: CSSProperties = {
  fontSize: "11px",
  fontWeight: 400,
  color: "var(--color-muted)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const dismissWrapperStyle: CSSProperties = {
  textAlign: "right",
  marginTop: "var(--space-sm)",
};

const dismissLinkStyle: CSSProperties = {
  appearance: "none",
  border: "none",
  background: "transparent",
  fontSize: "12px",
  fontWeight: 400,
  color: "var(--color-muted)",
  cursor: "pointer",
  padding: 0,
  transition: "color 150ms ease",
};
