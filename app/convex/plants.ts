import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { getCurrentUserContext as loadCurrentUserContext } from "./lib/auth";
import {
  assertMaxLength,
  PLANT_DESCRIPTION_MAX_LENGTH,
  PLANT_LOCATION_MAX_LENGTH,
  PLANT_NAME_MAX_LENGTH,
  PLANT_NOTE_MAX_LENGTH,
} from "./lib/validators";

export interface PlantTextArgs {
  name: string;
  description: string | null;
  note: string | null;
  location: string | null;
}

/**
 * 植物文本字段后端校验（第三层防御，TEXT-006）：
 * name 去空格后必填 + 长度上限；location/description/note 仅在有值时校验长度。
 * 返回 trim 后的 name 供写库（与 families.createFamily 写 trim 名同模式）。
 * 导出供单测直调（与 taskTypes 校验函数同款可测模式）。
 */
export function assertPlantTextWithinLimits(args: PlantTextArgs): { name: string } {
  const name = args.name.trim();
  if (name.length === 0) {
    throw new Error("请填写植物名称。");
  }
  assertMaxLength(name, PLANT_NAME_MAX_LENGTH, "植物名称");

  if (args.location !== null) {
    assertMaxLength(args.location, PLANT_LOCATION_MAX_LENGTH, "摆放位置");
  }
  if (args.description !== null) {
    assertMaxLength(args.description, PLANT_DESCRIPTION_MAX_LENGTH, "简介");
  }
  if (args.note !== null) {
    assertMaxLength(args.note, PLANT_NOTE_MAX_LENGTH, "养护备注");
  }

  return { name };
}

interface CurrentFamilyMemberContext {
  familyId: NonNullable<Awaited<ReturnType<typeof loadCurrentUserContext>>["familyId"]>;
  userId: NonNullable<Awaited<ReturnType<typeof loadCurrentUserContext>>["userId"]>;
}

async function requireCurrentFamilyMember(
  ctx: Parameters<typeof loadCurrentUserContext>[0],
): Promise<CurrentFamilyMemberContext> {
  const currentUserContext = await loadCurrentUserContext(ctx);

  if (!currentUserContext.userId) {
    throw new Error("You must be signed in to manage plant images.");
  }

  if (!currentUserContext.familyId) {
    throw new Error("You must belong to a family to manage plant images.");
  }

  return {
    familyId: currentUserContext.familyId,
    userId: currentUserContext.userId,
  };
}

export const generatePlantImageUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireCurrentFamilyMember(ctx);

    return {
      uploadUrl: await ctx.storage.generateUploadUrl(),
    };
  },
});

export const createPlant = mutation({
  args: {
    name: v.string(),
    description: v.union(v.string(), v.null()),
    note: v.union(v.string(), v.null()),
    location: v.union(v.string(), v.null()),
    imageStorageId: v.union(v.id("_storage"), v.null()),
  },
  handler: async (ctx, args) => {
    const currentUserContext = await requireCurrentFamilyMember(ctx);
    const { name } = assertPlantTextWithinLimits(args);
    const createdAt = Date.now();

    const plantId = await ctx.db.insert("plants", {
      familyId: currentUserContext.familyId,
      name,
      description: args.description ?? undefined,
      notes: args.note ?? undefined,
      location: args.location ?? undefined,
      imageStorageId: args.imageStorageId ?? undefined,
      createdBy: currentUserContext.userId,
      createdAt,
      updatedAt: createdAt,
      isArchived: false,
      archivedAt: undefined,
    });

    return {
      plantId,
    };
  },
});

export const getPlantForEdit = query({
  args: {
    plantId: v.id("plants"),
  },
  handler: async (ctx, args) => {
    const currentUserContext = await requireCurrentFamilyMember(ctx);
    const plant = await ctx.db.get(args.plantId);

    if (!plant || plant.familyId !== currentUserContext.familyId) {
      return null;
    }

    const imagePreviewUrl = plant.imageStorageId
      ? await ctx.storage.getUrl(plant.imageStorageId)
      : null;

    return {
      plantId: plant._id,
      name: plant.name,
      description: plant.description ?? null,
      note: plant.notes ?? null,
      location: plant.location ?? null,
      imageStorageId: plant.imageStorageId ?? null,
      imagePreviewUrl,
    };
  },
});

export const getPlantDetail = query({
  args: {
    plantId: v.id("plants"),
  },
  handler: async (ctx, args) => {
    const currentUserContext = await requireCurrentFamilyMember(ctx);
    const plant = await ctx.db.get(args.plantId);

    if (!plant || plant.familyId !== currentUserContext.familyId) {
      return null;
    }

    const [imageUrl, tasks] = await Promise.all([
      plant.imageStorageId ? ctx.storage.getUrl(plant.imageStorageId) : Promise.resolve(null),
      ctx.db
        .query("plantTasks")
        .withIndex("by_plantId", (q) => q.eq("plantId", plant._id))
        .collect(),
    ]);

    const allTasks = tasks
      .sort((left, right) => left.nextDueAt - right.nextDueAt)
      .map((task) => ({
        id: task._id,
        taskType: task.taskType,
        customLabel: task.customLabel ?? null,
        intervalDays: task.intervalDays,
        nextDueAt: task.nextDueAt,
        lastCompletedAt: task.lastCompletedAt ?? null,
        enabled: task.enabled ?? true,
      }));

    return {
      plant: {
        id: plant._id,
        familyId: plant.familyId,
        name: plant.name,
        description: plant.description ?? null,
        note: plant.notes ?? null,
        location: plant.location ?? null,
        imageStorageId: plant.imageStorageId ?? null,
        imageUrl,
        createdAt: plant.createdAt,
        updatedAt: plant.updatedAt,
        isArchived: plant.isArchived,
        archivedAt: plant.archivedAt ?? null,
      },
      tasks: allTasks,
    };
  },
});

export const listPlantsWithNextDue = query({
  args: {},
  handler: async (ctx) => {
    const currentUserContext = await requireCurrentFamilyMember(ctx);
    const plants = await ctx.db
      .query("plants")
      .withIndex("by_familyId_and_isArchived", (q) =>
        q.eq("familyId", currentUserContext.familyId).eq("isArchived", false),
      )
      .collect();

    const plantsWithNextDue = await Promise.all(
      plants.map(async (plant) => {
        const [imageUrl, tasks] = await Promise.all([
          plant.imageStorageId ? ctx.storage.getUrl(plant.imageStorageId) : Promise.resolve(null),
          ctx.db
            .query("plantTasks")
            .withIndex("by_plantId", (q) => q.eq("plantId", plant._id))
            .collect(),
        ]);

        const nextDueTask = tasks
          .filter((task) => task.enabled)
          .sort((left, right) => left.nextDueAt - right.nextDueAt)[0];

        return {
          id: plant._id,
          name: plant.name,
          description: plant.description ?? null,
          location: plant.location ?? null,
          imageStorageId: plant.imageStorageId ?? null,
          imageUrl,
          creationTime: plant._creationTime,
          nextDueTask: nextDueTask
            ? {
                taskType: nextDueTask.taskType,
                customLabel: nextDueTask.customLabel ?? null,
                nextDueAt: nextDueTask.nextDueAt,
              }
            : null,
        };
      }),
    );

    // Sort by nextDueAt ascending; plants without tasks sink to bottom
    // (among sunk plants, sort by creation time descending — newest first)
    plantsWithNextDue.sort((left, right) => {
      const leftDue = left.nextDueTask?.nextDueAt ?? null;
      const rightDue = right.nextDueTask?.nextDueAt ?? null;

      if (leftDue !== null && rightDue !== null) {
        return leftDue - rightDue;
      }
      if (leftDue !== null && rightDue === null) {
        return -1;
      }
      if (leftDue === null && rightDue !== null) {
        return 1;
      }
      // Both null: sort by creation time descending (newest first)
      return right.creationTime - left.creationTime;
    });

    return {
      plants: plantsWithNextDue,
    };
  },
});

export const updatePlant = mutation({
  args: {
    plantId: v.id("plants"),
    name: v.string(),
    description: v.union(v.string(), v.null()),
    note: v.union(v.string(), v.null()),
    location: v.union(v.string(), v.null()),
    imageStorageId: v.union(v.id("_storage"), v.null()),
  },
  handler: async (ctx, args) => {
    const currentUserContext = await requireCurrentFamilyMember(ctx);
    const plant = await ctx.db.get(args.plantId);

    if (!plant || plant.familyId !== currentUserContext.familyId) {
      throw new Error("This plant does not belong to your current household.");
    }

    const { name } = assertPlantTextWithinLimits(args);

    await ctx.db.patch(args.plantId, {
      name,
      description: args.description ?? undefined,
      notes: args.note ?? undefined,
      location: args.location ?? undefined,
      imageStorageId: args.imageStorageId ?? undefined,
      updatedAt: Date.now(),
    });

    return {
      ok: true as const,
    };
  },
});

export const setPlantArchivedState = mutation({
  args: {
    plantId: v.id("plants"),
    isArchived: v.boolean(),
  },
  handler: async (ctx, args) => {
    const currentUserContext = await requireCurrentFamilyMember(ctx);
    const plant = await ctx.db.get(args.plantId);

    if (!plant || plant.familyId !== currentUserContext.familyId) {
      throw new Error("This plant does not belong to your current household.");
    }

    const archivedAt = args.isArchived ? Date.now() : undefined;

    await ctx.db.patch(args.plantId, {
      isArchived: args.isArchived,
      archivedAt,
      updatedAt: Date.now(),
    });

    return {
      ok: true as const,
    };
  },
});

export const deletePlant = mutation({
  args: {
    plantId: v.id("plants"),
  },
  handler: async (ctx, args) => {
    const currentUserContext = await requireCurrentFamilyMember(ctx);
    const plant = await ctx.db.get(args.plantId);

    if (!plant || plant.familyId !== currentUserContext.familyId) {
      throw new Error("This plant does not belong to your current household.");
    }

    // 级联删除：tasks → completion logs → 图片 → 植物
    const tasks = await ctx.db
      .query("plantTasks")
      .withIndex("by_plantId", (q) => q.eq("plantId", args.plantId))
      .collect();

    for (const task of tasks) {
      // 删除该任务的所有完成记录
      const logs = await ctx.db
        .query("taskCompletionLogs")
        .withIndex("by_taskId", (q) => q.eq("taskId", task._id))
        .collect();
      for (const log of logs) {
        await ctx.db.delete(log._id);
      }
      await ctx.db.delete(task._id);
    }

    // 删除植物图片（如果有）
    if (plant.imageStorageId) {
      await ctx.storage.delete(plant.imageStorageId);
    }

    // 删除植物
    await ctx.db.delete(args.plantId);

    return { ok: true as const };
  },
});

export const getPlantImageUrl = query({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    await requireCurrentFamilyMember(ctx);

    const imageUrl = await ctx.storage.getUrl(args.storageId);
    if (!imageUrl) {
      throw new Error("Plant image preview is no longer available.");
    }

    return {
      imageUrl,
    };
  },
});

export const listArchivedPlants = query({
  args: {},
  handler: async (ctx) => {
    const currentUserContext = await requireCurrentFamilyMember(ctx);
    const plants = await ctx.db
      .query("plants")
      .withIndex("by_familyId_and_isArchived", (q) =>
        q.eq("familyId", currentUserContext.familyId).eq("isArchived", true),
      )
      .collect();

    const archivedPlants = await Promise.all(
      plants.map(async (plant) => {
        const imageUrl = plant.imageStorageId
          ? await ctx.storage.getUrl(plant.imageStorageId)
          : null;

        return {
          id: plant._id,
          name: plant.name,
          imageUrl,
          archivedAt: plant.archivedAt ?? plant._creationTime,
        };
      }),
    );

    // Sort by archivedAt descending (most recently archived first)
    archivedPlants.sort((left, right) => right.archivedAt - left.archivedAt);

    return {
      plants: archivedPlants,
    };
  },
});
