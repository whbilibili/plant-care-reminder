import { ChevronRight } from "lucide-react";

import { Icon } from "../../components/ui/Icon";
import { formatDueDate, formatTaskTypeLabel } from "../../lib/formatters";
import { getTaskTypeIcon } from "../tasks/taskTypes";
import { taskTypeColorVar } from "../tasks/TaskTypeBadge";
import { PlantImage } from "./PlantImage";

export interface PlantListCardData {
  creationTime: number;
  description: string | null;
  id: string;
  imageStorageId: string | null;
  imageUrl: string | null;
  location: string | null;
  name: string;
  nextDueTask:
    | {
        customLabel: string | null;
        nextDueAt: number;
        taskType: "watering" | "fertilizing" | "misting" | "repotting" | "pruning" | "custom";
      }
    | null;
}

interface PlantCardProps {
  onOpen: (plantId: string) => void;
  plant: PlantListCardData;
}

/**
 * 列表卡：整卡可点进入详情（T1/T5 —— 去铅笔、去⋯菜单）。
 * 右侧 chevron-right 指引"可进入"。
 */
export function PlantCard({ onOpen, plant }: PlantCardProps) {
  const isOverdue = plant.nextDueTask ? plant.nextDueTask.nextDueAt < Date.now() : false;
  const nextDueTitle = plant.nextDueTask
    ? formatTaskTypeLabel(plant.nextDueTask.taskType, plant.nextDueTask.customLabel)
    : null;
  const nextDueCopy = plant.nextDueTask ? formatDueDate(plant.nextDueTask.nextDueAt) : null;
  const nextDueTaskType = plant.nextDueTask?.taskType ?? null;

  const resolvedCardStyle: React.CSSProperties = isOverdue
    ? { ...cardStyle, borderLeft: "3px solid var(--color-warning)", paddingLeft: "9px" }
    : cardStyle;

  return (
    <article
      className="plant-card"
      onClick={() => onOpen(plant.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(plant.id);
        }
      }}
      aria-label={`查看${plant.name}详情`}
      style={resolvedCardStyle}
    >
      <div style={imageWrapStyle}>
        <PlantImage alt={`${plant.name}封面图`} imageUrl={plant.imageUrl} plantName={plant.name} slotSize={80} />
      </div>
      <div style={textAreaStyle}>
        <h2 style={nameStyle}>{plant.name}</h2>
        {plant.location?.trim() ? (
          <p style={locationStyle}>{plant.location.trim()}</p>
        ) : null}
        <div style={statusLineStyle}>
          {nextDueTitle ? (
            <>
              <span style={carePillStyle}>
                {nextDueTaskType ? (
                  <span
                    aria-hidden="true"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      color: taskTypeColorVar(nextDueTaskType),
                    }}
                  >
                    <Icon icon={getTaskTypeIcon(nextDueTaskType)} size={13} />
                  </span>
                ) : null}
                {nextDueTitle}
              </span>
              {nextDueCopy ? (
                <span style={isOverdue ? overdueCopyStyle : dueCopyStyle}>{nextDueCopy}</span>
              ) : null}
            </>
          ) : (
            <span style={noCareStyle}>还没有养护任务</span>
          )}
        </div>
      </div>
      <span style={chevronStyle} aria-hidden="true">
        <Icon icon={ChevronRight} size={18} colorVar="--color-muted" />
      </span>
    </article>
  );
}

const cardStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  padding: "var(--space-md)",
  borderRadius: "var(--radius-card)",
  border: "1px solid var(--color-line)",
  background: "var(--color-surface)",
  boxShadow: "var(--shadow-card)",
  minHeight: "104px",
  cursor: "pointer",
  gap: "var(--space-md)",
  // 防止内容溢出卡片（圆角裁切 + 阻止撑出父 grid）
  overflow: "hidden",
};

const imageWrapStyle: React.CSSProperties = {
  flexShrink: 0,
  width: "80px",
  height: "80px",
  borderRadius: "12px",
  overflow: "hidden",
  background: "var(--color-mist)",
  position: "relative",
};

const textAreaStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: "3px",
};

const nameStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-heading)",
  fontSize: "16px",
  fontWeight: 700,
  lineHeight: 1.3,
  color: "var(--color-ink)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const locationStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-body)",
  fontSize: "12px",
  fontWeight: 400,
  color: "var(--color-muted)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const statusLineStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "var(--space-sm)",
  marginTop: "2px",
};

const carePillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  padding: "2px 8px",
  borderRadius: "var(--radius-pill)",
  background: "var(--color-mist)",
  color: "var(--color-leaf-light)",
  fontSize: "12px",
  fontWeight: 700,
};

const noCareStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "var(--color-muted)",
  fontStyle: "italic",
};

const dueCopyStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "var(--color-muted)",
};

const overdueCopyStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 600,
  color: "var(--color-warning)",
};

const chevronStyle: React.CSSProperties = {
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

// --- Press feedback CSS injection (idempotent) ---
if (typeof document !== "undefined" && !document.getElementById("plant-card-press-css")) {
  const style = document.createElement("style");
  style.id = "plant-card-press-css";
  style.textContent = `
.plant-card {
  transition: transform 160ms ease, box-shadow 160ms ease;
}
.plant-card:active {
  transform: scale(0.99);
  box-shadow: var(--shadow-card-emphasis);
}
@media (prefers-reduced-motion: reduce) {
  .plant-card:active {
    transform: none;
  }
}`;
  document.head.appendChild(style);
}
