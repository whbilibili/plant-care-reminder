# 植物养护提醒应用 MVP Functional Spec

**版本**：v0.1  
**日期**：2026-06-05  
**关联需求**：[2026-06-05-mvp-requirements.md](./2026-06-05-mvp-requirements.md)

---

## 1. Objective

交付一个面向家庭内部成员的植物养护提醒应用 MVP，支持共享植物资料、配置养护任务、到期提醒，以及任务完成后的自动顺延与全员同步。

---

## 2. Product Scope

### 2.1 Included in MVP

- 家庭成员独立账号注册与登录
- 创建家庭空间，或通过邀请加入已有家庭空间
- 植物资料录入：名称、图片、描述、备注、位置
- 每株植物配置多个养护任务
- 任务按“间隔天数”滚动提醒
- 到期任务集中展示
- 用户点击“完成”后自动计算下次提醒时间
- 家庭成员之间实时同步
- PWA 形态运行于 iPhone Safari / Home Screen

### 2.2 Explicitly Excluded

- 原生 iOS App
- 离线优先
- 复杂重复规则
- 基于天气或 AI 的养护建议
- 病虫害识别
- 商业化能力

---

## 3. User Roles

### 3.1 Family Admin

- 创建家庭空间
- 邀请成员加入
- 管理植物与任务
- 管理家庭基础设置

### 3.2 Family Member

- 登录并加入家庭空间
- 查看植物与任务
- 标记任务完成
- 编辑植物与任务

MVP 内不区分更细粒度权限。加入同一家庭空间的成员默认具备日常协作权限。

---

## 4. Primary User Flows

### 4.1 First-Time Setup

1. 用户注册或登录。
2. 用户选择“创建家庭”或“加入家庭”。
3. 用户进入植物列表页。
4. 用户添加第一株植物并上传图片。
5. 用户为植物添加至少一个养护任务。

### 4.2 Daily Task Completion

1. 用户收到到期提醒，或主动打开应用。
2. 用户在待办页看到到期任务。
3. 用户进入植物详情或直接点击任务“完成”。
4. 系统记录本次完成时间。
5. 系统重算并保存下一次提醒时间。
6. 其他家庭成员看到同步后的最新状态。

### 4.3 Family Collaboration

1. 家庭管理员分享邀请码或邀请链接。
2. 家庭成员加入同一个家庭空间。
3. 所有成员看到同一批植物和任务。
4. 任意成员完成某项任务后，其余成员的待办与详情页面自动更新。

---

## 5. Information Architecture

MVP 页面清单：

1. 登录 / 注册页
2. 创建家庭 / 加入家庭页
3. 植物列表页
4. 植物详情页
5. 植物新增 / 编辑页
6. 任务新增 / 编辑页
7. 待办页
8. 家庭设置页

导航建议：

- 底部主导航：`植物`、`待办`、`设置`
- 植物详情页和编辑页使用顶部返回导航

---

## 6. Data Model

### 6.1 Family

字段：

- `id`
- `name`
- `inviteCode`
- `createdBy`
- `createdAt`

### 6.2 User

字段：

- `id`
- `email`
- `displayName`
- `createdAt`

### 6.3 FamilyMember

字段：

- `id`
- `familyId`
- `userId`
- `role`
- `joinedAt`

约束：

- 一个用户在 MVP 中只能属于一个家庭

### 6.4 Plant

字段：

- `id`
- `familyId`
- `name`
- `imageStorageId`
- `description`
- `note`
- `location`
- `isArchived`
- `createdBy`
- `createdAt`
- `updatedAt`

### 6.5 PlantTask

字段：

- `id`
- `plantId`
- `familyId`
- `taskType`
- `customTaskName`
- `intervalDays`
- `enabled`
- `lastCompletedAt`
- `nextDueAt`
- `createdBy`
- `createdAt`
- `updatedAt`

约束：

- `intervalDays` 必须大于 0
- `customTaskName` 仅在 `taskType = custom` 时必填

### 6.6 TaskCompletionLog

字段：

- `id`
- `taskId`
- `plantId`
- `familyId`
- `completedBy`
- `completedAt`

### 6.7 PushSubscription

字段：

- `id`
- `userId`
- `familyId`
- `endpoint`
- `p256dh`
- `auth`
- `deviceLabel`
- `createdAt`
- `lastSeenAt`

---

## 7. Functional Requirements

### 7.1 Authentication and Family Space

系统必须支持：

- 邮箱登录能力
- 新用户创建家庭空间
- 通过邀请码加入家庭空间
- 已加入家庭的用户，登录后直接进入主应用

验收标准：

- 未登录用户不能访问主应用页
- 创建家庭成功后自动进入植物列表页
- 加入家庭成功后能看到已有植物与任务

### 7.2 Plant Management

系统必须支持：

- 添加植物
- 编辑植物资料
- 上传或替换植物封面图
- 查看植物详情
- 归档植物

列表页必须展示：

- 植物图片
- 植物名称
- 位置（若有）
- 最近的下一个到期任务摘要

详情页必须展示：

- 植物完整资料
- 所有已启用任务
- 每个任务的下一次提醒时间

### 7.3 Task Management

每株植物可拥有多个任务。

系统必须支持：

- 预置任务类型：浇水、施肥、喷雾、换土、修剪
- 自定义任务类型
- 配置任务间隔天数
- 启用与停用任务
- 删除任务

业务规则：

- 新建任务时，若未填写上次完成时间，可将当前时间作为初始化基准
- `nextDueAt` 根据基准时间和 `intervalDays` 计算
- 停用任务后，不出现在待办中，也不参与提醒

### 7.4 Due Tasks and Inbox

系统必须提供待办页，按任务状态展示：

- 逾期
- 今日到期
- 即将到期（可选，定义为未来 3 天）

排序规则：

1. 逾期优先
2. 到期时间更早者优先
3. 同时间按植物名称排序

每个待办项必须展示：

- 植物名称
- 任务类型
- 到期状态
- 完成按钮

### 7.5 Complete Task

用户点击“完成”后，系统必须：

1. 写入一条完成日志
2. 更新任务的 `lastCompletedAt`
3. 使用当前完成时间重算 `nextDueAt`
4. 刷新待办与详情展示
5. 将变更同步给同家庭成员

计算公式：

- `nextDueAt = completedAt + intervalDays`

MVP 不支持：

- “提前完成后仍按原计划时间计算”
- “跳过本次”
- “延后 X 天”

### 7.6 Notifications

系统必须支持：

- 用户在支持环境中开启 PWA Web Push
- 保存每个用户设备的通知订阅
- 当任务到期时，为订阅用户发送提醒

提醒文案至少包含：

- 植物名称
- 任务类型
- 到期提示

MVP 约束：

- 仅保证对已添加到主屏幕且已授权通知的 iPhone 用户提供推送
- 未成功订阅推送的用户，仍可在待办页看到所有到期任务

---

## 8. Derived Business Rules

### 8.1 Time Semantics

- 所有时间字段后端统一以 UTC 保存
- 前端按用户设备本地时区展示
- “今日到期”基于用户设备本地日期判断

### 8.2 Sync Semantics

- 同一任务被某位成员完成后，应尽快从其他成员待办中消失
- 允许极短时间的界面刷新延迟，但不允许长时间双写状态不一致

### 8.3 Archive Semantics

- 植物归档后默认不再出现在植物列表与待办页
- 已归档植物的历史完成记录保留

---

## 9. Validation Rules

### 9.1 Plant Form

- 名称必填，长度 1-50
- 图片在 MVP 中可选，但推荐上传
- 描述长度不超过 500
- 备注长度不超过 500
- 位置长度不超过 50

### 9.2 Task Form

- 任务类型必填
- 自定义任务名称长度 1-30
- `intervalDays` 为正整数，建议范围 1-365

### 9.3 Family Join

- 邀请码必填
- 无效邀请码需给出明确错误提示

---

## 10. Error Handling Expectations

- 网络失败时，表单提交必须提示失败，不得假装成功
- 图片上传失败时，应保留其他表单输入
- 任务完成失败时，前端必须回滚乐观更新或刷新为真实状态
- 无通知权限时，应提示用户去主屏幕 PWA 中开启通知

---

## 11. Testing Focus

MVP 至少需要覆盖以下验证：

- 家庭创建与加入流程
- 植物创建、编辑、归档
- 任务创建、启停、删除
- 完成任务后的 `nextDueAt` 计算
- 多成员共享状态同步
- 待办排序
- 推送订阅保存

---

## 12. Open Decisions Resolved in This Spec

- 用户模型：每位家庭成员使用独立账号
- 产品形态：PWA 优先，后续可升级原生壳
- 数据存储：云端为主，使用 Convex
- 周期规则：MVP 仅支持“按间隔天数滚动提醒”
