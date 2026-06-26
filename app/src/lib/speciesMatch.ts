/**
 * Species Matching Service — KNOW-003
 *
 * 纯函数，不依赖副作用，用于在前端本地 plant-species.json 中模糊匹配物种。
 *
 * 匹配优先级（降序）：
 *   1. 精确匹配（names 中某一项 === query）
 *   2. 前缀匹配（names 中某一项.startsWith(query)）
 *   3. 包含匹配（names 中某一项.includes(query)）
 *
 * 触发阈值：query.length >= 2
 * 大小写不敏感（toLowerCase）。
 */

import type { PlantSpecies } from "../data/plant-species.types";

type MatchPriority = 1 | 2 | 3;

interface ScoredMatch {
  species: PlantSpecies;
  priority: MatchPriority;
}

/**
 * 在物种列表中搜索与 query 匹配的条目。
 *
 * @param query - 用户输入的搜索词
 * @param speciesList - 物种知识库数据
 * @param maxResults - 最大返回条目数，默认 3
 * @returns 按优先级排序的匹配结果
 */
export function matchSpecies(
  query: string,
  speciesList: PlantSpecies[],
  maxResults: number = 3,
): PlantSpecies[] {
  if (!query || query.length < 2) {
    return [];
  }

  const normalizedQuery = query.toLowerCase().trim();
  if (normalizedQuery.length < 2) {
    return [];
  }

  const matches: ScoredMatch[] = [];

  for (const species of speciesList) {
    let bestPriority: MatchPriority | null = null;

    for (const name of species.names) {
      const normalizedName = name.toLowerCase();

      if (normalizedName === normalizedQuery) {
        bestPriority = 1;
        break; // 精确匹配是最高优先级，无需继续
      }

      if (normalizedName.startsWith(normalizedQuery)) {
        if (bestPriority === null || bestPriority > 2) {
          bestPriority = 2;
        }
        // 继续检查是否有精确匹配
        continue;
      }

      if (normalizedName.includes(normalizedQuery)) {
        if (bestPriority === null || bestPriority > 3) {
          bestPriority = 3;
        }
      }
    }

    if (bestPriority !== null) {
      matches.push({ species, priority: bestPriority });
    }
  }

  // 按优先级排序（1 最高）
  matches.sort((a, b) => a.priority - b.priority);

  return matches.slice(0, maxResults).map((m) => m.species);
}

/**
 * 根据 speciesId 在列表中查找单条物种记录。
 *
 * @param speciesId - 物种唯一标识
 * @param speciesList - 物种知识库数据
 * @returns 匹配的 PlantSpecies 或 null
 */
export function findSpeciesById(
  speciesId: string | null | undefined,
  speciesList: PlantSpecies[],
): PlantSpecies | null {
  if (!speciesId) return null;
  return speciesList.find((s) => s.id === speciesId) ?? null;
}
