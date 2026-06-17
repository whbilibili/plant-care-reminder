import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { getCurrentUserContext as loadCurrentUserContext } from "./lib/auth";

const DISPLAY_NAME_MAX_LENGTH = 40;

export const getCurrentUserContext = query({
  args: {},
  handler: async (ctx) => {
    const currentUserContext = await loadCurrentUserContext(ctx);

    return {
      userId: currentUserContext.userId,
      familyId: currentUserContext.familyId,
      displayName: currentUserContext.displayName,
    };
  },
});

export const updateMyProfile = mutation({
  args: {
    displayName: v.string(),
  },
  handler: async (ctx, args) => {
    const currentUserContext = await loadCurrentUserContext(ctx);

    if (!currentUserContext.userId || !currentUserContext.user) {
      throw new Error("You must be signed in to update your profile.");
    }

    const displayName = args.displayName.trim();
    if (displayName.length === 0) {
      throw new Error("Display name is required.");
    }

    if (displayName.length > DISPLAY_NAME_MAX_LENGTH) {
      throw new Error(`Display name must be ${DISPLAY_NAME_MAX_LENGTH} characters or fewer.`);
    }

    await ctx.db.patch(currentUserContext.userId, {
      displayName,
      updatedAt: Date.now(),
    });

    return { ok: true as const };
  },
});

/**
 * 头像上传链路（D6，用户级能力）。下面三个接口仅校验登录身份，
 * 不带 requireCurrentFamilyMember 家庭门槛——头像是个人能力，
 * 处于 no-family 状态（如刚注册、刚退出家庭）的用户也应能设置头像。
 */

export const generateAvatarUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const currentUserContext = await loadCurrentUserContext(ctx);

    if (!currentUserContext.userId) {
      throw new Error("You must be signed in to upload an avatar.");
    }

    return {
      uploadUrl: await ctx.storage.generateUploadUrl(),
    };
  },
});

export const getAvatarUrl = query({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const currentUserContext = await loadCurrentUserContext(ctx);

    if (!currentUserContext.userId) {
      throw new Error("You must be signed in to view an avatar.");
    }

    const avatarUrl = await ctx.storage.getUrl(args.storageId);
    if (!avatarUrl) {
      throw new Error("Avatar image not found.");
    }

    return { url: avatarUrl };
  },
});

export const updateMyAvatar = mutation({
  // 传 storageId 设置头像，传 null 清除头像。
  args: {
    imageStorageId: v.union(v.id("_storage"), v.null()),
  },
  handler: async (ctx, args) => {
    const currentUserContext = await loadCurrentUserContext(ctx);

    if (!currentUserContext.userId) {
      throw new Error("You must be signed in to update your avatar.");
    }

    await ctx.db.patch(currentUserContext.userId, {
      imageStorageId: args.imageStorageId ?? undefined,
      updatedAt: Date.now(),
    });

    return { ok: true as const };
  },
});
