# 图标系统改造方案 · Emoji → 规范 Icon

> 文档类型：项目级设计决策（Design Decision Record）
> 关联文档：`docs/DESIGN.md`、`app/src/styles/tokens.css`
> 设计语言基线：Organic Biophilic（Lora 标题 + Raleway 正文 + botanical 绿调）
> 状态：方案待评审 / 待实施
> 创建日期：2026-06-15

---

## 1. 背景与问题

当前系统存在 **两套并存、未统一收口的图标体系**：

1. **Emoji 体系**（约 30+ 处）：底部导航、任务类型、卡片头部、空状态、操作反馈等大量使用 `🪴 💧 ✂️ ⚙️ 🌿` 等表情符号。
2. **手写内联 SVG 体系**（少量）：`DetailNavBar.tsx` 已用 `stroke="currentColor"` 的线性 SVG 实现「返回箭头」和「三点更多操作」，风格已接近 Lucide。

两套体系并存导致视觉语言割裂。本方案的目标是 **确立一套规范图标库作为单一图标来源（Single Source of Truth），并制定分级迁移策略**，而非"一刀切全删 emoji"。

### 1.1 Emoji 的三个硬伤（结合本系统实证）

| 问题 | 本系统实证 | 影响 |
| --- | --- | --- |
| **颜色不可控** | `BottomNav` 激活态 `color: var(--color-paper)`（米白），文字变白但 emoji 仍是平台彩色，无法跟随主题 | 激活态视觉割裂，最明显的 bug |
| **跨平台渲染不一致** | macOS 是 Apple 饱和拟物风，Windows/Android 完全不同 | PWA 多端体验不统一 |
| **风格与设计语言冲突** | 极简 botanical 绿调 vs 高饱和 emoji，"出戏" | 削弱"refined/精致"的品牌调性 |

### 1.2 设计技能的指导原则（frontend-design）

> "Refined minimalism needs restraint, precision, and careful attention to spacing, typography, and subtle details. Use CSS variables for consistency. Elegance comes from executing the vision well."

结论：本系统属于 **refined minimalism**，图标应当 **克制、单色、线性、跟随 token 主题色**，emoji 的"饱和拟物"与该方向背道而驰。

---

## 2. 图标库选型

### 2.1 候选对比

| 图标库 | 风格 | 与本项目契合度 | 体积 | 备注 |
| --- | --- | --- | --- | --- |
| **Lucide** ⭐ 推荐 | 线性、克制、`stroke` 跟随 `currentColor` | ★★★★★ | Tree-shaking 按需打包，单图标 ~1KB | 与现有 `DetailNavBar` 手写 SVG 风格一致（24×24 网格 / stroke 2） |
| Phosphor | 线性，可选多种粗细 | ★★★★ | 略大 | 选择多但风格略"工程感" |
| Heroicons | 线性 + 实心两套 | ★★★★ | 中 | Tailwind 生态，无 Tailwind 时性价比一般 |
| Tabler | 线性，数量最多 | ★★★ | 中 | 风格偏中性，botanical 调性稍弱 |

### 2.2 最终选型：**Lucide（lucide-react）**

选定理由：

1. **风格无缝衔接现状**：现有 `DetailNavBar.tsx` 手写 SVG 已是 `viewBox="0 0 24 24"` + `strokeWidth="2"` + `stroke="currentColor"`，与 Lucide 设计规范完全一致，迁移后零割裂。
2. **完美适配 token 体系**：所有图标默认 `stroke: currentColor`，直接继承父元素 `color`，无缝接入 `--color-leaf` / `--color-paper` / `--color-task-*`，彻底解决"颜色不可控"硬伤。
3. **线性克制美学**：符合 Organic Biophilic 的"安静、自然、轻仪式感"。
4. **React 19 兼容 + 按需打包**：`import { Droplet } from "lucide-react"` 仅打包用到的图标，对 PWA 体积友好。
5. **植物语义齐全**：`Sprout`/`Leaf`/`Droplet`/`Scissors`/`FlowerPot` 等覆盖养护场景。

> 安装：`cd app && npm install lucide-react`

---

## 3. 三级分类迁移策略

按"交互频率 × 是否需要响应主题色"对全部 emoji 分级处理。**核心原则：交互/变色的换 icon，装饰/情感化的留 emoji。**

```
A 级（必换）── 功能性图标：频繁交互、需响应激活态/主题色
B 级（建议换）── 信息标识：辅助识别，换成单色线性 icon 提升统一度
C 级（保留）── 装饰/情感化：营造品牌温度，emoji 反而更亲和
```

### 3.1 A 级 · 必换为规范 Icon（功能性）

| 文件 | 当前 emoji | 语义 | → Lucide 图标 | 颜色绑定 |
| --- | --- | --- | --- | --- |
| `components/navigation/BottomNav.tsx` | `🗓️` | 待办 | `CalendarCheck` 或 `ListTodo` | `currentColor`（激活态自动转 `--color-paper`）|
| `components/navigation/BottomNav.tsx` | `🪴` | 植物 | `Sprout` | 同上 |
| `components/navigation/BottomNav.tsx` | `⚙️` | 设置 | `Settings` | 同上 |
| `features/tasks/CompleteTaskButton.tsx` | `✓` / `…` | 完成 / 进行中 | `Check` / `Loader2`(spin) | `currentColor` |
| `features/tasks/ActionableTaskRow.tsx` | `✓` / `…` | 完成 / 进行中 | `Check` / `Loader2` | `currentColor` |
| `features/plants/PlantCard.tsx` | `✏️` | 编辑入口 | `Pencil` | `--color-muted` |
| `features/family/FamilyHeroCard.tsx` | `✎` | 重命名 | `Pencil` | `--color-leaf` |
| `features/plants/PlantArchiveSection.tsx` | `📝` | 植物档案 | `NotebookPen` 或 `FileText` | `--color-muted` |
| `features/family/InviteCodeCard.tsx` | `🔗` | 复制链接 | `Link2` 或 `Share2` | `currentColor` |
| `features/notifications/NotificationPromptCard.tsx` | `🔔` | 通知 | `Bell` | `--color-leaf` |

> `DetailNavBar.tsx` 的返回箭头(`ChevronLeft`)和三点菜单(`MoreVertical`)已是手写 SVG，**建议一并替换为 Lucide 同名图标**，删除内联 SVG，统一来源。

### 3.2 B 级 · 建议换为单色线性 Icon（信息标识）

**任务类型图标**是本系统图标最核心、出现频率最高的一组，分散在多个文件，**当前存在两套不一致的 emoji 映射，必须统一**：

| 任务类型 | `TaskTypeBadge.tsx` | `PlantCard.tsx` | 不一致问题 | → 统一 Lucide 图标 | token 色 |
| --- | --- | --- | --- | --- | --- |
| watering 浇水 | `💧` | `💧` | 一致 | `Droplet` | `--color-task-watering` |
| fertilizing 施肥 | `🌱` | `🧪` | **冲突** | `Sprout` | `--color-task-fertilizing` |
| misting 喷雾 | `💨` | `🌫️` | **冲突** | `CloudDrizzle` 或 `SprayCan` | `--color-task-misting` |
| repotting 换盆 | `🪴` | `🪴` | 一致 | `Shovel` 或 `FlowerPot` | `--color-task-repotting` |
| pruning 修剪 | `✂️` | `✂️` | 一致 | `Scissors` | `--color-task-pruning` |
| custom 自定义 | `🏷️` | `📋` | **冲突** | `Tag` | `--color-task-custom` |

> ⚠️ 当前 `fertilizing/misting/custom` 三类在两个文件里 emoji 不一致（如施肥一处 🌱 一处 🧪），这是 **既有数据可视化 bug**。迁移时应抽取为 **唯一映射表**（建议放在 `TaskTypeBadge.tsx` 或新建 `taskTypeIcon.ts`），所有调用方共用，根除不一致。

涉及调用方（需统一引用同一映射）：
`TaskTypeBadge.tsx`、`PlantCard.tsx`、`PlantDetailPage.tsx`、`CompleteTaskButton.tsx`（celebrate）

**卡片头部装饰图标**（`SettingCardHeader` 的 chip）：

| 文件 | emoji | → Lucide | 说明 |
| --- | --- | --- | --- |
| `FamilySettingsPage.tsx` | `🙂` 个人 | `User` / `UserCircle` | 章节标识，单色更统一 |
| `FamilySettingsPage.tsx` | `✉️` 邮箱 | `Mail` | |
| `FamilySettingsPage.tsx` | `👥` 成员 | `Users` | |
| `InviteCodeCard.tsx` | `🔑` 邀请码 | `KeyRound` | |
| `AboutCard.tsx` | `ℹ️` 关于 | `Info` | |

> 卡片头部 chip 属于 A/B 之间的灰色地带。鉴于它们成组出现、追求统一感，**建议归入 B 级一并换为单色线性 icon**，配 `--color-leaf` 描边或 `--color-mist` 底色 chip，比彩色 emoji 更精致。

### 3.3 C 级 · 保留 Emoji（装饰 / 情感化）

这些是营造亲和感、品牌温度的"插画式点缀"，**emoji 比冷冰冰的 icon 更合适，保留**：

| 文件 | emoji | 场景 | 保留理由 |
| --- | --- | --- | --- |
| `features/auth/AuthPage.tsx` | `🌿` | 登录页大图标 | 品牌情感锚点 |
| `features/family/JoinLandingPage.tsx` | `🌿` | 落地页大图标 | 同上 |
| `features/tasks/TodoGreetingCard.tsx` | `🌿🍃` | 问候卡 / 全部完成 | 温度感、仪式感 |
| `features/tasks/TodoPage.tsx` | `🌿` | "今天无需养护"空状态 | 治愈系空态 |
| `features/family/FamilyHeroCard.tsx` | `🌿` | 卡片右上角半透明装饰 | 纯装饰水印 |
| `features/plants/PlantImage.tsx` | `🌿` | 图片加载占位/兜底 | 占位插画 |
| `features/plants/PlantHeroCard.tsx` | `🪴` | 详情页占位 | 占位插画 |
| `features/family/MemberAvatar.tsx` | `👤` | 无名成员头像兜底 | 头像占位语义 |
| `components/ui/ConfirmSheet.tsx` | （视情况） | 弹窗情感图标 | 按实际评估 |

> C 级的判断标准：**它是"插画/水印/情感表达"而非"功能按钮或信息标签"**。若未来要做暗色模式或更强品牌一致性，可二期再评估把 C 级也插画化（SVG 自绘），但当前阶段保留 emoji 完全 OK。

---

## 4. 技术落地规范

### 4.1 统一封装 Icon 组件（强制）

**禁止**在业务组件里散落 `import { X } from "lucide-react"`。统一封装一个 `Icon` 适配层，集中管理尺寸、描边、色彩 token，便于未来换库。

新建 `app/src/components/ui/Icon.tsx`：

```tsx
import type { LucideIcon } from "lucide-react";
import type { CSSProperties } from "react";

interface IconProps {
  /** Lucide 图标组件，如 Droplet */
  glyph: LucideIcon;
  /** 像素尺寸，默认 20（与现有 SVG 一致） */
  size?: number;
  /** 描边粗细，默认 2（Lucide 规范 / 现有 DetailNavBar 一致） */
  strokeWidth?: number;
  /** 颜色 token 变量名，如 "--color-leaf"；默认 currentColor */
  colorVar?: string;
  /** 无障碍标签；省略则视为装饰图标 aria-hidden */
  label?: string;
  style?: CSSProperties;
}

export function Icon({
  glyph: Glyph,
  size = 20,
  strokeWidth = 2,
  colorVar,
  label,
  style,
}: IconProps) {
  return (
    <Glyph
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
      size={size}
      strokeWidth={strokeWidth}
      style={{ color: colorVar ? `var(${colorVar})` : undefined, ...style }}
    />
  );
}
```

### 4.2 色彩纪律（沿用 DESIGN.md 约束）

- 图标颜色 **一律走 token**：`currentColor`（继承父级）或 `var(--color-*)`。
- **禁止行内 `#hex`**（与 `tokens.css` 红线一致）。
- 任务类型图标必须配对 `--color-task-*`，保持"图标 + 类型色"双编码可读性。

### 4.3 尺寸与无障碍规范

| 场景 | size | strokeWidth | 无障碍 |
| --- | --- | --- | --- |
| 底部导航 | 20 | 2 | 装饰，`aria-hidden`（文字 label 已表义）|
| 操作按钮 | 18–20 | 2 | 按钮有 `aria-label` 时图标 `aria-hidden` |
| 任务类型徽章 | 12–14 | 2.25 | `aria-hidden`（旁有文字）|
| 卡片头部 chip | 18 | 2 | `aria-hidden` |
| 导航返回/关闭 | 20 | 2 | 按钮 `aria-label="返回"`，图标 `aria-hidden` |

> 迁移收益之一：emoji 被屏幕阅读器念为"水滴""剪刀"造成语义冗余，换 icon + 受控 `aria-label` 后无障碍更干净。

---

## 5. 分阶段实施计划

按"问题最明显 / 改动最小 / 收益最直观"排序，**小步快跑、每步可验证、每步独立提交**：

| 阶段 | 范围 | 文件数 | 验证重点 | 优先级 |
| --- | --- | --- | --- | --- |
| **P0 试点** | 安装 lucide-react + 封装 `Icon.tsx` + 迁移 `BottomNav` | 2 | 激活态颜色跟随 `--color-paper` 正确；3 个 tab 图标线性统一 | 🔴 最高 |
| **P1 任务类型统一** | 抽取唯一 `taskTypeIcon` 映射，替换 `TaskTypeBadge` + `PlantCard` + `PlantDetailPage` + `CompleteTaskButton`，根除三处不一致 bug | 4 | 6 类任务图标全端一致；类型色双编码保留 | 🔴 高 |
| **P2 操作图标** | 编辑/完成/链接/通知/档案等 A 级散点 | ~6 | 按钮交互态正常；`aria-label` 完整 | 🟡 中 |
| **P3 卡片头部** | `SettingCardHeader` 系列 chip（个人/邮箱/成员/邀请码/关于）| ~4 | 章节标识统一为单色线性 | 🟡 中 |
| **P4 导航 SVG 收口** | `DetailNavBar` 手写 SVG → Lucide，删内联 SVG | 1 | 返回/更多操作视觉无变化、来源统一 | 🟢 低 |
| **（不做）** | C 级装饰 emoji 全部保留 | — | — | — |

### 每阶段验证三连（沿用项目既有流程）

```bash
cd app
npm run typecheck                                   # tsc -b 0 err
npx vitest run src/test/AppRouter.smoke.test.tsx    # 导航/任务相关 smoke
npx vitest run                                       # 全量回归 91 tests
```

> ⚠️ smoke 测试中若有按 emoji 文本断言的用例（如某些 `getByText`），迁移后需同步改为按 `aria-label` 或 role 断言。P0/P1 实施前需先 grep 测试文件确认。

---

## 6. 风险与权衡

| 风险 | 说明 | 缓解 |
| --- | --- | --- |
| 引入新依赖 | lucide-react 增加约几 KB（按需打包） | Tree-shaking 仅打包用到的图标，PWA 影响可忽略 |
| 测试断言失效 | 部分 smoke 可能按 emoji 文本断言 | 实施前 grep 测试文件，改为 `aria-label`/role 断言 |
| 情感温度流失 | 全换 icon 会变"冷" | C 级装饰 emoji 全部保留，温度感不丢 |
| 一次性大改动 | 30+ 文件易出错 | 严格分 P0–P4 小步提交，每步独立验证 |

---

## 7. 决策摘要（TL;DR）

1. **选型**：采用 **Lucide（lucide-react）**——与现有手写 SVG 风格一致、`currentColor` 完美适配 token、线性克制契合 Organic Biophilic。
2. **策略**：**三级分类**——A 级功能图标必换、B 级信息标识建议换、C 级装饰 emoji 保留。
3. **核心收益**：解决底部导航激活态变色 bug、根除任务类型图标三处不一致、统一两套并存图标体系、提升无障碍质量。
4. **落地**：统一封装 `Icon.tsx` 适配层，色彩走 token，按 P0→P4 小步实施，每步验证三连 + 独立提交。
5. **下一步**：建议从 **P0（BottomNav 试点）** 开始，验证视觉效果后再推进 P1 任务类型统一。

---

## 8. 迁移验收小结（ICON-009 · 2026-06-15）

icon-system-v0.4 模块 9 个任务（ICON-001 ~ ICON-009）全部完成。本节为模块收尾的整体回归验收记录，证明迁移完整、无回归、纪律达标。

### 8.1 自动化验证三件套

| 验证项 | 命令 | 结果 |
| --- | --- | --- |
| 类型检查 | `npm run typecheck`（tsc -b，走 project references 真实编译 src） | 0 错误 |
| 单元/集成测试 | `npm run test`（vitest run） | 22 files / 135 tests 全绿 |
| 后端函数编译 | `npx convex dev --once --typecheck enable` | 函数编译部署成功，0 错误 |
| 生产构建 | `npm run build`（tsc -b && vite build） | 1732 模块转换成功 |

相比迁移前基线（15 files / 97 tests），本模块共净增 38 个测试（Icon 壳 6、BottomNav 4、taskTypes 5、TaskTypeBadge 3、FamilyHeroCard 3、PlanSection 2、DetailNavBar 3、no-functional-emoji 守护 18 含 it.each 15 例 等），全部固化「不准回退到 emoji」纪律。

### 8.2 emoji 清理与 token 纪律

- **B 级收口**：全仓库 `grep taskTypeEmoji` **0 命中**——任务类型图标只剩 `taskTypes.ts` 的 `taskTypeIcon` 单一权威源，fertilizing/misting/custom 三处历史不一致彻底消除。
- **A/B 级落点 emoji 已清**：本模块迁移的 13 个落点源文件（BottomNav / taskTypes / TaskTypeBadge / PlantCard / PlantDetailPage / CompleteTaskButton / ActionableTaskRow / FamilyHeroCard / PlantArchiveSection / NotificationPromptCard / PlanSection / ActionableTaskSection / DetailNavBar）均无功能性 emoji 残留（`no-functional-emoji.test.ts` 守护，故意回灌时变红已实操验证）。
- **C 级装饰保留**：🌿🍃🌱 在空状态插画、Hero 装饰、完成情感反馈（celebrateEmoji、toast 前缀）处全部按策略保留，与功能图标边界精确。
- **非本模块范围 emoji**：SettingCardHeader chip（🔑🙂✉️👥ℹ️）、PlantHeroCard 无图占位 🪴 等不在 icon-system-v0.4 任务范围，按外科手术原则未动。
- **token 纪律**：`.tsx` 全仓库 `grep` **无 `#hex` 字面色**；图标颜色一律 currentColor 继承或经 `colorVar` 注入 `var(--color-*)`，Icon 壳层强制禁字面色。本次迁移未新增 token。

### 8.3 核心收益验证

- **导航 active 态变色 bug 修复**：BottomNav 三图标改为 Lucide（CalendarCheck / Sprout / Settings）经 stroke=currentColor 渲染，active 态随父级 `color:var(--color-paper)` 自动转白——`BottomNav.test.tsx` 断言 active===paper / inactive===muted，反向验证若回灌 emoji 则红。
- **任务类型六图标三页面一致**：待办 / 列表 / 详情统一消费 `getTaskTypeIcon`，着色经 `--color-task-*`。
- **DetailNavBar 手写 SVG 收口**：返回（ChevronLeft）/ 更多（EllipsisVertical）由手写 path 收口到 Lucide 统一来源，外观与 a11y 不回归。

### 8.4 性能与无障碍

- **tree-shaking 生效**：全部 lucide-react import 为**具名按需引入**（无 `import * as` 整包导入），仅约 16 个实际使用图标被打入。主 bundle `index-*.js` 426 KB（gzip 122 KB），未发生整包膨胀（lucide 全量库 minify 后约数 MB）。
- **reduced-motion**：本模块唯一新增动效 `.complete-spin`（pending 旋转）由 `tokens.css` 全局 `@media (prefers-reduced-motion: reduce)` 压制为 `0.01ms` 单次，等效静止，无异常。
- **a11y 契约**：`Icon.tsx` 壳层 `label` 有值→`role="img"+aria-label`、无值→`aria-hidden`；业务图标默认不传 label 自动 aria-hidden，不污染可访问名——AppRouter smoke 的 heading / button name 断言全程 40/40 未回归。

### 8.5 结论

迁移完整、无回归、纪律达标，icon-system-v0.4 模块（ICON-001 ~ ICON-009）验收通过，可结项。
