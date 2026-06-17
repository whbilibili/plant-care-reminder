import type { CSSProperties, ReactNode } from "react";

interface EmptyStateProps {
  actions?: ReactNode;
  badge?: string;
  description: ReactNode;
  minHeight?: string;
  title: ReactNode;
}

export function EmptyState({
  actions,
  badge = "提示",
  description,
  minHeight = "200px",
  title,
}: EmptyStateProps) {
  return (
    <div style={{ ...panelStyle, minHeight }}>
      <div style={contentStyle}>
        <span style={badgeStyle}>{badge}</span>
        <h2 style={titleStyle}>{title}</h2>
        <div style={descriptionStyle}>{description}</div>
        {actions ? <div style={actionsStyle}>{actions}</div> : null}
      </div>
    </div>
  );
}

const panelStyle: CSSProperties = {
  borderRadius: "20px",
  border: "1px dashed var(--color-line)",
  background: "var(--color-mist)",
  padding: "18px",
  display: "flex",
  alignItems: "center",
};

const contentStyle: CSSProperties = {
  display: "grid",
  gap: "10px",
};

const badgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "fit-content",
  minHeight: "28px",
  padding: "0 12px",
  borderRadius: "999px",
  background: "var(--color-mist)",
  color: "var(--color-leaf)",
  fontSize: "0.78rem",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const titleStyle: CSSProperties = {
  margin: 0,
  color: "var(--color-ink)",
  fontSize: "1.2rem",
  lineHeight: 1.2,
};

const descriptionStyle: CSSProperties = {
  color: "var(--color-muted)",
  fontSize: "0.92rem",
  lineHeight: 1.6,
};

const actionsStyle: CSSProperties = {
  display: "grid",
  gap: "12px",
  marginTop: "6px",
};
