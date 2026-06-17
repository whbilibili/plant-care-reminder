import { useState } from "react";
import type { CSSProperties } from "react";
import { Copy, Link } from "lucide-react";

import { Icon } from "./Icon";

interface InviteCardProps {
  /** 邀请码（6位）。 */
  inviteCode: string;
  /** 邀请链接。 */
  inviteLink: string;
  /** 是否为管理员。 */
  isAdmin: boolean;
}

type CopyState = "idle" | "copied" | "failed";

/**
 * InviteCard — 邀请家人加入。
 *
 * 结构：
 * - 标题「邀请家人加入」
 * - 邀请码大号 monospace 展示
 * - 次级按钮「复制邀请码」
 * - 主按钮「复制邀请链接」
 * - 失败/手动面板
 */
export function InviteCard({ inviteCode, inviteLink, isAdmin }: InviteCardProps) {
  const [linkCopyState, setLinkCopyState] = useState<CopyState>("idle");
  const [codeCopyState, setCodeCopyState] = useState<CopyState>("idle");
  const [showManual, setShowManual] = useState(false);

  async function copyToClipboard(text: string, type: "link" | "code") {
    const setState = type === "link" ? setLinkCopyState : setCodeCopyState;
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
      setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("failed");
      setShowManual(true);
    }
  }

  return (
    <section style={cardStyle}>
      <div style={headerRowStyle}>
        <Icon icon={Link} size={18} />
        <span style={headerTitleStyle}>邀请家人加入</span>
      </div>
      <p style={descStyle}>分享邀请码或链接，家人即可加入家庭</p>

      {/* 邀请码大号展示 */}
      <div style={codeDisplayStyle}>
        <span style={codeLabelStyle}>邀请码</span>
        <div style={codeRowStyle}>
          <span style={codeTextStyle}>{inviteCode}</span>
          <button
            onClick={() => void copyToClipboard(inviteCode, "code")}
            style={codeCopyButtonStyle}
            type="button"
          >
            <Icon icon={Copy} size={14} />
            <span>{codeCopyState === "copied" ? "已复制" : "复制邀请码"}</span>
          </button>
        </div>
        <span style={codeHintStyle}>家人输入邀请码即可加入</span>
      </div>

      {/* 主按钮：复制邀请链接 */}
      <button
        onClick={() => void copyToClipboard(inviteLink, "link")}
        style={primaryButtonStyle}
        type="button"
      >
        <Icon icon={Link} size={16} />
        <span>
          {linkCopyState === "copied" ? "已复制邀请链接" : "复制邀请链接"}
        </span>
      </button>

      {/* 复制失败时自动展开兜底面板 */}
      {showManual ? (
        <div style={manualPanelStyle}>
          <p style={manualTextStyle}>
            自动复制失败，请手动复制以下内容：
          </p>
          <code style={manualCodeStyle}>{inviteLink}</code>
        </div>
      ) : null}
    </section>
  );
}

const cardStyle: CSSProperties = {
  borderRadius: "var(--radius-card)",
  background: "var(--color-surface)",
  border: "1px solid var(--color-line)",
  padding: "var(--space-md)",
  display: "grid",
  gap: "var(--space-sm)",
};

const headerRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-sm)",
  color: "var(--color-leaf)",
};

const headerTitleStyle: CSSProperties = {
  fontSize: "15px",
  fontWeight: 700,
  color: "var(--color-ink)",
};

const descStyle: CSSProperties = {
  margin: 0,
  fontSize: "13px",
  color: "var(--color-muted)",
  lineHeight: 1.5,
};

const codeDisplayStyle: CSSProperties = {
  padding: "var(--space-md)",
  borderRadius: "var(--radius-button)",
  background: "var(--color-mist)",
  border: "1px dashed var(--color-line)",
  display: "grid",
  gap: "var(--space-xs)",
};

const codeLabelStyle: CSSProperties = {
  fontSize: "12px",
  color: "var(--color-muted)",
  fontWeight: 500,
};

const codeRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "var(--space-sm)",
};

const codeTextStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "24px",
  fontWeight: 700,
  color: "var(--color-ink)",
  letterSpacing: "0.08em",
};

const codeCopyButtonStyle: CSSProperties = {
  appearance: "none",
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  padding: "6px 12px",
  borderRadius: "var(--radius-pill)",
  border: "1px solid var(--color-line)",
  background: "var(--color-surface)",
  color: "var(--color-leaf)",
  fontSize: "12px",
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const codeHintStyle: CSSProperties = {
  fontSize: "12px",
  color: "var(--color-muted)",
};

const primaryButtonStyle: CSSProperties = {
  appearance: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "var(--space-sm)",
  width: "100%",
  minHeight: "48px",
  borderRadius: "var(--radius-button)",
  border: "none",
  background: "var(--color-leaf)",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: 600,
  cursor: "pointer",
  marginTop: "var(--space-xs)",
};

const manualPanelStyle: CSSProperties = {
  padding: "var(--space-sm) var(--space-md)",
  borderRadius: "var(--radius-button)",
  background: "var(--color-mist)",
  display: "grid",
  gap: "var(--space-xs)",
};

const manualTextStyle: CSSProperties = {
  margin: 0,
  fontSize: "12px",
  color: "var(--color-muted)",
};

const manualCodeStyle: CSSProperties = {
  fontSize: "11px",
  fontFamily: "var(--font-mono)",
  color: "var(--color-ink)",
  wordBreak: "break-all",
};
