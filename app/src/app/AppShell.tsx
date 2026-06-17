import { AuthPage } from "../features/auth/AuthPage";
import { ProfileBootstrapForm } from "../features/auth/ProfileBootstrapForm";
import { CreateFamilyPage } from "../features/family/CreateFamilyPage";
import { FamilyOnboardingChoicePage } from "../features/family/FamilyOnboardingChoicePage";
import { FamilySettingsPage } from "../features/family/FamilySettingsPage";
import { MembersManagePage } from "../features/family/MembersManagePage";
import { ProfileEditPage } from "../features/family/ProfileEditPage";
import { JoinFamilyPage } from "../features/family/JoinFamilyPage";
import { JoinLandingPage } from "../features/family/JoinLandingPage";
import { CreatePlantPage } from "../features/plants/CreatePlantPage";
import { EditPlantPage } from "../features/plants/EditPlantPage";
import { PlantDetailPage } from "../features/plants/PlantDetailPage";
import { PlantListPage } from "../features/plants/PlantListPage";
import { CreateTaskPage } from "../features/tasks/CreateTaskPage";
import { EditTaskPage } from "../features/tasks/EditTaskPage";
import { TodoPage } from "../features/tasks/TodoPage";
import { BottomNav } from "../components/navigation/BottomNav";
import { RouteGate } from "./RouteGate";
import type { AppPath, AppRoute, RouteContext } from "./router";

interface AppShellProps {
  pathname: AppPath;
  routeContext: RouteContext | undefined;
  routeParams?: AppRoute["params"];
}

/** 子页面：不显示 BottomNav 的路径前缀/路径 */
const SUB_PAGE_PATHS: readonly AppPath[] = [
  "/plants/detail",
  "/plants/new",
  "/plants/edit",
  "/plants/tasks/new",
  "/plants/tasks/edit",
  "/settings/profile",
  "/settings/members",
];

function isSubPage(pathname: AppPath): boolean {
  return SUB_PAGE_PATHS.includes(pathname);
}

export function AppShell({ pathname, routeContext, routeParams }: AppShellProps) {
  const hasFamily = routeContext?.familyId !== null && routeContext !== undefined;
  const displayName = routeContext?.displayName?.trim() || "植物管家";
  const showBottomNav = hasFamily && !isSubPage(pathname);

  return (
    <RouteGate pathname={pathname} routeContext={routeContext}>
      <div style={frameStyle}>
        <main style={showBottomNav ? mainStyle : mainStyleNoNav}>
          {pathname === "/login" ? <AuthPage /> : null}
          {pathname === "/onboarding" ? (
            <FamilyOnboardingChoicePage displayName={displayName} />
          ) : null}
          {pathname === "/onboarding/profile" ? (
            <ProfileBootstrapForm suggestedName={routeContext?.displayName} />
          ) : null}
          {pathname === "/onboarding/create-family" ? (
            <CreateFamilyPage />
          ) : null}
          {pathname === "/onboarding/join-family" ? (
            <JoinFamilyPage />
          ) : null}
          {pathname === "/join" ? (
            <JoinLandingPage
              inviteCode={routeParams?.inviteCode ?? null}
              routeContext={routeContext}
            />
          ) : null}
          {pathname === "/plants" ? (
            <PlantListPage />
          ) : null}
          {pathname === "/plants/detail" ? (
            <PlantDetailPage plantId={routeParams?.plantId ?? null} />
          ) : null}
          {pathname === "/plants/tasks/new" ? (
            <CreateTaskPage plantId={routeParams?.plantId ?? null} />
          ) : null}
          {pathname === "/plants/tasks/edit" ? (
            <EditTaskPage
              plantId={routeParams?.plantId ?? null}
              taskId={routeParams?.taskId ?? null}
            />
          ) : null}
          {pathname === "/plants/new" ? (
            <CreatePlantPage />
          ) : null}
          {pathname === "/plants/edit" ? (
            <EditPlantPage plantId={routeParams?.plantId ?? null} />
          ) : null}
          {pathname === "/todo" ? <TodoPage /> : null}
          {pathname === "/settings" ? (
            <FamilySettingsPage />
          ) : null}
          {pathname === "/settings/profile" ? (
            <ProfileEditPage />
          ) : null}
          {pathname === "/settings/members" ? (
            <MembersManagePage />
          ) : null}
        </main>
        {showBottomNav ? <BottomNav pathname={pathname} /> : null}
      </div>
    </RouteGate>
  );
}

const frameStyle: React.CSSProperties = {
  minHeight: "100svh",
  display: "flex",
  flexDirection: "column",
  background: "var(--color-paper)",
  color: "var(--color-ink)",
  position: "relative",
  overflowX: "clip",
};

const mainStyle: React.CSSProperties = {
  flex: 1,
  width: "min(100%, 520px)",
  margin: "0 auto",
  padding:
    "var(--space-lg) var(--space-md) calc(96px + env(safe-area-inset-bottom, 0px))",
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  justifyContent: "flex-start",
};

/** 子页面不显示 BottomNav 时，底部不需要留出 96px 的导航空间，
 *  但保留与主页一致的水平 padding，避免内容贴边。 */
const mainStyleNoNav: React.CSSProperties = {
  ...mainStyle,
  padding:
    "0 var(--space-md) calc(env(safe-area-inset-bottom, 0px))",
};
