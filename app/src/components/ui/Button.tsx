import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  fullWidth?: boolean;
  variant?: ButtonVariant;
}

const variantStyles: Record<ButtonVariant, CSSProperties> = {
  primary: {
    background: "var(--color-leaf)",
    color: "#ffffff",
    border: "1px solid transparent",
    boxShadow: "var(--shadow-card)",
  },
  secondary: {
    background: "var(--color-surface)",
    color: "var(--color-leaf)",
    border: "1px solid var(--color-line)",
  },
  ghost: {
    background: "rgba(255,255,255,0.65)",
    color: "var(--color-muted)",
    border: "1px solid var(--color-line)",
  },
};

export function Button({
  children,
  disabled,
  fullWidth = true,
  style,
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled}
      style={{
        ...baseStyle,
        ...variantStyles[variant],
        width: fullWidth ? "100%" : undefined,
        opacity: disabled ? 0.72 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

const baseStyle: CSSProperties = {
  appearance: "none",
  minHeight: "54px",
  borderRadius: "18px",
  padding: "0 18px",
  fontSize: "1rem",
  fontWeight: 700,
  transition: "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",
};
