export { formatTaskTypeLabel } from "../features/tasks/taskTypes";

import type { ScheduleMode, SeasonalIntervals } from "../types/domain";

// ─── 排期模式描述格式化（FLEX-008）─────────────────────────────

const WEEKDAY_LABELS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"] as const;

/**
 * 格式化排期模式的简短描述（用于任务卡片显示）。
 * - interval: "每 N 天"
 * - weekly: "每周一、三、五"
 * - seasonal: "春夏N / 秋冬M天"
 */
export function formatScheduleDescription(params: {
  scheduleMode: ScheduleMode;
  intervalDays: number;
  weeklyDays?: number[] | null;
  seasonalIntervals?: SeasonalIntervals | null;
}): string {
  const { scheduleMode, intervalDays, weeklyDays, seasonalIntervals } = params;

  switch (scheduleMode) {
    case "weekly": {
      if (!weeklyDays || weeklyDays.length === 0) {
        return `每 ${intervalDays} 天`;
      }
      // 全选 7 天 → "每天"
      if (weeklyDays.length === 7) {
        return "每天";
      }
      // 周一到周五 → "工作日"
      const sorted = [...weeklyDays].sort((a, b) => a - b);
      if (sorted.length === 5 && sorted.join(",") === "1,2,3,4,5") {
        return "每个工作日";
      }
      // 周六周日 → "周末"
      if (sorted.length === 2 && sorted.join(",") === "0,6") {
        return "每个周末";
      }
      const dayLabels = weeklyDays.map((d) => WEEKDAY_LABELS[d] ?? `${d}`);
      return `每${dayLabels.join("、")}`;
    }
    case "seasonal": {
      if (!seasonalIntervals) {
        return `每 ${intervalDays} 天`;
      }
      return `春夏${seasonalIntervals.springSummer} / 秋冬${seasonalIntervals.autumnWinter}天`;
    }
    case "interval":
    default:
      return `每 ${intervalDays} 天`;
  }
}

/**
 * 格式化排期模式标签（用于选择器/标签展示）。
 */
export function formatScheduleModeLabel(mode: ScheduleMode): string {
  switch (mode) {
    case "interval":
      return "固定间隔";
    case "weekly":
      return "每周固定";
    case "seasonal":
      return "季节适应";
    default:
      return "固定间隔";
  }
}

/**
 * 获取星期标签。
 */
export function getWeekdayLabel(day: number): string {
  return WEEKDAY_LABELS[day] ?? `${day}`;
}

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
 * - <60min → 「N 分钟前」（1–59）
 * - <24h → 「N 小时前」（1–23）
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
  if (diffMinutes < 60) {
    return `${diffMinutes} 分钟前`;
  }

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 24) {
    return `${diffHours} 小时前`;
  }

  const date = new Date(timestamp);
  const nowDate = new Date(now);

  if (date.getFullYear() === nowDate.getFullYear()) {
    return relativeMonthDayFormatter.format(date);
  }

  return relativeFullDateFormatter.format(date);
}
