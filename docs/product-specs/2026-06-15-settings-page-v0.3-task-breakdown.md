# 设置页迭代 v0.3 功能规格（功能 + UI 配对拆分）

**版本**：v0.3（任务拆分 / 功能规格）
**日期**：2026-06-15
**关联文档**：
- 产品决策：[2026-06-15-settings-page-v0.3-iteration-spec.md](./2026-06-15-settings-page-v0.3-iteration-spec.md)（PRD，D1~D6 全部已拍板）
- 上一迭代：[2026-06-12-settings-page-task-breakdown.md](./2026-06-12-settings-page-task-breakdown.md)（v0.2，SET2-001~012 已落地）
- Agent 可执行清单：[../exec-plans/modules/settings-page-v0.3.json](../exec-plans/modules/settings-page-v0.3.json)

**文档定位**：把 v0.3 PRD 已拍板的四项能力（①头像 / ②家庭改名 / ③邀请链接 / ④退出家庭）落地为可被 Coding Agent 逐条执行的功能规格。每个能力**同时拆出功能任务（BE/FE）与 UI 美化任务**，并明确依赖与配合关系——功能保证"能用"，UI 保证"好看且贴合 botanical 基调"。本拆分已对照 v0.3 代码现状逐条核验（families.ts / users.ts / lib/auth.ts / router.tsx / StorageImage.tsx / uploadPlantImage.ts / MemberAvatar.tsx 等），所有"复用/照搬"均指向真实存在的资产。

---

## 0. 拆分原则与约定

### 0.1 任务类型标记

| 标记 | 含义 |
|------|------|
| 🔧 BE | 后端任务（Convex schema / mutation / query） |
| ⚙️ FE | 前端功能任务（数据绑定、状态、交互、路由） |
| 🎨 UI | UI 美化任务（视觉、布局、动效、token、无障碍） |
| 🧪 QA | 验证任务（手测 / 单测 / 类型检查 / smoke） |

### 0.2 配合关系约定（沿用 v0.2）

- **🔧 BE → ⚙️ FE → 🎨 UI** 为典型链路：后端先行，前端打通逻辑（可裸样式），UI 再贴合基调美化。
- UI 任务**不改业务逻辑**；功能任务**不引入硬编码色值**，给 UI 留好 className/结构钩子。
- 凡 🎨 UI 任务，色值/间距/圆角/动效**一律引用 `app/src/styles/tokens.css` 变量与现有 keyframes**，禁止新增硬编码 #hex（PRD §6.2）。

### 0.3 现有可复用资产（拆分已对齐真实代码）

| 资产 | 路径 | 复用方式 | 用于 |
|------|------|---------|------|
| `uploadPlantImage` | `app/src/features/plants/uploadPlantImage.ts` | **已参数化**（`generateUploadUrl`/`getPlantImageUrl` 为注入回调），头像直接注入头像版回调即可 | ① |
| `normalizeImageFile` | `app/src/features/plants/normalizeImageFile.ts` | HEIC→JPEG 转码，与家庭无耦合，直接复用 | ① |
| `StorageImage` | `app/src/components/ui/StorageImage.tsx` | **当前硬编码 `api.plants.getPlantImageUrl`**，需参数化取 URL 查询（D1） | ① |
| `MemberAvatar` | `app/src/features/family/MemberAvatar.tsx` | 当前仅接受 `name`，扩展 `imageStorageId`，有图渲染真实头像否则回退首字色块 | ① |
| `generatePlantImageUploadUrl` / `getPlantImageUrl` | `app/convex/plants.ts` | 范本（注意：二者带 `requireCurrentFamilyMember` 家庭门槛，头像须新建**用户级**接口不带该门槛） | ① |
| `NicknameEditSheet` | `app/src/features/family/NicknameEditSheet.tsx` | 克隆为 `FamilyNameEditSheet`，把 `updateMyProfile` 换成 `renameFamily` | ② |
| `resetInviteCode` 的 admin 校验模式 | `app/convex/families.ts:269` | 照搬：校验登录→校验有家庭→取 currentMembership 判 `role!=='admin'` 抛错 | ②④ |
| `removeMember` 的级联模式 | `app/convex/families.ts:202` | 照搬：删 pushSubscriptions（`by_familyId_and_userId` collect 后逐条删）、保留 taskCompletionLogs | ④ |
| `joinFamilyByInviteCode` | `app/convex/families.ts:86` | 已含单一家庭校验（`familyId === null`），③ 前端把链接里的码喂给它，**无需新后端逻辑** | ③ |
| `InviteCodeCard` | `app/src/features/family/InviteCodeCard.tsx` | 在"复制邀请码"旁新增"复制邀请链接"，沿用 clipboard 复制 + 长按兜底 | ③ |
| `ConfirmSheet` | `app/src/components/ui/ConfirmSheet.tsx` | ④ 退出家庭确认（`variant="danger-solid"`） | ④ |
| `router.tsx` 的 `normalizePath` | `app/src/app/router.tsx:43` | **当前硬编码白名单 + 不解析 query/动态 `/join`**，③ 需扩展一条 `/join/:code` 解析 | ③ |
| `generateUniqueInviteCode` / `lib/auth.ts` | `app/convex/families.ts:25` / `app/convex/lib/auth.ts:60` | ④ 删整个家庭时复用清理；`.unique()` 加固在 §6 | ③④ |

---

## 1. 任务总览（Epic → Story → Task）

| Epic | 对应 PRD | 优先级 | 功能任务（BE/FE） | UI 任务 | 验证 |
|------|---------|--------|------------------|---------|------|
| **E1 家庭改名** | §3 | **P0** | SET3-001（BE renameFamily）、SET3-002（FE FamilyNameEditSheet 接入） | SET3-002 内含可点行视觉 | SET3-003 |
| **E2 退出家庭** | §5 | **P0** | SET3-004（BE leaveFamily + D5 策略）、SET3-005（FE 退出行 + 确认） | SET3-005 内含破坏性行视觉 | SET3-006 |
| **E3 个人头像** | §2 | **P1** | SET3-007（BE schema + 用户级接口）、SET3-008（FE 上传交互）、SET3-009（StorageImage 参数化 + MemberAvatar 改造） | SET3-008/009 内含圆形预览视觉 | SET3-010 |
| **E4 邀请链接** | §4 | **P1** | SET3-011（FE 路由扩展 `/join/:code`）、SET3-012（FE 跨多跳暂存 + onboarding 自动加入）、SET3-013（FE 复制邀请链接 + 邀请落地页） | SET3-013 内含落地页视觉 | SET3-014 |
| **E5 全局加固** | §6.1 | 顺带 | SET3-015（`.unique()`→`.first()` 防御加固） | — | 并入 SET3-016 |
| **E6 整体验收** | §7 | — | — | — | SET3-016 |

> **落地节奏（PRD §9 已定）**：第一批 P0 = E1 + E2（含 E5 加固，因 ④ 退出会写入 membership 路径）；第二批 P1 = E3 + E4。E2 是 E4 闭环的前置（误入家庭→退出→重新加入链接）。

---

## 2. E1 · 家庭改名（P0，最低成本最低风险）

### 🔧 SET3-001 新增 `renameFamily` mutation
- **文件**：`app/convex/families.ts`
- **内容**：照搬 `resetInviteCode` 的 admin 权限校验模式——`loadCurrentUserContext` → 校验 `userId && familyId` → 取 `currentMembership` 判 `role !== "admin"` 抛错；再 `args.name.trim()` 非空校验 + 长度上限（≤20，与下方约束一致，建议抽常量 `FAMILY_NAME_MAX_LENGTH`）→ `ctx.db.patch(familyId, { name })`。
- **依赖**：无
- **产出契约**：`api.families.renameFamily({ name })`；非 admin / 空名 / 超长均抛错。
- **验收**：Convex 编译无 error；非 admin 调用被拒；空名/超长被拒；patch 后 `getFamilySettingsSummary` 实时返回新名。

### ⚙️🎨 SET3-002 `FamilyNameEditSheet` + 家庭名可编辑行
- **文件**：`app/src/features/family/FamilyNameEditSheet.tsx`（新增，克隆 `NicknameEditSheet`）、`app/src/features/family/FamilyHeroCard.tsx`（或家庭摘要卡，挂可点击入口）
- **功能内容**：克隆 `NicknameEditSheet` 结构（`ConfirmSheet variant="primary"` + 内嵌 `InputField`），把 `updateMyProfile` 换为 `renameFamily`，初始值取当前家庭名，保留非空 + maxLength 校验。**仅 `currentUserRole === "admin"` 渲染可点击行**，普通成员看到的家庭名为纯只读文本（**不渲染编辑入口、不置灰**，PRD §3.2）。
- **UI 内容**：管理员视角家庭名行可点击（尾部细微 chevron 或编辑态指示），点击从底部升起编辑 sheet；改名非破坏性，**无二次确认**（直接编辑保存，与改称呼一致，PRD §3.2）。色值/间距全部引用 token。
- **依赖**：SET3-001
- **配合点**：功能给可点行钩子与 mutation，UI 出可编辑指示与 sheet 视觉。
- **⚠️ 注意**：家庭名仍需可被 v0.2 smoke 的 `getByText` 命中（PRD §3.4）——可点击元素内文本仍可被 `getByText` 命中，落地时跑一遍 smoke 确认不破坏断言。

### 🧪 SET3-003 家庭改名验证
- 管理员可改、保存后页面所有家庭名展示处实时更新；普通成员无编辑入口（只读，无置灰）；非 admin 调 `renameFamily` 被后端拒绝；空名/超长被拒；**不破坏 v0.2 家庭名 `getByText` 断言**。

---

## 3. E2 · 退出家庭（P0，含 D5 数据一致性决策）

### 🔧 SET3-004 新增 `leaveFamily` mutation（含 D5 策略）
- **文件**：`app/convex/families.ts`
- **内容**：`loadCurrentUserContext` → 校验 `userId && familyId` → 取 `currentMembership`。按 **PRD §5.4 D5 最简兜底策略**分支处理：
  1. **判定是否唯一管理员/创建者**：取本家庭全部 memberships。
     - 若当前用户是 admin 且家庭内 admin 数量为 1（即唯一管理员），**且家庭还有其他成员** → **抛错**："作为家庭管理员，暂不能直接退出，后续版本将支持转让"。（创建者通常即首个 admin，本策略一并覆盖创建者无主问题。）
  2. **最后一人退出**（家庭只剩当前用户一名成员）→ **删除整个家庭及其全部数据**：遍历删 `plants`（`by_familyId`）、`plantTasks`（`by_familyId`）、`taskCompletionLogs`（`by_familyId_and_completedAt`）、`pushSubscriptions`（`by_familyId`）、所有 `familyMembers`（`by_familyId`），最后删 `families` 记录本身。
  3. **普通成员 / 非唯一管理员退出**（家庭还有其他人且不触发情形 1）→ 删自己的 `familyMembers` 记录；**级联**删自己在本家庭的 `pushSubscriptions`（`by_familyId_and_userId` collect 后逐条删，照搬 `removeMember`）；**保留** `taskCompletionLogs`（养护历史属家庭资产）。
- **依赖**：无（但与 SET3-015 加固相关）
- **产出契约**：`api.families.leaveFamily()`；按 D5 三分支处理；唯一管理员（有其他成员时）被拒。
- **验收**：Convex 编译无 error；普通成员退出后 membership 被删、pushSubscriptions 级联删、taskCompletionLogs 保留；最后一人退出删整个家庭全部数据无残留；唯一管理员（家庭有其他成员）退出被拒并返回明确文案。

> **D5 边界用例（务必覆盖）**：
> - A 创建家庭（admin+创建者），B 加入（member）：A 退出 → 被拒（唯一 admin 且有其他成员）；B 退出 → 放行（普通成员），A 仍是 admin。
> - 单人家庭（仅 A）：A 退出 → 删整个家庭，plants/tasks/logs/subscriptions 全清。
> - "转让管理员/自动提升 admin" 不在本次范围（推迟 v0.4）。

### ⚙️🎨 SET3-005 「退出家庭」破坏性行 + 二次确认
- **文件**：`app/src/features/family/FamilySettingsPage.tsx`（「个人」组新增行）、复用 `ConfirmSheet`
- **功能内容**：「个人」组在「退出登录」之上新增「退出家庭」行；点击打开 `ConfirmSheet variant="danger-solid"` 二次确认；确认调 `leaveFamily`；成功后用户回到 `familyId === null` 状态，下次进应用走 onboarding 加入/创建流程（**不报错崩溃**）。后端返回的"唯一管理员被拒"错误，前端兜底翻译为友好文案并保留在确认 sheet 内或 toast。
- **UI 内容**：破坏性视觉（区别于普通行，参考退出登录的危险态语言）；确认文案点名后果："退出后你将离开『{家庭名}』，养护数据仍归这个家庭所有，需重新邀请才能回来"（PRD §5.2）。token 化。
- **依赖**：SET3-004
- **配合点**：功能挂确认 sheet 与 mutation，UI 出破坏性行与危险确认样式。

### 🧪 SET3-006 退出家庭验证
- 普通成员退出后回 onboarding 可重新加入/创建、不报错；退出级联删 pushSubscriptions、保留 taskCompletionLogs；唯一管理员/创建者退出按 D5 被拒并提示；最后一人退出删整个家庭无脏数据残留。

---

## 4. E3 · 个人头像（P1，大比例复用 storage 链路）

### 🔧 SET3-007 schema 加字段 + 用户级头像接口
- **文件**：`app/convex/lib/validators.ts`（`userFields` 加字段）、`app/convex/users.ts`（新增接口）
- **内容**：
  1. `userFields` 新增 `imageStorageId: v.optional(v.id("_storage"))`（**D6**：不复用 authTables 自带 `image`，统一走 storageId 方案与植物一致）。
  2. `users.ts` 新增**用户级**接口（**仅校验登录，不带 `requireCurrentFamilyMember` 家庭门槛**，因头像是用户级能力，no-family 状态也该能设）：
     - `generateAvatarUploadUrl`（mutation）→ `{ uploadUrl: await ctx.storage.generateUploadUrl() }`
     - `getAvatarUrl`（query，入参 `storageId`）→ `{ imageUrl: await ctx.storage.getUrl(storageId) }`
  3. `updateMyAvatar`（mutation，入参 `imageStorageId: v.union(v.id("_storage"), v.null())`，传 null 表示移除）→ `ctx.db.patch(userId, { imageStorageId, updatedAt })`。（或扩展 `updateMyProfile` 增 `imageStorageId` 可选参数，二选一，推荐独立 mutation 职责清晰。）
  4. `getFamilySettingsSummary` 的成员对象补充 `imageStorageId`（供成员列表渲染真实头像）。
- **依赖**：无
- **验收**：Convex 编译无 error；schema 向后兼容（optional）；三个接口均**不带**家庭门槛；`getFamilySettingsSummary` members[] 含 `imageStorageId`。

### ⚙️🎨 SET3-008 头像上传交互（圆形预览 + HEIC + 三态）
- **文件**：`app/src/features/family/`（新增头像上传组件，如 `AvatarUploadField.tsx`）、设置页「个人」组首项接入
- **功能内容**：「个人」组首项「我的头像」入口；点击触发 file input 选图；复用 `normalizeImageFile`（HEIC→JPEG）；复用 `uploadPlantImage`（**已参数化**，注入 `generateAvatarUploadUrl` / `getAvatarUrl` 回调）拿 `storageId` → 调 `updateMyAvatar` 保存；复用现有"上传中 / 已保存 / 错误"三态反馈，失败保留原头像。
- **UI 内容**：**圆形预览**（区别于植物封面的圆角矩形）；上传中态视觉；token 化。MVP 不做裁剪框/进度百分比（PRD §2.5）。
- **依赖**：SET3-007
- **配合点**：功能打通上传链路，UI 出圆形预览与三态视觉。

### ⚙️🎨 SET3-009 `StorageImage` 参数化 + `MemberAvatar` 改造
- **文件**：`app/src/components/ui/StorageImage.tsx`、`app/src/features/family/MemberAvatar.tsx`
- **功能内容（D1）**：把 `StorageImage` 当前硬编码的 `api.plants.getPlantImageUrl` **参数化**——新增可选 prop（如 `fetchUrl?: (storageId) => Promise<{imageUrl}>`），默认仍走植物查询以不回归现有调用方；头像场景注入 `getAvatarUrl`。避免重复造组件。
- **`MemberAvatar` 改造**：新增可选 `imageStorageId` prop；有值时用参数化后的 `StorageImage`（注入 `getAvatarUrl`）渲染**圆形**真实头像，解码失败/无值回退现有首字母色块（保留同人 hash 取色逻辑作 fallback）。
- **UI 内容**：真实头像圆形裁切，与首字母色块尺寸（36×36）一致，列表布局不抖动。
- **依赖**：SET3-007
- **配合点**：功能让一套 `StorageImage` 通吃植物+头像，UI 保证回退无缝。
- **⚠️ 回归保护**：`StorageImage` 现有所有植物调用方行为不得回归（参数化须有默认值）。

### 🧪 SET3-010 头像验证
- 「个人」组有「我的头像」可上传；iOS HEIC 自动转 JPEG 正常显示；三态明确、失败保留原头像；保存后成员列表中"我"的头像实时更新为真实图；无头像回退首字母色块不报错；`StorageImage` 植物调用方不回归。

---

## 5. E4 · 邀请链接（P1，工程量最大，前端路由是瓶颈）

> **后端零新增**：`joinFamilyByInviteCode` 已完整（normalize、查家庭、校验未重复、校验 `familyId === null` 单一家庭约束）。本 Epic 全部是前端工程。

### ⚙️ SET3-011 路由扩展 `/join/:code`（D2）
- **文件**：`app/src/app/router.tsx`
- **内容（D2）**：`AppPath` 增 `"/join"`；`normalizePath` 新增一条动态段解析 `^\/join\/([^/]+)$` → `{ pathname: "/join", params: { inviteCode: decodeURIComponent(...) } }`（`AppRoute.params` 增 `inviteCode?: string`）。采用 `/join/:code` 路径段（语义清晰、可承载独立邀请落地页），不采用 `?invite=` query 方案。
- **依赖**：无
- **验收**：`/join/QWNAE3` 被正确解析出 `inviteCode`；现有路由白名单与植物动态段不回归；`AppRouter.smoke.test` 通过。

### ⚙️ SET3-012 跨多跳暂存邀请码 + onboarding 自动加入
- **文件**：`app/src/app/RouteGate.tsx` / onboarding 相关组件 / 新增 `app/src/features/family/usePendingInvite.ts`（暂存读写封装）
- **内容**：
  1. **暂存**：未登录用户落在 `/join/:code` → 把邀请码写入 `sessionStorage`（标签页级、关闭即清，键如 `pendingInviteCode`），再走现有 `RouteGate` 重定向到 `/login`。
  2. **跨跳存活**：经历 登录/注册 → 填称呼（`/onboarding/profile`）→ onboarding 多跳，邀请码始终在 sessionStorage。
  3. **自动加入**：到达 onboarding "创建/加入家庭"二选一阶段时，若 sessionStorage 有暂存码 → 自动调 `joinFamilyByInviteCode(code)` → 成功后**清除暂存** → 跳 `/todo`，**跳过手输邀请码与二选一页**。
  4. **已登录分支**：已登录有称呼无家庭点链接 → 直接用码加入 → `/todo`；已登录已有家庭点链接 → **不重复加入**，明确提示（见 SET3-013 落地页，D3）。
- **依赖**：SET3-011
- **验收**：未登录点链接 → 注册 → 填称呼 → 自动加入对应家庭全程不手输码；中途放弃则 sessionStorage 随标签页关闭清除不残留；加入后 membership 仅 1 条（不破坏单一家庭约束）。

### ⚙️🎨 SET3-013 复制邀请链接 + 邀请落地页
- **文件**：`app/src/features/family/InviteCodeCard.tsx`（新增"复制邀请链接"）、新增 `app/src/features/family/JoinLandingPage.tsx`（`/join/:code` 落地页）、`app/src/app/router.tsx` 路由表挂载落地页
- **功能内容**：
  1. **复制链接**：在 `InviteCodeCard` 现有"复制邀请码"旁新增"复制邀请链接"，拼接 `${window.location.origin}/join/${inviteCode}`，沿用现有 clipboard 复制 + 长按兜底逻辑与"已复制"反馈。
  2. **落地页**：`/join/:code` 渲染轻量落地页，引导未登录用户去登录/注册（落地态本身只展示"你被邀请加入家庭"+ 行动按钮，真正加入由 SET3-012 在 onboarding 末端完成）。
  3. **已有家庭兜底（D3）**：已登录且已有家庭的用户访问落地页 → **不重复加入**，展示明确提示（如"你已在『{当前家庭名}』中，每位用户同一时间只能属于一个家庭"），提供返回入口。
  4. **无效/失效码**：码不存在或 `joinFamilyByInviteCode` 抛错时，落地页/onboarding 自动加入失败要有友好兜底文案，不白屏。
- **UI 内容**：落地页与 botanical 基调一致（植物意象、暖绿主色，token 化）；"复制邀请链接"按钮与"复制邀请码"视觉同级；移动端单列、点击区域充足。
- **依赖**：SET3-011、SET3-012
- **配合点**：功能出复制与落地路由，UI 出落地页视觉与"已有家庭"友好提示。

### 🧪 SET3-014 邀请链接验证
- 复制的链接为 `origin/join/{code}` 可点；未登录点链接 → 注册 → 填称呼 → 自动加入对应家庭（不手输码）；已登录无家庭点链接直接加入；已登录已有家庭点链接被拦截并友好提示（D3）；无效码不白屏有兜底；onboarding 多跳后暂存码仍存活；中途放弃不残留。

---

## 6. E5 · 全局加固（顺带，关 §6.1 红线）

### 🔧 SET3-015 `.unique()` → `.first()` 防御加固
- **文件**：`app/convex/lib/auth.ts`（约 line 63，`getCurrentUserContext` 读 `familyMembers` 处）
- **背景**：当前用 `.unique()` 读用户 membership，一旦某用户意外存在 ≥2 条 membership（理论上不该发生，但 ④ 退出/③ 加入引入新写路径后风险上升），`.unique()` 会**直接抛错让该用户彻底无法进应用**（PRD §6.1 红线）。
- **内容**：将 `.unique()` 改为 `.first()`（保留"取一条"的语义，但多条时不崩溃、取第一条降级运行）；可附一行 `console.warn` 便于排查脏数据。**严格保持"逻辑上单一家庭"约束不变**——这是纯防御性加固，不改变业务约束，仅避免边界脏数据导致雪崩。
- **依赖**：无（建议与 E2 同批落地，因 ④ 是新写 membership 的能力）
- **验收**：正常单 membership 用户行为不变；构造 2 条 membership 的脏数据时用户仍能进应用（不崩溃）；类型检查通过。

---

## 7. E6 · 整体验收（SET3-016）

### 🧪 SET3-016 v0.3 整体回归 + smoke
- **范围**：
  - 类型检查：`app` 目录 `tsc --noEmit` 无 error。
  - Convex 编译：四个新/改 mutation/query 全部编译通过。
  - smoke / 单测：`AppRouter.smoke.test` 通过（含新 `/join/:code` 解析）；v0.2 家庭名 `getByText` 断言不被改名功能破坏（SET3-002）。
  - 设计 token：grep 四项新增前端文件无硬编码 `#hex`（PRD §6.2）。
  - **D5 数据一致性**专项手测（见 SET3-004 边界用例表）：唯一管理员拒退、最后一人删整库、普通成员级联删 subscriptions/保留 logs。
  - **回归保护**：`StorageImage` 现有植物调用方不回归（SET3-009）。
- **依赖**：SET3-001 ~ SET3-015 全部完成。

---

## 8. 依赖拓扑

```
第一批 P0（E1 + E2 + E5）
  SET3-001(BE renameFamily) ──▶ SET3-002(FE/UI 改名行) ──▶ SET3-003(QA)
  SET3-004(BE leaveFamily+D5) ─▶ SET3-005(FE/UI 退出行) ─▶ SET3-006(QA)
  SET3-015(.unique→.first 加固) ─(随 E2 一起)

第二批 P1（E3 + E4）
  SET3-007(BE schema+用户级接口)
        ├─▶ SET3-008(FE/UI 上传交互) ─┐
        └─▶ SET3-009(StorageImage参数化+MemberAvatar) ─┴─▶ SET3-010(QA)
  SET3-011(路由 /join/:code)
        └─▶ SET3-012(暂存+自动加入)
                └─▶ SET3-013(复制链接+落地页) ──▶ SET3-014(QA)

收口
  全部 ──▶ SET3-016(整体回归 + smoke + D5 专项)
```

**关键路径**：E4 链路最长（SET3-011→012→013→014），且 E2 是 E4"误入→退出→重新加入链接"完整闭环的前置，故 P0 先行、P1 次之的节奏与 PRD §9 一致。

---

## 9. 与 v0.2 的衔接

- task_id 采用 `SET3-NNN`，延续 v0.2 `SET2-NNN` 的命名族；二者同属设置页演进，但拆为独立 module（`settings-page-v0.3.json`）便于 Agent 增量执行。
- 复用 v0.2 已落地的 `NicknameEditSheet` / `ConfirmSheet` / `InputField` / `MemberAvatar` / `InviteCodeCard` / `StorageImage` 等组件作为范本与基座，最大化减少新增面、降低回归风险。