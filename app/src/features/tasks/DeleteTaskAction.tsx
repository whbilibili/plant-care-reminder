import { useState } from "react";
import { useMutation } from "convex/react";
import { Trash2 } from "lucide-react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Icon } from "../../components/ui/Icon";
import { ConfirmSheet } from "../../components/ui/ConfirmSheet";

interface DeleteTaskActionProps {
  onDeleted: () => void;
  taskId: string;
  taskLabel: string;
}

/**
 * 删除任务入口 + ConfirmSheet danger-solid 确认（反馈8 统一方案）。
 *
 * 入口：文字型 danger 按钮（克制红，仅图标+文字）。
 * 确认：底部抽屉 ConfirmSheet danger-solid，eyebrow+主按钮为 error 红。
 */
export function DeleteTaskAction({ onDeleted, taskId, taskLabel }: DeleteTaskActionProps) {
  const deletePlantTask = useMutation(api.tasks.deletePlantTask);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleDelete() {
    setIsSubmitting(true);
    try {
      await deletePlantTask({ taskId: taskId as Id<"plantTasks"> });
      onDeleted();
    } catch {
      // 静默处理，ConfirmSheet 会保持打开状态让用户重试
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        style={triggerStyle}
        type="button"
      >
        <Icon icon={Trash2} size={18} colorVar="--color-error" />
        <span>删除任务</span>
      </button>

      {showConfirm && (
        <ConfirmSheet
          title={`确认删除"${taskLabel}"？`}
          description="删除后，这条养护提醒会从这盆植物上彻底消失，无法恢复。"
          confirmLabel={isSubmitting ? "删除中…" : "删除"}
          cancelLabel="取消"
          variant="danger-solid"
          isSubmitting={isSubmitting}
          onConfirm={() => void handleDelete()}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  );
}

const triggerStyle: React.CSSProperties = {
  appearance: "none",
  display: "inline-flex",
  alignItems: "center",
  gap: "var(--space-xs)",
  padding: "var(--space-sm) var(--space-md)",
  border: "1px solid var(--color-line)",
  borderRadius: "var(--radius-button)",
  background: "transparent",
  color: "var(--color-error)",
  fontSize: "14px",
  fontWeight: 600,
  cursor: "pointer",
};
