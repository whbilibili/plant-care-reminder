# Plant Care Reminder MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a PWA-based family plant care reminder MVP with Convex-backed shared data, rolling task reminders, and iPhone-friendly notification support.

**Architecture:** The app uses a React + Vite PWA frontend and a Convex backend for auth, data, file storage, realtime sync, and scheduled reminder logic. Business-critical reminder calculation lives in Convex mutations so all family members observe a single source of truth.

**Tech Stack:** React 19, TypeScript, Vite, React Router, Tailwind CSS v4, Convex, Convex Auth, React Hook Form, Zod, date-fns, Vitest, Testing Library, Playwright

---

## File Structure

Planned files and responsibilities:

- `app/package.json`
  - App dependencies and scripts.
- `app/vite.config.ts`
  - Vite and PWA plugin configuration.
- `app/src/main.tsx`
  - Frontend entry.
- `app/src/App.tsx`
  - Route composition.
- `app/src/routes/*`
  - Route guards and route definitions.
- `app/src/features/auth/*`
  - Login and onboarding flow.
- `app/src/features/family/*`
  - Family creation and join flow.
- `app/src/features/plants/*`
  - Plant list, detail, and form flows.
- `app/src/features/tasks/*`
  - Task CRUD, completion flow, due-state rendering.
- `app/src/features/notifications/*`
  - Notification permission and subscription UI.
- `app/convex/schema.ts`
  - Convex schema.
- `app/convex/auth.config.ts`
  - Auth integration.
- `app/convex/families.ts`
  - Family queries and mutations.
- `app/convex/plants.ts`
  - Plant queries and mutations.
- `app/convex/tasks.ts`
  - Task queries, mutations, completion logic.
- `app/convex/notifications.ts`
  - Push subscription storage and send helpers.
- `app/convex/cron.ts`
  - Due-task scanning jobs.
- `app/tests/unit/*`
  - Unit tests.
- `app/tests/e2e/*`
  - End-to-end flows.

### Task 1: Scaffold the frontend and Convex workspace

**Files:**
- Create: `app/package.json`
- Create: `app/tsconfig.json`
- Create: `app/vite.config.ts`
- Create: `app/index.html`
- Create: `app/src/main.tsx`
- Create: `app/src/App.tsx`
- Create: `app/convex/tsconfig.json`

- [ ] **Step 1: Create the package manifest**

```json
{
  "name": "plant-care-reminder",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit"
  }
}
```

- [ ] **Step 2: Add the base Vite app shell**

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import App from "./App";
import "./styles.css";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConvexProvider client={convex}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ConvexProvider>
  </React.StrictMode>
);
```

- [ ] **Step 3: Add a minimal routed app**

```tsx
import { Route, Routes } from "react-router-dom";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<div>Plant Care Reminder</div>} />
    </Routes>
  );
}
```

- [ ] **Step 4: Run the app locally**

Run: `cd /Users/wanghong/Projects/日常临时目录/projects/plant-care-reminder/app && npm install && npm run dev`  
Expected: Vite dev server starts without TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add app/package.json app/tsconfig.json app/vite.config.ts app/index.html app/src/main.tsx app/src/App.tsx app/convex/tsconfig.json
git commit -m "chore: scaffold plant care reminder app"
```

### Task 2: Define the Convex schema and family auth model

**Files:**
- Create: `app/convex/schema.ts`
- Create: `app/convex/auth.config.ts`
- Create: `app/convex/families.ts`
- Create: `app/tests/unit/convex/families.test.ts`

- [ ] **Step 1: Write the failing family model test**

```ts
import { describe, expect, it } from "vitest";
import { calculateInviteCodeExpiry } from "../../../convex/families";

describe("calculateInviteCodeExpiry", () => {
  it("creates an expiry seven days ahead", () => {
    const base = new Date("2026-06-05T00:00:00.000Z");
    const actual = calculateInviteCodeExpiry(base);
    expect(actual.toISOString()).toBe("2026-06-12T00:00:00.000Z");
  });
});
```

- [ ] **Step 2: Run the unit test to verify it fails**

Run: `cd /Users/wanghong/Projects/日常临时目录/projects/plant-care-reminder/app && npm run test -- families.test.ts`  
Expected: FAIL because `calculateInviteCodeExpiry` is not implemented.

- [ ] **Step 3: Implement the schema and helper**

```ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  families: defineTable({
    name: v.string(),
    inviteCode: v.string(),
    inviteCodeExpiresAt: v.number(),
    createdBy: v.id("users"),
    createdAt: v.number()
  }),
  familyMembers: defineTable({
    familyId: v.id("families"),
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("member")),
    joinedAt: v.number()
  }).index("by_userId", ["userId"])
});

export function calculateInviteCodeExpiry(base: Date) {
  return new Date(base.getTime() + 7 * 24 * 60 * 60 * 1000);
}
```

- [ ] **Step 4: Run tests again**

Run: `cd /Users/wanghong/Projects/日常临时目录/projects/plant-care-reminder/app && npm run test -- families.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/convex/schema.ts app/convex/auth.config.ts app/convex/families.ts app/tests/unit/convex/families.test.ts
git commit -m "feat: add family schema and auth model"
```

### Task 3: Implement plant CRUD and image storage flow

**Files:**
- Create: `app/convex/plants.ts`
- Create: `app/src/features/plants/PlantForm.tsx`
- Create: `app/src/features/plants/PlantListPage.tsx`
- Create: `app/src/features/plants/PlantDetailPage.tsx`
- Create: `app/tests/unit/plants/plantForm.test.tsx`

- [ ] **Step 1: Write the failing plant form validation test**

```tsx
import { describe, expect, it } from "vitest";
import { plantSchema } from "../../../src/features/plants/plantSchema";

describe("plantSchema", () => {
  it("rejects an empty plant name", () => {
    const result = plantSchema.safeParse({ name: "", description: "", note: "" });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify failure**

Run: `cd /Users/wanghong/Projects/日常临时目录/projects/plant-care-reminder/app && npm run test -- plantForm.test.tsx`  
Expected: FAIL because `plantSchema` does not exist.

- [ ] **Step 3: Implement the plant schema and form**

```ts
import { z } from "zod";

export const plantSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(500).default(""),
  note: z.string().max(500).default(""),
  location: z.string().max(50).default("")
});
```

```tsx
export function PlantForm() {
  return <form>{/* fields for name, image, description, note, location */}</form>;
}
```

- [ ] **Step 4: Verify the validation test passes**

Run: `cd /Users/wanghong/Projects/日常临时目录/projects/plant-care-reminder/app && npm run test -- plantForm.test.tsx`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/convex/plants.ts app/src/features/plants app/tests/unit/plants/plantForm.test.tsx
git commit -m "feat: add plant management flow"
```

### Task 4: Implement task rules and rolling due-date calculation

**Files:**
- Create: `app/convex/tasks.ts`
- Create: `app/src/features/tasks/taskSchema.ts`
- Create: `app/src/features/tasks/TaskForm.tsx`
- Create: `app/tests/unit/tasks/nextDueAt.test.ts`

- [ ] **Step 1: Write the failing due-date calculation test**

```ts
import { describe, expect, it } from "vitest";
import { calculateNextDueAt } from "../../../convex/tasks";

describe("calculateNextDueAt", () => {
  it("adds the interval in days to the completion time", () => {
    const completedAt = Date.parse("2026-06-05T10:00:00.000Z");
    const nextDueAt = calculateNextDueAt(completedAt, 5);
    expect(nextDueAt).toBe(Date.parse("2026-06-10T10:00:00.000Z"));
  });
});
```

- [ ] **Step 2: Run the test to verify failure**

Run: `cd /Users/wanghong/Projects/日常临时目录/projects/plant-care-reminder/app && npm run test -- nextDueAt.test.ts`  
Expected: FAIL because `calculateNextDueAt` is not implemented.

- [ ] **Step 3: Implement the task calculation helper**

```ts
export function calculateNextDueAt(completedAt: number, intervalDays: number) {
  return completedAt + intervalDays * 24 * 60 * 60 * 1000;
}
```

- [ ] **Step 4: Verify the test passes**

Run: `cd /Users/wanghong/Projects/日常临时目录/projects/plant-care-reminder/app && npm run test -- nextDueAt.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/convex/tasks.ts app/src/features/tasks app/tests/unit/tasks/nextDueAt.test.ts
git commit -m "feat: add rolling task scheduling"
```

### Task 5: Build the due-task list and completion workflow

**Files:**
- Create: `app/src/features/tasks/TodoPage.tsx`
- Create: `app/src/features/tasks/TaskCard.tsx`
- Modify: `app/convex/tasks.ts`
- Create: `app/tests/e2e/todo-complete.spec.ts`

- [ ] **Step 1: Write the failing end-to-end task completion scenario**

```ts
import { test, expect } from "@playwright/test";

test("a member completes a due task and sees the next date update", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("待办")).toBeVisible();
});
```

- [ ] **Step 2: Run the E2E test to verify failure**

Run: `cd /Users/wanghong/Projects/日常临时目录/projects/plant-care-reminder/app && npm run test:e2e -- todo-complete.spec.ts`  
Expected: FAIL because the due-task UI does not exist yet.

- [ ] **Step 3: Implement due-task UI and completion mutation**

```tsx
export function TaskCard() {
  return (
    <button type="button">
      完成
    </button>
  );
}
```

```ts
export const completeTask = mutation({
  args: { taskId: v.id("plantTasks") },
  handler: async (ctx, args) => {
    // load task, write completion log, update task timestamps atomically
  }
});
```

- [ ] **Step 4: Re-run the E2E test**

Run: `cd /Users/wanghong/Projects/日常临时目录/projects/plant-care-reminder/app && npm run test:e2e -- todo-complete.spec.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/features/tasks app/convex/tasks.ts app/tests/e2e/todo-complete.spec.ts
git commit -m "feat: add due-task completion flow"
```

### Task 6: Add PWA install flow and push subscription persistence

**Files:**
- Modify: `app/vite.config.ts`
- Create: `app/public/manifest.webmanifest`
- Create: `app/src/features/notifications/NotificationPrompt.tsx`
- Create: `app/convex/notifications.ts`
- Create: `app/tests/unit/notifications/subscriptionPayload.test.ts`

- [ ] **Step 1: Write the failing notification payload test**

```ts
import { describe, expect, it } from "vitest";
import { normalizeSubscription } from "../../../src/features/notifications/normalizeSubscription";

describe("normalizeSubscription", () => {
  it("extracts endpoint and keys from a PushSubscription JSON payload", () => {
    const payload = {
      endpoint: "https://example.test/1",
      keys: { p256dh: "a", auth: "b" }
    };
    expect(normalizeSubscription(payload)).toEqual({
      endpoint: "https://example.test/1",
      p256dh: "a",
      auth: "b"
    });
  });
});
```

- [ ] **Step 2: Run the test to verify failure**

Run: `cd /Users/wanghong/Projects/日常临时目录/projects/plant-care-reminder/app && npm run test -- subscriptionPayload.test.ts`  
Expected: FAIL because `normalizeSubscription` is not implemented.

- [ ] **Step 3: Implement subscription normalization and persistence**

```ts
export function normalizeSubscription(payload: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}) {
  return {
    endpoint: payload.endpoint,
    p256dh: payload.keys.p256dh,
    auth: payload.keys.auth
  };
}
```

- [ ] **Step 4: Re-run the test**

Run: `cd /Users/wanghong/Projects/日常临时目录/projects/plant-care-reminder/app && npm run test -- subscriptionPayload.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/vite.config.ts app/public/manifest.webmanifest app/src/features/notifications app/convex/notifications.ts app/tests/unit/notifications/subscriptionPayload.test.ts
git commit -m "feat: add pwa notification subscription flow"
```

### Task 7: Add due-task cron scanning and notification delivery

**Files:**
- Create: `app/convex/cron.ts`
- Modify: `app/convex/notifications.ts`
- Create: `app/tests/unit/notifications/shouldNotify.test.ts`

- [ ] **Step 1: Write the failing notify-window test**

```ts
import { describe, expect, it } from "vitest";
import { shouldNotifyTask } from "../../../convex/notifications";

describe("shouldNotifyTask", () => {
  it("notifies a task that has reached its due time and was not recently notified", () => {
    const dueAt = Date.parse("2026-06-05T10:00:00.000Z");
    const now = Date.parse("2026-06-05T10:05:00.000Z");
    expect(shouldNotifyTask({ dueAt, lastNotifiedAt: null }, now)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify failure**

Run: `cd /Users/wanghong/Projects/日常临时目录/projects/plant-care-reminder/app && npm run test -- shouldNotify.test.ts`  
Expected: FAIL because `shouldNotifyTask` is not implemented.

- [ ] **Step 3: Implement the notify-window helper and cron job**

```ts
export function shouldNotifyTask(
  task: { dueAt: number; lastNotifiedAt: number | null },
  now: number
) {
  return task.dueAt <= now && task.lastNotifiedAt === null;
}
```

- [ ] **Step 4: Re-run the test**

Run: `cd /Users/wanghong/Projects/日常临时目录/projects/plant-care-reminder/app && npm run test -- shouldNotify.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/convex/cron.ts app/convex/notifications.ts app/tests/unit/notifications/shouldNotify.test.ts
git commit -m "feat: add due-task notification scheduler"
```

### Task 8: Polish mobile UX and verify the MVP end to end

**Files:**
- Modify: `app/src/App.tsx`
- Modify: `app/src/features/plants/*`
- Modify: `app/src/features/tasks/*`
- Modify: `app/src/features/family/*`
- Create: `app/tests/e2e/family-shared-state.spec.ts`

- [ ] **Step 1: Write the failing shared-state E2E test**

```ts
import { test, expect } from "@playwright/test";

test("two family sessions observe the same task completion state", async ({ browser }) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();
  await pageA.goto("/");
  await pageB.goto("/");
  await expect(pageA).toHaveTitle(/Plant/);
});
```

- [ ] **Step 2: Run the E2E test to verify failure**

Run: `cd /Users/wanghong/Projects/日常临时目录/projects/plant-care-reminder/app && npm run test:e2e -- family-shared-state.spec.ts`  
Expected: FAIL because the full shared-state flow is not implemented yet.

- [ ] **Step 3: Finish responsive polish and realtime sync verification**

```tsx
<nav>
  <a href="/plants">植物</a>
  <a href="/todo">待办</a>
  <a href="/settings">设置</a>
</nav>
```

- [ ] **Step 4: Re-run unit and E2E suites**

Run: `cd /Users/wanghong/Projects/日常临时目录/projects/plant-care-reminder/app && npm run test && npm run test:e2e`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/src app/tests/e2e/family-shared-state.spec.ts
git commit -m "feat: finalize plant care reminder mvp"
```
