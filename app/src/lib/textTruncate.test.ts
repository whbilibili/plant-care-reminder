import { describe, expect, it } from "vitest";

import { clampLines, truncateSingleLine } from "./textTruncate";

describe("truncateSingleLine (TEXT-007)", () => {
  it("提供单行省略三件套 + minWidth 兜底", () => {
    expect(truncateSingleLine.whiteSpace).toBe("nowrap");
    expect(truncateSingleLine.overflow).toBe("hidden");
    expect(truncateSingleLine.textOverflow).toBe("ellipsis");
    expect(truncateSingleLine.minWidth).toBe(0);
  });
});

describe("clampLines (TEXT-007)", () => {
  it("按传入行数生成 WebkitLineClamp + break-word", () => {
    const style = clampLines(2);
    expect(style.display).toBe("-webkit-box");
    expect(style.WebkitBoxOrient).toBe("vertical");
    expect(style.WebkitLineClamp).toBe(2);
    expect(style.overflow).toBe("hidden");
    expect(style.overflowWrap).toBe("break-word");
    expect(style.wordBreak).toBe("break-word");
  });

  it("行数随入参变化", () => {
    expect(clampLines(1).WebkitLineClamp).toBe(1);
    expect(clampLines(3).WebkitLineClamp).toBe(3);
  });
});
