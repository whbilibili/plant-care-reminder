# Caveats — 踩坑永久档案

本文件记录项目中的真实陷阱。只追加，不删除。

## 踩坑记录

| 日期 | 现象描述 | 根因 | 预防方法 | 状态 |
|------|---------|------|---------|------|
| 2026-06-05 | iPhone 用户即使打开网页也可能收不到提醒 | PWA Web Push 依赖主屏幕安装和通知授权 | 应用内提供明确安装与授权引导，并保留待办页作为兜底提醒入口 | 已知 |
| 2026-06-05 | 运行 `npx convex dev --once --typecheck` 会直接失败并提示缺少参数 | 当前 Convex CLI 的 `--typecheck` 需要显式模式值 | 使用 `npx convex dev --once --typecheck enable`，并同步更新 task 文档里的验证命令 | 已知 |
| 2026-06-06 | `AppRouter.smoke.test.tsx` 有 4 个 plant-detail 路由用例失败（断言 `正在家庭看板中使用`/`已归档，归档于` 等文案） | plant-detail-v2(PDETAIL2) 重构 PlantHeroCard 时移除/改写了相关文案，但未同步更新 smoke 测试 | 属于 plant-detail-v2 模块遗留，settings-page-v2(SET2) 开发期间视为已知基线失败；SET2 任务只需保证不新增失败 | 已修复（PDETAIL2-009） |
| 2026-06-18 | Clipboard API `navigator.clipboard.writeText()` 在非 HTTPS / 非 Secure Context 下静默失败 | 部分 Android 浏览器内 WebView 不满足 Secure Context 条件 | 邀请码复制使用 fallback：先尝试 Clipboard API，失败后降级为 `document.execCommand('copy')` 或显示手动复制提示 | 已知 |
| 2026-06-20 | ☆ 星形图标在 UI 上被用户理解为「评分」而非「收藏/重要」 | 星形图标语义歧义 | 改用心形（❤️）或书签图标表示收藏/重要，星形仅用于评分场景 | 已知（已记入已废弃方案） |
