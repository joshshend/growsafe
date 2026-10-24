# GrowSafe

GrowSafe is a free child-safety planner for parents, grandparents and sitters. You enter a child's age and describe each home. It returns a ranked to-do list of common household hazards to deal with, with the reason each one ranks where it does and the source behind it. It runs in the browser, installs to the home screen, and works offline.

Built for the Congressional App Challenge (TX-37) by Joshua Shen.

## The problem

Common childhood injuries (falls, drowning, poisoning, burns, choking, furniture tip-overs) are well documented by CPSC, CDC and pediatric groups. The advice exists, but it is spread across many pages, is not ordered by what matters for your child's age, and does not account for the other homes a child spends time in: grandparents, relatives, sitters. GrowSafe puts the sourced advice in one ranked list that changes as the child grows.

## What it does

- **Onboarding and plan.** Add children (birth month and year only) and homes with their rooms. The plan ranks hazards by the child's developmental stage and shows why each one ranks first.
- **Task sheet with sources.** Each task shows what to do, rough cost and time (estimates), how to check it is done, and the source link and access date for the facts behind it.
- **Rooms.** Per-room checklists across all homes.
- **Plan my weekend.** Picks the highest-ranked open tasks that fit the time and budget you give it, and exports a calendar (.ics) file.
- **Growth preview.** Shows what becomes a risk in the coming months, so you can act before the next stage, and lets you add those tasks early.
- **Visit pack and return link.** Send a short pack of tasks for another home (a grandparent's house, for example) as a link. The helper ticks off what they did and sends a reply link back; the replies merge into your plan after you confirm.
- **Room check, with an optional photo.** Tap what you see in a room and the knowledge base turns it into tasks. If the deployment has an AI key set, you can instead scan one photo: a hosted vision model only reports which listed cues it can see, you untick anything wrong, and the same knowledge base creates the tasks. If the photo path fails for any reason, the tap list is still there. A photo can miss things, and nothing flagged does not mean a room is safe.
- **Medicine check, emergency card, sitter briefing.** A guided check of medicine and chemical storage; an emergency card (allergies, contacts, etc.) that stays on the device; a printable briefing for a sitter. There is no dosing information.
- **Gear and recall check.** List the gear you own (crib, car seat, stroller and similar) with product checklists. The app looks up the CPSC recall database and shows possible matches. Brand matching happens on the device and the model number on the recall notice decides; a lack of match does not mean a product is fine.
- **Help and Support directory.** Curated, Texas-first resources, including help paying for safety gear, filterable and ordered by zip code.
- **Easy mode and read aloud.** Larger, simpler screens, and tasks read out loud with the browser's speech synthesis.
- **English and Spanish.** The Spanish text is an unreviewed machine translation (see Accuracy and limits).
- **Installable offline PWA.** Add to Home Screen on iPhone or Android. After the first load the plan, tasks and Help directory work without a connection. Light and dark themes, bundled font, keyboard reachable.

## How it is built

- **The knowledge base is the only source of advice.** Each hazard is one JSON file in `src/kb/data/`, validated by a Zod schema (`src/kb/schema.ts`) and by `npm run kb:validate`. An entry has a source URL and access date, severity by age stage with rationale, fix steps, a verification rule and its blind spots. The UI renders KB content; it does not generate advice.
- **Pure logic modules with tests.** `src/plan` (stage, ranking, plan building, unlocks, weekend planner, growth preview) and `src/share` (redaction, link codec, visit pack and reply merge) have no React imports and are unit tested with Vitest. `npm run plan:demo` prints a plan from the terminal.
- **No accounts and no backend.** Data is stored on the device (IndexedDB via idb-keyval). Shared links carry their data in the URL fragment (after `#`), which browsers do not send to servers. Plans are redacted to an allow-list before encoding and compressed with deflate.
- **Two small serverless functions.** `api/detect.ts` is the photo-scan proxy described under Privacy; it keeps its API key in an environment variable. `api/recalls.ts` is a stateless Vercel function that forwards the search text of a recall lookup to the CPSC API so a browser CORS rule cannot block it. It stores and logs nothing. The app tries the forwarder first and then CPSC directly.
- **Stack.** React 18, TypeScript, Vite, vite-plugin-pwa, React Router (HashRouter, so any static host works), Zustand, Zod, fflate, Vitest, Playwright with axe. Capacitor config for an optional iOS wrapper is in the repo (`docs/IOS.md`); the web app is the primary build.

## Privacy

- No accounts, no analytics, no third-party scripts, no ads. Fonts are bundled.
- Everything you enter stays on your device unless you choose to send a link or file.
- Links carry data in the URL fragment. Full names, exact birth dates, addresses and emergency card data are not included in links.
- The emergency card is stored on the device only and is never put in a link.
- Photo scan is off unless the server has a key, and asks for your agreement before the first photo. The photo is resized and re-drawn in your browser (which removes EXIF and location data), sent through `api/detect.ts` to Google's Gemini or Anthropic's Claude (whichever key the deployment uses), and is not saved or logged by GrowSafe. The provider receives the image under its own terms, which GrowSafe does not control; do not send photos with children or personal documents. The proxy limits each IP to 20 scans an hour and the deployment to a daily cap.
- The only other network calls are to the CPSC recall API (search text only, optionally through the forwarder above) and the page and assets themselves.

## Accuracy and limits

- GrowSafe does not make a home safe. It helps you find and fix common hazards and does not replace supervision, professional advice or emergency care. In an emergency or suspected poisoning, call 911 or Poison Help at 1-800-222-1222.
- It cannot see your home. It only knows what you tell it, so a hazard you did not think to list will not appear.
- Fix-step costs and minutes are estimates written during development, not sourced figures. Severity scores are judgments grounded in the cited statistics.
- Some KB entries are marked `evidence_status: "verify"` (7 of 17 at the time of writing): a figure or source page still needs checking by a human against its URL. Entries marked `sourced` had their figures read from the cited pages.
- Spanish is an unreviewed machine translation. Do not rely on it for anything where wording matters until a fluent reviewer has checked it.
- The recall check shows possible matches only. Always compare the model number on the product to the notice.
- Firearm storage is intentionally not covered.

## Run it

Requires Node 22 and npm 10.

```sh
npm install
npm run dev          # local dev server
npm test             # unit tests (Vitest)
npm run typecheck
npm run lint
npm run kb:validate  # check knowledge base and Help directory data
npm run build        # type-check and production build into dist/
npm run preview      # serve the production build (installable PWA)
npm run test:e2e     # Playwright smoke tests (needs browsers installed)
```

To make shared links from a native build point at the deployed site, copy `.env.example` to `.env` and set `VITE_PUBLIC_URL`. Deployment steps: `docs/DEPLOY.md`.

## How AI was used

AI wrote most of the code, tests, knowledge base drafts, translations and documentation, under Josh's direction. Josh set the product scope and made the decisions recorded in `DECISIONS.md`, and reviewed and ran every change before it was merged. Details, including a file-by-file log, are in `AI_USE.md`.

## Project structure

```
api/             Vercel function: stateless CPSC recall forwarder
docs/
  DEPLOY.md      publish to GitHub and Vercel
  IOS.md         optional Capacitor iOS build
  planning/      PLAN.md and task briefs (tasks/)
e2e/             Playwright specs
eval/            evaluation scripts from early development (not used by the app)
public/          icons
scripts/         KB and Help validators, plan:demo
src/
  kb/            schema, validator, stages, data/*.json (one hazard per file)
  plan/          ranking, plan builder, weekend planner, growth preview (pure)
  share/         redaction, link codec, file export, visit pack (pure)
  store/         Zustand store, IndexedDB persistence, selectors
  emergency/     emergency card, medicine check, sitter briefing logic
  recalls/       CPSC client, gear list, product checklists
  help/          Help & Support directory data and filters
  visit/         visit pack and reply state
  ics/           calendar file builder
  native/        Capacitor wrappers (no-ops on the web)
  i18n/          English and Spanish strings, per-feature files
  ui/            screens and components
ARCHITECTURE.md  module contracts
DECISIONS.md     dated product and engineering decisions
AI_USE.md        AI use disclosure
LICENSE          MIT
vercel.json      static hosting config
```

## License

MIT. See `LICENSE`.
