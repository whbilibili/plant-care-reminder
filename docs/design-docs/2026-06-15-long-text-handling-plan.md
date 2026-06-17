# 超长字符串处理方案 · 植物 & 任务文本字段

> 日期：2026-06-15　|　范围：植物名称、摆放位置、简介、养护备注、自定义任务名称
> 性质：缺陷治理 + 一致性补齐（同类字段如家庭名/昵称/邀请码已有约束，本方案为遗漏字段补齐）

## 1. 背景与问题定性

用户在多个页面输入超长字符串后，UI 出现撑爆、横向溢出、卡片无限拉宽/拉高等异常。逐场景复现见第 2 节截图清单。

根因不是单纯样式 bug，而是**「输入端无上限 + 后端无校验 + 展示端截断不到位」的三重缺口**。

各字段现状盘点：

| 字段 | 前端 maxLength | 前端长度校验 | 后端 schema | 后端 mutation 长度校验 | 展示截断 |
|------|:---:|:---:|:---:|:---:|:---:|
| 植物名称 name | 无 | 仅非空 | `v.string()` | 无（连非空都缺） | 部分位置假截断/无防护 |
| 摆放位置 location | 无 | 无 | `v.optional` | 无 | 列表卡单行省略已具备 |
| 简介 description | 无 | 无 | `v.optional` | 无 | 卡片若平铺则无防护 |
| 养护备注 note | 无 | 无 | `v.optional` | 无 | — |
| 自定义任务名 customTaskName | 无 | 仅非空 | `v.optional` | 有 trim+非空，无长度 | 多处完全无防护 |

对照参照：项目中 `families`(60)、`nickname`(40)、`inviteCode`(12) 等字段**前后端都已有长度约束**，本方案是把同一套纪律补到被遗漏的字段上。

## 2. 异常场景清单（截图对应）

| # | 场景 | 字段 | 现象 | 截断根因 |
|---|------|------|------|---------|
| 1 | 植物列表卡片 | 植物名称 | 名称撑爆卡片 | `nameRowStyle` 缺 `minWidth:0`，ellipsis 失效（假截断） |
| 2 | 养护计划列表行 | 任务名称 | 行内挤压、布局变形 | label 与 `intervalStyle flex:1` 收缩竞争，偏脆弱 |
| 3 | 任务编辑页标题 | 植物名+任务名 | 大字号标题横向撑爆 | `PageHeader` 无 `word-break`，超长连续串溢出 |
| 4 | 任务编辑页删除区 | 任务名嵌正文 | 文案溢出气泡/弹窗 | `DeleteTaskAction` 文案无 `word-break` |
| 5 | 植物列表卡片 | 摆放位置/简介 | 次要文本横向铺满撑宽卡片 | 次要字段无输入上限；简介若平铺无 line-clamp |

## 3. 设计原则

遵循四条原则确定三层防御：

- **防错优于纠错**：源头用 `maxLength` 不让用户输入超长内容，体验优于事后截断。
- **即时反馈**：接近上限给字数提示，把硬截断的突兀感转为可预期反馈。
- **防御式编程**：前端可被绕过（API 直调、旧端、并发），后端必须二次校验。
- **优雅降级**：存量超长数据展示时也不能撑爆布局，按场景区分单行省略 / 多行 clamp。

## 4. 长度上限取值

按 JS `String.length`（UTF-16 码元，中文 1 字符=1，与 `<input maxLength>` 行为一致）计：

| 字段 | 上限 | 理由 |
|------|:---:|------|
| 植物名称 | **30** | 略短于昵称(40)；正常叫法 ≤10 字，30 已极宽松 |
| 摆放位置 | **30** | 「客厅置物架」类，30 足够 |
| 简介 description | **200** | 多行描述，200 字覆盖长尾 |
| 养护备注 note | **200** | 同上 |
| 自定义任务名 | **20** | 养护动作 ≤8 字，20 覆盖长尾 |

> 如需精确字素计数可改用 `Array.from(str).length`，但本场景 `.length` 已足够。建议抽成常量集中管理（`lib/constants.ts`）。

## 5. 三层防御落地清单

### 第一层 · 输入端（前端表单）

抽常量：`PLANT_NAME_MAX_LENGTH=30`、`PLANT_LOCATION_MAX_LENGTH=30`、`PLANT_DESCRIPTION_MAX_LENGTH=200`、`PLANT_NOTE_MAX_LENGTH=200`、`CUSTOM_TASK_NAME_MAX_LENGTH=20`。

| 控件 | 文件 · 位置 | 动作 |
|------|------|------|
| 植物名称 InputField | `PlantForm.tsx` 第 29-38 行 | 加 `maxLength` |
| 摆放位置 InputField | `PlantForm.tsx` 第 57-65 行 | 加 `maxLength` |
| 简介 TextArea | `PlantForm.tsx` 第 39-47 行 | 加 `maxLength` + 字数计数 |
| 养护备注 TextArea | `PlantForm.tsx` 第 48-56 行 | 加 `maxLength` + 字数计数 |
| 自定义任务名 InputField | `TaskForm.tsx` 第 83-91 行 | 加 `maxLength` |

可选增强：`InputField`/`TextAreaField` 在 hint 区右侧显示 `12/30`，接近上限变橙色。

### 第二层 · 前端校验逻辑

- `plantSchema.ts` `validatePlantEditorValues`：非空后追加长度校验，超限提示「植物名称不能超过 30 个字符」（位置/简介/备注同理）。
- `taskTypes.ts` `validateCustomTaskName`：非空后追加长度校验，提示「任务名称不能超过 20 个字符」。

### 第三层 · 后端兜底（Convex）

- `convex/lib/validators.ts`：新增 `assertMaxLength(value, max, fieldName)`，与 `families.renameFamily` 后端二次校验同模式。
- `convex/plants.ts` `createPlant`/`updatePlant`：对 name 补 `trim`+非空+长度校验（顺带补当前缺失的非空校验）；location/description/note 补长度校验。
- `convex/tasks.ts` `createPlantTask`/`updatePlantTask`：`customTaskName` 复用增强后的 `validateCustomTaskName`，长度校验自动生效。

### 第四层 · 展示端截断（按场景）

| 展示位 | 策略 | 改动 |
|--------|------|------|
| PlantCard 名称（截图1） | 单行省略 | `nameRowStyle` 补 `minWidth:0`，既有 ellipsis 生效 |
| PlantCard 位置（截图5） | 单行省略 | 确认 location 单行省略在所有分支生效（现状已具备） |
| PlantCard 简介（截图5） | 不平铺 / clamp(2) | 概览卡片不应平铺整段简介；若需露出则限 1-2 行 `WebkitLineClamp` |
| PageHeader 标题（截图3） | 允许换行不溢出 | 加 `overflowWrap:break-word` + `wordBreak:break-word`，可选 2 行 clamp |
| DeleteTaskAction 文案（截图4） | 允许换行 | `bodyStyle`/`dialogTitleStyle` 加 `overflowWrap/wordBreak:break-word` |
| PlanTaskRow（截图2） | 加固单行省略 | label 明确 `flex:1`，interval 补 `minWidth:0` |
| TaskListItem / DueTaskCard / UpcomingDueCard | 2 行 clamp | 任务名 `WebkitLineClamp:2`；植物名单行省略 |

抽公共截断工具（`lib/textTruncate.ts` 或 `tokens.css`）：`truncateSingleLine` 与 `clampLines(n)`，统一全列表卡片引用，消除当前 8+ 处复制粘贴及部分缺 `whiteSpace:nowrap` 的不一致。

## 6. 执行批次

| 批次 | 内容 | 目标 | 风险 |
|------|------|------|------|
| 第一批·止血 | 第四层中的 PlantCard `minWidth:0`、PageHeader/DeleteTaskAction `word-break`、PlantCard 简介处理 | 立刻消除截图 1/3/4/5 视觉撑爆 | 低 |
| 第二批·治本 | 第一层 maxLength（全 5+ 字段）+ 第二层前端长度校验 | 源头杜绝新增超长数据 | 低 |
| 第三批·加固 | 第三层后端校验 + 卡片类 line-clamp + 抽公共截断工具 + PlanTaskRow flex 加固 | 防御纵深 + 代码一致性 | 中 |

每批完成后跑验证三件套：`npm run typecheck` / `npm run test` / `npx convex dev --once --typecheck enable`，第一批额外 `npm run build` 目视确认布局。

## 7. 验收标准

- 任意字段灌入 500+ 字符，所有页面（列表/详情/编辑/待办/删除确认/页头标题）均无横向溢出、无卡片异常撑宽撑高。
- 前端输入达上限即无法继续输入，并有可见反馈。
- 绕过前端直调 mutation 提交超长数据被后端 reject。
- 存量超长数据在各展示位优雅截断（单行省略或多行 clamp），关键信息（名称）始终可读。

## 8. 验收小结（TEXT-007 · 2026-06-15 模块结项）

`long-text-hardening-v0.5` 七个任务（TEXT-001 ~ TEXT-007）全部完成，四层防御落地闭环。

### 第三批·加固②（TEXT-007）交付内容

- **公共截断工具**：新建 `app/src/lib/textTruncate.ts`，导出 `truncateSingleLine`（单行省略三件套 + minWidth:0 兜底）与 `clampLines(n)`（WebkitLineClamp(n) + break-word）。收口此前散落在各列表卡片的复制粘贴写法，统一全仓库截断样式来源。配套 `textTruncate.test.ts` 3 用例守护。
- **列表卡 clamp**：`TaskListItem`（任务名 clamp(2)）、`DueTaskCard`（植物名单行省略 + 任务名 clamp(2)）、`UpcomingDueCard`（植物名单行省略 + 任务名 clamp(2)）统一引用公共工具，contentStyle 既有 minWidth:0 满足单行省略父级要求。
- **PlanTaskRow 加固（截图2）**：label 由「无 flex 增长权、与 interval(flex:1) 竞争收缩」修正为 `flex:1` 成为主收缩列并经 `truncateSingleLine` 单行省略；interval 去掉 `flex:1` 改 `flexShrink:0 + minWidth:0`，不再抢占主空间。彻底解决长任务名在计划行被挤压的脆弱单行省略问题。

### 四层防御全景（模块完成态）

- 第一层·输入端 maxLength（TEXT-004）：五字段 `<input maxLength>` 源头限制 + 简介/备注字数计数。
- 第二层·前端长度校验（TEXT-005）：`validatePlantEditorValues` / `validateCustomTaskName` 拦截粘贴/IME 绕过。
- 第三层·后端 Convex 兜底（TEXT-006）：`assertMaxLength` + `assertPlantTextWithinLimits`，防 API 直调绕过。
- 第四层·展示端截断（TEXT-001/002/003/007）：PlantCard minWidth:0 假截断修复、PageHeader/DeleteTaskAction break-word、列表卡 clamp、PlanTaskRow flex 加固，统一走 `textTruncate.ts`。

### 验证（四件套全绿）

- `npm run typecheck`（tsc -b）：0 错误。
- `npx vitest run`：25 files / 159 tests 全绿（较 TEXT-006 +1 文件 +3 用例，即 textTruncate.test.ts）。
- `npx convex dev --once --typecheck enable`：函数编译部署成功。
- `npm run build`（tsc -b && vite build）：构建成功，主 bundle 427KB(gzip 122KB)。

### 走查替代说明

当前环境无 GUI，§7 验收标准的「灌入 500+ 字符走查列表/详情/编辑/待办/删除确认/页头六处无溢出」以代码 + 构建 + 测试证据核对替代：单行省略由 `truncateSingleLine` 统一保证（配父级 minWidth:0），多行 clamp 由 `clampLines(2)` 保证，超长连续串横向溢出由 clamp 内 break-word 兜住；PlanTaskRow flex 分配修正经源码核对确认 label 主收缩、interval 不抢占。
