import type { CSSProperties } from "react";
import { useMemo, useState } from "react";

import { GroupHeader } from "./GroupHeader";

interface PlantGroupViewProps<T extends { location: string | null }> {
  /** 已分组的植物数据。 */
  plants: T[];
  /** 搜索过滤后的植物（用于分组视图下搜索仍生效）。 */
  filteredPlants: T[];
  /** 渲染单个植物卡片。 */
  renderPlant: (plant: T, index: number) => React.ReactNode;
}

interface PlantGroupData<T> {
  location: string | null;
  displayName: string;
  plants: T[];
}

/**
 * 按 location 字段分组植物。
 * 规则：按数量降序排列；null/undefined 归入"未分组"且永远在最后。
 */
function groupPlantsByLocation<T extends { location: string | null }>(
  plants: T[],
): PlantGroupData<T>[] {
  const map = new Map<string | null, T[]>();

  for (const plant of plants) {
    const key = plant.location?.trim() || null;
    const group = map.get(key);
    if (group) {
      group.push(plant);
    } else {
      map.set(key, [plant]);
    }
  }

  const groups: PlantGroupData<T>[] = [];
  let ungrouped: PlantGroupData<T> | null = null;

  for (const [location, items] of map) {
    const entry: PlantGroupData<T> = {
      location,
      displayName: location ?? "未分组",
      plants: items,
    };
    if (location === null) {
      ungrouped = entry;
    } else {
      groups.push(entry);
    }
  }

  // 按数量降序
  groups.sort((a, b) => b.plants.length - a.plants.length);

  // 未分组永远在最后
  if (ungrouped) {
    groups.push(ungrouped);
  }

  return groups;
}

/**
 * PlantGroupView — 分组视图组件。
 *
 * 接收植物列表，按 location 分组渲染 GroupHeader + 组内植物卡片。
 * 含分组算法（按数量降序，未分组在最后）和折叠状态管理。
 */
export function PlantGroupView<T extends { location: string | null }>({
  plants,
  filteredPlants,
  renderPlant,
}: PlantGroupViewProps<T>) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string | null>>(new Set());

  const groups = useMemo(() => groupPlantsByLocation(filteredPlants), [filteredPlants]);

  // 所有植物都没有 location 时，展示引导文案
  const allUngrouped = plants.length > 0 && plants.every((p) => !p.location?.trim());

  function toggleGroup(location: string | null) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(location)) {
        next.delete(location);
      } else {
        next.add(location);
      }
      return next;
    });
  }

  if (allUngrouped) {
    return (
      <div style={hintContainerStyle}>
        <p style={hintTextStyle}>给植物设置位置，按房间管理更方便</p>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {groups.map((group) => {
        // 搜索过滤后空组隐藏
        if (group.plants.length === 0) return null;

        const isExpanded = !collapsedGroups.has(group.location);

        return (
          <div key={group.location ?? "__ungrouped"} style={groupBlockStyle}>
            <GroupHeader
              count={group.plants.length}
              isExpanded={isExpanded}
              onToggle={() => toggleGroup(group.location)}
              title={group.displayName}
            />
            {isExpanded && (
              <div style={groupContentStyle}>
                {group.plants.map((plant, index) => renderPlant(plant, index))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-sm)",
};

const groupBlockStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-sm)",
};

const groupContentStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-md)",
};

const hintContainerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "var(--space-lg) var(--space-md)",
};

const hintTextStyle: CSSProperties = {
  fontSize: "14px",
  color: "var(--color-muted)",
  textAlign: "center",
};
