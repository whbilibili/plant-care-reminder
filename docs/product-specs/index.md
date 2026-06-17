# Product Specs Index

本目录存放产品需求与结构化功能规格。

## 当前文档

- [2026-06-05-mvp-requirements.md](./2026-06-05-mvp-requirements.md)
  - MVP 范围、验收标准、边界定义
- [2026-06-05-mvp-functional-spec.md](./2026-06-05-mvp-functional-spec.md)
  - 角色、页面、数据模型、业务规则、错误处理
- [2026-06-10-todo-page-iteration-spec.md](./2026-06-10-todo-page-iteration-spec.md)
  - 迭代 v0.2 PRD：待办页加载逻辑、分组、状态机、情感设计与 MVP 增项（11 条已拍板决策）
- [2026-06-10-todo-page-ui-spec.md](./2026-06-10-todo-page-ui-spec.md)
  - 迭代 v0.2 UI 设计规格：待办页布局、配色、交互、状态视觉与动效原则（与 PRD 配套）
- [2026-06-11-plant-list-iteration-spec.md](./2026-06-11-plant-list-iteration-spec.md)
  - 迭代 v0.2 PRD：植物列表页展示逻辑、排序规则、归档策略、卡片信息架构、交互与动效（8 条已拍板决策）
- [2026-06-11-plant-list-ui-spec.md](./2026-06-11-plant-list-ui-spec.md)
  - 迭代 v0.2 UI 设计规格：植物列表页卡片视觉、色彩应用、动效细节、归档区设计（与 PRD 配套）
- [2026-06-11-plant-detail-iteration-spec.md](./2026-06-11-plant-detail-iteration-spec.md)
  - 迭代 v0.2 PRD：植物详情页信息层级重构、任务状态前置、完成交互与正反馈闭环、UI 美化（8 条已拍板决策）
- [2026-06-11-plant-detail-ui-spec.md](./2026-06-11-plant-detail-ui-spec.md)
  - 迭代 v0.2 UI 设计规格：植物详情页布局结构、各区域视觉规格、色彩应用、动效细节与交互反馈（与 PRD 配套）
- [2026-06-12-settings-page-iteration-spec.md](./2026-06-12-settings-page-iteration-spec.md)
  - 迭代 v0.2 PRD：设置页信息架构重组（个人/家庭/通知与应用三组）、缺失能力补齐（改称呼、移除成员、重置邀请码、排障指引）、权限语义落地、文案与层级清理（10 条已拍板决策）
- [2026-06-12-settings-page-ui-spec.md](./2026-06-12-settings-page-ui-spec.md)
  - 迭代 v0.2 UI 设计规格：设置页三分组布局、图标 chip、家庭头图卡、邀请码与成员卡视觉、统一确认 sheet、色彩与动效细节（与 PRD 配套）
- [2026-06-12-settings-page-task-breakdown.md](./2026-06-12-settings-page-task-breakdown.md)
  - 迭代 v0.2 功能拆分：基于 PRD + UI Spec 的可执行任务清单，功能任务（BE/FE）与 UI 美化任务逐能力配对，含依赖拓扑、执行顺序与功能×UI 配对总览
- [2026-06-15-settings-page-v0.3-iteration-spec.md](./2026-06-15-settings-page-v0.3-iteration-spec.md)
  - 迭代 v0.3 PRD：设置页四项能力补齐（个人头像上传、家庭改名、邀请链接、退出家庭），含数据一致性与单一家庭红线约束（D1~D6 已拍板决策）
- [2026-06-15-settings-page-v0.3-task-breakdown.md](./2026-06-15-settings-page-v0.3-task-breakdown.md)
  - 迭代 v0.3 功能规格：基于 v0.3 PRD 的可执行任务清单（SET3-001~016），功能任务（BE/FE）与 UI 美化任务逐能力配对，含 D5 数据一致性边界用例、依赖拓扑与落地节奏（对应 Agent 清单 modules/settings-page-v0.3.json）

## 约定

- 需求文档回答“为什么做、做到哪”
- 功能规格回答“系统必须如何工作”
- 迭代设计文档（`*-iteration-spec.md`）针对单个页面/能力深化，基于 MVP 文档扩展
- UI 设计规格（`*-ui-spec.md`）承接同名迭代 PRD 的产品决策，回答“界面长什么样、怎么交互”
