import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CSSProperties, ReactNode } from "react";

import { prefersReducedMotion } from "../../lib/motion";

/** 退场动画时长，需与 sheet-sink-out / sheet-overlay-out 的 CSS 时长保持一致。 */
const EXIT_DURATION_MS = 200;

/**
 * 三类破坏性/重要确认的视觉变体：
 * - danger-outline：退出登录（透明底 + 红描边 + 红字，较轻警示）
 * - danger-solid：移除成员（红实底 + 纸白字，最强警示）
 * - primary：重置邀请码（品牌绿实底 + 纸白字）
 */
export type ConfirmSheetVariant = "danger-outline" | "danger-solid" | "primary";

interface ConfirmSheetProps {
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: ConfirmSheetVariant;
  isSubmitting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** 可选自定义内容（如称呼编辑表单），渲染在 description 与操作区之间。 */
  children?: ReactNode;
  /** 无障碍标签，默认取 title。 */
  ariaLabel?: string;
}

/**
 * 通用底部确认 sheet（SET2-005）。从 PostponeConfirmSheet 提炼，统一承载
 * 退出登录 / 移除成员 / 重置邀请码三类操作，三种 variant 对应不同危险级别。
 *
 * 行为：遮罩淡入 + sheet 从底部升起；点遮罩 / 取消 / Esc 关闭；focus trap；
 * 全部尊重 prefers-reduced-motion（reduce 下即时显隐）。
 */
export function ConfirmSheet({
  title,
  description,
  confirmLabel,
  cancelLabel = "取消",
  variant = "primary",
  isSubmitting = false,
  onConfirm,
  onCancel,
  children,
  ariaLabel,
}: ConfirmSheetProps) {
  const [closing, setClosing] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  /** 触发退场：reduce 模式直接回调，否则播放退场动画后再卸载。 */
  const requestClose = useCallback(() => {
    if (isSubmitting || closing) return;
    if (prefersReducedMotion()) {
      onCancel();
      return;
    }
    setClosing(true);
    window.setTimeout(onCancel, EXIT_DURATION_MS);
  }, [closing, isSubmitting, onCancel]);

  // 打开时把焦点移入确认按钮，便于键盘直接操作。
  useEffect(() => {
    confirmButtonRef.current?.focus();
  }, []);

  // Esc 关闭 + Tab focus trap（限制在 sheet 内的可聚焦元素之间循环）。
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        requestClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const container = sheetRef.current;
      if (!container) {
        return;
      }

      const focusable = container.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) {
        return;
      }

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
  }, [requestClose]);

  return createPortal(
    <div
      aria-label={ariaLabel ?? title}
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
        <p style={titleStyle}>{title}</p>
        {description ? <p style={descriptionStyle}>{description}</p> : null}
        {children}
        <div style={actionsStyle}>
          <button
            aria-busy={isSubmitting}
            disabled={isSubmitting}
            onClick={requestClose}
            style={cancelButtonStyle}
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmButtonRef}
            aria-busy={isSubmitting}
            disabled={isSubmitting}
            onClick={onConfirm}
            style={{ ...confirmButtonBaseStyle, ...CONFIRM_VARIANT_STYLES[variant] }}
            type="button"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

const CONFIRM_VARIANT_STYLES: Record<ConfirmSheetVariant, CSSProperties> = {
  "danger-outline": {
    background: "transparent",
    color: "var(--color-error)",
    border: "1px solid var(--color-error)",
  },
  "danger-solid": {
    background: "var(--color-error)",
    color: "var(--color-paper)",
    border: "1px solid var(--color-error)",
  },
  primary: {
    background: "var(--color-leaf)",
    color: "var(--color-paper)",
    border: "1px solid var(--color-leaf)",
  },
};

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
  background: "var(--color-surface)",
  borderRadius: "var(--radius-card)",
  padding: "var(--space-md) var(--space-lg) var(--space-lg)",
  display: "grid",
  justifyItems: "stretch",
  gap: "var(--space-md)",
  boxShadow: "var(--shadow-sheet)",
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

const descriptionStyle: CSSProperties = {
  margin: 0,
  color: "var(--color-muted)",
  fontSize: "14px",
  lineHeight: 1.6,
};

const actionsStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "var(--space-sm)",
};

const buttonBaseStyle: CSSProperties = {
  appearance: "none",
  minHeight: "44px",
  padding: "0 var(--space-md)",
  borderRadius: "var(--radius-button)",
  fontSize: "14px",
  fontWeight: 600,
  cursor: "pointer",
};

const cancelButtonStyle: CSSProperties = {
  ...buttonBaseStyle,
  background: "transparent",
  color: "var(--color-muted)",
  border: "1px solid var(--color-line)",
};

const confirmButtonBaseStyle: CSSProperties = {
  ...buttonBaseStyle,
};
