import { useQuery } from "convex/react";
import { useState } from "react";
import type { CSSProperties } from "react";
import { ChevronRight, Home, Link } from "lucide-react";

import { api } from "../../../convex/_generated/api";
import { GroupedSurface, GroupedSurfaceDivider } from "../../components/ui/GroupedSurface";
import { Icon } from "../../components/ui/Icon";
import { ScreenNav } from "../../components/ui/ScreenNav";
import { navigate } from "../../app/router";
import { MemberActionSheet } from "./MemberActionSheet";
import { MemberAvatar } from "./MemberAvatar";
import { RoleBadge } from "./RoleBadge";
import type { FamilyRole } from "../../types/domain";

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

/**
 * MembersManagePage — 管理成员（二级页面）。
 *
 * 入口：设置页「管理成员 >」。
 * 功能：查看成员列表；owner/admin 点击成员行弹出 MemberActionSheet 进行角色管理。
 */
export function MembersManagePage() {
  const summary = useQuery(api.families.getFamilySettingsSummary, {});

  const [actionTarget, setActionTarget] = useState<{
    userId: string;
    displayName: string;
    role: FamilyRole;
  } | null>(null);

  const isAdmin =
    summary?.currentUserRole === "owner" ||
    summary?.currentUserRole === "admin";  // 用于描述文案

  function handleBack() {
    navigate("/settings");
  }

  /**
   * 判断是否应该为目标成员弹出操作菜单。
   * member 角色不弹；点自己不弹；点 owner 不弹（admin 视角）。
   */
  function shouldShowActions(
    currentRole: FamilyRole,
    targetRole: FamilyRole,
    isCurrentUser: boolean,
  ): boolean {
    if (currentRole === "member") return false;
    if (isCurrentUser) return false;
    if (targetRole === "owner" && currentRole !== "owner") return false;
    return true;
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
            const currentRole = summary.currentUserRole as FamilyRole | null;
            const canAct = currentRole != null && shouldShowActions(
              currentRole,
              member.role as FamilyRole,
              member.isCurrentUser,
            );

            return (
              <div key={member.id}>
                {index > 0 ? <GroupedSurfaceDivider /> : null}
                <div
                  onClick={canAct ? () => setActionTarget({ userId: member.userId, displayName: label, role: member.role as FamilyRole }) : undefined}
                  role={canAct ? "button" : undefined}
                  style={canAct ? memberRowClickableStyle : memberRowStyle}
                  tabIndex={canAct ? 0 : undefined}
                >
                  <MemberAvatar
                    name={member.displayName ?? member.email}
                    imageStorageId={member.imageStorageId ?? null}
                  />
                  <div style={memberInfoStyle}>
                    <div style={memberNameLineStyle}>
                      <span style={memberNameStyle}>{label}</span>
                      <RoleBadge role={member.role} />
                    </div>
                    <span style={memberMetaStyle}>
                      {member.isCurrentUser ? "你 · " : ""}
                      最后活跃 {formatRelativeTime(member.joinedAt)}
                    </span>
                  </div>
                  {canAct ? (
                    <Icon icon={ChevronRight} size={14} colorVar="--color-muted" />
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

      {/* 成员操作 Sheet */}
      {actionTarget && summary.currentUserRole ? (
        <MemberActionSheet
          target={actionTarget}
          currentUserRole={summary.currentUserRole as FamilyRole}
          familyName={summary.familyName}
          onClose={() => setActionTarget(null)}
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



const memberMetaStyle: CSSProperties = {
  fontSize: "12px",
  color: "var(--color-muted)",
  lineHeight: 1.4,
};

const memberRowClickableStyle: CSSProperties = {
  ...memberRowStyle,
  cursor: "pointer",
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
