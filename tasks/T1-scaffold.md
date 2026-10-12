# T1 Scaffold (do first; T2 and T8 can run in parallel)
Project: Kid-Proof, a free child-safety planner (installable web app, later wrapped for iOS). Repo root = the folder containing PLAN.md and DECISIONS.md. Read both first.

Build:
1. `npm create vite` React + TypeScript in the repo root (not a subfolder). Add: vite-plugin-pwa, zod, vitest, @testing-library/react, @playwright/test, @axe-core/playwright, eslint, prettier.
2. Folders with a one-line README or index.ts each: src/kb (hazard data + loader), src/plan (ranking engine), src/ui, src/perception, src/share, src/i18n (en.json, es.json stubs), scripts/, eval/.
3. PWA: manifest (name "Kid-Proof", standalone, theme color, 192/512 placeholder icons), service worker via vite-plugin-pwa, mobile viewport meta, safe-area CSS.
4. Scripts in package.json: dev, build, test, lint, typecheck, `kb:validate` (stub that exits 0 for now).
5. Files: AI_USE.md (table: file | tool | what AI did), README.md with sections Overview, Run it, Architecture (perception and advice are separate layers; knowledge base drives the plan), Privacy, Not-a-guarantee notice. Add the existing DECISIONS.md/PLAN.md untouched. .gitignore, `git init`, first commit.
6. App shell: a single screen titled "Kid-Proof" with the text "Not a guarantee of safety. Poison Help 1-800-222-1222" and a tel: link. Large tap targets, no color-only meaning.

Rules: never write the word "safe" as a claim in UI copy. No analytics, no third-party scripts. Short comments only.
Done when: `npm run dev` shows the shell, `npm run build && npm run preview` installs as a PWA on a phone browser, `npm test`, `npm run lint`, `npm run typecheck` all pass. Report exactly what Josh should run and look at.
