# Changelog — 2026-06-09

## 19:19 Session 摘要

### 完成的工作

- **VIS-008** 植物详情页视觉重构 — `PlantHeroCard.tsx` 重写为 Hero-led（4:3 全宽封面、底部圆角 24px、无图占位 🪴 64px +「轻触上传植物照片」、信息区紧贴 Hero 下方、养护备注拆为独立 label + `<p>`）；`PlantDetailPage.tsx` 新增底部操作栏（返回列表 / 编辑植物 / 添加任务 gold）。typecheck 通过、全量 8 files / 51 tests 全绿。

### 关键决策

- design_contract 写 action_bar `position: fixed; bottom: 0`，但 App 已有 `position: sticky` 的 BottomNav（56px）固定在 frame 列底部。page 级 `fixed bottom:0` 会与 BottomNav 重叠且脱离 `min(100%,520px)` 居中列。**改为 `position: sticky` + `bottom: calc(56px + safe-area + space-sm)`**，使操作栏浮在 BottomNav 之上且保留在居中列内（sheet 圆角 + shadow-sheet）。这是在真实 BottomNav 约束下对 design_contract 的正确解读。
- 养护备注由 `<span>` label + 独立 `<p>` 渲染，确保详情页 smoke 的 `getByText(/rotate the pot.../i)` 命中裸 note 文本节点。
- `addTaskButtonStyle` 由 `borderColor` 改为 `border` 简写，消除自身引入的 React shorthand/non-shorthand 冲突。

### 规范合规性快照

- 本次会话涉及技术栈：TypeScript / React（`.tsx`）
- 规范文件加载情况：本会话为 Coding Worker 编码 Session，依据 design_contract + 既有 smoke 契约执行；未触发独立规范 Skill。
- 规范违反发现并修复：1 处 — VIS-008 自身 `addTaskButtonStyle` 混用 `border` 简写与 `borderColor`，已改为 `border` 简写。
- 规范违反遗留（已知但未修复）：smoke 测试 stderr 仍有 React shorthand 警告，来源为 `ArchivePlantAction` / `CreateTaskPage` 流程（非 VIS-008 范围）；不影响测试通过，建议 VIS-013 走查时统一清理。

### 遗留问题

- VIS-008 操作栏 sticky 浮层在真机底部安全区的视觉表现需 VIS-013 走查时确认。
- 下一个任务：VIS-009（设置页视觉重构）。执行前读取 frontend-refresh.json 中 VIS-009 的 design_contract，并核对 FamilySettingsPage 相关 smoke 断言。
