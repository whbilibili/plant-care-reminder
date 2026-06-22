import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { getCurrentUserContext as loadCurrentUserContext } from "./lib/auth";
import { v } from "convex/values";

interface CurrentFamilyMemberContext {
  familyId: NonNullable<Awaited<ReturnType<typeof loadCurrentUserContext>>["familyId"]>;
  userId: NonNullable<Awaited<ReturnType<typeof loadCurrentUserContext>>["userId"]>;
}

const NOTIFICATION_WINDOW_MS = 60 * 60 * 1000;

export function shouldNotifyTask({
  enabled,
  lastNotifiedAt,
  nextDueAt,
  now,
}: {
  enabled: boolean;
  lastNotifiedAt: number | null | undefined;
  nextDueAt: number;
  now: number;
}) {
  if (!enabled) {
    return false;
  }

  if (nextDueAt > now + NOTIFICATION_WINDOW_MS) {
    return false;
  }

  if (lastNotifiedAt === null || lastNotifiedAt === undefined) {
    return true;
  }

  return now - lastNotifiedAt >= NOTIFICATION_WINDOW_MS;
}

async function requireCurrentFamilyMember(
  ctx: Parameters<typeof loadCurrentUserContext>[0],
): Promise<CurrentFamilyMemberContext> {
  const currentUserContext = await loadCurrentUserContext(ctx);

  if (!currentUserContext.userId) {
    throw new Error("You must be signed in to manage notification subscriptions.");
  }

  if (!currentUserContext.familyId) {
    throw new Error("You must belong to a family to manage notification subscriptions.");
  }

  return {
    familyId: currentUserContext.familyId,
    userId: currentUserContext.userId,
  };
}

export const savePushSubscription = mutation({
  args: {
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    deviceLabel: v.string(),
  },
  handler: async (ctx, args) => {
    const currentUserContext = await requireCurrentFamilyMember(ctx);
    const now = Date.now();

    const existingSubscription = (
      await ctx.db
        .query("pushSubscriptions")
        .withIndex("by_userId", (q) => q.eq("userId", currentUserContext.userId))
        .collect()
    ).find(
      (subscription) =>
        subscription.familyId === currentUserContext.familyId && subscription.endpoint === args.endpoint,
    );

    if (existingSubscription) {
      await ctx.db.patch(existingSubscription._id, {
        p256dh: args.p256dh,
        auth: args.auth,
        deviceLabel: args.deviceLabel,
        lastSeenAt: now,
      });

      return {
        ok: true as const,
      };
    }

    await ctx.db.insert("pushSubscriptions", {
      userId: currentUserContext.userId,
      familyId: currentUserContext.familyId,
      endpoint: args.endpoint,
      p256dh: args.p256dh,
      auth: args.auth,
      deviceLabel: args.deviceLabel,
      userAgent: undefined,
      lastSeenAt: now,
      createdAt: now,
    });

    return {
      ok: true as const,
    };
  },
});

export const listNotifiableDueTasks = internalQuery({
  args: {
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("plantTasks")
      .withIndex("by_nextDueAt")
      .filter((q) => q.lte(q.field("nextDueAt"), args.now + NOTIFICATION_WINDOW_MS))
      .collect();

    const eligibleTasks = tasks.filter((task) =>
      shouldNotifyTask({
        enabled: task.enabled,
        lastNotifiedAt: task.lastNotifiedAt ?? null,
        nextDueAt: task.nextDueAt,
        now: args.now,
      }),
    );

    const tasksWithFanout = await Promise.all(
      eligibleTasks.map(async (task) => {
        const [plant, subscriptions] = await Promise.all([
          ctx.db.get(task.plantId),
          ctx.db
            .query("pushSubscriptions")
            .withIndex("by_familyId", (q) => q.eq("familyId", task.familyId))
            .collect(),
        ]);

        if (!plant || plant.isArchived || subscriptions.length === 0) {
          return null;
        }

        return {
          taskId: task._id,
          familyId: task.familyId,
          plantId: plant._id,
          plantName: plant.name,
          taskType: task.taskType,
          nextDueAt: task.nextDueAt,
          subscriptions: subscriptions.map((subscription) => ({
            subscriptionId: subscription._id,
            userId: subscription.userId,
            endpoint: subscription.endpoint,
            p256dh: subscription.p256dh,
            auth: subscription.auth,
            deviceLabel: subscription.deviceLabel,
          })),
        };
      }),
    );

    return {
      tasks: tasksWithFanout.filter((task): task is NonNullable<typeof task> => task !== null),
    };
  },
});

export const markTaskNotified = internalMutation({
  args: {
    taskId: v.id("plantTasks"),
    notifiedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);

    if (!task) {
      throw new Error("This care task no longer exists.");
    }

    await ctx.db.patch(args.taskId, {
      lastNotifiedAt: args.notifiedAt,
      updatedAt: args.notifiedAt,
    });

    return {
      ok: true as const,
    };
  },
});

/** 删除失效的 push 订阅（endpoint 过期或用户取消授权）。 */
export const removeExpiredSubscription = internalMutation({
  args: {
    subscriptionId: v.id("pushSubscriptions"),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db.get(args.subscriptionId);
    if (subscription) {
      await ctx.db.delete(args.subscriptionId);
    }
  },
});

/** 查询当前用户在当前家庭是否有有效的 push 订阅。 */
export const hasActiveSubscription = query({
  args: {},
  handler: async (ctx) => {
    const currentUserContext = await loadCurrentUserContext(ctx);
    if (!currentUserContext.userId || !currentUserContext.familyId) {
      return false;
    }
    const subscriptions = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_familyId_and_userId", (q) =>
        q.eq("familyId", currentUserContext.familyId!).eq("userId", currentUserContext.userId!),
      )
      .collect();
    return subscriptions.length > 0;
  },
});

/** 删除当前用户在当前家庭的所有 push 订阅（用于"关闭通知"）。 */
export const removeMySubscriptions = mutation({
  args: {},
  handler: async (ctx) => {
    const currentUserContext = await requireCurrentFamilyMember(ctx);
    const subscriptions = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_familyId_and_userId", (q) =>
        q.eq("familyId", currentUserContext.familyId).eq("userId", currentUserContext.userId),
      )
      .collect();
    for (const subscription of subscriptions) {
      await ctx.db.delete(subscription._id);
    }
    return { ok: true as const, removed: subscriptions.length };
  },
});

/**
 * 批量查询用户通知偏好（PUSH-004）。
 * 供 processDueTaskNotifications action 调用，避免逐个 db.get 的 N+1 问题。
 */
export const getUserNotificationPreferences = internalQuery({
  args: {
    userIds: v.array(v.id("users")),
  },
  handler: async (ctx, args) => {
    const result: Record<string, { preferredHour: number; timezone: string } | null> = {};

    for (const userId of args.userIds) {
      const user = await ctx.db.get(userId);
      result[userId] = user?.notificationPreferences ?? null;
    }

    return result;
  },
});
