import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "process due task notifications",
  { minutes: 30 },
  internal.notificationsNode.processDueTaskNotifications,
  {},
);

export default crons;
