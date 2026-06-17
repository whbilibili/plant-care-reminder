import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

import { version as appVersion } from "./package.json";

export default defineConfig({
  plugins: [react()],
  define: {
    // 与 vite.config 保持一致，让「关于」卡在测试环境也能拿到版本号。
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
  },
});
