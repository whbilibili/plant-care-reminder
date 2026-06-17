import { describe, expect, it } from "vitest";

import {
  assertMaxLength,
  PLANT_DESCRIPTION_MAX_LENGTH,
  PLANT_LOCATION_MAX_LENGTH,
  PLANT_NAME_MAX_LENGTH,
  PLANT_NOTE_MAX_LENGTH,
} from "../../../convex/lib/validators";
import { assertPlantTextWithinLimits } from "../../../convex/plants";

/**
 * TEXT-006 后端第三层防御单测：直调被 createPlant/updatePlant 复用的纯校验逻辑，
 * 验证绕过前端的超长入参被 reject。不引入 convex-test runtime，
 * 沿用本项目对 convex 纯函数做单测的既有模式。
 */

describe("assertMaxLength", () => {
  it("等于上限不抛错（边界值放行）", () => {
    expect(() => assertMaxLength("a".repeat(30), 30, "植物名称")).not.toThrow();
  });

  it("超过上限抛错，错误信息含字段名与上限", () => {
    expect(() => assertMaxLength("a".repeat(31), 30, "植物名称")).toThrow(
      "植物名称不能超过 30 个字符。",
    );
  });

  it("空串不抛错", () => {
    expect(() => assertMaxLength("", 30, "植物名称")).not.toThrow();
  });
});

function buildArgs(
  overrides: Partial<Parameters<typeof assertPlantTextWithinLimits>[0]> = {},
) {
  return {
    name: "绿萝",
    description: null,
    note: null,
    location: null,
    ...overrides,
  };
}

describe("assertPlantTextWithinLimits", () => {
  it("正常入参返回 trim 后的 name", () => {
    expect(assertPlantTextWithinLimits(buildArgs({ name: "  绿萝  " }))).toEqual({
      name: "绿萝",
    });
  });

  it("name 仅空白视为空，抛必填错误", () => {
    expect(() => assertPlantTextWithinLimits(buildArgs({ name: "   " }))).toThrow(
      "请填写植物名称。",
    );
  });

  it("name 超长被 reject", () => {
    expect(() =>
      assertPlantTextWithinLimits(buildArgs({ name: "x".repeat(PLANT_NAME_MAX_LENGTH + 1) })),
    ).toThrow("植物名称不能超过 30 个字符。");
  });

  it("location 超长被 reject", () => {
    expect(() =>
      assertPlantTextWithinLimits(
        buildArgs({ location: "x".repeat(PLANT_LOCATION_MAX_LENGTH + 1) }),
      ),
    ).toThrow("摆放位置不能超过 30 个字符。");
  });

  it("description 超长被 reject", () => {
    expect(() =>
      assertPlantTextWithinLimits(
        buildArgs({ description: "x".repeat(PLANT_DESCRIPTION_MAX_LENGTH + 1) }),
      ),
    ).toThrow("简介不能超过 200 个字符。");
  });

  it("note 超长被 reject", () => {
    expect(() =>
      assertPlantTextWithinLimits(buildArgs({ note: "x".repeat(PLANT_NOTE_MAX_LENGTH + 1) })),
    ).toThrow("养护备注不能超过 200 个字符。");
  });

  it("可选字段为 null 时跳过长度校验", () => {
    expect(() =>
      assertPlantTextWithinLimits(
        buildArgs({ location: null, description: null, note: null }),
      ),
    ).not.toThrow();
  });

  it("四字段均等于上限时放行（边界值）", () => {
    expect(() =>
      assertPlantTextWithinLimits({
        name: "x".repeat(PLANT_NAME_MAX_LENGTH),
        location: "x".repeat(PLANT_LOCATION_MAX_LENGTH),
        description: "x".repeat(PLANT_DESCRIPTION_MAX_LENGTH),
        note: "x".repeat(PLANT_NOTE_MAX_LENGTH),
      }),
    ).not.toThrow();
  });
});
