import { describe, expect, it } from "vitest";
import {
  PLANT_DESCRIPTION_MAX_LENGTH,
  PLANT_LOCATION_MAX_LENGTH,
  PLANT_NAME_MAX_LENGTH,
  PLANT_NOTE_MAX_LENGTH,
} from "../../lib/constants";
import {
  createEmptyPlantEditorValues,
  validatePlantEditorValues,
  type PlantEditorValues,
} from "./plantSchema";

function buildValues(overrides: Partial<PlantEditorValues> = {}): PlantEditorValues {
  return {
    ...createEmptyPlantEditorValues(),
    name: "蝴蝶兰",
    ...overrides,
  };
}

describe("validatePlantEditorValues 长度校验 (TEXT-005)", () => {
  it("名称为空返回必填提示", () => {
    const errors = validatePlantEditorValues(buildValues({ name: "   " }));
    expect(errors.name).toBe("请填写植物名称。");
  });

  it("名称超过上限返回长度提示", () => {
    const errors = validatePlantEditorValues(
      buildValues({ name: "名".repeat(PLANT_NAME_MAX_LENGTH + 1) }),
    );
    expect(errors.name).toBe(`植物名称不能超过 ${PLANT_NAME_MAX_LENGTH} 个字符。`);
  });

  it("位置超过上限返回长度提示", () => {
    const errors = validatePlantEditorValues(
      buildValues({ location: "位".repeat(PLANT_LOCATION_MAX_LENGTH + 1) }),
    );
    expect(errors.location).toBe(`摆放位置不能超过 ${PLANT_LOCATION_MAX_LENGTH} 个字符。`);
  });

  it("简介超过上限返回长度提示", () => {
    const errors = validatePlantEditorValues(
      buildValues({ description: "简".repeat(PLANT_DESCRIPTION_MAX_LENGTH + 1) }),
    );
    expect(errors.description).toBe(`简介不能超过 ${PLANT_DESCRIPTION_MAX_LENGTH} 个字符。`);
  });

  it("备注超过上限返回长度提示", () => {
    const errors = validatePlantEditorValues(
      buildValues({ note: "注".repeat(PLANT_NOTE_MAX_LENGTH + 1) }),
    );
    expect(errors.note).toBe(`养护备注不能超过 ${PLANT_NOTE_MAX_LENGTH} 个字符。`);
  });

  it("各字段正好等于上限时不报错（边界）", () => {
    const errors = validatePlantEditorValues(
      buildValues({
        name: "名".repeat(PLANT_NAME_MAX_LENGTH),
        location: "位".repeat(PLANT_LOCATION_MAX_LENGTH),
        description: "简".repeat(PLANT_DESCRIPTION_MAX_LENGTH),
        note: "注".repeat(PLANT_NOTE_MAX_LENGTH),
      }),
    );
    expect(errors).toEqual({});
  });
});
