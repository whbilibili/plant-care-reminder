import { useEffect, useState } from "react";
import { NotebookPen } from "lucide-react";

import { Icon } from "../../components/ui/Icon";

interface PlantArchiveSectionProps {
  plant: {
    createdAt: number;
    description: string | null;
    note: string | null;
    updatedAt: number;
  };
  plantId: string;
}

const timestampFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

function formatTimestamp(value: number) {
  return timestampFormatter.format(new Date(value));
}

function getStorageKey(plantId: string) {
  return `plant-detail:archive-collapsed:${plantId}`;
}

export function PlantArchiveSection({ plant, plantId }: PlantArchiveSectionProps) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const stored = localStorage.getItem(getStorageKey(plantId));
      // 默认收起（stored === null 时也收起）
      return stored !== "false";
    } catch {
      return true;
    }
  });

  // plantId 变化时重新读取
  useEffect(() => {
    try {
      const stored = localStorage.getItem(getStorageKey(plantId));
      setCollapsed(stored !== "false");
    } catch {
      setCollapsed(true);
    }
  }, [plantId]);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(getStorageKey(plantId), String(next));
    } catch {
      // 静默处理
    }
  }

  const description = plant.description?.trim();
  const note = plant.note?.trim();
  const hasContent = Boolean(description || note);

  return (
    <section style={containerStyle}>
      {/* 触发器行 */}
      <button
        aria-controls={`plant-archive-content-${plantId}`}
        aria-expanded={!collapsed}
        onClick={toggleCollapsed}
        style={triggerStyle}
        type="button"
      >
        <span style={triggerLabelStyle}>
          <Icon icon={NotebookPen} size={15} />
          植物档案
        </span>
        <span aria-hidden="true" style={triggerArrowStyle}>
          {collapsed ? "▾" : "▴"}
        </span>
      </button>

      {/* 可折叠内容区 */}
      <div
        id={`plant-archive-content-${plantId}`}
        style={{
          ...contentWrapStyle,
          gridTemplateRows: collapsed ? "0fr" : "1fr",
        }}
      >
        <div style={contentInnerStyle}>
          {hasContent ? (
            <div style={blocksStyle}>
              {description && (
                <div style={blockStyle}>
                  <p style={blockLabelStyle}>描述</p>
                  <p style={blockTextStyle}>{description}</p>
                </div>
              )}
              {note && (
                <div style={blockStyle}>
                  <p style={blockLabelStyle}>养护备注</p>
                  <p style={blockTextStyle}>{note}</p>
                </div>
              )}
            </div>
          ) : (
            <p style={emptyStyle}>暂无描述和备注，可以在编辑页面补充。</p>
          )}

          {/* 时间信息 */}
          <div style={timeInfoStyle}>
            <p style={timeTextStyle}>
              创建于 {formatTimestamp(plant.createdAt)}
              {plant.updatedAt !== plant.createdAt && (
                <> · 更新于 {formatTimestamp(plant.updatedAt)}</>
              )}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

const containerStyle: React.CSSProperties = {
  background: "var(--color-surface)",
  borderRadius: "var(--radius-card)",
  border: "1px solid var(--color-line)",
  overflow: "hidden",
};

const triggerStyle: React.CSSProperties = {
  appearance: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
  height: "44px",
  padding: "0 var(--space-md)",
  border: "none",
  background: "transparent",
  cursor: "pointer",
};

const triggerLabelStyle: React.CSSProperties = {
display: "inline-flex",
alignItems: "center",
gap: "6px",
fontSize: "14px",
fontWeight: 600,
color: "var(--color-ink)",
};

const triggerArrowStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "var(--color-muted)",
};

const contentWrapStyle: React.CSSProperties = {
  display: "grid",
  transition: "grid-template-rows 300ms ease-out",
};

const contentInnerStyle: React.CSSProperties = {
  overflow: "hidden",
  minHeight: 0,
};

const blocksStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-md)",
  padding: "0 var(--space-md) var(--space-md)",
};

const blockStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
};

const blockLabelStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "12px",
  fontWeight: 600,
  color: "var(--color-leaf-light)",
};

const blockTextStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "14px",
  fontWeight: 400,
  lineHeight: 1.6,
  color: "var(--color-muted)",
};

const emptyStyle: React.CSSProperties = {
  margin: 0,
  padding: "0 var(--space-md) var(--space-md)",
  fontSize: "13px",
  fontWeight: 400,
  fontStyle: "italic",
  color: "var(--color-muted)",
};

const timeInfoStyle: React.CSSProperties = {
  borderTop: "1px solid var(--color-line)",
  padding: "var(--space-sm) var(--space-md)",
};

const timeTextStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "12px",
  fontWeight: 400,
  color: "var(--color-muted)",
};
