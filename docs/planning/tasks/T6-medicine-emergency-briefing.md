# T6 Medicine safety, emergency card, sitter briefing (after T5)
- Medicine storage audit: a per-home guided checklist (from KB entry medicine-storage + cleaning-laundry-packs) incl. purses/bags/visitors; yes/no/not-applicable items create or complete tasks. One-tap Poison Help (tel:1-800-222-1222).
- Emergency card per child (/emergency/:childId): allergies (free text), conditions (free text), current medicines by name (free text, no doses required, no dose math), pediatrician name/phone, emergency contacts. Stored ONLY in IndexedDB on the device; never included by share codec or redact(); show that in the UI ("stays on this phone").
- /briefing/:homeId: one printable page (CSS @media print, A4/Letter) for a sitter/grandparent: child nickname + age band, home rooms, top 5 open tasks, "things to know" from KB, the emergency card if user toggles "include card" (print-only, never in link), Poison Help + 911 line.
Tests: card never appears in encodePlan output (unit); print stylesheet smoke; axe. Append to AI_USE.md. Reply <150 words.

Notes 2026-10-12: put new strings in src/i18n/features/people.en.json / people.es.json (not en.json). People tab owns: emergency cards, briefing links; leave a clearly marked slot for T22 Part B (visit packs) so it can be added after you finish. Add per-task and per-room reminders: a 'Remind me' control on the task sheet is NOT yours; skip it.
