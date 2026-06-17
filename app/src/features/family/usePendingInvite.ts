/**
 * 跨多跳邀请码暂存（SET3-012）。
 *
 * 设计：用 sessionStorage（键 `pendingInviteCode`）而非 localStorage，
 * 让暂存仅在「当前标签页会话」内有效——关闭标签页即自动清除，
 * 满足验收「中途放弃则随标签页关闭清除不残留」。
 *
 * 编排链路：未登录点 /join/:code → 暂存邀请码 → RouteGate 重定向 /login →
 * 登录/注册 → 填称呼 → onboarding 二选一阶段检测到暂存码 →
 * 自动调 joinFamilyByInviteCode → 成功后清除暂存 → 跳 /todo。
 */

const PENDING_INVITE_KEY = "pendingInviteCode";

function getSessionStorageSafely(): Storage | null {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) {
      return null;
    }
    return window.sessionStorage;
  } catch {
    // 隐私模式 / 禁用存储时 sessionStorage 访问会抛错，降级为无暂存。
    return null;
  }
}

/** 写入待处理邀请码；空串/空白视为清除。 */
export function setPendingInviteCode(code: string): void {
  const storage = getSessionStorageSafely();
  if (!storage) {
    return;
  }
  const trimmed = code.trim();
  try {
    if (trimmed.length === 0) {
      storage.removeItem(PENDING_INVITE_KEY);
      return;
    }
    storage.setItem(PENDING_INVITE_KEY, trimmed);
  } catch {
    // 写入失败（配额/禁用）静默降级——大不了用户手输码。
  }
}

/** 读取待处理邀请码；无则返回 null。 */
export function getPendingInviteCode(): string | null {
  const storage = getSessionStorageSafely();
  if (!storage) {
    return null;
  }
  try {
    const value = storage.getItem(PENDING_INVITE_KEY);
    const trimmed = value?.trim() ?? "";
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
}

/** 清除待处理邀请码（加入成功或主动放弃后调用）。 */
export function clearPendingInviteCode(): void {
  const storage = getSessionStorageSafely();
  if (!storage) {
    return;
  }
  try {
    storage.removeItem(PENDING_INVITE_KEY);
  } catch {
    // 忽略清除失败。
  }
}
