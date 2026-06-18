import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import { PLANT_LOCATION_MAX_LENGTH } from "../../lib/constants";

interface LocationAutocompleteProps {
  /** 已有位置建议列表（去重、按频率降序）。 */
  suggestions: string[];
  /** 当前值。 */
  value: string;
  /** 值变更回调。 */
  onChange: (value: string) => void;
  /** 错误信息。 */
  errorMessage?: string;
}

/**
 * LocationAutocomplete — 位置输入 + 下拉建议。
 *
 * 输入时模糊匹配已有位置，点击建议项直接填入。
 * 无匹配时正常输入新位置。
 */
export function LocationAutocomplete({
  suggestions,
  value,
  onChange,
  errorMessage,
}: LocationAutocompleteProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = value.trim()
    ? suggestions.filter(
        (s) =>
          s.toLowerCase().includes(value.toLowerCase()) &&
          s.toLowerCase() !== value.toLowerCase(),
      )
    : suggestions;

  const shouldShowDropdown = showSuggestions && isFocused && filtered.length > 0;

  function handleFocus() {
    setIsFocused(true);
    setShowSuggestions(true);
  }

  function handleBlur(e: React.FocusEvent) {
    // 如果焦点移到了建议列表内部，不关闭
    if (containerRef.current?.contains(e.relatedTarget as Node)) return;
    setIsFocused(false);
    setShowSuggestions(false);
  }

  function handleSelect(suggestion: string) {
    onChange(suggestion);
    setShowSuggestions(false);
    inputRef.current?.focus();
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(e.target.value);
    setShowSuggestions(true);
  }

  return (
    <div ref={containerRef} style={wrapperStyle} onBlur={handleBlur}>
      <label htmlFor="plant-location" style={labelStyle}>
        摆放位置
      </label>
      <div style={inputWrapperStyle}>
        <input
          ref={inputRef}
          id="plant-location"
          type="text"
          autoComplete="off"
          maxLength={PLANT_LOCATION_MAX_LENGTH}
          placeholder="它放在哪里？"
          value={value}
          onChange={handleInputChange}
          onFocus={handleFocus}
          style={{
            ...inputStyle,
            ...(errorMessage ? inputErrorStyle : null),
            ...(isFocused ? inputFocusStyle : null),
          }}
        />
        {shouldShowDropdown && (
          <div style={dropdownStyle}>
            {filtered.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                style={suggestionItemStyle}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(suggestion)}
              >
                <span style={suggestionIconStyle}>📍</span>
                <span style={suggestionTextStyle}>{suggestion}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <span style={hintStyle}>选填。方便家人快速找到这盆植物。</span>
      {errorMessage && <span style={errorStyle}>{errorMessage}</span>}
    </div>
  );
}

/* ─── Styles ─── */

const wrapperStyle: CSSProperties = {
  display: "grid",
  gap: "var(--space-xs)",
  position: "relative",
};

const labelStyle: CSSProperties = {
  color: "var(--color-ink)",
  fontSize: "14px",
  fontWeight: 600,
};

const inputWrapperStyle: CSSProperties = {
  position: "relative",
};

const inputStyle: CSSProperties = {
  width: "100%",
  height: "48px",
  borderRadius: "var(--radius-input)",
  border: "1px solid var(--color-line)",
  background: "var(--color-surface)",
  color: "var(--color-ink)",
  padding: "0 14px",
  fontSize: "14px",
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 150ms ease, box-shadow 150ms ease",
};

const inputFocusStyle: CSSProperties = {
  borderColor: "var(--color-leaf)",
  boxShadow: "0 0 0 3px rgba(76,175,80,0.12)",
};

const inputErrorStyle: CSSProperties = {
  borderColor: "var(--color-error)",
  boxShadow: "0 0 0 3px rgba(197,48,48,0.12)",
};

const dropdownStyle: CSSProperties = {
  position: "absolute",
  top: "calc(100% + 4px)",
  left: 0,
  right: 0,
  background: "var(--color-surface)",
  border: "1px solid var(--color-line)",
  borderRadius: "var(--radius-card)",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  zIndex: 100,
  maxHeight: "180px",
  overflowY: "auto",
  padding: "4px 0",
};

const suggestionItemStyle: CSSProperties = {
  appearance: "none",
  border: "none",
  background: "transparent",
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "10px 14px",
  fontSize: "14px",
  color: "var(--color-ink)",
  cursor: "pointer",
  textAlign: "left",
};

const suggestionIconStyle: CSSProperties = {
  fontSize: "14px",
  flexShrink: 0,
};

const suggestionTextStyle: CSSProperties = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const hintStyle: CSSProperties = {
  color: "var(--color-muted)",
  fontSize: "12px",
  lineHeight: 1.5,
};

const errorStyle: CSSProperties = {
  color: "var(--color-error)",
  fontSize: "12px",
  lineHeight: 1.5,
};
