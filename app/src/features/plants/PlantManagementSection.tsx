import { useState } from "react";
import { useMutation } from "convex/react";
import { Archive, Trash2 } from "lucide-react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Icon } from "../../components/ui/Icon";
import { ConfirmSheet } from "../../components/ui/ConfirmSheet";

interface PlantManagementSectionProps {
  isArchived: boolean;
  onArchivedStateChange: (next: { archivedAt: number | null; isArchived: boolean }) => void;
  onDeleted: () => void;
  plantId: string;
  plantName: string;
}

/**
 * 详情页底部"管理区"（T3/T5/T8）：归档 + 删除。
 * 与主内容物理隔离（分隔线 + 区块标题），降低误触风险。
 * 删除使用 ConfirmSheet danger-solid。
 */
export function PlantManagementSection({
  isArchived,
  onArchivedStateChange,
  onDeleted,
  plantId,
  plantName,
}: PlantManagementSectionProps) {
  const setArchivedState = useMutation(api.plants.setPlantArchivedState);
  const deletePlant = useMutation(api.plants.deletePlant);

  const [confirmAction, setConfirmAction] = useState<"archive" | "delete" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleArchive() {
    setIsSubmitting(true);
    try {
      await setArchivedState({
        plantId: plantId as Id<"plants">,
        isArchived: !isArchived,
      });
      onArchivedStateChange({
        isArchived: !isArchived,
        archivedAt: isArchived ? null : Date.now(),
      });
      setConfirmAction(null);
    } catch {
      // 静默处理
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    setIsSubmitting(true);
    try {
      await deletePlant({ plantId: plantId as Id<"plants"> });
      onDeleted();
    } catch {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <section style={sectionStyle}>
        <div style={linkRowStyle}>
          <button
            onClick={() => setConfirmAction("archive")}
            style={linkButtonStyle}
            type="button"
          >
            <Icon icon={Archive} size={14} colorVar="--color-muted" />
            <span>{isArchived ? "恢复到看板" : "归档"}</span>
          </button>
          <span style={linkDividerStyle}>|</span>
          <button
            onClick={() => setConfirmAction("delete")}
            style={linkButtonDangerStyle}
            type="button"
          >
            <Icon icon={Trash2} size={14} />
            <span>删除</span>
          </button>
        </div>
      </section>

      {/* 归档确认 */}
      {confirmAction === "archive" && (
        <ConfirmSheet
          title={isArchived ? "确认恢复这盆植物吗？" : "确认归档这盆植物吗？"}
          description={
            isArchived
              ? `${plantName} 会重新回到家庭看板，养护任务和历史记录都会保留。`
              : `${plantName} 会从家庭看板隐藏，但养护任务和完成记录仍会保留。`
          }
          confirmLabel={isArchived ? "确认恢复" : "确认归档"}
          variant={isArchived ? "primary" : "danger-outline"}
          isSubmitting={isSubmitting}
          onConfirm={() => void handleArchive()}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {/* 删除确认 */}
      {confirmAction === "delete" && (
        <ConfirmSheet
          title={`确认删除"${plantName}"？`}
          description="删除后该植物及其全部养护记录将无法恢复。"
          confirmLabel={isSubmitting ? "删除中…" : "删除"}
          cancelLabel="取消"
          variant="danger-solid"
          isSubmitting={isSubmitting}
          onConfirm={() => void handleDelete()}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </>
  );
}

const sectionStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
};

const linkRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
};

const linkButtonStyle: React.CSSProperties = {
  appearance: "none",
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  padding: "6px 0",
  border: "none",
  background: "transparent",
  fontSize: "13px",
  fontWeight: 500,
  color: "var(--color-muted)",
  cursor: "pointer",
};

const linkButtonDangerStyle: React.CSSProperties = {
  ...linkButtonStyle,
  color: "var(--color-error, #E53935)",
};

const linkDividerStyle: React.CSSProperties = {
  color: "var(--color-line)",
  fontSize: "13px",
};
