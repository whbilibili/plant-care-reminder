import type { CSSProperties } from "react";
import type { FamilyRole } from "../../types/domain";

interface RoleBadgeProps {
  role: FamilyRole;
}

/**
 * RoleBadge — 成员角色标签（ROLE-007）。
 *
 * owner → 品牌绿（--color-leaf）背景 + 白字，文案「所有者」。
 * admin → 灰色（--color-muted）文字 + --color-mist 背景 + --color-line 描边，文案「管理员」。
 * member → 不渲染（返回 null）。
 */
export function RoleBadge({ role }: RoleBadgeProps) {
  if (role === "member") return null;

  const isOwner = role === "owner";

  return (
    <span
      aria-label={isOwner ? "所有者" : "管理员"}
      style={isOwner ? ownerBadgeStyle : adminBadgeStyle}
    >
      {isOwner ? "所有者" : "管理员"}
    </span>
  );
}

const baseBadgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "1px 6px",
  borderRadius: "var(--radius-pill)",
  fontSize: "11px",
  fontWeight: 700,
};

const ownerBadgeStyle: CSSProperties = {
  ...baseBadgeStyle,
  background: "var(--color-leaf)",
  color: "var(--color-paper)",
};

const adminBadgeStyle: CSSProperties = {
  ...baseBadgeStyle,
  background: "var(--color-mist)",
  color: "var(--color-muted)",
  border: "1px solid var(--color-line)",
};
