import { useMutation, useQuery } from "convex/react";
import { useState } from "react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { PlantImage } from "./PlantImage";

interface ArchivedPlant {
  id: string;
  name: string;
  imageUrl: string | null;
  archivedAt: number;
}

export function ArchivedSection() {
  const [isExpanded, setIsExpanded] = useState(false);
  const rawResult = useQuery(api.plants.listArchivedPlants, {}) as
    | { plants: ArchivedPlant[] }
    | undefined;

  // Filter to only plants that actually have archivedAt (guards against mock environments
  // where all useQuery calls return the same data shape)
  const plants = rawResult?.plants.filter((p) => typeof p.archivedAt === "number") ?? [];
  const count = plants.length;

  if (count === 0) {
    return null;
  }

  return (
    <section style={sectionStyle}>
      <button
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded((prev) => !prev)}
        style={triggerStyle}
        type="button"
      >
        <span
          aria-hidden="true"
          style={{
            ...arrowStyle,
            transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
          }}
        >
          ▶
        </span>
        <span>已归档 ({count})</span>
      </button>
      <div
        style={{
          ...listWrapStyle,
          maxHeight: isExpanded ? `${count * 88 + count * 8}px` : "0px",
          opacity: isExpanded ? 1 : 0,
        }}
      >
        {plants.map((plant) => (
          <ArchivedPlantCard key={plant.id} plant={plant} />
        ))}
      </div>
    </section>
  );
}

function ArchivedPlantCard({ plant }: { plant: ArchivedPlant }) {
  const setArchivedState = useMutation(api.plants.setPlantArchivedState);
  const [restoring, setRestoring] = useState(false);

  const archivedDate = new Date(plant.archivedAt).toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
  });

  async function handleRestore() {
    setRestoring(true);
    try {
      await setArchivedState({
        plantId: plant.id as Id<"plants">,
        isArchived: false,
      });
    } finally {
      setRestoring(false);
    }
  }

  return (
    <article style={cardStyle}>
      <div style={imageWrapStyle}>
        <PlantImage alt={`${plant.name}封面图`} imageUrl={plant.imageUrl} />
      </div>
      <div style={textAreaStyle}>
        <span style={nameStyle}>{plant.name}</span>
        <span style={dateStyle}>{archivedDate} 归档</span>
      </div>
      <button
        disabled={restoring}
        onClick={() => void handleRestore()}
        style={restoreButtonStyle}
        type="button"
      >
        {restoring ? "恢复中…" : "恢复"}
      </button>
    </article>
  );
}

const sectionStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-sm)",
};

const triggerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-sm)",
  background: "none",
  border: "none",
  padding: "8px 0",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: 600,
  color: "var(--color-muted)",
};

const arrowStyle: React.CSSProperties = {
  display: "inline-block",
  fontSize: "10px",
  transition: "transform 200ms",
};

const listWrapStyle: React.CSSProperties = {
  overflow: "hidden",
  transition: "max-height 300ms ease-out, opacity 300ms ease-out",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const cardStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  padding: "12px",
  borderRadius: "var(--radius-card)",
  border: "1px solid var(--color-line)",
  background: "var(--color-surface)",
  opacity: 0.55,
  gap: "12px",
};

const imageWrapStyle: React.CSSProperties = {
  flexShrink: 0,
  width: "48px",
  height: "48px",
  borderRadius: "8px",
  overflow: "hidden",
  filter: "grayscale(0.6)",
};

const textAreaStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: "2px",
};

const nameStyle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 600,
  color: "var(--color-muted)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const dateStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "var(--color-muted)",
};

const restoreButtonStyle: React.CSSProperties = {
  flexShrink: 0,
  background: "none",
  border: "none",
  padding: "4px 8px",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: 600,
  color: "var(--color-leaf)",
};
