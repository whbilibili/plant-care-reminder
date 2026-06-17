import { describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";

import { FamilyHeroCard } from "./FamilyHeroCard";

// 排除装饰性 🌿（U+1F33F）以外的任何 emoji；编辑入口不应再用 ✎(U+270E) 字符。
const PENCIL_GLYPH = /\u270e/u;

describe("FamilyHeroCard 编辑入口图标 (ICON-005)", () => {
  it("管理员视角编辑入口渲染 lucide Pencil 且不再出现 ✎ 字符", () => {
    const { container } = render(
      <FamilyHeroCard familyName="向阳花房" memberCount={2} onRename={() => {}} />,
    );
    expect(container.querySelector("svg.lucide-pencil")).not.toBeNull();
    // 防回退：旧版手写 ✎ 字符不得复现。
    expect(PENCIL_GLYPH.test(container.textContent ?? "")).toBe(false);
  });

  it("普通成员视角（无 onRename）不渲染编辑入口图标", () => {
    const { container } = render(
      <FamilyHeroCard familyName="向阳花房" memberCount={1} />,
    );
    expect(container.querySelector("svg.lucide-pencil")).toBeNull();
    expect(container.querySelector("button")).toBeNull();
  });

  it("编辑入口保留无障碍标签与点击回调，图标本身 aria-hidden", () => {
    const onRename = vi.fn();
    const { getByRole, container } = render(
      <FamilyHeroCard familyName="向阳花房" memberCount={3} onRename={onRename} />,
    );
    const button = getByRole("button", { name: "修改家庭名" });
    fireEvent.click(button);
    expect(onRename).toHaveBeenCalledTimes(1);
    const pencil = container.querySelector("svg.lucide-pencil") as SVGElement;
    expect(pencil.getAttribute("aria-hidden")).toBe("true");
  });
});
