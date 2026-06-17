import { v } from "convex/values";
import { careTaskTypeValues } from "../../src/features/tasks/taskTypes";

export const familyRoleValues = ["admin", "member"] as const;
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
