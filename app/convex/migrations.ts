import { internalMutation } from "./_generated/server";

/**
 * 一次性数据迁移（ROLE-011）：将每个家庭的 createdBy 对应的 admin membership 升级为 owner。
 *
 * 边界处理：
 * - 已有 owner 的家庭跳过（幂等）。
 * - createdBy 已退出（无对应 membership）→ 取最早加入的 admin。
 * - 无 admin → 取最早加入的 member。
 *
 * 迁移后保证每个家庭有且仅有一个 owner。
 *
 * 运行方式：npx convex run migrations:migrateRolesToOwner --prod
 * 迁移完成后此文件可删除或保留作为幂等安全网。
 */
export const migrateRolesToOwner = internalMutation({
  args: {},
  handler: async (ctx) => {
    const families = await ctx.db.query("families").collect();
    let migrated = 0;
    let skipped = 0;

    for (const family of families) {
      // 取该家庭的所有成员
      const members = await ctx.db
        .query("familyMembers")
        .withIndex("by_familyId", (q) => q.eq("familyId", family._id))
        .collect();

      // 如果已有 owner，跳过（幂等）
      const existingOwner = members.find((m) => m.role === "owner");
      if (existingOwner) {
        skipped++;
        continue;
      }

      // 空家庭无成员，跳过
      if (members.length === 0) {
        skipped++;
        continue;
      }

      // 策略1：createdBy 对应的成员
      const creatorMembership = members.find(
        (m) => m.userId === family.createdBy,
      );
      if (creatorMembership) {
        await ctx.db.patch(creatorMembership._id, { role: "owner" });
        migrated++;
        continue;
      }

      // 策略2：createdBy 已退出，取最早加入的 admin
      const admins = members
        .filter((m) => m.role === "admin")
        .sort((a, b) => a.joinedAt - b.joinedAt);
      if (admins.length > 0) {
        await ctx.db.patch(admins[0]._id, { role: "owner" });
        migrated++;
        continue;
      }

      // 策略3：无 admin，取最早加入的 member
      const sorted = [...members].sort((a, b) => a.joinedAt - b.joinedAt);
      await ctx.db.patch(sorted[0]._id, { role: "owner" });
      migrated++;
    }

    return { migrated, skipped, totalFamilies: families.length };
  },
});
