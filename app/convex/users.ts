import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { getCurrentUserContext as loadCurrentUserContext } from "./lib/auth";
import { notificationPreferencesValidator } from "./lib/validators";

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

// ─── 推送时间偏好（PUSH-002 / PUSH-003）────────────────────────

/**
 * 更新当前用户的推送时间偏好。
 * preferredHour 为 null 时清除偏好（恢复为"到期即推"）。
 */
export const updateNotificationPreferences = mutation({
  args: {
    preferredHour: v.union(v.number(), v.null()),
    timezone: v.string(),
  },
  handler: async (ctx, args) => {
    const currentUserContext = await loadCurrentUserContext(ctx);

    if (!currentUserContext.userId) {
      throw new Error("You must be signed in to update notification preferences.");
    }

    // 校验 timezone 非空
    if (args.timezone.trim().length === 0) {
      throw new Error("时区不能为空。");
    }

    // preferredHour 为 null 时清除偏好
    if (args.preferredHour === null) {
      await ctx.db.patch(currentUserContext.userId, {
        notificationPreferences: undefined,
        updatedAt: Date.now(),
      });
      return { ok: true as const };
    }

    // 校验 preferredHour 为 [0, 23] 整数
    if (
      !Number.isInteger(args.preferredHour) ||
      args.preferredHour < 0 ||
      args.preferredHour > 23
    ) {
      throw new Error("提醒时间必须是 0 到 23 之间的整数。");
    }

    await ctx.db.patch(currentUserContext.userId, {
      notificationPreferences: {
        preferredHour: args.preferredHour,
        timezone: args.timezone.trim(),
      },
      updatedAt: Date.now(),
    });

    return { ok: true as const };
  },
});

/** 获取当前用户的推送时间偏好，未设置时返回 null。 */
export const getNotificationPreferences = query({
  args: {},
  handler: async (ctx) => {
    const currentUserContext = await loadCurrentUserContext(ctx);

    if (!currentUserContext.userId) {
      throw new Error("You must be signed in to view notification preferences.");
    }

    const user = currentUserContext.user;
    if (!user) {
      return null;
    }

    return user.notificationPreferences ?? null;
  },
});
