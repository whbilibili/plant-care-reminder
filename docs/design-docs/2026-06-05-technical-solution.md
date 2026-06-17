# 植物养护提醒应用 MVP 技术方案

**版本**：v0.1  
**日期**：2026-06-05  
**关联需求**：[2026-06-05-mvp-requirements.md](../product-specs/2026-06-05-mvp-requirements.md)  
**关联规格**：[2026-06-05-mvp-functional-spec.md](../product-specs/2026-06-05-mvp-functional-spec.md)

---

## 1. 目标

基于 `PWA + Convex` 架构，交付一个适合家庭内部使用的植物养护提醒应用 MVP。技术方案的重点是：

- 降低首版开发复杂度
- 优先保证共享状态一致性
- 支持植物图片和任务滚动提醒
- 为后续升级到 Expo / React Native 保留空间

---

## 2. 总体架构

```text
iPhone Safari / Home Screen PWA
            |
            v
      React Frontend
            |
            v
         Convex
   ├── Auth
   ├── Database
   ├── File Storage
   ├── Queries / Mutations
   └── Scheduled Jobs
            |
            v
   Web Push Sender / Notification Adapter
```

职责划分：

- 前端负责页面渲染、表单交互、通知授权和订阅
- Convex 负责认证、数据读写、业务规则、实时同步、定时扫描
- 推送适配层负责将到期任务转换为用户可见通知

---

## 3. 技术选型

### 3.1 Frontend

- `React 19`
- `TypeScript`
- `Vite`
- `React Router`
- `Tailwind CSS v4`
- `React Hook Form`
- `Zod`
- `date-fns`

选择原因：

- Vite 启动快，适合小型 PWA
- React Router 足够覆盖 MVP 路由需求
- Tailwind + 少量自建组件更适合快速做出手机端 UI
- Zod 便于前后端共享基础校验规则

### 3.2 Backend / Data

- `Convex`
- `Convex File Storage`
- `Convex Auth` 或兼容邮件登录方案

选择原因：

- 数据模型简单但强依赖实时同步
- 完成任务后的全员同步适合 Convex 响应式查询
- 图片存储和定时逻辑都可落在同一平台

### 3.3 PWA / Notifications

- `vite-plugin-pwa`
- Web Push 订阅逻辑
- 服务工作线程用于离线资源缓存与通知入口

说明：

- MVP 不做完整离线优先
- Service Worker 主要用于安装体验和推送接收

### 3.4 Testing

- `Vitest`
- `Testing Library`
- `Playwright`

---

## 4. 项目结构建议

```text
app/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── routes/
│   ├── pages/
│   ├── components/
│   ├── features/
│   │   ├── auth/
│   │   ├── family/
│   │   ├── plants/
│   │   ├── tasks/
│   │   └── notifications/
│   ├── lib/
│   ├── hooks/
│   ├── types/
│   └── styles/
├── convex/
│   ├── schema.ts
│   ├── auth.config.ts
│   ├── families.ts
│   ├── plants.ts
│   ├── tasks.ts
│   ├── notifications.ts
│   ├── cron.ts
│   └── http.ts
├── public/
└── tests/
    ├── unit/
    └── e2e/
```

原则：

- 业务按 `feature` 组织，而不是按纯技术层切碎
- Convex 函数按领域拆文件，避免单文件膨胀

---

## 5. 数据设计

### 5.1 Core Tables / Collections

推荐 collections：

- `users`
- `families`
- `familyMembers`
- `plants`
- `plantTasks`
- `taskCompletionLogs`
- `pushSubscriptions`

### 5.2 Ownership

- `families` 是顶层隔离单位
- `plants`、`plantTasks`、`taskCompletionLogs`、`pushSubscriptions` 都带 `familyId`
- 所有读写接口先校验当前用户是否属于对应 `familyId`

### 5.3 Indexes

建议索引：

- `familyMembers.by_userId`
- `familyMembers.by_familyId`
- `plants.by_familyId`
- `plantTasks.by_familyId`
- `plantTasks.by_nextDueAt`
- `plantTasks.by_plantId`
- `taskCompletionLogs.by_taskId`
- `pushSubscriptions.by_userId`

---

## 6. 关键业务逻辑

### 6.1 创建植物

流程：

1. 前端上传图片并拿到 storage id
2. 提交植物表单
3. Convex 校验用户是否属于家庭
4. 写入植物记录

失败策略：

- 若图片上传成功但植物保存失败，前端应提示用户重试
- 可以在后续版本增加孤儿图片清理任务，MVP 暂不强求

### 6.2 创建任务

流程：

1. 用户输入任务类型和间隔天数
2. 前端提交表单
3. 后端根据基准时间计算 `nextDueAt`
4. 写入 `plantTasks`

基准时间：

- 若用户填写上次完成时间，则用该时间
- 否则使用创建时刻

### 6.3 完成任务

流程：

1. 前端调用 `completeTask(taskId)`
2. 后端读取任务
3. 生成 `completedAt = now()`
4. 写入完成日志
5. 更新任务：
   - `lastCompletedAt = completedAt`
   - `nextDueAt = completedAt + intervalDays`
6. 返回最新任务状态

这个 mutation 必须保证原子性，不能出现日志已写入但任务未更新的半成功状态。

### 6.4 待办计算

待办页尽量不保存冗余“任务状态”字段，而是运行时根据当前时间计算：

- `nextDueAt < now` => 逾期
- `sameDay(nextDueAt, now)` => 今日到期
- `nextDueAt > now` => 未来任务

好处：

- 减少状态分叉
- 逻辑集中于查询层

---

## 7. 实时同步策略

依赖 Convex 响应式查询：

- 植物列表 query
- 植物详情 query
- 待办列表 query

完成任务后：

- mutation 提交成功
- 相关 query 自动失效并同步最新数据

前端可以使用乐观更新，但 MVP 建议只在“完成任务”按钮上做轻量乐观处理，并在失败时完整回滚。

---

## 8. 通知方案

### 8.1 MVP 通知策略

MVP 采用两层兜底：

1. 主路径：PWA Web Push
2. 兜底路径：应用内待办列表

原因：

- iPhone Web Push 受安装与授权前置条件影响
- 不能把“看见到期任务”的唯一入口押在推送上

## 8.2 推送订阅

前端在满足以下条件时展示引导：

- 用户已登录
- 运行在支持 PWA 的环境
- 尚未完成通知授权

订阅成功后保存：

- endpoint
- keys
- userId
- familyId
- deviceLabel

## 8.3 到期扫描

推荐方式：

- 使用 Convex `cron` 定时扫描未来短窗口内到期任务
- 扫描范围控制在“刚到期或即将到期”的时间窗口内

MVP 不建议：

- 为每个任务单独创建大量细粒度定时器

原因：

- 对家庭小应用来说，实现复杂度不划算
- 定时扫描更容易排查与补偿

## 8.4 通知去重

MVP 需要避免同一任务在同一时间窗口内重复通知。

建议方式：

- 在任务记录上增加 `lastNotifiedAt` 字段，或单独维护通知日志
- 发送前校验最近一次通知时间

---

## 9. 认证与权限

认证建议：

- 邮箱验证码登录或 Magic Link 优先

原因：

- 家庭成员少
- 降低密码找回与安全维护负担

权限控制规则：

- 所有读写接口均要求已登录
- 所有业务实体必须校验当前用户所属家庭
- 不能跨家庭读取植物、任务和通知订阅

---

## 10. 前端页面设计原则

### 10.1 Plants List

- 以卡片列表展示植物
- 每张卡片优先显示图片、名称、下个到期任务
- 支持快速进入详情

### 10.2 Todo List

- 到期任务优先级高于植物浏览
- 完成按钮必须显眼，适合单手点击

### 10.3 Plant Detail

- 上半区是植物资料卡
- 下半区是任务列表
- 任务项上直接可完成或编辑

### 10.4 Forms

- 表单字段尽量少
- 对数值型输入做清晰校验
- 图片上传失败不清空其他输入

---

## 11. 部署建议

推荐部署：

- 前端部署到 `Vercel`
- 后端与数据使用 `Convex Cloud`

优点：

- 免费层足够启动
- 部署简单
- 与 PWA 分发兼容

环境变量至少包括：

- Convex deployment 配置
- 通知相关公私钥
- 认证配置项

---

## 12. 风险与缓解

### 风险 1：iPhone Web Push 激活门槛高

问题：

- 用户必须添加到主屏幕并授权通知

缓解：

- 应用内加入明确引导
- 不依赖推送作为唯一提醒入口

### 风险 2：时间计算与时区边界

问题：

- 不同设备时区显示可能带来“今天/明天”误差

缓解：

- 后端统一 UTC
- 前端集中封装日期显示与状态判断

### 风险 3：并发完成任务

问题：

- 两位家庭成员可能几乎同时点击完成

缓解：

- 后端 mutation 以最新任务状态为准
- 若同一时刻重复完成，保留一次有效计算，并提示前端刷新

### 风险 4：通知重复发送

问题：

- 定时扫描可能重复命中同一任务

缓解：

- 增加通知去重字段或通知日志

---

## 13. 推荐实施顺序

1. 先做认证与家庭空间
2. 再做植物与任务数据模型
3. 完成待办页与“完成任务”闭环
4. 最后接入 PWA 安装与 Web Push

这样可以先验证核心业务，而不是一开始被推送链路拖住。
