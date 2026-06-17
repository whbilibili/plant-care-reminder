import { useMutation } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

import { api } from "../../../convex/_generated/api";
import { Button } from "../../components/ui/Button";
import { ConfirmSheet } from "../../components/ui/ConfirmSheet";
import { SettingCardHeader } from "./SettingCardHeader";

type CopyStatus = "idle" | "copied" | "fallback_open";
type LinkCopyStatus = "idle" | "copied";

/** 据邀请码拼接可分享的邀请链接：origin/join/{inviteCode}。 */
function buildInviteLink(inviteCode: string): string {
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "";
  return `${origin}/join/${encodeURIComponent(inviteCode)}`;
}

interface InviteCodeCardProps {
  inviteCode: string;
  /** 仅管理员可见重置入口；非管理员完全不渲染（非置灰）。 */
  isAdmin: boolean;
}

/**
 * 邀请码卡（SET2-008）。高亮虚线容器展示邀请码 + 内嵌复制按钮（成功态切「已复制」），
 * 复制失败时给出长按兜底面板。管理员额外可见「重置邀请码」文字链：点击弹出 primary
 * 变体的 ConfirmSheet，确认后调 resetInviteCode 生成新码并 aria-live 提示重新分享。
 */
export function InviteCodeCard({ inviteCode, isAdmin }: InviteCodeCardProps) {
  const resetInviteCode = useMutation(api.families.resetInviteCode);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
  const [linkCopyStatus, setLinkCopyStatus] = useState<LinkCopyStatus>("idle");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [justReset, setJustReset] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const linkCopyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        clearTimeout(copyTimerRef.current);
      }
      if (linkCopyTimerRef.current !== null) {
        clearTimeout(linkCopyTimerRef.current);
      }
      if (resetNoticeTimerRef.current !== null) {
        clearTimeout(resetNoticeTimerRef.current);
      }
    };
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopyStatus("copied");
      copyTimerRef.current = setTimeout(() => {
        setCopyStatus("idle");
        copyTimerRef.current = null;
      }, 1500);
    } catch {
      setCopyStatus("fallback_open");
    }
  }, [inviteCode]);

  const handleCopyLink = useCallback(async () => {
    const link = buildInviteLink(inviteCode);
    try {
      await navigator.clipboard.writeText(link);
      setLinkCopyStatus("copied");
      linkCopyTimerRef.current = setTimeout(() => {
        setLinkCopyStatus("idle");
        linkCopyTimerRef.current = null;
      }, 1500);
    } catch {
      // 复制失败兜底：复用邀请码的长按面板提示。
      setCopyStatus("fallback_open");
    }
  }, [inviteCode]);

  const handleConfirmReset = useCallback(async () => {
    setIsResetting(true);
    try {
      await resetInviteCode({});
      setConfirmOpen(false);
      setCopyStatus("idle");
      setJustReset(true);
      resetNoticeTimerRef.current = setTimeout(() => {
        setJustReset(false);
        resetNoticeTimerRef.current = null;
      }, 6000);
    } finally {
      setIsResetting(false);
    }
  }, [resetInviteCode]);

  const copyButtonLabel = copyStatus === "copied" ? "已复制" : "复制邀请码";
  const copyButtonStyle: CSSProperties =
    copyStatus === "copied"
      ? { ...copyButtonBaseStyle, background: "var(--color-success)", color: "var(--color-surface)" }
      : copyButtonBaseStyle;
  const linkButtonLabel = linkCopyStatus === "copied" ? "链接已复制" : "复制邀请链接";

  return (
    <section style={cardStyle}>
      <SettingCardHeader eyebrow="邀请码与分享" icon="🔑" title="把这串邀请码发给家人" />
      <p style={bodyStyle}>
        家人在加入家庭时输入这串邀请码，就能进入同一个植物看板和提醒列表。
      </p>

      <div style={codeRowStyle}>
        <div style={codeContainerStyle}>
          <span style={codeTextStyle}>{inviteCode}</span>
        </div>
        <Button
          aria-label="复制邀请码"
          onClick={() => void handleCopy()}
          style={copyButtonStyle}
          type="button"
          variant="primary"
        >
          {copyButtonLabel}
        </Button>
      </div>

      <div style={shareDividerStyle}>
        <span style={shareDividerLineStyle} />
        <span style={shareDividerTextStyle}>或分享链接</span>
        <span style={shareDividerLineStyle} />
      </div>

      <button
        aria-label="复制邀请链接"
        onClick={() => void handleCopyLink()}
        style={
          linkCopyStatus === "copied"
            ? {
                ...copyLinkButtonStyle,
                background: "var(--color-success)",
                border: "1px solid var(--color-success)",
                color: "var(--color-surface)",
              }
            : copyLinkButtonStyle
        }
        type="button"
      >
        <span aria-hidden="true" style={linkIconStyle}>
          🔗
        </span>
        {linkButtonLabel}
      </button>

      {/* 重置成功后用 aria-live 通知新码已生成，提示重新分享。 */}
      <p aria-live="polite" style={srOnlyOrNoticeStyle(justReset)}>
        {justReset ? "邀请码已重置，请把新的邀请码重新分享给家人。" : ""}
      </p>

      {copyStatus === "fallback_open" ? (
        <div style={fallbackPanelStyle} role="region" aria-label="手动复制邀请码">
          <p style={fallbackCodeStyle}>{inviteCode}</p>
          <p style={fallbackHintStyle}>长按可复制</p>
          <p style={fallbackDescStyle}>你也可以直接把这串码发给家人</p>
        </div>
      ) : null}

      {isAdmin ? (
        <button onClick={() => setConfirmOpen(true)} style={resetLinkStyle} type="button">
          重置邀请码
        </button>
      ) : null}

      {confirmOpen ? (
        <ConfirmSheet
          ariaLabel="重置邀请码确认"
          confirmLabel={isResetting ? "重置中…" : "重置邀请码"}
          description="重置后旧邀请码会立刻失效，已加入的家人不受影响，但还没加入的人需要用新的邀请码。"
          isSubmitting={isResetting}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => void handleConfirmReset()}
          title="重置这个家庭的邀请码？"
          variant="primary"
        />
      ) : null}
    </section>
  );
}

function srOnlyOrNoticeStyle(visible: boolean): CSSProperties {
  if (!visible) {
    return {
      position: "absolute",
      width: "1px",
      height: "1px",
      padding: 0,
      margin: "-1px",
      overflow: "hidden",
      clip: "rect(0, 0, 0, 0)",
      whiteSpace: "nowrap",
      border: 0,
    };
  }
  return {
    margin: 0,
    color: "var(--color-success)",
    fontSize: "13px",
    fontWeight: 500,
    lineHeight: 1.5,
  };
}

const cardStyle: CSSProperties = {
  position: "relative",
  borderRadius: "var(--radius-card)",
  padding: "var(--space-md)",
  background: "var(--color-surface)",
  border: "1px solid var(--color-line)",
  boxShadow: "var(--shadow-card)",
  display: "grid",
  gap: "var(--space-sm)",
};

const bodyStyle: CSSProperties = {
  margin: 0,
  color: "var(--color-muted)",
  fontSize: "14px",
  lineHeight: 1.5,
};

const codeRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-sm)",
  flexWrap: "wrap",
};

const codeContainerStyle: CSSProperties = {
  flex: "1 1 160px",
  minWidth: "140px",
  background: "var(--color-mist)",
  border: "1px dashed var(--color-line)",
  borderRadius: "var(--radius-input)",
  padding: "var(--space-sm) var(--space-md)",
  textAlign: "center",
};

const codeTextStyle: CSSProperties = {
  color: "var(--color-leaf)",
  fontFamily: "var(--font-mono)",
  fontSize: "24px",
  fontWeight: 700,
  letterSpacing: "0.12em",
  lineHeight: 1,
  userSelect: "all",
};

const copyButtonBaseStyle: CSSProperties = {
  flex: "0 0 auto",
  minHeight: "44px",
  borderRadius: "var(--radius-button)",
  fontSize: "14px",
  fontWeight: 600,
};

const shareDividerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-sm)",
  margin: "var(--space-xs) 0",
};

const shareDividerLineStyle: CSSProperties = {
  flex: "1 1 auto",
  height: "1px",
  background: "var(--color-line)",
};

const shareDividerTextStyle: CSSProperties = {
  flex: "0 0 auto",
  color: "var(--color-muted)",
  fontSize: "12px",
  fontWeight: 500,
  letterSpacing: "0.02em",
};

const copyLinkButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "var(--space-xs)",
  width: "100%",
  appearance: "none",
  minHeight: "44px",
  padding: "0 var(--space-md)",
  borderRadius: "var(--radius-button)",
  background: "var(--color-mist)",
  border: "1px solid var(--color-line)",
  color: "var(--color-leaf)",
  fontSize: "14px",
  fontWeight: 600,
  cursor: "pointer",
  transition: "background 160ms ease, border-color 160ms ease, color 160ms ease",
};

const linkIconStyle: CSSProperties = {
  fontSize: "15px",
  lineHeight: 1,
};

const resetLinkStyle: CSSProperties = {
  justifySelf: "start",
  appearance: "none",
  background: "transparent",
  border: "none",
  padding: "var(--space-sm) 0",
  minHeight: "44px",
  color: "var(--color-muted)",
  fontSize: "13px",
  fontWeight: 500,
  textAlign: "left",
  cursor: "pointer",
};

const fallbackPanelStyle: CSSProperties = {
  background: "var(--color-mist)",
  borderRadius: "var(--radius-input)",
  padding: "var(--space-md)",
  border: "1px dashed var(--color-line)",
  display: "grid",
  gap: "var(--space-xs)",
  textAlign: "center",
};

const fallbackCodeStyle: CSSProperties = {
  margin: 0,
  color: "var(--color-leaf)",
  fontFamily: "var(--font-mono)",
  fontSize: "28px",
  fontWeight: 700,
  letterSpacing: "0.12em",
  lineHeight: 1,
  userSelect: "all",
};

const fallbackHintStyle: CSSProperties = {
  margin: 0,
  color: "var(--color-muted)",
  fontSize: "12px",
  lineHeight: 1.5,
};

const fallbackDescStyle: CSSProperties = {
  margin: 0,
  color: "var(--color-muted)",
  fontSize: "14px",
  lineHeight: 1.5,
};
