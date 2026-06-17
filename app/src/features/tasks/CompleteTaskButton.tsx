import { useMutation } from "convex/react";
import { useState } from "react";
import { Check, Loader2 } from "lucide-react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { prefersReducedMotion, triggerHaptic } from "../../lib/motion";
import { buildUndoPayload, type CompletionUndoPayload } from "./undoComplete";

interface CompleteTaskButtonProps {
  appearance?: "default" | "circle";
  /** 完成时迸发的小确幸 emoji（按任务类型传入水滴/叶子等），默认叶子。 */
  celebrateEmoji?: string;
  onCompleted?: (result: {
    lastCompletedAt: number;
    nextDueAt: number;
    taskId: string;
    undo: CompletionUndoPayload;
  }) => void;
  taskId: string;
}

export function CompleteTaskButton({
  appearance = "default",
  celebrateEmoji = "🍃",
  onCompleted,
  taskId,
}: CompleteTaskButtonProps) {
  const completeTask = useMutation(api.tasks.completePlantTask);
  const [status, setStatus] = useState<"idle" | "pending" | "error" | "done">("idle");
  // 完成微动效：reduced-motion 下不迸发 emoji，退化为即时状态切换。
  const [showFx, setShowFx] = useState(false);

  async function handleComplete() {
    setStatus("pending");

    try {
      const result = await completeTask({ taskId: taskId as Id<"plantTasks"> });
      setStatus("done");
      // 完成瞬间：移动端轻震 + 奖赏微动效（均尊重 reduced-motion）。
      triggerHaptic();
      if (!prefersReducedMotion()) {
        setShowFx(true);
      }
      onCompleted?.({
        lastCompletedAt: result.lastCompletedAt,
        nextDueAt: result.nextDueAt,
        taskId: result.taskId,
        undo: buildUndoPayload(result),
      });
    } catch {
      setStatus("error");
    }
  }

  const isCircle = appearance === "circle";

  const isDone = status === "done";
  const isPending = status === "pending";

  return (
    <div style={isCircle ? circleWrapStyle : wrapStyle}>
      <div style={buttonShellStyle}>
        <Button
          aria-label="完成"
          disabled={isPending || isDone}
          fullWidth={false}
          onClick={handleComplete}
          style={isCircle ? (isDone ? circleButtonDoneStyle : circleButtonStyle) : (isDone ? doneButtonStyle : undefined)}
          type="button"
        >
          {isCircle ? (
            <span aria-hidden="true" style={iconInlineStyle}>
              {isPending ? (
                <Icon className="complete-spin" icon={Loader2} size={18} />
              ) : (
                <Icon icon={Check} size={18} />
              )}
            </span>
          ) : isDone ? (
            <span aria-hidden="true" style={iconTextStyle}>
              <Icon icon={Check} size={16} /> 已完成
            </span>
          ) : isPending ? (
            <span aria-hidden="true" style={iconTextStyle}>
              <Icon className="complete-spin" icon={Loader2} size={16} /> 完成中
            </span>
          ) : (
            "完成"
          )}
        </Button>
        {showFx ? (
          <span
            aria-hidden="true"
            onAnimationEnd={() => setShowFx(false)}
            style={fxStyle}
          >
            {celebrateEmoji}
          </span>
        ) : null}
      </div>
      {status === "error" ? (
        <p role="alert" style={errorStyle}>
          完成失败，请重试。
        </p>
      ) : null}
    </div>
  );
}

const wrapStyle: React.CSSProperties = {
  display: "grid",
  gap: "6px",
};

// 圆形完成按钮内图标居中容器。
const iconInlineStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  lineHeight: 1,
};

// 文字态按钮内的图标 + 文案行（图标与文字基线对齐）。
const iconTextStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  lineHeight: 1,
};

const circleWrapStyle: React.CSSProperties = {
  display: "grid",
  gap: "4px",
  justifyItems: "center",
};

const circleButtonStyle: React.CSSProperties = {
  width: "44px",
  height: "44px",
  minHeight: "44px",
  padding: 0,
  borderRadius: "var(--radius-pill)",
  background: "var(--color-surface)",
  border: "2px solid var(--color-leaf-light)",
  color: "var(--color-leaf-light)",
  fontSize: "20px",
  lineHeight: 1,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "none",
};

const circleButtonDoneStyle: React.CSSProperties = {
  ...circleButtonStyle,
  background: "var(--color-success)",
  color: "var(--color-surface)",
  border: "2px solid var(--color-success)",
};

const doneButtonStyle: React.CSSProperties = {
  background: "var(--color-success)",
  color: "var(--color-surface)",
  borderColor: "var(--color-success)",
};

const errorStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--color-error)",
  fontSize: "0.84rem",
  lineHeight: 1.5,
};

// 微动效容器：相对定位以承载从按钮中心上浮的 emoji。
const buttonShellStyle: React.CSSProperties = {
  position: "relative",
  display: "inline-flex",
};

// 完成瞬间从按钮上方浮起并淡出的小确幸 emoji；reduced-motion 下不渲染。
// 动画 keyframes 见 tokens.css 的 .complete-fx-rise（全局兜底会把时长压到约 0）。
const fxStyle: React.CSSProperties = {
  position: "absolute",
  left: "50%",
  top: "50%",
  transform: "translate(-50%, -50%)",
  fontSize: "18px",
  lineHeight: 1,
  pointerEvents: "none",
  animation: "complete-fx-rise 600ms ease-out forwards",
};
