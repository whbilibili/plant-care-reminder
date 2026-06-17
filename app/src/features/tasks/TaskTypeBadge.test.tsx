import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";

import { TaskTypeBadge, taskTypeColorVar } from "./TaskTypeBadge";
import { careTaskTypeValues } from "./taskTypes";

const EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2702}\u{FE0F}]/u;

describe("TaskTypeBadge 任务类型角标 (ICON-004)", () => {
  it("每个任务类型都渲染一个 lucide 线性图标且不含 emoji", () => {
    for (const taskType of careTaskTypeValues) {
      const { container, unmount } = render(<TaskTypeBadge taskType={taskType} />);
      expect(
        container.querySelector("svg.lucide"),
        `${taskType} 应渲染 lucide svg`,
      ).not.toBeNull();
      expect(
        EMOJI_REGEX.test(container.textContent ?? ""),
        `${taskType} 角标不应再出现 emoji`,
      ).toBe(false);
      unmount();
    }
  });

  it("角标尺寸维持 18px、图标着色用 --color-task-* token", () => {
    const { container } = render(<TaskTypeBadge taskType="watering" />);
    const badge = container.querySelector("span") as HTMLElement;
    expect(badge.style.width).toBe("18px");
    expect(badge.style.height).toBe("18px");
    expect(badge.style.color).toBe(taskTypeColorVar("watering"));
  });

  it("taskTypeColorVar 对每类型返回对应 --color-task-* 变量", () => {
    expect(taskTypeColorVar("misting")).toBe("var(--color-task-misting)");
    expect(taskTypeColorVar("custom")).toBe("var(--color-task-custom)");
  });
});
