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

## Convex 环境

| 环境 | Deployment | Cloud URL | Site URL |
|---|---|---|---|
| Dev | `grandiose-ram-459` | `https://grandiose-ram-459.convex.cloud` | `https://grandiose-ram-459.convex.site` |
| Prod | `unique-elk-370` | `https://unique-elk-370.convex.cloud` | `https://unique-elk-370.convex.site` |

Team: `honghong`，Project: `plant-care-reminder`

## 日常部署（推荐）

项目已接入 Cloudflare Pages 的 Git 集成，推送代码到远程仓库即可自动触发前端构建和发布。日常改动按以下步骤操作：

```bash
# 1. 如果有 Convex 后端改动（schema / functions），先部署后端
cd app && npx convex deploy --yes

# 2. 提交代码
git add <files>
git commit -m "fix: 描述改动"

# 3. 推送到远程，自动触发 Cloudflare Pages 部署
git push
```

纯前端改动（组件、样式、文案等）只需步骤 2-3，跳过 Convex deploy。

## 部署步骤（手动上传方式）

### 1. 构建前端

```bash
cd /Users/wanghong/Projects/plant-care-reminder-standalone/app
yarn install
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

## 环境变量速查

### 前端构建时（VITE_ 前缀，注入客户端）

| 变量 | 说明 | Prod 值 |
|---|---|---|
| `VITE_CONVEX_URL` | Convex 实时 API 端点 | `https://unique-elk-370.convex.cloud` |

### Convex Dashboard 环境变量（服务端）

| 变量 | 说明 | 值 |
|---|---|---|
| `SITE_URL` | 前端部署的实际访问 URL | Cloudflare Pages 分配的域名 |

## 常见问题

### 登录/注册报 "Server Error Called by client"

原因：Convex Dashboard 中的 `SITE_URL` 与实际前端 URL 不匹配。

修复：更新 Convex Dashboard → Settings → Environment Variables → `SITE_URL` 为正确的 Cloudflare Pages URL。

### 直接访问子路径返回 404

原因：`_redirects` 文件未被包含在构建产物中。

修复：确认 `app/public/_redirects` 文件存在且内容为 `/* /index.html 200`。Vite 构建会自动将 `public/` 下的文件复制到 `dist/`。

### 构建时连接 Convex 失败

`vite build` 是纯静态打包，不需要实时连接 Convex。只需确保 `VITE_CONVEX_URL` 环境变量正确传入即可。

## 一键部署脚本（可选）

```bash
#!/bin/bash
# deploy-cloudflare.sh
set -e

cd "$(dirname "$0")/../app"

echo "→ Installing dependencies..."
yarn install --frozen-lockfile

echo "→ Building for production..."
VITE_CONVEX_URL=https://unique-elk-370.convex.cloud npx vite build

echo "→ Deploying to Cloudflare Pages..."
npx wrangler pages deploy dist --project-name=plant-care-reminder

echo "✓ Done! Remember to verify SITE_URL on Convex Dashboard."
```
