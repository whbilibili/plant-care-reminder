"use node";

import webpush from "web-push";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

/** 后端用的任务类型中文标签（与前端 taskTypes.ts 保持一致）。 */
const TASK_TYPE_LABELS: Record<string, string> = {
  watering: "浇水",
  fertilizing: "施肥",
  misting: "喷雾",
  repotting: "换盆",
  pruning: "修剪",
  custom: "养护",
};

function getTaskLabel(taskType: string): string {
  return TASK_TYPE_LABELS[taskType] ?? "养护";
}

// ─── 时间窗口判断（PUSH-005）────────────────────────────────────

/**
 * 判断当前时刻是否在用户偏好的推送窗口内（preferredHour ± 30min）。
 * 无偏好的用户始终返回 true（到期即推）。
 */
export function isWithinPreferredWindow(
  preferences: { preferredHour: number; timezone: string } | null,
  nowMs: number,
): boolean {
  if (!preferences) {
    return true; // 无偏好 → 到期即推
  }

  try {
    // 获取用户时区的当前小时和分钟
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: preferences.timezone,
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    });
    const parts = formatter.formatToParts(new Date(nowMs));
    const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
    const minute = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);

    const currentMinutes = hour * 60 + minute;
    const preferredMinutes = preferences.preferredHour * 60;

    // ±30 分钟窗口
    const diff = Math.abs(currentMinutes - preferredMinutes);
    // 处理跨午夜情况（如 23:45 和 0:00 的差距应该是 15 分钟）
    const wrappedDiff = Math.min(diff, 1440 - diff);

    return wrappedDiff <= 30;
  } catch {
    // 时区解析失败时降级为"到期即推"
    return true;
  }
}

// ─── 聚合推送 payload 生成（PUSH-006 + PUSH-007）─────────────────

interface TaskInfo {
  taskId: string;
  plantId: string;
  plantName: string;
  taskType: string;
}

interface NotificationPayload {
  title: string;
  body: string;
  tag: string;
  url: string;
}

/**
 * 根据任务数量生成通知 payload：
 * - 单任务：标题为"植物名 · 任务类型"，url 为 /plants/{plantId}
 * - 2-3 个任务：列出全部名称+类型
 * - >3 个任务：列出前 3 个 + "等 N 个任务"
 * 聚合通知 url 统一为 /todo
 */
export function buildNotificationPayload(tasks: TaskInfo[]): NotificationPayload {
  if (tasks.length === 0) {
    // 不应该发生，但做防御
    return {
      title: "养护提醒",
      body: "你有待处理的养护任务",
      tag: "daily-summary",
      url: "/todo",
    };
  }

  if (tasks.length === 1) {
    const task = tasks[0];
    const taskLabel = getTaskLabel(task.taskType);
    return {
      title: `${task.plantName} · ${taskLabel}`,
      body: `「${task.plantName}」的${taskLabel}任务已到期，记得去处理哦！`,
      tag: `task-${task.taskId}`,
      url: `/plants/${task.plantId}`,
    };
  }

  // 聚合通知
  const count = tasks.length;
  const title = `你有 ${count} 个养护任务待完成`;

  const displayTasks = tasks.slice(0, 3);
  const parts = displayTasks.map(
    (t) => `${t.plantName}（${getTaskLabel(t.taskType)}）`,
  );

  let body: string;
  if (count <= 3) {
    body = parts.join("、");
  } else {
    body = `${parts.join("、")}等 ${count} 个任务`;
  }

  return {
    title,
    body,
    tag: "daily-summary",
    url: "/todo",
  };
}

// ─── 主推送 action（重构后按用户分组）────────────────────────────

export const processDueTaskNotifications = internalAction({
  args: {},
  handler: async (ctx) => {
    // Read VAPID config from Convex environment variables
    const vapidSubject = process.env.VAPID_SUBJECT;
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

    if (!vapidSubject || !vapidPublicKey || !vapidPrivateKey) {
      console.warn("[notifications] VAPID keys not configured, skipping push.");
      return { notifiedTaskCount: 0, recipientCount: 0, error: "VAPID_NOT_CONFIGURED" };
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const now = Date.now();
    const result = await ctx.runQuery(internal.notifications.listNotifiableDueTasks, {
      now,
    });

    if (result.tasks.length === 0) {
      return { notifiedTaskCount: 0, recipientCount: 0 };
    }

    // ── Step 1: 按 userId 分组任务 ──
    // 每个 subscription 关联一个 userId，同一 family 的所有 subscription 都会收到
    // 我们需要按 userId 聚合任务，然后对每个用户判断时间窗口
    interface UserTaskGroup {
      userId: string;
      tasks: TaskInfo[];
      subscriptions: Array<{
        subscriptionId: string;
        endpoint: string;
        p256dh: string;
        auth: string;
        deviceLabel: string;
      }>;
    }

    const userGroups = new Map<string, UserTaskGroup>();

    for (const task of result.tasks) {
      for (const sub of task.subscriptions) {
        let group = userGroups.get(sub.userId);
        if (!group) {
          group = {
            userId: sub.userId,
            tasks: [],
            subscriptions: [],
          };
          userGroups.set(sub.userId, group);
        }

        // 避免重复添加同一任务（同一用户可能有多个设备订阅）
        if (!group.tasks.some((t) => t.taskId === task.taskId)) {
          group.tasks.push({
            taskId: task.taskId,
            plantId: task.plantId,
            plantName: task.plantName,
            taskType: task.taskType,
          });
        }

        // 避免重复添加同一订阅
        if (!group.subscriptions.some((s) => s.subscriptionId === sub.subscriptionId)) {
          group.subscriptions.push({
            subscriptionId: sub.subscriptionId,
            endpoint: sub.endpoint,
            p256dh: sub.p256dh,
            auth: sub.auth,
            deviceLabel: sub.deviceLabel,
          });
        }
      }
    }

    // ── Step 2: 批量查询用户偏好 ──
    const userIds = Array.from(userGroups.keys()) as Id<"users">[];
    const preferences = await ctx.runQuery(
      internal.notifications.getUserNotificationPreferences,
      { userIds },
    );

    // ── Step 3: 按用户推送（时间窗口过滤 + 聚合 payload）──
    let notifiedTaskCount = 0;
    let recipientCount = 0;
    const expiredSubscriptionIds: string[] = [];
    const notifiedTaskIds = new Set<string>();

    for (const [userId, group] of userGroups) {
      const userPref = (preferences as Record<string, { preferredHour: number; timezone: string } | null>)[userId] ?? null;

      // 时间窗口判断：不在窗口内的用户跳过本轮
      if (!isWithinPreferredWindow(userPref, now)) {
        continue;
      }

      // 生成聚合 payload
      const payload = JSON.stringify(buildNotificationPayload(group.tasks));

      // 向该用户的所有设备推送
      for (const sub of group.subscriptions) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload,
          );
          recipientCount += 1;
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number }).statusCode;
          // 404 or 410 = subscription expired or unsubscribed
          if (statusCode === 404 || statusCode === 410) {
            expiredSubscriptionIds.push(sub.subscriptionId);
          } else {
            console.error(
              `[notifications] Push failed for ${sub.deviceLabel}:`,
              error,
            );
          }
        }
      }

      // 标记该用户的所有任务为已通知
      for (const task of group.tasks) {
        if (!notifiedTaskIds.has(task.taskId)) {
          notifiedTaskIds.add(task.taskId);
          await ctx.runMutation(internal.notifications.markTaskNotified, {
            taskId: task.taskId as Id<"plantTasks">,
            notifiedAt: now,
          });
          notifiedTaskCount += 1;
        }
      }
    }

    // Clean up expired subscriptions
    for (const subscriptionId of expiredSubscriptionIds) {
      try {
        await ctx.runMutation(internal.notifications.removeExpiredSubscription, {
          subscriptionId: subscriptionId as Id<"pushSubscriptions">,
        });
      } catch {
        // Best-effort cleanup
      }
    }

    return {
      notifiedTaskCount,
      recipientCount,
    };
  },
});
