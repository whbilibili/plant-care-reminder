import playwright from "/Users/wanghong/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.js";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { chromium } = playwright;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../../..");
const outDir = path.join(projectRoot, "app/public/backgrounds");
const previewDir = __dirname;

const W = 1170;
const H = 2532;

function leafPath(x, y, scale, rotate, opacity = 0.16) {
  return `
    <g transform="translate(${x} ${y}) rotate(${rotate}) scale(${scale})" opacity="${opacity}">
      <path d="M0 0 C38 -70 118 -98 180 -64 C116 -34 62 8 0 0Z" fill="#8fa67f"/>
      <path d="M0 0 C62 -16 118 -38 180 -64" fill="none" stroke="#6f8a70" stroke-width="5" stroke-linecap="round"/>
    </g>`;
}

function fiberPattern(seedOpacity = 0.22) {
  return `
    <filter id="paperNoise" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="4" seed="7"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer>
        <feFuncA type="table" tableValues="0 ${seedOpacity}"/>
      </feComponentTransfer>
    </filter>
    <pattern id="fiberLines" width="180" height="180" patternUnits="userSpaceOnUse" patternTransform="rotate(32)">
      <line x1="0" y1="18" x2="180" y2="18" stroke="#c8d8c3" stroke-width="2" opacity="0.18"/>
      <line x1="0" y1="96" x2="180" y2="96" stroke="#e1c979" stroke-width="1" opacity="0.1"/>
    </pattern>`;
}

function svgShell(name, body) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    ${fiberPattern()}
    <radialGradient id="${name}-top" cx="80%" cy="0%" r="70%">
      <stop offset="0%" stop-color="#dbe8d1" stop-opacity="0.88"/>
      <stop offset="52%" stop-color="#f4f8f0" stop-opacity="0.62"/>
      <stop offset="100%" stop-color="#fbfcf7" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="${name}-warm" cx="14%" cy="92%" r="58%">
      <stop offset="0%" stop-color="#eadb9a" stop-opacity="0.18"/>
      <stop offset="55%" stop-color="#f7f5ea" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#fbfcf7" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="${name}-paper" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fbfcf7"/>
      <stop offset="100%" stop-color="#f0f7ee"/>
    </linearGradient>
    <filter id="${name}-softBlur">
      <feGaussianBlur stdDeviation="9"/>
    </filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#${name}-paper)"/>
  <rect width="${W}" height="${H}" fill="url(#${name}-top)"/>
  <rect width="${W}" height="${H}" fill="url(#${name}-warm)"/>
  <rect width="${W}" height="${H}" fill="url(#fiberLines)" opacity="0.42"/>
  <rect width="${W}" height="${H}" filter="url(#paperNoise)" opacity="0.34"/>
  ${body}
</svg>`;
}

const assets = [
  {
    name: "bg-auth-botanical",
    body: `
      <circle cx="1020" cy="210" r="260" fill="#d8e5ce" opacity="0.28" filter="url(#bg-auth-botanical-softBlur)"/>
      ${leafPath(840, 92, 1.22, -10, 0.2)}
      ${leafPath(970, 186, 0.92, 28, 0.16)}
      ${leafPath(76, 2030, 1.3, 215, 0.13)}
      ${leafPath(190, 2170, 0.88, 244, 0.12)}
      <path d="M80 420 C260 330 430 342 560 448" fill="none" stroke="#aec2a7" stroke-width="4" opacity="0.12"/>
      <path d="M742 2250 C860 2118 1018 2090 1130 2170" fill="none" stroke="#d4be70" stroke-width="3" opacity="0.12"/>
    `
  },
  {
    name: "bg-app-paper",
    body: `
      <circle cx="1050" cy="120" r="220" fill="#cfdcc7" opacity="0.22" filter="url(#bg-app-paper-softBlur)"/>
      ${leafPath(830, 52, 1.05, -14, 0.14)}
      ${leafPath(1030, 198, 0.8, 36, 0.12)}
      <path d="M760 170 C898 96 1044 90 1140 132" fill="none" stroke="#a9b99e" stroke-width="5" opacity="0.1"/>
      <path d="M60 2370 C190 2288 330 2296 430 2380" fill="none" stroke="#c7d8be" stroke-width="4" opacity="0.12"/>
    `
  },
  {
    name: "bg-task-morning",
    body: `
      <radialGradient id="task-water" cx="78%" cy="18%" r="48%">
        <stop offset="0%" stop-color="#b9d8df" stop-opacity="0.34"/>
        <stop offset="100%" stop-color="#b9d8df" stop-opacity="0"/>
      </radialGradient>
      <rect width="${W}" height="${H}" fill="url(#task-water)"/>
      <circle cx="920" cy="330" r="92" fill="#9fc9d7" opacity="0.13" filter="url(#bg-task-morning-softBlur)"/>
      <circle cx="1030" cy="490" r="54" fill="#7fb1c8" opacity="0.1" filter="url(#bg-task-morning-softBlur)"/>
      ${leafPath(760, 120, 1.0, -18, 0.14)}
      ${leafPath(70, 2200, 1.15, 214, 0.11)}
      <path d="M210 300 C340 220 520 236 664 336" fill="none" stroke="#90b9c8" stroke-width="4" opacity="0.1"/>
    `
  },
  {
    name: "bg-form-quiet",
    body: `
      ${leafPath(900, 140, 0.92, 12, 0.13)}
      ${leafPath(1030, 370, 0.72, 42, 0.1)}
      ${leafPath(960, 2090, 0.82, 150, 0.1)}
      <path d="M900 70 L1130 460" stroke="#c8d8c3" stroke-width="3" opacity="0.11"/>
      <path d="M964 80 L1160 420" stroke="#c8d8c3" stroke-width="3" opacity="0.08"/>
      <path d="M850 2300 C980 2218 1080 2232 1160 2310" fill="none" stroke="#d4be70" stroke-width="3" opacity="0.1"/>
    `
  }
];

await mkdir(outDir, { recursive: true });

for (const asset of assets) {
  const svg = svgShell(asset.name, asset.body);
  await writeFile(path.join(outDir, `${asset.name}.svg`), svg);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.setDefaultTimeout(90000);

for (const asset of assets) {
  const svgPath = path.join(outDir, `${asset.name}.svg`);
  await page.goto(`file://${svgPath}`, { waitUntil: "load" });
  await page.screenshot({ path: path.join(outDir, `${asset.name}.png`), timeout: 90000 });
}

await browser.close();

const readme = `# Background Assets

Generated on 2026-06-17 for the system UI refresh.

These assets are subtle mobile page backgrounds intended to sit behind white/ivory cards and grouped surfaces. Each asset has an editable SVG source and a 1170x2532 PNG export suitable for high-density mobile screens.

## Assets

- \`/backgrounds/bg-auth-botanical.png\` — login/register page.
- \`/backgrounds/bg-app-paper.png\` — settings, plant board, and general authenticated pages.
- \`/backgrounds/bg-task-morning.png\` — today task and task-detail pages.
- \`/backgrounds/bg-form-quiet.png\` — create/edit plant and care-task forms.

## Usage

\`\`\`css
.page {
  background-color: var(--color-paper);
  background-image: url("/backgrounds/bg-app-paper.png");
  background-size: cover;
  background-position: top center;
  background-repeat: no-repeat;
}
\`\`\`

Use page-level overlays sparingly. These files are intentionally low contrast so content remains readable.
`;

await writeFile(path.join(previewDir, "README.md"), readme);

console.log(JSON.stringify({ outDir, assets: assets.map((asset) => asset.name) }, null, 2));
