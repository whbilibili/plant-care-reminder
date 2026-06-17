import type { CSSProperties, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { Icon } from "./Icon";

interface GroupedSurfaceProps {
  /** 可选标题行。 */
  title?: string;
  /** 标题前的 Lucide 图标，替代 emoji。 */
  titleIcon?: LucideIcon;
  /** 标题右侧可选操作（如「+ 添加」）。 */
  titleAction?: ReactNode;
  /** 子项内容，行项目之间由调用方自行用 <GroupedSurfaceDivider /> 分隔。 */
  children: ReactNode;
  /** 外部追加样式。 */
  style?: CSSProperties;
}

/**
 * GroupedSurface — 分组表面容器。
 *
 * 单 surface 内使用标题行和 row divider，
 * 不允许行项目再套大卡片。
 *
 * 视觉：
 * - background: var(--color-surface)
 * - border: 1px solid var(--color-line)
 * - border-radius: var(--radius-card)
 */
export function GroupedSurface({
  title,
  titleIcon,
  titleAction,
  children,
  style,
}: GroupedSurfaceProps) {
  return (
    <section style={{ ...surfaceStyle, ...style }}>
      {title ? (
        <div style={headerStyle}>
          <h3 style={headerTitleStyle}>
            {titleIcon ? (
              <Icon icon={titleIcon} size={18} colorVar="--color-leaf" />
            ) : null}
            {title}
          </h3>
          {titleAction ?? null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** 行项目分割线。 */
export function GroupedSurfaceDivider() {
  return <div style={dividerStyle} />;
}

const surfaceStyle: CSSProperties = {
  borderRadius: "var(--radius-card)",
  background: "var(--color-surface)",
  border: "1px solid var(--color-line)",
  overflow: "hidden",
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "var(--space-md) var(--space-md) var(--space-sm)",
};

const headerTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "15px",
  fontWeight: 700,
  color: "var(--color-ink)",
  display: "flex",
  alignItems: "center",
  gap: "var(--space-xs)",
};

const dividerStyle: CSSProperties = {
  height: "1px",
  background: "var(--color-line)",
  marginLeft: "var(--space-md)",
  marginRight: "var(--space-md)",
};
