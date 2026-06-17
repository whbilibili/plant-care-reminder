import { getAuthUserId } from "@convex-dev/auth/server";

import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

export type AuthState =
  | "anonymous"
  | "authenticated_no_profile"
  | "authenticated_no_family"
  | "authenticated_in_family";

export interface CurrentUserContext {
  authState: AuthState;
  user: Doc<"users"> | null;
  membership: Doc<"familyMembers"> | null;
  userId: Id<"users"> | null;
  familyId: Id<"families"> | null;
  displayName: string | null;
}

export async function getCurrentUserRecord(
  ctx: QueryCtx,
): Promise<Doc<"users"> | null> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    return null;
  }

  return await ctx.db.get(userId);
}

export async function getCurrentUserContext(
  ctx: QueryCtx,
): Promise<CurrentUserContext> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    return {
      authState: "anonymous",
      user: null,
      membership: null,
      userId: null,
      familyId: null,
      displayName: null,
    };
  }

  const user = await ctx.db.get(userId);

  if (!user) {
    return {
      authState: "authenticated_no_profile",
      user: null,
      membership: null,
      userId: null,
      familyId: null,
      displayName: null,
    };
  }

  // §6.1 红线加固：原先用 .unique()，一旦边界脏数据导致同一 userId 出现 >1 条
  // familyMembers，.unique() 会直接抛错，使用户彻底无法进入应用（雪崩式不可用）。
  // 改为防御性读取：取第一条降级（保留"单一家庭"语义），多条时 console.warn 便于排查，
  // 严格不改变正常单 membership 用户的行为与单一家庭业务约束。
  const memberships = await ctx.db
    .query("familyMembers")
    .withIndex("by_userId", (q) => q.eq("userId", user._id))
    .collect();

  if (memberships.length > 1) {
    console.warn(
      `[getCurrentUserContext] userId=${user._id} 命中 ${memberships.length} 条 familyMembers（预期至多 1 条），` +
        "已降级取第一条，请排查脏数据来源。",
    );
  }

  const membership = memberships[0] ?? null;

  return {
      authState: membership ? "authenticated_in_family" : "authenticated_no_family",
      user,
      membership,
      userId: user._id,
      familyId: membership?.familyId ?? null,
      displayName: user.displayName ?? null,
    };
}
