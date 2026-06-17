#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$ROOT_DIR/app"
SKIP_TEST="${1:-}"
APP_ENV_FILE="$APP_DIR/.env.local"

echo "[1/8] Checking runtime prerequisites"
command -v node >/dev/null
command -v npm >/dev/null
node --version
npm --version

echo "[2/8] Checking local env files"
if [ ! -f "$APP_ENV_FILE" ]; then
  cat > "$APP_ENV_FILE" <<'EOF'
VITE_CONVEX_URL=https://example.convex.cloud
VITE_CONVEX_SITE_URL=https://example.convex.site
CONVEX_DEPLOYMENT=anonymous-placeholder
EOF
  echo "Created mock app/.env.local"
fi

if [ ! -f "$APP_DIR/package.json" ]; then
  echo "[3/8] app/package.json not found, skipping dependency installation"
  echo "[4/8] Skipping TypeScript check because app scaffold is not initialized"
  echo "[5/8] Skipping Convex health check because app scaffold is not initialized"
  echo "[6/8] Skipping unit tests because app scaffold is not initialized"
  echo "[7/8] Skipping build verification because app scaffold is not initialized"
  echo "[8/8] Next steps: initialize app/ from docs/exec-plans/modules/infra.json"
  exit 0
fi

echo "[3/8] Installing dependencies if needed"
if [ ! -d "$APP_DIR/node_modules" ]; then
  (cd "$APP_DIR" && npm install)
else
  echo "Dependencies already installed"
fi

echo "[4/8] Running TypeScript check"
(cd "$APP_DIR" && npm run typecheck)

echo "[5/8] Running Convex typecheck"
(cd "$APP_DIR" && npx convex dev --once --typecheck enable)

if [ "$SKIP_TEST" != "--skip-test" ]; then
  if (cd "$APP_DIR" && npm run | grep -qE '^  test'); then
    echo "[6/8] Running unit tests"
    (cd "$APP_DIR" && npm run test)
  else
    echo "[6/8] No test script found, skipping unit tests"
  fi
else
  echo "[6/8] Skipping unit tests by flag"
fi

echo "[7/8] Running build verification"
(cd "$APP_DIR" && npm run build)

echo "[8/8] Next steps"
echo "- Start with the current in-progress task from docs/exec-plans/feature-list.json"
echo "- Use docs/exec-plans/progress.txt for session handoff context"
