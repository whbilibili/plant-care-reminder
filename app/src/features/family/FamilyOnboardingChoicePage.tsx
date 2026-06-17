import { useMutation } from "convex/react";
import { Check, ChevronRight, Home, Pencil, QrCode, Shield } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { api } from "../../../convex/_generated/api";
import { navigate } from "../../app/router";
import { Button } from "../../components/ui/Button";
import { GroupedSurface } from "../../components/ui/GroupedSurface";
import { Icon } from "../../components/ui/Icon";
import { ScreenNav } from "../../components/ui/ScreenNav";
import { MemberAvatar } from "./MemberAvatar";
import {
  clearPendingInviteCode,
  getPendingInviteCode,
} from "./usePendingInvite";

interface FamilyOnboardingChoicePageProps {
  displayName: string;
}

export function FamilyOnboardingChoicePage({
  displayName,
}: FamilyOnboardingChoicePageProps) {
  const joinFamilyByInviteCode = useMutation(api.families.joinFamilyByInviteCode);
  // 自动加入态：检测到暂存邀请码时进入「加入中」，跳过二选一页直接编排加入。
  const [autoJoinState, setAutoJoinState] = useState<
    "idle" | "joining" | "failed"
  >(() => (getPendingInviteCode() ? "joining" : "idle"));
  const [autoJoinError, setAutoJoinError] = useState<string | null>(null);
  // 防 StrictMode/重渲染重复触发：同一暂存码仅尝试一次自动加入。
  const hasAttemptedRef = useRef(false);

  useEffect(() => {
    const pendingCode = getPendingInviteCode();
    if (!pendingCode || hasAttemptedRef.current) {
      return;
    }
    hasAttemptedRef.current = true;

    let cancelled = false;
    void (async () => {
      try {
        await joinFamilyByInviteCode({ inviteCode: pendingCode });
        // 成功：清除暂存，RouteGate 会据新 familyId 放行；显式跳 /todo 更稳。
        clearPendingInviteCode();
        if (!cancelled) {
          navigate("/todo", true);
        }
      } catch (error) {
        // 失败（无效码/已失效/已在家庭等）：清除暂存避免反复失败，回落二选一页手动操作。
        clearPendingInviteCode();
        if (!cancelled) {
          setAutoJoinError(
            error instanceof Error
              ? error.message
              : "自动加入家庭失败，请手动输入邀请码重试。",
          );
          setAutoJoinState("failed");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [joinFamilyByInviteCode]);

  // 自动加入进行中：展示 botanical 基调的过渡态，跳过二选一页。
  if (autoJoinState === "joining") {
    return (
      <section style={pageStyle}>
        <ScreenNav title="" onBack={() => navigate("/onboarding/profile")} />
        <div style={joiningContainerStyle}>
          <p style={joiningTitleStyle}>正在加入家庭…</p>
          <p style={joiningBodyStyle}>
            正在为你连接家人的植物空间，请稍候
          </p>
        </div>
      </section>
    );
  }

  return (
    <section style={pageStyle}>
      {/* 顶部导航 */}
      <ScreenNav title="" onBack={() => navigate("/onboarding/profile")} />

      {/* 用户称呼条 */}
      <GroupedSurface style={greetingCardStyle}>
        <div style={greetingBandStyle}>
          <MemberAvatar name={displayName} />
          <span style={greetingNameStyle}>你的称呼：{displayName}</span>
          <button
            type="button"
            onClick={() => navigate("/onboarding/profile")}
            style={editLinkStyle}
          >
            <Icon icon={Pencil} size={13} strokeWidth={2} colorVar="--color-leaf" />
            编辑 <Icon icon={ChevronRight} size={14} strokeWidth={2} />
          </button>
        </div>
      </GroupedSurface>

      {/* 大标题 */}
      <header style={sectionHeaderStyle}>
        <h1 style={mainTitleStyle}>选择家庭空间</h1>
        <p style={subtitleStyle}>和家人一起照顾家里的植物</p>
      </header>

      {/* 自动加入失败提示 */}
      {autoJoinState === "failed" && autoJoinError ? (
        <p aria-live="polite" style={autoJoinErrorStyle}>
          {autoJoinError}
        </p>
      ) : null}

      {/* 选项一：创建新家庭 */}
      <GroupedSurface style={cardStyle}>
        <div style={cardInnerStyle}>
          <div style={cardTopRowStyle}>
            <div style={iconCircleGreenStyle}>
              <Icon icon={Home} size={26} strokeWidth={2} colorVar="--color-leaf" />
            </div>
            <div style={cardTextColumnStyle}>
              <h2 style={cardTitleStyle}>创建新家庭</h2>
              <p style={cardSubtitleStyle}>还没有家庭？从这里开始</p>
              <div style={checkRowStyle}>
                <span style={checkBadgeStyle}>
                  <Icon icon={Check} size={12} strokeWidth={3} style={{ color: "#fff" }} />
                </span>
                <span style={checkTextStyle}>你将成为家庭管理员</span>
              </div>
            </div>
          </div>
          <hr style={cardDividerStyle} />
          <Button
            variant="primary"
            fullWidth
            onClick={() => navigate("/onboarding/create-family")}
            style={primaryButtonStyle}
            type="button"
          >
            创建家庭 <Icon icon={ChevronRight} size={16} strokeWidth={2.5} />
          </Button>
        </div>
      </GroupedSurface>

      {/* 选项二：加入家人的家庭 */}
      <GroupedSurface style={cardStyle}>
        <div style={cardInnerStyle}>
          <div style={cardTopRowStyle}>
            <div style={iconCircleMutedStyle}>
              <Icon icon={QrCode} size={26} strokeWidth={2} colorVar="--color-muted" />
            </div>
            <div style={cardTextColumnStyle}>
              <h2 style={cardTitleStyle}>加入已有家庭</h2>
              <p style={cardSubtitleStyle}>家人已创建？输入邀请码加入</p>
              <div style={checkRowStyle}>
                <span style={checkBadgeStyle}>
                  <Icon icon={Check} size={12} strokeWidth={3} style={{ color: "#fff" }} />
                </span>
                <span style={checkTextStyle}>加入后共享植物和浇水提醒</span>
              </div>
            </div>
          </div>
          <hr style={cardDividerStyle} />
          <Button
            variant="secondary"
            fullWidth
            onClick={() => navigate("/onboarding/join-family")}
            style={secondaryButtonStyle}
            type="button"
          >
            输入邀请码 <Icon icon={ChevronRight} size={16} strokeWidth={2.5} />
          </Button>
        </div>
      </GroupedSurface>

      {/* 底部安全提示 */}
      <div style={hintRowStyle}>
        <Icon icon={Shield} size={16} strokeWidth={2} colorVar="--color-muted" />
        <span style={hintTextStyle}>
          邀请码由家庭管理员生成，仅限受邀人使用
        </span>
      </div>
    </section>
  );
}

/* ─── Styles ─── */

const pageStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-md)",
  paddingBottom: "var(--space-xl)",
};

const joiningContainerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "var(--space-sm)",
  padding: "var(--space-xl) var(--space-md)",
  textAlign: "center",
};

const joiningTitleStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-heading)",
  fontSize: "1.25rem",
  fontWeight: 700,
  color: "var(--color-ink)",
};

const joiningBodyStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--color-muted)",
  fontSize: "0.92rem",
  lineHeight: 1.6,
};

const greetingCardStyle: React.CSSProperties = {
  marginLeft: "var(--space-md)",
  marginRight: "var(--space-md)",
};

const greetingBandStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-sm)",
  padding: "var(--space-md)",
};

const greetingNameStyle: React.CSSProperties = {
  flex: 1,
  fontSize: "0.92rem",
  fontWeight: 500,
  color: "var(--color-ink)",
};

const editLinkStyle: React.CSSProperties = {
  appearance: "none",
  display: "inline-flex",
  alignItems: "center",
  gap: "2px",
  padding: 0,
  border: "none",
  background: "transparent",
  color: "var(--color-leaf)",
  fontSize: "0.85rem",
  fontWeight: 600,
  cursor: "pointer",
};

const sectionHeaderStyle: React.CSSProperties = {
  padding: "0 var(--space-md)",
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-xs)",
};

const mainTitleStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-heading)",
  fontSize: "1.5rem",
  fontWeight: 700,
  lineHeight: 1.25,
  color: "var(--color-ink)",
};

const subtitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "0.92rem",
  color: "var(--color-muted)",
  lineHeight: 1.5,
};

const autoJoinErrorStyle: React.CSSProperties = {
  margin: "0 var(--space-md)",
  padding: "var(--space-sm) var(--space-md)",
  borderRadius: "var(--radius-button)",
  background: "var(--color-mist)",
  color: "var(--color-error)",
  fontSize: "0.9rem",
  lineHeight: 1.5,
};

const cardStyle: React.CSSProperties = {
  marginLeft: "var(--space-md)",
  marginRight: "var(--space-md)",
};

/** 卡片内层：纵向排列（上半横排 + 分隔线 + 全宽按钮）。 */
const cardInnerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  padding: "var(--space-lg)",
  gap: 0,
};

/** 卡片上半区：icon + 文字组横向排列。 */
const cardTopRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-md)",
};

const cardTextColumnStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-sm)",
  flex: 1,
  minWidth: 0,
};

/** 上半区与按钮之间的分隔线。 */
const cardDividerStyle: React.CSSProperties = {
  border: "none",
  borderTop: "1px solid var(--color-line)",
  margin: "var(--space-md) 0",
};

const iconCircleGreenStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 56,
  height: 56,
  borderRadius: "50%",
  background: "var(--color-mist)",
  flexShrink: 0,
};

const iconCircleMutedStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 56,
  height: 56,
  borderRadius: "50%",
  background: "var(--color-mist)",
  flexShrink: 0,
};

const cardTitleStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-heading)",
  fontSize: "1.2rem",
  fontWeight: 800,
  color: "var(--color-ink)",
  lineHeight: 1.3,
};

const cardSubtitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "0.9rem",
  color: "var(--color-ink)",
  lineHeight: 1.5,
};

const checkRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  marginTop: "var(--space-xs)",
};

/** 勾选圆形徽标：绿底白勾。 */
const checkBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 18,
  height: 18,
  borderRadius: "50%",
  background: "var(--color-leaf)",
  flexShrink: 0,
};

const checkTextStyle: React.CSSProperties = {
  fontSize: "0.8rem",
  color: "var(--color-muted)",
  fontWeight: 400,
};

const primaryButtonStyle: React.CSSProperties = {
  background: "var(--color-leaf)",
  color: "#fff",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "4px",
};

const secondaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "4px",
};

const hintRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: "var(--space-xs)",
  padding: "var(--space-sm) var(--space-md)",
  marginTop: "var(--space-xs)",
};

const hintTextStyle: React.CSSProperties = {
  fontSize: "0.82rem",
  color: "var(--color-muted)",
  lineHeight: 1.5,
};
