import type { CSSProperties, ReactNode } from "react";

interface ObjectSummaryBandProps {
  /** 左侧缩略图/头像（ReactNode，由调用方提供 img 或 placeholder）。 */
  thumbnail?: ReactNode;
  /** 主标题。 */
  title: string;
  /** 次要信息（如位置）。可以是字符串或 ReactNode（如带图标的行）。 */
  subtitle?: ReactNode;
  /** 状态 badge（如"今天有任务待完成"）。 */
  statusBadge?: ReactNode;
  /** 右侧可选操作按钮。 */
  action?: ReactNode;
  /** 点击缩略图回调。 */
  onThumbnailClick?: () => void;
}

/**
 * ObjectSummaryBand — 对象摘要横条。
 *
 * 用于植物详情顶部、任务编辑上下文、家庭摘要。
 * 紧凑承接 ScreenNav，缩略图 + 主标题 + 次信息 + 状态 + 可选操作。
 */
export function ObjectSummaryBand({
  thumbnail,
  title,
  subtitle,
  statusBadge,
  action,
  onThumbnailClick,
}: ObjectSummaryBandProps) {
  return (
    <div style={bandStyle}>
      {thumbnail ? (
        <div
          onClick={onThumbnailClick}
          role={onThumbnailClick ? "button" : undefined}
          style={{
            ...thumbnailWrapStyle,
            cursor: onThumbnailClick ? "pointer" : "default",
          }}
          tabIndex={onThumbnailClick ? 0 : undefined}
        >
          {thumbnail}
        </div>
      ) : null}

      <div style={infoStyle}>
        <span style={titleStyle}>{title}</span>
        {subtitle ? <span style={subtitleStyle}>{subtitle}</span> : null}
        {statusBadge ?? null}
      </div>

      {action ? <div style={actionStyle}>{action}</div> : null}
    </div>
  );
}

const bandStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-md)",
  padding: "var(--space-md)",
};

const thumbnailWrapStyle: CSSProperties = {
  width: "56px",
  height: "56px",
  borderRadius: "var(--radius-button)",
  overflow: "hidden",
  flexShrink: 0,
};

const infoStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  flex: 1,
  minWidth: 0,
};

const titleStyle: CSSProperties = {
  fontSize: "17px",
  fontWeight: 700,
  color: "var(--color-ink)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const subtitleStyle: CSSProperties = {
  fontSize: "13px",
  color: "var(--color-muted)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const actionStyle: CSSProperties = {
  flexShrink: 0,
};
