import type { CSSProperties, ReactNode } from "react";

interface FormSummaryCardProps {
  /** 左侧缩略图（img 或 placeholder）。 */
  thumbnail: ReactNode;
  /** 主标题（如植物名、植物名·任务类型）。 */
  title: string;
  /** 副标题行（如位置信息），与 description 同行显示。 */
  subtitle?: ReactNode;
  /** 额外描述（如简介摘要），与 subtitle 同行用 · 分隔。 */
  description?: string;
  /** 卡片底部区域（如品种标签），分割线分隔。 */
  footer?: ReactNode;
}

/**
 * FormSummaryCard — 表单页顶部的对象摘要卡片。
 *
 * 统一用于编辑养护、新建养护、编辑植物页面顶部。
 * 白色背景 + 左侧绿色装饰线 + 自适应内容高度。
 */
export function FormSummaryCard({
  thumbnail,
  title,
  subtitle,
  description,
  footer,
}: FormSummaryCardProps) {
  const hasSecondLine = !!(subtitle || description);

  return (
    <div style={wrapStyle}>
      <div style={cardStyle}>
        <div style={contentStyle}>
          <div style={thumbWrapStyle}>{thumbnail}</div>
          <div style={infoStyle}>
            <span style={titleStyle}>{title}</span>
            {hasSecondLine && (
              <span style={metaLineStyle}>
                {subtitle}
                {subtitle && description ? (
                  <span style={metaSepStyle}>·</span>
                ) : null}
                {description ? (
                  <span style={descSpanStyle}>{description}</span>
                ) : null}
              </span>
            )}
          </div>
        </div>
        {footer && (
          <div style={footerStyle}>{footer}</div>
        )}
      </div>
    </div>
  );
}

const wrapStyle: CSSProperties = {
  padding: "0 var(--space-md)",
  marginTop: "var(--space-sm)",
};

const cardStyle: CSSProperties = {
  overflow: "hidden",
  background: "var(--color-surface)",
  borderRadius: "var(--radius-card)",
  border: "1px solid var(--color-line)",
  boxShadow: "0 1px 4px rgba(31,71,61,0.05)",
};

const contentStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "12px 14px",
};

const thumbWrapStyle: CSSProperties = {
  flexShrink: 0,
};

const infoStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "2px",
  flex: 1,
  minWidth: 0,
};

const titleStyle: CSSProperties = {
  fontSize: "15px",
  fontWeight: 700,
  color: "var(--color-ink)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const metaLineStyle: CSSProperties = {
  fontSize: "12px",
  color: "var(--color-muted)",
  display: "flex",
  alignItems: "center",
  gap: "3px",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const metaSepStyle: CSSProperties = {
  color: "var(--color-line)",
  margin: "0 2px",
};

const descSpanStyle: CSSProperties = {
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const footerStyle: CSSProperties = {
  borderTop: "1px solid var(--color-line)",
  padding: "8px 14px",
};

/** 缩略图占位（无图片时使用）。 */
export const formSummaryThumbFallbackStyle: CSSProperties = {
  width: "44px",
  height: "44px",
  borderRadius: "12px",
  background: "var(--color-mist)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

/** 缩略图图片样式。 */
export const formSummaryThumbImageStyle: CSSProperties = {
  width: "44px",
  height: "44px",
  objectFit: "cover",
  borderRadius: "12px",
  border: "2px solid #fff",
  boxShadow: "0 1px 4px rgba(31,71,61,0.1)",
};
