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
- [2026-06-10-todo-page-feature-list.md](./2026-06-10-todo-page-feature-list.md)
  - 待办页 v0.2 功能清单：功能开发 × UI 美化对照表（8 个垂直切片 TODO2-001~008），含数据层 schema 扩展、Convex Functions 增量、UI 组件清单与依赖执行顺序
- [2026-06-15-plant-navigation-discoverability-spec.md](./2026-06-15-plant-navigation-discoverability-spec.md)
  - 迭代 v0.3 PRD：植物导航与可发现性专项——一卡一意图收敛入口、详情页管理操作分层显性化、真删除实现、统一编辑语义、表单页返回出口、删除二次确认重设计、无图卡片兜底（Q1~Q9 已拍板决策，T1~T11 改动范围）
- [2026-06-15-plant-navigation-ui-design.md](./2026-06-15-plant-navigation-ui-design.md)
  - 迭代 v0.3 UI 设计规格：植物导航重设计视觉规格——列表卡去铅笔加 chevron、Hero 编辑入口、管理区归档/删除分层、danger ConfirmSheet 统一、FormNavBar 表单返回栏、PlantAvatar 默认头像组件（与导航 PRD 配套）
- [2026-06-17-role-permission-management-spec.md](./2026-06-17-role-permission-management-spec.md)
  - 迭代 v0.4 PRD：角色与权限管理——引入 owner/admin/member 三级角色体系，替代 v0.3 D5 临时方案，含权限矩阵、owner 转让、删除家庭、数据迁移方案与验收标准
- [2026-06-17-care-history-timeline-spec.md](./2026-06-17-care-history-timeline-spec.md)
  - P0 PRD：养护历史时间线——基于已有 taskCompletionLogs 构建植物级时间线 + 家庭动态流，让完成记录可见可回溯，含索引方案、分页策略与验收标准
- [2026-06-17-push-notification-enhancement-spec.md](./2026-06-17-push-notification-enhancement-spec.md)
  - P0 PRD：推送通知体验增强——通知深链跳转（点击直达植物详情）、推送时间偏好（每天几点提醒）、到期任务聚合推送，从"能推"到"推得准"
- [2026-06-17-push-notification-enhancement-task-breakdown.md](./2026-06-17-push-notification-enhancement-task-breakdown.md)
  - P0 功能规格：推送通知体验增强——数据流设计、Schema 变更（users.notificationPreferences）、后端 action 重构（按用户分组+时间窗口+聚合推送）、前端偏好设置 UI、12 个任务拆分（PUSH-001~012）含依赖拓扑与执行顺序
- [2026-06-17-plant-grouping-room-filter-spec.md](./2026-06-17-plant-grouping-room-filter-spec.md)
  - P0 PRD：植物分组与房间筛选——利用已有 location 字段构建按房间分组视图 + 待办页房间筛选标签 + 位置自动补全，纯前端实现
- [2026-06-17-plant-grouping-room-filter-task-breakdown.md](./2026-06-17-plant-grouping-room-filter-task-breakdown.md)
  - P0 功能规格：植物分组与房间筛选——数据流设计、后端微调（listDueTasks 补 plantLocation）、组件契约（SegmentedControl/PlantGroupView/RoomFilterChips/LocationAutocomplete）、10 个任务拆分（GRP-001~010）含依赖拓扑与执行顺序
- [2026-06-17-iteration-backlog-outline.md](./2026-06-17-iteration-backlog-outline.md)
  - 迭代需求储备大纲：P1（多图上传/任务灵活性/数据导出）和 P2（植物知识卡片/季节性建议/协作增强）六个方向的初步方案记录
- [2026-06-23-plant-knowledge-card-spec.md](./2026-06-23-plant-knowledge-card-spec.md)
  - P2 PRD：植物知识卡片——预置 80 种常见绿植品种知识库、创建植物时品种匹配与养护参数推荐、详情页可折叠知识卡片（浇水/光照/施肥/当季要点）、前端静态 JSON 方案（D1~D6 已拍板决策）
- [2026-06-24-plant-knowledge-card-ui-spec.md](./2026-06-24-plant-knowledge-card-ui-spec.md)
  - P2 UI 设计规格：植物知识卡片——创建页品种匹配下拉（复用 Autocomplete 范式）、推荐卡片三宫格布局与应用反馈、详情页可折叠知识区块（5 区块结构）、编辑页品种标签管理、色彩/动效/无障碍全规格（UD1~UD10 设计决策）
- [2026-06-23-seasonal-care-advice-spec.md](./2026-06-23-seasonal-care-advice-spec.md)
  - P2 PRD：季节性养护建议——待办页季节横幅（换季提醒+常规提示）、换季调整建议面板、详情页当季要点联动品种库、纯前端实现无后端变更（D1~D6 已拍板决策）
- [2026-06-23-family-collaboration-enhancement-spec.md](./2026-06-23-family-collaboration-enhancement-spec.md)
  - P2 PRD：家庭协作增强——任务指派（负责人选择器）、精准推送（只推负责人）、完成通知（应用内通知中心）、逾期补位提醒、notifications 新表、待办页筛选标签（D1~D8 已拍板决策）
- [2026-06-22-multi-image-gallery-spec.md](./2026-06-22-multi-image-gallery-spec.md)
  - P1 PRD：多图上传与养护图集——植物详情页图集区（横向滚动/全屏浏览/设为封面）、任务完成附图、前端压缩缩略图策略、gallery 内嵌 plants 文档方案（D1~D6 已拍板决策）
- [2026-06-22-multi-image-gallery-task-breakdown.md](./2026-06-22-multi-image-gallery-task-breakdown.md)
  - P1 功能规格：多图上传与养护图集——数据流设计、Schema 变更（plants.gallery + taskCompletionLogs.imageStorageId）、后端 4 个新 mutation 契约、前端组件契约（PlantGalleryStrip/GalleryFullscreenViewer/TaskCompletionPhotoPrompt）、图片压缩工具抽取、18 个任务拆分（GAL-001~018）含依赖拓扑与执行顺序
- [2026-06-22-care-task-flexibility-spec.md](./2026-06-22-care-task-flexibility-spec.md)
  - P1 PRD：养护任务灵活性——排期模式三选一（固定间隔/每周几/季节性调整）、固定类型任务唯一性约束、schema 向后兼容扩展（scheduleMode/weeklyDays/seasonalIntervals）、计算函数新增（D1~D7 已拍板决策）
- [2026-06-22-care-task-flexibility-task-breakdown.md](./2026-06-22-care-task-flexibility-task-breakdown.md)
  - P1 功能规格：养护任务灵活性——数据流设计、Schema 变更（plantTaskFields 三字段扩展）、后端 6 个接口改造契约（createPlantTask 唯一性校验+排期分支/updatePlantTask 模式切换/completeTaskCore 分支计算）、前端组件契约（ScheduleModeSelector/WeeklyDaysPicker/SeasonalIntervalsInput）、计算函数新增（computeNextWeeklyDueAt/computeNextSeasonalDueAt）、21 个任务拆分（FLEX-001~021）含依赖拓扑与执行顺序
- [2026-06-22-data-export-spec.md](./2026-06-22-data-export-spec.md)
  - P1 PRD：数据导出——CSV 养护日志导出（Excel 友好）+ JSON 全量备份、Convex action 生成文件、隐私合规（不含个人身份信息）、24h 自动清理（D1~D7 已拍板决策）

## 约定

- 需求文档回答“为什么做、做到哪”
- 功能规格回答“系统必须如何工作”
- 迭代设计文档（`*-iteration-spec.md`）针对单个页面/能力深化，基于 MVP 文档扩展
- UI 设计规格（`*-ui-spec.md`）承接同名迭代 PRD 的产品决策，回答“界面长什么样、怎么交互”
