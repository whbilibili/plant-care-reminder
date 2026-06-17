import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BottomNav } from "./BottomNav";

describe("BottomNav", () => {
  it("renders three nav labels", () => {
    render(<BottomNav pathname="/todo" />);
    expect(screen.getByText("待办")).toBeInTheDocument();
    expect(screen.getByText("植物")).toBeInTheDocument();
    expect(screen.getByText("设置")).toBeInTheDocument();
  });

  it("renders lucide svg icons instead of emoji text (icon migration)", () => {
    const { container } = render(<BottomNav pathname="/todo" />);
    const svgs = container.querySelectorAll("svg.lucide");
    expect(svgs).toHaveLength(3);
    // 旧 emoji 不再出现在导航中（核心迁移收益）
    expect(container.textContent).not.toMatch(/[🗓🪴⚙]/u);
  });

  it("marks nav icons aria-hidden so the label carries the accessible name", () => {
    const { container } = render(<BottomNav pathname="/todo" />);
    container.querySelectorAll("svg.lucide").forEach((svg) => {
      expect(svg).toHaveAttribute("aria-hidden", "true");
    });
  });

  it("drives the active item color via the paper token so the icon turns white (core bug fix)", () => {
    render(<BottomNav pathname="/todo" />);
    const activeButton = screen.getByText("待办").closest("button")!;
    // active 态 color = var(--color-paper)，svg 用 currentColor 描边 → 自动转白
    expect(activeButton.style.color).toBe("var(--color-paper)");
    const inactiveButton = screen.getByText("植物").closest("button")!;
    expect(inactiveButton.style.color).toBe("var(--color-muted)");
  });
});
