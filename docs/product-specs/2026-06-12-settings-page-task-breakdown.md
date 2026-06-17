# 设置页迭代 v0.2 功能拆分（功能 + UI 配对）

**版本**：v0.2（任务拆分）
**日期**：2026-06-12
**关联文档**：
- 产品决策：[2026-06-12-settings-page-iteration-spec.md](./2026-06-12-settings-page-iteration-spec.md)（PRD，10 条已拍板）
- 视觉规格：[2026-06-12-settings-page-ui-spec.md](./2026-06-12-settings-page-ui-spec.md)（UI Spec，14 节）

**文档定位**：把 PRD 与 UI Spec 合并落地为可被 Coding Agent 逐条执行的任务清单。每个能力都**同时拆出功能性任务（FE/BE）与 UI 美化任务**，二者明确标注依赖与配合关系——功能任务保证"能用"，UI 任务保证"好看 + 符合设计基调"，避免出现"功能写完了但样式是裸 HTML"或"样式很美但点了没反应"。

---

## 0. 拆分原则与约定

### 0.1 任务类型标记

| 标记 | 含义 |
|------|------|
| 🔧 BE | 后端任务（Convex mutation / query / schema） |
| ⚙️ FE | 前端功能任务（数据绑定、状态、交互逻辑、路由） |
| 🎨 UI | UI 美化任务（视觉、布局、动效、token 落地、无障碍） |
| 🧪 QA | 验证任务（手测 / 单测 / 类型检查） |

### 0.2 配合关系约定

- **🔧 BE → ⚙️ FE → 🎨 UI** 是典型链路：后端能力先行，前端打通逻辑（可裸样式），UI 任务再贴合设计基调美化。
- UI 任务**不改业务逻辑**，只改视觉与无障碍属性；功能任务**不引入硬编码色值**，给 UI 任务留好 className/结构钩子。
- 凡 🎨 UI 任务，色值/间距/圆角/动效**一律引用 `tokens.css` 变量与现有 keyframes**，禁止新增硬编码。

### 0.3 现有可复用资产（拆分已对齐）

| 资产 | 路径 | 复用方式 |
|------|------|---------|
| 确认 sheet 骨架 | `app/src/features/tasks/PostponeConfirmSheet.tsx` | 抽象为通用 `ConfirmSheet`（动效 `sheet-rise-in/overlay-in` 复用） |
| 称呼表单逻辑 | `app/src/features/auth/ProfileBootstrapForm.tsx` | 复用其 `users.updateMyProfile` 调用与校验，改造为可嵌入 sheet |
| 成员列表 | `app/src/features/family/MembersList.tsx` | 扩展头像 + 移除入口 |
| 通知卡 | `app/src/features/notifications/NotificationPromptCard.tsx` | 外壳统一 chip，底部挂排障折叠 |
| 设置页主体 | `app/src/features/family/FamilySettingsPage.tsx` | 重构为三分组容器 |
| 设置摘要查询 | `app/convex/families.ts → getFamilySettingsSummary` | 扩展返回 `createdBy`、`currentUserRole`、`myEmail` |
| 通用按钮 | `app/src/components/ui/Button.tsx` | 复用 variant |

---

## 1. 任务总览（Epic → Story）

| Epic | 对应 PRD | 功能任务 | UI 任务 | 验证 |
|------|---------|---------|---------|------|
| E1 后端能力补齐 | §4.1–4.3、§7 | T1.1 ~ T1.4 | — | T1.5 |
| E2 信息架构重组 | §3、§5 | T2.1 | T2.2 ~ T2.4 | T2.5 |
| E3 个人组（称呼/账号/退出） | §4.1、§6.2 | T3.1、T3.3 | T3.2、T3.4 | T3.5 |
| E4 家庭头图卡 | UI §4 | T4.1 | T4.2 | — |
| E5 邀请码卡 + 重置 | §4.3、UI §5 | T5.1 | T5.2、T5.3 | T5.4 |
| E6 成员卡 + 头像 + 移除 | §4.2、UI §6 | T6.1、T6.3 | T6.2、T6.4 | T6.5 |
| E7 通知卡 + 排障 + 关于 | §4.4、4.5、UI §7 | T7.2 | T7.1、T7.3、T7.4 | — |
| E8 通用确认 sheet | §6.2、UI §8 | T8.1 | T8.2 | T8.3 |
| E9 整体验收 | §9、UI §14 | — | — | T9.1 |

---

## 2. E1 · 后端能力补齐（先行，解锁前端）

### 🔧 T1.1 扩展 `getFamilySettingsSummary` 返回字段
- **文件**：`app/convex/families.ts`
- **内容**：在返回结构中追加：`createdBy`（family.createdBy）、`currentUserRole`（当前用户的 role）、`currentUserId`、当前用户 `email`（"我的账号"展示用）。成员项已含 `role/displayName/email/isCurrentUser`，补 `isCreator`（`userId === family.createdBy`）。
- **依赖**：无
- **产出契约**：前端据此判定"移除入口可见性 = currentUserRole==='admin' && !isCurrentUser && !isCreator"、"重置入口 = currentUserRole==='admin'"。

### 🔧 T1.2 新增 `removeMember` mutation（移除成员）
- **文件**：`app/convex/families.ts`
- **规则**（对齐 PRD §4.2 / §7）：
  - 鉴权：仅当前用户 `role==='admin'` 可操作。
  - 禁止：移除自己、移除 `family.createdBy`（创建者保护）。
  - 删除目标 `familyMembers` 记录。
  - **级联**：删除该用户在本家庭的 `pushSubscriptions`（`by_familyId_and_userId`），避免给已离开成员推送。
  - **保留**：不删除 `taskCompletionLogs`（养护历史属于家庭资产，PRD §7.1 / 决策 10）。
  - 错误文案走"家庭语言"，由前端兜底翻译。
- **依赖**：T1.1（角色判定一致）

### 🔧 T1.3 新增 `resetInviteCode` mutation（重置邀请码）
- **文件**：`app/convex/families.ts`
- **规则**（对齐 PRD §4.3）：
  - 鉴权：仅 `admin`。
  - 复用既有 `generateInviteCode` + `by_inviteCode` 唯一性循环校验（与 `createFamily` 同逻辑，建议抽 helper `generateUniqueInviteCode(ctx)` 去重）。
  - `ctx.db.patch(familyId, { inviteCode: newCode })`，旧码即时失效（凭码加入走 `by_inviteCode`，自然查不到旧码）。
  - 返回新 `inviteCode`。
- **依赖**：无

### ⚙️ T1.4 校验"我的称呼"写入链路可被设置页复用
- **文件**：`app/convex/users.ts`（确认 `updateMyProfile` 存在且约束齐全）
- **内容**：确认 `updateMyProfile` 的非空/长度上限（onboarding 用 maxLength 40）校验完整；如有缺口补齐。设置页改称呼复用此 mutation，不重造规则。
- **依赖**：无

### 🧪 T1.5 后端验证
- 类型检查 `npx convex dev` 编译通过；针对 `removeMember` 的创建者保护、非 admin 拒绝、`pushSubscriptions` 级联，`resetInviteCode` 唯一性，手动构造数据验证。

---

## 3. E2 · 信息架构重组（页面骨架）

### ⚙️ T2.1 重构 `FamilySettingsPage` 为三分组骨架
- **文件**：`app/src/features/family/FamilySettingsPage.tsx`
- **内容**：
  - 顶部新增页面标题 `<h1>设置</h1>`（全页唯一 h1，PRD §5.1）。
  - 按「个人 / 家庭 / 通知与应用」三组重排现有卡片（PRD §3.1）。
  - 引入 `currentUserRole / createdBy` 等新字段做后续条件渲染的数据准备。
  - 保留加载态文案「正在同步家庭信息…」。
- **配合**：先用现有样式跑通结构，视觉交给 T2.2 ~ T2.4。

### 🎨 T2.2 新增 `SettingsGroup` 分组容器组件
- **文件**：`app/src/features/family/SettingsGroup.tsx`（新增）
- **内容**：分组小标题（UI §2.2：Raleway 13/700、`--color-leaf-light`、字距 0.06em、**不 uppercase**）+ children slot；组间 `--space-lg`、组内 `--space-md`、标题贴首卡 `--space-sm`（UI §1）。语义用 `<h2>` 承载分组小标题（无障碍 §12）。
- **依赖**：T2.1

### 🎨 T2.3 新增图标 chip 公共片段
- **文件**：`app/src/features/family/SettingCardHeader.tsx`（新增，chip + eyebrow + h3 标题）
- **内容**：32×32 chip（`--radius-button`、`--color-mist` 底、emoji 18px 居中）+ eyebrow + 卡内标题降为 `<h3>`（UI §3.2 / §12 标题层级）。图标映射：家庭 🏠 / 邀请码 🔑 / 成员 👥 / 通知 🔔 / 关于 ℹ️。
- **依赖**：T2.1

### 🎨 T2.4 页面标题与整页间距视觉落地
- **文件**：`FamilySettingsPage.tsx`
- **内容**：h1 样式（Lora 24/700、`--color-ink`、下间距 `--space-md`）、底部预留 80px 安全区、整页 `pageStyle` 套分组容器（UI §1 / §2.1）。

### 🧪 T2.5 结构验证
- 全页 DOM 仅一个 `<h1>`；三组顺序与间距符合 UI §1；`AppRouter.smoke.test` 仍通过。

---

## 4. E3 · 个人组（称呼 / 账号 / 退出）

### ⚙️ T3.1 我的称呼——可编辑设置项（逻辑）
- **文件**：`FamilySettingsPage.tsx` + 复用 `ProfileBootstrapForm` 逻辑
- **内容**：点击"我的称呼"行打开编辑 sheet（复用 `users.updateMyProfile`）；保存成功后 `getFamilySettingsSummary` 自动刷新，成员列表中"我"的显示名实时更新（PRD §4.1）。把 `ProfileBootstrapForm` 的表单逻辑抽为可嵌入 sheet 的轻量编辑表单（保留 maxLength/非空校验与错误态）。
- **依赖**：T1.4、T8.1（sheet）

### 🎨 T3.2 设置项行 `SettingRow` 组件（视觉）
- **文件**：`app/src/features/family/SettingRow.tsx`（新增）
- **内容**：标签—值—chevron 横向结构（UI §3.3：min-height 52px、行内图标 20px `--color-leaf-light`、标签 15/500 `--color-ink`、值 15/400 `--color-muted` 居右、可点项尾 chevron、只读项无箭头、多项间 1px `--color-line` 分割）。"我的称呼"为可点项、"我的账号"为只读项。
- **依赖**：T3.1

### ⚙️ T3.3 退出登录——迁入个人组 + 接确认（逻辑）
- **文件**：`FamilySettingsPage.tsx`
- **内容**：把现有 `signOut` 逻辑从底部独立区迁到「个人」组末尾（PRD §3.1 / 决策 9）；点击不再直接退出，改为打开退出确认 sheet（PRD §6.2）。
- **依赖**：T8.1

### 🎨 T3.4 退出登录按钮视觉（描边危险态）
- **文件**：`FamilySettingsPage.tsx`
- **内容**：保留现有描边态（透明底 + 1px `--color-error` 边 + `--color-error` 字），置于个人组末尾，仍显性可见、不埋深（PRD §9.7 / UI §8.3）。
- **依赖**：T3.3

### 🧪 T3.5 个人组验证
- 改称呼保存后成员列表"我"实时更新；账号行只读；退出走二次确认。

---

## 5. E4 · 家庭头图卡（情感锚点）

### ⚙️ T4.1 家庭摘要数据绑定（逻辑）
- **文件**：`FamilySettingsPage.tsx`
- **内容**：家庭名从 h1(24px) 降为卡内信息（PRD §5.1）；副文案按人数走两套文案（UI §4.3：1 人→"还没有家人加入，把邀请码发出去吧"；≥2 人→"N 位家人 · 一起照顾这片植物"，株数可选拼接）。
- **依赖**：T2.1

### 🎨 T4.2 家庭头图卡视觉（品牌绿渐变）
- **文件**：`app/src/features/family/FamilyHeroCard.tsx`（新增）
- **内容**：UI §4.2 全套——`linear-gradient(135deg, var(--color-leaf), var(--color-leaf-light))` 背景、右上角半透明 🌿（48px opacity 0.18 溢出裁切）、白底半透明 chip、家庭名 Lora 22/700 `--color-paper`、副文案 13 白 85%。**全页唯一强色块**（UI §0 原则 2 / §9 色彩纪律）。白字对比度 ≥ 4.5:1（§12）。
- **依赖**：T4.1、T2.3

---

## 6. E5 · 邀请码卡 + 重置

### ⚙️ T5.1 重置邀请码逻辑 + 复制逻辑保留（逻辑）
- **文件**：`FamilySettingsPage.tsx`
- **内容**：保留现有复制 + fallback 逻辑（不回归，PRD §6.4）；重置入口仅 `currentUserRole==='admin'` 渲染（非置灰，PRD §6.3）；点击触发重置确认 sheet → 调 `resetInviteCode` → 成功后页面展示新码并提示重新分享（PRD §4.3）。
- **依赖**：T1.3、T8.1

### 🎨 T5.2 邀请码高亮容器视觉
- **文件**：`app/src/features/family/InviteCodeCard.tsx`（新增，从设置页抽出）
- **内容**：UI §5.2——`--color-mist` 底 + 1px dashed `--color-line` 虚线框 + `--radius-input`；邀请码 Mono 24/700 `--color-leaf` 字距 0.12em `user-select:all`；复制按钮内嵌右侧，成功切「已复制」+ `--color-success`。
- **依赖**：T5.1

### 🎨 T5.3 重置文字链 + fallback 视觉
- **文件**：`InviteCodeCard.tsx`
- **内容**：重置文字链（13/500 `--color-muted`，左对齐，容器下方，UI §5.3）；复制失败 fallback 区视觉不回归（`--color-mist` 底虚线框 + 居中码 + 长按提示，UI §5.4）。
- **依赖**：T5.2

### 🧪 T5.4 邀请码验证
- admin 见重置入口、普通成员不见；重置后旧码失效、新码展示；复制成功/失败两路反馈正常。

---

## 7. E6 · 成员卡 + 头像 + 移除

### 🎨 T6.1 成员卡标题消除重复命名（视觉）
- **文件**：`FamilySettingsPage.tsx` / `MembersList.tsx`
- **内容**：eyebrow「家庭」+ 标题「成员（N）」，去掉双"家庭成员"重复（PRD §5.2 / UI §6.1）。
- **依赖**：T2.3

### 🎨 T6.2 成员头像占位组件（视觉）
- **文件**：`app/src/features/family/MemberAvatar.tsx`（新增）
- **内容**：UI §6.3——36×36 圆形、首字（中文首字 / 英文首字母大写）、白字 15/700；底色按 `displayName` hash 取模从取色池轮换（`--color-leaf`、`--color-leaf-light`、`--color-task-misting/pruning/fertilizing`）保证同人稳定；无名兜底 👤 + `--color-muted`；装饰性 `aria-hidden`。
- **依赖**：无

### ⚙️ T6.3 成员移除入口逻辑
- **文件**：`MembersList.tsx`
- **内容**：移除文字链仅"当前 admin && 非自己 && 非创建者"三条件同时满足时渲染（PRD §4.2 / §6.3、UI §6.5）；点击触发移除确认 sheet（含被移除人名字）→ 调 `removeMember`（`stopPropagation`）；成功后列表自动刷新。
- **依赖**：T1.1、T1.2、T8.1

### 🎨 T6.4 成员行视觉（头像 + 角色徽章 + 移除）
- **文件**：`MembersList.tsx`
- **内容**：UI §6.2 / §6.4——行 flex gap 12、内分割线；名字 15/600 单行省略、邮箱副行 12 muted；「我」标 pill（mist 底 + leaf 字）；管理员徽章实底（`--color-leaf` 底 + `--color-paper` 字）、成员徽章描边（mist 底 + line 边）；移除文字链 13/500 `--color-error`，热区 ≥ 44。
- **依赖**：T6.2、T6.3

### 🧪 T6.5 成员卡验证
- 三条件控制移除入口正确；创建者/自己无移除入口；普通成员视角全只读；头像同人颜色稳定；移除后历史完成记录不丢、被移除者重进回到加入家庭流程。

---

## 8. E7 · 通知卡 + 排障 + 关于

### 🎨 T7.1 通知卡外壳统一（视觉）
- **文件**：`NotificationPromptCard.tsx`
- **内容**：顶部 eyebrow 区替换为统一 🔔 chip + eyebrow「通知」结构与其他卡对齐；三态 + needs_install 兜底与状态徽章**不回归**（UI §7.1）。
- **依赖**：T2.3

### ⚙️ T7.2 排障折叠交互逻辑
- **文件**：`app/src/features/notifications/NotificationTroubleshooting.tsx`（新增）
- **内容**：disclosure 折叠态机（默认收起），`aria-expanded` + `aria-controls`（PRD §4.4 / UI §7.2 / §12）；静态清单 1–4 条（加主屏 / 允许通知 / 系统设置 / 待办页兜底），无需后端。
- **依赖**：无

### 🎨 T7.3 排障折叠视觉与动效
- **文件**：`NotificationTroubleshooting.tsx`
- **内容**：触发器 40px 整行可点、13/500 `--color-leaf-light`、▸/▾ 旋转 200ms；展开区 `--color-mist` 底 + `--radius-input`、有序清单 13 muted 行高 1.6；展开动效 max-height+opacity 300ms ease-out，遵循 `prefers-reduced-motion`（UI §7.2 / §12）。
- **依赖**：T7.2

### 🎨 T7.4 关于卡（视觉 + 版本号）
- **文件**：`app/src/features/family/AboutCard.tsx`（新增）
- **内容**：ℹ️ chip + eyebrow「关于」+ 正文「家庭内部植物养护提醒工具」（14 muted）+ 版本行（Mono 12 muted，取构建版本，PRD §4.5 / UI §7.3）。版本号建议从构建变量/`package.json` 注入，不硬编码两处。
- **依赖**：T2.3

---

## 9. E8 · 通用确认 Sheet（横切，三处复用）

### ⚙️ T8.1 抽象通用 `ConfirmSheet` 组件
- **文件**：`app/src/components/ui/ConfirmSheet.tsx`（新增，从 `PostponeConfirmSheet` 提炼）
- **内容**：参数化 `title / description / confirmLabel / cancelLabel / variant('danger-solid'|'danger-outline'|'primary') / isSubmitting / onConfirm / onCancel`；复用现有遮罩 + sheet 动效（`sheet-overlay-in/out` + `sheet-rise-in/sink-out`）、grabber、退场时序（EXIT_DURATION_MS）、reduced-motion 兜底、点遮罩/取消/Esc 关闭（UI §8.2 / §12 focus trap）。
- **配合**：保持 `PostponeConfirmSheet` 行为不回归（可改为内部复用 `ConfirmSheet` 或并存）。
- **依赖**：无

### 🎨 T8.2 三种确认的按钮配色映射（视觉）
- **文件**：`ConfirmSheet.tsx`
- **内容**：UI §8.3 三套——退出登录=描边危险（透明底 + error 边/字）；移除成员=实底危险（error 底 + surface 字）；重置邀请码=品牌绿强调（leaf 底 + paper 字）。取消统一 ghost。
- **依赖**：T8.1

### 🧪 T8.3 Sheet 验证
- 三处调用共用同一骨架；动效复用现有 keyframes；focus trap、Esc/遮罩关闭、reduced-motion 即时切换均正常。

---

## 10. E9 · 整体验收

### 🧪 T9.1 端到端验收（对照 PRD §9 + UI §14）
- 逐条核对 PRD 9 条 + UI Spec 11 条验收标准。
- `npm run lint` / `tsc` / `vitest` 通过；`npx convex dev` 编译通过。
- 移动端 320px 窄屏：邀请码、成员行、家庭头图卡均不溢出、文字正确省略。
- 全部色值/间距/圆角引用 token，无新增硬编码；reduced-motion 下动效降级正常。
- 权限两视角各跑一遍：管理员（见重置/移除）、普通成员（全只读，无置灰暗示）。

---

## 11. 推荐执行顺序（依赖拓扑）

按依赖关系，建议分四批推进，每批内可并行：

```
第 1 批（解锁层）   ：T1.1 → T1.2 / T1.3 / T1.4 / T1.5   （后端先行）
                      ‖ T8.1 → T8.2 → T8.3              （通用 sheet，无后端依赖，可并行）
                      ‖ T6.2（头像组件，纯 UI 无依赖）

第 2 批（骨架层）   ：T2.1 → T2.2 / T2.3 / T2.4 → T2.5    （三分组骨架 + 公共片段）

第 3 批（能力层）   ：E3 个人组 (T3.x) ‖ E4 头图卡 (T4.x)
                      ‖ E5 邀请码 (T5.x) ‖ E6 成员卡 (T6.x)
                      ‖ E7 通知/排障/关于 (T7.x)
                      （各 Epic 内部仍按 BE→FE→UI 顺序，Epic 之间并行）

第 4 批（验收层）   ：T9.1 端到端验收
```

关键前置：**T8.1 通用 ConfirmSheet 是 T3.1/T3.3/T5.1/T6.3 的共同依赖**，务必在第 1 批完成，否则四个能力的功能任务都会被阻塞。**T1.1 的字段扩展是 T5.1/T6.3 权限渲染的共同前提**，同样优先。

---

## 12. 功能 × UI 配对总览

> 一眼确认"每个能力都既有功能任务也有 UI 任务"，二者如何配合。

| 能力 | 功能任务（保证能用） | UI 任务（保证好看且合基调） | 配合点 |
|------|---------------------|---------------------------|--------|
| 我的称呼 | T1.4 写入链路 + T3.1 编辑交互 | T3.2 `SettingRow` 视觉 | 功能给可点行钩子，UI 出标签—值—chevron 样式 |
| 我的账号 | T1.1 返回 email + T3.1 渲染 | T3.2 只读行样式 | 复用同一 `SettingRow`，只读态无箭头 |
| 退出登录 | T3.3 迁组 + 接确认 | T3.4 描边危险态 + T8.2 sheet 配色 | 功能挂确认 sheet，UI 出描边按钮与 sheet 危险样式 |
| 家庭摘要 | T4.1 数据 + 文案分支 | T4.2 品牌绿头图卡 | 功能定文案，UI 把它做成全页唯一情感锚点 |
| 邀请码分享 | T5.1 复制 + fallback 逻辑 | T5.2 虚线高亮容器 | 逻辑不回归，UI 强化"可分享"语义 |
| 重置邀请码 | T1.3 mutation + T5.1 权限渲染 | T5.3 文字链 + T8.2 强调态 sheet | 功能控 admin 可见，UI 出次级文字链与绿色确认 |
| 成员展示 | T1.1 字段 + T6.1 命名清理 | T6.2 头像 + T6.4 行视觉 | 功能去重命名，UI 补头像/徽章层级 |
| 移除成员 | T1.2 mutation + T6.3 三条件渲染 | T6.4 移除文字链 + T8.2 实底危险 sheet | 功能控三条件与级联，UI 出红链与最强警示确认 |
| 通知开关 | （沿用现有） | T7.1 chip 外壳统一 | 逻辑不动，UI 仅统一外壳 |
| 收不到提醒排障 | T7.2 折叠态机 + a11y | T7.3 折叠视觉 + 动效 | 功能管展开/无障碍，UI 出 mist 展开区与动效 |
| 版本/关于 | T7.4 版本号注入 | T7.4 卡片视觉 | 同任务内功能（取版本）与视觉合并 |
| 破坏性确认 | T8.1 通用 sheet 逻辑 | T8.2 三态配色 | 横切：一套骨架，三种视觉变体 |

---

## 13. 不在本次范围（对齐 PRD §10）

转让管理员、邀请审批、权限分级、切换/多家庭、深色模式、数据导出、完整反馈工单、归档植物收口——均不拆任务，记录备查。