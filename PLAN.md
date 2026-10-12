# GrowSafe: execution plan (Oct 11 to Oct 26; submit Sat Oct 24)

## Rules for every coding agent
- Read DECISIONS.md and the task brief first. Do only that task. Small commits, short comments.
- Never use the word "safe" in UI copy; use "no hazards detected in this photo". No dose calculators. No firearm content.
- No number or tip without a source URL + access date in the KB. Unsure => write "verify".
- Append every AI-assisted file to AI_USE.md (file, tool, what). Log choices in DECISIONS.md.
- Finish with something that runs: `npm run dev` works, `npm test` passes. Report what Josh must run/check.

## Gates
Oct 13 perception go/no-go | Oct 17 demoable on a real phone | Oct 22 feature freeze | Oct 24 submit

## Tasks (T = task brief; D = depends on)
T1 Scaffold (Oct 11-12). Vite+React+TS PWA, folders (src/kb, src/plan, src/ui, src/perception, src/share), Zod, Vitest, CI script, README arch section, DECISIONS.md, AI_USE.md. Done when: blank app installs as PWA, tests run.
T2 Schemas (Oct 12). Zod for KB entry (fields per brief), Finding, Plan, Task, Child, Home. Validator script `npm run kb:validate` fails on missing source/date. D: T1.
T3 KB research+write, batch A (Oct 12-14). 15 highest-severity entries as JSON: tip-overs, drowning (tubs/buckets/pools), safe sleep, button batteries/magnets, medicines/cleaners/laundry packs, window cords/falls, stairs/gates, hot liquids/bath temp. CPSC/AAP/CDC/Poison Help only. D: T2.
T4 Ranking engine (Oct 13-15). Pure functions: child birthdate -> stage; KB -> ranked tasks (severity by stage, unlock_age_months so tasks appear early); "why this ranks first" data. Unit tests. D: T2, T3 sample.
T5 Core UI (Oct 13-17). Child + homes + rooms setup, ranked plan, task detail (why/steps/cost/time/citation), owner + due date, per-room progress, mobile-first, large targets. D: T4.
T6 Medicine safety + emergency card + briefing page (Oct 15-17). Storage audit per home, Poison Help tap-to-call 1-800-222-1222, emergency card stored on-device only (never in share link), printable sitter/grandparent briefing. D: T5.
T7 Link sharing (Oct 15-17). Serialize plan (first names/nicknames, age band, tasks, owners; NO full name, exact birthdate, address, photo, emergency card) -> compress -> URL fragment; import view read-only; also export/import file. D: T5.
T8 Perception bake-off harness (Oct 12-13). Python script: runs ~30 photos through 2-3 vision models returning structured findings against KB detection_cues; records precision/recall/latency/cost. Josh supplies photos. Decision at gate Oct 13.
T9 Perception feature (Oct 14-17). PerceptionProvider interface; hosted serverless proxy (rate-limited, no image logging, key server-side), EXIF strip + face check on-device, retake on bad photo, findings -> tasks, re-scan verifies fix, blind-spot checklist beside results. Fallback: tap-the-objects guided mode. D: T4, T8.
T10 KB batch B (Oct 15-19). Remaining entries to 35+, stage "how kids explore" notes, car seat rule (verify Texas), free-help list (verify each). D: T3.
T11 Spanish (Oct 18-21). Translate KB + UI strings ahead of time; Josh finds a fluent reviewer; record reviewed_by/on. D: T10.
T12 Offline + reminders (Oct 18-21). Service worker, IndexedDB, .ics reminders. 
T13 Accessibility (Oct 19-23). axe in CI, keyboard pass, VoiceOver/TalkBack pass on phone (Josh), large-text mode, icons per hazard, read-aloud.
T14 Eval + accuracy page (Oct 17-22). Locked 40-photo test set, metrics table, miss gallery, in-app "How accurate is this?". D: T9.
T15 Competitor comparison (Oct 12-14, Josh + me). 10 identical photos through 3 competitors + a chatbot; walk Make Safe Happen; screenshots. Needed for originality claim and demo.
T16 Submission (Oct 20-24). Rules/forms checklist, AI-use disclosure from AI_USE.md, demo video script (in brief), record on real phone, submit Oct 24.

## Josh's own to-dos (cannot be delegated)
1. Oct 12: gather 30 room photos (no children in frame) and run T15.
2. Read and run each merged change; be able to explain each module.
3. Find: a Spanish reviewer, a nurse/parent to check top entries, 5-8 caregivers to test Oct 20-23.
4. Confirm test phone and daily hours.

## How we run it
I write each task brief in full (inputs, files, acceptance tests) when you are ready to hand it to an agent; start with T1, T2, T8 in parallel. I review each result against its brief before you merge.

## Update 2026-10-11 (iOS + Relink/CareLoop-style functionality)
T17 iOS wrap (Oct 17-19). Capacitor over the built web app; native camera, haptics, local notifications for reminders, share sheet for plan links, Poison Help call. Run on Josh's iPhone 17 Pro via Xcode (free Apple ID, re-sign every 7 days; do a fresh install the morning of the demo). Needs Xcode on Josh's Mac. D: T5-T7, T9.
T18 Help & Support tab (Oct 15-20). Curated, verified entries with link + "last verified" date, filterable by zip/county, Texas first: Poison Help, 211 Texas, free car-seat checks, free/low-cost cribs and smoke alarms, WIC/CHIP info links, caregiver-support lines (links only). Each entry verified by a human before it ships. D: T2. Replaces T10's free-help item.
T19 Caregiver hub (Oct 15-18). Multi-child, multi-home dashboard ("who's doing what across homes"), nudge list for overdue tasks, grandparent/sitter briefing. This is CareLoop's multi-patient idea applied to kids.
Dropped: vaccine keeper, last-dose log, well-child reminders.
Narrative work (Josh + me, Oct 12-20): state the personal why; interview 5-8 caregivers (what scared them, what they'd use); put quotes and numbers in the write-up and video. Both recent winners did this.

## Update 2026-10-12: novelty plan (see DECISIONS)
Honest read: ranked, age-staged hazard checklists with sharing already exist (Make Safe Happen, IKEA's old app), and recall checks plus checklists exist too (Baby Recall & Safety, 2026). Novelty has to come from behaviours, not topic. Headline features, each demoable in under 20 seconds:
T20 Plan my weekend (time + budget optimizer). T21 Growth preview slider ("move the child forward, the plan changes"). T22 Visit pack + return link (accounts-free two-way sync with grandparents/sitters; replaces T19). Plus the published accuracy page (T14) as the trust differentiator. T23 recall/hand-me-down check is a supporting feature only.
Cut to pay for it: T19 caregiver hub (folded into T22), all stretch items, on-device model, push notifications.
Unverified until searched: that no competitor has T20, T21 or T22. Day-one competitor test (T15) must check.

## Update 2026-10-12 (b): borrow list. Take good features from anyone, streamline them into one app
Josh's call: novelty is not required; convenience and combination are. Sources (all read this session):
- CareLoop (TX-37 2025 winner, roundrockisd.org + CAC site): many people in one place; schedules, info, alerts and resources consolidated; links to financial programs with the application forms; AI chatbot (REJECTED: chatbots answer this equally well, and liability).
- CareTask (NH-02 2025): shared dashboards, reminders, real-time updates, senior-friendly oversized controls and sparse text.
- CareCompanion (MA-05 2025): voice prompts, medication reminders, hands-free simple design.
- SafeZone (TX-23 2025, a PWA): alerts + "locate help near you".
- Baby Recall & Safety, Make Safe Happen, IKEA Safer Home, NestProof, BabyProof: recall feed + My Products + product checklists; calendar reminders; shopping list; age-based room lists; photo scan.
What GrowSafe takes: multi-child multi-home hub (done: switcher + People); shared plan + return link (T7, T22); help and financial-assistance directory with apply links (T18); gear + recalls + product checklists (T23); reminders (.ics now, iOS local notifications in T17); easy mode + read aloud (T24); photo scan with verify (T9); medicine safety, emergency card, sitter briefing (T6); weekend planner (T20) and growth preview (T21) as the glue that makes it feel like one product.
Rejected: AI chatbot, live sync, barcode scanning (CPSC cannot search by UPC), drills, vaccine and dose logs.
Dispatch order now: T18, T21, T23, T24, T6 in parallel; then T22 Part B; then T9 after the Oct 13 bake-off; then T17 (iOS wrap with local notifications).
