# 植物详情页 UI 设计规格（迭代 v0.2）

**版本**：v0.2（UI 设计规格）
**日期**：2026-06-11
**角色**：UI 设计师
**关联文档**：
- 产品决策依据：[2026-06-11-plant-detail-iteration-spec.md](./2026-06-11-plant-detail-iteration-spec.md)（PRD，已拍板 8 条决策）
- 视觉体系来源：`app/src/styles/tokens.css`（botanical design token）+ `docs/design-docs/2026-06-09-ui-ux-visual-spec.md`
- 同系列参考：[2026-06-11-plant-list-ui-spec.md](./2026-06-11-plant-list-ui-spec.md)（列表页 UI 规格）、[2026-06-10-todo-page-ui-spec.md](./2026-06-10-todo-page-ui-spec.md)（待办页 UI 规格）

**文档定位**：本文档承接 PRD 的产品决策，从 UI 设计师视角给出植物详情页的**布局结构、各区域视觉规格、色彩应用、状态处理、动效细节与交互反馈**。方向级设计——给出原则、结构与精确规格，落地时引用 token 变量，不硬编码色值。

---

## 0. 设计基调

植物详情页是**高频操作页**，UI 必须服务 PRD 的三个核心价值：**养护面板**、**一步完成**、**计划总览**。

由此确立本页的视觉性格：**「一株植物的养护工作台」**——不是植物百科的资料卡（信息堆砌），不是待办页的任务流水线（批量执行），而是像园艺师面前摊开的一张单株养护记录：顶部一眼认出是哪盆（紧凑识别），中间是「现在该做什么」的操作台面（高亮行动区），下方是「接下来的安排」的日历备忘（计划总览），最底下是翻开才看的植物档案。

三条 UI 设计原则：

1. **操作区前置，资料区后退**：首屏必须看到可操作的任务，植物描述/备注折叠到最后。
2. **紧急感由色彩梯度传达**：逾期暖橙 → 今天深绿 → 未来灰色，三级色彩梯度让用户不读文字也知道轻重缓急。
3. **完成是奖赏时刻**：每次完成都有微动效 + 震动 + 告知下次时间，把「打勾」变成小确幸而非机械操作。

---

## 1. 整体布局结构

详情页自上而下分五层，垂直堆叠，移动端单列：

```
┌─────────────────────────────────────┐
│  ① 顶部导航栏 (Nav Bar)              │  ← 返回 + 植物名 + 溢出菜单
├─────────────────────────────────────┤
│  ② 紧凑 Hero 区 (Compact Hero)       │  ← 缩略图 + 名称 + 状态摘要
├─────────────────────────────────────┤
│  ③ 需要处理区 (Action Zone)           │  ← 到期/逾期任务，高亮可操作
│     · 紧凑任务行 · 紧凑任务行 …       │
├─────────────────────────────────────┤
│  ④ 养护计划区 (Plan Overview)         │  ← 全部任务的下次时间
│     · 信息任务行 · 信息任务行 …       │
├─────────────────────────────────────┤
│  ⑤ 植物档案区 (Plant Archive)         │  ← 可折叠，描述/备注/时间
│     ▶ 植物档案                        │
└─────────────────────────────────────┘
                              [ + 添加养护 ]  ← 右下角悬浮 FAB
```

布局要点：

- **导航栏固定在顶部**（`position: sticky`），内容区域在其下方滚动。
- **Hero 区与需要处理区之间用 `--space-md`（16px）间距**，不用分割线——两者是「识别→操作」的连续流。
- **需要处理区与养护计划区之间用 `--space-lg`（24px）间距**，视觉上明确区分「紧急操作」与「日常计划」。
- **养护计划区与植物档案区之间用 `--space-lg`（24px）+ 1px `--color-line` 分割线**，标记从「任务域」到「资料域」的切换。
- 页面底部预留 `calc(56px + env(safe-area-inset-bottom) + 80px)` 安全区（底部 Tab 栏 + FAB 不遮挡内容）。
- 页面背景色：`--color-paper`。

---

## 2. ① 顶部导航栏

### 2.1 结构

```
┌─────────────────────────────────────┐
│  ←    绿萝                      ⋯   │
└─────────────────────────────────────┘
```

### 2.2 视觉规格

| 元素 | 规格 |
|------|------|
| 容器高度 | 48px |
| 容器背景 | `--color-paper`（与页面背景融合） |
| 容器底部 | 无边框、无阴影（滚动后可选加 1px `--color-line` 底线） |
| 左侧返回 | `←` 箭头，20px，`--color-leaf`，热区 44×44 |
| 中间标题 | `--font-body`，15px，font-weight 600，`--color-ink` |
| 中间标题对齐 | 居中，`max-width: 60%`，单行 `text-overflow: ellipsis` |
| 右侧菜单 | `⋯` 三点图标，20px，`--color-muted`，热区 44×44 |
| 内边距 | `0 var(--space-md)` |

### 2.3 溢出菜单（Overflow Menu）

点击 `⋯` 后弹出的下拉菜单：

| 属性 | 值 |
|------|-----|
| 弹出方式 | 从右上角向下展开（`transform-origin: top right`） |
| 背景 | `--color-surface` |
| 圆角 | `--radius-card`（16px） |
| 阴影 | `--shadow-card-emphasis` |
| 内边距 | `var(--space-sm) 0` |
| 遮罩 | 透明遮罩覆盖全屏，点击关闭 |

菜单项规格：

| 属性 | 值 |
|------|-----|
| 行高 | 44px |
| 内边距 | `0 var(--space-lg)` |
| 字体 | `--font-body`，14px，font-weight 500 |
| 普通项颜色 | `--color-ink` |
| 危险项颜色 | `--color-error`（仅「删除植物」） |
| hover/active | 背景变为 `--color-mist` |

菜单项列表：
1. 「编辑植物资料」— `--color-ink`
2. 「归档这盆植物」/「恢复到看板」— `--color-ink`
3. 分割线 — 1px `--color-line`，`margin: var(--space-xs) var(--space-lg)`
4. 「删除植物」— `--color-error`

### 2.4 入场动效

- 菜单展开：`opacity 0 → 1` + `scale(0.95) → scale(1)`，150ms ease-out
- 菜单收起：`opacity 1 → 0` + `scale(1) → scale(0.95)`，100ms ease-in
- reduced-motion：即时显示/隐藏

---

## 3. ② 紧凑 Hero 区

### 3.1 结构

```
┌──────────────────────────────────────┐
│  ┌────┐  绿萝                         │
│  │ 🪴 │  客厅 · 今天有 2 项待处理      │
│  └────┘                               │
└──────────────────────────────────────┘
```

### 3.2 容器规格

| 属性 | 值 |
|------|-----|
| 布局 | `display: flex; align-items: center; gap: var(--space-md)` |
| 内边距 | `var(--space-md)` |
| 背景 | `--color-surface` |
| 圆角 | `--radius-card`（16px） |
| 边框 | 1px solid `--color-line` |
| 阴影 | 无（Hero 区是识别区，不需要浮起感） |

### 3.3 缩略图规格

| 属性 | 值 |
|------|-----|
| 尺寸 | 48×48px |
| 圆角 | 12px |
| 边框 | 1px solid `--color-line` |
| object-fit | cover |
| flex-shrink | 0 |
| cursor | pointer（有图时）/ default（无图时） |

**无图占位态**：

```
┌────┐
│ 🪴 │  ← 24px emoji，居中
└────┘
```

- 背景：`--color-mist`
- 圆角、尺寸与有图态一致
- 无图时点击无响应

**点击交互**：有图时点击触发全屏预览（见 §8）。

### 3.4 文字区规格

| 元素 | 规格 |
|------|------|
| 布局 | `display: flex; flex-direction: column; gap: 2px; min-width: 0` |
| 植物名称 | `--font-heading`（Lora），16px，font-weight 700，`--color-ink`，单行 ellipsis |
| 副信息行 | `--font-body`，12px，font-weight 400 |

**副信息行的组合规则**：

格式：`{位置} · {状态摘要}`（位置为空时只显示状态摘要）

状态摘要的色彩：

| 状态 | 文案 | 颜色 |
|------|------|------|
| 有逾期任务 | `⚠️ N 项养护已逾期` | `--color-warning` |
| 今天有到期 | `今天有 N 项待处理` | `--color-leaf-light` |
| 全部正常 | `正在养护中` | `--color-muted` |
| 已归档 | `已归档于 X月X日` | `--color-muted` |

位置文字始终使用 `--color-muted`，与状态摘要之间用 ` · ` 分隔（中点两侧各一空格）。

---

## 4. ③ 需要处理区（核心操作区）

### 4.1 整体容器

| 属性 | 值 |
|------|-----|
| 背景 | `--color-surface` |
| 圆角 | `--radius-card`（16px） |
| 边框 | 1px solid `--color-line` |
| 内边距 | `var(--space-md)` |
| 内部间距 | `gap: var(--space-sm)`（标题与任务行之间、任务行之间） |
| 左侧装饰 | 3px 宽色条，贯穿容器左侧全高 |

**左侧色条颜色规则**：
- 有逾期任务时：`--color-warning`（暖橙）
- 仅今天到期时：`--color-leaf-light`（柔绿）

### 4.2 区域标题

| 属性 | 值 |
|------|-----|
| 字体 | `--font-body`，12px，font-weight 700 |
| 字母间距 | 0.08em |
| text-transform | uppercase |
| 颜色 | 与左侧色条同色（逾期时 `--color-warning`，仅今天时 `--color-leaf-light`） |
| 格式 | `⚠️ 需要处理（N）`（逾期时带 ⚠️）/ `需要处理（N）`（仅今天时无 emoji） |

计数徽章（N）：

| 属性 | 值 |
|------|-----|
| 显示方式 | 内联，紧跟标题文字 |
| 背景 | 无（纯文字括号包裹） |
| 颜色 | 与标题同色 |

### 4.3 紧凑任务行

每个到期/逾期任务渲染为一个水平行：

```
┌──────────────────────────────────────────┐
│ ▎ 💧  浇水        已逾期 2 天       [✓]  │
└──────────────────────────────────────────┘
```

#### 行容器规格

| 属性 | 值 |
|------|-----|
| 布局 | `display: flex; align-items: center; gap: var(--space-sm)` |
| 高度 | 48px（含内边距） |
| 内边距 | `var(--space-sm) var(--space-sm) var(--space-sm) calc(var(--space-sm) + 3px)` |
| 背景 | 透明（继承容器背景） |
| 分隔 | 行与行之间用 1px `--color-line` 底线分隔（最后一行无底线） |

#### 左侧类型色条

| 属性 | 值 |
|------|-----|
| 宽度 | 3px |
| 高度 | 24px（行高的 50%，垂直居中） |
| 圆角 | `--radius-pill` |
| 颜色 | 对应任务类型色（`--color-task-watering` 等） |
| 位置 | 行最左侧，`flex-shrink: 0` |

#### 任务类型 emoji

| 属性 | 值 |
|------|-----|
| 大小 | 16px |
| 行高 | 1 |
| flex-shrink | 0 |

#### 任务标签

| 属性 | 值 |
|------|-----|
| 字体 | `--font-body`，14px，font-weight 600 |
| 颜色 | `--color-ink` |
| flex | 0 0 auto |

#### 到期状态文案

| 属性 | 值 |
|------|-----|
| 字体 | `--font-body`，12px，font-weight 400 |
| 颜色 | 逾期 → `--color-warning`；今天 → `--color-leaf-light` |
| 位置 | `margin-left: auto`（推到右侧，完成按钮之前） |

#### 圆形完成按钮

| 属性 | 值 |
|------|-----|
| 尺寸 | 36×36px |
| 圆角 | `--radius-pill`（完美圆形） |
| 背景（idle） | `--color-mist` |
| 边框（idle） | 1px solid `--color-line` |
| 图标（idle） | `✓`，16px，`--color-leaf` |
| 背景（done） | `--color-success` |
| 边框（done） | 1px solid `--color-success` |
| 图标（done） | `✓`，16px，`--color-surface`（白色） |
| 背景（pending） | `--color-mist` |
| 图标（pending） | `…`，14px，`--color-muted` |
| flex-shrink | 0 |
| cursor | pointer |

**按钮按压态**：`transform: scale(0.92)`，80ms ease-out，松开回弹 150ms。

### 4.4 任务行退场动效

完成后的任务行退场序列：

| 阶段 | 时长 | 效果 |
|------|------|------|
| 0ms | 即时 | 按钮变绿 + emoji 上浮动效（复用 `complete-fx-rise` keyframe） |
| 0ms | 即时 | `triggerHaptic()` 轻震动 |
| 100ms | 200ms | 行内容 `opacity: 1 → 0` |
| 300ms | 200ms | 行高度 `48px → 0` + `padding → 0` + `margin → 0`（折叠） |
| 300ms | — | 从 DOM 中移除（或 `display: none`） |

**reduced-motion**：跳过所有动画，即时移除行。

### 4.5 全部完成后

当"需要处理"区所有任务行都退场后：

- 整个容器执行折叠：`height → 0` + `opacity → 0` + `margin → 0`，300ms ease-out
- 折叠完成后从布局中移除
- Hero 区状态摘要文案实时更新

---

## 5. ④ 养护计划区

### 5.1 整体容器

| 属性 | 值 |
|------|-----|
| 背景 | `--color-surface` |
| 圆角 | `--radius-card`（16px） |
| 边框 | 1px solid `--color-line` |
| 内边距 | `var(--space-md)` |
| 内部间距 | `gap: var(--space-sm)` |

### 5.2 区域标题行

```
┌──────────────────────────────────────────┐
│  📋 养护计划（4）              + 添加     │
└──────────────────────────────────────────┘
```

| 元素 | 规格 |
|------|------|
| 布局 | `display: flex; align-items: center; justify-content: space-between` |
| 左侧标题 | `--font-body`，12px，font-weight 700，`--color-leaf-light`，uppercase，letter-spacing 0.08em |
| 左侧 emoji | 📋，与标题同行 |
| 计数 | 括号包裹，与标题同色同字号 |
| 右侧按钮 | `+ 添加`，`--font-body`，13px，font-weight 500，`--color-leaf` |
| 右侧按钮热区 | 44×44（padding 扩展） |

### 5.3 信息任务行

每个任务渲染为一个信息展示行（可点击进入编辑）：

```
┌──────────────────────────────────────────┐
│  💧  浇水       每 5 天      下次 6月12日  │
└──────────────────────────────────────────┘
```

#### 行容器规格

| 属性 | 值 |
|------|-----|
| 布局 | `display: flex; align-items: center; gap: var(--space-sm)` |
| 高度 | 44px |
| 内边距 | `var(--space-sm)` |
| 圆角 | `--radius-button`（12px） |
| 背景（默认） | 透明 |
| 背景（hover/active） | `--color-mist` |
| cursor | pointer |
| 过渡 | `background 150ms ease` |

#### 行内元素

| 元素 | 规格 |
|------|------|
| 类型 emoji | 16px，flex-shrink: 0 |
| 任务标签 | `--font-body`，14px，font-weight 600，`--color-ink`，flex: 0 0 auto |
| 间隔信息 | `--font-body`，12px，font-weight 400，`--color-muted`，flex: 1，text-align: center |
| 下次时间 | `--font-body`，12px，font-weight 500，flex-shrink: 0 |
| 右箭头 | `›`，14px，`--color-muted`，opacity 0.5，flex-shrink: 0 |

**下次时间的色彩规则**：

| 状态 | 颜色 | 文案 |
|------|------|------|
| 逾期 | `--color-warning` | `已逾期 N 天` |
| 今天 | `--color-leaf-light` | `今天` |
| 明天 | `--color-ink` | `明天` |
| 2-6 天后 | `--color-muted` | `N 天后` |
| 7+ 天后 | `--color-muted` | `M月D日` |

### 5.4 空状态

| 属性 | 值 |
|------|-----|
| 容器最小高度 | 160px |
| 布局 | 垂直居中 |
| emoji | 🌱，32px，居中 |
| 标题 | `--font-body`，14px，font-weight 600，`--color-ink`，居中 |
| 标题文案 | 「还没有设置养护计划」 |
| 描述 | `--font-body`，13px，font-weight 400，`--color-muted`，居中，line-height 1.6 |
| 描述文案 | 「添加浇水、施肥等提醒，系统会自动计算下次养护时间并提醒全家。」 |
| 按钮 | 填充态，`--color-gold` 背景，`--color-ink` 文字，圆角 `--radius-button` |
| 按钮文案 | `+ 添加养护计划` |
| 元素间距 | emoji → 标题 8px，标题 → 描述 4px，描述 → 按钮 16px |

---

## 6. ⑤ 植物档案区（可折叠）

### 6.1 折叠触发器

```
┌──────────────────────────────────────────┐
│  📝 植物档案                         ▾   │
└──────────────────────────────────────────┘
```

| 属性 | 值 |
|------|-----|
| 布局 | `display: flex; align-items: center; justify-content: space-between` |
| 高度 | 44px |
| 内边距 | `var(--space-sm) var(--space-md)` |
| 背景 | 透明 |
| cursor | pointer |
| 整行可点击 | 是 |
| 左侧文字 | `--font-body`，13px，font-weight 600，`--color-muted` |
| 左侧 emoji | 📝，与文字同行 |
| 右侧箭头 | `▾`（收起）/ `▴`（展开），12px，`--color-muted` |
| aria-expanded | true/false |

### 6.2 展开后容器

| 属性 | 值 |
|------|-----|
| 背景 | `--color-surface` |
| 圆角 | `--radius-card`（16px） |
| 边框 | 1px solid `--color-line` |
| 内边距 | `var(--space-md)` |
| 内部间距 | `gap: var(--space-md)` |

### 6.3 内容区规格

**描述区块**：

| 属性 | 值 |
|------|-----|
| 小标题 | `--font-body`，12px，font-weight 600，`--color-leaf-light` |
| 小标题文案 | 「描述」 |
| 正文 | `--font-body`，14px，font-weight 400，`--color-muted`，line-height 1.6 |

**养护备注区块**：

| 属性 | 值 |
|------|-----|
| 小标题 | `--font-body`，12px，font-weight 600，`--color-leaf-light` |
| 小标题文案 | 「养护备注」 |
| 正文 | `--font-body`，14px，font-weight 400，`--color-muted`，line-height 1.6 |

**时间信息**：

| 属性 | 值 |
|------|-----|
| 字体 | `--font-body`，12px，font-weight 400，`--color-muted` |
| 格式 | 「添加时间：2026年5月20日」换行「最近更新：2026年6月8日」 |
| 与上方内容间距 | `var(--space-sm)` |
| 上方分隔 | 1px `--color-line` + `var(--space-sm)` padding-top |

**空内容态**：

当描述和备注都为空时，展开后显示：
- 文案：「暂无描述和备注，可以在编辑页面补充。」
- 字体：`--font-body`，13px，`--color-muted`，font-style: italic

### 6.4 折叠/展开动效

| 方向 | 实现 | 时长 | 缓动 |
|------|------|------|------|
| 展开 | `grid-template-rows: 0fr → 1fr`（内容区 `overflow: hidden`） | 300ms | ease-out |
| 收起 | `grid-template-rows: 1fr → 0fr` | 200ms | ease-in |
| 箭头 | `▾` ↔ `▴` 文字切换（无旋转动画） | 即时 | — |
| reduced-motion | 即时切换，无动画 | — | — |

---

## 7. 悬浮添加按钮（FAB）

### 7.1 视觉规格

| 属性 | 值 |
|------|-----|
| 位置 | `position: fixed; right: var(--space-md); bottom: calc(56px + env(safe-area-inset-bottom) + var(--space-md))` |
| 形状 | 胶囊形（pill） |
| 内边距 | `12px 20px` |
| 背景 | `--color-gold` |
| 文字 | `--color-ink`，`--font-body`，14px，font-weight 600 |
| 文案 | `+ 添加养护` |
| 圆角 | `--radius-pill` |
| 阴影 | `--shadow-card-emphasis` |
| z-index | 30（高于内容，低于 modal） |

### 7.2 交互状态

| 状态 | 视觉变化 |
|------|---------|
| 默认 | 如上规格 |
| hover/active | 背景 → `--color-gold-hover`，`transform: scale(0.96)`，100ms |
| 松开 | 回弹到 `scale(1)`，200ms cubic-bezier(0.34, 1.56, 0.64, 1) |

### 7.3 显示条件

- 植物未归档时：始终显示
- 植物已归档时：隐藏（`display: none`）
- 页面加载中：隐藏（数据未就绪时不显示）

---

## 8. 全屏图片预览

### 8.1 触发

点击 Hero 区缩略图（仅当植物有封面图时）。

### 8.2 视觉规格

| 属性 | 值 |
|------|-----|
| 遮罩 | `position: fixed; inset: 0; background: rgba(22, 52, 47, 0.85); backdrop-filter: blur(4px)` |
| z-index | 200（最高层） |
| 图片容器 | `max-width: 90vw; max-height: 80vh; object-fit: contain` |
| 图片圆角 | `--radius-card`（16px） |
| 关闭按钮 | 右上角，40×40px 热区，白色 × 图标，`opacity: 0.8` |
| 关闭按钮位置 | `position: absolute; top: 16px; right: 16px` |

### 8.3 动效

| 阶段 | 效果 | 时长 |
|------|------|------|
| 打开 | 缩略图位置 scale up + 遮罩淡入 | 360ms `cubic-bezier(0.22, 1, 0.36, 1)` |
| 关闭 | 反向缩回 + 遮罩淡出 | 200ms ease-in |
| reduced-motion | 直接显示/隐藏，无缩放 | 即时 |

### 8.4 交互

- 点击遮罩区域关闭
- 点击关闭按钮关闭
- 无图时缩略图不可点击（`cursor: default`，无 hover 效果）

---

## 9. 页面进入动效

### 9.1 内容区整体入场

| 属性 | 值 |
|------|-----|
| 初始状态 | `opacity: 0; transform: translateY(8px)` |
| 结束状态 | `opacity: 1; transform: translateY(0)` |
| 时长 | 200ms |
| 缓动 | `ease-out` |
| 触发时机 | 数据加载完成后 |
| reduced-motion | 跳过动画，直接显示 |

### 9.2 区域渐入（可选增强）

如果实现成本低，可为各区域加 stagger 入场：

| 区域 | 延迟 |
|------|------|
| Hero 区 | 0ms |
| 需要处理区 | 60ms |
| 养护计划区 | 120ms |
| 植物档案区 | 180ms |

---

## 10. 色彩应用总览

本页面涉及的色彩 token 使用场景汇总：

| Token | 本页使用场景 |
|-------|------------|
| `--color-paper` | 页面背景 |
| `--color-surface` | 需要处理区容器、养护计划区容器、植物档案区容器 |
| `--color-mist` | Hero 区背景、缩略图占位背景、折叠标题 hover 态 |
| `--color-ink` | 顶部导航植物名称、Hero 区植物名称、任务标签 |
| `--color-muted` | 副信息文字、间隔信息、未来到期时间、档案区内容 |
| `--color-leaf` | 今天到期状态文字、养护计划区标题 emoji 后文字 |
| `--color-leaf-light` | 区域标题、折叠标题、养护备注小标题 |
| `--color-gold` | 悬浮添加按钮背景 |
| `--color-gold-hover` | 悬浮添加按钮 hover/active 态 |
| `--color-warning` | 逾期状态文字、需要处理区标题（有逾期时）、逾期行色条 |
| `--color-success` | 完成按钮 done 态背景 |
| `--color-line` | 区域容器边框、任务行分隔线、缩略图边框 |
| `--color-task-*` | 任务行左侧色条（按类型） |

**色彩约束**：

- `--color-error` 仅在溢出菜单的「删除植物」文字上出现
- `--color-gold` 仅在悬浮按钮和 UndoToast 撤销文字上出现
- 需要处理区是页面中唯一的「暖色信号区」，确保其视觉突出性
- 养护计划区保持中性色调，不与需要处理区争夺注意力

---

## 11. 字体层级总览

| 层级 | 用途 | 字体 | 大小 | 粗细 | 颜色 |
|------|------|------|------|------|------|
| Nav | 顶部导航植物名称 | Raleway | 16px | 600 | `--color-ink` |
| H1 | Hero 区植物名称 | Lora | 16px | 700 | `--color-ink` |
| Section-title | 区域标题（需要处理/养护计划/植物档案） | Raleway | 12px | 700 | `--color-leaf-light` 或 `--color-warning` |
| Body-primary | 任务标签 | Raleway | 14px | 600 | `--color-ink` |
| Body-secondary | 到期状态、间隔信息、下次时间 | Raleway | 12px | 400 | 按状态变色 |
| Caption | Hero 副信息、档案区时间 | Raleway | 12px | 400 | `--color-muted` |
| Button-primary | 悬浮添加按钮 | Raleway | 14px | 600 | `--color-ink` |
| Button-secondary | 溢出菜单项 | Raleway | 14px | 500 | `--color-ink` 或 `--color-error` |

---

## 12. 响应式适配

本页面首要目标平台为 iPhone（390×844 视口）：

| 视口宽度 | 适配方式 |
|---------|----------|
| < 375px（iPhone SE） | Hero 缩略图缩小为 40×40px，任务行内边距减少为 10px |
| 375-430px | 标准规格 |
| > 430px（iPad/桌面） | 内容区最大宽度 480px 居中，悬浮按钮跟随内容区右侧 |

---

## 13. 无障碍要求

| 要求 | 实现方式 |
|------|----------|
| 顶部导航返回按钮 | `aria-label="返回"` |
| 溢出菜单按钮 | `aria-label="更多操作"` |
| 溢出菜单 | `role="menu"`，菜单项 `role="menuitem"` |
| 缩略图预览 | `aria-label="查看大图"` 或无图时 `aria-hidden="true"` |
| 需要处理区 | `role="region"; aria-label="需要处理的养护任务"` |
| 完成按钮 | `aria-label="完成浇水"` （含任务类型） |
| 养护计划任务行 | `role="button"; aria-label="编辑浇水任务，每5天，下次6月12日"` |
| 折叠区 | `aria-expanded="true/false"`，`aria-controls` 指向内容区 |
| 状态不只靠颜色 | 逾期同时有文案「已逾期 N 天」+ 色条双编码 |
| 对比度 | 所有文字对比度 ≥ 4.5:1 |

---

## 14. 与其他页面的视觉一致性

植物详情页与待办页、植物列表页同属认证后主流程页面，需保持以下一致性：

| 维度 | 统一规则 |
|------|----------|
| 页面背景 | 均为 `--color-paper` |
| 区域容器 | 均为 `--color-surface` + 1px `--color-line` + `--radius-card` |
| 逾期色彩 | 均为 `--color-warning`，不用红色 |
| 完成按钮 | 均为圆形 36×36 + 绿色 done 态 + emoji 微动效 |
| 动效节制 | 均只做功能性动效，不做装饰性动画 |
| 底部导航 | 共享同一组件，当前页高亮 |

**差异点（有意为之）**：

| 维度 | 待办页 | 植物列表页 | 植物详情页 | 理由 |
|------|--------|-----------|-----------|------|
| 卡片阴影 | `--shadow-card` | 无 | 区域容器有 | 详情页区域需要层次感 |
| 情感反馈 | Greeting Card | 无 | Hero 状态摘要 | 详情页用紧凑文字替代卡片 |
| 主 CTA | 完成按钮（圆形） | 无 | 完成按钮 + 悬浮添加 | 详情页兼顾操作和管理 |
| 信息密度 | 中（每卡 3-4 行） | 高（紧凑行） | 分层（操作区紧凑，计划区适中） | 详情页按区域调节密度 |

---

## 15. 设计交付物清单

本 UI 规格落地需要修改/新增的前端文件：

| 文件 | 改动类型 | 说明 |
|------|---------|------|
| `src/features/plants/PlantDetailPage.tsx` | 重写 | 整体布局重构，引入新区域组件 |
| `src/features/plants/PlantHeroCard.tsx` | 重写 | 从大封面改为紧凑横向布局 |
| `src/features/plants/DetailNavBar.tsx` | 新增 | 顶部导航栏 + 溢出菜单 |
| `src/features/plants/OverflowMenu.tsx` | 新增 | 溢出菜单组件（编辑/归档/删除） |
| `src/features/plants/ImagePreviewOverlay.tsx` | 新增 | 全屏图片预览 |
| `src/features/tasks/ActionableTaskSection.tsx` | 新增 | 需要处理区（高亮操作区） |
| `src/features/tasks/ActionableTaskRow.tsx` | 新增 | 紧凑任务行（完成按钮） |
| `src/features/tasks/PlanSection.tsx` | 新增 | 养护计划区 |
| `src/features/tasks/PlanTaskRow.tsx` | 新增 | 信息模式任务行（可点击编辑） |
| `src/features/plants/PlantArchiveSection.tsx` | 新增 | 植物档案折叠区 |
| `src/features/plants/FloatingAddButton.tsx` | 新增 | 悬浮添加养护按钮 |
| `src/features/tasks/TaskSection.tsx` | 删除/废弃 | 被 ActionableTaskSection + PlanSection 替代 |
| `src/features/tasks/TaskListItem.tsx` | 删除/废弃 | 被 ActionableTaskRow + PlanTaskRow 替代 |
| `src/styles/tokens.css` | 无改动 | 现有 token 已覆盖所有需要的色彩/间距/圆角 |

---

## 16. 验收标准（视觉维度）

| # | 验收项 | 通过条件 |
|---|--------|----------|
| 1 | 首屏信息 | iPhone 390×844 视口，Hero + 需要处理区完整可见，无需滚动 |
| 2 | Hero 布局 | 横向紧凑，缩略图 48×48，名称 + 副信息两行 |
| 3 | 需要处理区 | 逾期行有橙色色条 + warning 色文字，今天到期行有 leaf 色文字 |
| 4 | 完成按钮 | 圆形 36×36，点击后变绿 + emoji 上浮 + 行折叠退场 |
| 5 | 养护计划区 | 所有任务单行展示，信息完整（类型+间隔+下次时间） |
| 6 | 植物档案 | 默认折叠，点击展开有 300ms 动画 |
| 7 | 悬浮按钮 | 右下角 pill 形，金色背景，不遮挡内容 |
| 8 | 溢出菜单 | 点击 ⋯ 弹出菜单，包含编辑/归档/删除三项 |
| 9 | 图片预览 | 点击缩略图全屏展示，点击遮罩关闭 |
| 10 | 色彩一致 | 所有色值引用 token 变量，无硬编码 #hex |

---

> **本 UI 规格为 v0.2 迭代的设计输入，与 PRD（2026-06-11-plant-detail-iteration-spec.md）配套使用。**
