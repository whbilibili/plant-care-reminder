import { useQuery } from "convex/react";
import { CheckCircle, ChevronRight, Search } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { api } from "../../../convex/_generated/api";
import { EmptyState } from "../../components/ui/EmptyState";
import { Icon } from "../../components/ui/Icon";
import { navigate } from "../../app/router";
import { formatDueDate, formatTaskTypeLabel } from "../../lib/formatters";
import { getTaskTypeIcon, type CareTaskType } from "../tasks/taskTypes";
import { taskTypeColorVar } from "../tasks/TaskTypeBadge";
import { RoomFilterChips } from "../tasks/RoomFilterChips";
import { ArchivedSection } from "./ArchivedSection";
import { PlantImage } from "./PlantImage";

interface PlantListCardData {
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
        taskType: CareTaskType;
      }
    | null;
}

interface PlantListResponse {
  plants: PlantListCardData[];
}

export function PlantListPage() {
  const [searchText, setSearchText] = useState("");
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const result = useQuery(api.plants.listPlantsWithNextDue, {}) as PlantListResponse | undefined;
  const hasAnimatedRef = useRef(false);

  const shouldAnimate = result !== undefined && !hasAnimatedRef.current;
  if (result !== undefined && !hasAnimatedRef.current) {
    Promise.resolve().then(() => { hasAnimatedRef.current = true; });
  }

  const activePlants = useMemo(() => {
    return result?.plants ?? [];
  }, [result?.plants]);

  // 提取去重的房间位置列表（按数量降序）
  const roomLocations = useMemo(() => {
    const freq = new Map<string, number>();
    for (const plant of activePlants) {
      const loc = plant.location?.trim();
      if (loc) {
        freq.set(loc, (freq.get(loc) ?? 0) + 1);
      }
    }
    return [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([loc]) => loc);
  }, [activePlants]);

  // 先按搜索文本过滤，再按选中房间过滤
  const filteredPlants = useMemo(() => {
    let plants = activePlants;

    // 搜索过滤
    const query = searchText.trim().toLowerCase();
    if (query) {
      plants = plants.filter((plant) => {
        const haystack = [plant.name, plant.location ?? "", plant.description ?? ""]
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      });
    }

    // 房间过滤
    if (selectedRoom !== null) {
      plants = plants.filter((plant) => plant.location?.trim() === selectedRoom);
    }

    return plants;
  }, [activePlants, searchText, selectedRoom]);

  const plantCount = activePlants.length;

  // --- Loading state ---
  if (result === undefined) {
    return (
      <section style={pageStyle}>
        <header style={headerStyle}>
          <div>
            <h1 style={titleStyle}>植物看板</h1>
            <p style={subtitleStyle}>加载中…</p>
          </div>
        </header>
      </section>
    );
  }

  // --- Helpers to compute "last care" ---
  function getLastCareDaysAgo(plant: PlantListCardData): string | null {
    const ref = plant.creationTime;
    if (!ref) return null;
    const daysAgo = Math.floor((Date.now() - ref) / (1000 * 60 * 60 * 24));
    if (daysAgo <= 0) return "今天养护过";
    return `上次养护 ${daysAgo} 天前`;
  }

  function renderPlantCard(plant: PlantListCardData, index: number, animate: boolean) {
    const nextDueTitle = plant.nextDueTask
      ? formatTaskTypeLabel(plant.nextDueTask.taskType, plant.nextDueTask.customLabel)
      : null;
    const nextDueCopy = plant.nextDueTask
      ? formatDueDate(plant.nextDueTask.nextDueAt)
      : null;
    const taskType = plant.nextDueTask?.taskType ?? null;
    const isOverdue = plant.nextDueTask
      ? plant.nextDueTask.nextDueAt < Date.now()
      : false;
    const lastCare = getLastCareDaysAgo(plant);

    return (
      <article
        key={plant.id}
        className="plant-card"
        onClick={() => navigate(`/plants/${plant.id}`)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            navigate(`/plants/${plant.id}`);
          }
        }}
        aria-label={`查看${plant.name}详情`}
        style={{
          ...cardStyle,
          ...(animate ? getStaggerStyle(index) : undefined),
        }}
      >
        {/* Plant photo */}
        <div style={photoSlotStyle}>
          <PlantImage
            alt={`${plant.name}封面图`}
            imageUrl={plant.imageUrl}
            plantName={plant.name}
            slotSize={72}
          />
        </div>

        {/* Content middle */}
        <div style={cardContentStyle}>
          {/* Row 1: Name + Location inline */}
          <div style={nameRowStyle}>
            <h2 style={cardNameStyle}>{plant.name}</h2>
            {plant.location?.trim() ? (
              <span style={locationTagStyle}>{plant.location.trim()}</span>
            ) : null}
          </div>

          {/* Row 2: Next task pill or fallback */}
          <div style={taskRowStyle}>
            {nextDueTitle ? (
              <span
                style={{
                  ...pillStyle,
                  background: isOverdue
                    ? "rgba(235, 87, 87, 0.08)"
                    : "rgba(45, 140, 100, 0.08)",
                  color: isOverdue ? "var(--color-warning)" : "var(--color-leaf)",
                }}
              >
                {taskType ? (
                  <span style={{ display: "inline-flex", alignItems: "center", color: isOverdue ? "var(--color-warning)" : taskTypeColorVar(taskType) }}>
                    <Icon icon={getTaskTypeIcon(taskType)} size={14} />
                  </span>
                ) : null}
                <span>{nextDueCopy ? `${nextDueCopy} ${nextDueTitle}` : nextDueTitle}</span>
              </span>
            ) : (
              <span style={noCareStyle}>还没有养护任务</span>
            )}
            {lastCare ? <span style={lastCareInlineStyle}>{lastCare}</span> : null}
          </div>
        </div>

        {/* Chevron — vertically centered via parent alignItems:"center" */}
        <span style={chevronStyle} aria-hidden="true">
          <Icon icon={ChevronRight} size={18} colorVar="--color-muted" />
        </span>
      </article>
    );
  }

  return (
    <section style={pageStyle}>
      {/* Header */}
      <header style={headerStyle}>
        <div>
          <h1 style={titleStyle}>植物看板</h1>
          <p style={subtitleStyle}>
            {plantCount} 盆植物 · 家人一起照顾
          </p>
        </div>
        <button onClick={() => navigate("/plants/new")} style={addLinkStyle} type="button">
          + 添加
        </button>
      </header>

      {/* Search bar */}
      <div style={searchWrapStyle}>
        <span style={searchIconStyle}>
          <Icon icon={Search} size={16} colorVar="--color-muted" />
        </span>
        <input
          aria-label="搜索植物"
          autoComplete="off"
          className="plant-list-search"
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="按名称或位置搜索"
          style={searchInputStyle}
          type="text"
          value={searchText}
        />
      </div>

      {/* Room filter chips */}
      {roomLocations.length > 0 && (
        <RoomFilterChips
          locations={roomLocations}
          selected={selectedRoom}
          onChange={setSelectedRoom}
        />
      )}

      {/* Plant list */}
      {activePlants.length === 0 ? (
        <EmptyState
          badge="植物"
          title="你的家庭植物看板还是空的"
          description="先添加第一盆植物，后续才能继续配置养护提醒。"
          minHeight="200px"
        />
      ) : filteredPlants.length === 0 ? (
        <EmptyState
          badge="搜索"
          title="没有找到匹配的植物"
          description="试试输入植物名称，或者它所在的位置。"
          minHeight="200px"
        />
      ) : (
        <div style={listStyle}>
          {filteredPlants.map((plant, index) => renderPlantCard(plant, index, shouldAnimate))}
        </div>
      )}

      {/* Archived section (collapsed) */}
      <ArchivedSection />

      {/* Sync hint */}
      <div style={syncHintStyle}>
        <div style={syncHintTopStyle}>
          <Icon icon={CheckCircle} size={14} colorVar="--color-leaf" />
          <span>养护记录已与家人同步</span>
        </div>
        <p style={syncHintSubStyle}>所有更新都会自动同步到家庭空间</p>
      </div>

      {/* Bottom spacer for fixed tab bar */}
      <div style={{ height: "80px" }} />
    </section>
  );
}

// ====================== STYLES ======================

const pageStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-md)",
  minWidth: 0,
  paddingBottom: "env(safe-area-inset-bottom, 0px)",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "var(--space-md)",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-heading)",
  fontSize: "28px",
  fontWeight: 800,
  lineHeight: 1.2,
  color: "var(--color-ink)",
};

const subtitleStyle: React.CSSProperties = {
  margin: "4px 0 0",
  fontSize: "14px",
  fontWeight: 400,
  color: "var(--color-muted)",
};

const addLinkStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  padding: "4px 0",
  margin: 0,
  cursor: "pointer",
  fontFamily: "var(--font-body)",
  fontSize: "15px",
  fontWeight: 600,
  color: "var(--color-leaf)",
  whiteSpace: "nowrap",
};

// --- Search ---

const searchWrapStyle: React.CSSProperties = {
  position: "relative",
  display: "flex",
  alignItems: "center",
};

const searchIconStyle: React.CSSProperties = {
  position: "absolute",
  left: "12px",
  display: "flex",
  alignItems: "center",
  pointerEvents: "none",
};

const searchInputStyle: React.CSSProperties = {
  height: "44px",
  width: "100%",
  boxSizing: "border-box",
  padding: "0 var(--space-md) 0 38px",
  borderRadius: "var(--radius-pill)",
  border: "none",
  outline: "none",
  background: "var(--color-mist)",
  color: "var(--color-ink)",
  fontFamily: "var(--font-body)",
  fontSize: "14px",
};

// --- List & Cards ---

const listStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-sm)",
  minWidth: 0,
};

const cardStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  padding: "12px",
  borderRadius: "var(--radius-card)",
  border: "1px solid var(--color-line)",
  background: "var(--color-surface)",
  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  cursor: "pointer",
  gap: "12px",
  overflow: "hidden",
};

const photoSlotStyle: React.CSSProperties = {
  flexShrink: 0,
  width: "72px",
  height: "72px",
  borderRadius: "12px",
  overflow: "hidden",
  background: "var(--color-mist)",
};

const cardContentStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  justifyContent: "center",
};

const nameRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: "8px",
  minWidth: 0,
};

const cardNameStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-heading)",
  fontSize: "16px",
  fontWeight: 700,
  lineHeight: 1.3,
  color: "var(--color-ink)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  flexShrink: 1,
  minWidth: 0,
};

const locationTagStyle: React.CSSProperties = {
  flexShrink: 0,
  fontSize: "11px",
  color: "var(--color-muted)",
  background: "var(--color-surface-secondary, var(--color-mist))",
  padding: "2px 6px",
  borderRadius: "4px",
  whiteSpace: "nowrap",
  maxWidth: "80px",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const taskRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  flexWrap: "wrap",
};

const chevronStyle: React.CSSProperties = {
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
};

const pillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "5px",
  padding: "4px 10px",
  borderRadius: "var(--radius-pill)",
  fontSize: "13px",
  fontWeight: 600,
  lineHeight: 1.3,
};

const noCareStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "var(--color-muted)",
  fontStyle: "italic",
};

const lastCareInlineStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "var(--color-muted)",
};

// --- Sync hint ---

const syncHintStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "4px",
  padding: "var(--space-md) 0",
};

const syncHintTopStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  fontSize: "13px",
  fontWeight: 600,
  color: "var(--color-ink)",
};

const syncHintSubStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "12px",
  color: "var(--color-muted)",
};

// --- Stagger animation ---

const STAGGER_DELAY_MS = 60;
const STAGGER_CAP = 6;
const CARD_DURATION_MS = 280;

function getStaggerStyle(index: number): React.CSSProperties {
  const delay = Math.min(index, STAGGER_CAP) * STAGGER_DELAY_MS;
  return {
    opacity: 0,
    transform: "translateY(10px)",
    animation: `plantCardFadeIn ${CARD_DURATION_MS}ms cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}ms forwards`,
  };
}

// Inject keyframe + search focus styles once (idempotent)
if (typeof document !== "undefined" && !document.getElementById("plant-board-keyframes")) {
  const style = document.createElement("style");
  style.id = "plant-board-keyframes";
  style.textContent = `
@keyframes plantCardFadeIn {
  to { opacity: 1; transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  @keyframes plantCardFadeIn {
    from, to { opacity: 1; transform: none; }
  }
}
.plant-list-search:focus {
  box-shadow: inset 0 0 0 2px var(--color-leaf);
}
.plant-card {
  transition: transform 160ms ease, box-shadow 160ms ease;
}
.plant-card:active {
  transform: scale(0.98);
  box-shadow: 0 4px 16px rgba(0,0,0,0.08);
}
@media (prefers-reduced-motion: reduce) {
  .plant-card:active {
    transform: none;
  }
}`;
  document.head.appendChild(style);
}
