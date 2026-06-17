# 待办页 v0.2 功能清单（功能开发 × UI 美化对照）

> 关联文档：[迭代 PRD](./2026-06-10-todo-page-iteration-spec.md) · [UI 设计稿](./2026-06-10-todo-page-ui-spec.md)
> Harness 来源：`docs/exec-plans/modules/todo-page-v2.json`（8 个 Task，与本清单一一对应）
> 设计基线：植物学设计 token 体系（`app/src/styles/tokens.css`）。**禁止硬编码 #hex，一律引用 token 变量；新增 `--color-task-*` 系列须先补进 tokens.css 再使用。**

---

## 一、总览（8 个垂直切片，每片都同时含「功能」+「UI」两面）

| Task | 主题 | 层 | 优先级 | 功能开发面 | UI 美化面 |
|------|------|----|--------|-----------|-----------|
| TODO2-001 | 任务类型可视化 | ui | 1-High | 任务类型枚举对齐前端映射 | 类型色条/图标，`TaskTypeBadge`，补 `--color-task-*` token |
| TODO2-002 | 分桶强化（方案A） | fullstack | 1-High | `listDueTasks` 增量返回 `completedToday` + nextDueAt 元信息 | `UpcomingDueCard` 灰态/已完成态卡片 |
| TODO2-003 | 状态化情感反馈区 | fullstack | 1-High | 前端从分桶数据派生三态 | `TodoGreetingCard` 三态文案+插画 |
| TODO2-004 | 推迟功能 | fullstack | 1-High | `consecutivePostponeCount` 字段 + `postponePlantTask` mutation | `PostponeButton` / `PostponeConfirmSheet` |
| TODO2-005 | 连续推迟温和提示 | fullstack | 2-Medium | 达阈值（3 次）判定逻辑 | `PostponeHintBanner` 非阻断建议条 |
| TODO2-006 | 完成撤销 | fullstack | 2-Medium | `undoCompletePlantTask` mutation + 完成快照回滚 | `UndoToast` 限时撤销提示 |
| TODO2-007 | 分区一键完成 | fullstack | 2-Medium | `completePlantTasksBatch` mutation | `CompleteAllButton` 分区批量操作 |
| TODO2-008 | 完成微交互 + 收尾 | ui | 3-Low | —（纯前端体验层） | 完成动效/Haptic、即将到期折叠、空状态两语境 |

---

## 二、功能开发清单（后端 / 数据 / 逻辑）

### 数据层（schema.ts）
- **新增字段** `PlantTask.consecutivePostponeCount: v.optional(v.number())`（TODO2-004）：记录连续推迟次数，完成或正常顺延时归零。

### Convex Functions（app/convex/tasks.ts）
- **`listDueTasks` 增量扩展**（TODO2-002）：在既有 `{overdue, today, upcoming}` 三桶基础上，为每项补 `completedToday`（今日是否已完成）与 nextDueAt 灰态展示所需元信息。**不重写**现有 `UPCOMING_WINDOW_DAYS=3` / `getUtcDayStart` 分桶逻辑，仅增量。
- **`postponePlantTask`（新增 mutation）**（TODO2-004）：`nextDueAt = 今天 + POSTPONE_DAYS(1)`（基准为「今天」而非旧 nextDueAt），**不改 `lastCompletedAt`、不写完成日志**，`consecutivePostponeCount += 1`。
- **`undoCompletePlantTask`（新增 mutation）**（TODO2-006）：依赖 `completePlantTask` 扩展返回的 `logId` + `previous` 快照，删除该完成日志并回滚 `lastCompletedAt / nextDueAt`。
- **`completePlantTask` 扩展返回**（TODO2-006 前置）：返回 `logId` 与完成前 `previous` 快照，供撤销使用。
- **`completePlantTasksBatch`（新增 mutation）**（TODO2-007）：对某分区内可完成任务批量执行完成逻辑，复用单条完成的顺延与日志写入，并支持整批撤销。

### 业务常量
- `POSTPONE_DAYS = 1`（推迟基准天数，TODO2-004）
- `POSTPONE_HINT_THRESHOLD = 3`（连续推迟提示阈值，TODO2-005）

---

## 三、UI 美化清单（前端组件，依据 UI 设计稿）

> 整体方向：「温和的园艺工作台」。所有颜色引用 token，新增组件优先复用既有卡片/按钮原子。

| 新增/改造组件 | 所属 Task | 设计要点（design_contract） |
|--------------|----------|---------------------------|
| `TaskTypeBadge.tsx` | TODO2-001 | 6 类任务（浇水/施肥/喷雾/换盆/修剪/自定义）色条+图标；色值来自新增 `--color-task-watering/fertilizing/misting/repotting/pruning/custom` |
| `UpcomingDueCard.tsx` | TODO2-002 | 即将到期项弱化为灰态；已完成项展示完成态；nextDueAt 以灰色元信息呈现 |
| `TodoGreetingCard.tsx` | TODO2-003 | 三态情感反馈：有逾期 / 仅今日待办 / 全部完成，各自文案+插画 |
| `PostponeButton.tsx` / `PostponeConfirmSheet.tsx` | TODO2-004 | 推迟入口与确认面板，明确「顺延到明天」语义 |
| `PostponeHintBanner.tsx` | TODO2-005 | 连续推迟 ≥3 次的温和建议条，非阻断、可关闭 |
| `UndoToast.tsx` | TODO2-006 | 完成后限时撤销 Toast |
| `CompleteAllButton.tsx` | TODO2-007 | 分区级「全部完成」，与撤销联动 |
| `CompletionFxOverlay.tsx` | TODO2-008 | 完成微交互动效 + Haptic 反馈 |
| `UpcomingSection.tsx` | TODO2-008 | 即将到期分区折叠/弱化展示 |
| `EmptyState.tsx` | TODO2-008 | 空状态两语境：「今天没有待办」vs「还没有植物」 |

### tokens.css 待补充
```
--color-task-watering    /* 浇水 */
--color-task-fertilizing /* 施肥 */
--color-task-misting     /* 喷雾 */
--color-task-repotting   /* 换盆 */
--color-task-pruning     /* 修剪 */
--color-task-custom      /* 自定义 */
```
（具体取值见 UI 设计稿 §8 配色总表，落地前先在 tokens.css 定义。）

---

## 四、依赖与建议执行顺序

```
TODO2-001 ─┐ (类型色条，前端独立可先做)
TODO2-002 ─┼─► TODO2-003 (分桶数据 → 情感反馈区)
TODO2-004 ─────► TODO2-005 (推迟 → 推迟提示)
TODO2-006 ─────► TODO2-007 (单条撤销 → 批量完成复用撤销)
TODO2-008  (体验收尾，最后做)
```

- **第一批（1-High）**：001 / 002 / 003 / 004 —— 构成 v0.2 主干价值。
- **第二批（2-Medium）**：005 / 006 / 007 —— 体验增强。
- **第三批（3-Low）**：008 —— 微交互打磨。

跨模块依赖：本模块依赖 `care-reminders`（任务/完成/顺延能力）与 `frontend-refresh`（token 体系与页面骨架），共登记 9 条 cross_module_dependencies。
