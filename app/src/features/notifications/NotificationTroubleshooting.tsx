import { useId, useState } from "react";
import type { CSSProperties } from "react";

import { prefersReducedMotion } from "../../lib/motion";

/** 收不到提醒时的自助排障静态清单（1–4 条）。 */
const TROUBLESHOOT_STEPS = [
  "把应用添加到主屏幕（iPhone Safari 需先「添加到主屏幕」并从主屏打开）。",
  "在通知卡点击「开启通知」，并在系统弹窗中选择「允许」。",
  "若此前误点了「不允许」，请到系统设置 → 通知中重新打开本应用的通知权限。",
  "通知偶尔会有延迟，期间仍可在待办页查看全部提醒任务，不会漏掉。",
];

/**
 * 收不到提醒排障折叠（SET2-011）。disclosure 模式：默认收起，
 * aria-expanded / aria-controls 关联触发器与面板，展开用 max-height + opacity
 * 动效（遵循 prefers-reduced-motion，reduce 下即时切换）。
 */
export function NotificationTroubleshooting() {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const reduceMotion = prefersReducedMotion();

  return (
    <div style={wrapStyle}>
      <button
        aria-controls={panelId}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        style={triggerStyle}
        type="button"
      >
        <span>收不到提醒？查看排障建议</span>
        <span
          aria-hidden="true"
          style={{
            ...chevronStyle,
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
            transition: reduceMotion ? "none" : "transform 200ms ease",
          }}
        >
          ›
        </span>
      </button>
      <div
        id={panelId}
        style={{
          ...panelOuterStyle,
          maxHeight: open ? "360px" : "0px",
          opacity: open ? 1 : 0,
          transition: reduceMotion
            ? "none"
            : "max-height 300ms ease-out, opacity 300ms ease-out",
        }}
      >
        <ol style={listStyle}>
          {TROUBLESHOOT_STEPS.map((step) => (
            <li key={step} style={itemStyle}>
              {step}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

const wrapStyle: CSSProperties = {
  display: "grid",
  gap: "var(--space-sm)",
};

const triggerStyle: CSSProperties = {
  appearance: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "var(--space-sm)",
  width: "100%",
  minHeight: "40px",
  padding: 0,
  background: "transparent",
  border: "none",
  color: "var(--color-leaf-light)",
  fontSize: "13px",
  fontWeight: 500,
  cursor: "pointer",
  textAlign: "left",
};

const chevronStyle: CSSProperties = {
  flex: "none",
  fontSize: "18px",
  lineHeight: 1,
};

const panelOuterStyle: CSSProperties = {
  overflow: "hidden",
};

const listStyle: CSSProperties = {
  margin: 0,
  padding: "var(--space-md)",
  paddingLeft: "calc(var(--space-md) + 16px)",
  background: "var(--color-mist)",
  borderRadius: "var(--radius-input)",
  display: "grid",
  gap: "var(--space-sm)",
};

const itemStyle: CSSProperties = {
  color: "var(--color-muted)",
  fontSize: "13px",
  lineHeight: 1.6,
};
