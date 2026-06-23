import { v } from "convex/values";
import { careTaskTypeValues } from "../../src/features/tasks/taskTypes";

export const familyRoleValues = ["owner", "admin", "member"] as const;
export const plantTaskTypeValues = careTaskTypeValues;

/**
 * 后端长度上限（第三层防御，TEXT-006）。
 * 数值与前端 app/src/lib/constants.ts 同源，刻意不跨 src/convex 边界 import 以保持后端独立可部署；
 * 修改任一处务必两处同步（families.renameFamily 同款手写常量模式）。
 */
export const PLANT_NAME_MAX_LENGTH = 30;
export const PLANT_LOCATION_MAX_LENGTH = 30;
export const PLANT_DESCRIPTION_MAX_LENGTH = 200;
export const PLANT_NOTE_MAX_LENGTH = 200;

/**
 * 字符串长度兜底断言：超过 maxLength（按 JS String.length / UTF-16 码元，与前端 maxLength 一致）即抛错。
 * 用于 mutation 入口对绕过前端的脏数据做最后一道拦截。
 */
export function assertMaxLength(value: string, maxLength: number, fieldName: string): void {
  if (value.length > maxLength) {
    throw new Error(`${fieldName}不能超过 ${maxLength} 个字符。`);
  }
}

export const familyRoleValidator = v.union(
  ...familyRoleValues.map((role) => v.literal(role)),
);

export const plantTaskTypeValidator = v.union(
  ...plantTaskTypeValues.map((taskType) => v.literal(taskType)),
);

export const utcTimestampValidator = v.number();
export const optionalUtcTimestampValidator = v.optional(utcTimestampValidator);
export const optionalTrimmedTextValidator = v.optional(v.string());

export const notificationPreferencesValidator = v.object({
  preferredHour: v.number(),
  timezone: v.string(),
});

export const userFields = {
  name: v.optional(v.string()),
  image: v.optional(v.string()),
  email: optionalTrimmedTextValidator,
  emailVerificationTime: v.optional(v.number()),
  phone: v.optional(v.string()),
  phoneVerificationTime: v.optional(v.number()),
  isAnonymous: v.optional(v.boolean()),
  displayName: optionalTrimmedTextValidator,
  // 用户级头像（D6）：不复用 authTables 自带 image(URL 语义)，统一用 storageId 方案，
  // 与 plantFields.imageStorageId 一致；optional 向后兼容，老用户无需回填。
  imageStorageId: v.optional(v.id("_storage")),
  // 推送时间偏好（PUSH-001）：用户可选择每天几点接收推送提醒。
  // v.optional 保证向后兼容，无需数据迁移；未设置时按"到期即推"处理。
  notificationPreferences: v.optional(notificationPreferencesValidator),
  createdAt: utcTimestampValidator,
  updatedAt: utcTimestampValidator,
};

export const familyFields = {
  name: v.string(),
  inviteCode: v.string(),
  createdBy: v.id("users"),
  createdAt: utcTimestampValidator,
};

export const familyMemberFields = {
  familyId: v.id("families"),
  userId: v.id("users"),
  role: familyRoleValidator,
  joinedAt: utcTimestampValidator,
};

export const plantFields = {
  familyId: v.id("families"),
  name: v.string(),
  description: optionalTrimmedTextValidator,
  notes: optionalTrimmedTextValidator,
  location: optionalTrimmedTextValidator,
  imageStorageId: v.optional(v.id("_storage")),
  // 多图图集（GAL-001）：内嵌数组，最多 20 项，每项含原图/缩略图 storageId + 上传者 + 时间 + 可选备注。
  gallery: v.optional(
    v.array(
      v.object({
        imageStorageId: v.id("_storage"),
        thumbnailStorageId: v.id("_storage"),
        uploadedBy: v.id("users"),
        uploadedAt: v.number(),
        caption: v.optional(v.string()),
      }),
    ),
  ),
  createdBy: v.id("users"),
  createdAt: utcTimestampValidator,
  updatedAt: utcTimestampValidator,
  isArchived: v.boolean(),
  archivedAt: optionalUtcTimestampValidator,
};

export const plantTaskFields = {
  plantId: v.id("plants"),
  familyId: v.id("families"),
  taskType: plantTaskTypeValidator,
  customLabel: optionalTrimmedTextValidator,
  intervalDays: v.number(),
  enabled: v.boolean(),
  lastCompletedAt: optionalUtcTimestampValidator,
  lastNotifiedAt: optionalUtcTimestampValidator,
  nextDueAt: utcTimestampValidator,
  // 连续推迟次数：完成时清零；老数据无此字段时按 0 处理（PRD §8.4）。
  consecutivePostponeCount: v.optional(v.number()),
  // ─── 灵活排期字段（FLEX-003）──────────────────────────────
  // scheduleMode: 'interval'（固定间隔）| 'weekly'（每周几）| 'seasonal'（按季节）。
  // optional 保证向后兼容：旧数据无此字段时按 'interval' 处理。
  scheduleMode: v.optional(
    v.union(v.literal("interval"), v.literal("weekly"), v.literal("seasonal")),
  ),
  // weeklyDays: 每周几触发，元素 0~6（0=周日），仅 weekly 模式使用。
  weeklyDays: v.optional(v.array(v.number())),
  // seasonalIntervals: 春夏/秋冬各自的间隔天数，仅 seasonal 模式使用。
  seasonalIntervals: v.optional(
    v.object({ springSummer: v.number(), autumnWinter: v.number() }),
  ),
  createdBy: v.id("users"),
  createdAt: utcTimestampValidator,
  updatedAt: utcTimestampValidator,
};

export const taskCompletionLogFields = {
  taskId: v.id("plantTasks"),
  plantId: v.id("plants"),
  familyId: v.id("families"),
  completedBy: v.id("users"),
  completedAt: utcTimestampValidator,
  taskType: plantTaskTypeValidator,
  intervalDays: v.number(),
  // 任务完成附图（GAL-001）：可选，完成任务后追加的照片 storageId。
  imageStorageId: v.optional(v.id("_storage")),
};

export const pushSubscriptionFields = {
  userId: v.id("users"),
  familyId: v.id("families"),
  endpoint: v.string(),
  p256dh: v.string(),
  auth: v.string(),
  deviceLabel: v.string(),
  userAgent: optionalTrimmedTextValidator,
  lastSeenAt: utcTimestampValidator,
  createdAt: utcTimestampValidator,
};
