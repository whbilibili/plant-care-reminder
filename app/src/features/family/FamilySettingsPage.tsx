import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Bell, ChevronRight, DoorOpen, Home, LogOut, Pencil, Users } from "lucide-react";

import { api } from "../../../convex/_generated/api";
import { ConfirmSheet } from "../../components/ui/ConfirmSheet";
import { GroupedSurface, GroupedSurfaceDivider } from "../../components/ui/GroupedSurface";
import { Icon } from "../../components/ui/Icon";
import { InviteCard } from "../../components/ui/InviteCard";
import { FamilyNameEditSheet } from "./FamilyNameEditSheet";
import { MemberAvatar } from "./MemberAvatar";
import { navigate } from "../../app/router";
import { normalizeSubscription } from "../notifications/normalizeSubscription";
import type { FamilyRole } from "../../types/domain";

/* ── Web Push 辅助函数（与 NotificationPromptCard 共用逻辑） ── */

function toApplicationServerKey(value: string) {
  const padded = value
    .padEnd(Math.ceil(value.length / 4) * 4, "=")
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const decoded = window.atob(padded);
  return Uint8Array.from(decoded, (c) => c.charCodeAt(0));
}

function isStandaloneDisplayMode() {
  return window.matchMedia("(display-mode: standalone)").matches;
}

function deriveDeviceLabel() {
  const ua = window.navigator.userAgent.toLowerCase();
  if (/iphone/.test(ua))
    return isStandaloneDisplayMode() ? "iPhone 主屏幕应用" : "iPhone 浏览器";
  if (/ipad/.test(ua))
    return isStandaloneDisplayMode() ? "iPad 主屏幕应用" : "iPad 浏览器";
  if (/macintosh/.test(ua)) return "Mac 浏览器";
  return "家庭设备";
}

/**
 * 把 leaveFamily 后端错误翻译为面向用户的友好中文文案（SET3-005）。
 * 唯一管理员被拒（后端文案含 "only admin"）单独兜底，其余统一兜底。
 */
function translateLeaveFamilyError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (message.toLowerCase().includes("only admin")) {
    return "你是这个家庭目前唯一的管理员，请先把管理员转交给其他家人，再退出家庭。";
  }
  return "退出家庭失败，请稍后再试。";
}

/** 据邀请码拼接可分享的邀请链接：origin/join/{inviteCode}。 */
function buildInviteLink(inviteCode: string): string {
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "";
  return `${origin}/join/${encodeURIComponent(inviteCode)}`;
}

function formatRole(role: FamilyRole): string {
  return role === "admin" ? "管理员" : "成员";
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  return new Date(timestamp).toLocaleDateString("zh-CN");
}

export function FamilySettingsPage() {
  const { signOut } = useAuthActions();
  const summary = useQuery(api.families.getFamilySettingsSummary, {});
  const leaveFamily = useMutation(api.families.leaveFamily);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [familyNameSheetOpen, setFamilyNameSheetOpen] = useState(false);
  const [signOutSheetOpen, setSignOutSheetOpen] = useState(false);
  const [leaveSheetOpen, setLeaveSheetOpen] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const hasSubscription = useQuery(api.notifications.hasActiveSubscription, {});
  const savePushSubscription = useMutation(api.notifications.savePushSubscription);
  const removeMySubscriptions = useMutation(api.notifications.removeMySubscriptions);
  const [isTogglingNotif, setIsTogglingNotif] = useState(false);

  // 真实的通知开关状态：基于后端是否有有效订阅
  const notificationsEnabled = hasSubscription === true;

  // 自动同步：系统已授权通知但后端无订阅记录时，自动补录一次订阅
  const autoSyncTriggered = useRef(false);
  useEffect(() => {
    if (autoSyncTriggered.current) return;
    if (hasSubscription !== false) return; // 还在加载或已有订阅
    if (
      !("Notification" in window) ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      return;
    }
    if (Notification.permission !== "granted") return;

    autoSyncTriggered.current = true;

    // 异步补录订阅
    void (async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as
          | string
          | undefined;

        const existingSub = await registration.pushManager.getSubscription();
        const subscription =
          existingSub ??
          (await registration.pushManager.subscribe(
            vapidPublicKey
              ? {
                  userVisibleOnly: true,
                  applicationServerKey: toApplicationServerKey(vapidPublicKey),
                }
              : { userVisibleOnly: true },
          ));

        const json = subscription.toJSON();
        const normalized = normalizeSubscription(json as {
          endpoint: string;
          keys?: { auth?: string | null; p256dh?: string | null } | null;
        });

        await savePushSubscription({
          ...normalized,
          deviceLabel: deriveDeviceLabel(),
        });
      } catch {
        // 自动同步失败时静默处理，用户仍可通过手动点击开关重试
      }
    })();
  }, [hasSubscription, savePushSubscription]);

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await signOut();
    } catch {
      setIsSigningOut(false);
      setSignOutSheetOpen(false);
    }
  }

  async function handleLeaveFamily() {
    setLeaveError(null);
    setIsLeaving(true);
    try {
      await leaveFamily({});
    } catch (error) {
      setLeaveError(translateLeaveFamilyError(error));
      setIsLeaving(false);
    }
  }

  function closeLeaveSheet() {
    setLeaveSheetOpen(false);
    setLeaveError(null);
  }

  async function handleToggleNotifications() {
    if (isTogglingNotif) return;
    setIsTogglingNotif(true);
    try {
      if (notificationsEnabled) {
        // 关闭：移除当前用户的所有订阅
        await removeMySubscriptions({});
      } else {
        // 开启：请求权限 → 订阅 PushManager → 保存到后端
        if (
          !("serviceWorker" in navigator) ||
          !("Notification" in window) ||
          !("PushManager" in window)
        ) {
          return; // 不支持 Web Push，静默退出
        }

        const permission =
          Notification.permission === "granted"
            ? "granted"
            : await Notification.requestPermission();
        if (permission !== "granted") {
          return; // 用户拒绝或忽略，不做任何操作
        }

        const registration = await navigator.serviceWorker.ready;
        const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as
          | string
          | undefined;

        const existingSub = await registration.pushManager.getSubscription();
        const subscription =
          existingSub ??
          (await registration.pushManager.subscribe(
            vapidPublicKey
              ? {
                  userVisibleOnly: true,
                  applicationServerKey: toApplicationServerKey(vapidPublicKey),
                }
              : { userVisibleOnly: true },
          ));

        const json = subscription.toJSON();
        const normalized = normalizeSubscription(json as {
          endpoint: string;
          keys?: { auth?: string | null; p256dh?: string | null } | null;
        });

        await savePushSubscription({
          ...normalized,
          deviceLabel: deriveDeviceLabel(),
        });
      }
    } finally {
      setIsTogglingNotif(false);
    }
  }

  if (summary === undefined) {
    return (
      <section style={pageStyle}>
        <div style={headerAreaStyle}>
          <h1 style={pageTitleStyle}>设置</h1>
          <p style={subtitleStyle}>加载中…</p>
        </div>
        <section style={loadingCardStyle}>
          <p style={loadingTextStyle}>正在同步最新的家庭信息…</p>
        </section>
      </section>
    );
  }

  const currentMember = summary.members.find((member) => member.isCurrentUser);
  const myDisplayName = currentMember?.displayName ?? "我";
  const isAdmin = summary.currentUserRole === "admin";

  const isLastMember = summary.memberCount <= 1;
  const leaveTitle = isLastMember
    ? "退出后将解散这个家庭"
    : "确认退出这个家庭吗？";
  const leaveDescription = isLastMember
    ? `你是「${summary.familyName}」的最后一名成员，退出后这个家庭会被解散，里面的所有植物、提醒和养护记录都会被永久删除，且无法恢复。`
    : `退出后你将离开「${summary.familyName}」，家庭里的养护数据仍由其他家人保留，需要重新被邀请才能回来。`;

  return (
    <section style={pageStyle}>
      {/* Top area: title + subtitle + avatar */}
      <div style={headerAreaStyle}>
        <div style={headerTextStyle}>
          <h1 style={pageTitleStyle}>设置</h1>
          <p style={subtitleStyle}>
            {myDisplayName} · {isAdmin ? "家庭管理员" : "家庭成员"}
          </p>
        </div>
        <button
          onClick={() => navigate("/settings/profile")}
          style={headerAvatarButtonStyle}
          type="button"
          aria-label="编辑个人资料"
        >
          <MemberAvatar
            name={myDisplayName}
            imageStorageId={currentMember?.imageStorageId ?? null}
          />
          <Icon icon={ChevronRight} size={16} colorVar="--color-muted" />
        </button>
      </div>

      {/* Family summary card */}
      <GroupedSurface>
        <div style={familySummaryRowStyle}>
          <div style={familyIconCircleStyle}>
            <Icon icon={Home} size={20} colorVar="--color-leaf" />
          </div>
          <div style={familySummaryInfoStyle}>
            <div style={familySummaryNameLineStyle}>
              <span style={familySummaryNameStyle}>{summary.familyName}</span>
              <span style={adminBadgeStyle}>
                {isAdmin ? "家庭管理员" : "成员"}
              </span>
            </div>
            <p style={familySummaryMetaStyle}>
              {summary.memberCount} 位成员 · 创建于 2024-06-18
            </p>
          </div>
          {isAdmin ? (
            <button
              onClick={() => setFamilyNameSheetOpen(true)}
              style={editLinkStyle}
              type="button"
              aria-label="编辑家庭信息"
            >
              <Icon icon={Pencil} size={14} />
              <span>编辑</span>
              <Icon icon={ChevronRight} size={14} />
            </button>
          ) : null}
        </div>
      </GroupedSurface>

      {/* Invite section */}
      <InviteCard
        inviteCode={summary.inviteCode}
        inviteLink={buildInviteLink(summary.inviteCode)}
        isAdmin={isAdmin}
      />

      {/* Notification toggle row */}
      <GroupedSurface>
        <div style={notificationRowStyle}>
          <div style={notificationIconStyle}>
            <Icon icon={Bell} size={20} colorVar="--color-leaf" />
          </div>
          <div style={notificationTextStyle}>
            <span style={notificationTitleStyle}>养护提醒通知</span>
            <span style={notificationDescStyle}>
              接收任务到期、天气提醒等通知
            </span>
          </div>
          <button
            onClick={() => void handleToggleNotifications()}
            disabled={isTogglingNotif || hasSubscription === undefined}
            style={toggleTrackStyle(notificationsEnabled)}
            type="button"
            role="switch"
            aria-checked={notificationsEnabled}
            aria-label="养护提醒通知"
          >
            <span style={toggleThumbStyle(notificationsEnabled)} />
          </button>
        </div>
      </GroupedSurface>

      {/* Members section */}
      <GroupedSurface
        title={`家庭成员（${summary.memberCount}）`}
        titleIcon={Users}
        titleAction={
          isAdmin ? (
            <button
              onClick={() => navigate("/settings/members")}
              style={manageMembersLinkStyle}
              type="button"
            >
              管理成员 &gt;
            </button>
          ) : null
        }
      >
        {summary.members.map((member, index) => {
          const label = member.displayName?.trim() || member.email || "家庭成员";
          return (
            <div key={member.id}>
              {index > 0 ? <GroupedSurfaceDivider /> : null}
              <div style={memberRowStyle}>
                <MemberAvatar
                  name={member.displayName ?? member.email}
                  imageStorageId={member.imageStorageId ?? null}
                />
                <div style={memberInfoStyle}>
                  <div style={memberNameLineStyle}>
                    <span style={memberNameStyle}>{label}</span>
                    {member.isCurrentUser ? (
                      <span style={selfPillStyle}>你</span>
                    ) : null}
                    <span
                      style={
                        member.role === "admin"
                          ? roleBadgeAdminStyle
                          : roleBadgeMemberStyle
                      }
                    >
                      {formatRole(member.role)}
                    </span>
                  </div>
                  <span style={memberLastActiveStyle}>
                    最后活跃 {formatRelativeTime(member.joinedAt)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </GroupedSurface>

      {/* Danger actions */}
      <div style={dangerSectionStyle}>
        <button
          onClick={() => setLeaveSheetOpen(true)}
          style={dangerRowStyle}
          type="button"
        >
          <div style={dangerIconStyle}>
            <Icon icon={DoorOpen} size={20} colorVar="--color-muted" />
          </div>
          <div style={dangerTextStyle}>
            <span style={dangerLabelStyle}>退出家庭</span>
            <span style={dangerDescStyle}>你将不再是其他家庭的成员</span>
          </div>
          <Icon icon={ChevronRight} size={16} colorVar="--color-muted" />
        </button>

        <div style={dangerDividerStyle} />

        <button
          onClick={() => setSignOutSheetOpen(true)}
          style={dangerRowStyle}
          type="button"
        >
          <div style={dangerIconErrorStyle}>
            <Icon icon={LogOut} size={20} colorVar="--color-error" />
          </div>
          <div style={dangerTextStyle}>
            <span style={dangerLabelErrorStyle}>退出登录</span>
            <span style={dangerDescStyle}>退出当前账户</span>
          </div>
          <Icon icon={ChevronRight} size={16} colorVar="--color-muted" />
        </button>
      </div>

      {/* Sheets */}
      {familyNameSheetOpen ? (
        <FamilyNameEditSheet
          currentName={summary.familyName}
          onClose={() => setFamilyNameSheetOpen(false)}
        />
      ) : null}

      {leaveSheetOpen ? (
        <ConfirmSheet
          ariaLabel="退出家庭确认"
          confirmLabel={
            isLeaving ? "退出中…" : isLastMember ? "退出并解散家庭" : "退出家庭"
          }
          description={leaveError ?? leaveDescription}
          isSubmitting={isLeaving}
          onCancel={closeLeaveSheet}
          onConfirm={() => void handleLeaveFamily()}
          title={leaveTitle}
          variant="danger-solid"
        />
      ) : null}

      {signOutSheetOpen ? (
        <ConfirmSheet
          ariaLabel="退出登录确认"
          confirmLabel={isSigningOut ? "退出中…" : "退出登录"}
          description="退出后需要重新登录才能查看家庭和植物信息。"
          isSubmitting={isSigningOut}
          onCancel={() => setSignOutSheetOpen(false)}
          onConfirm={() => void handleSignOut()}
          title="确认退出登录吗？"
          variant="danger-outline"
        />
      ) : null}
    </section>
  );
}

/* ─── Styles ─── */

const pageStyle: CSSProperties = {
  display: "grid",
  gap: "var(--space-md)",
  paddingBottom: "80px",
};

const headerAreaStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "var(--space-md)",
};

const headerTextStyle: CSSProperties = {
  display: "grid",
  gap: "var(--space-xs)",
};

const pageTitleStyle: CSSProperties = {
  margin: 0,
  color: "var(--color-ink)",
  fontFamily: "var(--font-heading)",
  fontSize: "28px",
  fontWeight: 700,
  lineHeight: 1.2,
};

const subtitleStyle: CSSProperties = {
  margin: 0,
  color: "var(--color-muted)",
  fontSize: "14px",
  lineHeight: 1.4,
};

const headerAvatarButtonStyle: CSSProperties = {
  appearance: "none",
  background: "none",
  border: "none",
  padding: 0,
  display: "flex",
  alignItems: "center",
  gap: "4px",
  cursor: "pointer",
  flexShrink: 0,
};

const loadingCardStyle: CSSProperties = {
  borderRadius: "var(--radius-card)",
  padding: "var(--space-lg)",
  background: "var(--color-surface)",
  border: "1px solid var(--color-line)",
  textAlign: "center",
};

const loadingTextStyle: CSSProperties = {
  margin: 0,
  color: "var(--color-muted)",
  fontSize: "14px",
};

/* Family summary card */
const familySummaryRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-sm)",
  padding: "var(--space-md)",
};

const familyIconCircleStyle: CSSProperties = {
  flexShrink: 0,
  width: "40px",
  height: "40px",
  borderRadius: "var(--radius-pill)",
  background: "var(--color-mist)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const familySummaryInfoStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: "grid",
  gap: "2px",
};

const familySummaryNameLineStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-xs)",
  flexWrap: "wrap",
};

const familySummaryNameStyle: CSSProperties = {
  fontSize: "15px",
  fontWeight: 700,
  color: "var(--color-ink)",
};

const adminBadgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "2px 8px",
  borderRadius: "var(--radius-pill)",
  background: "var(--color-leaf)",
  color: "var(--color-paper)",
  fontSize: "11px",
  fontWeight: 700,
};

const familySummaryMetaStyle: CSSProperties = {
  margin: 0,
  fontSize: "12px",
  color: "var(--color-muted)",
  lineHeight: 1.4,
};

const editLinkStyle: CSSProperties = {
  appearance: "none",
  flexShrink: 0,
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  padding: "var(--space-xs) var(--space-sm)",
  background: "transparent",
  border: "none",
  color: "var(--color-leaf)",
  fontSize: "13px",
  fontWeight: 500,
  cursor: "pointer",
};

/* Notification toggle */
const notificationRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-sm)",
  padding: "var(--space-md)",
};

const notificationIconStyle: CSSProperties = {
  flexShrink: 0,
  width: "36px",
  height: "36px",
  borderRadius: "var(--radius-pill)",
  background: "var(--color-mist)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const notificationTextStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: "grid",
  gap: "2px",
};

const notificationTitleStyle: CSSProperties = {
  fontSize: "15px",
  fontWeight: 600,
  color: "var(--color-ink)",
};

const notificationDescStyle: CSSProperties = {
  fontSize: "12px",
  color: "var(--color-muted)",
  lineHeight: 1.4,
};

function toggleTrackStyle(on: boolean): CSSProperties {
  return {
    appearance: "none",
    flexShrink: 0,
    position: "relative",
    width: "48px",
    height: "28px",
    borderRadius: "14px",
    border: "none",
    background: on ? "var(--color-leaf)" : "var(--color-line)",
    cursor: "pointer",
    transition: "background 200ms ease",
    padding: 0,
  };
}

function toggleThumbStyle(on: boolean): CSSProperties {
  return {
    position: "absolute",
    top: "3px",
    left: on ? "23px" : "3px",
    width: "22px",
    height: "22px",
    borderRadius: "11px",
    background: "var(--color-paper)",
    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
    transition: "left 200ms ease",
  };
}

/* Members section */
const manageMembersLinkStyle: CSSProperties = {
  appearance: "none",
  background: "none",
  border: "none",
  padding: 0,
  color: "var(--color-leaf)",
  fontSize: "13px",
  fontWeight: 500,
  cursor: "pointer",
};

const memberRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-sm)",
  padding: "var(--space-sm) var(--space-md)",
};

const memberInfoStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: "grid",
  gap: "2px",
};

const memberNameLineStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-xs)",
  flexWrap: "wrap",
};

const memberNameStyle: CSSProperties = {
  fontSize: "14px",
  fontWeight: 600,
  color: "var(--color-ink)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const selfPillStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "1px 6px",
  borderRadius: "var(--radius-pill)",
  background: "var(--color-mist)",
  color: "var(--color-leaf)",
  fontSize: "11px",
  fontWeight: 700,
};

const roleBadgeAdminStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "1px 6px",
  borderRadius: "var(--radius-pill)",
  background: "var(--color-leaf)",
  color: "var(--color-paper)",
  fontSize: "11px",
  fontWeight: 700,
};

const roleBadgeMemberStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "1px 6px",
  borderRadius: "var(--radius-pill)",
  background: "var(--color-mist)",
  color: "var(--color-muted)",
  border: "1px solid var(--color-line)",
  fontSize: "11px",
  fontWeight: 700,
};

const memberLastActiveStyle: CSSProperties = {
  fontSize: "12px",
  color: "var(--color-muted)",
  lineHeight: 1.4,
};

/* Danger actions */
const dangerSectionStyle: CSSProperties = {
  marginTop: "var(--space-md)",
  borderRadius: "var(--radius-card)",
  background: "var(--color-surface)",
  border: "1px solid var(--color-line)",
  overflow: "hidden",
};

const dangerRowStyle: CSSProperties = {
  appearance: "none",
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: "var(--space-sm)",
  padding: "var(--space-md)",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  textAlign: "left",
};

const dangerDividerStyle: CSSProperties = {
  height: "1px",
  background: "var(--color-line)",
  marginLeft: "var(--space-md)",
  marginRight: "var(--space-md)",
};

const dangerIconStyle: CSSProperties = {
  flexShrink: 0,
  width: "36px",
  height: "36px",
  borderRadius: "var(--radius-pill)",
  background: "var(--color-mist)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const dangerIconErrorStyle: CSSProperties = {
  flexShrink: 0,
  width: "36px",
  height: "36px",
  borderRadius: "var(--radius-pill)",
  background: "color-mix(in srgb, var(--color-error) 10%, transparent)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const dangerTextStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: "grid",
  gap: "2px",
};

const dangerLabelStyle: CSSProperties = {
  fontSize: "15px",
  fontWeight: 600,
  color: "var(--color-ink)",
};

const dangerLabelErrorStyle: CSSProperties = {
  fontSize: "15px",
  fontWeight: 600,
  color: "var(--color-error)",
};

const dangerDescStyle: CSSProperties = {
  fontSize: "12px",
  color: "var(--color-muted)",
  lineHeight: 1.4,
};
