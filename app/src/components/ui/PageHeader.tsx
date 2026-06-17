import type { CSSProperties, ReactNode } from "react";

interface PageHeaderProps {
  actions?: ReactNode;
  description?: ReactNode;
  eyebrow: string;
  title: ReactNode;
}

export function PageHeader({ actions, description, eyebrow, title }: PageHeaderProps) {
  return (
    <header style={wrapStyle}>
      <p style={eyebrowStyle}>{eyebrow}</p>
      <h1 style={titleStyle}>{title}</h1>
      {description ? <div style={descriptionStyle}>{description}</div> : null}
      {actions ? <div style={actionsStyle}>{actions}</div> : null}
    </header>
  );
}

const wrapStyle: CSSProperties = {
  display: "grid",
  gap: "12px",
};

const eyebrowStyle: CSSProperties = {
  margin: 0,
  color: "var(--color-leaf)",
  textTransform: "uppercase",
  letterSpacing: "0.16em",
  fontSize: "0.75rem",
  fontWeight: 700,
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: "clamp(2rem, 5vw, 3.1rem)",
  lineHeight: 1.02,
  fontWeight: 700,
  letterSpacing: "-0.05em",
  color: "var(--color-ink)",
  overflowWrap: "break-word",
  wordBreak: "break-word",
};

const descriptionStyle: CSSProperties = {
  color: "var(--color-muted)",
  fontSize: "1rem",
  lineHeight: 1.7,
};

const actionsStyle: CSSProperties = {
  display: "grid",
  gap: "12px",
};
