/// <reference types="vite/client" />

/**
 * 构建时由 Vite/Vitest 的 define 注入的应用版本号（来源 package.json version）。
 * 供「关于」卡展示，避免在源码中硬编码版本。
 */
declare const __APP_VERSION__: string;
