import { careTaskTypeValues } from "../features/tasks/taskTypes";
import type { ScheduleMode, SeasonalIntervals } from "../features/tasks/scheduling";

export type { ScheduleMode, SeasonalIntervals };

export const familyRoleValues = ["owner", "admin", "member"] as const;
export type FamilyRole = (typeof familyRoleValues)[number];

export const plantTaskTypeValues = careTaskTypeValues;
export type PlantTaskType = (typeof plantTaskTypeValues)[number];

export type TimestampMs = number;

export type UserId = string;
export type FamilyId = string;
export type PlantId = string;
export type PlantTaskId = string;
export type StorageId = string;

export interface UserProfile {
  id: UserId;
  name: string | null;
  image: string | null;
  email: string | null;
  displayName: string | null;
  createdAt: TimestampMs;
  updatedAt: TimestampMs;
}

export interface Family {
  id: FamilyId;
  name: string;
  inviteCode: string;
  createdBy: UserId;
  createdAt: TimestampMs;
}

export interface FamilyMember {
  id: string;
  familyId: FamilyId;
  userId: UserId;
  role: FamilyRole;
  joinedAt: TimestampMs;
}

export interface Plant {
  id: PlantId;
  familyId: FamilyId;
  name: string;
  description: string | null;
  notes: string | null;
  location: string | null;
  imageStorageId: StorageId | null;
  createdBy: UserId;
  createdAt: TimestampMs;
  updatedAt: TimestampMs;
  isArchived: boolean;
  archivedAt: TimestampMs | null;
}

export interface PlantTask {
  id: PlantTaskId;
  plantId: PlantId;
  familyId: FamilyId;
  taskType: PlantTaskType;
  customLabel: string | null;
  intervalDays: number;
  enabled: boolean;
  lastCompletedAt: TimestampMs | null;
  lastNotifiedAt: TimestampMs | null;
  nextDueAt: TimestampMs;
  createdBy: UserId;
  createdAt: TimestampMs;
  updatedAt: TimestampMs;
  // FLEX-008: 排期模式字段
  scheduleMode: ScheduleMode;
  weeklyDays: number[] | null;
  seasonalIntervals: SeasonalIntervals | null;
}

export interface TaskCompletionLog {
  id: string;
  taskId: PlantTaskId;
  plantId: PlantId;
  familyId: FamilyId;
  completedBy: UserId;
  completedAt: TimestampMs;
  taskType: PlantTaskType;
  intervalDays: number;
}

export interface PushSubscriptionRecord {
  id: string;
  userId: UserId;
  familyId: FamilyId;
  endpoint: string;
  p256dh: string;
  auth: string;
  deviceLabel: string;
  userAgent: string | null;
  lastSeenAt: TimestampMs;
  createdAt: TimestampMs;
}

// ─── 多图图集（GAL-011）─────────────────────────────────────

/** 图集单项数据（getPlantDetail 返回 gallery 数组的单项）。 */
export interface GalleryItem {
  imageStorageId: StorageId;
  thumbnailStorageId: StorageId;
  thumbnailUrl: string | null;
  uploadedBy: UserId;
  uploadedAt: TimestampMs;
  caption?: string;
}

// ─── 推送时间偏好（PUSH-008）─────────────────────────────────

/** 用户推送时间偏好。 */
export interface NotificationPreferences {
  /** 偏好推送小时（0-23）。 */
  preferredHour: number;
  /** IANA 时区标识（如 "Asia/Shanghai"）。 */
  timezone: string;
}

// ─── 植物分组与房间筛选（GRP-002）─────────────────────────────

/** 按位置分组后的植物组。 */
export interface PlantGroup {
  /** 位置名称；null 表示"未分组"。 */
  location: string | null;
  /** 该组内的植物列表。 */
  plants: PlantListItem[];
}

/** 植物列表页单项数据（PlantGroupView / PlantListPage 消费）。 */
export interface PlantListItem {
  id: PlantId;
  name: string;
  location: string | null;
  imageUrl: string | null;
  nextDueTask: {
    taskType: string;
    customLabel: string | null;
    nextDueAt: number;
  } | null;
}

// ─── 养护历史时间线（CARE-HIST-002）─────────────────────────────

/** 单条植物养护完成日志（listPlantCompletionLogs 返回值单项）。 */
export interface PlantCompletionLogEntry {
  logId: string;
  taskType: PlantTaskType;
  customLabel: string | null;
  completedByName: string;
  completedByImageStorageId: string | null;
  completedAt: TimestampMs;
}

/** 家庭动态单条（listFamilyRecentActivity 返回值单项）。 */
export interface FamilyActivityEntry {
  logId: string;
  taskType: PlantTaskType;
  customLabel: string | null;
  completedByName: string;
  completedByImageStorageId: string | null;
  plantName: string;
  plantId: PlantId;
  completedAt: TimestampMs;
}
