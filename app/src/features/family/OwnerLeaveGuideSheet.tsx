import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

import { prefersReducedMotion } from "../../lib/motion";
import { navigate } from "../../app/router";

const EXIT_DURATION_MS = 200;

interface OwnerLeaveGuideSheetProps {
  onClose: () => void;
}

/**
 * Owner 点击「退出家庭」时弹出的引导 Sheet（ROLE-010）。
 * 温和引导 owner 先去成员管理页转让所有者身份，而非冷冰冰报错。
 */
export function OwnerLeaveGuideSheet({ onClose }: OwnerLeaveGuideSheetProps) {
  const [closing, setClosing] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const actionRef = useRef<HTMLButtonElement>(null);

  const requestClose = useCallback(() => {
    if (closing) return;
    if (prefersReducedMotion()) {
      onClose();
      return;
    }
    setClosing(true);
    window.setTimeout(onClose, EXIT_DURATION_MS);
  }, [closing, onClose]);

  useEffect(() => {
    actionRef.current?.focus();
  }, []);

  useEffect(() => {
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
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
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
  }, [requestClose]);

  function handleGoTransfer() {
    requestClose();
    navigate("/settings/members");
  }

  return (
    <div
      aria-label="退出家庭引导"
      aria-modal="true"
      onClick={requestClose}
      role="alertdialog"
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
        <p style={titleStyle}>无法退出家庭</p>
        <p style={descriptionStyle}>
          作为家庭所有者，你需要先将所有者身份转让给其他成员，才能退出家庭。
        </p>
        <div style={actionsStyle}>
          <button
            onClick={requestClose}
            style={cancelButtonStyle}
            type="button"
          >
            取消
          </button>
          <button
            ref={actionRef}
            onClick={handleGoTransfer}
            style={primaryButtonStyle}
            type="button"
          >
            去转让
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Styles ─── */

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 100,
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
  padding:
    "0 var(--space-md) calc(var(--space-md) + 64px + env(safe-area-inset-bottom, 0px))",
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

const primaryButtonStyle: CSSProperties = {
  ...buttonBaseStyle,
  background: "var(--color-leaf)",
  color: "var(--color-paper)",
  border: "1px solid var(--color-leaf)",
};
