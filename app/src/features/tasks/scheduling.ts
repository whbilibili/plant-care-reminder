const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const UPCOMING_WINDOW_DAYS = 3;

/** 推迟天数：本迭代固定 1 天，预留可调（PRD §8.1）。 */
export const POSTPONE_DAYS = 1;

/**
 * 计算推迟后的 nextDueAt：从「今天 0 点」起顺延 N 天（默认 POSTPONE_DAYS）。
 * 注意基准是今天而非原 nextDueAt（PRD §8.1），逾期任务推迟后只会落到明天。
 */
export function computePostponedNextDueAt(now: number = Date.now(), days: number = POSTPONE_DAYS) {
  return getUtcDayStart(now) + days * MS_PER_DAY;
}

export interface PostponePreview {
  /** 推迟后的下次到期时间。 */
  nextDueAtPreview: number;
  /** 逾期天数（正整数；非逾期为 0）。 */
  overdueDays: number;
  /** 当前是否已逾期（nextDueAt 早于今天 0 点）。 */
  isOverdue: boolean;
}

/**
 * 推迟预览（前端本地计算，避免额外往返）：根据当前 nextDueAt 判断是否逾期、逾期天数，
 * 以及推迟后的下次到期时间。逾期/今日两种语境的告知文案由调用方据此组装。
 */
export function computePostponePreview(
  currentNextDueAt: number,
  now: number = Date.now(),
  days: number = POSTPONE_DAYS,
): PostponePreview {
  const startOfToday = getUtcDayStart(now);
  const isOverdue = currentNextDueAt < startOfToday;
  const overdueDays = isOverdue
    ? Math.floor((startOfToday - getUtcDayStart(currentNextDueAt)) / MS_PER_DAY)
    : 0;

  return {
    nextDueAtPreview: computePostponedNextDueAt(now, days),
    overdueDays,
    isOverdue,
  };
}

/** UTC 自然日起点（00:00:00.000），用于分桶的稳定边界。 */
export function getUtcDayStart(timestamp: number) {
  const date = new Date(timestamp);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/**
 * 判断任务是否「今日已完成」：lastCompletedAt 落在今天的自然日窗口内。
 * 间隔=1 天的任务次日 lastCompletedAt 变为昨天，会返回 false，从而正常重现。
 */
export function computeCompletedToday(
  lastCompletedAt: number | null,
  startOfToday: number,
  startOfTomorrow: number,
) {
  return (
    lastCompletedAt !== null &&
    lastCompletedAt >= startOfToday &&
    lastCompletedAt < startOfTomorrow
  );
}

export interface DueBucketInput {
  lastCompletedAt: number | null;
  nextDueAt: number;
  taskId: string;
}

export interface DueBucketResult<T extends DueBucketInput> {
  overdue: Array<T & { completedToday: boolean }>;
  today: Array<T & { completedToday: boolean }>;
  upcoming: Array<T & { completedToday: boolean }>;
}

/**
 * 纯分桶函数：把待办任务分到 已逾期 / 今天到期 / 即将到期 三桶，
 * 并为每条任务标注 completedToday。主区（overdue + today）只放今日未完成的，
 * 今日已完成的任务会因其 nextDueAt 被推到未来而自然落入 upcoming 桶（灰态展示）。
 */
export function bucketDueTasks<T extends DueBucketInput>(
  tasks: T[],
  now: number = Date.now(),
): DueBucketResult<T> {
  const startOfToday = getUtcDayStart(now);
  const startOfTomorrow = startOfToday + MS_PER_DAY;
  const startOfUpcomingLimit = startOfTomorrow + UPCOMING_WINDOW_DAYS * MS_PER_DAY;

  const annotated = tasks.map((task) => ({
    ...task,
    completedToday: computeCompletedToday(task.lastCompletedAt, startOfToday, startOfTomorrow),
  }));

  return {
    overdue: annotated.filter((task) => task.nextDueAt < startOfToday),
    today: annotated.filter(
      (task) => task.nextDueAt >= startOfToday && task.nextDueAt < startOfTomorrow,
    ),
    upcoming: annotated.filter(
      (task) => task.nextDueAt >= startOfTomorrow && task.nextDueAt < startOfUpcomingLimit,
    ),
  };
}

export function validateIntervalDays(intervalDays: number) {
  if (!Number.isInteger(intervalDays) || intervalDays < 1) {
    return "提醒间隔天数必须是大于 0 的整数。";
  }

  return null;
}

export function computeNextDueAt({
  intervalDays,
  baseCompletedAt,
  now = Date.now(),
}: {
  baseCompletedAt: number | null;
  intervalDays: number;
  now?: number;
}) {
  const validationError = validateIntervalDays(intervalDays);
  if (validationError) {
    throw new Error(validationError);
  }

  const baseTimestamp = baseCompletedAt ?? now;
  return baseTimestamp + intervalDays * MS_PER_DAY;
}

// ─── Schedule Mode Types ────────────────────────────────────────

export type ScheduleMode = "interval" | "weekly" | "seasonal";

export interface SeasonalIntervals {
  springSummer: number;
  autumnWinter: number;
}

// ─── Weekly Scheduling ──────────────────────────────────────────

/**
 * 计算下一个匹配的工作日到期时间。
 * weeklyDays: 0=周日, 1=周一, ..., 6=周六 (与 JS getDay() 一致)。
 * 从 completedAt 的次日开始寻找下一个匹配日（永远不会是当天）。
 */
export function computeNextWeeklyDueAt({
  weeklyDays,
  completedAt,
  now = Date.now(),
}: {
  weeklyDays: number[];
  completedAt: number | null;
  now?: number;
}): number {
  if (!weeklyDays.length) {
    throw new Error("每周至少需要选择一天。");
  }

  const baseTimestamp = completedAt ?? now;

  // Start from the next day (never today)
  for (let offset = 1; offset <= 7; offset++) {
    const candidateMs = baseTimestamp + offset * MS_PER_DAY;
    const candidateDate = new Date(candidateMs);
    const dayOfWeek = candidateDate.getUTCDay();

    if (weeklyDays.includes(dayOfWeek)) {
      // Return the start of that UTC day
      return Date.UTC(
        candidateDate.getUTCFullYear(),
        candidateDate.getUTCMonth(),
        candidateDate.getUTCDate(),
      );
    }
  }

  // Should never reach here if weeklyDays has at least 1 element
  return baseTimestamp + MS_PER_DAY;
}

// ─── Seasonal Scheduling ────────────────────────────────────────

/**
 * 根据当前月份判断所处季节，返回对应的间隔天数。
 * 春夏：3月~8月（月份 2~7，JS getUTCMonth() 值）
 * 秋冬：9月~2月（月份 8~1）
 */
export function getEffectiveIntervalDays(
  seasonalIntervals: SeasonalIntervals,
  referenceTimestamp: number = Date.now(),
): number {
  const month = new Date(referenceTimestamp).getUTCMonth(); // 0-indexed
  // 春夏: March(2) ~ August(7)
  if (month >= 2 && month <= 7) {
    return seasonalIntervals.springSummer;
  }
  // 秋冬: September(8) ~ February(1)
  return seasonalIntervals.autumnWinter;
}

/**
 * 计算按季节调度的下一次到期时间。
 * 使用完成时刻所在月份决定间隔（不在计算中途切换季节）。
 */
export function computeNextSeasonalDueAt({
  seasonalIntervals,
  completedAt,
  now = Date.now(),
}: {
  seasonalIntervals: SeasonalIntervals;
  completedAt: number | null;
  now?: number;
}): number {
  const baseTimestamp = completedAt ?? now;
  const intervalDays = getEffectiveIntervalDays(seasonalIntervals, baseTimestamp);
  return baseTimestamp + intervalDays * MS_PER_DAY;
}

// ─── Validation Helpers ─────────────────────────────────────────

/**
 * 校验 weeklyDays 数组：不为空，元素在 0~6 之间，无重复。
 */
export function validateWeeklyDays(weeklyDays: number[]): string | null {
  if (!weeklyDays || weeklyDays.length === 0) {
    return "每周至少需要选择一天。";
  }

  if (weeklyDays.length > 7) {
    return "每周最多选择 7 天。";
  }

  for (const day of weeklyDays) {
    if (!Number.isInteger(day) || day < 0 || day > 6) {
      return "星期几的值必须在 0（周日）到 6（周六）之间。";
    }
  }

  if (new Set(weeklyDays).size !== weeklyDays.length) {
    return "不能选择重复的星期几。";
  }

  return null;
}

/**
 * 校验季节间隔配置：两个值都必须是 1~365 的正整数。
 */
export function validateSeasonalIntervals(intervals: SeasonalIntervals): string | null {
  if (
    !Number.isInteger(intervals.springSummer) ||
    intervals.springSummer < 1 ||
    intervals.springSummer > 365
  ) {
    return "春夏间隔天数必须是 1 到 365 的整数。";
  }

  if (
    !Number.isInteger(intervals.autumnWinter) ||
    intervals.autumnWinter < 1 ||
    intervals.autumnWinter > 365
  ) {
    return "秋冬间隔天数必须是 1 到 365 的整数。";
  }

  return null;
}

// ─── Unified Dispatcher ─────────────────────────────────────────

/**
 * 根据 scheduleMode 分派到对应的下次到期计算函数。
 * scheduleMode undefined 时按 'interval' 处理（向后兼容）。
 */
export function computeNextDueAtByMode({
  scheduleMode,
  intervalDays,
  weeklyDays,
  seasonalIntervals,
  completedAt,
  now = Date.now(),
}: {
  scheduleMode: ScheduleMode | undefined;
  intervalDays: number;
  weeklyDays?: number[];
  seasonalIntervals?: SeasonalIntervals;
  completedAt: number | null;
  now?: number;
}): number {
  const mode = scheduleMode ?? "interval";

  switch (mode) {
    case "weekly": {
      if (!weeklyDays || weeklyDays.length === 0) {
        throw new Error("每周模式必须指定至少一个星期几。");
      }
      return computeNextWeeklyDueAt({ weeklyDays, completedAt, now });
    }
    case "seasonal": {
      if (!seasonalIntervals) {
        throw new Error("季节模式必须指定春夏和秋冬间隔。");
      }
      return computeNextSeasonalDueAt({ seasonalIntervals, completedAt, now });
    }
    case "interval":
    default:
      return computeNextDueAt({ intervalDays, baseCompletedAt: completedAt, now });
  }
}
