interface FloatingAddButtonProps {
  onClick: () => void;
}

export function FloatingAddButton({ onClick }: FloatingAddButtonProps) {
  return (
    <button
      aria-label="添加养护任务"
      onClick={onClick}
      style={fabStyle}
      type="button"
    >
      + 添加养护
    </button>
  );
}

const fabStyle: React.CSSProperties = {
  position: "fixed",
  right: "var(--space-md)",
  bottom: "calc(56px + env(safe-area-inset-bottom, 0px) + var(--space-md))",
  zIndex: 30,
  appearance: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "12px 20px",
  border: "none",
  borderRadius: "var(--radius-pill)",
  background: "var(--color-gold)",
  color: "var(--color-ink)",
  fontSize: "14px",
  fontWeight: 600,
  cursor: "pointer",
  boxShadow: "var(--shadow-card-emphasis)",
  transition: "transform 100ms ease-out",
};
