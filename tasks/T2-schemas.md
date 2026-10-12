# T2 Schemas (depends on T1; run after scaffold exists)
Write Zod schemas + types in src/kb/schema.ts and a validator, with tests. Josh must be able to explain this file: comment each field in one line.

KB entry (HazardEntry):
id (kebab string), name, rooms[] (enum: living_room, bedroom, nursery, kitchen, bathroom, stairs, outdoors, car, garage), stages[] (enum: 0-3m, 3-6m, 6-12m, 12-24m, 24-36m, 36-60m),
severity: record stage -> {score 1-5, rationale string},
injury_evidence: {cause_category, age_band, source ("CDC"|"CPSC"|"AAP"|"PoisonHelp"|"other"), year, url, note}[] (may be empty only if evidence_status = "verify"),
evidence_status: "sourced" | "verify",
unlock_age_months: number (risk starts; task appears this many months early via a global lead_time_months constant),
detection_cues[] (labels perception must output),
why_it_matters (plain language, <=2 sentences; statistics only inside injury_evidence),
fix_steps[]: {order, text, cost_usd_min, cost_usd_max, minutes, tools[]}; at least one step with cost 0-20 when possible,
reminder?: {every_days, text},
verify_rule (what a check-off/re-scan confirms),
blind_spots[] (strings),
citations[]: {title, publisher, url, accessed (ISO date)} (min 1),
icon (string key), es?: {name, why_it_matters, fix_steps_text[], reviewed_by, reviewed_on}.
Other schemas: Finding {cue, confidence 0-1, note?}, Child {id, nickname, birth_month, birth_year}  (no full name, no exact birthdate), Home {id, name, rooms[]}, Task {id, hazard_id, home_id, room, status (todo|doing|done), owner?, due?}, Plan {children, homes, tasks}.

Validator `scripts/validate-kb.ts` (wire to `npm run kb:validate`): loads src/kb/data/*.json, parses each with Zod, then fails on: duplicate id; citation URL not https; missing accessed date; `evidence_status:"sourced"` with no injury_evidence; any string matching /\bsafe\b/i in why_it_matters or fix text (allow "safety"); any text containing "firearm" or "gun" (omitted by design); dosing words ("mg", "ml", "dose of") in fix steps. Print a readable error list with file + id.
Tests (vitest): one valid sample entry passes; each failure rule above has a failing fixture.
Add one sample entry src/kb/data/tv-tip-over.json using only facts already cited in the project brief (CPSC ~17,800 ER-treated tip-over injuries/yr 2020-2022); mark evidence_status "verify" because the URL must be re-checked.
Done when: typecheck, tests, and `npm run kb:validate` pass. Log what AI wrote in AI_USE.md.
