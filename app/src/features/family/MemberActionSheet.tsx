import { useMutation } from "convex/react";
import { useState } from "react";
import type { CSSProperties } from "react";
import { Crown, ShieldMinus, ShieldPlus, UserMinus } from "lucide-react";

import { api } from "../../../convex/_generated/api";
import { ConfirmSheet } from "../../components/ui/ConfirmSheet";
import { Icon } from "../../components/ui/Icon";
import type { FamilyRole } from "../../types/domain";

interface MemberTarget {
  userId: string;
  displayName: string;
  role: FamilyRole;
}

interface MemberActionSheetProps {
  target: MemberTarget;
  currentUserRole: FamilyRole;
  familyName: string;
  onClose: () => void;
}

type ConfirmKind = "remove" | "transfer";

interface ActionItem {
  key: string;
  label: string;
  icon: typeof Crown;
  colorVar: string;
  isDanger: boolean;
  onPress: () => void;
}

/**
 * 根据 PRD §4.1 权限矩阵计算可用操作列表。
 * 返回空数组表示不应显示 sheet（由调用方保证不触发）。
 */
function computeActions(
  currentRole: FamilyRole,
  targetRole: FamilyRole,
  handlers: {
    onPromote: () => void;
    onDemote: () => void;
    onRemove: () => void;
    onTransfer: () => void;
  },
): ActionItem[] {
  const actions: ActionItem[] = [];

  // member 无管理权限
  if (currentRole === "member") return actions;

  if (targetRole === "member") {
    // owner/admin 对 member：设为管理员、移除
    actions.push({
      key: "promote",
      label: "设为管理员",
      icon: ShieldPlus,
      colorVar: "--color-leaf",
      isDanger: false,
      onPress: handlers.onPromote,
    });
    actions.push({
      key: "remove",
      label: "移除成员",
      icon: UserMinus,
      colorVar: "--color-error",
      isDanger: true,
      onPress: handlers.onRemove,
    });
  } else if (targetRole === "admin") {
    // owner/admin 对 admin：撤销管理员、移除
    actions.push({
      key: "demote",
      label: "撤销管理员",
      icon: ShieldMinus,
      colorVar: "--color-muted",
      isDanger: false,
      onPress: handlers.onDemote,
    });
    actions.push({
      key: "remove",
      label: "移除成员",
      icon: UserMinus,
      colorVar: "--color-error",
      isDanger: true,
      onPress: handlers.onRemove,
    });
    // owner 对 admin 额外：转让所有者
    if (currentRole === "owner") {
      actions.push({
        key: "transfer",
        label: "转让所有者",
        icon: Crown,
        colorVar: "--color-error",
        isDanger: true,
        onPress: handlers.onTransfer,
      });
    }
  }
  // targetRole === "owner" → 空数组（不可操作 owner）

  return actions;
}

/**
 * MemberActionSheet — 成员操作底部菜单（ROLE-008）。
 *
 * 根据 currentUserRole 和 target.role 动态展示操作选项。
 * 破坏性操作（移除成员、转让所有者）触发 ConfirmSheet 二次确认。
 */
export function MemberActionSheet({
  target,
  currentUserRole,
  familyName,
  onClose,
}: MemberActionSheetProps) {
  const updateMemberRole = useMutation(api.families.updateMemberRole);
  const removeMember = useMutation(api.families.removeMember);
  const transferOwnership = useMutation(api.families.transferOwnership);

  const [confirmKind, setConfirmKind] = useState<ConfirmKind | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const actions = computeActions(currentUserRole, target.role, {
    onPromote: () => void handleRoleChange("admin"),
    onDemote: () => void handleRoleChange("member"),
    onRemove: () => setConfirmKind("remove"),
    onTransfer: () => setConfirmKind("transfer"),
  });

  async function handleRoleChange(newRole: "admin" | "member") {
    setIsSubmitting(true);
    try {
      await updateMemberRole({
        targetUserId: target.userId as never,
        newRole,
      });
      setIsSubmitting(false);
      onClose();
    } catch (error) {
      console.error("角色变更失败", error);
      setIsSubmitting(false);
    }
  }

  async function handleRemove() {
    setIsSubmitting(true);
    try {
      await removeMember({ targetUserId: target.userId as never });
      setIsSubmitting(false);
      onClose();
    } catch (error) {
      console.error("移除成员失败", error);
      setIsSubmitting(false);
    }
  }

  async function handleTransfer() {
    setIsSubmitting(true);
    try {
      await transferOwnership({ targetUserId: target.userId as never });
      setIsSubmitting(false);
      onClose();
    } catch (error) {
      console.error("转让所有者失败", error);
      setIsSubmitting(false);
    }
  }

  function cancelConfirm() {
    setConfirmKind(null);
  }

  // 二次确认 sheet
  if (confirmKind === "remove") {
    return (
      <ConfirmSheet
        ariaLabel="移除成员确认"
        confirmLabel={isSubmitting ? "移除中…" : "确认移除"}
        description={`移除后，${target.displayName} 将无法继续查看「${familyName}」的植物和养护任务。既有养护记录会保留在家庭历史中。`}
        isSubmitting={isSubmitting}
        onCancel={cancelConfirm}
        onConfirm={() => void handleRemove()}
        title={`移除 ${target.displayName}？`}
        variant="danger-solid"
      />
    );
  }

  if (confirmKind === "transfer") {
    return (
      <ConfirmSheet
        ariaLabel="转让所有者确认"
        confirmLabel={isSubmitting ? "转让中…" : "确认转让"}
        description={`转让后，${target.displayName} 将成为家庭所有者，拥有删除家庭等最高权限。你将变为管理员。`}
        isSubmitting={isSubmitting}
        onCancel={cancelConfirm}
        onConfirm={() => void handleTransfer()}
        title={`将所有者转让给 ${target.displayName}？`}
        variant="danger-solid"
      />
    );
  }

  // 主操作菜单
  return (
    <div
      aria-label={`${target.displayName} 的操作`}
      aria-modal="true"
      onClick={onClose}
      role="dialog"
      style={overlayStyle}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={sheetStyle}
      >
        <span aria-hidden="true" style={grabberStyle} />
        <p style={titleStyle}>{target.displayName}</p>

        <div style={actionListStyle}>
          {actions.map((action) => (
            <button
              key={action.key}
              disabled={isSubmitting}
              onClick={action.onPress}
              role="button"
              style={action.isDanger ? dangerActionStyle : normalActionStyle}
              type="button"
            >
              <Icon icon={action.icon} size={18} colorVar={action.colorVar} />
              <span>{action.label}</span>
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          style={cancelButtonStyle}
          type="button"
        >
          取消
        </button>
      </div>
    </div>
  );
}

/* ─── Styles ─── */

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 100,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "var(--space-md)",
  background: "var(--color-overlay-scrim)",
  backdropFilter: "blur(2px)",
};

const sheetStyle: CSSProperties = {
  width: "100%",
  maxWidth: "440px",
  background: "var(--color-surface)",
  borderRadius: "var(--radius-card)",
  padding: "var(--space-md) var(--space-lg) var(--space-lg)",
  display: "grid",
  justifyItems: "stretch",
  gap: "var(--space-sm)",
  boxShadow: "var(--shadow-sheet)",
};

const grabberStyle: CSSProperties = {
  justifySelf: "center",
  width: "40px",
  height: "4px",
  borderRadius: "var(--radius-pill)",
  background: "var(--color-line)",
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-heading)",
  fontSize: "17px",
  fontWeight: 700,
  color: "var(--color-ink)",
  textAlign: "center",
};

const actionListStyle: CSSProperties = {
  display: "grid",
  gap: "2px",
};

const actionBaseStyle: CSSProperties = {
  appearance: "none",
  display: "flex",
  alignItems: "center",
  gap: "var(--space-sm)",
  width: "100%",
  minHeight: "48px",
  padding: "0 var(--space-md)",
  border: "none",
  borderRadius: "var(--radius-button)",
  background: "transparent",
  fontSize: "15px",
  fontWeight: 500,
  cursor: "pointer",
  textAlign: "left",
};

const normalActionStyle: CSSProperties = {
  ...actionBaseStyle,
  color: "var(--color-ink)",
};

const dangerActionStyle: CSSProperties = {
  ...actionBaseStyle,
  color: "var(--color-error)",
};

const cancelButtonStyle: CSSProperties = {
  appearance: "none",
  width: "100%",
  minHeight: "44px",
  padding: "0 var(--space-md)",
  border: "1px solid var(--color-line)",
  borderRadius: "var(--radius-button)",
  background: "transparent",
  color: "var(--color-muted)",
  fontSize: "14px",
  fontWeight: 600,
  cursor: "pointer",
  marginTop: "var(--space-xs)",
};
