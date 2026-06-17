import { describe, expect, it } from "vitest";

import {
  POSTPONE_HINT_THRESHOLD,
  shouldShowPostponeHint,
} from "../../../src/features/tasks/PostponeHintBanner";

describe("shouldShowPostponeHint", () => {
  it("默认阈值为 3", () => {
    expect(POSTPONE_HINT_THRESHOLD).toBe(3);
  });

  it("单次推迟不显示建议条", () => {
    expect(shouldShowPostponeHint(1)).toBe(false);
  });

  it("未达阈值（2 次）不显示", () => {
    expect(shouldShowPostponeHint(2)).toBe(false);
  });

  it("达阈值（3 次）显示", () => {
    expect(shouldShowPostponeHint(3)).toBe(true);
  });

  it("超过阈值持续显示", () => {
    expect(shouldShowPostponeHint(5)).toBe(true);
  });

  it("完成清零后（0 次）不显示", () => {
    expect(shouldShowPostponeHint(0)).toBe(false);
  });

  it("支持自定义阈值", () => {
    expect(shouldShowPostponeHint(2, 2)).toBe(true);
    expect(shouldShowPostponeHint(1, 2)).toBe(false);
  });
});
