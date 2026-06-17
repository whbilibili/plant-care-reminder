import { useMutation } from "convex/react";
import { useState } from "react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { PostponeConfirmSheet } from "./PostponeConfirmSheet";

interface PostponeButtonProps {
  /** 任务当前下次到期时间，用于在确认 sheet 中本地推导逾期天数与预览日期。 */
  currentNextDueAt: number;
  onPostponed?: (result: {
    consecutivePostponeCount: number;
    nextDueAt: number;
    taskId: string;
  }) => void;
  taskId: string;
}

/**
 * 推迟入口（PRD §6.1）：视觉权重低于完成按钮，为纯文本链接样式，
 * 点击后弹出轻确认 sheet，确认前透明告知推迟后果。
 */
export function PostponeButton({ currentNextDueAt, onPostponed, taskId }: PostponeButtonProps) {
  const postponeTask = useMutation(api.tasks.postponePlantTask);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "pending" | "error">("idle");

  async function handleConfirm() {
    setStatus("pending");

    try {
      const result = await postponeTask({ taskId: taskId as Id<"plantTasks"> });
      setStatus("idle");
      setIsSheetOpen(false);
      onPostponed?.(result);
    } catch {
      setStatus("error");
    }
  }

  return (
    <div style={wrapStyle}>
      <button onClick={() => setIsSheetOpen(true)} style={triggerStyle} type="button">
        推迟一下
      </button>
      {status === "error" ? (
        <p role="alert" style={errorStyle}>
          推迟失败，请重试。
        </p>
      ) : null}
      {isSheetOpen ? (
        <PostponeConfirmSheet
          currentNextDueAt={currentNextDueAt}
          isSubmitting={status === "pending"}
          onCancel={() => {
            setStatus("idle");
            setIsSheetOpen(false);
          }}
          onConfirm={handleConfirm}
        />
      ) : null}
    </div>
  );
}

const wrapStyle: React.CSSProperties = {
  display: "grid",
  gap: "4px",
  justifyItems: "center",
};

const triggerStyle: React.CSSProperties = {
  appearance: "none",
  background: "transparent",
  border: "none",
  padding: "4px 8px",
  color: "var(--color-muted)",
  fontSize: "0.82rem",
  fontWeight: 500,
  textDecoration: "underline",
  textUnderlineOffset: "3px",
  cursor: "pointer",
};

const errorStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--color-error)",
  fontSize: "0.8rem",
  lineHeight: 1.5,
};
