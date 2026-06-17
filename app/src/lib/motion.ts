/**
 * 动效与触觉反馈共享工具。
 *
 * 设计约束（TODO2-008）：
 * - 所有新增动效都必须尊重 prefers-reduced-motion；tokens.css 已对 CSS transition/animation
 *   做了全局兜底，这里额外提供 JS 侧的判定，用于决定是否跳过基于 JS 的编排动效。
 * - Haptic 仅在支持 Vibration API 的移动端生效，桌面端静默降级。
 */

/** 当前是否处于「减少动态效果」偏好（SSR/无 matchMedia 时按 false 处理）。 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * 触发一次轻量触觉反馈（完成任务时的小确幸）。
 * - 仅在支持 navigator.vibrate（多见于移动端浏览器）时生效。
 * - 在 reduced-motion 偏好下不震动，避免打扰对动态敏感的用户。
 * - 任何异常都静默吞掉：触觉只是锦上添花，绝不能影响主流程。
 */
export function triggerHaptic(durationMs = 12): void {
  if (prefersReducedMotion()) {
    return;
  }
  if (
    typeof navigator === "undefined" ||
    typeof navigator.vibrate !== "function"
  ) {
    return;
  }
  try {
    navigator.vibrate(durationMs);
  } catch {
    // 部分浏览器在非用户手势上下文会抛错，忽略即可。
  }
}
