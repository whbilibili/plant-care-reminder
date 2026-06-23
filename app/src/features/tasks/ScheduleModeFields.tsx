/**
 * FLEX-009: 排期模式选择器及配套输入组件。
 * - ScheduleModeSelector: 三模式单选
 * - WeeklyDaysPicker: 星期多选
 * - SeasonalIntervalsInput: 春夏/秋冬双间隔输入
 * - ScheduleModeFieldGroup: 聚合容器（根据模式自动显示对应子组件）
 */
import type { CSSProperties } from "react";

import { InputField } from "../../components/ui/InputField";
import { formatScheduleModeLabel, getWeekdayLabel } from "../../lib/formatters";
import type { ScheduleMode } from "../../types/domain";

// ─── ScheduleModeSelector ──────────────────────────────────────

interface ScheduleModeSelectorProps {
  value: ScheduleMode;
  onChange: (mode: ScheduleMode) => void;
}

const MODES: ScheduleMode[] = ["interval", "weekly", "seasonal"];

export function ScheduleModeSelector({ value, onChange }: ScheduleModeSelectorProps) {
  return (
    <fieldset style={fieldsetStyle}>
      <legend style={legendStyle}>排期模式</legend>
      <div style={chipRowStyle}>
        {MODES.map((mode) => {
          const isActive = mode === value;
          return (
            <button
              key={mode}
              type="button"
              aria-pressed={isActive}
              onClick={() => onChange(mode)}
              style={{
                ...chipBaseStyle,
                ...(isActive ? chipActiveStyle : chipInactiveStyle),
              }}
            >
              {formatScheduleModeLabel(mode)}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

// ─── WeeklyDaysPicker ──────────────────────────────────────────

interface WeeklyDaysPickerProps {
  value: number[];
  onChange: (days: number[]) => void;
  errorMessage?: string | null;
}

const ALL_DAYS = [1, 2, 3, 4, 5, 6, 0]; // 周一到周六，最后周日

export function WeeklyDaysPicker({ value, onChange, errorMessage }: WeeklyDaysPickerProps) {
  const toggle = (day: number) => {
    if (value.includes(day)) {
      onChange(value.filter((d) => d !== day));
    } else {
      onChange([...value, day].sort((a, b) => a - b));
    }
  };

  return (
    <fieldset style={fieldsetStyle}>
      <legend style={legendStyle}>提醒日（可多选）</legend>
      <div style={dayGridStyle}>
        {ALL_DAYS.map((day) => {
          const isSelected = value.includes(day);
          return (
            <button
              key={day}
              type="button"
              aria-pressed={isSelected}
              onClick={() => toggle(day)}
              style={{
                ...dayChipBaseStyle,
                ...(isSelected ? dayChipActiveStyle : dayChipInactiveStyle),
              }}
            >
              {getWeekdayLabel(day)}
            </button>
          );
        })}
      </div>
      {errorMessage ? <span style={errorStyle}>{errorMessage}</span> : null}
    </fieldset>
  );
}

// ─── SeasonalIntervalsInput ────────────────────────────────────

interface SeasonalIntervalsInputProps {
  springSummer: string;
  autumnWinter: string;
  onSpringSummerChange: (value: string) => void;
  onAutumnWinterChange: (value: string) => void;
  errorMessage?: string | null;
}

export function SeasonalIntervalsInput({
  springSummer,
  autumnWinter,
  onSpringSummerChange,
  onAutumnWinterChange,
  errorMessage,
}: SeasonalIntervalsInputProps) {
  return (
    <fieldset style={fieldsetStyle}>
      <legend style={legendStyle}>季节间隔</legend>
      <div style={seasonalGridStyle}>
        <InputField
          hint="3–8 月生长旺季的提醒间隔"
          inputMode="numeric"
          label="春夏间隔（天）"
          min={1}
          onChange={(e) => onSpringSummerChange(e.target.value)}
          placeholder="5"
          type="number"
          value={springSummer}
        />
        <InputField
          hint="9–2 月休眠期的提醒间隔"
          inputMode="numeric"
          label="秋冬间隔（天）"
          min={1}
          onChange={(e) => onAutumnWinterChange(e.target.value)}
          placeholder="14"
          type="number"
          value={autumnWinter}
        />
      </div>
      {errorMessage ? <span style={errorStyle}>{errorMessage}</span> : null}
    </fieldset>
  );
}

// ─── ScheduleModeFieldGroup（聚合）────────────────────────────

export interface ScheduleModeFieldGroupProps {
  mode: ScheduleMode;
  onModeChange: (mode: ScheduleMode) => void;
  // interval 模式不需要额外字段（intervalDays 已由上层 TaskForm 管理）
  // weekly
  weeklyDays: number[];
  onWeeklyDaysChange: (days: number[]) => void;
  weeklyError?: string | null;
  // seasonal
  springSummer: string;
  autumnWinter: string;
  onSpringSummerChange: (value: string) => void;
  onAutumnWinterChange: (value: string) => void;
  seasonalError?: string | null;
}

export function ScheduleModeFieldGroup({
  mode,
  onModeChange,
  weeklyDays,
  onWeeklyDaysChange,
  weeklyError,
  springSummer,
  autumnWinter,
  onSpringSummerChange,
  onAutumnWinterChange,
  seasonalError,
}: ScheduleModeFieldGroupProps) {
  return (
    <div style={groupWrapStyle}>
      <ScheduleModeSelector value={mode} onChange={onModeChange} />
      {mode === "weekly" && (
        <WeeklyDaysPicker
          value={weeklyDays}
          onChange={onWeeklyDaysChange}
          errorMessage={weeklyError}
        />
      )}
      {mode === "seasonal" && (
        <SeasonalIntervalsInput
          springSummer={springSummer}
          autumnWinter={autumnWinter}
          onSpringSummerChange={onSpringSummerChange}
          onAutumnWinterChange={onAutumnWinterChange}
          errorMessage={seasonalError}
        />
      )}
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────

const fieldsetStyle: CSSProperties = {
  border: "none",
  margin: 0,
  padding: 0,
  display: "grid",
  gap: "10px",
};

const legendStyle: CSSProperties = {
  color: "var(--color-ink)",
  fontSize: "0.95rem",
  fontWeight: 700,
  marginBottom: "4px",
};

const chipRowStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};

const chipBaseStyle: CSSProperties = {
  border: "none",
  borderRadius: "20px",
  padding: "8px 16px",
  fontSize: "0.88rem",
  fontWeight: 600,
  cursor: "pointer",
  transition: "background 0.15s, color 0.15s",
};

const chipActiveStyle: CSSProperties = {
  background: "var(--color-leaf)",
  color: "var(--color-paper)",
};

const chipInactiveStyle: CSSProperties = {
  background: "var(--color-mist)",
  color: "var(--color-muted)",
};

const dayGridStyle: CSSProperties = {
  display: "flex",
  gap: "6px",
  flexWrap: "wrap",
};

const dayChipBaseStyle: CSSProperties = {
  width: "42px",
  height: "42px",
  borderRadius: "50%",
  border: "2px solid var(--color-line)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "0.82rem",
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 0.15s",
  background: "transparent",
  color: "var(--color-ink)",
};

const dayChipActiveStyle: CSSProperties = {
  background: "var(--color-leaf)",
  borderColor: "var(--color-leaf)",
  color: "var(--color-paper)",
};

const dayChipInactiveStyle: CSSProperties = {
  background: "transparent",
  borderColor: "var(--color-line)",
  color: "var(--color-ink)",
};

const seasonalGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "12px",
};

const errorStyle: CSSProperties = {
  color: "var(--color-error)",
  fontSize: "0.82rem",
};

const groupWrapStyle: CSSProperties = {
  display: "grid",
  gap: "16px",
};
