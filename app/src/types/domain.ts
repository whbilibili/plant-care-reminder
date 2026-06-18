import { careTaskTypeValues } from "../features/tasks/taskTypes";

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
