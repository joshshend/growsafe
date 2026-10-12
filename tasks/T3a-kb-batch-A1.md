# T3a KB research, hazards group A1 (parallel with T3b)
Write one JSON file per hazard in src/kb/data/, conforming to src/kb/schema.ts. Read schema.ts and tv-tip-over.json first. Replace tv-tip-over.json by deleting it and writing tv-furniture-tip-over.json.
Hazards (ids): tv-furniture-tip-over, drowning-bathtub-bucket, drowning-pool-hot-tub, safe-sleep-crib, button-battery-magnets, medicine-storage, cleaning-laundry-packs, window-cords-and-falls.
Method: use WebSearch/WebFetch on PRIMARY sources only (cpsc.gov, cdc.gov, healthychildren.org (AAP), poisonhelp.org, nhtsa.gov, safekids.org). Open each page; record exact URL, publisher, and today's date (2026-10-11) as accessed. Facts: only what the page states. Paraphrase; never copy long text. If you cannot open a source or a figure is unclear, set evidence_status "verify", leave the number out, and say why in a `note`. Never invent a statistic, URL or date.
Fix steps: free/cheap first, ordered, with realistic cost ranges in USD (state basis in a note if estimated), minutes, tools. No product brand names. No dosing. No firearms. Never say "safe"; say "reduces risk".
severity per stage: integer 1-5 with a one-line rationale grounded in the evidence (if evidence is thin, score conservatively and set verify).
detection_cues: pick ONLY from eval/cues.txt where they exist; otherwise propose new snake_case cues and append them to eval/cues.txt (one per line, keep existing order).
Spanish: leave `es` out (T11 does it).
Run `npm run kb:validate` until it passes; run tests. Append to AI_USE.md. Commit only src/kb/data, eval/cues.txt, AI_USE.md. Reply in <200 words: files written, any entry left "verify" and why, any source you could not open.
