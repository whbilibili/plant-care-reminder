import { describe, expect, it } from "vitest";
import { Droplet, Flower2, Scissors, SprayCan, Sprout, Tag } from "lucide-react";
import { CUSTOM_TASK_NAME_MAX_LENGTH } from "../../lib/constants";
import {
  careTaskTypeValues,
  getTaskTypeIcon,
  taskTypeIcon,
  validateCustomTaskName,
  type CareTaskType,
} from "./taskTypes";

describe("taskTypeIcon 权威映射 (ICON-003)", () => {
  it("六种 CareTaskType 全部有定义且为合法 Lucide 图标", () => {
    for (const value of careTaskTypeValues) {
      const icon = taskTypeIcon[value];
      expect(icon, `taskTypeIcon 缺少 ${value} 的映射`).toBeDefined();
      // Lucide forwardRef 组件在运行时是 object，可渲染组件
      expect(["function", "object"]).toContain(typeof icon);
    }
  });

  it("映射严格对齐 icon_mapping_authority.task_type", () => {
    const expected: Record<CareTaskType, unknown> = {
      watering: Droplet,
      fertilizing: Sprout,
      misting: SprayCan,
      repotting: Flower2,
      pruning: Scissors,
      custom: Tag,
    };
    for (const value of careTaskTypeValues) {
      expect(taskTypeIcon[value]).toBe(expected[value]);
    }
  });

  it("repotting 使用 Flower2 而非 FlowerPot（防回退断言）", () => {
    expect(taskTypeIcon.repotting).toBe(Flower2);
  });

  it("getTaskTypeIcon 对每个合法类型返回对应图标", () => {
    for (const value of careTaskTypeValues) {
      expect(getTaskTypeIcon(value)).toBe(taskTypeIcon[value]);
    }
  });

  it("getTaskTypeIcon 对未知值回退到 custom 图标", () => {
    // 故意绕过类型系统模拟脏数据
    expect(getTaskTypeIcon("unknown" as CareTaskType)).toBe(taskTypeIcon.custom);
  });
});

describe("validateCustomTaskName 长度校验 (TEXT-005)", () => {
  it("非 custom 类型不校验，返回 null", () => {
    expect(validateCustomTaskName("watering", "x".repeat(999))).toBeNull();
  });

  it("custom 类型名称为空返回必填提示", () => {
    expect(validateCustomTaskName("custom", "  ")).toBe("请输入这个提醒的自定义任务名称。");
  });

  it("custom 类型名称超过上限返回长度提示", () => {
    expect(validateCustomTaskName("custom", "擦".repeat(CUSTOM_TASK_NAME_MAX_LENGTH + 1))).toBe(
      `任务名称不能超过 ${CUSTOM_TASK_NAME_MAX_LENGTH} 个字符。`,
    );
  });

  it("custom 类型名称正好等于上限时通过（边界）", () => {
    expect(validateCustomTaskName("custom", "擦".repeat(CUSTOM_TASK_NAME_MAX_LENGTH))).toBeNull();
  });
});
