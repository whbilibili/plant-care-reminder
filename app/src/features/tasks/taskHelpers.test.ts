import { describe, expect, it } from "vitest";

import { computeNextDueAt, validateIntervalDays } from "./scheduling";
import {
  careTaskTypeOptions,
  careTaskTypeValues,
  formatTaskTypeLabel,
  normalizeCustomTaskName,
  requiresCustomTaskName,
  validateCustomTaskName,
} from "./taskTypes";

describe("taskTypes shared contract", () => {
  it("centralizes the supported care task types and exposes options for UI flows", () => {
    expect(careTaskTypeValues).toEqual([
      "watering",
      "fertilizing",
      "misting",
      "repotting",
      "pruning",
      "custom",
    ]);
    expect(careTaskTypeOptions).toHaveLength(careTaskTypeValues.length);
    expect(careTaskTypeOptions.at(-1)).toMatchObject({
      value: "custom",
      label: "自定义任务",
    });
  });

  it("formats preset and custom task labels from one helper", () => {
    expect(formatTaskTypeLabel("watering")).toBe("浇水");
    expect(formatTaskTypeLabel("custom", " Leaf wipe ")).toBe("Leaf wipe");
    expect(formatTaskTypeLabel("custom", "   ")).toBe("自定义任务");
  });

  it("keeps custom-task validation in one place", () => {
    expect(requiresCustomTaskName("watering")).toBe(false);
    expect(requiresCustomTaskName("custom")).toBe(true);
    expect(normalizeCustomTaskName("  Check moss pole  ")).toBe("Check moss pole");
    expect(validateCustomTaskName("watering", null)).toBeNull();
    expect(validateCustomTaskName("custom", "   ")).toBe(
      "请输入这个提醒的自定义任务名称。",
    );
    expect(validateCustomTaskName("custom", "Leaf wipe")).toBeNull();
  });
});

describe("scheduling shared contract", () => {
  it("computes next due dates from an explicit completion timestamp", () => {
    const completedAt = Date.UTC(2026, 5, 9, 8, 0, 0);
    expect(computeNextDueAt({ intervalDays: 7, baseCompletedAt: completedAt })).toBe(
      completedAt + 7 * 24 * 60 * 60 * 1000,
    );
  });

  it("falls back to the provided now timestamp when no completion timestamp exists", () => {
    const now = Date.UTC(2026, 5, 9, 10, 30, 0);
    expect(computeNextDueAt({ intervalDays: 3, baseCompletedAt: null, now })).toBe(
      now + 3 * 24 * 60 * 60 * 1000,
    );
  });

  it("rejects invalid interval values consistently", () => {
    expect(validateIntervalDays(0)).toBe("提醒间隔天数必须是大于 0 的整数。");
    expect(validateIntervalDays(2.5)).toBe("提醒间隔天数必须是大于 0 的整数。");
    expect(() =>
      computeNextDueAt({
        intervalDays: 0,
        baseCompletedAt: Date.UTC(2026, 5, 9),
      }),
    ).toThrow("提醒间隔天数必须是大于 0 的整数。");
  });
});
