/**
 * 临时种子脚本：为指定家庭批量插入测试用植物和任务数据。
 * 用法：在 Convex Dashboard → Functions → seedTestData:seed 中运行，
 *       或 npx convex run seedTestData:seed
 *
 * 运行后可通过 npx convex run seedTestData:cleanup 清除所有测试数据。
 */
import type { Id } from "./_generated/dataModel";
import { mutation } from "./_generated/server";

const DAY = 86_400_000;

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    // ── 1. 找到「小99的家」 ──
    const allFamilies = await ctx.db.query("families").collect();
    const family = allFamilies.find((f) => f.name === "小99的家");
    if (!family) throw new Error("找不到名为「小99的家」的家庭，请先创建");

    const familyId = family._id;
    const createdBy = family.createdBy;
    const now = Date.now();

    // ── 2. 植物数据 ──
    const plantsData = [
      { name: "绿萝", location: "客厅窗台", description: "好养活的观叶植物，净化空气小能手" },
      { name: "多肉拼盘", location: "书桌", description: "五种多肉的组合盆栽" },
      { name: "栀子花", location: "阳台", description: "夏天会开白色香花" },
      { name: "琴叶榕", location: "客厅角落", description: "大叶观赏植物，颜值担当" },
      { name: "薄荷", location: "厨房", description: "可以摘叶子泡水喝" },
      { name: "文竹", location: "卧室", description: "喜欢湿润环境的优雅小植物" },
      { name: "吊兰", location: "阳台", description: "垂吊生长，适合挂盆" },
      { name: "仙人掌", location: "书桌", description: "懒人植物，一个月浇一次水就行" },
    ];

    const plantIds: Array<Id<"plants">> = [];
    for (const p of plantsData) {
      const id = await ctx.db.insert("plants", {
        familyId,
        name: p.name,
        location: p.location,
        description: p.description,
        notes: undefined,
        imageStorageId: undefined,
        createdBy,
        createdAt: now - 7 * DAY, // 假设一周前创建
        updatedAt: now,
        isArchived: false,
        archivedAt: undefined,
      });
      plantIds.push(id);
    }

    // ── 3. 任务数据 ──
    // 设计不同的 nextDueAt 覆盖各种测试场景
    const tasksData = [
      // 绿萝的任务
      { plantIdx: 0, taskType: "watering" as const, intervalDays: 3, dueOffset: -2 * DAY, lastCompletedOffset: -5 * DAY },   // 逾期2天
      { plantIdx: 0, taskType: "fertilizing" as const, intervalDays: 14, dueOffset: -5 * DAY, lastCompletedOffset: -19 * DAY }, // 逾期5天
      { plantIdx: 0, taskType: "misting" as const, intervalDays: 2, dueOffset: 0, lastCompletedOffset: -2 * DAY },            // 今天到期

      // 多肉拼盘的任务
      { plantIdx: 1, taskType: "watering" as const, intervalDays: 7, dueOffset: 1 * DAY, lastCompletedOffset: -6 * DAY },     // 明天到期
      { plantIdx: 1, taskType: "repotting" as const, intervalDays: 90, dueOffset: 3 * DAY, lastCompletedOffset: -87 * DAY },   // 3天后到期

      // 栀子花的任务
      { plantIdx: 2, taskType: "watering" as const, intervalDays: 2, dueOffset: -1 * DAY, lastCompletedOffset: -3 * DAY },    // 逾期1天
      { plantIdx: 2, taskType: "pruning" as const, intervalDays: 30, dueOffset: 0, lastCompletedOffset: -30 * DAY },          // 今天到期
      { plantIdx: 2, taskType: "fertilizing" as const, intervalDays: 21, dueOffset: 7 * DAY, lastCompletedOffset: -14 * DAY }, // 7天后到期

      // 琴叶榕的任务
      { plantIdx: 3, taskType: "watering" as const, intervalDays: 5, dueOffset: -3 * DAY, lastCompletedOffset: -8 * DAY },    // 逾期3天
      { plantIdx: 3, taskType: "misting" as const, intervalDays: 3, dueOffset: 0, lastCompletedOffset: -3 * DAY },            // 今天到期
      { plantIdx: 3, taskType: "custom" as const, customLabel: "擦叶片", intervalDays: 14, dueOffset: 2 * DAY, lastCompletedOffset: -12 * DAY }, // 后天到期

      // 薄荷的任务
      { plantIdx: 4, taskType: "watering" as const, intervalDays: 1, dueOffset: -1 * DAY, lastCompletedOffset: -2 * DAY },    // 逾期1天
      { plantIdx: 4, taskType: "pruning" as const, intervalDays: 7, dueOffset: 1 * DAY, lastCompletedOffset: -6 * DAY },      // 明天到期

      // 文竹的任务
      { plantIdx: 5, taskType: "watering" as const, intervalDays: 3, dueOffset: 0, lastCompletedOffset: -3 * DAY },           // 今天到期
      { plantIdx: 5, taskType: "misting" as const, intervalDays: 1, dueOffset: -4 * DAY, lastCompletedOffset: -5 * DAY },     // 逾期4天

      // 吊兰的任务
      { plantIdx: 6, taskType: "watering" as const, intervalDays: 4, dueOffset: 2 * DAY, lastCompletedOffset: -2 * DAY },     // 2天后到期
      { plantIdx: 6, taskType: "fertilizing" as const, intervalDays: 30, dueOffset: 14 * DAY, lastCompletedOffset: -16 * DAY },// 14天后到期

      // 仙人掌的任务
      { plantIdx: 7, taskType: "watering" as const, intervalDays: 30, dueOffset: 10 * DAY, lastCompletedOffset: -20 * DAY },  // 10天后到期
      { plantIdx: 7, taskType: "repotting" as const, intervalDays: 180, dueOffset: 60 * DAY, lastCompletedOffset: -120 * DAY },// 60天后到期
    ];

    let taskCount = 0;
    for (const t of tasksData) {
      const plantId = plantIds[t.plantIdx];
      const nextDueAt = now + t.dueOffset;
      const lastCompletedAt = now + t.lastCompletedOffset;

      await ctx.db.insert("plantTasks", {
        plantId,
        familyId,
        taskType: t.taskType,
        customLabel: "customLabel" in t ? (t as any).customLabel : undefined,
        intervalDays: t.intervalDays,
        enabled: true,
        lastCompletedAt,
        lastNotifiedAt: undefined,
        nextDueAt,
        consecutivePostponeCount: 0,
        createdBy,
        createdAt: now - 7 * DAY,
        updatedAt: now,
      });
      taskCount++;
    }

    return {
      message: `种子数据创建完成：${plantsData.length} 棵植物，${taskCount} 个任务`,
      familyId,
      familyName: family.name,
      summary: {
        overdue: "绿萝浇水(-2d), 绿萝施肥(-5d), 栀子花浇水(-1d), 琴叶榕浇水(-3d), 薄荷浇水(-1d), 文竹喷雾(-4d)",
        dueToday: "绿萝喷雾, 栀子花修剪, 琴叶榕喷雾, 文竹浇水",
        upcoming: "多肉浇水(+1d), 薄荷修剪(+1d), 琴叶榕擦叶片(+2d), 吊兰浇水(+2d), 多肉换盆(+3d), 栀子花施肥(+7d), 仙人掌浇水(+10d), 吊兰施肥(+14d), 仙人掌换盆(+60d)",
      },
    };
  },
});

/** 清除本脚本创建的所有测试数据（按 familyId 批量删除植物及其任务）。 */
export const cleanup = mutation({
  args: {},
  handler: async (ctx) => {
    const allFamilies = await ctx.db.query("families").collect();
    const family = allFamilies.find((f) => f.name === "小99的家");
    if (!family) throw new Error("找不到名为「小99的家」的家庭");

    const tasks = await ctx.db
      .query("plantTasks")
      .withIndex("by_familyId", (q) => q.eq("familyId", family._id))
      .collect();
    for (const t of tasks) await ctx.db.delete(t._id);

    const plants = await ctx.db
      .query("plants")
      .withIndex("by_familyId", (q) => q.eq("familyId", family._id))
      .collect();
    for (const p of plants) await ctx.db.delete(p._id);

    const logs = await ctx.db
      .query("taskCompletionLogs")
      .withIndex("by_familyId_and_completedAt", (q) => q.eq("familyId", family._id))
      .collect();
    for (const l of logs) await ctx.db.delete(l._id);

    return {
      message: `清理完成：删除 ${plants.length} 棵植物、${tasks.length} 个任务、${logs.length} 条完成记录`,
    };
  },
});
