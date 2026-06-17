import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";

import { DetailNavBar } from "./DetailNavBar";

describe("DetailNavBar (T3 重构后)", () => {
  it("渲染返回按钮和居中植物名称", () => {
    const { getByLabelText, getByText } = render(
      <DetailNavBar plantName="龟背竹" />,
    );
    expect(getByLabelText("返回")).toBeTruthy();
    expect(getByText("龟背竹")).toBeTruthy();
  });

  it("返回按钮使用 Lucide ChevronLeft 图标，无手写 polyline", () => {
    const { getByLabelText } = render(
      <DetailNavBar plantName="龟背竹" />,
    );
    const back = getByLabelText("返回");
    expect(back.querySelector("svg.lucide-chevron-left")).not.toBeNull();
    expect(back.querySelector("polyline")).toBeNull();
  });

  it('不再渲染"更多操作"按钮（OverflowMenu 已移除）', () => {
    const { queryByLabelText } = render(
      <DetailNavBar plantName="龟背竹" />,
    );
    expect(queryByLabelText("更多操作")).toBeNull();
  });

  it("图标 aria-hidden 正确设置", () => {
    const { getByLabelText } = render(
      <DetailNavBar plantName="龟背竹" />,
    );
    const back = getByLabelText("返回");
    expect(back.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });
});
