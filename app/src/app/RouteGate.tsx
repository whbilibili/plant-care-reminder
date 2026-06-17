import { useEffect } from "react";

import { hasCreateFamilySuccessFlag } from "../features/family/createFamilySuccess";
import type { AppPath, RouteContext } from "./router";
import { navigate } from "./router";

interface RouteGateProps {
  pathname: AppPath;
  routeContext: RouteContext | undefined;
  children: React.ReactNode;
}

function getTargetPath(
  pathname: AppPath,
  routeContext: RouteContext | undefined,
): AppPath | null {
  if (routeContext === undefined) {
    return null;
  }

  const isAuthenticated = routeContext.userId !== null;
  const hasFamily = routeContext.familyId !== null;
  const hasDisplayName = (routeContext.displayName?.trim().length ?? 0) > 0;
  const isProfilePath = pathname === "/onboarding/profile";
  const isCreateFamilyPath = pathname === "/onboarding/create-family";
  const isOnboardingPath = pathname === "/onboarding" || pathname.startsWith("/onboarding/");
  const isProtectedPath =
    pathname.startsWith("/plants") || pathname === "/todo" || pathname.startsWith("/settings");

  // 邀请落地页 /join/:code 公开可达：自身据登录态/家庭状态引导（SET3-013），
  // 未登录暂存邀请码后再去登录的编排由 SET3-012 在落地页内完成。这里直接放行。
  if (pathname === "/join") {
    return null;
  }

  if (!isAuthenticated) {
    return pathname === "/login" ? null : "/login";
  }

  if (!hasDisplayName) {
    if (pathname === "/login") {
      return "/onboarding/profile";
    }

    return isProfilePath ? null : "/onboarding/profile";
  }

  if (!hasFamily) {
    // 允许已有 displayName 的用户返回 /onboarding/profile 编辑称呼（OBP-005）。
    if (pathname === "/login") {
      return "/onboarding";
    }
    if (isProfilePath) {
      // hasDisplayName 时放行 profile 页以支持「编辑」返回；
      // 尚无 displayName 时也放行以完成首次设置。
      return null;
    }

    return isOnboardingPath ? null : "/onboarding";
  }

  if (isCreateFamilyPath && hasCreateFamilySuccessFlag()) {
    return null;
  }

  if (isProtectedPath) {
    return null;
  }

  return "/todo";
}

export function RouteGate({ pathname, routeContext, children }: RouteGateProps) {
  const targetPath = getTargetPath(pathname, routeContext);

  useEffect(() => {
    if (targetPath && targetPath !== pathname) {
      navigate(targetPath, true);
    }
  }, [pathname, targetPath]);

  if (routeContext === undefined || (targetPath !== null && targetPath !== pathname)) {
    return (
      <div style={loadingWrapStyle}>
        <div style={loadingCardStyle}>
          <p style={eyebrowStyle}>正在同步家庭</p>
          <h1 style={titleStyle}>正在准备你的植物看板</h1>
          <p style={copyStyle}>正在确认你的登录状态和家庭信息。</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

const loadingWrapStyle: React.CSSProperties = {
  minHeight: "100svh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px",
  background:
    "radial-gradient(circle at top, rgba(36,73,63,0.12), transparent 36%), var(--color-paper)",
};

const loadingCardStyle: React.CSSProperties = {
  width: "min(100%, 420px)",
  borderRadius: "24px",
  padding: "32px 24px",
  background: "var(--color-surface)",
  border: "1px solid var(--color-line)",
  boxShadow: "var(--shadow-card)",
  textAlign: "left",
};

const eyebrowStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "0.75rem",
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "var(--color-leaf)",
};

const titleStyle: React.CSSProperties = {
  margin: "12px 0 10px",
  fontSize: "1.9rem",
  lineHeight: 1.1,
  color: "var(--color-ink)",
};

const copyStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--color-muted)",
  fontSize: "0.98rem",
  lineHeight: 1.6,
};
