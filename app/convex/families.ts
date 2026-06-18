import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getCurrentUserContext as loadCurrentUserContext } from "./lib/auth";
import { isAtLeastAdmin } from "./lib/roleHelpers";

const INVITE_CODE_LENGTH = 6;
const INVITE_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const FAMILY_NAME_MAX_LENGTH = 20;

function generateInviteCode() {
  let inviteCode = "";

  for (let index = 0; index < INVITE_CODE_LENGTH; index += 1) {
    const randomIndex = Math.floor(Math.random() * INVITE_CODE_ALPHABET.length);
    inviteCode += INVITE_CODE_ALPHABET[randomIndex];
  }

  return inviteCode;
}

function normalizeInviteCode(inviteCode: string) {
  return inviteCode.trim().toUpperCase();
}

async function generateUniqueInviteCode(ctx: MutationCtx): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const candidateInviteCode = generateInviteCode();
    const existingFamily = await ctx.db
      .query("families")
      .withIndex("by_inviteCode", (q) => q.eq("inviteCode", candidateInviteCode))
      .unique();

    if (!existingFamily) {
      return candidateInviteCode;
    }
  }

  throw new Error("Unable to generate a unique invite code. Please try again.");
}

export const createFamily = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const currentUserContext = await loadCurrentUserContext(ctx);

    if (!currentUserContext.userId) {
      throw new Error("You must be signed in to create a family.");
    }

    if (currentUserContext.familyId) {
      throw new Error("You already belong to a family.");
    }

    const name = args.name.trim();
    if (name.length === 0) {
      throw new Error("Family name is required.");
    }

    const inviteCode = await generateUniqueInviteCode(ctx);

    const createdAt = Date.now();

    const familyId = await ctx.db.insert("families", {
      name,
      inviteCode,
      createdAt,
      createdBy: currentUserContext.userId,
    });

    await ctx.db.insert("familyMembers", {
      familyId,
      userId: currentUserContext.userId,
      role: "owner",
      joinedAt: createdAt,
    });

    return {
      familyId,
      inviteCode,
    };
  },
});

export const joinFamilyByInviteCode = mutation({
  args: {
    inviteCode: v.string(),
  },
  handler: async (ctx, args) => {
    const currentUserContext = await loadCurrentUserContext(ctx);

    if (!currentUserContext.userId) {
      throw new Error("You must be signed in to join a family.");
    }

    if (currentUserContext.familyId) {
      throw new Error("You already belong to a family.");
    }

    const inviteCode = normalizeInviteCode(args.inviteCode);
    if (inviteCode.length === 0) {
      throw new Error("Invite code is required.");
    }

    const family = await ctx.db
      .query("families")
      .withIndex("by_inviteCode", (q) => q.eq("inviteCode", inviteCode))
      .unique();

    if (!family) {
      throw new Error("That invite code does not match any household.");
    }

    const existingMembership = await ctx.db
      .query("familyMembers")
      .withIndex("by_familyId_and_userId", (q) =>
        q.eq("familyId", family._id).eq("userId", currentUserContext.userId!),
      )
      .unique();

    if (existingMembership) {
      throw new Error("You are already a member of this family.");
    }

    await ctx.db.insert("familyMembers", {
      familyId: family._id,
      userId: currentUserContext.userId,
      role: "member",
      joinedAt: Date.now(),
    });

    return {
      familyId: family._id,
    };
  },
});

export const getFamilySettingsSummary = query({
  args: {},
  handler: async (ctx) => {
    const currentUserContext = await loadCurrentUserContext(ctx);

    if (!currentUserContext.userId || !currentUserContext.familyId) {
      throw new Error("You must belong to a family to view family settings.");
    }

    const family = await ctx.db.get(currentUserContext.familyId);
    if (!family) {
      throw new Error("Family record not found.");
    }

    const memberships = await ctx.db
      .query("familyMembers")
      .withIndex("by_familyId", (q) => q.eq("familyId", currentUserContext.familyId!))
      .collect();

    const members = await Promise.all(
      memberships.map(async (membership) => {
        const user = await ctx.db.get(membership.userId);

        return {
          id: membership._id,
          userId: membership.userId,
          role: membership.role,
          joinedAt: membership.joinedAt,
          displayName: user?.displayName ?? user?.name ?? null,
          email: user?.email ?? null,
          // 成员头像 storageId（D6）：前端用 getAvatarUrl 解析展示真实头像；无则回退首字母。
          imageStorageId: user?.imageStorageId ?? null,
          isCurrentUser: membership.userId === currentUserContext.userId,
          isCreator: membership.userId === family.createdBy,
          isOwner: membership.role === "owner",
        };
      }),
    );

    const rolePriority: Record<string, number> = { owner: -2, admin: -1, member: 0 };

    members.sort((left, right) => {
      const leftPriority = rolePriority[left.role] ?? 0;
      const rightPriority = rolePriority[right.role] ?? 0;
      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      if (left.isCurrentUser !== right.isCurrentUser) {
        return left.isCurrentUser ? -1 : 1;
      }

      return left.joinedAt - right.joinedAt;
    });

    const currentMember = members.find((member) => member.isCurrentUser);

    return {
      familyName: family.name,
      inviteCode: family.inviteCode,
      memberCount: members.length,
      members,
      createdBy: family.createdBy,
      currentUserId: currentUserContext.userId,
      currentUserRole: currentMember?.role ?? null,
      myEmail: currentMember?.email ?? null,
    };
  },
});

export const removeMember = mutation({
  args: {
    targetUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const currentUserContext = await loadCurrentUserContext(ctx);

    if (!currentUserContext.userId || !currentUserContext.familyId) {
      throw new Error("You must belong to a family to manage members.");
    }

    const familyId = currentUserContext.familyId;

    const currentMembership = await ctx.db
      .query("familyMembers")
      .withIndex("by_familyId_and_userId", (q) =>
        q.eq("familyId", familyId).eq("userId", currentUserContext.userId!),
      )
      .unique();

    if (!currentMembership || !isAtLeastAdmin(currentMembership.role)) {
      throw new Error("Only a family admin can remove members.");
    }

    if (args.targetUserId === currentUserContext.userId) {
      throw new Error("You cannot remove yourself from the family.");
    }

    const targetMembership = await ctx.db
      .query("familyMembers")
      .withIndex("by_familyId_and_userId", (q) =>
        q.eq("familyId", familyId).eq("userId", args.targetUserId),
      )
      .unique();

    if (!targetMembership) {
      throw new Error("That member is not part of this family.");
    }

    if (targetMembership.role === "owner") {
      throw new Error("The family owner cannot be removed.");
    }

    // Cascade delete the target user's push subscriptions for this family.
    const targetPushSubscriptions = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_familyId_and_userId", (q) =>
        q.eq("familyId", familyId).eq("userId", args.targetUserId),
      )
      .collect();

    for (const subscription of targetPushSubscriptions) {
      await ctx.db.delete(subscription._id);
    }

    // taskCompletionLogs are intentionally preserved (household care history).
    await ctx.db.delete(targetMembership._id);

    return { removedUserId: args.targetUserId };
  },
});

export const resetInviteCode = mutation({
  args: {},
  handler: async (ctx) => {
    const currentUserContext = await loadCurrentUserContext(ctx);

    if (!currentUserContext.userId || !currentUserContext.familyId) {
      throw new Error("You must belong to a family to reset the invite code.");
    }

    const familyId = currentUserContext.familyId;

    const currentMembership = await ctx.db
      .query("familyMembers")
      .withIndex("by_familyId_and_userId", (q) =>
        q.eq("familyId", familyId).eq("userId", currentUserContext.userId!),
      )
      .unique();

    if (!currentMembership || !isAtLeastAdmin(currentMembership.role)) {
      throw new Error("Only a family admin can reset the invite code.");
    }

    const newInviteCode = await generateUniqueInviteCode(ctx);

    await ctx.db.patch(familyId, { inviteCode: newInviteCode });

    return { inviteCode: newInviteCode };
  },
});

export const renameFamily = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const currentUserContext = await loadCurrentUserContext(ctx);

    if (!currentUserContext.userId || !currentUserContext.familyId) {
      throw new Error("You must belong to a family to rename it.");
    }

    const familyId = currentUserContext.familyId;

    const currentMembership = await ctx.db
      .query("familyMembers")
      .withIndex("by_familyId_and_userId", (q) =>
        q.eq("familyId", familyId).eq("userId", currentUserContext.userId!),
      )
      .unique();

    if (!currentMembership || !isAtLeastAdmin(currentMembership.role)) {
      throw new Error("Only a family admin can rename the family.");
    }

    const name = args.name.trim();
    if (name.length === 0) {
      throw new Error("Family name is required.");
    }

    if (name.length > FAMILY_NAME_MAX_LENGTH) {
      throw new Error(`Family name must be ${FAMILY_NAME_MAX_LENGTH} characters or fewer.`);
    }

    await ctx.db.patch(familyId, { name });

    return { ok: true as const };
  },
});

export const updateMemberRole = mutation({
  args: {
    targetUserId: v.id("users"),
    newRole: v.union(v.literal("admin"), v.literal("member")),
  },
  handler: async (ctx, args) => {
    const currentUserContext = await loadCurrentUserContext(ctx);

    if (!currentUserContext.userId || !currentUserContext.familyId) {
      throw new Error("You must belong to a family to manage roles.");
    }

    const familyId = currentUserContext.familyId;

    const currentMembership = await ctx.db
      .query("familyMembers")
      .withIndex("by_familyId_and_userId", (q) =>
        q.eq("familyId", familyId).eq("userId", currentUserContext.userId!),
      )
      .unique();

    if (!currentMembership || !isAtLeastAdmin(currentMembership.role)) {
      throw new Error("Only an admin or owner can change member roles.");
    }

    if (args.targetUserId === currentUserContext.userId) {
      throw new Error("You cannot change your own role.");
    }

    const targetMembership = await ctx.db
      .query("familyMembers")
      .withIndex("by_familyId_and_userId", (q) =>
        q.eq("familyId", familyId).eq("userId", args.targetUserId),
      )
      .unique();

    if (!targetMembership) {
      throw new Error("That member is not part of this family.");
    }

    if (targetMembership.role === "owner") {
      throw new Error("The owner role cannot be changed. Use transfer ownership instead.");
    }

    await ctx.db.patch(targetMembership._id, { role: args.newRole });

    return { ok: true as const };
  },
});

export const transferOwnership = mutation({
  args: {
    targetUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const currentUserContext = await loadCurrentUserContext(ctx);

    if (!currentUserContext.userId || !currentUserContext.familyId) {
      throw new Error("You must belong to a family to transfer ownership.");
    }

    const familyId = currentUserContext.familyId;

    const currentMembership = await ctx.db
      .query("familyMembers")
      .withIndex("by_familyId_and_userId", (q) =>
        q.eq("familyId", familyId).eq("userId", currentUserContext.userId!),
      )
      .unique();

    if (!currentMembership || currentMembership.role !== "owner") {
      throw new Error("Only the family owner can transfer ownership.");
    }

    if (args.targetUserId === currentUserContext.userId) {
      throw new Error("You cannot transfer ownership to yourself.");
    }

    const targetMembership = await ctx.db
      .query("familyMembers")
      .withIndex("by_familyId_and_userId", (q) =>
        q.eq("familyId", familyId).eq("userId", args.targetUserId),
      )
      .unique();

    if (!targetMembership) {
      throw new Error("That member is not part of this family.");
    }

    // Atomic: demote current owner to admin, promote target to owner.
    await ctx.db.patch(currentMembership._id, { role: "admin" });
    await ctx.db.patch(targetMembership._id, { role: "owner" });

    return { ok: true as const };
  },
});

/**
 * 删除整个家庭的全部数据（最后一人退出场景，D5 分支 2）。
 * 按 family 维度遍历 plants / plantTasks / taskCompletionLogs / pushSubscriptions /
 * familyMembers 全部记录逐一删除，最后删 families 记录本身。注意此分支会连带删除
 * taskCompletionLogs（与普通退出保留 logs 不同）——因为家庭已不复存在，养护历史无归属。
 */
async function deleteEntireFamily(
  ctx: MutationCtx,
  familyId: Id<"families">,
): Promise<void> {
  const plants = await ctx.db
    .query("plants")
    .withIndex("by_familyId", (q) => q.eq("familyId", familyId))
    .collect();
  for (const plant of plants) {
    await ctx.db.delete(plant._id);
  }

  const plantTasks = await ctx.db
    .query("plantTasks")
    .withIndex("by_familyId", (q) => q.eq("familyId", familyId))
    .collect();
  for (const plantTask of plantTasks) {
    await ctx.db.delete(plantTask._id);
  }

  const completionLogs = await ctx.db
    .query("taskCompletionLogs")
    .withIndex("by_familyId_and_completedAt", (q) => q.eq("familyId", familyId))
    .collect();
  for (const log of completionLogs) {
    await ctx.db.delete(log._id);
  }

  const pushSubscriptions = await ctx.db
    .query("pushSubscriptions")
    .withIndex("by_familyId", (q) => q.eq("familyId", familyId))
    .collect();
  for (const subscription of pushSubscriptions) {
    await ctx.db.delete(subscription._id);
  }

  const memberships = await ctx.db
    .query("familyMembers")
    .withIndex("by_familyId", (q) => q.eq("familyId", familyId))
    .collect();
  for (const membership of memberships) {
    await ctx.db.delete(membership._id);
  }

  await ctx.db.delete(familyId);
}

export const deleteFamily = mutation({
  args: {},
  handler: async (ctx) => {
    const currentUserContext = await loadCurrentUserContext(ctx);

    if (!currentUserContext.userId || !currentUserContext.familyId) {
      throw new Error("You must belong to a family to delete it.");
    }

    const familyId = currentUserContext.familyId;

    const currentMembership = await ctx.db
      .query("familyMembers")
      .withIndex("by_familyId_and_userId", (q) =>
        q.eq("familyId", familyId).eq("userId", currentUserContext.userId!),
      )
      .unique();

    if (!currentMembership || currentMembership.role !== "owner") {
      throw new Error("Only the family owner can delete the family.");
    }

    await deleteEntireFamily(ctx, familyId);

    return { ok: true as const };
  },
});

export const leaveFamily = mutation({
  args: {},
  handler: async (ctx) => {
    const currentUserContext = await loadCurrentUserContext(ctx);

    if (!currentUserContext.userId || !currentUserContext.familyId) {
      throw new Error("You must belong to a family to leave it.");
    }

    const userId = currentUserContext.userId;
    const familyId = currentUserContext.familyId;

    const currentMembership = await ctx.db
      .query("familyMembers")
      .withIndex("by_familyId_and_userId", (q) =>
        q.eq("familyId", familyId).eq("userId", userId),
      )
      .unique();

    if (!currentMembership) {
      throw new Error("You are not part of this family.");
    }

    // Owner 不可直接退出，须先转让所有者身份。
    if (currentMembership.role === "owner") {
      throw new Error("Transfer ownership before leaving.");
    }

    // Admin / member 自由退出：级联删自身 pushSubscriptions，保留 taskCompletionLogs。
    const ownPushSubscriptions = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_familyId_and_userId", (q) =>
        q.eq("familyId", familyId).eq("userId", userId),
      )
      .collect();
    for (const subscription of ownPushSubscriptions) {
      await ctx.db.delete(subscription._id);
    }

    await ctx.db.delete(currentMembership._id);

    return { ok: true as const };
  },
});
