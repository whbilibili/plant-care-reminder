import type { CSSProperties, InputHTMLAttributes, ReactNode } from "react";

import { FormError } from "./FormError";

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  errorMessage?: string | null;
  hint?: ReactNode;
  label: string;
}

export function InputField({
  errorMessage,
  hint,
  id,
  label,
  style,
  ...inputProps
}: InputFieldProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <label htmlFor={inputId} style={wrapStyle}>
      <span style={labelStyle}>{label}</span>
      <input
        {...inputProps}
        id={inputId}
        style={{
          ...inputStyle,
          ...(errorMessage ? inputErrorStyle : null),
          ...style,
        }}
      />
      {hint ? <span style={hintStyle}>{hint}</span> : null}
      <FormError message={errorMessage} />
    </label>
  );
}

const wrapStyle: CSSProperties = {
  display: "grid",
  gap: "var(--space-sm)",
};

const labelStyle: CSSProperties = {
  color: "var(--color-ink)",
  fontSize: "14px",
  fontWeight: 700,
};

const inputStyle: CSSProperties = {
  minHeight: "48px",
  borderRadius: "var(--radius-input)",
  border: "1px solid var(--color-line)",
  background: "var(--color-surface)",
  color: "var(--color-ink)",
  padding: "0 14px",
  fontSize: "14px",
};

const inputErrorStyle: CSSProperties = {
  borderColor: "var(--color-error)",
  boxShadow: "0 0 0 3px rgba(197,48,48,0.12)",
};

const hintStyle: CSSProperties = {
  color: "var(--color-muted)",
  fontSize: "12px",
  lineHeight: 1.5,
};
