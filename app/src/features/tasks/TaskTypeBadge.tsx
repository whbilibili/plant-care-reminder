import { Icon } from "../../components/ui/Icon";
import { getTaskTypeIcon, type CareTaskType } from "./taskTypes";

/**
 * 任务类型色彩映射：token 色编码。
 * 色值一律引用 tokens.css 的 --color-task-* 变量，禁止行内 #hex。
 * 图标来源统一收口到 taskTypes.ts 的 taskTypeIcon（ICON-003/004），此处不再维护 emoji。
 */
const taskTypeColorVars: Record<CareTaskType, string> = {
  watering: "var(--color-task-watering)",
  fertilizing: "var(--color-task-fertilizing)",
  misting: "var(--color-task-misting)",
  repotting: "var(--color-task-repotting)",
  pruning: "var(--color-task-pruning)",
  custom: "var(--color-task-custom)",
};

export function taskTypeColorVar(taskType: CareTaskType): string {
  return taskTypeColorVars[taskType];
}

interface TaskTypeBadgeProps {
  taskType: CareTaskType;
}

/**
 * 缩略图右下角的类型小圆点角标，线性图标 + 类型色描边，
 * 让用户扫一眼即知任务类型，而非读文字。静态识别元素，无动效。
 */
export function TaskTypeBadge({ taskType }: TaskTypeBadgeProps) {
  const colorVar = taskTypeColorVars[taskType];

  return (
    <span
      aria-hidden="true"
      style={{
        ...badgeStyle,
        borderColor: colorVar,
        boxShadow: `0 0 0 1px ${colorVar}`,
        color: colorVar,
      }}
    >
      <Icon icon={getTaskTypeIcon(taskType)} size={11} strokeWidth={2.25} />
    </span>
  );
}

const badgeStyle: React.CSSProperties = {
  position: "absolute",
  right: "-2px",
  bottom: "-2px",
  width: "18px",
  height: "18px",
  borderRadius: "var(--radius-pill)",
  background: "var(--color-surface)",
  borderWidth: "1.5px",
  borderStyle: "solid",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  lineHeight: 1,
};
