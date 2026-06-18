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
              ...(isActive ? activeItemStyle : inactiveItemStyle),
            }}
          >
            <Icon icon={item.icon} size={20} />
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
  border: "none",
  borderRadius: "20px",
  background: "transparent",
  height: "48px",
  padding: "0 16px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "2px",
  fontSize: "11px",
  fontWeight: 500,
  cursor: "pointer",
  transition: "background 200ms ease, color 200ms ease",
};

const activeItemStyle: React.CSSProperties = {
  background: "rgba(45, 140, 100, 0.10)",
  color: "var(--color-leaf)",
  fontWeight: 600,
};

const inactiveItemStyle: React.CSSProperties = {
  color: "var(--color-muted)",
};
