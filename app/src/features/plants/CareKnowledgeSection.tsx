import { useState } from "react";
import type { CSSProperties } from "react";
import { ChevronDown } from "lucide-react";
import { Icon } from "../../components/ui/Icon";
import { CareKnowledgeBlock } from "./CareKnowledgeBlock";
import { findSpeciesById } from "../../lib/speciesMatch";
import { plantSpeciesList } from "../../data";
import type { PlantSpecies } from "../../data/plant-species.types";

/** 光照等级中文映射 */
const lightLevelMap: Record<string, string> = {
  low: "耐阴",
  medium: "散射光",
  bright: "明亮光",
  direct: "直射光",
};

interface CareKnowledgeSectionProps {
  speciesId: string | null | undefined;
}

/**
 * CareKnowledgeSection — 植物详情页养护指南折叠板块。
 *
 * 根据 speciesId 查找物种知识库数据，展示浇水/光照/施肥/季节/常见问题信息。
 * 默认折叠，点击展开/收起。
 * 无 speciesId 或找不到数据时展示占位提示（不可折叠）。
 */
export function CareKnowledgeSection({ speciesId }: CareKnowledgeSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const species = findSpeciesById(speciesId, plantSpeciesList);

  // 无关联 → 占位 fallback
  if (!species) {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>
          <span style={headerLeftStyle}>
            <span style={headerEmojiStyle}>🌱</span>
            <span style={headerTitleStyle}>养护指南</span>
          </span>
        </div>
        <div style={fallbackContentStyle}>
          <p style={fallbackMainStyle}>暂无该品种的养护指南</p>
          <p style={fallbackSubStyle}>编辑植物资料时可关联品种，获取养护建议</p>
        </div>
      </div>
    );
  }

  const seasonData = getCurrentSeasonData(species);

  return (
    <div
      style={containerStyle}
      role="region"
      aria-label={`${species.names[0]}养护指南`}
    >
      {/* Header — clickable */}
      <button
        type="button"
        style={headerButtonStyle}
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
        aria-controls="care-knowledge-content"
      >
        <span style={headerLeftStyle}>
          <span style={headerEmojiStyle}>🌱</span>
          <span style={headerTitleStyle}>养护指南 · {species.names[0]}</span>
        </span>
        <Icon
          icon={ChevronDown}
          size={14}
          style={{
            color: "var(--color-muted)",
            transform: isExpanded ? "rotate(180deg)" : undefined,
            transition: "transform 200ms ease",
          }}
        />
      </button>

      {/* Content — collapsible via grid-template-rows */}
      <div
        id="care-knowledge-content"
        style={{
          display: "grid",
          gridTemplateRows: isExpanded ? "1fr" : "0fr",
          transition: isExpanded
            ? "grid-template-rows 300ms ease-out"
            : "grid-template-rows 200ms ease-in",
        }}
      >
        <div style={contentOverflowStyle}>
          {/* Separator */}
          <div style={separatorStyle} />

          <div style={blocksContainerStyle}>
            {/* 浇水 */}
            <CareKnowledgeBlock
              emoji="💧"
              label="浇水"
              content={`建议每 ${species.care.watering.intervalRange[0]}~${species.care.watering.intervalRange[1]} 天浇一次，${species.care.watering.tip}`}
              index={0}
            />

            {/* 光照 */}
            <CareKnowledgeBlock
              emoji="☀️"
              label="光照"
              content={`${lightLevelMap[species.care.light.level] ?? species.care.light.level}。${species.care.light.tip}`}
              index={1}
            />

            {/* 施肥 */}
            <CareKnowledgeBlock
              emoji="🧪"
              label="施肥"
              content={buildFertilizingContent(species)}
              index={2}
            />

            {/* 季节 */}
            <CareKnowledgeBlock
              emoji={seasonData.emoji}
              label={seasonData.label}
              content={seasonData.content}
              highlighted
              index={3}
            />

            {/* 常见问题 */}
            {species.commonIssues.length > 0 && (
              <CareKnowledgeBlock
                emoji="⚠️"
                label="常见问题"
                content={species.commonIssues.map((issue) => ` · ${issue}`).join("\n")}
                index={4}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Helpers ─── */

interface SeasonData {
  emoji: string;
  label: string;
  content: string;
}

function getCurrentSeasonData(species: PlantSpecies): SeasonData {
  const month = new Date().getMonth() + 1; // 1-12
  // 3-5=春, 6-8=夏 → springSummer; 9-11=秋, 12/1/2=冬 → autumnWinter
  const isSpSu = month >= 3 && month <= 8;

  if (isSpSu) {
    return {
      emoji: "🍂",
      label: month <= 5 ? "春季养护" : "夏季养护",
      content: species.seasonalNotes.springSummer,
    };
  }

  return {
    emoji: "❄️",
    label: month >= 9 && month <= 11 ? "秋季养护" : "冬季养护",
    content: species.seasonalNotes.autumnWinter,
  };
}

function buildFertilizingContent(species: PlantSpecies): string {
  const range = species.care.fertilizing.intervalRange;
  let text = `建议每 ${range[0]}~${range[1]} 天施一次，${species.care.fertilizing.tip}`;
  if (species.care.fertilizing.seasonalNote) {
    text += `。${species.care.fertilizing.seasonalNote}`;
  }
  return text;
}

/* ─── Styles ─── */

const containerStyle: CSSProperties = {
  background: "var(--color-surface)",
  borderRadius: "var(--radius-card)",
  border: "1px solid var(--color-line)",
  overflow: "hidden",
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 var(--space-md)",
  height: "48px",
};

const headerButtonStyle: CSSProperties = {
  appearance: "none",
  border: "none",
  background: "transparent",
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 var(--space-md)",
  height: "48px",
  cursor: "pointer",
  transition: "background-color 150ms ease",
};

const headerLeftStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-xs)",
};

const headerEmojiStyle: CSSProperties = {
  fontSize: "16px",
};

const headerTitleStyle: CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
  color: "var(--color-leaf-light)",
};

const contentOverflowStyle: CSSProperties = {
  overflow: "hidden",
};

const separatorStyle: CSSProperties = {
  height: "1px",
  background: "var(--color-line)",
  margin: "0 var(--space-md)",
};

const blocksContainerStyle: CSSProperties = {
  padding: "var(--space-sm) var(--space-md) var(--space-md)",
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-sm)",
};

const fallbackContentStyle: CSSProperties = {
  padding: "var(--space-md)",
  textAlign: "center",
};

const fallbackMainStyle: CSSProperties = {
  fontSize: "14px",
  fontWeight: 400,
  color: "var(--color-muted)",
  margin: 0,
};

const fallbackSubStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 400,
  color: "var(--color-muted)",
  margin: "var(--space-xs) 0 0 0",
};
