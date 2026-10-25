// Renders the GrowSafe app icons from the doorframe mark (docs/design/Main.dc.html, "Logo and app icon").
//   node scripts/make-icons.mjs
// Writes public/favicon.svg and public/{icon-192,icon-512,icon-maskable-512,apple-touch-icon}.png.
// Needs Playwright's Chromium (already a devDependency: `npx playwright install chromium` if it is missing).
// Colours are literals on purpose: this script draws image files, not the app UI.
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pub = join(root, "public");

const YELLOW = "#F2B705"; // --action
const GRAPHITE = "#24221E"; // --ink

// Mark geometry, identical to Logo.tsx. "flat" is the logo weight; "heavy" holds up at 58px and below.
const MARK = {
  flat: {
    w: 5.4,
    d: [
      "M21 7C20 24 22 40 21 57",
      "M21.5 47C27 46.6 33 47.4 38 46.8",
      "M21.5 34C29 33.5 36 34.4 44 33.7",
      "M21.5 21C31 20.4 40 21.3 50 20.5",
    ],
  },
  heavy: {
    w: 7.6,
    d: [
      "M20 7C19 24 21 40 20 57",
      "M21 47C27 46.6 33 47.4 38 46.8",
      "M21 34C29 33.5 36 34.4 44 33.7",
      "M21 21C31 20.4 40 21.3 50 20.5",
    ],
  },
};

function markGroup(kind, x, y, size) {
  const m = MARK[kind];
  const s = size / 64;
  const paths = m.d.map((d) => `<path d="${d}"/>`).join("");
  return `<g transform="translate(${x} ${y}) scale(${s})" fill="none" stroke="${GRAPHITE}" stroke-width="${m.w}" stroke-linecap="round">${paths}</g>`;
}

// rx 0 = full-bleed square (iOS and Android apply their own mask). rx > 0 = rounded tile with clear corners.
function iconSvg({ px, kind = "flat", rx = 0, x = 7, y = 9, size = 46 }) {
  const bg = `<rect width="64" height="64" rx="${rx}" fill="${YELLOW}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${px}" height="${px}">${bg}${markGroup(kind, x, y, size)}</svg>`;
}

const targets = [
  { file: "icon-192.png", px: 192, rx: 14.3 },
  { file: "icon-512.png", px: 512, rx: 14.3 },
  // Maskable: full-bleed, mark kept inside the central 80% safe circle.
  { file: "icon-maskable-512.png", px: 512, rx: 0, x: 11, y: 12.5, size: 42 },
  { file: "apple-touch-icon.png", px: 180, rx: 0 },
];

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  ({ chromium } = await import("@playwright/test"));
}

await mkdir(pub, { recursive: true });
await writeFile(
  join(pub, "favicon.svg"),
  iconSvg({ px: 64, kind: "heavy", rx: 14.3, x: 6, y: 8, size: 48 }) + "\n",
);

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for (const t of targets) {
    await page.setViewportSize({ width: t.px, height: t.px });
    await page.setContent(
      `<!doctype html><body style="margin:0;background:transparent">${iconSvg(t)}</body>`,
    );
    await page.screenshot({
      path: join(pub, t.file),
      omitBackground: true,
      clip: { x: 0, y: 0, width: t.px, height: t.px },
    });
    console.log("wrote public/" + t.file);
  }
} finally {
  await browser.close();
}
