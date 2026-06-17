# 植物导航与可发现性 —— UI 视觉设计方案

> 配套文档：`2026-06-15-plant-navigation-discoverability-spec.md`（v0.3 已拍板）
> 本文定位：把已拍板的产品/导航逻辑（T1–T11）翻译成可直接落地的**视觉规格**。
> 设计基线：`app/src/styles/tokens.css`（所有色值/字体/间距/圆角/阴影/动效一律走 token，禁止硬编码 #hex）。
> 版本：v0.1 ｜ 状态：待评审

---

## 0. 设计语言锚点（Organic Biophilic）

这套方案不追求"通用 AI 审美"，而是延续产品已有的**植物学温润**调性：衬线标题（Lora）做情绪锚点，无衬线正文（Raleway）做信息载体，叶绿主色 + 暖金点缀，所有破坏性操作用 error 红设防但克制。下面是本次会用到的 token 速查（均来自 tokens.css，本文严禁出现字面色值）。

| 语义 | Token | 用途 |
|---|---|---|
| 主文字 | `--color-ink` | 植物名、标题 |
| 次文字 | `--color-muted` | 位置/状态/辅助说明 |
| 页面底 | `--color-paper` | 全局背景 |
| 浅绿底 | `--color-mist` | 占位底、兜底头像渐变起点 |
| 卡片面 | `--color-surface` | 卡片/弹层背景 |
| 叶绿主 | `--color-leaf` | 主操作描边、头像图标 |
| 叶绿亮 | `--color-leaf-light` | 强调状态、渐变终点 |
| 暖金 | `--color-gold` | 主按钮（编辑/保存） |
| 分割线 | `--color-line` | 边框、分隔 |
| 危险 | `--color-error` | 删除眉标/确认主按钮 |
| 遮罩 | `--color-overlay-scrim` | 弹层蒙层 |
| 标题字 | `--font-heading`（Lora serif） | 植物名、弹层标题 |
| 正文字 | `--font-body`（Raleway） | 正文、按钮、标签 |
| 间距 | `--space-xs/sm/md/lg/xl`（4/8/16/24/32） | 统一节奏 |
| 圆角 | `--radius-card/button/pill/input/sheet`（16/12/999/12/20） | — |
| 阴影 | `--shadow-card/card-emphasis/sheet` | 层级 |
| 渐变 | `--gradient-botanical`（135° mist→cream） | 兜底头像基底 |

---

## 1. 视觉改动全景（对齐 T1–T11）

| 编号 | 产品决策 | 视觉交付物 |
|---|---|---|
| T1 | 列表卡去掉铅笔编辑入口 | §2 列表卡重设计 |
| T2 | 详情页 Hero 区提供编辑按钮 | §3 Hero 编辑入口 |
| T3 | 归档/删除收进"管理区" | §4 管理区视觉 |
| T4 | 统一"编辑"语义 | §3 / §6 同款按钮规格 |
| T5 | 去掉卡片 ⋯ 菜单 | §2（卡片回归纯展示+导航） |
| T6 | 删除二次确认统一为 ConfirmSheet | §5 危险确认弹层 |
| T7 | 表单页返回出口（未保存守卫） | §6 FormNavBar |
| T8 | 删除任务确认统一（反馈8） | §5（与删植物同款） |
| T9 | 无图卡片兜底 + 默认头像（反馈9） | §7 PlantAvatar |
| T10 | 修复无图定位 bug | §7.1 |
| T11 | PlantAvatar 组件化复用 | §7.2 |

---

## 2. 列表卡重设计（T1 / T5）

### 2.1 设计意图

卡片回归"一卡一意图"：整卡可点 = 进入详情。去掉铅笔与 ⋯ 菜单后，卡片没有任何竞争性热区，点击预期 100% 收敛到"看这株植物"。编辑/归档/删除全部下沉到详情页。

### 2.2 视觉规格

```
┌─────────────────────────────────────────────┐  ← 整卡可点
│  ╭────────╮                                   │     surface 底
│  │ 头像   │   龟背竹                    ›      │     radius-card(16)
│  │ 80×80  │   阳台 · 今天有任务待完成          │     border 1px line
│  ╰────────╯                                   │     shadow-card
└─────────────────────────────────────────────┘
   ↑ 头像槽            ↑ 标题 Lora 16/700        ↑ chevron-right
   radius 12          副信息 Raleway 12/muted     muted, 18px
```

| 元素 | 规格 |
|---|---|
| 容器 | `background: --color-surface`；`border-radius: --radius-card`；`border: 1px solid --color-line`；`box-shadow: --shadow-card`；`padding: --space-md`；`gap: --space-md` |
| 头像槽 | `80×80`；`border-radius: 12px`；`overflow: hidden`；**`position: relative`（T10 修复）**；有图 cover，无图走 PlantAvatar（§7） |
| 植物名 | `--font-heading`；`16px / 700`；`--color-ink`；单行省略 |
| 副信息 | `--font-body`；`12px / 400`；`--color-muted`；位置 + `·` + 状态文案；状态色复用 Hero 的 statusColor 逻辑 |
| 末尾指引 | 新增 `chevron-right` 图标（lucide，经 Icon 壳），`size 18`，`--color-muted`，`flex-shrink:0`，强化"可进入"可发现性 |
| 按压态 | 整卡 `:active` → `transform: scale(0.99)` + `box-shadow: --shadow-card-emphasis`；`transition` 走既有 160ms ease；`prefers-reduced-motion` 下取消位移 |

> 关键交付：**删除** PlantCard 内现存的 `onEdit` / `Pencil` / `editPressed` 相关代码与样式（T1）；卡片不再渲染任何二级菜单（T5）。新增右侧 chevron 提升"整卡可点"的可发现性。

---

## 3. 详情页 Hero 编辑入口（T2 / T4）

### 3.1 设计意图

编辑是详情页的"主动作"，给它一个明确、唯一、暖金主色的按钮，避免用户在卡片上找编辑入口的认知断点（C1）。

### 3.2 视觉规格

Hero 卡右上角放一个**图标+文字**的编辑按钮，与卡片在同一视觉层：

```
┌─────────────────────────────────────────────┐
│ ╭──────╮  龟背竹              ╭──────────╮    │
│ │头像  │  阳台 · 状态良好      │ ✎ 编辑   │    │
│ ╰──────╯                     ╰──────────╯    │
└─────────────────────────────────────────────┘
                                ↑ secondary 按钮
```

| 元素 | 规格 |
|---|---|
| 按钮变体 | 复用 `Button variant="secondary"`：`--color-surface` 底、`--color-leaf` 字、`1px --color-line` 边 |
| 尺寸 | `fullWidth=false`；`min-height` 收紧到 `40px`（覆盖 baseStyle 54）；`padding: 0 --space-md`；`border-radius: --radius-button(12)` |
| 图标 | lucide `Pencil`，经 Icon 壳，`size 16`，`strokeWidth 1.75`，`colorVar="--color-leaf"`，与文字 `gap: var(--space-xs)` |
| 文案 | "编辑"，`--font-body`，`14px / 600` |
| 位置 | Hero `containerStyle` 改 `align-items: flex-start`，按钮绝对/弹性靠右上；移动端窄屏时换行到名称下方仍保持右对齐 |

> 语义统一（T4）：列表卡铅笔取消后，"编辑"语义只存在于此处与表单页标题，全站一处入口。

---

## 4. 管理区视觉（T3）

### 4.1 设计意图

归档、删除是低频且后果重的操作，必须与日常浏览/编辑**视觉降权并物理隔离**——放到详情页底部独立"管理"区，用分隔线和留白把它和主内容拉开，避免误触（破坏性操作设防）。

### 4.2 视觉规格

```
   …（养护任务、备注等主内容）…

   ─────────────────────────────  ← 分隔，--space-xl 上间距
   管理                            ← 区块小标题
   ┌─────────────────────────┐
   │  📦  归档这株植物          │  ← secondary，整行
   └─────────────────────────┘
   ┌─────────────────────────┐
   │  🗑  删除这株植物          │  ← danger 文字按钮
   └─────────────────────────┘
```

| 元素 | 规格 |
|---|---|
| 区块上间距 | `margin-top: --space-xl`；顶部 `1px --color-line` 分隔 |
| 区块标题 | "管理"，`--font-body`，`12px / 600`，`--color-muted`，`letter-spacing: 0.04em`，`text-transform` 不变（中文） |
| 归档按钮 | `Button variant="secondary"`，整行；左侧 lucide `Archive` 图标（Icon 壳，`--color-muted`）；文案"归档这株植物" |
| 删除按钮 | **文字型危险按钮**：`background: transparent`；`color: --color-error`；`border: 1px solid var(--color-line)`；左侧 lucide `Trash2`（`colorVar="--color-error"`，`size 18`）；点击 → 唤起 §5 ConfirmSheet |
| 按钮间距 | 两按钮间 `gap: --space-sm` |

> 删除按钮本身**不**用 error 实底——实底留给 ConfirmSheet 的最终确认按钮，形成"入口克制、确认决断"的层级。

---

## 5. 危险确认弹层 ConfirmSheet（T6 / T8 —— 反馈6 + 反馈8 统一）

### 5.1 设计意图

删植物与删任务此前都用"就地展开的红色内联块"，红色过载且不统一（反馈8）。统一改用底部抽屉式 `ConfirmSheet danger-solid` 变体：从底部升起、带蒙层、焦点收拢，把"二次确认"从页面里抽离成一个明确的决策时刻。

### 5.2 视觉规格（danger-solid 变体）

```
        ░░░░░░░░░░░░░░░░░░░░░░░░░  ← overlay-scrim + blur
        ╭───────────────────────╮
        │        删除            │  ← eyebrow，error 红，12/600
        │   确认删除"龟背竹"？     │  ← 标题 Lora 18/700 ink
        │                        │
        │ 删除后该植物及其全部养护  │  ← body Raleway 14 muted
        │ 记录将无法恢复。         │
        │                        │
        │  ╭──────────────────╮  │
        │  │     删除           │  │  ← 主按钮 error 实底 / 白字
        │  ╰──────────────────╯  │
        │  ╭──────────────────╮  │
        │  │     取消           │  │  ← 次按钮 secondary
        │  ╰──────────────────╯  │
        ╰───────────────────────╯
```

| 元素 | 规格 |
|---|---|
| 蒙层 | `background: --color-overlay-scrim`；`backdrop-filter: blur(2px)`；动画走 `sheet-overlay-in/out` |
| 抽屉容器 | `--color-surface`；`border-radius: --radius-sheet(20) 20 0 0`；`box-shadow: --shadow-sheet`；`padding: --space-lg`；升起动画 `sheet-rise-in`（含 -6px 回弹），关闭 `sheet-sink-out` |
| 眉标 eyebrow | "删除"，`--font-body`，`12px / 600`，`--color-error`，`letter-spacing: 0.06em` |
| 标题 | `--font-heading`，`18px / 700`，`--color-ink`；动态带对象名（"龟背竹"/"浇水"） |
| 正文 | `--font-body`，`14px / 400`，`--color-muted`，`line-height: 1.5` |
| 主确认按钮 | `danger-solid`：`background: --color-error`，`color: --color-paper`（白字），整行，`min-height 54`，`radius-button` |
| 次按钮 | `Button variant="secondary"`，整行，"取消" |
| 焦点 | 打开时焦点落在**主确认按钮**；Esc 关闭；focus trap；提交中 `isSubmitting` → 按钮 loading 文案 |
| 减动效 | `prefers-reduced-motion` 下抽屉无位移、仅淡入 |

### 5.3 红色克制原则

整个弹层只有 **eyebrow + 主确认按钮** 用 error 红。标题、正文一律 ink/muted。这修正了反馈8 中"通篇红字"的过载问题。删植物（反馈6）与删任务（反馈8）共用同一组件、同一规格，仅文案与回调不同。

---

## 6. 表单页返回出口 FormNavBar（T7）

### 6.1 设计意图

新增/编辑表单页此前缺明确返回，且改了内容直接退会丢失（死胡同 + 数据丢失风险）。补一个顶部导航条，返回时若有未保存改动，复用 §5 ConfirmSheet（primary 变体）做守卫。

### 6.2 视觉规格

```
┌─────────────────────────────────────────────┐
│  ‹ 返回            编辑植物          保存       │  ← FormNavBar
└─────────────────────────────────────────────┘
   ↑ 图标按钮         ↑ 标题            ↑ 主操作
```

| 元素 | 规格 |
|---|---|
| 容器 | `--color-paper` 底（与页面同色，sticky top）；底部 `1px --color-line`；`padding: --space-sm --space-md`；`min-height 48` |
| 返回按钮 | lucide `ChevronLeft`（Icon 壳，`size 24`，`--color-ink`）+ "返回"，无边框透明底，命中区 ≥44px |
| 标题 | 居中，`--font-heading`，`16px / 700`，`--color-ink`；新增态"添加植物" / 编辑态"编辑植物" |
| 保存 | 右侧 `Button variant="primary"`（暖金），`fullWidth=false`，`min-height 40`，文案"保存"；无改动/校验未过时 `disabled`（opacity 0.72） |
| 未保存守卫 | 返回时若 dirty → ConfirmSheet `primary` 变体：标题"放弃未保存的修改？"，主按钮"放弃"（这里用 secondary 弱化，避免红色滥用），次按钮"继续编辑" |

---

## 7. 默认头像 PlantAvatar（T9 / T10 / T11 —— 反馈9）

### 7.1 根因修复（T10）

反馈9 的真因是 **CSS 定位 bug**（已在主方案 §6B 更正，非动画竞态）：`PlantImage` 无图分支返回 `position:absolute; inset:0` 的占位 div，但父容器 `imageWrapStyle` 缺 `position: relative`，导致占位层脱离 80×80 槽位、文字信息被挤掉。

**修复**：给所有头像槽（列表卡 `imageWrapStyle`、Hero `thumbnailWrapStyle`）补 `position: relative`，让无图占位被正确裁切在槽内。这是确定性修复，刷新后即生效。

### 7.2 默认头像视觉（方案 C —— 经 frontend-design 技能评估推荐）

放弃 emoji（🌿/🪴 跨平台渲染不一、与 lucide 线性图标系统割裂），改用**渐变底 + lucide 线性图标**，与全站图标语言一致、可缩放、token 化。

```
   ╭──────────╮
   │  ╲╲╲╲╲╲  │   ← 135° 渐变底：mist → leaf 浅色调
   │   🌱     │   ← lucide Sprout 居中，leaf 色，strokeWidth 1.75
   │  ╱╱╱╱╱╱  │
   ╰──────────╯
```

| 元素 | 规格 |
|---|---|
| 底色 | `--gradient-botanical`（135° mist→cream）为基底；图标区叠一层 `--color-leaf-light` 极浅调以拉开层次 |
| 图标 | lucide `Sprout`，经 Icon 壳，`colorVar="--color-leaf"`，`strokeWidth 1.75`；尺寸随槽位 = 槽宽 × 0.45（80 槽 → 36px；48 Hero 槽 → 22px） |
| 圆角/裁切 | 继承父槽 `border-radius` 与 `overflow:hidden` |
| 无障碍 | 整个头像 `aria-label="${plant.name} 默认头像"`；内部图标 `aria-hidden` |
| 减动效 | 纯静态，无动画，天然 reduce-motion 安全 |

#### 可选：按名取色（待你拍板）

可像 Notion/GitHub 那样，按植物名 hash 出一个**稳定色相偏移**（同名永远同色），让一片无图卡片不至于全部一模一样。实现上对渐变终点做 `hue-rotate` 微调（基于 leaf 色系，幅度 ≤±20°，保证仍在植物绿调内）。

- ✅ 好处：辨识度、防止"千卡一面"
- ⚠️ 成本：需一个稳定 hash 工具函数 + 色相约束
- 默认建议：**先不做**，单色版即可解决反馈9；按名取色作为后续增强项

### 7.3 组件化复用（T11）

抽出 `PlantAvatar` 组件，统一供列表卡、Hero 卡、（未来）归档区复用：

```tsx
<PlantAvatar name={plant.name} size={80} />   // 列表卡
<PlantAvatar name={plant.name} size={48} />   // Hero 卡
```

| Prop | 说明 |
|---|---|
| `name: string` | 用于 aria-label，及（若启用）按名取色 |
| `size: number` | 槽边长，图标按 0.45 比例自适应 |
| 实现 | 纯 token 驱动，零 hex；图标走 Icon 壳；无图时由 `PlantImage`/`StorageImage` 的 fallback 槽位调用 |

> 落地后删除 PlantCard 与 PlantHeroCard 里各自的 emoji 占位（🌿/🪴），统一收口到 PlantAvatar。

---

## 8. 视觉验收清单

1. 列表卡无铅笔、无 ⋯ 菜单，右侧有 chevron，整卡按压有 scale 反馈。
2. 详情 Hero 右上有 secondary"编辑"按钮（Pencil + 文字），全站仅此一处编辑入口。
3. 详情页底部有分隔的"管理"区，含归档（secondary）与删除（文字型 danger）。
4. 删植物 / 删任务 共用 ConfirmSheet danger-solid，仅 eyebrow + 主按钮为 error 红，从底部升起带蒙层。
5. 表单页有 FormNavBar（返回/标题/保存），dirty 返回弹未保存守卫。
6. 无图植物卡正常显示名称+位置+状态，头像槽显示渐变底 + Sprout 图标，刷新后稳定。
7. 全文件无字面 #hex；所有色/字/距/角/影/动画均引用 token。
8. 所有图标经 Icon 壳消费；reduce-motion 下动效降级。

---

## 9. 设计决策记录

| 编号 | 决策 | 理由 |
|---|---|---|
| U1 | 列表卡加 chevron-right | 去掉编辑入口后强化"整卡可进入"的可发现性 |
| U2 | 删除入口用文字型 danger，实底留给确认 | 入口克制、确认决断的层级，避免红色过载 |
| U3 | 默认头像选渐变底+lucide Sprout（方案C） | 与全站线性图标语言统一、可缩放、token 化；优于 emoji |
| U4 | 按名取色暂不做 | 单色已解决反馈9；增强项后置，避免一次改动过大 |
| U5 | 未保存守卫"放弃"按钮用 secondary 而非 red | 放弃编辑非破坏数据，红色仅留给真删除 |
| U6 | PlantAvatar 组件化 | 列表/Hero/归档三处复用，收口 emoji 占位 |
