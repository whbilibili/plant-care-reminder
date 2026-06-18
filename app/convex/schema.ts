import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";

import {
  familyFields,
  familyMemberFields,
  plantFields,
  plantTaskFields,
  pushSubscriptionFields,
  taskCompletionLogFields,
  userFields,
} from "./lib/validators";

export default defineSchema({
  ...authTables,
  users: defineTable(userFields).index("email", ["email"]).index("phone", ["phone"]),
  families: defineTable(familyFields).index("by_inviteCode", ["inviteCode"]),
  familyMembers: defineTable(familyMemberFields)
    .index("by_userId", ["userId"])
    .index("by_familyId", ["familyId"])
    .index("by_familyId_and_userId", ["familyId", "userId"]),
  plants: defineTable(plantFields)
    .index("by_familyId", ["familyId"])
    .index("by_familyId_and_isArchived", ["familyId", "isArchived"]),
  plantTasks: defineTable(plantTaskFields)
    .index("by_plantId", ["plantId"])
    .index("by_familyId", ["familyId"])
    .index("by_nextDueAt", ["nextDueAt"])
    .index("by_familyId_and_nextDueAt", ["familyId", "nextDueAt"]),
  taskCompletionLogs: defineTable(taskCompletionLogFields)
    .index("by_taskId", ["taskId"])
    .index("by_familyId_and_completedAt", ["familyId", "completedAt"])
    .index("by_plantId_and_completedAt", ["plantId", "completedAt"]),
  pushSubscriptions: defineTable(pushSubscriptionFields)
    .index("by_userId", ["userId"])
    .index("by_familyId", ["familyId"])
    .index("by_familyId_and_userId", ["familyId", "userId"]),
});
