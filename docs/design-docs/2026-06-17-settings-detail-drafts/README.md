# 2026-06-17 Settings Detail Drafts

本目录补齐设置页主设计稿 `07-settings-v2.png` 后续派生出的细节页面和交互状态。目标是先把二级体验做成可评审设计稿，再写交互方案，最后拆功能任务。

## Drafts

总览：

- [settings-detail-drafts-overview.png](./settings-detail-drafts-overview.png)
- [settings-detail-drafts.html](./settings-detail-drafts.html)

单页设计稿：

1. [01-profile-edit.png](./01-profile-edit.png) — 个人资料编辑。点击设置页右上头像进入，支持修改头像和家庭内显示名称。
2. [02-members-manage.png](./02-members-manage.png) — 管理成员列表。点击设置页「管理成员」进入，管理员可查看成员状态。
3. [03-member-detail.png](./03-member-detail.png) — 成员资料。点击成员行进入，展示角色、加入时间、近期养护，并提供管理员操作。
4. [04-remove-member-confirm.png](./04-remove-member-confirm.png) — 移除成员确认。危险操作使用底部 ConfirmSheet，说明后果。
5. [05-invite-share-fallback.png](./05-invite-share-fallback.png) — 邀请分享与复制失败兜底。承接 InviteCard 的「复制邀请链接 / 复制邀请码」。
6. [06-notification-detail.png](./06-notification-detail.png) — 提醒通知详情。说明当前通知能力边界，避免本地开关被误认为已账号级持久化。

## Entry Points

- 设置页右上头像：进入 `个人资料`，可改头像和名称。
- 设置页家庭成员卡右上 `管理成员`：进入 `管理成员`。
- 设置页成员列表任一成员行：进入 `成员资料`。
- 成员资料页 `移除该成员`：打开 `移除成员确认`。
- 设置页 InviteCard 的 `手动查看邀请码` 或管理成员页 `邀请更多家人`：进入 `邀请家人`。
- 设置页 `养护提醒通知` 行：进入 `提醒通知` 详情，而不是只在当前页切换一个无后端持久化的开关。

## Design Rules

- 二级页使用 `ScreenNav`，不显示底部导航；从设置主页面进入的深层详情页返回上一层。
- 只有一级设置页保留底部 TabBar。
- 个人资料和成员管理都是轻量页面，不使用后台管理式表格。
- 成员危险操作必须使用底部 `ConfirmSheet`，不能直接在列表行内执行。
- 通知页必须明确当前开关是否为本地状态，未接后端前不能表现为账号级设置。
- 复制邀请失败时必须提供手动复制内容：完整链接和 6 位邀请码。

## Open Decisions

- 角色管理：当前只设计移除成员，没有设计转让管理员或提升/降级角色。若要解决唯一管理员退出限制，需要另补「转让管理员」设计稿。
- 近期养护：成员资料页中的近期养护可以先用已有 task logs 聚合，也可以 v1 仅展示占位信息。
- 头像裁剪：本稿不做裁剪框，只做圆形预览、上传、失败保留原头像。
