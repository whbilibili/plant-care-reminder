import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";

interface IconProps {
  /** Lucide 图标组件，例如 import { Droplet } from "lucide-react" 后传入 Droplet */
  icon: LucideIcon;
  /** 图标边长（px），默认 20 */
  size?: number;
  /** 描边宽度，默认 2，与 DetailNavBar 既有内联 SVG 一致 */
  strokeWidth?: number;
  /**
   * 颜色 token 变量名，例如 "--color-leaf"。
   * 传入时 style.color = var(...)，否则继承父级 currentColor。
   * 禁止传字面 #hex 色值（架构红线）。
   */
  colorVar?: string;
  /**
   * 无障碍标签。
   * 有值 → role="img" + aria-label（图标独立承载语义）。
   * 无值 → aria-hidden（同行文案已承载语义）。
   */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * 图标系统统一壳（icon-system-v0.4）。
 *
 * 纪律：所有 Lucide 图标必须经本壳消费，业务组件禁止给 Lucide 组件直接传字面色值。
 * 颜色一律走 currentColor 继承上下文文字色，或经 colorVar 注入设计 token。
 */
export function Icon({
  icon: LucideGlyph,
  size = 20,
  strokeWidth = 2,
  colorVar,
  label,
  className,
  style,
}: IconProps) {
  const accessibilityProps = label
    ? { role: "img" as const, "aria-label": label }
    : { "aria-hidden": true as const };

  return (
    <LucideGlyph
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      style={{
        color: colorVar ? `var(${colorVar})` : undefined,
        flexShrink: 0,
        ...style,
      }}
      {...accessibilityProps}
    />
  );
}
