import { render } from "@testing-library/react";
import { Droplet } from "lucide-react";
import { describe, expect, it } from "vitest";

import { Icon } from "./Icon";

describe("Icon", () => {
  it("renders an svg lucide glyph", () => {
    const { container } = render(<Icon icon={Droplet} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
    expect(svg).toHaveClass("lucide");
  });

  it("inherits currentColor by default (no inline color set)", () => {
    const { container } = render(<Icon icon={Droplet} />);
    const svg = container.querySelector("svg")!;
    // 缺省不注入字面色，颜色随父级 currentColor
    expect(svg.style.color).toBe("");
  });

  it("injects the design token color when colorVar is provided", () => {
    const { container } = render(<Icon icon={Droplet} colorVar="--color-leaf" />);
    const svg = container.querySelector("svg")!;
    expect(svg.style.color).toBe("var(--color-leaf)");
  });

  it("exposes role=img and aria-label when label is provided", () => {
    const { container } = render(<Icon icon={Droplet} label="浇水" />);
    const svg = container.querySelector("svg")!;
    expect(svg).toHaveAttribute("role", "img");
    expect(svg).toHaveAttribute("aria-label", "浇水");
    expect(svg).not.toHaveAttribute("aria-hidden");
  });

  it("is aria-hidden when no label is provided", () => {
    const { container } = render(<Icon icon={Droplet} />);
    const svg = container.querySelector("svg")!;
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).not.toHaveAttribute("aria-label");
  });

  it("honors custom size and strokeWidth", () => {
    const { container } = render(
      <Icon icon={Droplet} size={32} strokeWidth={1.5} />,
    );
    const svg = container.querySelector("svg")!;
    expect(svg).toHaveAttribute("width", "32");
    expect(svg).toHaveAttribute("height", "32");
    expect(svg).toHaveAttribute("stroke-width", "1.5");
  });
});
