import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { matchSpecies } from "../../lib/speciesMatch";
import { plantSpeciesList } from "../../data";
import type { PlantSpecies } from "../../data/plant-species.types";

interface SpeciesSuggestionsProps {
  /** 当前植物名称输入值 */
  query: string;
  /** 用户选中物种时回调 */
  onSelect: (species: PlantSpecies) => void;
  /** 是否已有选中物种（已选中则不显示建议） */
  hasSelection?: boolean;
  /** 输入框是否获得焦点（仅聚焦时才展示面板） */
  isFocused?: boolean;
}

/**
 * SpeciesSuggestions — 物种自动补全下拉面板。
 *
 * 当用户在名称输入框输入 ≥ 2 字符且匹配到物种时，
 * 以绝对定位浮层展示候选列表。
 *
 * 交互：ArrowUp/Down 导航、Enter 选中、Escape 关闭。
 * 无障碍：role=listbox、option、aria-selected、aria-live 播报。
 */
export function SpeciesSuggestions({
  query,
  onSelect,
  hasSelection = false,
  isFocused = false,
}: SpeciesSuggestionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 200ms 防抖
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 200);
    return () => clearTimeout(timer);
  }, [query]);

  // 执行匹配（仅在聚焦且无已选物种时匹配）
  const results = useMemo(
    () => (hasSelection || !isFocused ? [] : matchSpecies(debouncedQuery, plantSpeciesList, 3)),
    [debouncedQuery, hasSelection, isFocused],
  );

  // 结果变化时控制面板显隐
  useEffect(() => {
    if (results.length > 0 && !hasSelection) {
      setIsOpen(true);
      setActiveIndex(-1);
    } else {
      setIsOpen(false);
    }
  }, [results, hasSelection]);

  // 关闭面板（带延迟，允许点击 item）
  const scheduleClose = useCallback(() => {
    closeTimerRef.current = setTimeout(() => setIsOpen(false), 200);
  }, []);

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  // 选中
  const handleSelect = useCallback(
    (species: PlantSpecies) => {
      onSelect(species);
      setIsOpen(false);
    },
    [onSelect],
  );

  // 键盘导航
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || results.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((prev) => (prev + 1) % results.length);
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((prev) => (prev - 1 + results.length) % results.length);
          break;
        case "Enter":
          e.preventDefault();
          if (activeIndex >= 0 && activeIndex < results.length) {
            handleSelect(results[activeIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          break;
      }
    },
    [isOpen, results, activeIndex, handleSelect],
  );

  if (!isOpen || results.length === 0) {
    return null;
  }

  const panelId = "species-suggestions-panel";

  return (
    <div
      ref={panelRef}
      id={panelId}
      role="listbox"
      aria-label="物种建议"
      style={panelStyle}
      onMouseDown={cancelClose}
      onMouseUp={scheduleClose}
      onKeyDown={handleKeyDown}
    >
      {results.map((species, index) => (
        <SuggestionItem
          key={species.id}
          species={species}
          isActive={index === activeIndex}
          onSelect={handleSelect}
          index={index}
        />
      ))}
      <div aria-live="polite" aria-atomic="true" style={srOnlyStyle}>
        {results.length} 个品种建议可选
      </div>
    </div>
  );
}

/** SpeciesSuggestions 暴露的键盘事件处理器（供父组件绑定到 input） */
export { type SpeciesSuggestionsProps };

/* ─── SuggestionItem ─── */

interface SuggestionItemProps {
  species: PlantSpecies;
  isActive: boolean;
  onSelect: (species: PlantSpecies) => void;
  index: number;
}

function SuggestionItem({ species, isActive, onSelect, index }: SuggestionItemProps) {
  const difficultyLabel = difficultyMap[species.difficulty];
  const difficultyColor = difficultyColorMap[species.difficulty];

  return (
    <button
      type="button"
      role="option"
      id={`species-option-${index}`}
      aria-selected={isActive}
      style={{
        ...itemStyle,
        ...(isActive ? itemActiveStyle : undefined),
      }}
      onClick={() => onSelect(species)}
      onMouseDown={(e) => e.preventDefault()}
    >
      <span style={emojiStyle}>🪴</span>
      <span style={nameStyle}>{species.names[0]}</span>
      <span style={{ ...difficultyStyle, color: difficultyColor }}>
        {difficultyLabel}
      </span>
      <span style={separatorStyle}>·</span>
      <span style={categoryStyle}>{species.category}</span>
    </button>
  );
}

/* ─── Constants ─── */

const difficultyMap: Record<string, string> = {
  easy: "好养",
  medium: "适中",
  hard: "进阶",
};

const difficultyColorMap: Record<string, string> = {
  easy: "var(--color-success)",
  medium: "var(--color-muted)",
  hard: "var(--color-warning)",
};

/* ─── Styles ─── */

const panelStyle: CSSProperties = {
  position: "absolute",
  top: "calc(100% + var(--space-xs))",
  left: 0,
  right: 0,
  background: "var(--color-surface)",
  borderRadius: "var(--radius-card)",
  border: "1px solid var(--color-line)",
  boxShadow: "var(--shadow-card)",
  zIndex: 50,
  maxHeight: "calc(48px * 3 + 2px)",
  overflow: "hidden",
  animation: "speciesPanelIn 150ms ease-out",
};

const itemStyle: CSSProperties = {
  appearance: "none",
  border: "none",
  background: "transparent",
  width: "100%",
  height: "48px",
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  padding: "0 var(--space-md)",
  gap: "var(--space-sm)",
  cursor: "pointer",
  transition: "background-color 120ms ease",
  borderBottom: "1px solid var(--color-line)",
  boxSizing: "border-box",
};

const itemActiveStyle: CSSProperties = {
  background: "var(--color-mist)",
};

const emojiStyle: CSSProperties = {
  fontSize: "16px",
  flexShrink: 0,
};

const nameStyle: CSSProperties = {
  fontSize: "14px",
  fontWeight: 600,
  color: "var(--color-ink)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const difficultyStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 600,
  flexShrink: 0,
};

const separatorStyle: CSSProperties = {
  fontSize: "12px",
  color: "var(--color-muted)",
  flexShrink: 0,
};

const categoryStyle: CSSProperties = {
  fontSize: "12px",
  color: "var(--color-muted)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const srOnlyStyle: CSSProperties = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0,0,0,0)",
  whiteSpace: "nowrap",
  border: 0,
};
