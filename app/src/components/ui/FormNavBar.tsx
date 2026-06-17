import { ChevronLeft } from "lucide-react";

import { Icon } from "./Icon";

interface FormNavBarProps {
  /** 居中标题文案，如"添加植物"/"编辑植物"。 */
  title: string;
  /** 返回操作回调。 */
  onBack: () => void;
  /** 保存按钮文案。 */
  saveLabel?: string;
  /** 点击保存。 */
  onSave?: () => void;
  /** 保存按钮是否 disabled。 */
  saveDisabled?: boolean;
}

/**
 * 表单页顶部导航条（T7）。
 * 返回 | 标题 | 保存
 */
export function FormNavBar({
  title,
  onBack,
  saveLabel = "保存",
  onSave,
  saveDisabled = false,
}: FormNavBarProps) {
  return (
    <nav aria-label="表单导航" style={navStyle}>
      <button
        aria-label="返回"
        onClick={onBack}
        style={backButtonStyle}
        type="button"
      >
        <Icon icon={ChevronLeft} size={20} strokeWidth={2} />
        <span style={backLabelStyle}>返回</span>
      </button>

      <span style={titleStyle}>{title}</span>

      {onSave ? (
        <button
          disabled={saveDisabled}
          onClick={onSave}
          style={{
            ...saveButtonStyle,
            opacity: saveDisabled ? 0.72 : 1,
            cursor: saveDisabled ? "not-allowed" : "pointer",
          }}
          type="button"
        >
          {saveLabel}
        </button>
      ) : (
        <span style={spacerStyle} />
      )}
    </nav>
  );
}

const navStyle: React.CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 40,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  minHeight: "48px",
  padding: "var(--space-sm) var(--space-md)",
  background: "var(--color-paper)",
};

const backButtonStyle: React.CSSProperties = {
  appearance: "none",
  display: "inline-flex",
  alignItems: "center",
  gap: "2px",
  padding: 0,
  border: "none",
  background: "transparent",
  color: "var(--color-ink)",
  cursor: "pointer",
  minWidth: "44px",
  minHeight: "44px",
};

const backLabelStyle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 500,
};

const titleStyle: React.CSSProperties = {
  position: "absolute",
  left: "50%",
  transform: "translateX(-50%)",
  maxWidth: "50%",
  fontFamily: "var(--font-heading)",
  fontSize: "16px",
  fontWeight: 700,
  color: "var(--color-ink)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const saveButtonStyle: React.CSSProperties = {
  appearance: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "40px",
  padding: "0 var(--space-md)",
  borderRadius: "var(--radius-button)",
  border: "1px solid transparent",
  background: "var(--color-gold)",
  color: "var(--color-ink)",
  fontSize: "14px",
  fontWeight: 700,
  boxShadow: "var(--shadow-card)",
};

const spacerStyle: React.CSSProperties = {
  width: "44px",
  flexShrink: 0,
};
