import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { version as appVersion } from './package.json'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // 注入版本号供「关于」卡使用，避免在源码中硬编码版本。
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
  },
})
