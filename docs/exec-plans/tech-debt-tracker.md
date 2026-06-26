# Tech Debt Tracker

| 日期 | 条目 | 原因 | 影响 | 建议处理时机 | 状态 |
|------|------|------|------|-------------|------|
| 2026-06-05 | 先采用 PWA 而非原生 iOS 壳 | 优先降低首版成本 | Web Push 体验可能不如原生 | MVP 试用后评估 | 打开 |
| 2026-06-15 | CompleteTaskButton 使用 CSS `border` 简写覆盖了 design token 的 `border-color` | 快速实现时未拆分 border 属性 | 主题切换时边框色不跟随 token 变化 | system-ui-refresh-v0.6 期间统一修正 | 打开 |
| 2026-06-18 | 已有 4 个 smoke 测试用例长期失败（plant-detail 路由相关） | PDETAIL2 重构后未同步测试断言 | CI 基线噪声，新增失败不易发现 | 已由 PDETAIL2-009 修复 | 已修复 |
