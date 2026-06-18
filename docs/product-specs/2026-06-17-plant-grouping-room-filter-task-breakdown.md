# 植物分组与房间筛选 —— 功能规格

**版本**：v1.0
**日期**：2026-06-17
**关联文档**：
- 产品决策依据：[2026-06-17-plant-grouping-room-filter-spec.md](./2026-06-17-plant-grouping-room-filter-spec.md)（PRD）
- 架构约束：`ARCHITECTURE.md`
- 数据模型权威来源：`app/convex/schema.ts`

**文档定位**：基于 PRD 的产品决策，从工程视角给出可执行的任务清单、数据流设计、组件契约与验证命令。本文档回答"系统必须如何工作"。

---

## 0. 现状分析与技术可行性

### 0.1 已有基础

| 层 | 现状 | 可复用程度 |
|---|------|-----------|
| Schema | `plants.location: v.optional(v.string())`，最长 30 字符 | 完全复用，无需变更 |
| 后端 Query | `listPlantsWithNextDue` 已返回 `location` 字段 | 完全复用 |
| 后端 Query | `listDueTasks` 返回任务列表，植物 join 只取 `plantName` + `plantImageUrl` | **需补充 `location` 字段** |
| 前端搜索 | `PlantListPage` 已有 client-side 文本搜索覆盖 `location` | 可参考模式 |
| 前端表单 | `PlantForm.tsx` location 为纯文本 `InputField` | 需增强为 autocomplete |
| 状态管理 | 筛选 UI 状态属于局部状态（ARCHITECTURE.md 明确） | localStorage / useState |

### 0.2 需要改动的唯一后端点

PRD 声称"无需新增后端接口"，但经代码审查发现：`listDueTasks`（`app/convex/tasks.ts`）在 join 植物数据时**未返回 `location`**。待办页房间筛选需要知道每个任务关联植物的位置。

**解决方案**：在 `listDueTasks` 的植物 join 逻辑中，补充返回 `plantLocation` 字段。这是一个字段级的微调（加一行），不涉及新接口或新索引，符合 PRD "纯前端筛选"的精神——数据随已有 query 一并返回，筛选仍在前端完成。

---

## 1. 数据流设计

### 1.1 植物列表页 —— 分组视图

```
listPlantsWithNextDue (已有 query，无需改动)
  │
  ▼ 返回 Plant[] (含 location)
  │
  ▼ 前端 groupBy(location)
  │
  ├─ location="阳台" → [plant1, plant2, ...]
  ├─ location="客厅" → [plant3, ...]
  └─ location=null/undefined → "未分组" [plant4, ...]
```

**分组算法**（纯前端）：

```typescript
function groupPlantsByLocation(plants: PlantWithNextDue[]): PlantGroup[] {
  const groups = new Map<string, PlantWithNextDue[]>();
  const ungrouped: PlantWithNextDue[] = [];

  for (const plant of plants) {
    if (plant.location) {
      const list = groups.get(plant.location) ?? [];
      list.push(plant);
      groups.set(plant.location, list);
    } else {
      ungrouped.push(plant);
    }
  }

  // 按数量降序排列
  const sorted = [...groups.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([location, items]) => ({ location, plants: items }));

  // "未分组"永远在最后
  if (ungrouped.length > 0) {
    sorted.push({ location: null, plants: ungrouped });
  }

  return sorted;
}
```

### 1.2 待办页 —— 房间筛选

```
listDueTasks (需补充 plantLocation 字段)
  │
  ▼ 返回 { overdue, today, upcoming }，每个 task 含 plantLocation
  │
  ▼ 前端提取可用 locations: Set<string>
  │   (只保留当前有任务的 location，排除 null)
  │
  ▼ 用户选择某 location → filter tasks by plantLocation
  │
  ▼ 渲染筛选后的 overdue/today/upcoming
```

**筛选逻辑**（纯前端）：

```typescript
function filterTasksByLocation(
  buckets: { overdue: Task[]; today: Task[]; upcoming: Task[] },
  selectedLocation: string | null // null = "全部"
) {
  if (selectedLocation === null) return buckets;
  
  const filter = (tasks: Task[]) =>
    tasks.filter(t => t.plantLocation === selectedLocation);

  return {
    overdue: filter(buckets.overdue),
    today: filter(buckets.today),
    upcoming: filter(buckets.upcoming),
  };
}

// 提取可用 location 列表（只展示有任务的）
function extractAvailableLocations(
  buckets: { overdue: Task[]; today: Task[]; upcoming: Task[] }
): string[] {
  const allTasks = [...buckets.overdue, ...buckets.today, ...buckets.upcoming];
  const locations = new Set<string>();
  for (const task of allTasks) {
    if (task.plantLocation) locations.add(task.plantLocation);
  }
  // 按出现频率排序
  const freq = new Map<string, number>();
  for (const task of allTasks) {
    if (task.plantLocation) {
      freq.set(task.plantLocation, (freq.get(task.plantLocation) ?? 0) + 1);
    }
  }
  return [...locations].sort((a, b) => (freq.get(b) ?? 0) - (freq.get(a) ?? 0));
}
```

### 1.3 位置自动补全

```
listPlantsWithNextDue (已有 query)
  │
  ▼ 前端提取去重: [...new Set(plants.map(p => p.location).filter(Boolean))]
  │
  ▼ 用户输入时 → 模糊匹配已有列表 → 展示下拉建议
```

---

## 2. 后端改动（唯一一处）

### 2.1 `listDueTasks` 补充 `plantLocation`

**文件**：`app/convex/tasks.ts`

**改动位置**：`listDueTasks` 函数中，植物数据 join 的部分（当前只取 `plantName` 和 `plantImageUrl`）。

**改动内容**：在返回的任务对象中增加 `plantLocation: plant.location ?? null`。

**影响范围**：
- 返回类型增加 `plantLocation: string | null` 字段
- 前端 `TodoPage.tsx` 中的 task 类型定义需同步
- 不影响现有功能（新增字段，向后兼容）

---

## 3. 前端组件契约

### 3.1 新增组件

| 组件 | 路径 | Props | 职责 |
|------|------|-------|------|
| `SegmentedControl` | `src/components/ui/SegmentedControl.tsx` | `options: {label, value}[]`, `selected: string`, `onChange: (v) => void` | 通用分段控制器，植物列表页视图切换 |
| `PlantGroupView` | `src/features/plants/PlantGroupView.tsx` | `groups: PlantGroup[]`, `onPlantPress: (id) => void` | 分组视图：分组头 + 折叠/展开 + 组内 PlantCard 列表 |
| `GroupHeader` | `src/features/plants/GroupHeader.tsx` | `title: string`, `count: number`, `isExpanded: boolean`, `onToggle: () => void` | 分组头组件 |
| `RoomFilterChips` | `src/features/tasks/RoomFilterChips.tsx` | `locations: string[]`, `selected: string | null`, `onChange: (v) => void` | 房间筛选标签栏（横向滚动 chips） |
| `LocationAutocomplete` | `src/features/plants/LocationAutocomplete.tsx` | `value: string`, `onChange: (v) => void`, `suggestions: string[]`, `maxLength: number` | 位置输入 + 自动补全下拉 |

### 3.2 改动组件

| 组件 | 改动 |
|------|------|
| `PlantListPage.tsx` | 搜索栏下方插入 `SegmentedControl`；根据选中视图渲染平铺列表或 `PlantGroupView`；视图选择持久化到 localStorage |
| `TodoPage.tsx` | 情感反馈区下方插入 `RoomFilterChips`；对 `listDueTasks` 返回数据做前端 location 过滤 |
| `PlantForm.tsx` | location 字段从 `InputField` 替换为 `LocationAutocomplete` |

### 3.3 类型定义补充

**文件**：`app/src/types/domain.ts`

```typescript
// 新增
export interface PlantGroup {
  location: string | null; // null 表示"未分组"
  plants: PlantWithNextDue[];
}

// listDueTasks 返回的 task 类型需补充
// plantLocation: string | null
```

---

## 4. 状态管理

| 状态 | 存储位置 | 理由 |
|------|---------|------|
| 视图切换（全部/按房间） | `localStorage` + `useState` | 持久化用户偏好，跨会话保持 |
| 分组折叠/展开状态 | `useState` (Map) | 会话内临时状态，无需持久化 |
| 房间筛选选中项 | `useState` | 切换页面后重置为"全部"是合理的 |
| 自动补全下拉展开 | `useState` | 纯交互状态 |

**localStorage key 约定**：`plant-care:plant-list-view-mode`，值为 `"all"` 或 `"by-room"`。

---

## 5. 任务拆分与执行顺序

### Phase 1：数据层准备（无 UI 变更，可独立验证）

| ID | 任务 | 文件 | 依赖 |
|----|------|------|------|
| GRP-001 | `listDueTasks` 补充 `plantLocation` 字段 | `app/convex/tasks.ts` | 无 |
| GRP-002 | 前端类型定义补充 `PlantGroup` + task 类型更新 | `app/src/types/domain.ts` | GRP-001 |

### Phase 2：植物列表分组视图

| ID | 任务 | 文件 | 依赖 |
|----|------|------|------|
| GRP-003 | 实现 `SegmentedControl` 通用组件 | `src/components/ui/SegmentedControl.tsx` | 无 |
| GRP-004 | 实现 `GroupHeader` 组件 | `src/features/plants/GroupHeader.tsx` | 无 |
| GRP-005 | 实现 `PlantGroupView` 组件（含分组算法） | `src/features/plants/PlantGroupView.tsx` | GRP-003, GRP-004 |
| GRP-006 | `PlantListPage` 集成视图切换 + 分组视图 + localStorage 持久化 | `src/features/plants/PlantListPage.tsx` | GRP-005 |

### Phase 3：待办页房间筛选

| ID | 任务 | 文件 | 依赖 |
|----|------|------|------|
| GRP-007 | 实现 `RoomFilterChips` 组件 | `src/features/tasks/RoomFilterChips.tsx` | 无 |
| GRP-008 | `TodoPage` 集成房间筛选（提取 locations + 过滤逻辑） | `src/features/tasks/TodoPage.tsx` | GRP-001, GRP-007 |

### Phase 4：位置自动补全

| ID | 任务 | 文件 | 依赖 |
|----|------|------|------|
| GRP-009 | 实现 `LocationAutocomplete` 组件 | `src/features/plants/LocationAutocomplete.tsx` | 无 |
| GRP-010 | `PlantForm` 集成 autocomplete 替换原 InputField | `src/features/plants/PlantForm.tsx` | GRP-009 |

### 依赖拓扑

```
GRP-001 ──→ GRP-002 ──→ GRP-008
                              ↑
GRP-003 ──→ GRP-005 ──→ GRP-006    GRP-007 ─┘
GRP-004 ──┘
GRP-009 ──→ GRP-010
```

Phase 2 和 Phase 4 可与 Phase 1 并行开发（UI 组件不依赖后端改动）。Phase 3 的集成（GRP-008）依赖 GRP-001 完成。

---

## 6. 交互规格细化

### 6.1 SegmentedControl

- 两个选项："全部" / "按房间"
- 宽度与搜索栏等宽（`100%` of content area）
- 高度 36px，圆角 `--radius-md`（8px）
- 选中项：`--color-leaf` 背景 + 白色文字
- 未选中项：透明背景 + `--color-ink` 文字
- 切换动画：选中指示器 200ms ease 滑动
- 位于搜索栏下方，间距 `--space-sm`（8px）

### 6.2 GroupHeader

- 高度 40px，背景 `--color-surface-secondary`
- 左侧：位置名称（`--font-body-sm` 粗体，`--color-ink`）+ 数量（`--color-muted`，格式 `（N）`）
- 右侧：ChevronDown/ChevronUp 图标，16px，`--color-muted`
- 点击整行触发折叠/展开
- 折叠动画：组内内容 200ms ease-out 高度收缩
- "未分组"分组头文案为"未分组"，样式与其他分组一致
- 文本超长时截断加省略号（`text-overflow: ellipsis`），最大宽度为行宽减去数量和箭头区域

### 6.3 RoomFilterChips

- 横向滚动容器，`overflow-x: auto`，隐藏滚动条（`-webkit-scrollbar: none`）
- 容器左右 padding `--space-md`（16px），chips 间距 8px
- 每个 chip：高度 32px，圆角 16px（pill），padding 水平 12px
- 选中态：`--color-leaf` 背景 + 白色文字
- 未选中态：`--color-surface-secondary` 背景 + `--color-ink` 文字
- 第一个 chip 永远是"全部"
- 文本超长截断：单个 chip 最大宽度 120px，超出省略号
- 切换时无动画（即时切换），列表内容可加 150ms fade 过渡

### 6.4 LocationAutocomplete

- 基于现有 `InputField` 扩展，保留原有样式
- 输入时实时过滤建议列表（不区分大小写的 `includes` 匹配）
- 下拉面板：绝对定位于输入框下方，`--color-surface` 背景，`--shadow-card` 投影，圆角 `--radius-md`
- 每个建议项高度 40px，点击后填入输入框并关闭下拉
- 无匹配时不展示下拉（用户可自由输入新值）
- 建议列表最多展示 8 项，超出可滚动
- 输入框获得焦点且有已有 locations 时，即展示完整建议列表（无需输入即可看到所有选项）
- 点击输入框外部或选择建议项后关闭下拉

---

## 7. 边界用例与防御

| 场景 | 处理方式 | 涉及组件 |
|------|---------|---------|
| 家庭 0 植物 | 分组视图与全部视图共用同一空状态 | PlantListPage |
| 所有植物 location 为空 | 分组视图只有"未分组"一组 + 引导文案"给植物设置位置，按房间管理更方便" | PlantGroupView |
| location 接近 30 字符 | GroupHeader 和 RoomFilterChips 内文本截断 + 省略号 | GroupHeader, RoomFilterChips |
| 20+ 不同 location | 分组视图全部展示（折叠管理），RoomFilterChips 横向滚动 | PlantGroupView, RoomFilterChips |
| 分组视图下搜索 | 搜索结果仍按分组展示（搜索在组内过滤，空组隐藏） | PlantListPage |
| 新建植物设了新 location | Convex 响应式更新，分组视图自动出现新分组 | 自动（Convex subscription） |
| 待办页所有任务的植物都没有 location | RoomFilterChips 不渲染（只有"全部"一个选项时隐藏整个标签栏） | TodoPage |
| 用户切换房间筛选后完成任务 | 完成操作正常执行，任务从当前筛选视图中移除；若该 location 无剩余任务，chip 自动消失 | TodoPage |
| localStorage 被清除 | 视图默认回到"全部"，无异常 | PlantListPage |

---

## 8. 视觉规格速查

### 8.1 Design Token 使用

本功能不新增 token，全部复用现有 `tokens.css` 变量：

| 用途 | Token |
|------|-------|
| 选中态背景 | `--color-leaf` |
| 选中态文字 | `#FFFFFF`（白色，token 中无独立变量，可用 `--color-paper`） |
| 未选中态背景 | `--color-surface-secondary` |
| 未选中态文字 | `--color-ink` |
| 分组头背景 | `--color-surface-secondary` |
| 数量/次要文字 | `--color-muted` |
| 引导文案 | `--color-muted` |
| 下拉面板阴影 | `--shadow-card` |
| 间距 | `--space-sm`(8px), `--space-md`(16px) |
| 圆角 | `--radius-md`(8px), 16px(pill) |

### 8.2 响应式

- 所有组件按 375px 宽度设计（移动优先）
- SegmentedControl 和 GroupHeader 为全宽
- RoomFilterChips 横向滚动，不换行
- LocationAutocomplete 下拉面板宽度与输入框等宽

---

## 9. 验证命令

```bash
# TypeScript 编译
cd app && npm run typecheck

# Convex 类型检查
cd app && npx convex dev --once --typecheck enable

# 单元测试（如有）
cd app && npm run test

# 视觉验证要点（375px 宽度）
# 1. 植物列表页：切换"全部"/"按房间"，分组正确、折叠/展开正常
# 2. 待办页：房间筛选标签栏展示、筛选后任务列表正确过滤
# 3. 植物编辑页：location 输入框展示自动补全建议
```

---

## 10. 验收 Checklist

### 10.1 数据层

- [ ] `listDueTasks` 返回数据包含 `plantLocation` 字段
- [ ] 前端类型定义与后端返回一致

### 10.2 植物列表分组视图

- [ ] 搜索栏下方有 SegmentedControl（"全部"/"按房间"）
- [ ] "按房间"视图按 location 分组，每组有 GroupHeader（位置名 + 数量）
- [ ] 分组按数量降序，"未分组"在最后
- [ ] 分组可折叠/展开，默认全部展开
- [ ] 视图选择持久化到 localStorage，刷新后保持
- [ ] 所有植物无 location 时展示引导文案
- [ ] 分组视图下搜索正常工作（空组隐藏）

### 10.3 待办页房间筛选

- [ ] 情感反馈区下方展示 RoomFilterChips
- [ ] 只展示有任务的 location（无任务的不出现）
- [ ] 所有任务植物都无 location 时，标签栏不渲染
- [ ] 选择某房间后，三个区段（逾期/今天/即将）均按该 location 过滤
- [ ] "全部"标签展示所有任务
- [ ] 筛选不影响完成/推迟/撤销操作

### 10.4 位置自动补全

- [ ] 植物编辑页 location 输入框有自动补全下拉
- [ ] 下拉展示家庭已有的 location 值（去重）
- [ ] 输入时实时过滤建议
- [ ] 可选择建议项，也可自由输入新值
- [ ] 点击外部关闭下拉

### 10.5 通用

- [ ] TypeScript 编译无 error
- [ ] 375px 宽度下所有新增 UI 可用
- [ ] 所有色值/间距/圆角引用 token 变量，无硬编码
- [ ] 动画尊重 `prefers-reduced-motion`
