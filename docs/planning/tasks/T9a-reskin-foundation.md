# T9a — Reskin foundation (brand tokens, base components, logo, illustrations, icons)

Owner: sub-agent. Reviewer: Claude. Deadline: ~60 min of work. Do NOT change app logic, the knowledge base, plan engine, perception, api/, or test behaviour.

## Why
Josh wants GrowSafe to look branded and unmistakable, not like a generic AI app. A designer pass (Claude Design) produced a full system, saved in this repo under `docs/design/`:
- `gs.css` — the source of truth for tokens + components (colors, type, buttons, chips, task check, progress mark, tab bar, sheet, toast, field, card, illustration classes, motion).
- `Main.dc.html`, `Components.dc.html`, `Illustration.dc.html` — design system boards (brand, components, the six room illustrations + empty/done/scan states + voice).
- `Today / Rooms / Room / Task / Scan / Help / Visit / Done / Welcome .dc.html` — screen designs (375x812). These are Design Component HTML files; read them as plain HTML + inline SVG. They can't be opened in a browser as-is (they need a support.js we don't have). Treat them as specs.

Brand idea: pencil marks on a doorframe where parents record a child's height. Paper background, graphite ink, one signature "pencil yellow", Young Serif display + Atkinson Hyperlegible Next body. Red is reserved for Poison Help / 911 ONLY.

## Scope (this task = foundation only; screens are T9b)
1. **Tokens.** Rewrite `src/ui/tokens.css` from `docs/design/gs.css`. Keep every existing token NAME that `src/index.css` and the other css files use (alias old names to new values, e.g. --control-line -> --line-strong, --action-bright -> --action, --done-text -> --done, --emergency-text -> --emergency) so nothing breaks, and add the new ones (--well, --fill, --edge, --action-ink, --on-inverse, --inverse, --line-strong, --font-display, --font-body, --s-1..7, --r-field, --r-sheet, motion vars). Light + dark: keep BOTH the `prefers-color-scheme` and the manual `data-theme` mechanism that exists today (read src/ui/theme.ts). Easy mode: keep the existing mechanism (read src/ui/easy.ts) and map it to the design's `[data-scale="easy"]` sizes (about +15% type, 56px targets).
2. **Fonts.** Add `@fontsource/young-serif` to package.json dependencies (do NOT run npm install; node_modules on Josh's Mac holds macOS binaries and installing from this Linux VM would break it. Josh will run `npm install`). Import the 400 weight where the other fontsource imports are. Keep Atkinson. No Google Fonts links, no network font loads.
3. **Base components in `src/index.css` (and small new css files if cleaner).** Restyle to match `gs.css`: buttons (primary = yellow fill, graphite text, 1.5px edge, 3px hard under-edge, pressed state; secondary; danger = red, only for Poison Help/911; quiet; tall), chips, the task check box with the drawn-tick animation (stroke-dashoffset; reduced-motion fallback), task rows and hairline rows (no card boxes), tab bar with the yellow tab indicator, bottom sheet + scrim, toast, form fields, the single `.card` (hard offset shadow), type classes (d5/d4/d3/t2/t2b/t1/lbl). Remove: left-border accent stripes, tinted icon squares, chevron-on-every-row patterns where the design uses plain rows. Keep class names that components already use unless renaming is trivial and done everywhere; prefer adding the new class names alongside.
4. **Logo.** New `src/ui/Logo.tsx` exporting `<Mark size />` and `<Wordmark />` using the exact doorframe mark path from `docs/design/Today.dc.html` (`#gs-mark` symbol). Use it in the app header on Today and in Welcome.
5. **Progress mark.** New `src/ui/ProgressMarks.tsx` implementing the `.pm` doorframe-tick indicator (props: done, total, accessible label). Tick count == tasks (cap sensibly, e.g. group if total > 12).
6. **Illustrations.** New `src/ui/illustrations/` with React SVG components for: living room, bedroom, nursery, kitchen, bathroom, stairs, empty doorframe (welcome), all-done doorframe, scan-trace. Copy the geometry EXACTLY from `docs/design/Illustration.dc.html` and the screen files (they define the `f-*` shape groups and line paths). Render the wobble filter once (a shared `<svg>` defs component mounted in the app shell, id `wob`). Each has an aria-label description. Use `.il .fl/.ln/.hl` classes from gs.css.
7. **App icons + PWA.** Generate from the mark: `public/icon-192.png`, `public/icon-512.png`, a maskable 512, `apple-touch-icon.png` (180), `favicon.svg`. Paper background, graphite doorframe, yellow top mark. Update `index.html` (<link rel=apple-touch-icon>, theme-color) and the vite-plugin-pwa manifest in `vite.config.ts` (name GrowSafe, theme_color/background_color = paper `#F5EFE2`). Chromium + Playwright exist in the cloud container; if you can't render PNGs in your environment, write the SVGs and a `scripts/make-icons.mjs` and say so in your report.
8. **Dark mode check.** Every new token has a dark value from gs.css; verify contrast of text pairs >= 4.5:1 (compute it, list the pairs and ratios in your report). Red only on emergency surfaces.

## Rules
- No hard-coded hex outside tokens.css (and the logo/illustration SVG paths, which use currentColor/CSS vars).
- Keep ARIA roles, labels, data-testid values, route paths, i18n keys unchanged. Don't rename components that tests import.
- No new network calls. No analytics. No emoji icons.
- Keep prefers-reduced-motion working.
- Run `npx tsc --noEmit` and `npx prettier --check` (fix with --write) and `npx eslint` if the repo has it. vitest may not run in this VM (native binary mismatch); say so, don't claim tests passed.
- Commit in small commits with clear messages. Append the AI-use entry to AI_USE.md and a decision line to DECISIONS.md ("Adopted Claude Design system 'pencil marks on a doorframe'").

## Report back (short)
What changed (files), what you could not verify, the contrast table, anything in the design that conflicts with how the app actually works (e.g. a screen assumes data we don't have), and screenshots only if you can take them.
