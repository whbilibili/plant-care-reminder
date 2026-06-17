import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import type { CSSProperties } from "react";
import { ChevronRight, Home, Link, UserMinus } from "lucide-react";

import { api } from "../../../convex/_generated/api";
import { ConfirmSheet } from "../../components/ui/ConfirmSheet";
import { GroupedSurface, GroupedSurfaceDivider } from "../../components/ui/GroupedSurface";
import { Icon } from "../../components/ui/Icon";
import { ScreenNav } from "../../components/ui/ScreenNav";
import { navigate } from "../../app/router";
import { MemberAvatar } from "./MemberAvatar";
import type { FamilyRole } from "../../types/domain";

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

function translateRemoveError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (message.toLowerCase().includes("creator")) {
    return "无法移除家庭创建者。";
  }
  if (message.toLowerCase().includes("admin")) {
    return "只有管理员才能移除成员。";
  }
  return "移除成员失败，请稍后再试。";
}

/**
 * MembersManagePage — 管理成员（二级页面）。
 *
 * 入口：设置页「管理成员 >」。
 * 功能：查看成员列表、管理员可移除非自己/非创建者的成员。
 * 简化设计：不做独立成员详情页，直接在列表中操作移除（通过 ConfirmSheet 确认）。
 */
export function MembersManagePage() {
  const summary = useQuery(api.families.getFamilySettingsSummary, {});
  const removeMember = useMutation(api.families.removeMember);

  const [removingMember, setRemovingMember] = useState<{
    userId: string;
    displayName: string;
  } | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const isAdmin = summary?.currentUserRole === "admin";

  function handleBack() {
    navigate("/settings");
  }

  function openRemoveSheet(userId: string, displayName: string) {
    setRemoveError(null);
    setRemovingMember({ userId, displayName });
  }

  function closeRemoveSheet() {
    setRemovingMember(null);
    setRemoveError(null);
    setIsRemoving(false);
  }

  async function handleRemove() {
    if (!removingMember) return;
    setRemoveError(null);
    setIsRemoving(true);
    try {
      await removeMember({ targetUserId: removingMember.userId as never });
      closeRemoveSheet();
    } catch (error) {
      setRemoveError(translateRemoveError(error));
      setIsRemoving(false);
    }
  }

  if (summary === undefined) {
    return (
      <section style={pageStyle}>
        <ScreenNav title="管理成员" onBack={handleBack} />
        <p style={loadingStyle}>加载中…</p>
      </section>
    );
  }

  return (
    <section style={pageStyle}>
      <ScreenNav title="管理成员" onBack={handleBack} />

      <div style={contentStyle}>
        <div style={headerStyle}>
          <h1 style={titleStyle}>家庭成员</h1>
          <p style={descStyle}>
            {isAdmin
              ? "管理员可以查看成员状态，并移除不再参与养护的人。"
              : "查看家庭成员和他们的活跃状态。"}
          </p>
        </div>

        {/* 家庭摘要 + 成员列表 */}
        <GroupedSurface>
          {/* 家庭摘要行 */}
          <div style={familySummaryRowStyle}>
            <div style={familyIconStyle}>
              <Icon icon={Home} size={18} colorVar="--color-leaf" />
            </div>
            <span style={familyNameStyle}>{summary.familyName}</span>
            <span style={memberCountBadgeStyle}>
              {summary.memberCount} 位成员
            </span>
          </div>

          <GroupedSurfaceDivider />

          {/* 成员列表 */}
          {summary.members.map((member, index) => {
            const label =
              member.displayName?.trim() || member.email || "家庭成员";
            const canRemove =
              isAdmin && !member.isCurrentUser && !member.isCreator;

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
                    <span style={memberMetaStyle}>
                      最后活跃 {formatRelativeTime(member.joinedAt)}
                    </span>
                  </div>
                  {canRemove ? (
                    <button
                      onClick={() => openRemoveSheet(member.userId, label)}
                      style={removeButtonStyle}
                      type="button"
                      aria-label={`移除 ${label}`}
                    >
                      <Icon icon={UserMinus} size={16} colorVar="--color-error" />
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </GroupedSurface>

        {/* 邀请更多家人 */}
        <GroupedSurface>
          <button
            onClick={() => navigate("/settings")}
            style={inviteRowStyle}
            type="button"
          >
            <div style={inviteIconStyle}>
              <Icon icon={Link} size={18} colorVar="--color-leaf" />
            </div>
            <div style={inviteTextStyle}>
              <span style={inviteTitleStyle}>邀请更多家人</span>
              <span style={inviteDescStyle}>
                复制邀请链接或邀请码，让家人加入同一个看板。
              </span>
            </div>
            <Icon icon={ChevronRight} size={16} colorVar="--color-muted" />
          </button>
        </GroupedSurface>
      </div>

      {/* 移除成员确认 */}
      {removingMember ? (
        <ConfirmSheet
          ariaLabel="移除成员确认"
          confirmLabel={isRemoving ? "移除中…" : "确认移除成员"}
          description={
            removeError ??
            `移除后，${removingMember.displayName}将无法继续查看「${summary.familyName}」的植物和养护任务。既有养护记录会保留在家庭历史中。`
          }
          isSubmitting={isRemoving}
          onCancel={closeRemoveSheet}
          onConfirm={() => void handleRemove()}
          title={`移除${removingMember.displayName}？`}
          variant="danger-solid"
        />
      ) : null}
    </section>
  );
}

/* ─── Styles ─── */

const pageStyle: CSSProperties = {
  display: "grid",
  gap: "0",
};

const contentStyle: CSSProperties = {
  display: "grid",
  gap: "var(--space-md)",
  paddingBottom: "80px",
};

const headerStyle: CSSProperties = {
  display: "grid",
  gap: "var(--space-xs)",
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-heading)",
  fontSize: "20px",
  fontWeight: 700,
  color: "var(--color-ink)",
  lineHeight: 1.3,
};

const descStyle: CSSProperties = {
  margin: 0,
  fontSize: "13px",
  color: "var(--color-muted)",
  lineHeight: 1.5,
};

const loadingStyle: CSSProperties = {
  textAlign: "center",
  color: "var(--color-muted)",
  fontSize: "14px",
  padding: "var(--space-lg)",
};

/* Family summary */
const familySummaryRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-sm)",
  padding: "var(--space-md)",
};

const familyIconStyle: CSSProperties = {
  flexShrink: 0,
  width: "36px",
  height: "36px",
  borderRadius: "var(--radius-pill)",
  background: "var(--color-mist)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const familyNameStyle: CSSProperties = {
  flex: 1,
  fontSize: "15px",
  fontWeight: 700,
  color: "var(--color-ink)",
};

const memberCountBadgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "2px 10px",
  borderRadius: "var(--radius-pill)",
  background: "var(--color-mist)",
  color: "var(--color-leaf)",
  fontSize: "12px",
  fontWeight: 600,
};

/* Member rows */
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

const memberMetaStyle: CSSProperties = {
  fontSize: "12px",
  color: "var(--color-muted)",
  lineHeight: 1.4,
};

const removeButtonStyle: CSSProperties = {
  appearance: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "36px",
  height: "36px",
  padding: 0,
  border: "1px solid color-mix(in srgb, var(--color-error) 30%, transparent)",
  borderRadius: "var(--radius-pill)",
  background: "color-mix(in srgb, var(--color-error) 8%, transparent)",
  cursor: "pointer",
  flexShrink: 0,
};

/* Invite row */
const inviteRowStyle: CSSProperties = {
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

const inviteIconStyle: CSSProperties = {
  flexShrink: 0,
  width: "36px",
  height: "36px",
  borderRadius: "var(--radius-pill)",
  background: "var(--color-mist)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const inviteTextStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: "grid",
  gap: "2px",
};

const inviteTitleStyle: CSSProperties = {
  fontSize: "15px",
  fontWeight: 600,
  color: "var(--color-ink)",
};

const inviteDescStyle: CSSProperties = {
  fontSize: "12px",
  color: "var(--color-muted)",
  lineHeight: 1.4,
};
