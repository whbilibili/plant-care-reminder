/**
 * Plant Species Knowledge Base — Type Definitions
 *
 * 植物品种知识库类型定义。
 * 权威数据来源：app/src/data/plant-species.json
 * PRD 参考：docs/product-specs/2026-06-23-plant-knowledge-card-spec.md §3.1
 */

/** 养护难度 */
export type PlantDifficulty = "easy" | "medium" | "hard";

/** 光照需求等级 */
export type LightLevel = "low" | "medium" | "bright" | "direct";

/** 湿度需求等级 */
export type HumidityLevel = "low" | "medium" | "high";

/** 浇水养护建议 */
export interface WateringCare {
  /** 建议浇水间隔范围（天），如 [3, 5] */
  intervalRange: [number, number];
  /** 浇水贴士 */
  tip: string;
}

/** 光照养护建议 */
export interface LightCare {
  /** 光照需求等级 */
  level: LightLevel;
  /** 光照贴士 */
  tip: string;
}

/** 施肥养护建议 */
export interface FertilizingCare {
  /** 建议施肥间隔范围（天），如 [14, 30] */
  intervalRange: [number, number];
  /** 施肥贴士 */
  tip: string;
  /** 季节性说明（可选） */
  seasonalNote?: string;
}

/** 湿度养护建议（可选） */
export interface HumidityCare {
  /** 湿度需求等级 */
  level: HumidityLevel;
  /** 湿度贴士 */
  tip: string;
}

/** 温度养护建议（可选） */
export interface TemperatureCare {
  /** 适宜温度范围（℃） */
  range: [number, number];
  /** 温度贴士 */
  tip: string;
}

/** 品种养护综合信息 */
export interface PlantCare {
  watering: WateringCare;
  light: LightCare;
  fertilizing: FertilizingCare;
  humidity?: HumidityCare;
  temperature?: TemperatureCare;
}

/** 季节养护要点 */
export interface SeasonalNotes {
  /** 春夏养护要点 */
  springSummer: string;
  /** 秋冬养护要点 */
  autumnWinter: string;
}

/**
 * 植物品种知识条目
 *
 * 每条记录代表一个植物品种的完整养护知识。
 */
export interface PlantSpecies {
  /** 唯一标识，如 "monstera-deliciosa" */
  id: string;
  /** 品种名称（含别名），如 ["龟背竹", "蓬莱蕉"] */
  names: string[];
  /** 分类，如 "观叶植物" */
  category: string;
  /** 养护难度 */
  difficulty: PlantDifficulty;
  /** 一句话品种简介，用于创建植物时预填简介字段（v1.1） */
  briefDescription: string;
  /** 养护信息 */
  care: PlantCare;
  /** 常见问题提示 */
  commonIssues: string[];
  /** 季节养护要点 */
  seasonalNotes: SeasonalNotes;
}
