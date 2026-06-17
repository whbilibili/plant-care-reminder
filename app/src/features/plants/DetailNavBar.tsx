import { ChevronLeft } from "lucide-react";

import { Icon } from "../../components/ui/Icon";
import { navigate } from "../../app/router";

interface DetailNavBarProps {
  plantName: string;
}

/**
 * 详情页顶部导航条（T3 重构后不再有 ⋯ 菜单）。
 * 仅保留：返回按钮 + 居中植物名。
 */
export function DetailNavBar({ plantName }: DetailNavBarProps) {
  return (
    <nav aria-label="植物详情导航" style={navStyle}>
      <button
        aria-label="返回"
        onClick={() => navigate("/plants")}
        style={backButtonStyle}
        type="button"
      >
        <Icon icon={ChevronLeft} size={20} strokeWidth={2} />
      </button>

      <span style={titleStyle}>{plantName}</span>

      {/* 右侧占位保持标题居中 */}
      <span style={spacerStyle} />
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
  height: "48px",
  padding: "0 var(--space-sm)",
  background: "var(--color-paper)",
};

const backButtonStyle: React.CSSProperties = {
  appearance: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "44px",
  height: "44px",
  padding: 0,
  border: "none",
  borderRadius: "var(--radius-button)",
  background: "transparent",
  color: "var(--color-leaf)",
  cursor: "pointer",
};

const titleStyle: React.CSSProperties = {
  position: "absolute",
  left: "50%",
  transform: "translateX(-50%)",
  maxWidth: "60%",
  fontSize: "15px",
  fontWeight: 600,
  color: "var(--color-ink)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const spacerStyle: React.CSSProperties = {
  width: "44px",
  height: "44px",
  flexShrink: 0,
};
