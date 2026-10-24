# T4 Ranking and plan engine (pure TypeScript, src/plan/*)
Read ARCHITECTURE.md (contracts + scoring formula) and src/kb/schema.ts. No React. Josh must be able to explain each file: top-of-file comment (3 lines) + one-line comments on non-obvious lines.
Files and behavior:
- stage.ts: ageMonths(child, now) from birth_month/year (use the 15th as the day); stageForAge; stage labels in en.json key form.
- rank.ts: rankHazards per ARCHITECTURE.md. 'active' = risk already started (unlock_age_months <= age) and the stage has a severity entry; 'upcoming' = unlock_age_months within LEAD_TIME_MONTHS (import from schema.ts) ahead. Excluded otherwise. `reasons` = list of {kind:'severity'|'evidence'|'unlock'|'cost', text key, params}.
- build.ts: buildPlan creates Task objects (stable id = hash of childId+homeId+room+hazardId; preserve status/owner/due of existing tasks when re-built via buildPlan(kb, children, homes, now, existingTasks)); a hazard becomes one task per home x relevant room (hazard.rooms intersect home.rooms); dedupe across multiple children (one task per hazard per room, with `childIds[]`; use max score).
- unlock.ts: nextUnlocks(kb, child, now, horizonMonths) for the "coming up" list.
- index.ts exports all. Add `childIds` to Task in schema.ts if missing (update tests).
Tests (vitest, src/plan/*.test.ts) using small fixture KB built in the test: ranking order by severity; evidence tiebreak; tie-break cost then id; upcoming vs active at boundary months; child ageing across a month boundary changes stage and order; multi-child dedupe; rebuild keeps statuses; room intersection; empty KB; birth in the future throws a clear error.
Also add scripts/print-plan.ts (`npm run plan:demo`) that loads the real KB, makes a sample 9-month-old and 20-month-old with one home, and prints the top 10 with reasons, so Josh can see it run.
Done when typecheck, lint, tests pass and plan:demo prints. Append to AI_USE.md. Commit only your paths. Reply <150 words.
