import type { LucideIcon } from "lucide-react";
import { CalendarCheck, Settings, Sprout } from "lucide-react";

import type { AppPath } from "../../app/router";
import { navigate } from "../../app/router";
import { Icon } from "../ui/Icon";

interface BottomNavProps {
  pathname: AppPath;
}

const navItems: Array<{ href: AppPath; label: string; icon: LucideIcon }> = [
  { href: "/todo", label: "待办", icon: CalendarCheck },
  { href: "/plants", label: "植物", icon: Sprout },
  { href: "/settings", label: "设置", icon: Settings },
];

export function BottomNav({ pathname }: BottomNavProps) {
  return (
    <nav aria-label="主导航" style={navStyle}>
      <div style={navInnerStyle}>
      {navItems.map((item) => {
        const isActive =
          item.href === "/plants" ? pathname.startsWith("/plants") : pathname === item.href;

        return (
          <button
            key={item.href}
            type="button"
            onClick={() => navigate(item.href)}
            aria-current={isActive ? "page" : undefined}
            style={{
              ...itemStyle,
              ...(isActive ? activeItemStyle : null),
            }}
          >
            <Icon icon={item.icon} size={22} />
            <span>{item.label}</span>
          </button>
        );
      })}
      </div>
    </nav>
  );
}

const navStyle: React.CSSProperties = {
  position: "fixed",
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 50,
  padding: "var(--space-sm) var(--space-md) calc(var(--space-sm) + env(safe-area-inset-bottom, 0px))",
  background: "var(--color-paper)",
  borderTop: "1px solid var(--color-line)",
};

const navInnerStyle: React.CSSProperties = {
  width: "min(100%, 520px)",
  margin: "0 auto",
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "var(--space-sm)",
};

const itemStyle: React.CSSProperties = {
  appearance: "none",
  border: "1px solid transparent",
  borderRadius: "var(--radius-button)",
  background: "transparent",
  color: "var(--color-muted)",
  height: "56px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "var(--space-xs)",
  fontSize: "11px",
  fontWeight: 600,
  cursor: "pointer",
  transition: "background 160ms ease, color 160ms ease, box-shadow 160ms ease",
};

const activeItemStyle: React.CSSProperties = {
  background: "var(--color-leaf)",
  color: "var(--color-paper)",
  fontWeight: 700,
  boxShadow: "0 6px 16px rgba(31, 71, 61, 0.28)",
};
