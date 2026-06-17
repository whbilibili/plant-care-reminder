import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";

import { PlanSection } from "./PlanSection";
import { ActionableTaskSection } from "./ActionableTaskSection";
import type { PlanTask } from "./PlanTaskRow";
import type { ActionableTask } from "./ActionableTaskRow";

// 标题区信息标识 emoji（📋 / ⚠️）不得复现。
const INFO_EMOJI_REGEX = /[\u{1F4CB}\u26A0]/u;

const planTask: PlanTask = {
  customLabel: null,
  id: "t1",
  intervalDays: 7,
  nextDueAt: Date.now() + 3 * 24 * 60 * 60 * 1000,
  taskType: "watering",
};

const overdueTask: ActionableTask = {
  customLabel: null,
  id: "a1",
  intervalDays: 7,
  lastCompletedAt: null,
  nextDueAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
  taskType: "watering",
};

describe("信息标识图标 (ICON-006)", () => {
  it("养护计划标题渲染 ClipboardList 且无 📋 emoji", () => {
    const { container } = render(
      <PlanSection onAdd={() => {}} onEdit={() => {}} tasks={[planTask]} />,
    );
    const title = container.querySelector("h2") as HTMLElement;
    expect(title.querySelector("svg.lucide-clipboard-list")).not.toBeNull();
    expect(INFO_EMOJI_REGEX.test(title.textContent ?? "")).toBe(false);
    // 标题可访问名仍含『养护计划』（图标 aria-hidden 不污染）。
    expect(title.textContent).toContain("养护计划");
  });

  it("需要处理标题渲染 Info 图标且无 ⚠️ emoji", () => {
    const { container } = render(
      <ActionableTaskSection onCompleted={() => {}} tasks={[overdueTask]} />,
    );
    const title = container.querySelector("h2") as HTMLElement;
    expect(title.querySelector("svg.lucide-info")).not.toBeNull();
    expect(INFO_EMOJI_REGEX.test(title.textContent ?? "")).toBe(false);
    expect(title.textContent).toContain("需要处理");
  });
});
