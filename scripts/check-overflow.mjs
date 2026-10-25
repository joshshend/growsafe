// Horizontal-overflow check for every screen, at phone widths.
//
//   npm run dev            (in one terminal)
//   node scripts/check-overflow.mjs [baseUrl] [--shots=dir]
//
// Loads the sample family, visits every route (plus the ones reached through links on Today,
// Rooms and People), opens the common forms and sheets, and fails if anything is wider than
// the screen: document scrollWidth > innerWidth, or any element's right edge past the viewport.
// It runs at 320 and 375 px, in light mode, and again in dark mode with easy reading on.
// Uses WebKit when it is installed (closest to iOS Safari), otherwise Chromium in mobile mode.
// No new dependencies: @playwright/test is already a dev dependency.
import { chromium, webkit } from "@playwright/test";
import { mkdirSync } from "node:fs";

const args = process.argv.slice(2);
const base =
  args.find((a) => /^https?:/.test(a)) ?? process.env.BASE_URL ?? "http://localhost:5173";
const shots = args.find((a) => a.startsWith("--shots="))?.slice(8);
if (shots) mkdirSync(shots, { recursive: true });

const WIDTHS = [320, 375];
const PASSES = [
  { name: "light", dark: false, easy: false },
  { name: "dark-easy", dark: true, easy: true },
];
const STATIC = [
  "/",
  "/rooms",
  "/scan",
  "/ahead",
  "/weekend",
  "/help",
  "/people",
  "/visit",
  "/merge",
  "/height",
  "/reminders",
  "/settings",
  "/settings/privacy",
  "/child/new",
  "/home/new",
  "/start",
];
// Buttons that open a form or sheet; each is clicked (if present) and the screen is measured again.
const OPENERS = /^(add|new|edit|remind|assign|set a|send|share|plan|change|save a)/i;
const NEVER = /to my list|start my own|clear|delete|reset|remove|erase/i; // do not wipe the sample family

async function launch() {
  for (const type of [webkit, chromium]) {
    try {
      return { browser: await type.launch(), engine: type.name() };
    } catch {
      /* try the next engine */
    }
  }
  throw new Error("No Playwright browser installed. Run: npx playwright install chromium");
}

// Runs in the page. Returns the offenders.
function measure() {
  const vw = window.innerWidth;
  const bad = [];
  const doc = document.documentElement;
  if (doc.scrollWidth > vw) bad.push(`document scrollWidth ${doc.scrollWidth} > ${vw}`);
  const clipped = (el) => {
    for (let p = el.parentElement; p; p = p.parentElement) {
      const o = getComputedStyle(p);
      if (/(auto|scroll|hidden|clip)/.test(o.overflowX) && p !== doc && p !== document.body)
        return true;
    }
    return false;
  };
  for (const el of document.body.querySelectorAll("*")) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (el.closest(".sr-only, .skip, svg *")) continue;
    if (r.right > vw + 0.5 || r.left < -0.5) {
      if (clipped(el)) continue;
      const cls =
        typeof el.className === "string" && el.className
          ? "." + el.className.trim().split(/\s+/).join(".")
          : "";
      bad.push(
        `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${cls} right=${Math.round(r.right)} left=${Math.round(r.left)}`,
      );
    }
  }
  return bad.slice(0, 12);
}

const { browser, engine } = await launch();
console.log(`engine: ${engine}   base: ${base}`);
let failures = 0;
let checks = 0;

for (const width of WIDTHS) {
  for (const pass of PASSES) {
    const ctx = await browser.newContext({
      viewport: { width, height: 812 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      colorScheme: pass.dark ? "dark" : "light",
    });
    const page = await ctx.newPage();
    await page.goto(base + "/");
    await page.getByRole("button", { name: "Explore a sample family" }).click();
    await page.getByRole("link", { name: "Emergency help" }).first().waitFor();
    if (pass.easy) await page.evaluate(() => (document.documentElement.dataset.easy = "on"));

    const go = async (route) => {
      await page.evaluate((r) => (location.hash = r), route);
      await page.waitForTimeout(250);
    };
    const check = async (label) => {
      checks++;
      const bad = await page.evaluate(measure);
      const tag = `${width}px ${pass.name} ${label}`;
      if (bad.length) {
        failures++;
        console.log(`FAIL ${tag}`);
        for (const b of bad) console.log(`     ${b}`);
      }
      if (shots) {
        const file = `${shots}/${width}-${pass.name}-${label.replace(/[^a-z0-9]+/gi, "_")}.png`;
        await page.screenshot({ path: file, fullPage: true });
      }
    };

    // Routes reached through links on the main screens
    const found = new Set(STATIC);
    for (const r of ["/", "/rooms", "/people"]) {
      await go(r);
      for (const h of await page.$$eval('a[href^="#/"]', (as) =>
        as.map((a) => a.getAttribute("href").slice(1)),
      ))
        if (!/^\/(help|settings)?$/.test(h) || STATIC.includes(h)) found.add(h);
    }
    const routes = [...found].filter(
      (r) =>
        !r.startsWith("/task/") || [...found].filter((x) => x.startsWith("/task/")).indexOf(r) < 3,
    );

    for (const route of routes) {
      await go(route);
      await check(route);
      // Open forms and sheets on this screen
      const names = await page.$$eval("main button, [role=dialog] button", (bs) =>
        bs.map((b) => (b.getAttribute("aria-label") || b.textContent || "").trim()).filter(Boolean),
      );
      for (const name of [...new Set(names)]
        .filter((n) => OPENERS.test(n) && !NEVER.test(n))
        .slice(0, 6)) {
        const btn = page.getByRole("button", { name, exact: true }).first();
        if (!(await btn.isVisible().catch(() => false))) continue;
        await btn.click({ timeout: 1500 }).catch(() => {});
        await page.waitForTimeout(200);
        await check(`${route} [${name}]`);
        await page.keyboard.press("Escape");
        await go(route);
      }
    }
    await ctx.close();
  }
}
await browser.close();
console.log(
  failures
    ? `\n${failures} of ${checks} checks overflowed`
    : `\nOK: ${checks} checks, no horizontal overflow`,
);
process.exit(failures ? 1 : 0);
