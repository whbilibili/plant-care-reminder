"use node";

import webpush from "web-push";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

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

    let notifiedTaskCount = 0;
    let recipientCount = 0;
    const expiredSubscriptionIds: string[] = [];

    for (const task of result.tasks) {
      if (task.subscriptions.length === 0) {
        continue;
      }

      const taskLabel = getTaskLabel(task.taskType);
      const payload = JSON.stringify({
        title: `${task.plantName} • ${taskLabel}`,
        body: `「${task.plantName}」的${taskLabel}任务已到期，记得去处理哦！`,
        tag: `task-${task.taskId}`,
        url: "/todo",
      });

      // Send push to all subscribed devices for this family
      for (const sub of task.subscriptions) {
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

      await ctx.runMutation(internal.notifications.markTaskNotified, {
        taskId: task.taskId,
        notifiedAt: now,
      });
      notifiedTaskCount += 1;
    }

    // Clean up expired subscriptions
    for (const subscriptionId of expiredSubscriptionIds) {
      try {
        await ctx.runMutation(internal.notifications.removeExpiredSubscription, {
          subscriptionId: subscriptionId as never,
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
