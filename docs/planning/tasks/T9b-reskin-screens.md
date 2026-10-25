# T9b — Reskin screens + copy (runs AFTER T9a is merged)

Owner: sub-agent. Reviewer: Claude. Do NOT change app logic, KB data, plan engine, api/, or what tests assert about behaviour. Presentation, layout, microcopy and illustrations only.

Inputs: `docs/design/*.dc.html` (screen specs), `docs/design/gs.css`, and what T9a added (tokens, `Logo`, `ProgressMarks`, `src/ui/illustrations/`, restyled base components). Read T9a's report/commits first.

## Screens (match the design at 375px; must still work at 320px and on desktop widths)
1. **Welcome / Onboarding** (`Welcome.tsx`, `Onboarding.tsx`) per Welcome.dc.html: empty-doorframe illustration, headline, name + age fields, "Show me the first fix", "Free. No account, no email."
2. **Today** (`Today.tsx`) per Today.dc.html: wordmark header + child chip (keep the child switcher + Poison Help access), "Right now" label, ONE task as plain type (no card, no stripe), "See the steps", quiet "Show me a different one", then big count + progress marks, then "After that" task rows with the drawn-tick check. Poison Help must stay reachable (red, only here and on Help).
3. **Rooms** (`Rooms.tsx`) per Rooms.dc.html: plain rows (serif room name, "2 of 5 done · next: ..."), doorframe progress marks at the end of each row, "Photograph a room" card at the bottom. Keep gear + recall section but restyled (hairline rows, no boxes). If the design omits something the app has (gear, medicine), keep it below, restyled.
4. **Room detail** (`Room`-level view inside Rooms.tsx / TaskSheet) per Room.dc.html: back link, serif title, counts, room illustration at right, "To do" / "Done" sections, toast with Undo on tick.
5. **Task sheet** (`TaskSheet.tsx`, `Sheet.tsx`) per Task.dc.html: why it matters, what you need, numbered steps, "Mark as done", quiet "Not tonight". Keep ALL existing content fields (sources, "verify" badges, cost/time, unlock info); restyle them as quiet labelled sections, don't delete them.
6. **Photo scan** (`PhotoScan.tsx`, `Scan.tsx`) per Scan.dc.html: "What we spotted", traced-in-pencil figure area (for a real photo keep the real thumbnail, bordered like the design; use the pencil-trace illustration for the sample/demo and empty states), checkable finding rows, "Add N to my list", "Retake photo".
7. **Help** (`Help.tsx`) per Help.dc.html: Poison Help tall red button, 911 outline, hairline resource rows, pediatrician number field. Keep every existing Help entry.
8. **Visit pack guest view** (`Visit.tsx`) per Visit.dc.html: easy-scale by default, four numbered priorities, Poison Help button, "Sent by ...'s parents with GrowSafe. No app, no account."
9. **All-done moment** (new small view/modal triggered when a room reaches 100%) per Done.dc.html: filled doorframe animation (anim-fill), reduced-motion fallback. Wire to existing completion state only; no new data.
10. **Everything else** (Settings, People, Weekend, Ahead, Medicine, Emergency card, Briefing, Merge, VisitPacks): token-level pass so nothing looks off-brand: no leftover boxes-with-icons, no old orange, consistent type scale, forms use the new field style. Don't redesign their structure.

## Copy
Rewrite visible microcopy to the design's voice: specific, calm, no exclamation marks, no "Oops". e.g. task buttons say what happens ("See the steps", "Mark as done", "Not tonight"), not "Keep going". Update `src/i18n/*` EN strings; mirror to ES with careful, plain Spanish and mark nothing as reviewed (ES stays "machine-translated, unreviewed" in AI_USE.md). Don't change i18n keys; change values. Keep tests that assert strings passing by updating the assertion to the new string where the change is intentional.

## Constraints
- Reuse T9a components; no new hex values; no new dependencies without telling Claude.
- Keep accessibility: real buttons/links, labels, focus ring (3px ink outline), 44px targets (56px easy), reduced-motion.
- Easy mode, dark mode and ES must render without overflow.
- Run `npx tsc --noEmit`, prettier, eslint. vitest may not run in the VM; say so. Update tests' string expectations by reading them and editing carefully.
- Commit per screen group. Report: what changed, what couldn't be verified, any place the design didn't fit real data (long names, 0 tasks, 20+ tasks, ES text length).
