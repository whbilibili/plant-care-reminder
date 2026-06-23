# 养护任务灵活性 —— 功能规格

**版本**：v1.0
**日期**：2026-06-22
**关联文档**：
- 产品决策依据：[2026-06-22-care-task-flexibility-spec.md](./2026-06-22-care-task-flexibility-spec.md)（PRD）
- 架构约束：`ARCHITECTURE.md`
- 数据模型权威来源：`app/convex/schema.ts`

**文档定位**：基于 PRD 的产品决策，从工程视角给出可执行的任务清单、数据流设计、接口契约与验证命令。本文档回答"系统必须如何工作"。

---

## 0. 现状分析与技术可行性

### 0.1 已有基础

| 层 | 现状 | 可复用程度 |
|---|------|-----------|
| Schema | `plantTaskFields.intervalDays: v.number()` 单一间隔字段 | **需新增 `scheduleMode` / `weeklyDays` / `seasonalIntervals` 三字段** |
| 后端 Mutation | `createPlantTask` 接收 `intervalDays`，无排期模式参数 | **需扩展参数 + 新增唯一性校验** |
| 后端 Mutation | `updatePlantTask` 只修改 `intervalDays` / `taskType` / `enabled` | **需扩展排期模式切换 + 重算 nextDueAt** |
| 后端 Mutation | `completePlantTask` 调用 `computeNextDueAt` 只用 `intervalDays` | **需按 scheduleMode 分支调用不同计算函数** |
| 后端 Mutation | `postponePlantTask` 推迟逻辑与排期模式无关 | **完全复用，无需改动** |
| 共享函数 | `scheduling.ts` 仅有 `computeNextDueAt`（固定间隔） | **需新增 `computeNextWeeklyDueAt` / `computeNextSeasonalDueAt`** |
| 前端 | `TaskForm.tsx` 仅有间隔天数输入框 | **需新增排期模式选择器 + 动态表单区** |
| 前端 | `CreateTaskPage.tsx` / `EditTaskPage.tsx` 使用 TaskForm | 需传递新的排期参数 |
| 前端 | 待办页 `listDueTasks` 返回 `intervalDays` | **需补充 scheduleMode 相关字段供展示** |
| 前端 | `DueTaskCard.tsx` 展示"每 N 天" | **需按模式切换展示格式** |

### 0.2 改动范围总结

本次改造涉及三个维度：

1. **数据模型**：`plantTaskFields` 新增 `scheduleMode` / `weeklyDays` / `seasonalIntervals` 三个可选字段
2. **后端接口**：`createPlantTask` 新增参数与唯一性校验；`updatePlantTask` 支持模式切换；`completePlantTask` 分支计算；`listDueTasks` 补充排期描述字段
3. **前端组件**：任务创建/编辑页新增 SegmentedControl 排期选择器 + 动态表单区（每周几选择器 / 季节性输入）；待办页展示适配；任务类型已有标注

---

## 1. 数据流设计

### 1.1 任务创建流程（扩展后）

```
用户进入创建任务页
  |
  v 选择任务类型（watering/fertilizing/...）
  |
  +-- 固定类型：前端检查该植物是否已有同类型 enabled 任务
  |     |
  |     +-- 已有 → 显示"已有"标签 + toast 提示 + "去编辑"跳转
  |     |
  |     +-- 没有 → 允许选择，进入排期配置
  |
  +-- 自定义类型：直接进入排期配置
  |
  v 选择排期模式（SegmentedControl：固定间隔 / 每周几 / 按季节）
  |
  +-- interval：输入间隔天数（现有行为）
  +-- weekly：选择星期几（1~7 天）
  +-- seasonal：输入春夏间隔 + 秋冬间隔
  |
  v 提交 → 调用 createPlantTask mutation
      args: { plantId, taskType, customTaskName, intervalDays, baseCompletedAt,
              scheduleMode, weeklyDays?, seasonalIntervals? }
      |
      +-- 后端校验唯一性（非 custom + enabled + 同 plantId）
      +-- 后端校验排期参数合法性
      +-- 根据 scheduleMode 计算 nextDueAt
      +-- 插入 plantTasks 文档
      +-- 返回 { taskId }
```

### 1.2 任务编辑流程（排期模式切换）

```
用户进入编辑任务页
  |
  v getTaskForEdit query 返回当前任务配置
      （新增返回 scheduleMode / weeklyDays / seasonalIntervals）
  |
  v 用户修改排期模式或参数
  |
  v 提交 → 调用 updatePlantTask mutation
      args: { taskId, taskType, customTaskName, intervalDays, enabled,
              scheduleMode, weeklyDays?, seasonalIntervals? }
      |
      +-- 根据新 scheduleMode 重算 nextDueAt（立即生效）
      +-- 清空不相关字段（如从 weekly 切回 interval，清空 weeklyDays）
      +-- 返回 { ok: true }
```

### 1.3 任务完成流程（nextDueAt 分支计算）

```
用户点击"完成"按钮
  |
  v completePlantTask mutation
      |
      +-- 读取 task.scheduleMode（无字段按 "interval" 处理）
      |
      +-- scheduleMode === "interval":
      |     computeNextDueAt({ intervalDays, baseCompletedAt: completedAt })  ← 现有逻辑
      |
      +-- scheduleMode === "weekly":
      |     computeNextWeeklyDueAt(completedAt, task.weeklyDays)
      |
      +-- scheduleMode === "seasonal":
      |     computeNextSeasonalDueAt(completedAt, task.seasonalIntervals)
      |
      v 写入 taskCompletionLogs + 更新 task.nextDueAt
```

### 1.4 待办页展示流程

```
listDueTasks query
  |
  v 返回每个任务额外字段：
      scheduleMode, weeklyDays, seasonalIntervals
  |
  v 前端根据 scheduleMode 组装展示文案：
      - interval: "每 N 天"
      - weekly: "每周一三五"
      - seasonal: "春夏每 N 天 / 秋冬每 M 天"（当前生效季节加粗）
```

---

## 2. 数据模型变更

### 2.1 `plantTaskFields` 新增字段

**文件**：`app/convex/lib/validators.ts`

```typescript
// 在 plantTaskFields 中新增：

// 排期模式：interval（默认/现有）、weekly、seasonal
// v.optional 向后兼容，老数据无此字段按 "interval" 处理
scheduleMode: v.optional(v.union(
  v.literal("interval"),
  v.literal("weekly"),
  v.literal("seasonal")
)),

// 每周几模式的配置：0=周日, 1=周一, ..., 6=周六
// 仅 scheduleMode === "weekly" 时有值
weeklyDays: v.optional(v.array(v.number())),

// 季节性模式的配置
// 仅 scheduleMode === "seasonal" 时有值
seasonalIntervals: v.optional(v.object({
  springSummer: v.number(),  // 春夏间隔天数（3~8月）
  autumnWinter: v.number(),  // 秋冬间隔天数（9~2月）
})),
```

**设计约束**：
- `scheduleMode` 为 `v.optional`，老数据无此字段时按 `"interval"` 处理，无需数据迁移
- `intervalDays` 字段保留不变：在 `interval` 模式下为排期间隔；在 `seasonal` 模式下存储当前生效的间隔值（供展示用）；在 `weekly` 模式下保留原值但不参与计算
- `weeklyDays` 数组元素为 0~6 整数，无重复，长度 1~7
- `seasonalIntervals` 两个值均为 1~365 正整数

### 2.2 索引评估

- 无需新增索引。唯一性检查通过现有 `by_plantId` 索引查询该植物的所有任务后在应用层过滤。
- 现有 `by_familyId_and_nextDueAt` 索引仍支持待办页查询（nextDueAt 计算逻辑变了，但存储格式不变）。
- 现有 `by_nextDueAt` 索引仍支持 cron 推送扫描。

---

## 3. 后端接口契约

### 3.1 新增共享计算函数

**文件**：`app/src/features/tasks/scheduling.ts`

```typescript
/**
 * 每周几模式：计算下一个匹配的到期时间。
 * 从 completedAt 开始，找到下一个在 weeklyDays 中的星期几。
 * 如果今天完成且今天是匹配日，下次为下一个匹配日（非今天）。
 */
export function computeNextWeeklyDueAt(
  completedAt: number,
  weeklyDays: number[]
): number {
  // 1. 取 completedAt 的 UTC 日期
  // 2. 从明天开始，逐日检查星期几是否在 weeklyDays 中
  // 3. 找到第一个匹配日，返回该日 UTC 0 点的 timestamp
  // 边界：weeklyDays 已排序去重（由 mutation 校验保证）
}

/**
 * 季节性模式：根据完成时间所在季节选择间隔计算 nextDueAt。
 * 3~8月使用 springSummer 间隔，9~2月使用 autumnWinter 间隔。
 * 不在跨季节边界中途切换。
 */
export function computeNextSeasonalDueAt(
  completedAt: number,
  seasonalIntervals: { springSummer: number; autumnWinter: number }
): number {
  // 1. 取 completedAt 的 UTC 月份（0-indexed: 0=Jan, ..., 11=Dec）
  // 2. 判断季节：月份 2~7 (Mar~Aug) → springSummer; 月份 8~1 (Sep~Feb) → autumnWinter
  // 3. 选择对应间隔 N
  // 4. return completedAt + N * MS_PER_DAY
}

/**
 * 根据 scheduleMode 返回当前生效的间隔天数（供展示用）。
 * - interval: task.intervalDays
 * - weekly: 计算 weeklyDays 的平均间隔（近似值，仅展示参考）
 * - seasonal: 根据当前日期所在季节返回对应间隔
 */
export function getEffectiveIntervalDays(task: {
  scheduleMode?: string;
  intervalDays: number;
  weeklyDays?: number[];
  seasonalIntervals?: { springSummer: number; autumnWinter: number };
}): number;

/**
 * 统一入口：根据 scheduleMode 分派到对应计算函数。
 * 向后兼容：scheduleMode 为 undefined 时按 "interval" 处理。
 */
export function computeNextDueAtByMode(params: {
  scheduleMode: "interval" | "weekly" | "seasonal" | undefined;
  intervalDays: number;
  weeklyDays?: number[];
  seasonalIntervals?: { springSummer: number; autumnWinter: number };
  baseCompletedAt: number | null;
  now?: number;
}): number;
```

**校验函数**：

```typescript
/**
 * 校验 weeklyDays 参数合法性。
 * 要求：数组长度 1~7，元素为 0~6 整数，无重复。
 */
export function validateWeeklyDays(weeklyDays: number[]): string | null;

/**
 * 校验 seasonalIntervals 参数合法性。
 * 要求：两个值均为 1~365 正整数。
 */
export function validateSeasonalIntervals(
  intervals: { springSummer: number; autumnWinter: number }
): string | null;
```

### 3.2 改造接口

| 接口 | 文件 | 改动 |
|------|------|------|
| `createPlantTask` | `app/convex/tasks.ts` | 新增参数（scheduleMode/weeklyDays/seasonalIntervals）+ 唯一性校验 + 分支计算 nextDueAt |
| `updatePlantTask` | `app/convex/tasks.ts` | 新增参数 + 支持模式切换 + 清空不相关字段 + 重算 nextDueAt |
| `completePlantTask` / `completeTaskCore` | `app/convex/tasks.ts` | 按 scheduleMode 分支调用不同计算函数 |
| `getTaskForEdit` | `app/convex/tasks.ts` | 返回 scheduleMode / weeklyDays / seasonalIntervals |
| `listDueTasks` | `app/convex/tasks.ts` | 返回 scheduleMode / weeklyDays / seasonalIntervals 供前端展示 |
| `getTaskCreationPlant` | `app/convex/tasks.ts` | 新增返回该植物已有的 enabled 任务类型列表（供前端标注"已有"） |

**`createPlantTask` 改造契约**：

```typescript
export const createPlantTask = mutation({
  args: {
    plantId: v.id("plants"),
    taskType: plantTaskTypeValidator,
    customTaskName: v.union(v.string(), v.null()),
    intervalDays: v.number(),
    baseCompletedAt: v.union(v.number(), v.null()),
    // 新增排期参数
    scheduleMode: v.optional(v.union(
      v.literal("interval"),
      v.literal("weekly"),
      v.literal("seasonal")
    )),
    weeklyDays: v.optional(v.array(v.number())),
    seasonalIntervals: v.optional(v.object({
      springSummer: v.number(),
      autumnWinter: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    // 1. requireCurrentFamilyMember 校验登录态 + 家庭归属
    // 2. 校验植物存在 + 属于当前家庭 + 未归档
    // 3. 校验 customTaskName（现有逻辑不变）
    //
    // 4. 【新增】唯一性校验（PRD §3.5）：
    //    - 若 taskType !== "custom"：
    //      - 查询该 plantId 下所有 enabled=true 的任务
    //      - 若存在同 taskType → throw "这盆植物已有「浇水」任务，请编辑现有任务或先停用它。"
    //
    // 5. 【新增】排期模式参数校验：
    //    const mode = args.scheduleMode ?? "interval"
    //    - mode === "interval": validateIntervalDays(args.intervalDays)
    //    - mode === "weekly": validateWeeklyDays(args.weeklyDays!)
    //    - mode === "seasonal": validateSeasonalIntervals(args.seasonalIntervals!)
    //
    // 6. 【改造】计算 nextDueAt：
    //    computeNextDueAtByMode({
    //      scheduleMode: mode,
    //      intervalDays: args.intervalDays,
    //      weeklyDays: args.weeklyDays,
    //      seasonalIntervals: args.seasonalIntervals,
    //      baseCompletedAt: args.baseCompletedAt,
    //      now: createdAt,
    //    })
    //
    // 7. 插入文档（新增字段写入）：
    //    scheduleMode: mode !== "interval" ? mode : undefined,  // 向后兼容：interval 可不写
    //    weeklyDays: mode === "weekly" ? sortedUniqueDays : undefined,
    //    seasonalIntervals: mode === "seasonal" ? args.seasonalIntervals : undefined,
    //
    // 8. return { taskId }
  },
});
```

**`updatePlantTask` 改造契约**：

```typescript
export const updatePlantTask = mutation({
  args: {
    taskId: v.id("plantTasks"),
    taskType: plantTaskTypeValidator,
    customTaskName: v.union(v.string(), v.null()),
    intervalDays: v.number(),
    enabled: v.boolean(),
    // 新增排期参数
    scheduleMode: v.optional(v.union(
      v.literal("interval"),
      v.literal("weekly"),
      v.literal("seasonal")
    )),
    weeklyDays: v.optional(v.array(v.number())),
    seasonalIntervals: v.optional(v.object({
      springSummer: v.number(),
      autumnWinter: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    // 1. requireCurrentFamilyMember + 任务/植物归属校验（现有）
    // 2. 校验 customTaskName（现有）
    //
    // 3. 【新增】排期模式参数校验（同 createPlantTask）
    //
    // 4. 【改造】计算 nextDueAt：
    //    computeNextDueAtByMode({
    //      scheduleMode: mode,
    //      intervalDays: args.intervalDays,
    //      weeklyDays: args.weeklyDays,
    //      seasonalIntervals: args.seasonalIntervals,
    //      baseCompletedAt: task.lastCompletedAt ?? null,
    //    })
    //
    // 5. 【改造】patch 字段（含清空不相关字段）：
    //    scheduleMode: mode !== "interval" ? mode : undefined,
    //    weeklyDays: mode === "weekly" ? sortedUniqueDays : undefined,
    //    seasonalIntervals: mode === "seasonal" ? args.seasonalIntervals : undefined,
    //    // 注意：从 weekly 切回 interval 时，需显式清空 weeklyDays
    //    // Convex patch 语义：undefined 会删除字段
    //
    // 6. return { ok: true }
  },
});
```

**`completeTaskCore` 改造契约**：

```typescript
async function completeTaskCore(ctx, params) {
  const { task, userId, completedAt } = params;

  // 【改造】根据 scheduleMode 分支计算 nextDueAt
  const mode = task.scheduleMode ?? "interval";
  const nextDueAt = computeNextDueAtByMode({
    scheduleMode: mode,
    intervalDays: task.intervalDays,
    weeklyDays: task.weeklyDays,
    seasonalIntervals: task.seasonalIntervals,
    baseCompletedAt: completedAt,
  });

  // 其余逻辑不变（写 log + patch task + 返回 previous 快照）
}
```

**`getTaskForEdit` 改造细节**：

```typescript
// 在返回的 task 对象中新增：
task: {
  taskId: task._id,
  taskType: task.taskType,
  customTaskName: task.customLabel ?? null,
  intervalDays: task.intervalDays,
  enabled: task.enabled,
  lastCompletedAt: task.lastCompletedAt ?? null,
  // 新增
  scheduleMode: task.scheduleMode ?? "interval",
  weeklyDays: task.weeklyDays ?? null,
  seasonalIntervals: task.seasonalIntervals ?? null,
},
```

**`listDueTasks` 改造细节**：

```typescript
// 在返回的每个 dueTask 对象中新增：
return {
  // ...现有字段
  scheduleMode: task.scheduleMode ?? "interval",
  weeklyDays: task.weeklyDays ?? null,
  seasonalIntervals: task.seasonalIntervals ?? null,
};
```

**`getTaskCreationPlant` 改造细节**：

```typescript
// 新增：返回该植物已有的 enabled 任务类型列表
const existingTasks = await ctx.db
  .query("plantTasks")
  .withIndex("by_plantId", (q) => q.eq("plantId", plant._id))
  .collect();

const existingEnabledTypes = existingTasks
  .filter((t) => t.enabled !== false && t.taskType !== "custom")
  .map((t) => t.taskType);

return {
  // ...现有字段
  existingEnabledTypes,  // string[]，供前端标注"已有"
};
```

---

## 4. 前端组件契约

### 4.1 新增组件

| 组件 | 路径 | Props | 职责 |
|------|------|-------|------|
| `ScheduleModeSelector` | `src/features/tasks/ScheduleModeSelector.tsx` | `value: ScheduleMode`, `onChange: (mode: ScheduleMode) => void` | 排期模式三段选择器（SegmentedControl） |
| `WeeklyDaysPicker` | `src/features/tasks/WeeklyDaysPicker.tsx` | `value: number[]`, `onChange: (days: number[]) => void`, `error?: string` | 每周几选择器（7 个圆形按钮） |
| `SeasonalIntervalsInput` | `src/features/tasks/SeasonalIntervalsInput.tsx` | `value: { springSummer: number; autumnWinter: number }`, `onChange: (v) => void`, `errors?: { springSummer?: string; autumnWinter?: string }` | 季节性间隔双输入框 |

### 4.2 改动组件

| 组件 | 文件 | 改动 |
|------|------|------|
| `TaskForm.tsx` | `src/features/tasks/TaskForm.tsx` | 在间隔天数输入前，插入 `ScheduleModeSelector`；根据模式动态渲染对应配置区（固定间隔/每周几/季节性）；切换模式时重置相关字段 |
| `CreateTaskPage.tsx` | `src/features/tasks/CreateTaskPage.tsx` | 状态管理新增 scheduleMode/weeklyDays/seasonalIntervals；提交时传递新参数；任务类型列表标注"已有" |
| `EditTaskPage.tsx` | `src/features/tasks/EditTaskPage.tsx` | 加载时填充现有排期配置；提交时传递新参数 |
| `DueTaskCard.tsx` | `src/features/tasks/DueTaskCard.tsx` | 排期描述文案根据 scheduleMode 切换格式 |
| `PlanTaskRow.tsx` | `src/features/tasks/PlanTaskRow.tsx` | 排期描述文案适配（植物详情页任务列表） |

### 4.3 类型定义补充

**文件**：`app/src/types/domain.ts`

```typescript
// 新增
export type ScheduleMode = "interval" | "weekly" | "seasonal";

export interface SeasonalIntervals {
  springSummer: number;  // 春夏间隔天数（3~8月）
  autumnWinter: number;  // 秋冬间隔天数（9~2月）
}
```

### 4.4 前端格式化函数

**文件**：`app/src/lib/formatters.ts`（新增导出）

```typescript
/**
 * 将 weeklyDays 数组格式化为中文展示。
 * 如 [1, 3, 5] → "每周一三五"
 */
export function formatWeeklyDays(weeklyDays: number[]): string;

/**
 * 根据 scheduleMode 生成排期描述文案。
 * - interval: "每 N 天"
 * - weekly: "每周一三五"
 * - seasonal: "春夏每 N 天 / 秋冬每 M 天"
 */
export function formatScheduleDescription(params: {
  scheduleMode: ScheduleMode;
  intervalDays: number;
  weeklyDays?: number[] | null;
  seasonalIntervals?: SeasonalIntervals | null;
}): string;
```

---

## 5. 状态管理

| 状态 | 存储位置 | 理由 |
|------|---------|------|
| 排期模式选中值 | `useState` (TaskForm 内) | 表单草稿，纯本地状态 |
| weeklyDays 选中值 | `useState` (TaskForm 内) | 表单草稿 |
| seasonalIntervals 值 | `useState` (TaskForm 内) | 表单草稿 |
| 已有任务类型列表 | Convex `useQuery`（随 `getTaskCreationPlant` 返回） | 服务端状态 |
| 待办任务排期描述 | 前端纯计算（从 `listDueTasks` 返回的字段派生） | 无额外 store |

---

## 6. 任务拆分与执行顺序

### Phase 1：排期计算函数与校验（纯逻辑，可独立单测验证）

| ID | 任务 | 文件 | 依赖 |
|----|------|------|------|
| FLEX-001 | 实现 `computeNextWeeklyDueAt` 函数 + 单测 | `app/src/features/tasks/scheduling.ts` | 无 |
| FLEX-002 | 实现 `computeNextSeasonalDueAt` 函数 + 单测 | `app/src/features/tasks/scheduling.ts` | 无 |
| FLEX-003 | 实现 `computeNextDueAtByMode` 统一分派函数 + 单测 | `app/src/features/tasks/scheduling.ts` | FLEX-001, FLEX-002 |
| FLEX-004 | 实现 `validateWeeklyDays` / `validateSeasonalIntervals` 校验函数 + 单测 | `app/src/features/tasks/scheduling.ts` | 无 |
| FLEX-005 | 实现 `getEffectiveIntervalDays` 展示辅助函数 | `app/src/features/tasks/scheduling.ts` | 无 |

### Phase 2：Schema 扩展 + 后端 Mutation 改造

| ID | 任务 | 文件 | 依赖 |
|----|------|------|------|
| FLEX-006 | Schema 扩展：`plantTaskFields` 新增三字段 | `app/convex/lib/validators.ts` | 无 |
| FLEX-007 | 改造 `createPlantTask`：新增参数 + 唯一性校验 + 分支计算 | `app/convex/tasks.ts` | FLEX-003, FLEX-004, FLEX-006 |
| FLEX-008 | 改造 `updatePlantTask`：新增参数 + 模式切换 + 清空不相关字段 + 重算 | `app/convex/tasks.ts` | FLEX-003, FLEX-004, FLEX-006 |
| FLEX-009 | 改造 `completeTaskCore`：按 scheduleMode 分支计算 nextDueAt | `app/convex/tasks.ts` | FLEX-003, FLEX-006 |
| FLEX-010 | 改造 `getTaskForEdit`：返回排期模式字段 | `app/convex/tasks.ts` | FLEX-006 |
| FLEX-011 | 改造 `listDueTasks`：返回排期模式字段 | `app/convex/tasks.ts` | FLEX-006 |
| FLEX-012 | 改造 `getTaskCreationPlant`：返回已有 enabled 任务类型列表 | `app/convex/tasks.ts` | 无 |

### Phase 3：前端类型与格式化

| ID | 任务 | 文件 | 依赖 |
|----|------|------|------|
| FLEX-013 | 前端类型定义补充（`ScheduleMode` / `SeasonalIntervals`） | `app/src/types/domain.ts` | 无 |
| FLEX-014 | 实现 `formatWeeklyDays` / `formatScheduleDescription` 格式化函数 | `app/src/lib/formatters.ts` | FLEX-013 |

### Phase 4：前端排期组件

| ID | 任务 | 文件 | 依赖 |
|----|------|------|------|
| FLEX-015 | 实现 `ScheduleModeSelector` 组件（三段 SegmentedControl） | `src/features/tasks/ScheduleModeSelector.tsx` | FLEX-013 |
| FLEX-016 | 实现 `WeeklyDaysPicker` 组件（7 个圆形按钮） | `src/features/tasks/WeeklyDaysPicker.tsx` | 无 |
| FLEX-017 | 实现 `SeasonalIntervalsInput` 组件（双输入框） | `src/features/tasks/SeasonalIntervalsInput.tsx` | 无 |

### Phase 5：页面集成

| ID | 任务 | 文件 | 依赖 |
|----|------|------|------|
| FLEX-018 | `TaskForm.tsx` 集成排期模式选择器 + 动态表单区 | `src/features/tasks/TaskForm.tsx` | FLEX-015, FLEX-016, FLEX-017 |
| FLEX-019 | `CreateTaskPage.tsx` 集成：状态管理 + 提交参数 + 已有类型标注 + toast | `src/features/tasks/CreateTaskPage.tsx` | FLEX-012, FLEX-018 |
| FLEX-020 | `EditTaskPage.tsx` 集成：加载现有配置 + 模式切换 + 提交参数 | `src/features/tasks/EditTaskPage.tsx` | FLEX-010, FLEX-018 |
| FLEX-021 | `DueTaskCard.tsx` + `PlanTaskRow.tsx` 排期展示适配 | `src/features/tasks/DueTaskCard.tsx`, `src/features/tasks/PlanTaskRow.tsx` | FLEX-011, FLEX-014 |

### 依赖拓扑

```
FLEX-001 --> FLEX-003
FLEX-002 --> FLEX-003
FLEX-003 --> FLEX-007, FLEX-008, FLEX-009
FLEX-004 --> FLEX-007, FLEX-008

FLEX-006 --> FLEX-007, FLEX-008, FLEX-009, FLEX-010, FLEX-011

FLEX-013 --> FLEX-014, FLEX-015

FLEX-015 --> FLEX-018
FLEX-016 --> FLEX-018
FLEX-017 --> FLEX-018

FLEX-018 --> FLEX-019, FLEX-020

FLEX-012 --> FLEX-019
FLEX-010 --> FLEX-020
FLEX-011 --> FLEX-021
FLEX-014 --> FLEX-021
```

**并行策略**：
- Phase 1（计算函数）与 Phase 3（前端类型/格式化）与 Phase 4（UI 组件，FLEX-016/017 不依赖其它 Phase）可完全并行
- Phase 2（后端改造）依赖 Phase 1 的计算函数完成
- Phase 5（页面集成）依赖 Phase 2 + Phase 4 完成
- FLEX-012（getTaskCreationPlant 改造）无依赖，可最早启动

---

## 7. 交互规格细化

### 7.1 ScheduleModeSelector（排期模式选择器）

- **类型**：SegmentedControl（三段）
- **位置**：任务类型选择之后、具体配置区之前
- **三个选项**："固定间隔"（默认选中）、"每周几"、"按季节"
- **选中态**：`--color-leaf` 背景 + `--color-paper` 文字，`border-radius: 8px`
- **未选态**：`--color-surface` 背景 + `--color-ink` 文字
- **容器**：`background: var(--color-mist)`，`border-radius: 10px`，`padding: 3px`，内部选项占满
- **切换动画**：selected 背景 slide 过渡（150ms ease）
- **切换行为**：切换模式时下方配置区域 fade + height 动画（200ms ease-out）过渡

### 7.2 WeeklyDaysPicker（每周几选择器）

- **布局**：7 个圆形按钮横排均匀分布，容器宽度 100%
- **按钮尺寸**：36px × 36px 圆形
- **文字**：单字"一二三四五六日"，`font-size: 14px`
- **选中态**：`background: var(--color-leaf)` + `color: var(--color-paper)`
- **未选态**：`background: var(--color-surface)` + `color: var(--color-ink)` + `border: 1px solid var(--color-line)`
- **点击反馈**：scale(0.92) 弹跳动画（100ms）
- **校验提示**：一个都未选时按钮区下方出现红色文案"请至少选择一天"（`color: var(--color-danger)`, `font-size: 12px`）
- **顺序**：周一(1) ~ 周日(0)，视觉从左到右为"一二三四五六日"

### 7.3 SeasonalIntervalsInput（季节性间隔输入）

- **布局**：两个输入框并排，各占 50% 宽度，`gap: 12px`
- **标签**："春夏（3~8月）" / "秋冬（9~2月）"，`font-size: 12px`，`color: var(--color-muted)`
- **输入框**：复用项目已有 `InputField` 组件，`type="number"`, `min=1`, `max=365`
- **placeholder**："天"
- **校验**：与固定间隔一致（1~365 正整数），非法时输入框底部红色错误文案

### 7.4 已有类型标注（任务类型选择列表）

- **标注样式**：已有类型选项右侧显示"已有"标签
- **标签样式**：`background: var(--color-mist)`, `color: var(--color-muted)`, `border-radius: 4px`, `padding: 2px 6px`, `font-size: 11px`
- **点击行为**：点击已有类型 → toast "这盆植物已有「浇水」任务，可前往编辑" + "去编辑"按钮
- **"去编辑"按钮**：文字链样式（`color: var(--color-leaf)`, underline），跳转到对应任务的编辑页
- **自定义类型**：永远可选，不展示"已有"标签

### 7.5 待办页展示适配

- **固定间隔**：展示"每 N 天"（现有行为不变）
- **每周几**：展示"每周一三五"格式（中文短星期名拼接，无空格）
- **季节性**：展示"春夏每 N 天 / 秋冬每 M 天"，当前生效的季节文案使用 `font-weight: 600`
- **位置**：在任务卡片副标题区域（原"每 N 天"的位置）

---

## 8. 边界用例与防御

| 场景 | 处理方式 | 涉及组件 |
|------|---------|----------|
| 老数据无 scheduleMode 字段 | 所有读取处 `task.scheduleMode ?? "interval"`，按固定间隔模式处理 | 全局 |
| weekly 模式选了今天且今天完成 | `computeNextWeeklyDueAt` 从明天开始搜索下一个匹配日 | scheduling.ts |
| weekly 只选了一天（如周一） | 等价于每 7 天，但语义更清晰；nextDueAt 始终落在周一 | scheduling.ts |
| seasonal 跨季节边界 | 不中途切换，当前季节间隔算到底；下次完成时才用新季节间隔 | scheduling.ts |
| 从 weekly 切回 interval | patch 时 `weeklyDays: undefined`（Convex 会删除该字段）；用 intervalDays 重算 | updatePlantTask |
| 从 seasonal 切回 interval | patch 时 `seasonalIntervals: undefined`；用 intervalDays 重算 | updatePlantTask |
| 停用的同类型任务存在时创建新任务 | 允许：唯一性只检查 `enabled !== false`（兼容老数据无 enabled 字段） | createPlantTask |
| 编辑任务切换模式 | 立即用新模式重算 nextDueAt 并保存；前端实时预览新到期时间 | updatePlantTask |
| 创建时 scheduleMode 未传 | 默认 `"interval"`，完全兼容现有客户端不升级的情况 | createPlantTask |
| weeklyDays 含重复值 | 后端去重排序后存储（`[...new Set(days)].sort()`） | createPlantTask, updatePlantTask |
| weeklyDays 超出范围（如 7 或 -1） | `validateWeeklyDays` 拒绝，返回错误信息 | scheduling.ts |
| seasonalIntervals 超出 365 或 ≤ 0 | `validateSeasonalIntervals` 拒绝，返回错误信息 | scheduling.ts |
| 推迟逻辑（postpone） | 不受排期模式影响：推迟始终按"今天 0 点 + 1 天"计算；下次完成时才用新模式重算 | postponePlantTask |
| 批量完成（completePlantTasksBatch） | 复用 `completeTaskCore`，自动走分支计算 | tasks.ts |
| 撤销完成（undoCompletePlantTask） | 还原 previous 快照中的 nextDueAt，不涉及排期模式重算 | tasks.ts |

---

## 9. 视觉规格速查

### 9.1 Design Token 使用

本功能不新增 token，全部复用现有 `tokens.css` 变量：

| 用途 | Token |
|------|-------|
| SegmentedControl 选中背景 | `--color-leaf` |
| SegmentedControl 选中文字 | `--color-paper` |
| SegmentedControl 容器背景 | `--color-mist` |
| WeeklyDaysPicker 选中背景 | `--color-leaf` |
| WeeklyDaysPicker 选中文字 | `--color-paper` |
| WeeklyDaysPicker 未选态边框 | `--color-line` |
| 错误提示文字 | `--color-danger`（若不存在则使用 `#d32f2f`） |
| 标签"已有" 背景 | `--color-mist` |
| 标签"已有" 文字 | `--color-muted` |
| 输入框标签 | `--color-muted` |
| 季节加粗展示（待办页） | `font-weight: 600` |

### 9.2 响应式

- 所有新增 UI 按 375px 移动优先设计
- SegmentedControl 宽度 100%，三个选项等分
- WeeklyDaysPicker 7 个按钮横排均分，小屏不换行
- SeasonalIntervalsInput 两框并排 50%，`gap: 12px`

### 9.3 动画

- SegmentedControl 切换：背景 slide `150ms ease`
- 配置区切换：`opacity 0→1` + `maxHeight 0→auto`，`200ms ease-out`
- WeeklyDaysPicker 点击：`transform: scale(0.92)` → `scale(1)`，`100ms`
- 所有动画尊重 `prefers-reduced-motion`（fallback 到 instant 切换）

---

## 10. 验证命令

```bash
# TypeScript 编译
cd app && npm run typecheck

# Convex 类型检查（含 schema 变更验证）
cd app && npx convex dev --once --typecheck enable

# 单元测试（含新增计算函数测试）
cd app && npm run test

# 功能验证要点（375px 宽度）
# 1. 创建任务：SegmentedControl 三种模式可切换，切换后表单动态更新
# 2. 固定间隔：行为与现有完全一致（回归无破坏）
# 3. 每周几：选择 1~7 天，完成后正确计算下一个匹配日
# 4. 季节性：设置春夏/秋冬间隔，完成后按当前季节正确计算
# 5. 唯一性：同一植物创建重复固定类型时拦截+提示
# 6. 编辑：切换模式时立即重算 nextDueAt，保存后生效
# 7. 待办页：三种模式的排期文案正确展示
# 8. 老数据：无 scheduleMode 的任务按固定间隔正常工作
# 9. 推迟：三种模式下 postpone 均正常（推迟后完成时按模式重算）
```

---

## 11. 验收 Checklist

### 11.1 排期计算函数

- [ ] `computeNextWeeklyDueAt` 正确找到下一个匹配日
- [ ] `computeNextWeeklyDueAt` 今天完成且今天是匹配日 → 返回下一个匹配日（非今天）
- [ ] `computeNextWeeklyDueAt` 多日选择取最近的下一个匹配日
- [ ] `computeNextWeeklyDueAt` 跨周正确处理（如周五完成，只选了周一 → 下周一）
- [ ] `computeNextSeasonalDueAt` 春夏月份（3~8月）使用 springSummer 间隔
- [ ] `computeNextSeasonalDueAt` 秋冬月份（9~2月）使用 autumnWinter 间隔
- [ ] `computeNextSeasonalDueAt` 跨季节边界不中途切换（8月28日+7天=9月4日仍用春夏间隔）
- [ ] `validateWeeklyDays` 拒绝空数组、超范围值、重复值
- [ ] `validateSeasonalIntervals` 拒绝 ≤0 或 >365 的值
- [ ] 所有计算函数有充分单测覆盖

### 11.2 后端 Mutation

- [ ] `createPlantTask` 接受 scheduleMode / weeklyDays / seasonalIntervals 参数
- [ ] `createPlantTask` 固定类型唯一性校验（同植物 + 同类型 + enabled → 拒绝）
- [ ] `createPlantTask` weekly 模式：去重排序后存储 weeklyDays
- [ ] `createPlantTask` seasonal 模式：正确存储 seasonalIntervals
- [ ] `createPlantTask` 未传 scheduleMode 时按 interval 处理（向后兼容）
- [ ] `updatePlantTask` 模式切换时清空不相关字段
- [ ] `updatePlantTask` 模式切换时立即重算 nextDueAt
- [ ] `completeTaskCore` 按 scheduleMode 分支正确计算 nextDueAt
- [ ] `getTaskForEdit` 返回排期模式相关字段
- [ ] `listDueTasks` 返回排期模式相关字段
- [ ] `getTaskCreationPlant` 返回已有 enabled 任务类型列表

### 11.3 前端组件

- [ ] SegmentedControl 三种模式可切换，默认选中"固定间隔"
- [ ] 切换模式时配置区域动画平滑过渡
- [ ] WeeklyDaysPicker 7 个按钮可多选，选中态视觉正确
- [ ] WeeklyDaysPicker 至少选 1 个的校验
- [ ] SeasonalIntervalsInput 双输入框并排，校验 1~365
- [ ] 任务类型列表中已有类型标注"已有"标签
- [ ] 点击已有类型 toast 提示 + "去编辑"跳转入口
- [ ] 自定义类型不受唯一性限制

### 11.4 待办页展示

- [ ] 固定间隔：展示"每 N 天"
- [ ] 每周几：展示"每周一三五"格式
- [ ] 季节性：展示"春夏每 N 天 / 秋冬每 M 天"，当前季节加粗
- [ ] 排期描述在 375px 宽度下不溢出

### 11.5 向后兼容

- [ ] 老数据（无 scheduleMode）正常按固定间隔工作
- [ ] 现有 API 不传 scheduleMode 时不报错
- [ ] 现有任务的 nextDueAt 计算不受影响
- [ ] 推迟逻辑（postpone）在三种模式下均正常工作
- [ ] 撤销完成（undo）不涉及排期重算，还原快照即可
- [ ] 批量完成在三种模式下均正确

### 11.6 通用

- [ ] TypeScript 编译无 error
- [ ] Convex schema 可通过类型检查
- [ ] 375px 宽度下所有新增 UI 可用
- [ ] 所有色值/间距/圆角引用 token 变量，无硬编码
- [ ] 动画尊重 `prefers-reduced-motion`
