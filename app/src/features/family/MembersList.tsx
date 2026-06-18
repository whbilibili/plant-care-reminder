import { useMutation } from "convex/react";
import { useState } from "react";
import type { CSSProperties } from "react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ConfirmSheet } from "../../components/ui/ConfirmSheet";
import type { FamilyRole } from "../../types/domain";
import { MemberAvatar } from "./MemberAvatar";

interface MemberSummary {
  displayName: string | null;
  email: string | null;
  id: string;
  imageStorageId?: string | null;
  isCreator: boolean;
  isCurrentUser: boolean;
  joinedAt: number;
  role: FamilyRole;
  userId: string;
}

interface MembersListProps {
  members: MemberSummary[];
  /** 当前用户是否为管理员，决定移除入口是否可能出现。 */
  isAdmin: boolean;
}

function formatRole(role: FamilyRole) {
  if (role === "owner") return "所有者";
  return role === "admin" ? "管理员" : "成员";
}

export function MembersList({ members, isAdmin }: MembersListProps) {
  const removeMember = useMutation(api.families.removeMember);
  const [removeTarget, setRemoveTarget] = useState<MemberSummary | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  async function handleConfirmRemove() {
    if (!removeTarget) return;
    setIsRemoving(true);
    try {
      await removeMember({
        targetUserId: removeTarget.userId as Id<"users">,
      });
      setRemoveTarget(null);
    } catch (error) {
      // 出错时保持 sheet 打开，便于用户重试；错误细节交由全局错误边界。
      console.error("移除成员失败", error);
    } finally {
      setIsRemoving(false);
    }
  }

  return (
    <div style={listStyle}>
      {members.map((member) => {
        const label = member.displayName?.trim() || member.email || "家庭成员";
        // 移除入口三条件：当前用户是 admin，且目标不是自己，且目标不是创建者。
        const canRemove =
          isAdmin && !member.isCurrentUser && !member.isCreator;

        return (
          <article key={member.id} style={memberRowStyle}>
            <MemberAvatar
              name={member.displayName ?? member.email}
              imageStorageId={member.imageStorageId ?? null}
            />
            <div style={identityStyle}>
              <div style={nameLineStyle}>
                <span style={nameStyle}>{label}</span>
                <span
                  style={
                    member.role === "admin"
                      ? adminBadgeStyle
                      : memberBadgeStyle
                  }
                >
                  {formatRole(member.role)}
                </span>
              </div>
              <p style={emailStyle}>
                {member.isCurrentUser ? "你 · " : ""}
                {member.email && member.email !== label ? member.email : ""}
              </p>
            </div>
            {canRemove ? (
              <button
                aria-label={`移除${label}`}
                onClick={(event) => {
                  event.stopPropagation();
                  setRemoveTarget(member);
                }}
                style={removeLinkStyle}
                type="button"
              >
                移除
              </button>
            ) : null}
          </article>
        );
      })}

      {removeTarget ? (
        <ConfirmSheet
          ariaLabel={`移除${removeTarget.displayName?.trim() || removeTarget.email || "成员"}`}
          confirmLabel={isRemoving ? "移除中…" : "移除成员"}
          description={`确认把「${removeTarget.displayName?.trim() || removeTarget.email || "该成员"}」移出家庭吗？TA 将无法再查看家庭和植物信息，但已完成的养护记录会保留。`}
          isSubmitting={isRemoving}
          onCancel={() => setRemoveTarget(null)}
          onConfirm={() => void handleConfirmRemove()}
          title="移出家庭成员"
          variant="danger-solid"
        />
      ) : null}
    </div>
  );
}

const listStyle: CSSProperties = {
  display: "grid",
  gap: "var(--space-sm)",
};

const memberRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-sm)",
  paddingBottom: "var(--space-sm)",
  borderBottom: "1px solid var(--color-line)",
};

const identityStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: "grid",
  gap: "2px",
};

const nameLineStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-xs)",
  flexWrap: "wrap",
};

const nameStyle: CSSProperties = {
  color: "var(--color-ink)",
  fontSize: "15px",
  fontWeight: 600,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  maxWidth: "100%",
};

const emailStyle: CSSProperties = {
  margin: 0,
  color: "var(--color-muted)",
  fontSize: "12px",
  lineHeight: 1.4,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};


const adminBadgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: "20px",
  padding: "0 var(--space-xs)",
  borderRadius: "var(--radius-pill)",
  background: "var(--color-leaf)",
  color: "var(--color-paper)",
  fontSize: "11px",
  fontWeight: 700,
};

const memberBadgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: "20px",
  padding: "0 var(--space-xs)",
  borderRadius: "var(--radius-pill)",
  background: "var(--color-mist)",
  color: "var(--color-muted)",
  border: "1px solid var(--color-line)",
  fontSize: "11px",
  fontWeight: 700,
};

const removeLinkStyle: CSSProperties = {
  appearance: "none",
  flex: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "44px",
  padding: "0 var(--space-xs)",
  background: "transparent",
  border: "none",
  color: "var(--color-error)",
  fontSize: "13px",
  fontWeight: 500,
  cursor: "pointer",
};
