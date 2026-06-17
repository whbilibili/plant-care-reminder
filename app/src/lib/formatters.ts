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
