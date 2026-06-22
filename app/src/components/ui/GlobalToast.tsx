import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "../../lib/motion";

/** 全局 Toast 默认显示时长（ms）。 */
const DEFAULT_DURATION_MS = 2500;

/** Toast 事件载荷。 */
interface ToastEvent {
  message: string;
  duration?: number;
}

type Listener = (event: ToastEvent) => void;

const listeners = new Set<Listener>();

/** 触发全局 Toast（可在任何组件中调用）。 */
export function showToast(message: string, duration?: number) {
  const event: ToastEvent = { message, duration };
  for (const listener of listeners) {
    listener(event);
  }
}

/**
 * GlobalToast — 全局轻量提示条。
 *
 * 放在 App 根部挂载一次即可。调用 showToast("xxx") 触发显示，
 * 若干秒后自动消失。
 */
export function GlobalToast() {
  const [toast, setToast] = useState<ToastEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const handler: Listener = (event) => {
      // 清除上一个计时器
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
      setToast(event);
      // 下一帧触发入场动画
      requestAnimationFrame(() => setIsVisible(true));
      // 设置自动消失
      timerRef.current = window.setTimeout(() => {
        setIsVisible(false);
        // 动画结束后清除内容
        setTimeout(() => setToast(null), 300);
      }, event.duration ?? DEFAULT_DURATION_MS);
    };

    listeners.add(handler);
    return () => {
      listeners.delete(handler);
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  if (!toast) return null;

  const reduceMotion = prefersReducedMotion();

  return (
    <div
      aria-live="polite"
      role="status"
      style={{
        ...toastStyle,
        transition: reduceMotion
          ? undefined
          : "transform 0.3s ease-out, opacity 0.3s ease-out",
        transform: isVisible
          ? "translateX(-50%) translateY(0)"
          : "translateX(-50%) translateY(-20px)",
        opacity: isVisible ? 1 : 0,
      }}
    >
      <span style={checkStyle}>✓</span>
      <span style={messageStyle}>{toast.message}</span>
    </div>
  );
}

const toastStyle: React.CSSProperties = {
  position: "fixed",
  top: "calc(env(safe-area-inset-top, 0px) + 16px)",
  left: "50%",
  zIndex: 9999,
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "12px 20px",
  borderRadius: "var(--radius-pill)",
  background: "var(--color-ink)",
  color: "#fff",
  boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
  pointerEvents: "none",
};

const checkStyle: React.CSSProperties = {
  fontSize: "14px",
  flexShrink: 0,
};

const messageStyle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 500,
  lineHeight: 1.4,
  whiteSpace: "nowrap",
};
