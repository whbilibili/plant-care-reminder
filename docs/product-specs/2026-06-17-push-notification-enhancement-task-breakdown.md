# 推送通知体验增强 —— 功能规格

**版本**：v1.0
**日期**：2026-06-17
**关联文档**：
- 产品决策依据：[2026-06-17-push-notification-enhancement-spec.md](./2026-06-17-push-notification-enhancement-spec.md)（PRD）
- 架构约束：`ARCHITECTURE.md`
- 数据模型权威来源：`app/convex/schema.ts`

**文档定位**：基于 PRD 的产品决策，从工程视角给出可执行的任务清单、数据流设计、接口契约与验证命令。本文档回答"系统必须如何工作"。

---

## 0. 现状分析与技术可行性

### 0.1 已有基础

| 层 | 现状 | 可复用程度 |
|---|------|-----------|
| Schema | `users` 表无通知偏好字段 | **需新增 `notificationPreferences`** |
| 后端 Action | `notificationsNode.processDueTaskNotifications` 逐任务逐设备推送，url 固定 `/todo` | **需重构为按用户聚合 + 时间窗口判断** |
| 后端 Query | `notifications.listNotifiableDueTasks` 返回任务列表含 `plantId`、`plantName`、`taskType` | 可复用，需补充用户偏好查询 |
| cron | 每 30 分钟触发一次 | 保持不变（±30 分钟精度对日常提醒足够） |
| Service Worker | `sw.js` 已支持 `notificationclick` 跳转 `data.url`，已有前台 navigate 逻辑 | **完全可复用，无需改动** |
| 前端路由 | `router.tsx` 已支持 `/plants/{plantId}` 解析为 `plants/detail` | 完全可复用 |
| 前端组件 | `NotificationPromptCard.tsx` 展示通知开启状态 | 需扩展：已开启状态下增加"提醒时间"入口 |
| 设置页 | `FamilySettingsPage.tsx` 包含通知区域 | 需增加偏好状态展示 |

### 0.2 改动范围总结

本次改造涉及三个维度：

1. **通知深链**：后端 payload 的 `url` 字段动态化 + 聚合通知 url 保持 `/todo`（SW 无需改动）
2. **推送时间偏好**：Schema 新增字段 + 新增 2 个 Convex Functions + 后端 action 增加时间窗口判断 + 前端设置 UI
3. **聚合推送**：后端 action 按用户分组后合并 payload

---

## 1. 数据流设计

### 1.1 推送决策流程（改造后）

```
cron 每 30 分钟触发
  │
  ▼ processDueTaskNotifications (action)
  │
  ├─ 1. 查询到期任务 (listNotifiableDueTasks)
  │     返回: Task[] (含 plantId, plantName, taskType, familyId, subscriptions)
  │
  ├─ 2. 按 userId 分组任务
  │     Map<userId, { tasks: Task[], subscriptions: Sub[] }>
  │
  ├─ 3. 对每个 userId：查询 notificationPreferences
  │     │
  │     ├─ 无偏好 → 立即推送（当前行为）
  │     │
  │     └─ 有偏好 → 检查当前 UTC 时间是否在用户 preferredHour ± 30min 窗口内
  │           │
  │           ├─ 不在窗口 → 跳过本轮（下一轮 cron 再检查）
  │           │
  │           └─ 在窗口 → 继续推送
  │
  ├─ 4. 聚合判断
  │     │
  │     ├─ 该用户本轮只有 1 个任务 → 单任务推送（深链到植物详情）
  │     │
  │     └─ 该用户本轮有 ≥2 个任务 → 聚合推送（跳转待办页）
  │
  └─ 5. 发送推送 + 标记已通知
```

### 1.2 通知 Payload 结构

**单任务推送**：

```typescript
{
  title: "发财树 · 浇水",
  body: "「发财树」的浇水任务已到期，记得去处理哦！",
  tag: "task-{taskId}",
  url: "/plants/{plantId}"  // ← 改动点：深链到植物详情
}
```

**聚合推送（2-3 个任务）**：

```typescript
{
  title: "你有 3 个养护任务待完成",
  body: "发财树（浇水）、绿萝（施肥）、龟背竹（喷雾）",
  tag: "daily-summary",
  url: "/todo"  // 聚合通知跳待办页
}
```

**聚合推送（>3 个任务）**：

```typescript
{
  title: "你有 5 个养护任务待完成",
  body: "发财树（浇水）、绿萝（施肥）、龟背竹（喷雾）等 5 个任务",
  tag: "daily-summary",
  url: "/todo"
}
```

### 1.3 时间窗口匹配算法

```typescript
/**
 * 判断当前时刻是否在用户偏好推送时间的窗口内。
 * 窗口定义：preferredHour 对应的 UTC 时刻 ± 30 分钟。
 * cron 每 30 分钟触发一次，保证每个 preferredHour 至少被命中一次。
 */
function isWithinPreferredWindow(
  nowMs: number,
  preferredHour: number,
  timezone: string
): boolean {
  // 1. 计算用户本地时间的当前小时和分钟
  const userLocalDate = new Date(nowMs);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const parts = formatter.formatToParts(userLocalDate);
  const currentHour = Number(parts.find(p => p.type === "hour")?.value ?? 0);
  const currentMinute = Number(parts.find(p => p.type === "minute")?.value ?? 0);

  // 2. 计算当前时间距离 preferredHour:00 的分钟差（考虑跨日）
  const currentTotalMinutes = currentHour * 60 + currentMinute;
  const preferredTotalMinutes = preferredHour * 60;
  let diff = Math.abs(currentTotalMinutes - preferredTotalMinutes);
  if (diff > 720) diff = 1440 - diff; // 跨午夜

  // 3. 窗口 ±30 分钟
  return diff <= 30;
}
```

---

## 2. 数据模型变更

### 2.1 Schema 新增字段

**文件**：`app/convex/lib/validators.ts`

在 `userFields` 中新增：

```typescript
// 通知偏好（个人级，不随家庭变化）
notificationPreferences: v.optional(v.object({
  preferredHour: v.number(),   // 0-23，用户本地时区的偏好推送小时
  timezone: v.string(),        // IANA 时区标识符，如 "Asia/Shanghai"
})),
```

**设计决策**：
- 放在 `users` 表而非 `familyMembers`（PRD D1：通知偏好是个人习惯）
- 只做 `preferredHour` + `timezone`，不做完整静默时段（PRD D2：最小可行）
- `v.optional` 向后兼容，无需数据迁移

### 2.2 不需要新增索引

通知偏好查询场景：`processDueTaskNotifications` 中按 `userId` 逐个查询用户文档。`users` 表通过 `_id` 主键查询，无需额外索引。

---

## 3. 后端接口契约

### 3.1 新增接口

| 接口 | 类型 | 文件 | 权限 | 行为 |
|------|------|------|------|------|
| `updateNotificationPreferences` | mutation | `app/convex/users.ts` | 登录用户 | 更新当前用户的 `notificationPreferences` |
| `getNotificationPreferences` | query | `app/convex/users.ts` | 登录用户 | 读取当前用户的通知偏好 |

**`updateNotificationPreferences` 契约**：

```typescript
export const updateNotificationPreferences = mutation({
  args: {
    preferredHour: v.union(v.number(), v.null()), // null = 清除偏好（恢复"立即推送"）
    timezone: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. 校验登录态
    // 2. 校验 preferredHour 范围 [0, 23] 或 null
    // 3. 校验 timezone 为有效 IANA 标识符（基础校验：非空字符串）
    // 4. 如果 preferredHour === null → patch users.notificationPreferences = undefined
    //    否则 → patch users.notificationPreferences = { preferredHour, timezone }
    // 5. 返回 { ok: true }
  },
});
```

**`getNotificationPreferences` 契约**：

```typescript
export const getNotificationPreferences = query({
  args: {},
  handler: async (ctx) => {
    // 1. 校验登录态
    // 2. 返回 user.notificationPreferences ?? null
  },
});
```

### 3.2 改造接口

| 接口 | 文件 | 改动 |
|------|------|------|
| `listNotifiableDueTasks` | `app/convex/notifications.ts` | 返回数据中补充 `userId` 信息（从 subscription 中已有，无需额外查询） |
| `processDueTaskNotifications` | `app/convex/notificationsNode.ts` | 重构为按用户分组 + 时间窗口判断 + 聚合推送逻辑 |

### 3.3 新增内部 Query

| 接口 | 类型 | 文件 | 行为 |
|------|------|------|------|
| `getUserNotificationPreferences` | internalQuery | `app/convex/notifications.ts` | 批量查询用户通知偏好（供 action 调用） |

```typescript
export const getUserNotificationPreferences = internalQuery({
  args: {
    userIds: v.array(v.id("users")),
  },
  handler: async (ctx, args) => {
    // 批量查询用户文档，返回 Map<userId, notificationPreferences | null>
    const results: Record<string, { preferredHour: number; timezone: string } | null> = {};
    for (const userId of args.userIds) {
      const user = await ctx.db.get(userId);
      results[userId] = user?.notificationPreferences ?? null;
    }
    return results;
  },
});
```

---

## 4. 后端核心逻辑改造

### 4.1 `processDueTaskNotifications` 重构伪代码

```typescript
export const processDueTaskNotifications = internalAction({
  handler: async (ctx) => {
    // ... VAPID 配置检查（不变）...

    const now = Date.now();
    const result = await ctx.runQuery(internal.notifications.listNotifiableDueTasks, { now });

    // ── Step 1: 按 userId 分组 ──
    // 一个任务可能对应多个 subscription（同一家庭多设备），
    // 但推送决策以 userId 为粒度（同一用户的多设备收到相同内容）
    const userTaskMap = new Map<string, {
      tasks: typeof result.tasks;
      subscriptions: Map<string, SubInfo[]>; // deviceId -> sub info
    }>();

    for (const task of result.tasks) {
      for (const sub of task.subscriptions) {
        const entry = userTaskMap.get(sub.userId) ?? { tasks: [], subscriptions: new Map() };
        // 避免重复添加同一 task
        if (!entry.tasks.find(t => t.taskId === task.taskId)) {
          entry.tasks.push(task);
        }
        // 收集该用户的所有设备订阅
        if (!entry.subscriptions.has(sub.subscriptionId)) {
          entry.subscriptions.set(sub.subscriptionId, sub);
        }
        userTaskMap.set(sub.userId, entry);
      }
    }

    // ── Step 2: 查询用户偏好 ──
    const userIds = [...userTaskMap.keys()];
    const preferences = await ctx.runQuery(
      internal.notifications.getUserNotificationPreferences,
      { userIds }
    );

    // ── Step 3: 逐用户处理 ──
    for (const [userId, { tasks, subscriptions }] of userTaskMap) {
      const pref = preferences[userId];

      // 时间窗口检查
      if (pref && !isWithinPreferredWindow(now, pref.preferredHour, pref.timezone)) {
        continue; // 不在偏好时间窗口，跳过
      }

      // ── Step 4: 构建 payload ──
      let payload: NotificationPayload;

      if (tasks.length === 1) {
        // 单任务：深链到植物详情
        const task = tasks[0];
        const taskLabel = getTaskLabel(task.taskType);
        payload = {
          title: `${task.plantName} · ${taskLabel}`,
          body: `「${task.plantName}」的${taskLabel}任务已到期，记得去处理哦！`,
          tag: `task-${task.taskId}`,
          url: `/plants/${task.plantId}`,
        };
      } else {
        // 聚合推送
        const count = tasks.length;
        const summaryItems = tasks.slice(0, 3).map(t =>
          `${t.plantName}（${getTaskLabel(t.taskType)}）`
        );
        const body = count > 3
          ? `${summaryItems.join("、")}等 ${count} 个任务`
          : summaryItems.join("、");

        payload = {
          title: `你有 ${count} 个养护任务待完成`,
          body,
          tag: "daily-summary",
          url: "/todo",
        };
      }

      // ── Step 5: 发送到该用户所有设备 ──
      for (const sub of subscriptions.values()) {
        // ... webpush.sendNotification（逻辑不变）...
      }

      // ── Step 6: 标记所有任务已通知 ──
      for (const task of tasks) {
        await ctx.runMutation(internal.notifications.markTaskNotified, {
          taskId: task.taskId,
          notifiedAt: now,
        });
      }
    }
  },
});
```

### 4.2 关键设计约束

| 约束 | 说明 |
|------|------|
| 幂等性 | `markTaskNotified` 更新 `lastNotifiedAt`，`shouldNotifyTask` 中 1 小时窗口保证不重复推送 |
| 向后兼容 | 无偏好用户（`notificationPreferences === undefined`）沿用当前行为（到期即推） |
| 聚合粒度 | 按 userId 聚合，同一用户同一轮 cron 中的所有到期任务合并为一条通知 |
| 深链安全 | 植物被删除时，前端详情页已有兜底处理（展示"植物不存在"提示） |

---

## 5. 前端改动

### 5.1 新增组件

| 组件 | 路径 | Props | 职责 |
|------|------|-------|------|
| `NotificationPreferencesSheet` | `src/features/notifications/NotificationPreferencesSheet.tsx` | `open: boolean`, `onClose: () => void`, `currentHour: number \| null`, `onSave: (hour: number \| null) => void` | 时间选择 Sheet：小时选择器 + "立即推送"选项 |

### 5.2 改动组件

| 组件 | 文件 | 改动 |
|------|------|------|
| `NotificationPromptCard.tsx` | `src/features/notifications/NotificationPromptCard.tsx` | 在 `visualState === "enabled"` 状态下，增加"提醒时间"设置行（展示当前偏好 + 点击打开 Sheet） |
| `FamilySettingsPage.tsx` | `src/features/family/FamilySettingsPage.tsx` | 通知区域展示当前偏好状态文案（如"每天 8:00 提醒"或"任务到期时立即提醒"） |
| `sw.js` | `app/public/sw.js` | **无需改动**（已支持动态 url 跳转） |

### 5.3 `NotificationPreferencesSheet` 交互规格

- 入口：`NotificationPromptCard` 已开启状态下，展示一行"提醒时间：每天 8:00"，右侧 ChevronRight，点击打开 Sheet
- Sheet 内容：
  - 标题："设置提醒时间"
  - 选项列表（单选）：
    - "任务到期时立即提醒"（对应 `preferredHour = null`）
    - "每天 6:00"
    - "每天 7:00"
    - "每天 8:00"（默认选中）
    - "每天 9:00"
    - "每天 10:00"
    - "每天 12:00"
    - "每天 18:00"
    - "每天 20:00"
    - "每天 21:00"
    - "每天 22:00"
  - 底部"保存"按钮
- 时区自动检测：`Intl.DateTimeFormat().resolvedOptions().timeZone`，不需要用户手动选择
- 保存成功后 toast 提示"提醒时间已更新"
- 保存失败时 toast 提示"保存失败，请重试"

### 5.4 类型定义补充

**文件**：`app/src/types/domain.ts`

```typescript
// 新增
export interface NotificationPreferences {
  preferredHour: number;  // 0-23
  timezone: string;       // IANA timezone
}
```

---

## 6. Service Worker 分析（无需改动）

当前 `sw.js` 的 `notificationclick` 处理已经完全满足深链需求：

```javascript
// 已有逻辑：
const targetUrl = event.notification.data?.url || "/";
// 前台时 navigate，后台时 openWindow
```

只要后端 payload 中的 `url` 字段正确设置为 `/plants/{plantId}` 或 `/todo`，SW 无需任何改动即可实现深链跳转。

**前台 postMessage 场景**：当前实现使用 `client.navigate(targetUrl)`，已满足 PRD 要求的"在当前窗口内跳转而非开新窗口"。

---

## 7. 任务拆分与执行顺序

### Phase 1：数据层准备（无 UI 变更，可独立验证）

| ID | 任务 | 文件 | 依赖 |
|----|------|------|------|
| PUSH-001 | Schema 新增 `users.notificationPreferences` 字段 | `app/convex/lib/validators.ts` | 无 |
| PUSH-002 | 实现 `updateNotificationPreferences` mutation | `app/convex/users.ts` | PUSH-001 |
| PUSH-003 | 实现 `getNotificationPreferences` query | `app/convex/users.ts` | PUSH-001 |
| PUSH-004 | 实现 `getUserNotificationPreferences` internalQuery | `app/convex/notifications.ts` | PUSH-001 |

### Phase 2：后端推送逻辑重构

| ID | 任务 | 文件 | 依赖 |
|----|------|------|------|
| PUSH-005 | 重构 `processDueTaskNotifications`：按用户分组 + 时间窗口判断 | `app/convex/notificationsNode.ts` | PUSH-004 |
| PUSH-006 | 实现聚合推送 payload 生成逻辑（含文案模板） | `app/convex/notificationsNode.ts` | PUSH-005 |
| PUSH-007 | 实现深链 url 动态生成（单任务 → `/plants/{plantId}`，聚合 → `/todo`） | `app/convex/notificationsNode.ts` | PUSH-006 |

### Phase 3：前端通知偏好设置

| ID | 任务 | 文件 | 依赖 |
|----|------|------|------|
| PUSH-008 | 前端类型定义补充 `NotificationPreferences` | `app/src/types/domain.ts` | 无 |
| PUSH-009 | 实现 `NotificationPreferencesSheet` 组件 | `src/features/notifications/NotificationPreferencesSheet.tsx` | PUSH-008 |
| PUSH-010 | `NotificationPromptCard` 集成偏好设置入口 + 状态展示 | `src/features/notifications/NotificationPromptCard.tsx` | PUSH-003, PUSH-009 |
| PUSH-011 | `FamilySettingsPage` 通知区域展示偏好状态文案 | `src/features/family/FamilySettingsPage.tsx` | PUSH-003 |

### Phase 4：深链兜底处理

| ID | 任务 | 文件 | 依赖 |
|----|------|------|------|
| PUSH-012 | 植物详情页增加"植物已删除"兜底 UI（通知深链到已删除植物时） | `src/features/plants/PlantDetailPage.tsx` | 无 |

### 依赖拓扑

```
PUSH-001 ──→ PUSH-002
         ──→ PUSH-003 ──→ PUSH-010, PUSH-011
         ──→ PUSH-004 ──→ PUSH-005 ──→ PUSH-006 ──→ PUSH-007

PUSH-008 ──→ PUSH-009 ──→ PUSH-010

PUSH-012（独立，可并行）
```

**并行策略**：
- Phase 1 和 Phase 3 的 UI 组件开发（PUSH-008, PUSH-009）可并行
- Phase 4（PUSH-012）完全独立，可随时开发
- Phase 2 依赖 Phase 1 完成
- Phase 3 的集成（PUSH-010, PUSH-011）依赖 Phase 1 的 query 接口

---

## 8. 边界用例与防御

| 场景 | 处理方式 | 涉及组件 |
|------|---------|---------|
| 用户设置偏好时间为凌晨 3 点 | 允许，不做限制（PRD 明确） | `updateNotificationPreferences` |
| 用户时区变更（旅行） | 前端每次打开 app 检测时区，若与存储值不同则提示更新 | `NotificationPromptCard` |
| 植物被删除后点击该植物通知 | 详情页检测植物不存在，展示兜底页引导回待办页 | `PlantDetailPage` |
| 推送偏好保存失败 | 前端 toast 提示重试，不影响已有推送行为 | `NotificationPreferencesSheet` |
| 用户未设置偏好 | 维持当前行为（到期即推），UI 展示"任务到期时立即提醒" | `processDueTaskNotifications` |
| 同一用户多设备 | 所有设备收到相同通知内容（聚合或单条） | `processDueTaskNotifications` |
| cron 触发时用户偏好时间刚好在窗口边界 | ±30 分钟窗口 + cron 30 分钟间隔，保证每个 preferredHour 至少命中一次 | `isWithinPreferredWindow` |
| 聚合通知 tag 覆盖 | 使用 `daily-summary` tag，同一天多次聚合通知会覆盖旧的（避免堆积） | payload 设计 |
| `preferredHour` 传入非法值（<0 或 >23） | mutation 中校验，抛出友好错误 | `updateNotificationPreferences` |
| timezone 传入空字符串 | mutation 中校验非空，抛出友好错误 | `updateNotificationPreferences` |

---

## 9. 视觉规格速查

### 9.1 NotificationPreferencesSheet

- 复用现有 `Sheet` 组件样式
- 选项列表：每项高度 48px，左侧文案 + 右侧选中态圆点（radio 样式）
- 选中态：文案 `--color-leaf` + 右侧实心圆点 `--color-leaf`
- 未选中态：文案 `--color-ink` + 右侧空心圆点 `--color-line`
- 底部按钮：复用 `Button` 组件 `variant="primary"` 全宽

### 9.2 提醒时间行（NotificationPromptCard 内）

- 位于"当前设备已经可以接收家庭植物提醒通知"文案下方
- 布局：左侧"提醒时间" label（`--color-ink`，14px）+ 右侧当前值（`--color-muted`，14px）+ ChevronRight 图标
- 整行可点击，高度 44px
- 上方分隔线 `1px solid var(--color-line)`

### 9.3 Design Token 使用

本功能不新增 token，全部复用现有 `tokens.css` 变量。

---

## 10. 验证命令

```bash
# TypeScript 编译
cd app && npm run typecheck

# Convex 类型检查（含 schema 变更验证）
cd app && npx convex dev --once --typecheck enable

# 单元测试
cd app && npm run test

# 功能验证要点
# 1. 设置页：通知已开启状态下可设置提醒时间，保存后刷新仍保持
# 2. 推送内容：单任务通知点击后跳转到植物详情页
# 3. 推送内容：多任务时收到聚合通知，点击跳转待办页
# 4. 时间窗口：设置偏好时间后，非窗口时间不收到推送
# 5. 兜底：点击已删除植物的通知，展示友好提示
```

---

## 11. 验收 Checklist

### 11.1 数据层

- [ ] `users` 表 schema 包含 `notificationPreferences` 可选字段
- [ ] `updateNotificationPreferences` mutation 可正确写入偏好
- [ ] `getNotificationPreferences` query 可正确读取偏好
- [ ] 未设置偏好的用户查询返回 null，不报错

### 11.2 深链跳转

- [ ] 单任务通知 payload 的 url 为 `/plants/{plantId}`
- [ ] 聚合通知 payload 的 url 为 `/todo`
- [ ] 点击单任务通知后跳转到对应植物详情页
- [ ] 点击聚合通知后跳转到待办页
- [ ] app 已在前台时点击通知，在当前窗口内跳转而非开新窗口
- [ ] 植物已删除时点击通知，展示兜底页

### 11.3 推送时间偏好

- [ ] 设置页通知区域（已开启状态下）可设置"每天几点提醒"
- [ ] 设置保存后 `users.notificationPreferences` 正确写入
- [ ] 推送仅在用户偏好时间窗口内触发
- [ ] 未设置偏好的用户不受影响，维持到期即推
- [ ] "任务到期时立即提醒"选项可清除偏好

### 11.4 聚合推送

- [ ] 同一用户同一窗口 ≥2 个任务到期时，发 1 条聚合通知
- [ ] 聚合通知 body 列出前 3 个任务名+类型
- [ ] 超过 3 个任务时追加"等 N 个任务"
- [ ] 聚合通知 tag 为 `daily-summary`（覆盖旧通知）
- [ ] 单任务仍单独推送并带深链

### 11.5 通用

- [ ] TypeScript 编译无 error
- [ ] Convex schema 可通过类型检查
- [ ] 375px 宽度下所有新增 UI 可用
- [ ] 所有色值/间距/圆角引用 token 变量，无硬编码
