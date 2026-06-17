/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ResendOTPPasswordReset from "../ResendOTPPasswordReset.js";
import type * as auth from "../auth.js";
import type * as cron from "../cron.js";
import type * as families from "../families.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_validators from "../lib/validators.js";
import type * as notifications from "../notifications.js";
import type * as notificationsNode from "../notificationsNode.js";
import type * as plants from "../plants.js";
import type * as seedTestData from "../seedTestData.js";
import type * as tasks from "../tasks.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ResendOTPPasswordReset: typeof ResendOTPPasswordReset;
  auth: typeof auth;
  cron: typeof cron;
  families: typeof families;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  "lib/validators": typeof lib_validators;
  notifications: typeof notifications;
  notificationsNode: typeof notificationsNode;
  plants: typeof plants;
  seedTestData: typeof seedTestData;
  tasks: typeof tasks;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
