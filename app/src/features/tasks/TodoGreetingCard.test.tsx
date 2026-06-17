import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TodoGreetingCard } from "./TodoGreetingCard";

describe("TodoGreetingCard 三态反馈区", () => {
  it("全部完成态：显示奖赏文案", () => {
    render(<TodoGreetingCard overduePlantCount={0} todayPlantCount={0} />);

    expect(screen.getByText(/今天的植物都照顾好啦/)).toBeInTheDocument();
  });

  it("有今日任务态：显示今日待养护株数", () => {
    render(<TodoGreetingCard overduePlantCount={0} todayPlantCount={3} />);

    expect(screen.getByText(/今天要照顾/)).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("有逾期态：显示逾期株数且优先于今日态", () => {
    render(<TodoGreetingCard overduePlantCount={2} todayPlantCount={5} />);

    expect(screen.getByText(/株植物在等你/)).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    // 逾期态优先，不应出现今日态文案
    expect(screen.queryByText(/今天要照顾/)).not.toBeInTheDocument();
  });

  it("反馈区为纯信息卡，不渲染按钮/链接（不可点击）", () => {
    render(<TodoGreetingCard overduePlantCount={1} todayPlantCount={0} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
