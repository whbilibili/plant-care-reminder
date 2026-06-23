import { useEffect, useRef, useState } from "react";

import { prefersReducedMotion } from "../../lib/motion";
import {
  UNDO_TOAST_DURATION_MS,
  type BatchCompletionUndoPayload,
  type CompletionUndoPayload,
} from "./undoComplete";

export { UNDO_TOAST_DURATION_MS, type CompletionUndoPayload } from "./undoComplete";

/** 浮条可承载单条或批量两种撤销载荷，UI 只关心 message 与撤销动作。 */
type ToastPayload = CompletionUndoPayload | BatchCompletionUndoPayload;

interface UndoToastProps {
  payload: ToastPayload;
  onUndo: (payload: ToastPayload) => void;
  onDismiss: () => void;
}

export function UndoToast({ payload, onUndo, onDismiss }: UndoToastProps) {
  // 入场：先渲染在屏幕下方，挂载后切到位形成 ~250ms 滑入（reduced-motion 直接显示）。
  const [isEntered, setIsEntered] = useState(prefersReducedMotion());
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  useEffect(() => {
    setIsEntered(prefersReducedMotion());
    const raf = window.requestAnimationFrame(() => setIsEntered(true));
    const timer = window.setTimeout(() => {
      dismissRef.current();
    }, UNDO_TOAST_DURATION_MS);

    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
    // payload 变化（新一次完成）时重置入场与计时器。
  }, [payload]);

  const reduceMotion = prefersReducedMotion();

  return (
    <div
      aria-live="polite"
      role="status"
      style={{
        ...toastStyle,
        transition: reduceMotion ? undefined : "transform 250ms ease-out, opacity 250ms ease-out",
        transform: isEntered
          ? "translateX(-50%) translateY(0)"
          : "translateX(-50%) translateY(120%)",
        opacity: isEntered ? 1 : 0,
      }}
    >
      <span style={messageStyle}>{payload.message}</span>
      <button onClick={() => onUndo(payload)} style={undoButtonStyle} type="button">
        撤销
      </button>
    </div>
  );
}

const toastStyle: React.CSSProperties = {
  position: "fixed",
  left: "50%",
  bottom: "calc(72px + env(safe-area-inset-bottom, 0px))",
  zIndex: 60,
  display: "flex",
  alignItems: "center",
  gap: "10px",
  width: "min(92vw, 420px)",
  padding: "10px 14px",
  borderRadius: "var(--radius-pill)",
  background: "var(--color-leaf)",
  color: "var(--color-paper)",
  boxShadow: "var(--shadow-card-emphasis)",
};

const messageStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  fontSize: "0.85rem",
  fontWeight: 500,
  lineHeight: 1.4,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const undoButtonStyle: React.CSSProperties = {
  appearance: "none",
  flexShrink: 0,
  background: "transparent",
  border: "none",
  padding: "4px 6px",
  color: "var(--color-gold)",
  fontSize: "0.9rem",
  fontWeight: 700,
  cursor: "pointer",
};
