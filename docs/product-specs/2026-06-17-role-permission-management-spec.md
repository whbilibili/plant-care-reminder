# 角色与权限管理需求规格

**版本**：v0.4  
**日期**：2026-06-17  
**关联文档**：承接 [2026-06-15-settings-page-v0.3-iteration-spec.md](./2026-06-15-settings-page-v0.3-iteration-spec.md)（v0.3 D5 决策的正式替代方案）  
**文档定位**：引入三级角色体系（owner / admin / member），替代 v0.3 中"唯一管理员禁止退出"的临时方案，彻底解决"无主家庭"问题，并为管理员提供成员角色管理能力。

---

## 0. 本次迭代要解决的核心问题

v0.3 D5 采用了"最简兜底"——唯一管理员禁止退出，管理员转让推迟到 v0.4。这导致两个体验缺口：

> - **"我想让老婆也能管理家庭，但只有创建者才是管理员"** —— 无法指定其他人为管理员。
> - **"我是创建者，但我想退出 / 我想让别人来当家长"** —— 创建者被锁死，无法转让身份。

本次通过引入 **owner（所有者）** 角色，建立三级权限体系，让家庭始终有一个不可被动摇的最高权限者，同时解锁角色管理和 owner 转让能力。

---

## 1. 三级角色体系设计

### 1.1 角色定义

| 角色 | 语义 | 数量限制 | 如何获得 |
|------|------|---------|---------|
| **owner**（所有者） | 家庭的最高管理者，拥有解散家庭的权力 | 有且仅有 1 人 | 创建家庭时自动获得；或由现任 owner 转让 |
| **admin**（管理员） | 家庭的协助管理者，日常管理权限与 owner 一致 | 不限数量 | 由 owner 或其他 admin 提升 |
| **member**（普通成员） | 家庭的普通参与者，仅有使用权限 | 不限数量 | 通过邀请码/链接加入时默认角色 |

### 1.2 权限矩阵

| 操作 | owner | admin | member |
|------|-------|-------|--------|
| 查看植物/任务/待办 | ✅ | ✅ | ✅ |
| 添加/编辑/归档植物 | ✅ | ✅ | ✅ |
| 完成/延后养护任务 | ✅ | ✅ | ✅ |
| 修改家庭名称 | ✅ | ✅ | ❌ |
| 重置邀请码 | ✅ | ✅ | ❌ |
| 移除成员 | ✅ | ✅ | ❌ |
| 提升成员为 admin | ✅ | ✅ | ❌ |
| 降级 admin 为 member | ✅ | ✅ | ❌ |
| 降级/移除 owner | ❌（不可被操作） | ❌ | ❌ |
| 转让 owner 身份 | ✅（仅 owner 自己） | ❌ | ❌ |
| 删除（解散）家庭 | ✅ | ❌ | ❌ |
| 退出家庭 | ❌（必须先转让） | ✅ | ✅ |

### 1.3 核心约束

- **owner 唯一性**：任何时刻，一个家庭有且仅有一个 owner。转让是原子操作（原 owner 降为 admin + 新 owner 提升，不存在中间态）。
- **owner 不可退出**：owner 必须先将身份转让给其他成员（转让后自动变为 admin），才能退出家庭。
- **owner 不可被操作**：任何人（包括 owner 自己通过 removeMember）都不能移除或降级 owner，只能通过 transferOwnership 转让。
- **admin 互操作**：admin 可以提升 member 为 admin，也可以将其他 admin 降为 member。但无法操作 owner。
- **兜底保障**：因为 owner 永远存在且不可被动摇，家庭永远不会出现"无人可管理"的状态。

---

## 2. 用户场景

### 场景 1：owner 指定管理员

owner 进入设置页 → 成员列表 → 点击某个 member → 选择"设为管理员" → 该成员 role 变为 admin，立即获得管理权限。

### 场景 2：admin 互相管理

admin A 进入成员列表 → 点击 admin B → 选择"撤销管理员" → B 降为 member。反之 B 也可以对 A 做同样操作。owner 始终在场可以恢复。

### 场景 3：owner 转让身份

owner 进入设置页 → 成员列表 → 点击某个成员 → 选择"转让所有者" → 二次确认（破坏性操作） → 原 owner 变为 admin，目标成员变为 owner。

### 场景 4：owner 解散家庭

owner 进入设置页 → 家庭区域 → "删除家庭" → 二次确认（极破坏性操作，文案点名后果："删除后所有植物、养护记录、成员关系将永久丢失，无法恢复"）→ 删除整个家庭数据。

### 场景 5：owner 想离开

owner 点击"退出家庭" → 系统提示"作为家庭所有者，你需要先将所有者身份转让给其他成员" → 引导进入转让流程。

---

## 3. 对现有逻辑的影响

### 3.1 数据模型变更

- `familyRoleValues`：从 `["admin", "member"]` 扩展为 `["owner", "admin", "member"]`。
- `createFamily`：创建者的 membership role 从 `"admin"` 改为 `"owner"`。
- `families.createdBy`：保留为历史记录字段（记录原始创建人），不再作为权限判断依据。权限的唯一真相来源是 `familyMembers.role`。

### 3.2 现有接口改造

| 接口 | 当前逻辑 | 改造后 |
|------|---------|--------|
| `renameFamily` | `role !== "admin"` 拒绝 | `role === "member"` 拒绝（owner 和 admin 都放行） |
| `resetInviteCode` | 同上 | 同上 |
| `removeMember` | 不能移除 `createdBy` | 不能移除 `role === "owner"` 的成员；admin 可移除其他 admin |
| `leaveFamily` | 唯一 admin 禁止退出 | owner 禁止退出（提示先转让）；admin/member 自由退出 |
| `getFamilySettingsSummary` | 返回 `isCreator` 标记 | 额外返回 role 即可，`isCreator` 可保留作展示用 |

### 3.3 新增接口

| 接口 | 权限 | 行为 |
|------|------|------|
| `updateMemberRole` | owner 或 admin | 修改目标成员的 role（admin ↔ member）；不可操作 owner |
| `transferOwnership` | 仅 owner | 原子操作：目标成员 → owner，自己 → admin |
| `deleteFamily` | 仅 owner | 删除整个家庭及其所有数据（plants/tasks/logs/subscriptions/members） |

### 3.4 退出策略替代（替代 v0.3 D5）

v0.3 D5 的三分支逻辑简化为：

| 情形 | 处理 |
|------|------|
| owner 退出 | **拒绝**，提示"请先转让所有者身份" |
| admin / member 退出，家庭还有其他人 | 正常退出（级联删 pushSubscriptions，保留 taskCompletionLogs） |
| 最后一人退出（此人必然是 owner） | 因 owner 不可退出，此情形**不会发生**——owner 想清空家庭应使用"删除家庭" |

> **注意**：这意味着"最后一人退出删除家庭"的隐式逻辑被移除，替换为 owner 显式"删除家庭"操作。语义更清晰，用户不会意外丢失数据。

---

## 4. 交互设计要点

### 4.1 成员列表角色管理入口

- 管理员/所有者在成员列表中点击某成员，弹出操作 sheet。
- 操作选项根据操作者身份和目标身份动态展示：

| 操作者 | 目标 | 可用操作 |
|--------|------|---------|
| owner | member | 设为管理员、移除成员 |
| owner | admin | 撤销管理员、移除成员、转让所有者 |
| owner | 自己 | （无操作，owner 不能自降） |
| admin | member | 设为管理员、移除成员 |
| admin | 其他 admin | 撤销管理员、移除成员 |
| admin | owner | （无操作入口，不渲染） |
| admin | 自己 | （无操作） |
| member | 任何人 | （无管理入口） |

### 4.2 角色标签展示

成员列表每个成员名称旁显示角色标签：
- owner → "所有者"（建议用品牌色或金色标识）
- admin → "管理员"（次级标识）
- member → 不显示标签（默认态）

### 4.3 转让所有者确认

转让是不可轻易撤销的操作，必须二次确认：
- 确认文案："确定将所有者身份转让给『成员名』吗？转让后你将变为管理员。"
- 使用 `ConfirmSheet` 的 `danger-solid` 变体（红色确认按钮）。

### 4.4 删除家庭确认

极破坏性操作，建议强二次确认（输入家庭名确认）：
- 确认文案："删除家庭『家庭名』后，所有植物、养护记录、成员关系将永久丢失且无法恢复。"
- 使用 `ConfirmSheet` 的 `danger-solid` 变体。
- 可选增强：要求输入家庭名以确认（防误触，可 MVP 不做）。

---

## 5. 边界与异常处理

| 场景 | 处理 |
|------|------|
| admin 尝试操作 owner | 后端拒绝 + 前端不渲染操作入口（双重保护） |
| owner 尝试退出 | 后端拒绝，前端提示引导转让 |
| owner 尝试自我降级 | 后端拒绝（owner 只能通过转让离开此角色） |
| 转让目标不在家庭中 | 后端校验 membership 存在性 |
| 并发：两个 admin 同时互降 | Convex OCC 保证一致性，后执行的操作基于最新状态判断 |
| 老数据迁移：现有 admin 如何变为 owner | 部署时需跑数据迁移：每个家庭的 `createdBy` 对应的 membership 升级为 `"owner"` |

---

## 6. 数据迁移方案

现有数据中所有家庭的角色只有 `"admin"` 和 `"member"`。上线时需要执行一次性迁移：

- 遍历 `families` 表，取 `createdBy` userId。
- 找到对应 `familyMembers` 记录，将其 `role` 从 `"admin"` 更新为 `"owner"`。
- 若 `createdBy` 对应的用户已退出家庭（membership 不存在），则取该家庭最早加入的 admin 提升为 owner。
- 若家庭无任何 admin（极端脏数据），取最早加入的 member 提升为 owner。

---

## 7. 验收标准

### 7.1 角色提升/降级
- [ ] owner 可将 member 提升为 admin
- [ ] owner 可将 admin 降级为 member
- [ ] admin 可将 member 提升为 admin
- [ ] admin 可将其他 admin 降级为 member
- [ ] admin 无法操作 owner（前端不渲染入口 + 后端拒绝）
- [ ] member 无管理操作入口

### 7.2 转让所有者
- [ ] owner 可将身份转让给任意成员（admin 或 member）
- [ ] 转让后原 owner 自动变为 admin
- [ ] 转让后目标成员变为 owner
- [ ] 转让为原子操作，无中间态
- [ ] 非 owner 调用 transferOwnership 被后端拒绝
- [ ] 转让需二次确认

### 7.3 删除家庭
- [ ] owner 可删除家庭，所有数据（plants/tasks/logs/subscriptions/members/family）全部清除
- [ ] 非 owner 调用 deleteFamily 被后端拒绝
- [ ] 删除需二次确认，文案明确点名后果
- [ ] 删除后所有家庭成员回到"创建/加入家庭"状态

### 7.4 退出策略
- [ ] owner 退出被拒绝，提示先转让
- [ ] admin / member 可自由退出
- [ ] 不再存在"最后一人退出删除家庭"的隐式行为

### 7.5 成员列表展示
- [ ] 成员列表显示角色标签（所有者 / 管理员）
- [ ] 成员按 owner > admin > member 排序，同级内按加入时间

### 7.6 数据迁移
- [ ] 现有家庭的创建者 membership 升级为 owner
- [ ] 迁移后每个家庭有且仅有一个 owner

---

## 8. 与 v0.3 决策的衔接

| v0.3 决策 | 本次调整 |
|-----------|---------|
| D5：唯一管理员禁止退出 | **替代**：owner 禁止退出（必须先转让），admin/member 自由退出 |
| D5：最后一人退出删除家庭 | **替代**：owner 显式"删除家庭"操作，不再有隐式删除 |
| D5：转让管理员放 v0.4 | **本次实现**：transferOwnership 作为核心能力 |
| removeMember 不可移除 createdBy | **改为**：不可移除 role === "owner" |

---

## 9. 后续候选（本次不做）

- 删除家庭时要求输入家庭名确认（防误触增强）
- owner 操作审计日志（记录谁在什么时候提升/降级了谁）
- 角色变更通知（被提升/降级时收到 push 通知）
- 批量角色管理（一次性设置多人角色）
