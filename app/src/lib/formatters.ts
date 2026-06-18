export { formatTaskTypeLabel } from "../features/tasks/taskTypes";

const longDateFormatter = new Intl.DateTimeFormat("zh-CN", {
  month: "long",
  day: "numeric",
});

export function formatDueDate(
  dueAt: number | Date | null | undefined,
  nowInput: number | Date = Date.now(),
) {
  if (dueAt === null || dueAt === undefined) {
    return "暂无计划日期";
  }

  const dueDate = dueAt instanceof Date ? dueAt : new Date(dueAt);
  const now = nowInput instanceof Date ? nowInput : new Date(nowInput);
  const msPerDay = 24 * 60 * 60 * 1000;
  const dayDelta = Math.floor(
    (Date.UTC(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()) -
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) /
      msPerDay,
  );

  if (dayDelta < 0) {
    return `已逾期 ${Math.abs(dayDelta)} 天`;
  }

  if (dayDelta === 0) {
    return "今天到期";
  }

  if (dayDelta === 1) {
    return "明天到期";
  }

  if (dayDelta <= 6) {
    return `${dayDelta} 天后到期`;
  }

  return `${longDateFormatter.format(dueDate)} 到期`;
}

// ─── 相对时间格式化（CARE-HIST-002）────────────────────────────

const relativeMonthDayFormatter = new Intl.DateTimeFormat("zh-CN", {
  month: "numeric",
  day: "numeric",
});

const relativeFullDateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

/**
 * 将时间戳格式化为相对时间文案（四档）。
 * - ≤60s → 「刚刚」
 * - ≤60min → 「N 分钟前」
 * - ≤24h → 「N 小时前」
 * - 同年 → 「M月D日」
 * - 跨年 → 「YYYY年M月D日」
 *
 * 不引入外部日期库，保持项目零新增依赖原则。
 */
export function formatRelativeTime(
  timestamp: number,
  now: number = Date.now(),
): string {
  const diffMs = now - timestamp;

  // 未来时间或几乎同时 → 刚刚
  if (diffMs <= 0) {
    return "刚刚";
  }

  const diffSeconds = Math.floor(diffMs / 1000);
  if (diffSeconds <= 60) {
    return "刚刚";
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  if (diffMinutes <= 60) {
    return `${diffMinutes} 分钟前`;
  }

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours <= 24) {
    return `${diffHours} 小时前`;
  }

  const date = new Date(timestamp);
  const nowDate = new Date(now);

  if (date.getFullYear() === nowDate.getFullYear()) {
    return relativeMonthDayFormatter.format(date);
  }

  return relativeFullDateFormatter.format(date);
}
