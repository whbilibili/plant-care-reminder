import { render } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";

import type { AppPath, RouteContext } from "../app/router";
import { setMockCurrentUserContext, setMockQueryResult } from "./setup";

interface RenderWithProvidersOptions {
  route?: AppPath | "/" | string;
  queryResult?: unknown;
  routeContext?: RouteContext | undefined;
}

function MockConvexProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

function MemoryRouter({
  children,
  initialPath,
}: {
  children: ReactNode;
  initialPath: RenderWithProvidersOptions["route"];
}) {
  window.history.replaceState(null, "", initialPath ?? "/");
  return <>{children}</>;
}

export function renderWithProviders(
  ui: ReactElement,
  { route = "/", routeContext = undefined, queryResult }: RenderWithProvidersOptions = {},
) {
  if (queryResult !== undefined) {
    setMockQueryResult(queryResult);
  } else {
    setMockCurrentUserContext(routeContext);
  }

  return render(
    <MockConvexProvider>
      <MemoryRouter initialPath={route}>{ui}</MemoryRouter>
    </MockConvexProvider>,
  );
}
