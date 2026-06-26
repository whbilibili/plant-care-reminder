# Cloudflare Pages 部署指南

本文档记录 plant-care-reminder 前端部署到 Cloudflare Pages 的完整流程，供后续部署时作为前置知识使用。

## 项目基础信息

| 项 | 值 |
|---|---|
| 前端框架 | React + Vite (SPA) |
| 后端 | Convex Cloud |
| 前端代码目录 | `app/` |
| 构建输出目录 | `app/dist/` |
| SPA 路由文件 | `app/public/_redirects`（内容：`/* /index.html 200`） |
| GitHub 仓库 | `whbilibili/plant-care-reminder` |

## Convex 环境

| 环境 | Deployment | Cloud URL | Site URL |
|---|---|---|---|
| Dev | `grandiose-ram-459` | `https://grandiose-ram-459.convex.cloud` | `https://grandiose-ram-459.convex.site` |
| Prod | `unique-elk-370` | `https://unique-elk-370.convex.cloud` | `https://unique-elk-370.convex.site` |

Team: `honghong`，Project: `plant-care-reminder`

## 多环境策略

项目采用 **双分支 + 双 Convex Deployment** 的轻量多环境方案：

| 环境 | Git 分支 | Cloudflare Pages | Convex Deployment | 用途 |
|------|---------|------------------|-------------------|------|
| Production | `main` | 主域名（自动部署） | `unique-elk-370` | 生产环境，稳定可用 |
| Preview | `dev` 或 feature 分支 | Preview URL（`dev.plant-care-reminder.pages.dev`） | `grandiose-ram-459` | 新功能测试、PWA/Push 验证 |

### 环境隔离原则

- Preview 前端连接 Dev Convex，数据与生产完全隔离
- 同一套代码、同一套构建流程，只有环境变量不同
- Preview URL 支持 HTTPS，可真实验证 Service Worker 和 Push 通知

### 分支约定

- `main`：生产就绪代码，推送即自动部署到生产
- `dev`：稳定测试分支，推送后自动生成 Preview 部署（固定 URL：`https://dev.plant-care-reminder.pages.dev`）
- `feature/*`：功能开发分支，推送后也会生成独立 Preview 部署

### Cloudflare Pages 构建配置

| 配置项 | 值 |
|-------|---|
| 构建命令 | `npm install && npx vite build` |
| 构建输出 | `dist` |
| 根目录 | `app` |
| Production 分支 | `main` |
| Preview 分支 | 所有非生产分支（默认） |

## 日常开发流程

### 整体流程

```
本地开发（convex dev + npm run dev）
    ↓
push 到 dev 分支 → Cloudflare 自动构建 Preview
    ↓
Preview URL 云端验证（PWA / Push / 真机测试）
    ↓
验证通过 → merge 到 main → 自动部署生产
```

### 什么时候需要部署后端？

| 改动类型 | 是否需要部署后端 | 说明 |
|---------|---------------|------|
| 仅前端改动（组件、样式、文案） | 不需要 | 直接 push 触发前端构建即可 |
| 后端改动（schema / functions） | 需要 | 必须先部署后端到对应 Convex 环境 |
| 前后端都改了 | 需要 | 先部署后端，再 push 前端 |

### 后端部署命令对照

| 目标环境 | 命令 | 部署到 |
|---------|------|-------|
| Preview（测试验证） | `cd app && npx convex dev --once` | Dev Deployment（grandiose-ram-459） |
| Production（正式上线） | `cd app && npx convex deploy --yes` | Prod Deployment（unique-elk-370） |

> ⚠️ 注意区分：`convex dev --once` 部署到 Dev，`convex deploy` 部署到 Prod。搞反了会导致测试数据写入生产或生产功能缺失。

### 场景一：纯前端改动

```bash
# Preview 验证
git checkout dev
git add <files>
git commit -m "style: 调整卡片圆角"
git push origin dev
# → 等 1-2 分钟，访问 https://dev.plant-care-reminder.pages.dev 验证

# 上线生产
git checkout main
git merge dev
git push origin main
```

### 场景二：有后端改动

```bash
# 1. 在 dev 分支开发
git checkout dev

# 2. 本地调试（实时同步到 Dev Convex）
cd app && npx convex dev   # 保持运行，实时推送后端变更
npm run dev                 # 另一个终端，启动前端开发服务器

# 3. 本地调试完成，部署后端到 Dev 环境
cd app && npx convex dev --once

# 4. 推送前端，触发 Preview 构建
git add <files>
git commit -m "feat: 新增任务延后功能"
git push origin dev
# → 访问 Preview URL 验证

# 5. 验证通过，上线生产
cd app && npx convex deploy --yes   # 先部署后端到 Prod
git checkout main
git merge dev
git push origin main                 # 再触发前端生产部署
```

### 场景三：较大功能（feature 分支）

```bash
# 1. 从 dev 拉 feature 分支
git checkout dev
git checkout -b feature/multi-image-gallery

# 2. 开发过程中本地调试
cd app && npx convex dev
npm run dev

# 3. 开发完成，合回 dev 测试
git checkout dev
git merge feature/multi-image-gallery
cd app && npx convex dev --once      # 如有后端改动
git push origin dev
# → Preview 验证

# 4. 验证通过，上线
cd app && npx convex deploy --yes
git checkout main
git merge dev
git push origin main

# 5. 清理 feature 分支
git branch -d feature/multi-image-gallery
```

## 注意事项

### 关键提醒

1. **后端先于前端部署**：如果前后端都有改动，必须先部署后端再 push 前端，否则新前端会调用旧接口导致报错。

2. **SITE_URL 必须匹配**：Convex Auth 会校验请求来源与 `SITE_URL` 是否一致。如果 Preview URL 变了（比如用了 feature 分支的随机 hash URL 而非 dev 分支的固定 URL），登录会失败。建议统一用 `dev` 分支做验证。

3. **Dev 环境数据是独立的**：Preview 环境连接的是 Dev Convex，里面的用户、植物、任务数据与生产完全无关。首次使用需要重新注册账号、创建家庭。

4. **`convex dev` vs `convex dev --once`**：
   - `convex dev`：持续监听文件变化并实时推送，用于本地开发
   - `convex dev --once`：一次性推送当前代码到 Dev Deployment，用于部署前确认

5. **feature 分支的 Preview 登录问题**：只有 `dev` 分支的 Preview URL（`dev.plant-care-reminder.pages.dev`）与 Convex Dev 的 `SITE_URL` 匹配。其他 feature 分支的 Preview URL 是随机 hash，登录功能会不可用。如需登录验证，请合并到 `dev` 分支后再测。

### Cloudflare Pages 自动部署的触发条件

- push 到 `main` → 触发 Production 部署
- push 到任何其他分支 → 触发 Preview 部署
- 构建大约需要 1-2 分钟

### 本地 .env 文件说明

| 文件 | 用途 | 是否入库 |
|-----|------|---------|
| `app/.env.local` | 本地开发，连接 Dev Convex | 否（被 .gitignore 忽略） |
| `app/.env.production` | Production 环境变量参考 | 是 |
| `app/.env.preview` | Preview 环境变量参考 | 是 |

> 实际的 Cloudflare Pages 构建环境变量在 Dashboard 中配置，`.env.production` 和 `.env.preview` 仅作为文档参考。

## 环境变量速查

### 前端构建时（VITE_ 前缀，注入客户端）

| 变量 | 说明 | Production 值 | Preview 值 |
|---|---|---|---|
| `VITE_CONVEX_URL` | Convex 实时 API 端点 | `https://unique-elk-370.convex.cloud` | `https://grandiose-ram-459.convex.cloud` |
| `VITE_CONVEX_SITE_URL` | Convex HTTP 端点 | `https://unique-elk-370.convex.site` | `https://grandiose-ram-459.convex.site` |
| `VITE_VAPID_PUBLIC_KEY` | Web Push VAPID 公钥 | 相同值 | 相同值 |

### Convex Dashboard 环境变量（服务端）

| 变量 | Deployment | 值 |
|---|---|---|
| `SITE_URL` | Prod (`unique-elk-370`) | `https://plant-care-reminder.pages.dev` |
| `SITE_URL` | Dev (`grandiose-ram-459`) | `https://dev.plant-care-reminder.pages.dev` |

> ⚠️ Dev Deployment 的 `SITE_URL` 设置为 `https://dev.plant-care-reminder.pages.dev`（Cloudflare Pages 给 `dev` 分支的固定别名），这样所有从 `dev` 分支触发的 Preview 部署都能通过此固定 URL 访问并正常登录。

## 部署步骤（手动上传方式）

> 通常不需要手动上传，仅在 Git 集成不可用时作为备用方案。

### 1. 构建前端

```bash
cd /Users/wanghong/Projects/plant-care-reminder-standalone/app
npm install
VITE_CONVEX_URL=https://unique-elk-370.convex.cloud npx vite build
```

构建完成后产物在 `app/dist/` 目录。

> 如果部署 dev 环境测试，把 `VITE_CONVEX_URL` 改为 `https://grandiose-ram-459.convex.cloud`。

### 2. 上传到 Cloudflare Pages

**方式 A：Dashboard 手动上传**

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/) → Workers & Pages
2. 找到已有项目或创建新项目（Direct Upload 类型）
3. 点击「Upload assets」，选择 `app/dist/` 目录下的**所有文件**上传
4. 等待部署完成，获得访问 URL

**方式 B：Wrangler CLI 上传**

```bash
npx wrangler pages deploy app/dist --project-name=plant-care-reminder
```

首次使用需 `npx wrangler login` 先完成认证。

### 3. 配置 Convex SITE_URL

这是最关键的一步——Convex Auth 需要知道前端实际访问地址，否则登录/注册会报 origin 校验错误。

1. 打开 [Convex Dashboard](https://dashboard.convex.dev/)
2. 选择对应 deployment（prod: `unique-elk-370`）
3. 进入 Settings → Environment Variables
4. 设置 `SITE_URL` = Cloudflare Pages 的最终访问 URL（例如 `https://plant-care-reminder.pages.dev`）

> ⚠️ `SITE_URL` 必须与用户浏览器地址栏中的 origin 完全一致（包括协议 https），否则会触发 "Server Error Called by client" 错误。

### 4. 验证部署

- 访问 Cloudflare Pages URL，确认页面正常加载
- 尝试登录/注册，确认 Convex Auth 工作正常
- 检查 SPA 路由：直接访问 `/plants` 等子路径应正常渲染（不 404）

## 常见问题

### 登录/注册报 "Server Error Called by client"

原因：Convex Dashboard 中的 `SITE_URL` 与实际前端 URL 不匹配。

修复：更新 Convex Dashboard → Settings → Environment Variables → `SITE_URL` 为正确的 Cloudflare Pages URL。

### Preview 环境无法登录

原因：从 feature 分支触发的 Preview URL 是随机 hash（如 `abc123.plant-care-reminder.pages.dev`），与 Convex Dev 的 `SITE_URL`（`dev.plant-care-reminder.pages.dev`）不匹配。

修复：将代码合并到 `dev` 分支后再测试登录功能，或临时更新 Convex Dev 的 `SITE_URL` 为当前 Preview URL。

### 直接访问子路径返回 404

原因：`_redirects` 文件未被包含在构建产物中。

修复：确认 `app/public/_redirects` 文件存在且内容为 `/* /index.html 200`。Vite 构建会自动将 `public/` 下的文件复制到 `dist/`。

### 构建时连接 Convex 失败

`vite build` 是纯静态打包，不需要实时连接 Convex。只需确保 `VITE_CONVEX_URL` 环境变量正确传入即可。

### Preview 部署后前端报接口错误

原因：后端有改动但未部署到 Dev Convex。

修复：在 push dev 分支之前，先执行 `cd app && npx convex dev --once` 将后端变更同步到 Dev Deployment。

## 一键部署脚本（可选）

```bash
#!/bin/bash
# deploy-cloudflare.sh
set -e

cd "$(dirname "$0")/../app"

echo "→ Installing dependencies..."
npm install

echo "→ Building for production..."
VITE_CONVEX_URL=https://unique-elk-370.convex.cloud npx vite build

echo "→ Deploying to Cloudflare Pages..."
npx wrangler pages deploy dist --project-name=plant-care-reminder

echo "✓ Done! Remember to verify SITE_URL on Convex Dashboard."
```
