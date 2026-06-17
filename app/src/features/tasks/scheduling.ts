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
