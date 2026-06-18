import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { type MutationCtx, mutation, query } from "./_generated/server";
import { getCurrentUserContext as loadCurrentUserContext } from "./lib/auth";
import { plantTaskTypeValidator } from "./lib/validators";
import {
  bucketDueTasks,
  computeNextDueAt,
  computePostponedNextDueAt,
  validateIntervalDays,
} from "../src/features/tasks/scheduling";
import {
  normalizeCustomTaskName,
  validateCustomTaskName,
} from "../src/features/tasks/taskTypes";

interface CurrentFamilyMemberContext {
  familyId: NonNullable<Awaited<ReturnType<typeof loadCurrentUserContext>>["familyId"]>;
  userId: NonNullable<Awaited<ReturnType<typeof loadCurrentUserContext>>["userId"]>;
}

async function requireCurrentFamilyMember(
  ctx: Parameters<typeof loadCurrentUserContext>[0],
): Promise<CurrentFamilyMemberContext> {
  const currentUserContext = await loadCurrentUserContext(ctx);

  if (!currentUserContext.userId) {
    throw new Error("You must be signed in to manage care tasks.");
  }

  if (!currentUserContext.familyId) {
    throw new Error("You must belong to a family to manage care tasks.");
  }

  return {
    familyId: currentUserContext.familyId,
    userId: currentUserContext.userId,
  };
}

export const getTaskCreationPlant = query({
  args: {
    plantId: v.id("plants"),
  },
  handler: async (ctx, args) => {
    const currentUserContext = await requireCurrentFamilyMember(ctx);
    const plant = await ctx.db.get(args.plantId);

    if (!plant || plant.familyId !== currentUserContext.familyId || plant.isArchived) {
      return null;
    }

    const imageUrl = plant.imageStorageId ? await ctx.storage.getUrl(plant.imageStorageId) : null;

    return {
      plantId: plant._id,
      plantName: plant.name,
      location: plant.location ?? null,
      imageUrl,
    };
  },
});

export const createPlantTask = mutation({
  args: {
    plantId: v.id("plants"),
    taskType: plantTaskTypeValidator,
    customTaskName: v.union(v.string(), v.null()),
    intervalDays: v.number(),
    baseCompletedAt: v.union(v.number(), v.null()),
  },
  handler: async (ctx, args) => {
    const currentUserContext = await requireCurrentFamilyMember(ctx);
    const plant = await ctx.db.get(args.plantId);

    if (!plant || plant.familyId !== currentUserContext.familyId) {
      throw new Error("This plant does not belong to your current household.");
    }

    if (plant.isArchived) {
      throw new Error("Archived plants cannot receive new care tasks.");
    }

    const customTaskError = validateCustomTaskName(args.taskType, args.customTaskName);
    if (customTaskError) {
      throw new Error(customTaskError);
    }

    const intervalError = validateIntervalDays(args.intervalDays);
    if (intervalError) {
      throw new Error(intervalError);
    }

    const createdAt = Date.now();
    const taskId = await ctx.db.insert("plantTasks", {
      plantId: plant._id,
      familyId: plant.familyId,
      taskType: args.taskType,
      customLabel: normalizeCustomTaskName(args.customTaskName) ?? undefined,
      intervalDays: args.intervalDays,
      enabled: true,
      lastCompletedAt: args.baseCompletedAt ?? undefined,
      nextDueAt: computeNextDueAt({
        intervalDays: args.intervalDays,
        baseCompletedAt: args.baseCompletedAt,
        now: createdAt,
      }),
      createdBy: currentUserContext.userId,
      createdAt,
      updatedAt: createdAt,
    });

    return {
      taskId,
    };
  },
});

export const getTaskForEdit = query({
  args: {
    plantId: v.id("plants"),
    taskId: v.id("plantTasks"),
  },
  handler: async (ctx, args) => {
    const currentUserContext = await requireCurrentFamilyMember(ctx);
    const [plant, task] = await Promise.all([ctx.db.get(args.plantId), ctx.db.get(args.taskId)]);

    if (
      !plant ||
      plant.familyId !== currentUserContext.familyId ||
      !task ||
      task.familyId !== currentUserContext.familyId ||
      task.plantId !== plant._id
    ) {
      return null;
    }

    const imageUrl = plant.imageStorageId ? await ctx.storage.getUrl(plant.imageStorageId) : null;

    return {
      plantId: plant._id,
      plantName: plant.name,
      plantLocation: plant.location ?? null,
      plantImageUrl: imageUrl,
      task: {
        taskId: task._id,
        taskType: task.taskType,
        customTaskName: task.customLabel ?? null,
        intervalDays: task.intervalDays,
        enabled: task.enabled,
        lastCompletedAt: task.lastCompletedAt ?? null,
      },
    };
  },
});

export const updatePlantTask = mutation({
  args: {
    taskId: v.id("plantTasks"),
    taskType: plantTaskTypeValidator,
    customTaskName: v.union(v.string(), v.null()),
    intervalDays: v.number(),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const currentUserContext = await requireCurrentFamilyMember(ctx);
    const task = await ctx.db.get(args.taskId);

    if (!task || task.familyId !== currentUserContext.familyId) {
      throw new Error("This care task does not belong to your current household.");
    }

    const plant = await ctx.db.get(task.plantId);
    if (!plant || plant.familyId !== currentUserContext.familyId) {
      throw new Error("The parent plant for this task is no longer available.");
    }

    const customTaskError = validateCustomTaskName(args.taskType, args.customTaskName);
    if (customTaskError) {
      throw new Error(customTaskError);
    }

    const intervalError = validateIntervalDays(args.intervalDays);
    if (intervalError) {
      throw new Error(intervalError);
    }

    await ctx.db.patch(args.taskId, {
      taskType: args.taskType,
      customLabel: normalizeCustomTaskName(args.customTaskName) ?? undefined,
      intervalDays: args.intervalDays,
      enabled: args.enabled,
      nextDueAt: computeNextDueAt({
        intervalDays: args.intervalDays,
        baseCompletedAt: task.lastCompletedAt ?? null,
      }),
      updatedAt: Date.now(),
    });

    return {
      ok: true as const,
    };
  },
});

export const deletePlantTask = mutation({
  args: {
    taskId: v.id("plantTasks"),
  },
  handler: async (ctx, args) => {
    const currentUserContext = await requireCurrentFamilyMember(ctx);
    const task = await ctx.db.get(args.taskId);

    if (!task || task.familyId !== currentUserContext.familyId) {
      throw new Error("This care task does not belong to your current household.");
    }

    await ctx.db.delete(args.taskId);

    return {
      ok: true as const,
    };
  },
});

export const listDueTasks = query({
  args: {},
  handler: async (ctx) => {
    const currentUserContext = await requireCurrentFamilyMember(ctx);
    const now = Date.now();

    const tasks = await ctx.db
      .query("plantTasks")
      .withIndex("by_familyId_and_nextDueAt", (q) => q.eq("familyId", currentUserContext.familyId))
      .collect();

    const enabledTasks = tasks.filter((task) => task.enabled ?? true);
    const plantIds = [...new Set(enabledTasks.map((task) => task.plantId))];
    const plantSummaries = await Promise.all(
      plantIds.map(async (plantId) => {
        const plant = await ctx.db.get(plantId);

        if (
          !plant ||
          plant.familyId !== currentUserContext.familyId ||
          plant.isArchived
        ) {
          return null;
        }

        const imageUrl = plant.imageStorageId ? await ctx.storage.getUrl(plant.imageStorageId) : null;

        return [
          plant._id,
          {
            plantId: plant._id,
            plantName: plant.name,
            plantImageUrl: imageUrl,
            plantLocation: plant.location ?? null,
          },
        ] as const;
      }),
    );

    const plantSummaryById = new Map(
      plantSummaries.filter((entry): entry is NonNullable<typeof entry> => entry !== null),
    );

    const dueTasks = enabledTasks
      .map((task) => {
        const plantSummary = plantSummaryById.get(task.plantId);

        if (!plantSummary) {
          return null;
        }

        return {
          taskId: task._id,
          plantId: plantSummary.plantId,
          plantName: plantSummary.plantName,
          plantImageUrl: plantSummary.plantImageUrl,
          plantLocation: plantSummary.plantLocation,
          taskType: task.taskType,
          customLabel: task.customLabel ?? null,
          intervalDays: task.intervalDays,
          nextDueAt: task.nextDueAt,
          lastCompletedAt: task.lastCompletedAt ?? null,
          consecutivePostponeCount: task.consecutivePostponeCount ?? 0,
        };
      })
      .filter((task): task is NonNullable<typeof task> => task !== null);

    return bucketDueTasks(dueTasks, now);
  },
});

/**
 * 完成单个任务的内核：写完成日志 + 顺延 nextDueAt + 清零连续推迟计数，
 * 并返回完成前的字段快照（撤销用）。单条完成与批量完成共用，避免重复实现顺延规则。
 * 调用方需先校验任务/植物归属本家庭且未归档。
 */
async function completeTaskCore(
  ctx: MutationCtx,
  params: {
    task: Doc<"plantTasks">;
    userId: CurrentFamilyMemberContext["userId"];
    completedAt: number;
  },
) {
  const { task, userId, completedAt } = params;
  const nextDueAt = computeNextDueAt({
    intervalDays: task.intervalDays,
    baseCompletedAt: completedAt,
  });

  // 完成前的快照，供前端缓存以支持「会话内 3–5 秒撤销」（PRD §9.1）。
  const previous = {
    lastCompletedAt: task.lastCompletedAt ?? null,
    nextDueAt: task.nextDueAt,
    consecutivePostponeCount: task.consecutivePostponeCount ?? 0,
  };

  const logId = await ctx.db.insert("taskCompletionLogs", {
    taskId: task._id,
    plantId: task.plantId,
    familyId: task.familyId,
    completedBy: userId,
    completedAt,
    taskType: task.taskType,
    intervalDays: task.intervalDays,
  });

  await ctx.db.patch(task._id, {
    lastCompletedAt: completedAt,
    nextDueAt,
    // 完成即清零连续推迟计数（PRD §8.4）。
    consecutivePostponeCount: 0,
    updatedAt: completedAt,
  });

  return {
    taskId: task._id,
    logId,
    previous,
    lastCompletedAt: completedAt,
    nextDueAt,
  };
}

export const completePlantTask = mutation({
  args: {
    taskId: v.id("plantTasks"),
  },
  handler: async (ctx, args) => {
    const currentUserContext = await requireCurrentFamilyMember(ctx);
    const task = await ctx.db.get(args.taskId);

    if (!task || task.familyId !== currentUserContext.familyId) {
      throw new Error("This care task does not belong to your current household.");
    }

    const plant = await ctx.db.get(task.plantId);
    if (!plant || plant.familyId !== currentUserContext.familyId) {
      throw new Error("The parent plant for this task is no longer available.");
    }

    if (plant.isArchived) {
      throw new Error("Archived plants cannot receive new task completions.");
    }

    return completeTaskCore(ctx, {
      task,
      userId: currentUserContext.userId,
      completedAt: Date.now(),
    });
  },
});

export const completePlantTasksBatch = mutation({
  args: {
    taskIds: v.array(v.id("plantTasks")),
  },
  handler: async (ctx, args) => {
    const currentUserContext = await requireCurrentFamilyMember(ctx);
    // 同一批次共用一个完成时间，便于撤销时一致回滚。
    const completedAt = Date.now();
    const results: Array<Awaited<ReturnType<typeof completeTaskCore>>> = [];

    // 去重，避免同一任务被重复完成。
    for (const taskId of [...new Set(args.taskIds)]) {
      const task = await ctx.db.get(taskId);
      if (!task || task.familyId !== currentUserContext.familyId) {
        continue;
      }

      const plant = await ctx.db.get(task.plantId);
      if (!plant || plant.familyId !== currentUserContext.familyId || plant.isArchived) {
        continue;
      }

      results.push(
        await completeTaskCore(ctx, {
          task,
          userId: currentUserContext.userId,
          completedAt,
        }),
      );
    }

    return { results };
  },
});

export const undoCompletePlantTask = mutation({
  args: {
    taskId: v.id("plantTasks"),
    logId: v.id("taskCompletionLogs"),
    previous: v.object({
      lastCompletedAt: v.union(v.number(), v.null()),
      nextDueAt: v.number(),
      consecutivePostponeCount: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const currentUserContext = await requireCurrentFamilyMember(ctx);
    const task = await ctx.db.get(args.taskId);

    if (!task || task.familyId !== currentUserContext.familyId) {
      throw new Error("This care task does not belong to your current household.");
    }

    // 精确删除「刚写入的那条」log（按 logId 定位），且必须归属本任务/本家庭，避免误删历史。
    const log = await ctx.db.get(args.logId);
    if (log && log.taskId === task._id && log.familyId === currentUserContext.familyId) {
      await ctx.db.delete(log._id);
    }

    // 还原完成前的三字段快照（lastCompletedAt 为 null 时清空字段）。
    await ctx.db.patch(task._id, {
      lastCompletedAt: args.previous.lastCompletedAt ?? undefined,
      nextDueAt: args.previous.nextDueAt,
      consecutivePostponeCount: args.previous.consecutivePostponeCount,
      updatedAt: Date.now(),
    });

    return {
      ok: true as const,
    };
  },
});

export const postponePlantTask = mutation({
  args: {
    taskId: v.id("plantTasks"),
  },
  handler: async (ctx, args) => {
    const currentUserContext = await requireCurrentFamilyMember(ctx);
    const task = await ctx.db.get(args.taskId);

    if (!task || task.familyId !== currentUserContext.familyId) {
      throw new Error("This care task does not belong to your current household.");
    }

    const plant = await ctx.db.get(task.plantId);
    if (!plant || plant.familyId !== currentUserContext.familyId) {
      throw new Error("The parent plant for this task is no longer available.");
    }

    if (plant.isArchived) {
      throw new Error("Archived plants cannot be postponed.");
    }

    const now = Date.now();
    // 推迟基准为「今天 0 点 + N 天」，不依赖原 nextDueAt（PRD §8.1）。
    const nextDueAt = computePostponedNextDueAt(now);
    const consecutivePostponeCount = (task.consecutivePostponeCount ?? 0) + 1;

    // 推迟只移动 nextDueAt，不触碰 lastCompletedAt，也不写 taskCompletionLogs（PRD §8）。
    await ctx.db.patch(task._id, {
      nextDueAt,
      consecutivePostponeCount,
      updatedAt: now,
    });

    return {
      taskId: task._id,
      nextDueAt,
      consecutivePostponeCount,
    };
  },
});

// ─── 养护历史时间线 queries（CARE-HIST-001）────────────────────

/**
 * 按植物查询养护完成日志（cursor-based 分页，降序）。
 * 校验 plantId 归属当前家庭；join users 表获取 completedByName / completedByImageStorageId。
 * 已离开家庭的用户仍返回其历史昵称/头像（db.get 返回 null 时兜底「未知成员」）。
 */
export const listPlantCompletionLogs = query({
  args: {
    plantId: v.id("plants"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const currentUserContext = await requireCurrentFamilyMember(ctx);

    // 校验植物归属当前家庭
    const plant = await ctx.db.get(args.plantId);
    if (!plant || plant.familyId !== currentUserContext.familyId) {
      throw new Error("This plant does not belong to your current household.");
    }

    // 使用 by_plantId_and_completedAt 索引降序分页查询
    const paginatedLogs = await ctx.db
      .query("taskCompletionLogs")
      .withIndex("by_plantId_and_completedAt", (q) => q.eq("plantId", args.plantId))
      .order("desc")
      .paginate(args.paginationOpts);

    // 批量去重 join users 表
    const userIds = [...new Set(paginatedLogs.page.map((log) => log.completedBy))];
    const usersMap = new Map<Id<"users">, { displayName: string; imageStorageId: string | null }>();
    await Promise.all(
      userIds.map(async (userId) => {
        const user = await ctx.db.get(userId);
        usersMap.set(userId, {
          displayName: user?.displayName ?? user?.name ?? "未知成员",
          imageStorageId: (user?.imageStorageId as string | undefined) ?? null,
        });
      }),
    );

    // 批量去重 join plantTasks 表以获取 customLabel（日志表不存 customLabel）
    const taskIds = [...new Set(paginatedLogs.page.map((log) => log.taskId))];
    const tasksMap = new Map<Id<"plantTasks">, string | null>();
    await Promise.all(
      taskIds.map(async (taskId) => {
        const taskDoc = await ctx.db.get(taskId);
        tasksMap.set(taskId, taskDoc?.customLabel ?? null);
      }),
    );

    const page = paginatedLogs.page.map((log) => {
      const userInfo = usersMap.get(log.completedBy) ?? {
        displayName: "未知成员",
        imageStorageId: null,
      };
      return {
        logId: log._id,
        taskType: log.taskType,
        customLabel: tasksMap.get(log.taskId) ?? null,
        completedByName: userInfo.displayName,
        completedByImageStorageId: userInfo.imageStorageId,
        completedAt: log.completedAt,
      };
    });

    return {
      page,
      isDone: paginatedLogs.isDone,
      continueCursor: paginatedLogs.continueCursor,
    };
  },
});

/**
 * 查询当前家庭最近 5 条养护完成动态。
 * join users 表（completedByName/completedByImageStorageId）和 plants 表（plantName/plantId）。
 * 已离开家庭的用户兜底「未知成员」；已删除的植物兜底「已删除的植物」。
 */
export const listFamilyRecentActivity = query({
  args: {},
  handler: async (ctx) => {
    const currentUserContext = await requireCurrentFamilyMember(ctx);

    // 使用 by_familyId_and_completedAt 索引降序取最近 5 条
    const recentLogs = await ctx.db
      .query("taskCompletionLogs")
      .withIndex("by_familyId_and_completedAt", (q) =>
        q.eq("familyId", currentUserContext.familyId),
      )
      .order("desc")
      .take(5);

    if (recentLogs.length === 0) {
      return [];
    }

    // 批量去重 join users 表
    const userIds = [...new Set(recentLogs.map((log) => log.completedBy))];
    const usersMap = new Map<Id<"users">, { displayName: string; imageStorageId: string | null }>();
    await Promise.all(
      userIds.map(async (userId) => {
        const user = await ctx.db.get(userId);
        usersMap.set(userId, {
          displayName: user?.displayName ?? user?.name ?? "未知成员",
          imageStorageId: (user?.imageStorageId as string | undefined) ?? null,
        });
      }),
    );

    // 批量去重 join plants 表
    const plantIds = [...new Set(recentLogs.map((log) => log.plantId))];
    const plantsMap = new Map<Id<"plants">, string>();
    await Promise.all(
      plantIds.map(async (plantId) => {
        const plantDoc = await ctx.db.get(plantId);
        plantsMap.set(plantId, plantDoc?.name ?? "已删除的植物");
      }),
    );

    // 批量去重 join plantTasks 表获取 customLabel
    const taskIds = [...new Set(recentLogs.map((log) => log.taskId))];
    const tasksMap = new Map<Id<"plantTasks">, string | null>();
    await Promise.all(
      taskIds.map(async (taskId) => {
        const taskDoc = await ctx.db.get(taskId);
        tasksMap.set(taskId, taskDoc?.customLabel ?? null);
      }),
    );

    return recentLogs.map((log) => {
      const userInfo = usersMap.get(log.completedBy) ?? {
        displayName: "未知成员",
        imageStorageId: null,
      };
      return {
        logId: log._id,
        taskType: log.taskType,
        customLabel: tasksMap.get(log.taskId) ?? null,
        completedByName: userInfo.displayName,
        completedByImageStorageId: userInfo.imageStorageId,
        plantName: plantsMap.get(log.plantId) ?? "已删除的植物",
        plantId: log.plantId,
        completedAt: log.completedAt,
      };
    });
  },
});

/**
 * 植物养护记录概览摘要（轻量 query，不分页）。
 * 返回 totalCount + 最近一条记录的 completedByName / completedAt。
 * 用于折叠态下展示「养护记录（N）  最近 XXX · 时间」，避免挂载重量级分页 query。
 */
export const getPlantCareHistorySummary = query({
  args: {
    plantId: v.id("plants"),
  },
  handler: async (ctx, args) => {
    const currentUserContext = await requireCurrentFamilyMember(ctx);

    // 校验植物归属当前家庭
    const plant = await ctx.db.get(args.plantId);
    if (!plant || plant.familyId !== currentUserContext.familyId) {
      throw new Error("This plant does not belong to your current household.");
    }

    // 取最近一条记录
    const latestLog = await ctx.db
      .query("taskCompletionLogs")
      .withIndex("by_plantId_and_completedAt", (q) => q.eq("plantId", args.plantId))
      .order("desc")
      .first();

    // 计算总条数
    const allLogs = await ctx.db
      .query("taskCompletionLogs")
      .withIndex("by_plantId_and_completedAt", (q) => q.eq("plantId", args.plantId))
      .collect();
    const totalCount = allLogs.length;

    if (!latestLog) {
      return { totalCount: 0, latestCompletedByName: null, latestCompletedAt: null };
    }

    // join user 获取最近完成者的昵称
    const user = await ctx.db.get(latestLog.completedBy);
    const latestCompletedByName = user?.displayName ?? user?.name ?? "未知成员";

    return {
      totalCount,
      latestCompletedByName,
      latestCompletedAt: latestLog.completedAt,
    };
  },
});
