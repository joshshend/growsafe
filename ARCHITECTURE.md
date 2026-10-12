# GrowSafe architecture (contracts every task builds against)

## Principles
1. Knowledge base (KB) is the only source of advice. Vision/AI only reports cues; it never writes tips.
2. Everything runs on the device: no accounts, no backend except one stateless photo proxy (T9).
3. Pure logic (src/plan, src/share, src/kb) has no React imports and is unit-tested. UI only calls it.

## Stack decisions
React 18 + TS + Vite; react-router (HashRouter, so static hosting and Capacitor work); Zustand for state; idb-keyval for persistence (IndexedDB); fflate + base64url for share links; vitest; Playwright + axe. Static host: Vercel (also hosts the one serverless function). Wrap: Capacitor (T17).

## Folder map
src/kb/       schema.ts, validate.ts, data/*.json (one file per hazard), index.ts (loadKb(): HazardEntry[] via import.meta.glob, validated at build)
src/plan/     stage.ts, rank.ts, build.ts, unlock.ts  (pure)
src/store/    store.ts (Zustand), persist.ts (idb-keyval), selectors.ts
src/share/    codec.ts (encodePlan/decodePlan), redact.ts, file.ts
src/perception/ provider.ts (interface), hosted.ts, guided.ts, exif.ts, faces.ts, findingsToTasks.ts
src/ui/       routes + components (see T5)
src/i18n/     en.json, es.json, t.ts
src/help/     resources.json (Help & Support), schema.ts
src/ics/      ics.ts (reminder files)

## Core contracts (TypeScript; schemas already in src/kb/schema.ts)
```ts
type Stage = '0-3m'|'3-6m'|'6-12m'|'12-24m'|'24-36m'|'36-60m';
stageForAge(ageMonths:number): Stage                 // plan/stage.ts
ageMonths(child:Child, now:Date): number             // uses birth_month/year only
rankHazards(kb:HazardEntry[], child:Child, now:Date, opts?:{rooms?:Room[]}): RankedHazard[]
  // RankedHazard = { hazard:HazardEntry; stage:Stage; score:number; reasons:Reason[]; unlocksInMonths:number|null; status:'active'|'upcoming' }
buildPlan(kb, children:Child[], homes:Home[], now:Date): Task[]   // tasks per child x home x room, deduped
nextUnlocks(kb, child, now, horizonMonths:number): RankedHazard[]  // 'upcoming' only
interface PerceptionProvider { detect(img:Blob, cues:string[]): Promise<Finding[]> }
findingsToTasks(findings:Finding[], kb, home, room): Task[]
verifyFix(task:Task, findingsAfter:Finding[]): 'fixed'|'still_present'|'cannot_tell'
encodePlan(plan:SharedPlan): string   decodePlan(s:string): SharedPlan   // URL fragment, versioned {v:1}
redact(plan:Plan): SharedPlan  // strips full names, exact birthdate, address, emergency card, photos
```
Ranking score = severity(stage) * 10 + evidenceBoost (sourced=+3, verify=0) + unlockBoost (risk starts within LEAD_TIME_MONTHS: +5; already active: +0) ; ties break by lower cost_usd_min then alphabetical id. Always return `reasons` so the UI can show "why this ranks first".

## State shape (persisted)
{ children: Child[]; homes: Home[]; tasks: Task[]; owners: string[] (typed names); emergencyCards: Record<childId, Card> (device only, never serialized into links); settings:{lang:'en'|'es'; largeText:boolean; perceptionConsent:boolean}; schemaVersion }

## Routes
/ onboarding or plan home | /child/new | /home/new | /plan (ranked, filter by home/room) | /task/:id | /room/:homeId/:room (checklist + scan) | /scan | /briefing/:homeId (printable) | /emergency/:childId | /help | /import (reads #data) | /accuracy | /about (privacy, AI use, limits)

## Copy and safety rules (enforced by tests/validator)
No claim of safety; use "no hazards detected in this photo". Poison Help (1-800-222-1222, tel:) button always visible in the top bar; not-a-guarantee line in task detail, scan results, /briefing and Help (see DECISIONS 2026-10-11 redesign). No firearm content. No dosing. No analytics.

## Done-definition for every UI task
Works at 375px width, tap targets >=44px, keyboard reachable, axe clean, English+Spanish keys present (Spanish may be placeholder until T11), no hard-coded strings.
