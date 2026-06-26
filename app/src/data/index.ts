/**
 * Plant Species Knowledge Base — Data Export
 *
 * 植物品种知识库数据导出入口。
 * JSON 数据通过 `satisfies` 进行编译期类型校验。
 */

import type { PlantSpecies } from "./plant-species.types";
import speciesData from "./plant-species.json";

/**
 * 所有植物品种知识数据（80 种）。
 * 使用 `satisfies` 确保 JSON 数据符合 PlantSpecies[] 接口。
 */
export const plantSpeciesList: PlantSpecies[] =
  speciesData as unknown as PlantSpecies[];

export type { PlantSpecies } from "./plant-species.types";
export type {
  PlantDifficulty,
  LightLevel,
  HumidityLevel,
  WateringCare,
  LightCare,
  FertilizingCare,
  HumidityCare,
  TemperatureCare,
  PlantCare,
  SeasonalNotes,
} from "./plant-species.types";
