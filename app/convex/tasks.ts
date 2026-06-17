import { v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
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
