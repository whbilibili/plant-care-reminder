import { familyRoleValues } from "./validators";

export type FamilyRole = (typeof familyRoleValues)[number];

/**
 * 判断角色是否具备管理员及以上权限（owner 或 admin）。
 * 用于统一替代各 mutation 中 `role !== "admin"` 的散落判断。
 */
export function isAtLeastAdmin(role: FamilyRole): boolean {
  return role === "owner" || role === "admin";
}
