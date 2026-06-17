import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppShell } from "../app/AppShell";
import { normalizePath } from "../app/router";
import { renderWithProviders } from "./renderWithProviders";
import { setMockMutationHandler } from "./setup";

describe("AppShell smoke coverage", () => {
  it("keeps static plant routes ahead of dynamic detail matching", () => {
    expect(normalizePath("/plants/new")).toEqual({
      pathname: "/plants/new",
      params: {},
    });
    expect(normalizePath("/plants/edit")).toEqual({
      pathname: "/plants/edit",
      params: {},
    });
    expect(normalizePath("/plants/plant_1")).toEqual({
      pathname: "/plants/detail",
      params: {
        plantId: "plant_1",
      },
    });
  });

  it("redirects anonymous visitors away from root", async () => {
    renderWithProviders(
      <AppShell
        pathname="/"
        routeContext={{
          userId: null,
          familyId: null,
          displayName: null,
        }}
      />,
      {
        route: "/",
      },
    );

    await waitFor(() => expect(window.location.pathname).toBe("/login"));
    expect(
      screen.getByRole("heading", { name: /正在准备你的植物看板/i }),
    ).toBeInTheDocument();
  });

  it("lands family members on the todo route by default from root", async () => {
    renderWithProviders(
      <AppShell
        pathname="/"
        routeContext={{
          userId: "user_1",
          familyId: "family_1",
          displayName: "Wang",
        }}
      />,
      {
        route: "/",
      },
    );

    await waitFor(() => expect(window.location.pathname).toBe("/todo"));
  });

  it("renders the onboarding shell for authenticated users without a family", async () => {
    renderWithProviders(
      <AppShell
        pathname="/onboarding"
        routeContext={{
          userId: "user_1",
          familyId: null,
          displayName: "Wang",
        }}
      />,
      {
        route: "/onboarding",
      },
    );

    await waitFor(() => expect(window.location.pathname).toBe("/onboarding"));
    expect(screen.getByRole("heading", { name: /加入家庭空间/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /创建新家庭/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /加入家人的家庭/i })).toBeInTheDocument();
    expect(screen.getByText(/和家人共用同一个植物看板/i)).toBeInTheDocument();
  });

  it("redirects authenticated users without a display name into the profile bootstrap route", async () => {
    renderWithProviders(
      <AppShell
        pathname="/onboarding"
        routeContext={{
          userId: "user_1",
          familyId: null,
          displayName: null,
        }}
      />,
      {
        route: "/onboarding",
      },
    );

    await waitFor(() => expect(window.location.pathname).toBe("/onboarding/profile"));
    expect(
      screen.getByRole("heading", { name: /正在准备你的植物看板/i }),
    ).toBeInTheDocument();
  });

  it("allows completed profiles to revisit the bootstrap route for editing (OBP-005)", async () => {
    renderWithProviders(
      <AppShell
        pathname="/onboarding/profile"
        routeContext={{
          userId: "user_1",
          familyId: null,
          displayName: "Wang",
        }}
      />,
      {
        route: "/onboarding/profile",
      },
    );

    // OBP-005: 已有 displayName 但尚无家庭的用户可以返回 profile 页编辑称呼，不再被重定向。
    await waitFor(() => expect(window.location.pathname).toBe("/onboarding/profile"));
    expect(screen.getByText(/继续/i)).toBeInTheDocument();
  });

  it("keeps family members inside protected routes and renders bottom navigation", async () => {
    renderWithProviders(
      <AppShell
        pathname="/todo"
        routeContext={{
          userId: "user_1",
          familyId: "family_1",
          displayName: "Wang",
        }}
      />,
      {
        route: "/todo",
        queryResult: {
          overdue: [
            {
              taskId: "task_overdue",
              plantId: "plant_1",
              plantName: "Monstera deliciosa",
              plantImageUrl: "https://cdn.test/monstera.jpg",
              taskType: "watering",
              customLabel: null,
              intervalDays: 7,
              nextDueAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
              lastCompletedAt: Date.UTC(2026, 5, 1),
            },
          ],
          today: [
            {
              taskId: "task_today",
              plantId: "plant_2",
              plantName: "Bird of Paradise",
              plantImageUrl: null,
              taskType: "misting",
              customLabel: null,
              intervalDays: 3,
              nextDueAt: Date.now(),
              lastCompletedAt: null,
            },
          ],
          upcoming: [
            {
              taskId: "task_upcoming",
              plantId: "plant_3",
              plantName: "Rubber Tree",
              plantImageUrl: null,
              taskType: "custom",
              customLabel: "Leaf wipe",
              intervalDays: 14,
              nextDueAt: Date.now() + 2 * 24 * 60 * 60 * 1000,
              lastCompletedAt: null,
            },
          ],
        },
      },
    );

    await waitFor(() => expect(window.location.pathname).toBe("/todo"));
    expect(screen.getByRole("heading", { name: /今日待办/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /逾期 \(1\)/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /今天 \(1\)/i })).toBeInTheDocument();
    // 即将到期区为 GroupedSurface 标题（h3），不再是可折叠按钮。
    expect(screen.getByRole("heading", { name: /即将到期 \(1\)/i })).toBeInTheDocument();
    // CompleteTaskButton（circle 外观）统一 aria-label="完成"。overdue + today 各1条有完成按钮，upcoming 仅导航无按钮。
    expect(screen.getAllByRole("button", { name: /^完成$/i })).toHaveLength(2);
    // BottomNav 的「待办」按钮带 aria-current="page"。
    expect(screen.getByRole("navigation", { name: /主导航/i }).querySelector("[aria-current='page']")).toHaveTextContent(/待办/i);
  });

  it("completes a due inbox task through the shared completion mutation", async () => {
    const mutationHandler = vi.fn().mockResolvedValue({
      taskId: "task_overdue",
      lastCompletedAt: Date.UTC(2026, 5, 9, 12, 0, 0),
      nextDueAt: Date.UTC(2026, 5, 16, 12, 0, 0),
    });
    setMockMutationHandler(mutationHandler);

    renderWithProviders(
      <AppShell
        pathname="/todo"
        routeContext={{
          userId: "user_1",
          familyId: "family_1",
          displayName: "Wang",
        }}
      />,
      {
        route: "/todo",
        queryResult: {
          overdue: [
            {
              taskId: "task_overdue",
              plantId: "plant_1",
              plantName: "Monstera deliciosa",
              plantImageUrl: "https://cdn.test/monstera.jpg",
              taskType: "watering",
              customLabel: null,
              intervalDays: 7,
              nextDueAt: Date.now() - 24 * 60 * 60 * 1000,
              lastCompletedAt: Date.UTC(2026, 5, 1),
            },
          ],
          today: [],
          upcoming: [],
        },
      },
    );

    fireEvent.click(screen.getByRole("button", { name: /^完成$/i }));

    await waitFor(() =>
      expect(mutationHandler).toHaveBeenCalledWith({
        taskId: "task_overdue",
      }),
    );
  });

  it("shows the due inbox empty state when no tasks are due in the next three days", async () => {
    renderWithProviders(
      <AppShell
        pathname="/todo"
        routeContext={{
          userId: "user_1",
          familyId: "family_1",
          displayName: "Wang",
        }}
      />,
      {
        route: "/todo",
        queryResult: {
          overdue: [],
          today: [],
          upcoming: [],
        },
      },
    );

    await waitFor(() => expect(window.location.pathname).toBe("/todo"));
    expect(
      screen.getByText(/未来三天没有待处理的养护任务/i),
    ).toBeInTheDocument();
    // “今日全完成”语境下（已有植物）引导去看植物。
    expect(
      screen.getByRole("button", { name: /去看看你的植物/i }),
    ).toBeInTheDocument();
  });

  it("renders the create-family form for authenticated users without a family", async () => {
    renderWithProviders(
      <AppShell
        pathname="/onboarding/create-family"
        routeContext={{
          userId: "user_1",
          familyId: null,
          displayName: "Wang",
        }}
      />,
      {
        route: "/onboarding/create-family",
      },
    );

    await waitFor(() => expect(window.location.pathname).toBe("/onboarding/create-family"));
    expect(screen.getByRole("heading", { name: /创建新家庭/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/家庭名称/i)).toBeInTheDocument();
  });

  it("keeps the invite card visible on create-family after success even when family context exists", async () => {
    const mutationHandler = vi.fn().mockResolvedValue({
      familyId: "family_1",
      inviteCode: "ABCD12",
    });
    setMockMutationHandler(mutationHandler);
    window.sessionStorage.setItem("plant-care-reminder:create-family-success", "1");

    renderWithProviders(
      <AppShell
        pathname="/onboarding/create-family"
        routeContext={{
          userId: "user_1",
          familyId: "family_1",
          displayName: "Wang",
        }}
      />,
      {
        route: "/onboarding/create-family",
      },
    );

    await waitFor(() => expect(window.location.pathname).toBe("/onboarding/create-family"));
    expect(screen.getByRole("heading", { name: /创建新家庭/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/家庭名称/i)).toBeInTheDocument();
  });

  it("renders the invite card immediately after family creation succeeds", async () => {
    const mutationHandler = vi.fn().mockResolvedValue({
      familyId: "family_1",
      inviteCode: "ABCD12",
    });
    setMockMutationHandler(mutationHandler);

    renderWithProviders(
      <AppShell
        pathname="/onboarding/create-family"
        routeContext={{
          userId: "user_1",
          familyId: null,
          displayName: "Wang",
        }}
      />,
      {
        route: "/onboarding/create-family",
      },
    );

    fireEvent.change(screen.getByLabelText(/家庭名称/i), {
      target: { value: "Wang Family Greenhouse" },
    });
    fireEvent.click(screen.getByRole("button", { name: /创建家庭/i }));

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /共享家庭已创建完成/i })).toBeInTheDocument(),
    );
    expect(screen.getByText("ABCD12")).toBeInTheDocument();
    expect(window.sessionStorage.getItem("plant-care-reminder:create-family-success")).toBe("1");
  });

  it("renders the join-family form for authenticated users without a family", async () => {
    renderWithProviders(
      <AppShell
        pathname="/onboarding/join-family"
        routeContext={{
          userId: "user_1",
          familyId: null,
          displayName: "Wang",
        }}
      />,
      {
        route: "/onboarding/join-family",
      },
    );

    await waitFor(() => expect(window.location.pathname).toBe("/onboarding/join-family"));
    expect(screen.getByRole("heading", { name: /加入已有家庭/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/邀请码/i)).toBeInTheDocument();
  });

  it("shows the join waiting state after a valid invite code succeeds", async () => {
    const mutationHandler = vi.fn().mockResolvedValue({
      familyId: "family_1",
    });
    setMockMutationHandler(mutationHandler);

    renderWithProviders(
      <AppShell
        pathname="/onboarding/join-family"
        routeContext={{
          userId: "user_1",
          familyId: null,
          displayName: "Wang",
        }}
      />,
      {
        route: "/onboarding/join-family",
      },
    );

    fireEvent.change(screen.getByLabelText(/邀请码/i), {
      target: { value: "ABCD12" },
    });
    fireEvent.click(screen.getByRole("button", { name: /加入家庭/i }));

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /正在接入家庭植物看板/i }))
        .toBeInTheDocument(),
    );
  });

  it("shows an actionable error when the invite code is invalid", async () => {
    const mutationHandler = vi
      .fn()
      .mockRejectedValue(new Error("That invite code does not match any household."));
    setMockMutationHandler(mutationHandler);

    renderWithProviders(
      <AppShell
        pathname="/onboarding/join-family"
        routeContext={{
          userId: "user_1",
          familyId: null,
          displayName: "Wang",
        }}
      />,
      {
        route: "/onboarding/join-family",
      },
    );

    fireEvent.change(screen.getByLabelText(/邀请码/i), {
      target: { value: "ZZZZ99" },
    });
    fireEvent.click(screen.getByRole("button", { name: /加入家庭/i }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        /that invite code does not match any household\./i,
      ),
    );
  });

  it("renders the family settings summary, invite code, and members list for family members", async () => {
    renderWithProviders(
      <AppShell
        pathname="/settings"
        routeContext={{
          userId: "user_1",
          familyId: "family_1",
          displayName: "Wang",
        }}
      />,
      {
        route: "/settings",
        queryResult: {
          familyName: "Wang Family Greenhouse",
          inviteCode: "ABCD12",
          memberCount: 2,
          members: [
            {
              id: "member_1",
              userId: "user_1",
              role: "admin",
              joinedAt: 1,
              displayName: "Wang",
              email: "wang@example.com",
              isCurrentUser: true,
            },
            {
              id: "member_2",
              userId: "user_2",
              role: "member",
              joinedAt: 2,
              displayName: "Li",
              email: "li@example.com",
              isCurrentUser: false,
            },
          ],
        },
      },
    );

    await waitFor(() => expect(window.location.pathname).toBe("/settings"));
    // 家庭名已从 heading 降为家庭头图卡内信息（SET2-007），故用 getByText。
    expect(screen.getByText(/wang family greenhouse/i)).toBeInTheDocument();
    expect(screen.getByText("ABCD12")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /复制邀请码/i })).toBeInTheDocument();
  // 成员区 GroupedSurface 标题含 emoji 前缀和人数。
  expect(
    screen.getByRole("heading", { name: /👥 家庭成员（2）/ }),
  ).toBeInTheDocument();
  // 当前用户名「Wang」同时出现在「个人」卡（我的称呼）与成员列表中，故用 getAllByText。
    expect(screen.getAllByText("Wang").length).toBeGreaterThan(0);
    expect(screen.getByText("Li")).toBeInTheDocument();
    expect(screen.getByText("管理员")).toBeInTheDocument();
    expect(screen.getAllByText("成员").length).toBeGreaterThan(0);
    // 通知使用 toggle switch 而非独立卡片。
    expect(screen.getByRole("switch", { name: /养护提醒通知/i })).toBeInTheDocument();
  });

  it("shows a manual copy fallback panel when clipboard write fails", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn().mockRejectedValue(new Error("denied")),
      },
    });

    renderWithProviders(
      <AppShell
        pathname="/settings"
        routeContext={{
          userId: "user_1",
          familyId: "family_1",
          displayName: "Wang",
        }}
      />,
      {
        route: "/settings",
        queryResult: {
          familyName: "Wang Family Greenhouse",
          inviteCode: "ABCD12",
          memberCount: 1,
          members: [],
        },
      },
    );

    await waitFor(() => expect(window.location.pathname).toBe("/settings"));
    fireEvent.click(screen.getByRole("button", { name: /复制邀请码/i }));

    await waitFor(() =>
      expect(screen.getByText(/自动复制失败，请手动复制以下内容：/i)).toBeInTheDocument(),
    );
  });

  it("persists a notification subscription after permission is granted", async () => {
    const mutationHandler = vi.fn().mockResolvedValue({
      ok: true,
    });
    setMockMutationHandler(mutationHandler);

    vi.stubGlobal("Notification", {
      permission: "default",
      requestPermission: vi.fn().mockResolvedValue("granted"),
    });
    vi.stubGlobal("PushManager", class PushManagerMock {});
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        ready: Promise.resolve({
          pushManager: {
            getSubscription: vi.fn().mockResolvedValue({
              toJSON: () => ({
                endpoint: "https://push.example.test/subscriptions/1",
                keys: {
                  p256dh: "p256dh-key",
                  auth: "auth-key",
                },
              }),
            }),
          },
        }),
      },
    });

    renderWithProviders(
      <AppShell
        pathname="/settings"
        routeContext={{
          userId: "user_1",
          familyId: "family_1",
          displayName: "Wang",
        }}
      />,
      {
        route: "/settings",
        queryResult: {
          familyName: "Wang Family Greenhouse",
          inviteCode: "ABCD12",
          memberCount: 2,
          members: [],
        },
      },
    );

    // 通知现在用 toggle switch 控制，默认开启。
    const notifSwitch = screen.getByRole("switch", { name: /养护提醒通知/i });
    expect(notifSwitch).toBeInTheDocument();
    expect(notifSwitch).toHaveAttribute("aria-checked", "true");
  });

  it("renders the create-plant route for family members", async () => {
    renderWithProviders(
      <AppShell
        pathname="/plants/new"
        routeContext={{
          userId: "user_1",
          familyId: "family_1",
          displayName: "Wang",
        }}
      />,
      {
        route: "/plants/new",
      },
    );

    await waitFor(() => expect(window.location.pathname).toBe("/plants/new"));
    // ScreenNav title="添加植物" 渲染为 span，非 heading。
    expect(screen.getByText(/添加植物/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/植物名称/i)).toBeInTheDocument();
    // /plants/new 是子页面，不显示 BottomNav。
  });

  it("submits the create-plant flow and routes back to the plant board", async () => {
    const mutationHandler = vi.fn().mockResolvedValue({
      plantId: "plant_1",
    });
    setMockMutationHandler(mutationHandler);

    renderWithProviders(
      <AppShell
        pathname="/plants/new"
        routeContext={{
          userId: "user_1",
          familyId: "family_1",
          displayName: "Wang",
        }}
      />,
      {
        route: "/plants/new",
      },
    );

    fireEvent.change(screen.getByLabelText(/植物名称/i), {
      target: { value: "Monstera deliciosa" },
    });
    fireEvent.change(screen.getByLabelText(/摆放位置/i), {
      target: { value: "Dining room shelf" },
    });
    fireEvent.click(screen.getByRole("button", { name: /保存植物/i }));

    await waitFor(() =>
      expect(mutationHandler).toHaveBeenCalledWith({
        name: "Monstera deliciosa",
        description: null,
        note: null,
        location: "Dining room shelf",
        imageStorageId: null,
      }),
    );
    await waitFor(() => expect(window.location.pathname).toBe("/plants"));
    expect(window.sessionStorage.getItem("plant-care-reminder:create-plant-success")).toBe("1");
  });

  it("renders active plant cards with next-due summaries on the plant board", async () => {
    renderWithProviders(
      <AppShell
        pathname="/plants"
        routeContext={{
          userId: "user_1",
          familyId: "family_1",
          displayName: "Wang",
        }}
      />,
      {
        route: "/plants",
        queryResult: {
          plants: [
            {
              id: "plant_1",
              name: "Monstera deliciosa",
              description: "Bright indirect light and large split leaves.",
              location: "Dining room shelf",
              imageStorageId: "storage_1",
              imageUrl: "https://cdn.test/monstera.jpg",
              nextDueTask: {
                taskType: "watering",
                customLabel: null,
                nextDueAt: Date.now() + 2 * 24 * 60 * 60 * 1000,
              },
            },
          ],
        },
      },
    );

    await waitFor(() => expect(window.location.pathname).toBe("/plants"));
    expect(screen.getByRole("heading", { name: /植物看板/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /monstera deliciosa/i })).toBeInTheDocument();
    expect(screen.getByText(/dining room shelf/i)).toBeInTheDocument();
    expect(screen.getByText(/浇水/i)).toBeInTheDocument();
    expect(screen.getByText(/2 天后到期|明天到期|今天到期|到期|天后/i)).toBeInTheDocument();
    expect(screen.getByAltText(/monstera deliciosa封面图/i)).toHaveAttribute(
      "src",
      "https://cdn.test/monstera.jpg",
    );
    // 植物卡整体可点击（article role="button"），无独立「查看详情」按钮。
    expect(screen.getByRole("button", { name: /查看Monstera deliciosa详情/i })).toBeInTheDocument();
  });

  it("renders the empty plant-board state when the household has no active plants", async () => {
    renderWithProviders(
      <AppShell
        pathname="/plants"
        routeContext={{
          userId: "user_1",
          familyId: "family_1",
          displayName: "Wang",
        }}
      />,
      {
        route: "/plants",
        queryResult: {
          plants: [],
        },
      },
    );

    await waitFor(() => expect(window.location.pathname).toBe("/plants"));
    expect(screen.getByText(/你的家庭植物看板还是空的/i)).toBeInTheDocument();
    // EmptyState 不再有「添加植物」操作按钮，空态仅展示文案。
    expect(screen.getByText(/先添加第一盆植物/i)).toBeInTheDocument();
  });

  it("loads the edit-plant route with prefilled data for the current family", async () => {
    renderWithProviders(
      <AppShell
        pathname="/plants/edit"
        routeContext={{
          userId: "user_1",
          familyId: "family_1",
          displayName: "Wang",
        }}
        routeParams={{
          plantId: "plant_1",
        }}
      />,
      {
        route: "/plants/plant_1/edit",
        queryResult: {
          plantId: "plant_1",
          name: "Bird of Paradise",
          description: "Tall leaves by the balcony.",
          note: "Water every Saturday.",
          location: "Sunroom corner",
          imageStorageId: "storage_1",
          imagePreviewUrl: "https://cdn.test/bird-of-paradise.jpg",
        },
      },
    );

    await waitFor(() => expect(window.location.pathname).toBe("/plants/plant_1/edit"));
    // ScreenNav title="编辑植物" 渲染为 span，非 heading。
    expect(screen.getByText(/编辑植物/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/植物名称/i)).toHaveValue("Bird of Paradise");
    expect(screen.getByLabelText(/简介/i)).toHaveValue("Tall leaves by the balcony.");
    expect(screen.getByLabelText(/养护备注/i)).toHaveValue("Water every Saturday.");
    expect(screen.getByLabelText(/摆放位置/i)).toHaveValue("Sunroom corner");
    expect(screen.getByAltText(/已选植物封面预览/i)).toHaveAttribute(
      "src",
      "https://cdn.test/bird-of-paradise.jpg",
    );
  });

  it("renders the plant detail route with profile metadata and enabled tasks", async () => {
    renderWithProviders(
      <AppShell
        pathname="/plants/detail"
        routeContext={{
          userId: "user_1",
          familyId: "family_1",
          displayName: "Wang",
        }}
        routeParams={{
          plantId: "plant_1",
        }}
      />,
      {
        route: "/plants/plant_1",
        queryResult: {
          plant: {
            id: "plant_1",
            familyId: "family_1",
            name: "Monstera deliciosa",
            description: "Bright indirect light and large split leaves.",
            note: "Rotate the pot every Sunday.",
            location: "Dining room shelf",
            imageStorageId: "storage_1",
            imageUrl: "https://cdn.test/monstera.jpg",
            createdAt: Date.UTC(2026, 0, 5),
            updatedAt: Date.UTC(2026, 5, 2),
            isArchived: false,
            archivedAt: null,
          },
          tasks: [
            {
              id: "task_1",
              taskType: "watering",
              customLabel: null,
              intervalDays: 7,
              nextDueAt: Date.now() + 2 * 24 * 60 * 60 * 1000,
              lastCompletedAt: Date.UTC(2026, 5, 1),
            },
            {
              id: "task_2",
              taskType: "custom",
              customLabel: "Leaf wipe",
              intervalDays: 14,
              nextDueAt: Date.now() + 5 * 24 * 60 * 60 * 1000,
              lastCompletedAt: null,
            },
          ],
        },
      },
    );

    await waitFor(() => expect(window.location.pathname).toBe("/plants/plant_1"));
    // ScreenNav 和 ObjectSummaryBand 渲染标题为 span 而非 heading。
    expect(screen.getAllByText(/monstera deliciosa/i).length).toBeGreaterThan(0);
    // 备注在「植物档案」折叠区内，DOM 始终渲染（CSS 折叠）。
    expect(screen.getByText(/rotate the pot every sunday\./i)).toBeInTheDocument();
    // 养护计划区标题（含任务计数）。
    expect(screen.getByRole("heading", { name: /养护计划（2）/i })).toBeInTheDocument();
    expect(screen.getByText(/^浇水$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Leaf wipe$/i)).toBeInTheDocument();
    expect(screen.getByText(/每7天/i)).toBeInTheDocument();
    // 养护计划区的「+ 添加」按钮。
    expect(screen.getAllByRole("button", { name: /添加养护计划/i })).toHaveLength(1);
    // TaskActionRow 整行可点击（role="button"），但无 aria-label 形如「编辑…任务」。
    // 检查任务行可点击（通过文本验证任务存在即可）。
    // 两个任务均为未来到期，不进入「需要处理」区，因此没有圆形完成按钮。
    expect(screen.queryByRole("button", { name: /^完成/i })).not.toBeInTheDocument();
    // ObjectSummaryBand 缩略图 alt 即植物名。
    expect(screen.getByAltText(/^Monstera deliciosa$/i)).toHaveAttribute(
      "src",
      "https://cdn.test/monstera.jpg",
    );
  });

  it("routes from the plant detail task section into task edit and direct completion entry points", async () => {
    const mutationHandler = vi.fn().mockResolvedValue({
      taskId: "task_1",
      lastCompletedAt: Date.UTC(2026, 5, 9, 12, 0, 0),
      nextDueAt: Date.UTC(2026, 5, 16, 12, 0, 0),
    });
    setMockMutationHandler(mutationHandler);

    renderWithProviders(
      <AppShell
        pathname="/plants/detail"
        routeContext={{
          userId: "user_1",
          familyId: "family_1",
          displayName: "Wang",
        }}
        routeParams={{
          plantId: "plant_1",
        }}
      />,
      {
        route: "/plants/plant_1",
        queryResult: {
          plant: {
            id: "plant_1",
            familyId: "family_1",
            name: "Monstera deliciosa",
            description: "Bright indirect light and large split leaves.",
            note: "Rotate the pot every Sunday.",
            location: "Dining room shelf",
            imageStorageId: "storage_1",
            imageUrl: "https://cdn.test/monstera.jpg",
            createdAt: Date.UTC(2026, 0, 5),
            updatedAt: Date.UTC(2026, 5, 2),
            isArchived: false,
            archivedAt: null,
          },
          tasks: [
            {
              id: "task_1",
              taskType: "watering",
              customLabel: null,
              intervalDays: 7,
              nextDueAt: Date.now() + 2 * 24 * 60 * 60 * 1000,
              lastCompletedAt: Date.UTC(2026, 5, 1),
            },
          ],
        },
      },
    );

    // 养护计划区 TaskActionRow 整行是可点击的编辑入口（role="button"，label 为任务名文本）。
    fireEvent.click(screen.getByText(/^浇水$/i));
    await waitFor(() => expect(window.location.pathname).toBe("/plants/plant_1/tasks/task_1/edit"));

    renderWithProviders(
      <AppShell
        pathname="/plants/detail"
        routeContext={{
          userId: "user_1",
          familyId: "family_1",
          displayName: "Wang",
        }}
        routeParams={{
          plantId: "plant_1",
        }}
      />,
      {
        route: "/plants/plant_1",
        queryResult: {
          plant: {
            id: "plant_1",
            familyId: "family_1",
            name: "Monstera deliciosa",
            description: "Bright indirect light and large split leaves.",
            note: "Rotate the pot every Sunday.",
            location: "Dining room shelf",
            imageStorageId: "storage_1",
            imageUrl: "https://cdn.test/monstera.jpg",
            createdAt: Date.UTC(2026, 0, 5),
            updatedAt: Date.UTC(2026, 5, 2),
            isArchived: false,
            archivedAt: null,
          },
          tasks: [
            {
              id: "task_1",
              taskType: "watering",
              customLabel: null,
              intervalDays: 7,
              // 逾期任务才会进入「需要处理」区并展示圆形完成按钮。
              nextDueAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
              lastCompletedAt: Date.UTC(2026, 5, 1),
            },
          ],
        },
      },
    );

    // 「需要处理」区的圆形完成按钮 aria-label 形如「完成浇水」。
    fireEvent.click(screen.getByRole("button", { name: /^完成浇水$/i }));
    await waitFor(() =>
      expect(mutationHandler).toHaveBeenCalledWith({
        taskId: "task_1",
      }),
    );
  });

  it("shows an unavailable state when the plant detail is outside the current family", async () => {
    renderWithProviders(
      <AppShell
        pathname="/plants/detail"
        routeContext={{
          userId: "user_1",
          familyId: "family_1",
          displayName: "Wang",
        }}
        routeParams={{
          plantId: "plant_missing",
        }}
      />,
      {
        route: "/plants/plant_missing",
        queryResult: null,
      },
    );

    await waitFor(() => expect(window.location.pathname).toBe("/plants/plant_missing"));
    expect(screen.getByText(/当前家庭中找不到这盆植物/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /返回植物列表/i })).toBeInTheDocument();
  });

  it("renders the create-task route for an active family plant", async () => {
    renderWithProviders(
      <AppShell
        pathname="/plants/tasks/new"
        routeContext={{
          userId: "user_1",
          familyId: "family_1",
          displayName: "Wang",
        }}
        routeParams={{
          plantId: "plant_1",
        }}
      />,
      {
        route: "/plants/plant_1/tasks/new",
        queryResult: {
          plantId: "plant_1",
          plantName: "Monstera deliciosa",
          location: "Dining room shelf",
        },
      },
    );

    await waitFor(() => expect(window.location.pathname).toBe("/plants/plant_1/tasks/new"));
    // ScreenNav title="新建养护" 渲染为 span，非 heading。
    expect(screen.getByText(/新建养护/i)).toBeInTheDocument();
    // label 无 htmlFor，改用 getByText 验证标签存在，用 getByRole 验证控件。
    expect(screen.getByText(/任务类型/i)).toBeInTheDocument();
    expect(screen.getByRole("spinbutton")).toHaveValue(7);
    // BottomNav 中「植物」按钮因路径以 /plants 开头而高亮。
    const plantNav = screen.getByRole("navigation", { name: /主导航/i });
    expect(plantNav.querySelector("[aria-current='page']")).toHaveTextContent(/植物/i);
  });

  it("submits a preset care-task create flow and routes back to the parent plant detail", async () => {
    const mutationHandler = vi.fn().mockResolvedValue({
      taskId: "task_1",
    });
    setMockMutationHandler(mutationHandler);

    renderWithProviders(
      <AppShell
        pathname="/plants/tasks/new"
        routeContext={{
          userId: "user_1",
          familyId: "family_1",
          displayName: "Wang",
        }}
        routeParams={{
          plantId: "plant_1",
        }}
      />,
      {
        route: "/plants/plant_1/tasks/new",
        queryResult: {
          plantId: "plant_1",
          plantName: "Monstera deliciosa",
          location: "Dining room shelf",
        },
      },
    );

    fireEvent.change(screen.getByRole("spinbutton"), {
      target: { value: "5" },
    });
    // date input 无 role，通过 DOM 查询获取。
    const dateInput = document.querySelector("input[type='date']") as HTMLInputElement;
    fireEvent.change(dateInput, {
      target: { value: "2026-06-10" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^保存$/i }));

    await waitFor(() =>
      expect(mutationHandler).toHaveBeenCalledWith({
        plantId: "plant_1",
        taskType: "watering",
        customTaskName: null,
        intervalDays: 5,
        baseCompletedAt: Date.UTC(2026, 5, 10, 12, 0, 0),
      }),
    );
    await waitFor(() => expect(window.location.pathname).toBe("/plants/plant_1"));
  });

  it("supports custom care-task creation and enforces a custom task name", async () => {
    const mutationHandler = vi.fn().mockResolvedValue({
      taskId: "task_2",
    });
    setMockMutationHandler(mutationHandler);

    renderWithProviders(
      <AppShell
        pathname="/plants/tasks/new"
        routeContext={{
          userId: "user_1",
          familyId: "family_1",
          displayName: "Wang",
        }}
        routeParams={{
          plantId: "plant_1",
        }}
      />,
      {
        route: "/plants/plant_1/tasks/new",
        queryResult: {
          plantId: "plant_1",
          plantName: "Monstera deliciosa",
          location: "Dining room shelf",
        },
      },
    );

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "custom" },
    });
    expect(screen.getByPlaceholderText("擦拭叶片")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^保存$/i }));
    expect(screen.getByText(/请输入这个提醒的自定义任务名称/i)).toBeInTheDocument();
    expect(mutationHandler).not.toHaveBeenCalled();

    fireEvent.change(screen.getByPlaceholderText("擦拭叶片"), {
      target: { value: "Leaf wipe" },
    });
    fireEvent.change(screen.getByRole("spinbutton"), {
      target: { value: "14" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^保存$/i }));

    await waitFor(() =>
      expect(mutationHandler).toHaveBeenCalledWith({
        plantId: "plant_1",
        taskType: "custom",
        customTaskName: "Leaf wipe",
        intervalDays: 14,
        baseCompletedAt: null,
      }),
    );
  });

  it("loads the task edit route with the current reminder settings", async () => {
    renderWithProviders(
      <AppShell
        pathname="/plants/tasks/edit"
        routeContext={{
          userId: "user_1",
          familyId: "family_1",
          displayName: "Wang",
        }}
        routeParams={{
          plantId: "plant_1",
          taskId: "task_1",
        }}
      />,
      {
        route: "/plants/plant_1/tasks/task_1/edit",
        queryResult: {
          plantId: "plant_1",
          plantName: "Monstera deliciosa",
          task: {
            taskId: "task_1",
            taskType: "custom",
            customTaskName: "Leaf wipe",
            intervalDays: 10,
            enabled: true,
            lastCompletedAt: Date.UTC(2026, 5, 10, 12, 0, 0),
          },
        },
      },
    );

    await waitFor(() => expect(window.location.pathname).toBe("/plants/plant_1/tasks/task_1/edit"));
    // ScreenNav title="编辑养护" 渲染为 span，非 heading。
    expect(screen.getByText(/编辑养护/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue("Leaf wipe")).toBeInTheDocument();
    expect(screen.getByRole("spinbutton")).toHaveValue(10);
    expect(screen.getByDisplayValue("2026-06-10")).toBeInTheDocument();
    // 提醒状态 toggle：aria-label="停用提醒"（当前已启用时显示此文案）。
    expect(screen.getByRole("button", { name: /停用提醒/i })).toBeInTheDocument();
  });

  it("updates an existing care task and supports disabling it", async () => {
    const mutationHandler = vi.fn().mockResolvedValue({
      ok: true,
    });
    setMockMutationHandler(mutationHandler);

    renderWithProviders(
      <AppShell
        pathname="/plants/tasks/edit"
        routeContext={{
          userId: "user_1",
          familyId: "family_1",
          displayName: "Wang",
        }}
        routeParams={{
          plantId: "plant_1",
          taskId: "task_1",
        }}
      />,
      {
        route: "/plants/plant_1/tasks/task_1/edit",
        queryResult: {
          plantId: "plant_1",
          plantName: "Monstera deliciosa",
          task: {
            taskId: "task_1",
            taskType: "watering",
            customTaskName: null,
            intervalDays: 7,
            enabled: true,
            lastCompletedAt: Date.UTC(2026, 5, 10, 12, 0, 0),
          },
        },
      },
    );

    fireEvent.click(screen.getByRole("button", { name: /停用提醒/i }));
    fireEvent.change(screen.getByRole("spinbutton"), {
      target: { value: "9" },
    });
    // ScreenNav rightAction 按钮文案为「保存」。
    fireEvent.click(screen.getByRole("button", { name: /^保存$/i }));

    await waitFor(() =>
      expect(mutationHandler).toHaveBeenCalledWith({
        taskId: "task_1",
        taskType: "watering",
        customTaskName: null,
        intervalDays: 9,
        enabled: false,
      }),
    );
    await waitFor(() => expect(window.location.pathname).toBe("/plants/plant_1"));
  });

  it("requires explicit confirmation before deleting a care task", async () => {
    const mutationHandler = vi.fn().mockResolvedValue({
      ok: true,
    });
    setMockMutationHandler(mutationHandler);

    renderWithProviders(
      <AppShell
        pathname="/plants/tasks/edit"
        routeContext={{
          userId: "user_1",
          familyId: "family_1",
          displayName: "Wang",
        }}
        routeParams={{
          plantId: "plant_1",
          taskId: "task_1",
        }}
      />,
      {
        route: "/plants/plant_1/tasks/task_1/edit",
        queryResult: {
          plantId: "plant_1",
          plantName: "Monstera deliciosa",
          task: {
            taskId: "task_1",
            taskType: "watering",
            customTaskName: null,
            intervalDays: 7,
            enabled: true,
            lastCompletedAt: null,
          },
        },
      },
    );

    fireEvent.click(screen.getByRole("button", { name: /删除任务/i }));
    expect(screen.getByText(/确认删除"浇水"/i)).toBeInTheDocument();
    expect(mutationHandler).not.toHaveBeenCalled();

    // ConfirmSheet confirmLabel 为「删除」而非「确认删除」。
    fireEvent.click(screen.getByRole("button", { name: /^删除$/i }));

    await waitFor(() =>
      expect(mutationHandler).toHaveBeenCalledWith({
        taskId: "task_1",
      }),
    );
    await waitFor(() => expect(window.location.pathname).toBe("/plants/plant_1"));
  });

  it("requires explicit confirmation before archiving a plant and updates the detail status", async () => {
    const mutationHandler = vi.fn().mockResolvedValue({
      ok: true,
    });
    setMockMutationHandler(mutationHandler);

    renderWithProviders(
      <AppShell
        pathname="/plants/detail"
        routeContext={{
          userId: "user_1",
          familyId: "family_1",
          displayName: "Wang",
        }}
        routeParams={{
          plantId: "plant_1",
        }}
      />,
      {
        route: "/plants/plant_1",
        queryResult: {
          plant: {
            id: "plant_1",
            familyId: "family_1",
            name: "Monstera deliciosa",
            description: "Bright indirect light and large split leaves.",
            note: "Rotate the pot every Sunday.",
            location: "Dining room shelf",
            imageStorageId: "storage_1",
            imageUrl: "https://cdn.test/monstera.jpg",
            createdAt: Date.UTC(2026, 0, 5),
            updatedAt: Date.UTC(2026, 5, 2),
            isArchived: false,
            archivedAt: null,
          },
          tasks: [],
        },
      },
    );

    // 归档入口为直接按钮（管理区），无溢出菜单。
    fireEvent.click(screen.getByRole("button", { name: /归档这株植物/i }));
    // 二次确认：ConfirmSheet 弹出，此时尚未调用 mutation。
    expect(mutationHandler).not.toHaveBeenCalled();
    expect(screen.getByText(/确认归档这盆植物吗？/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^确认归档$/i }));

    await waitFor(() =>
      expect(mutationHandler).toHaveBeenCalledWith({
        plantId: "plant_1",
        isArchived: true,
      }),
    );
    // 归档后 PlantManagementSection 按钮文案变为「恢复到看板」。
    await waitFor(() => expect(screen.getByRole("button", { name: /恢复到看板/i })).toBeInTheDocument());
  });

  it("restores an archived plant from the detail page with the same mutation", async () => {
    const mutationHandler = vi.fn().mockResolvedValue({
      ok: true,
    });
    setMockMutationHandler(mutationHandler);

    renderWithProviders(
      <AppShell
        pathname="/plants/detail"
        routeContext={{
          userId: "user_1",
          familyId: "family_1",
          displayName: "Wang",
        }}
        routeParams={{
          plantId: "plant_1",
        }}
      />,
      {
        route: "/plants/plant_1",
        queryResult: {
          plant: {
            id: "plant_1",
            familyId: "family_1",
            name: "Monstera deliciosa",
            description: "Bright indirect light and large split leaves.",
            note: "Rotate the pot every Sunday.",
            location: "Dining room shelf",
            imageStorageId: "storage_1",
            imageUrl: "https://cdn.test/monstera.jpg",
            createdAt: Date.UTC(2026, 0, 5),
            updatedAt: Date.UTC(2026, 5, 2),
            isArchived: true,
            archivedAt: Date.UTC(2026, 5, 7),
          },
          tasks: [],
        },
      },
    );

    // 归档态：管理区按钮显示「恢复到看板」。
    expect(screen.getByRole("button", { name: /恢复到看板/i })).toBeInTheDocument();
    // 恢复入口为直接按钮（管理区），无溢出菜单。
    fireEvent.click(screen.getByRole("button", { name: /恢复到看板/i }));
    expect(screen.getByText(/确认恢复这盆植物吗？/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^确认恢复$/i }));

    await waitFor(() =>
      expect(mutationHandler).toHaveBeenCalledWith({
        plantId: "plant_1",
        isArchived: false,
      }),
    );
    // 恢复后该植物无养护任务，养护计划区显示空态文案。
    await waitFor(() =>
      expect(screen.getByText(/暂无养护计划/i)).toBeInTheDocument(),
    );
  });

  it("submits the edit-plant flow and keeps the existing image when unchanged", async () => {
    const mutationHandler = vi.fn().mockResolvedValue({
      ok: true,
    });
    setMockMutationHandler(mutationHandler);

    renderWithProviders(
      <AppShell
        pathname="/plants/edit"
        routeContext={{
          userId: "user_1",
          familyId: "family_1",
          displayName: "Wang",
        }}
        routeParams={{
          plantId: "plant_1",
        }}
      />,
      {
        route: "/plants/plant_1/edit",
        queryResult: {
          plantId: "plant_1",
          name: "Bird of Paradise",
          description: "Tall leaves by the balcony.",
          note: "Water every Saturday.",
          location: "Sunroom corner",
          imageStorageId: "storage_1",
          imagePreviewUrl: "https://cdn.test/bird-of-paradise.jpg",
        },
      },
    );

    fireEvent.change(screen.getByLabelText(/摆放位置/i), {
      target: { value: "South window ledge" },
    });
    fireEvent.click(screen.getByRole("button", { name: /更新植物/i }));

    await waitFor(() =>
      expect(mutationHandler).toHaveBeenCalledWith({
        plantId: "plant_1",
        name: "Bird of Paradise",
        description: "Tall leaves by the balcony.",
        note: "Water every Saturday.",
        location: "South window ledge",
        imageStorageId: "storage_1",
      }),
    );
    await waitFor(() => expect(window.location.pathname).toBe("/plants"));
  });
});

describe("Invite link landing (/join/:code)", () => {
  it("normalizes /join/:code into the /join route with the decoded invite code", () => {
    expect(normalizePath("/join/ABCD12")).toEqual({
      pathname: "/join",
      params: {
        inviteCode: "ABCD12",
      },
    });
    expect(normalizePath("/join/ab%20cd")).toEqual({
      pathname: "/join",
      params: {
        inviteCode: "ab cd",
      },
    });
  });

  it("renders the landing page for an anonymous visitor without redirecting away", async () => {
    renderWithProviders(
      <AppShell
        pathname="/join"
        routeContext={{
          userId: null,
          familyId: null,
          displayName: null,
        }}
        routeParams={{
          inviteCode: "ABCD12",
        }}
      />,
      {
        route: "/join/ABCD12",
      },
    );

    expect(window.location.pathname).toBe("/join/ABCD12");
    expect(
      screen.getByRole("heading", { name: /登录后加入家庭/i }),
    ).toBeInTheDocument();
    // 用户经链接而来，页面不再暴露原始邀请码；但邀请码仍被暂存以供登录后自动加入。
    expect(screen.queryByText(/邀请码：ABCD12/)).not.toBeInTheDocument();
    expect(window.sessionStorage.getItem("pendingInviteCode")).toBe("ABCD12");

    fireEvent.click(screen.getByRole("button", { name: /登录 \/ 注册/i }));
    await waitFor(() => expect(window.location.pathname).toBe("/login"));
  });

  it("guides an authenticated visitor without a family into the onboarding auto-join", async () => {
    renderWithProviders(
      <AppShell
        pathname="/join"
        routeContext={{
          userId: "user_1",
          familyId: null,
          displayName: "Wang",
        }}
        routeParams={{
          inviteCode: "ABCD12",
        }}
      />,
      {
        route: "/join/ABCD12",
      },
    );

    expect(window.location.pathname).toBe("/join/ABCD12");
    expect(
      screen.getByRole("heading", { name: /加入家人的植物看板/i }),
    ).toBeInTheDocument();
    expect(window.sessionStorage.getItem("pendingInviteCode")).toBe("ABCD12");
    // 页面不再展示原始邀请码，文案聚焦"加入家庭"。
    expect(screen.queryByText(/邀请码：ABCD12/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /加入这个家庭/i }));
    await waitFor(() => expect(window.location.pathname).toBe("/onboarding"));
  });

  it("shows the D3 friendly notice for a visitor that already belongs to a family", () => {
    renderWithProviders(
      <AppShell
        pathname="/join"
        routeContext={{
          userId: "user_1",
          familyId: "family_1",
          displayName: "Wang",
        }}
        routeParams={{
          inviteCode: "ABCD12",
        }}
      />,
      {
        route: "/join/ABCD12",
        queryResult: {
          familyName: "向阳花房",
          inviteCode: "ZZZ999",
          memberCount: 2,
          members: [],
          createdBy: "user_1",
          currentUserId: "user_1",
          currentUserRole: "admin",
        },
      },
    );

    expect(window.location.pathname).toBe("/join/ABCD12");
    expect(
      screen.getByRole("heading", { name: /无需重复加入/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/你已经在「向阳花房」中啦/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/每位成员同一时间只能属于一个家庭/),
    ).toBeInTheDocument();
    // D3 场景不应暂存邀请码，避免离开后误触发加入。
    expect(window.sessionStorage.getItem("pendingInviteCode")).toBeNull();
  });

  it("falls back gracefully when the invite code is missing instead of going blank", async () => {
    renderWithProviders(
      <AppShell
        pathname="/join"
        routeContext={{
          userId: null,
          familyId: null,
          displayName: null,
        }}
        routeParams={{}}
      />,
      {
        route: "/join/",
      },
    );

    expect(
      screen.getByRole("heading", { name: /链接好像失效了/i }),
    ).toBeInTheDocument();
    expect(window.sessionStorage.getItem("pendingInviteCode")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /返回首页/i }));
    await waitFor(() => expect(window.location.pathname).toBe("/"));
  });
});
