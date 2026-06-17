import { describe, expect, it } from "vitest";

/**
 * 图标系统纪律守护（ICON-008）。
 *
 * 目的：把『icon-system-v0.4 已迁移落点不准回退到 emoji』固化为可执行守护，
 * 防止后续 PR 在这些文件里回灌被替换掉的功能性 emoji。
 *
 * 设计要点：
 * - 用 Vite `import.meta.glob('?raw', eager)` 在构建期把落点源文件作为原始文本读入，
 *   避免在 src/ 测试里引入 node:fs（app tsconfig 只含 vite/client 类型）。
 * - 仅扫描本模块实际迁移过的 A/B 级落点文件（其它仍含 emoji 的文件——如
 *   SettingCardHeader chip、CompleteAllButton、头像兜底——不在本模块 9 个任务
 *   的范围内，由后续任务/迭代处理，这里不误伤）。
 * - 黑名单 = 本模块已替换掉的功能性 emoji（任务类型 / 操作 / 信息标识 / 导航）。
 * - 白名单 = C 级装饰/情感 emoji（🌿🍃🌱），按迁移方案明确保留，不在黑名单内。
 * - 故意在任一落点文件回灌一个黑名单 emoji，本测试应当变红（自验证有效性）。
 */

// 构建期把全部相关源文件读成原始文本（key 为相对本文件的路径）。
const RAW_SOURCES = import.meta.glob(
  [
    "../components/navigation/BottomNav.tsx",
    "../features/tasks/taskTypes.ts",
    "../features/tasks/TaskTypeBadge.tsx",
    "../features/tasks/PlanTaskRow.tsx",
    "../features/plants/PlantCard.tsx",
    "../features/plants/PlantDetailPage.tsx",
    "../features/tasks/DueTaskCard.tsx",
    "../features/tasks/CompleteTaskButton.tsx",
    "../features/tasks/ActionableTaskRow.tsx",
    "../features/family/FamilyHeroCard.tsx",
    "../features/notifications/NotificationPromptCard.tsx",
    "../features/tasks/ActionableTaskSection.tsx",
    "../features/tasks/PlanSection.tsx",
    "../features/plants/PlantArchiveSection.tsx",
    "../features/plants/DetailNavBar.tsx",
  ],
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

// 黑名单：本模块已替换掉的功能性 emoji，绝不允许在上述文件中复现。
// 含导航 🗓️⚙️、任务类型 💧🧪🌫️✂️🏷️📋、操作 ✔✎✏️🔔、信息标识 📝⚠️。
const FORBIDDEN_EMOJI = [
  "🗓️", "🗓", "⚙️", "⚙", // 导航
  "💧", "🧪", "🌫️", "🌫", "✂️", "✂", "🏷️", "🏷", "📋", // 任务类型
  "✔️", "✔", "✎", "✏️", "✏", "🔔", // 操作
  "📝", "⚠️", "⚠", // 信息标识
];

// 白名单：C 级装饰/情感 emoji，按迁移方案保留，不应被黑名单覆盖。
const C_LEVEL_WHITELIST = ["🌿", "🍃", "🌱"];

const SOURCE_ENTRIES = Object.entries(RAW_SOURCES);

describe("功能性 emoji 不回灌守护 (ICON-008)", () => {
  it("黑名单与 C 级白名单无交集（守护配置自检）", () => {
    const overlap = FORBIDDEN_EMOJI.filter((e) => C_LEVEL_WHITELIST.includes(e));
    expect(overlap, `黑名单误伤 C 级装饰 emoji: ${overlap.join(" ")}`).toHaveLength(0);
  });

  it("glob 命中全部 15 个落点文件（防止路径写错导致守护空转）", () => {
    expect(SOURCE_ENTRIES).toHaveLength(15);
  });

  it.each(SOURCE_ENTRIES)("%s 不含被替换的功能性 emoji", (relPath, source) => {
    const hits = FORBIDDEN_EMOJI.filter((emoji) => source.includes(emoji));
    expect(
      hits,
      `${relPath} 出现了应已迁移的功能性 emoji: ${hits.join(" ")}（请改用 Lucide 经 Icon 壳）`,
    ).toEqual([]);
  });

  it("C 级装饰 emoji 仍被允许（验证白名单不过度封杀）", () => {
    // FamilyHeroCard 保留右上角装饰 🌿，应当不被守护误杀。
    const entry = SOURCE_ENTRIES.find(([p]) => p.endsWith("FamilyHeroCard.tsx"));
    expect(entry, "未读到 FamilyHeroCard.tsx 源文件").toBeDefined();
    const source = entry![1];
    const hasDecorative = C_LEVEL_WHITELIST.some((e) => source.includes(e));
    expect(hasDecorative, "FamilyHeroCard 应保留 C 级装饰 🌿").toBe(true);
  });
});
