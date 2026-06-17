import { Users } from "lucide-react";
import { useState } from "react";

import { Icon } from "../../components/ui/Icon";
import { EmailLoginForm } from "./EmailLoginForm";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

/**
 * AuthPage — v2 redesign.
 *
 * Layout:
 * 1. Top brand area (left-aligned, icon + title + subtitle)
 * 2. Rounded card with segmented login/register form
 * 3. Bottom invite hint row
 * Decorative SVG botanicals in background.
 */
type AuthView = "login" | "forgotPassword";

export function AuthPage() {
  const [view, setView] = useState<AuthView>("login");

  return (
    <section style={pageStyle}>
      {/* Background botanical image */}
      <div style={bgImageLayer} aria-hidden="true" />

      {/* Main content */}
      <div style={contentWrapper}>
        {/* Brand area — left aligned */}
        <header style={brandArea}>
          <div style={brandRow}>
            <span style={logoBox}>
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                {/* Pot */}
                <path
                  d="M8 18h8l-1 3H9l-1-3z"
                  fill="var(--color-leaf)"
                  opacity="0.25"
                />
                <rect x="7.5" y="17" width="9" height="1.5" rx="0.75" fill="var(--color-leaf)" opacity="0.35" />
                {/* Stem */}
                <path
                  d="M12 17V9"
                  stroke="var(--color-leaf)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                {/* Leaves */}
                <path
                  d="M12 13c-1.5-1-4-1.5-5-0.5 0.5 2 2.5 3 5 2.5"
                  stroke="var(--color-leaf)"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="rgba(31,71,61,0.1)"
                />
                <path
                  d="M12 10c1.5-1.2 4-1.8 5-0.8-0.3 2-2.5 3.2-5 2.8"
                  stroke="var(--color-leaf)"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="rgba(31,71,61,0.1)"
                />
                <path
                  d="M12 7c-1.2-1.5-1-4 0-5 1.5 1 2 3 1 5"
                  stroke="var(--color-leaf)"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="rgba(31,71,61,0.1)"
                />
              </svg>
            </span>
            <div>
              <h1 style={brandTitle}>植物养护</h1>
              <p style={brandSubtitle}>和家人一起照顾每一盆植物</p>
            </div>
          </div>
        </header>

        {/* Form card */}
        <div style={cardStyle}>
          {view === "login" ? (
            <EmailLoginForm onForgotPassword={() => setView("forgotPassword")} />
          ) : (
            <ForgotPasswordForm onBack={() => setView("login")} />
          )}
        </div>

        {/* Bottom invite hint */}
        <div style={inviteHint}>
          <Icon icon={Users} size={20} colorVar="--color-leaf" />
          <span style={inviteText}>收到家人邀请？登录或注册后会自动加入</span>
        </div>
      </div>
    </section>
  );
}

/* ===== Styles ===== */

const pageStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  paddingTop: "env(safe-area-inset-top, 0px)",
  background: "#f4f8f2",
  overflow: "auto",
  fontFamily: "var(--font-body)",
  zIndex: 10,
};

const contentWrapper: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-lg)",
  width: "100%",
  maxWidth: "420px",
  padding: "var(--space-xl) var(--space-md)",
  paddingTop: "calc(var(--space-xl) + 12px)",
  animation: "page-enter 600ms cubic-bezier(0.16, 1, 0.3, 1) both",
};

/* Brand */
const brandArea: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-xs)",
};

const brandRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-md)",
};

const logoBox: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "48px",
  height: "48px",
  borderRadius: "var(--radius-button)",
  background: "rgba(31, 71, 61, 0.08)",
  fontSize: "1.5rem",
  flexShrink: 0,
};

const brandTitle: React.CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-heading)",
  fontSize: "1.4rem",
  fontWeight: 700,
  color: "var(--color-ink)",
  lineHeight: 1.3,
};

const brandSubtitle: React.CSSProperties = {
  margin: 0,
  marginTop: "2px",
  fontSize: "0.85rem",
  color: "var(--color-muted)",
  lineHeight: 1.4,
};

/* Card */
const cardStyle: React.CSSProperties = {
  width: "100%",
  padding: "var(--space-lg)",
  borderRadius: "var(--radius-card)",
  background: "var(--color-paper)",
  boxShadow: "var(--shadow-card)",
  border: "1px solid var(--color-line)",
};

/* Invite hint */
const inviteHint: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "var(--space-sm)",
  padding: "var(--space-md) var(--space-xs)",
};

const inviteText: React.CSSProperties = {
  fontSize: "0.82rem",
  color: "var(--color-muted)",
};

/* Background botanical image layer */
const bgImageLayer: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  backgroundImage: "url(/backgrounds/bg-auth-botanical.png)",
  backgroundSize: "cover",
  backgroundPosition: "center top",
  backgroundRepeat: "no-repeat",
  pointerEvents: "none",
  zIndex: 0,
};
