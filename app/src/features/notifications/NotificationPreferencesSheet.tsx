import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

import { Button } from "../../components/ui/Button";
import { prefersReducedMotion } from "../../lib/motion";

/** 退场动画时长，与 ConfirmSheet 保持一致。 */
const EXIT_DURATION_MS = 200;

interface NotificationPreferencesSheetProps {
  open: boolean;
  onClose: () => void;
  currentHour: number | null;
  onSave: (hour: number | null) => Promise<void>;
}

interface HourOption {
  value: number | null;
  label: string;
}

const HOUR_OPTIONS: HourOption[] = [
  { value: null, label: "任务到期时立即提醒" },
  { value: 6, label: "每天 6:00" },
  { value: 7, label: "每天 7:00" },
  { value: 8, label: "每天 8:00" },
  { value: 9, label: "每天 9:00" },
  { value: 10, label: "每天 10:00" },
  { value: 12, label: "每天 12:00" },
  { value: 18, label: "每天 18:00" },
  { value: 20, label: "每天 20:00" },
  { value: 21, label: "每天 21:00" },
  { value: 22, label: "每天 22:00" },
];

/**
 * 推送时间偏好选择 Sheet（PUSH-009）。
 * 底部弹出，11 个预设小时选项 + "立即推送"选项，单选 radio 样式。
 */
export function NotificationPreferencesSheet({
  open,
  onClose,
  currentHour,
  onSave,
}: NotificationPreferencesSheetProps) {
  const [selectedHour, setSelectedHour] = useState<number | null>(currentHour);
  const [isSaving, setIsSaving] = useState(false);
  const [closing, setClosing] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  // 同步外部 currentHour 变化
  useEffect(() => {
    setSelectedHour(currentHour);
  }, [currentHour]);

  // 每次打开时重置关闭动画状态
  useEffect(() => {
    if (open) {
      setClosing(false);
    }
  }, [open]);

  const requestClose = useCallback(() => {
    if (isSaving || closing) return;
    if (prefersReducedMotion()) {
      onClose();
      return;
    }
    setClosing(true);
    window.setTimeout(onClose, EXIT_DURATION_MS);
  }, [closing, isSaving, onClose]);

  // Esc 关闭 + focus trap
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        requestClose();
        return;
      }

      if (event.key !== "Tab") return;

      const container = sheetRef.current;
      if (!container) return;

      const focusable = container.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, requestClose]);

  async function handleSave() {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await onSave(selectedHour);
      requestClose();
    } catch {
      // 错误由调用方处理
    } finally {
      setIsSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div
      aria-label="设置提醒时间"
      aria-modal="true"
      onClick={requestClose}
      role="dialog"
      style={{
        ...overlayStyle,
        animation: `${closing ? "sheet-overlay-out" : "sheet-overlay-in"} ${EXIT_DURATION_MS}ms ease forwards`,
      }}
    >
      <div
        ref={sheetRef}
        onClick={(event) => event.stopPropagation()}
        style={{
          ...sheetStyle,
          animation: closing
            ? `sheet-sink-out ${EXIT_DURATION_MS}ms cubic-bezier(0.4, 0, 1, 1) forwards`
            : "sheet-rise-in 360ms cubic-bezier(0.22, 1, 0.36, 1) both",
        }}
      >
        <span aria-hidden="true" style={grabberStyle} />
        <p style={titleStyle}>设置提醒时间</p>

        <div style={optionsContainerStyle}>
          {HOUR_OPTIONS.map((option) => {
            const isSelected =
              option.value === selectedHour;
            return (
              <button
                key={option.value ?? "immediate"}
                onClick={() => setSelectedHour(option.value)}
                style={optionRowStyle}
                type="button"
                aria-pressed={isSelected}
              >
                <span
                  style={{
                    ...optionLabelStyle,
                    color: isSelected
                      ? "var(--color-leaf)"
                      : "var(--color-ink)",
                    fontWeight: isSelected ? 600 : 400,
                  }}
                >
                  {option.label}
                </span>
                <span
                  style={{
                    ...radioIndicatorStyle,
                    ...(isSelected
                      ? radioSelectedStyle
                      : radioUnselectedStyle),
                  }}
                />
              </button>
            );
          })}
        </div>

        <Button
          disabled={isSaving}
          onClick={() => void handleSave()}
          type="button"
          variant="primary"
        >
          {isSaving ? "保存中…" : "保存"}
        </Button>
      </div>
    </div>
  );
}

// ─── 样式 ─────────────────────────────────────────────────────

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 100,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "var(--space-md)",
  background: "var(--color-overlay-scrim)",
  backdropFilter: "blur(2px)",
};

const sheetStyle: CSSProperties = {
  width: "100%",
  maxWidth: "440px",
  maxHeight: "80vh",
  background: "var(--color-surface)",
  borderRadius: "var(--radius-card)",
  padding: "var(--space-md) var(--space-lg) var(--space-lg)",
  display: "grid",
  justifyItems: "stretch",
  gap: "var(--space-md)",
  boxShadow: "var(--shadow-sheet)",
  overflow: "hidden",
};

const grabberStyle: CSSProperties = {
  justifySelf: "center",
  width: "40px",
  height: "4px",
  borderRadius: "var(--radius-pill)",
  background: "var(--color-line)",
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-heading)",
  fontSize: "17px",
  fontWeight: 700,
  color: "var(--color-ink)",
};

const optionsContainerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  maxHeight: "360px",
  overflowY: "auto",
};

const optionRowStyle: CSSProperties = {
  appearance: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
  height: "48px",
  padding: "0 var(--space-sm)",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  borderBottom: "1px solid var(--color-line)",
};

const optionLabelStyle: CSSProperties = {
  fontSize: "14px",
  lineHeight: 1.4,
};

const radioIndicatorStyle: CSSProperties = {
  flexShrink: 0,
  width: "18px",
  height: "18px",
  borderRadius: "50%",
};

const radioSelectedStyle: CSSProperties = {
  background: "var(--color-leaf)",
  border: "none",
  boxShadow: "inset 0 0 0 4px var(--color-surface)",
};

const radioUnselectedStyle: CSSProperties = {
  background: "transparent",
  border: "2px solid var(--color-line)",
};
