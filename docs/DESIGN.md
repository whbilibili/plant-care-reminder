# Design

## 设计语言基线

本项目的设计系统来源于 `ui-ux-pro-max` 自动生成结果：

- 产物路径：`docs/generated/design-system/plant-care-reminder/MASTER.md`
- 推荐风格：`Organic Biophilic`
- 页面模式：`Real-Time / Operations Landing`

## 字体规范

- 标题字体：`Lora`
- 正文字体：`Raleway`
- 语气：安静、自然、家庭化、轻仪式感

## 色彩 Token

> 权威来源为 `app/src/styles/tokens.css`（botanical 视觉方向）。下表为同步快照，
> 以代码中的 `tokens.css` 为准；组件一律引用变量，禁止硬编码 #hex。

```css
:root {
  /* 主色 / 文字 */
  --color-ink: #16342f;
  --color-muted: #637b71;
  --color-leaf: #1f473d;
  --color-leaf-light: #467061;
  /* 强调 / CTA */
  --color-gold: #f1c567;
  --color-gold-hover: #ddb04e;
  /* 中性 / 背景 */
  --color-paper: #fbfcf7;
  --color-mist: #edf5f1;
  --color-surface: #ffffff;
  --color-line: #d8e4da;
  /* 语义 */
  --color-success: #2f855a;
  --color-warning: #dd6b20;
  --color-error: #c53030;
  /* 任务类型识别色（emoji + 色彩双编码） */
  --color-task-watering: #3b82c4;
  --color-task-fertilizing: #a06a3c;
  --color-task-misting: #2f9c8a;
  --color-task-repotting: #d2773b;
  --color-task-pruning: #5c8a3a;
  --color-task-custom: #8a9690;
}
```

## 间距与圆角

- `--space-xs`: `4px`
- `--space-sm`: `8px`
- `--space-md`: `16px`
- `--space-lg`: `24px`
- `--space-xl`: `32px`
- 卡片默认圆角：`16px`
- Modal 圆角：`20px`

## 组件约束

- 主按钮使用填充态 CTA 色，次按钮使用边框态主色
- 植物卡片优先展示图片和下一个到期任务
- 待办卡片优先展示任务动作和完成按钮，不做大面积装饰
- 所有可点击元素必须有 `cursor-pointer` 和明确 hover/focus 态

## 响应式断点

- `375px`
- `768px`
- `1024px`
- `1440px`

## 无障碍基线

- 文本对比度不低于 4.5:1
- 焦点态可见
- 尊重 `prefers-reduced-motion`
- 任务类型图标采用 **emoji + 色彩双编码**（💧🧪🌫️ 等），颜色不作为唯一区分手段，以兼顾色盲用户
