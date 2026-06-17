# Architecture — Plant Care Reminder

> 本文件是架构约束的权威来源。Coding Worker 每次新增约束时只追加，不推翻已有红线。

## Step 0 规模评估

- 业务域数量：6（家庭、认证、植物、任务、通知、PWA 引导）= 3 分
- 预估 Task 数：17-22 = 2 分
- 页面/路由数 + API/函数数：21+ = 3 分
- 数据表/集合数：7 = 1 分
- 会话并行需求：AI Coding Harness，多模块推进收益明确 = 2 分
- 总分：11 分

结论：采用 **模块化模式**。

## 技术栈

| 层次 | 技术选型 | 选型理由 |
|------|---------|---------|
| 框架 | React + Vite | 适合轻量 PWA，启动快，和 `app/` 目录匹配 |
| UI 样式 | Design Tokens（`app/src/styles/tokens.css`）+ 内联样式 | botanical 设计系统以 CSS 变量为单一来源，组件不硬编码色值 |
| 状态管理 | Zustand（仅 UI 状态） | 只承载轻量本地状态，避免过度全局化 |
| 服务端状态 | Convex `useQuery` / `useMutation` | 天然适配实时同步 |
| API 层 | Convex Functions | 单仓库全栈，减少额外 API 层样板 |
| 数据层 | Convex Schema + Functions | 适合共享数据、实时订阅和 cron |
| 数据库 | Convex 内置数据库 | 免运维，足够承载家庭内部应用 |
| 认证 | Convex Auth / 邮箱登录方案 | 简化家庭成员接入 |
| 部署 | Vercel + Convex Cloud | 免费层可用，发布成本低 |

## 项目目录摘要

```text
plant-care-reminder/
├── app/                  # 主代码区（完整实现：Convex 后端 + React/Vite 前端）
├── AGENTS.md
├── ARCHITECTURE.md
├── PLANS.md
└── docs/
    ├── product-specs/
    ├── design-docs/
    ├── exec-plans/
    ├── generated/
    └── ...
```

## app/ 目录详细索引

```text
app/
├── index.html                # SPA 入口 HTML
├── package.json              # 依赖与脚本
├── vite.config.ts            # Vite 构建配置
├── vitest.config.ts          # 测试配置
├── tsconfig.json             # TypeScript 项目配置
├── tsconfig.app.json         # 前端源码 TS 配置
├── tsconfig.node.json        # Node 工具链 TS 配置
├── eslint.config.js          # ESLint 配置
├── .env.local                # 本地环境变量（不入库）
│
├── convex/                   # ── Convex 后端层 ──
│   ├── schema.ts             # 数据模型定义（权威 Schema）
│   ├── auth.config.ts        # 认证 Provider 配置
│   ├── auth.ts               # 认证相关 Functions
│   ├── http.ts               # HTTP 路由（Auth callback 等）
│   ├── cron.ts               # 定时任务（到期提醒推送等）
│   ├── users.ts              # 用户 CRUD Functions
│   ├── families.ts           # 家庭 CRUD Functions
│   ├── plants.ts             # 植物 CRUD Functions
│   ├── tasks.ts              # 养护任务 Functions
│   ├── notifications.ts      # Web Push 通知 Functions
│   ├── lib/
│   │   ├── auth.ts           # 认证辅助（getUser 等）
│   │   └── validators.ts     # 共享参数校验器
│   └── _generated/           # Convex 自动生成（不手动修改）
│
├── src/                      # ── React 前端层 ──
│   ├── main.tsx              # 应用入口（挂载 ConvexProvider）
│   ├── App.tsx               # 根组件（Provider 组装）
│   ├── index.css             # 全局样式
│   │
│   ├── app/                  # 应用壳与路由
│   │   ├── router.tsx        # 路由定义（react-router）
│   │   ├── AppShell.tsx      # 主布局壳（导航 + 内容区）
│   │   └── RouteGate.tsx     # 路由守卫（认证/家庭状态门控）
│   │
│   ├── features/             # 业务功能模块（按领域划分）
│   │   ├── auth/             # 认证：登录、注册、Profile 引导
│   │   ├── family/           # 家庭：创建/加入家庭、设置、成员管理
│   │   ├── plants/           # 植物：CRUD、详情、图片、归档
│   │   ├── tasks/            # 养护任务：待办、完成、延后、排期
│   │   └── notifications/    # 通知：Push 订阅引导、故障排查
│   │
│   ├── components/           # 通用 UI 组件
│   │   ├── ui/               # 原子组件（Button/Icon/Input/Sheet 等）
│   │   └── navigation/       # 导航组件（BottomNav）
│   │
│   ├── lib/                  # 前端工具库
│   │   ├── constants.ts      # 全局常量
│   │   ├── formatters.ts     # 日期/文本格式化
│   │   ├── motion.ts         # 动画配置
│   │   └── textTruncate.ts   # 文本截断工具
│   │
│   ├── pwa/                  # PWA 相关
│   │   ├── install.tsx       # 安装引导组件
│   │   └── register.ts      # Service Worker 注册
│   │
│   ├── styles/
│   │   └── tokens.css        # Design Tokens（CSS 变量权威来源）
│   │
│   ├── types/
│   │   └── domain.ts         # 前端领域类型定义
│   │
│   └── assets/               # 静态资源（hero 图、logo 等）
│
└── public/                   # 静态公开资源
    ├── favicon.svg
    ├── icons.svg             # SVG 图标合集
    ├── manifest.webmanifest  # PWA manifest
    └── sw.js                 # Service Worker
```

## app/ 架构设计

### 后端架构（convex/）

Convex 后端采用 **按领域拆分 Function 文件** 的组织方式，每个文件对应一个业务聚合根：

| 文件 | 领域 | 职责 |
|------|------|------|
| `auth.ts` | 认证 | 用户登录/注册流程、会话管理 |
| `users.ts` | 用户 | 用户 Profile CRUD、昵称/头像更新 |
| `families.ts` | 家庭 | 创建/加入家庭、邀请码生成、成员管理 |
| `plants.ts` | 植物 | 植物 CRUD、图片上传、归档/恢复 |
| `tasks.ts` | 养护任务 | 任务创建/编辑/完成/延后、排期计算、完成日志 |
| `notifications.ts` | 通知 | Push 订阅注册/注销、推送发送 |
| `cron.ts` | 定时调度 | 到期任务扫描、Push 通知触发 |

共享逻辑放在 `convex/lib/` 下：`auth.ts` 提供统一的用户身份获取与家庭归属校验，`validators.ts` 提供可复用的参数校验器。

### 前端架构（src/）

前端采用 **Feature-First 模块化结构**，核心分层：

| 层次 | 目录 | 职责 | 依赖方向 |
|------|------|------|---------|
| 路由壳 | `src/app/` | 路由定义、布局框架、门控逻辑 | → features |
| 业务模块 | `src/features/*` | 页面 + 业务组件 + 领域 Hook | → components, lib |
| 通用组件 | `src/components/` | 无业务语义的 UI 原子/分子组件 | → styles |
| 工具层 | `src/lib/` | 纯函数工具、常量 | 无外部依赖 |
| 类型层 | `src/types/` | 前端领域类型 | 无外部依赖 |
| PWA | `src/pwa/` | SW 注册、安装引导 | → lib |
| 设计令牌 | `src/styles/` | CSS 变量（botanical 色板） | 被所有层引用 |

### 数据流架构

```text
[用户交互]
    ↓
[Feature Page/Component]
    ↓ useMutation() / useAction()
[Convex Client SDK] ──────────→ [Convex Cloud Functions]
    ↑ useQuery() (实时订阅)              ↓
[Feature Page/Component]         [Convex Database]
```

核心数据流特征：无自建 API 网关，前端通过 Convex SDK 直连后端 Functions；查询使用实时订阅（reactive），写操作使用 mutation 保证事务性。

### 路由与门控

`RouteGate.tsx` 实现三层门控：未认证 → 认证页；已认证但无家庭 → 家庭引导页；已认证且有家庭 → 主应用。路由定义集中在 `router.tsx`，所有页面组件来自 `features/` 内对应模块。

## 分层约束

```text
Page/Route -> Feature Component -> Hook -> Convex Client API -> Convex Function -> Convex Data
```

- `Page/Route`：只做路由参数解析、布局和组合
- `Feature Component`：负责界面行为，不直接做复杂数据拼装
- `Hook`：封装查询、mutation 调用和 UI 侧衍生状态
- `Convex Function`：唯一业务写入口，处理权限、计算、日志
- `Convex Data`：只保存最终状态和最小必要索引

## 数据层约束

- Schema 定义路径：`app/convex/schema.ts`
- 迁移策略：`npx convex dev --once --typecheck` + schema push
- 所有核心实体都带 `familyId`
- 时间统一以 UTC 保存，前端按本地时区展示
- 禁止在前端自行重算“真实下一次提醒时间”并覆盖后端结果

### 核心集合

- `users`
- `families`
- `familyMembers`
- `plants`
- `plantTasks`
- `taskCompletionLogs`
- `pushSubscriptions`

## 认证与授权

- Provider：Convex Auth 或兼容邮件登录方案
- Strategy：邮箱验证码 / magic link 优先
- 授权模型：同一家庭空间内默认协作，写操作必须校验当前用户属于该家庭
- 红线：任何任务完成、植物修改、推送订阅写入都必须带登录态

## 全局状态边界

- 全局 Store：仅放导航、对话框开关、一次性引导状态
- 服务端状态：植物列表、植物详情、待办列表、家庭成员、推送订阅状态
- 局部状态：表单草稿、图片上传中状态、筛选 UI 状态

## 设计系统约束

生成来源：`docs/generated/design-system/plant-care-reminder/MASTER.md`

- 风格：`Organic Biophilic`
- 字体：标题 `Lora`，正文 `Raleway`
- CSS Token 权威来源：`app/src/styles/tokens.css`（botanical 色板，禁止再硬编码 #hex）
  - 主色：`--color-ink: #16342f` / `--color-leaf: #1f473d` / `--color-leaf-light: #467061`
  - 强调：`--color-gold: #f1c567`（CTA）
  - 中性：`--color-paper: #fbfcf7` / `--color-mist: #edf5f1` / `--color-surface: #ffffff` / `--color-line: #d8e4da`
  - 任务类型识别色：`--color-task-watering/fertilizing/misting/repotting/pruning/custom`
- 圆角：16-24px（卡片 16 / sheet 20）
- 响应式断点：375px / 768px / 1024px / 1440px
- 无障碍：4.5:1 对比度、可见焦点态、尊重 reduced motion
- 图标策略：任务类型采用 **emoji + 色彩双编码**（💧浇水 / 🧪施肥 / 🌫️喷雾 等），颜色不作为唯一区分手段，满足色盲无障碍

## PWA 与通知约束

- Web Push 只作为增强提醒，不是唯一提醒渠道
- 主屏幕安装和通知授权必须有显式引导
- 待办页必须始终可看到到期任务
- 通知去重由服务端字段或通知日志保证，不依赖客户端记忆

## 环境变量规范

- 客户端可见：`VITE_CONVEX_URL`、公开 VAPID 公钥
- 服务端专用：私钥、认证密钥、管理密钥
- 红线：任何服务端密钥不得以 `VITE_` 前缀暴露

## 已废弃方案

| 方案 | 为什么不可行 | 被废弃时间 |
|------|------------|-----------|
| 纯本地静态网页 + 定时提醒 | iPhone 后台定时和共享同步都不可靠 | 2026-06-05 |

## 规范引用

| 任务类型 | 必读规范文件 |
|---------|-------------|
| TypeScript | `~/.catpaw/skills/skills-market/frontend-code-reviewer/references/ts.md` |
| React | `~/.catpaw/skills/skills-market/frontend-code-reviewer/references/react.md` |
| JavaScript | `~/.catpaw/skills/skills-market/frontend-code-reviewer/references/js.md` |
| Testing | `~/.catpaw/skills/skills-market/frontend-code-reviewer/references/testing.md` |
