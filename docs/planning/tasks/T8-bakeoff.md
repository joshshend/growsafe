# T8 Perception bake-off harness (independent; can start now in eval/)
Goal: decide by Oct 13 whether a hosted vision model finds hazards well enough to demo. Python 3.11, no web app dependency.

Inputs: eval/photos/*.jpg (Josh adds ~30 room photos, no children), eval/labels.csv (columns: photo, cues; cues = semicolon-separated labels from eval/cues.txt; Josh/second labeler fill it), eval/cues.txt (one cue per line; start with: unanchored_tv, unanchored_dresser, blind_cord, uncovered_outlet, stairs_no_gate, open_water_container, cleaning_products_low, medicine_within_reach, small_objects_floor, crib_loose_items, stove_knobs_front, appliance_cord_hanging, window_low_no_guard, heavy_items_high_shelf, toxic_plant_low).
Build eval/run_bakeoff.py:
- Providers as small classes with one method `detect(image_bytes, cues) -> list[{cue, confidence, note}]`. Implement stubs for 3 providers (Anthropic, OpenAI, Google) reading API keys from env vars; skip a provider if its key is missing.
- Prompt (shared, in eval/prompt.txt): the model only REPORTS what it sees from the allowed cue list as JSON; it must not give advice, must not say anything is safe, and must return [] if it sees none. Validate output with a JSON schema; count parse failures.
- Strip EXIF before sending. Record latency and estimated cost per photo.
- Metrics script eval/score.py: per-cue precision/recall, micro/macro averages, top-3 hit rate (does a truly present highest-priority cue appear in model's top 3 by confidence; priority order = order in cues.txt), false-reassurance rate (photos with >=1 labeled severe cue where model returned nothing), parse-failure rate, median latency, cost.
- Output eval/results/<provider>-<date>.json and a Markdown table eval/results/summary.md.
- Split: dev/test via a `split` column in labels.csv; scoring reports dev and test separately; test is never used to change the prompt.
- A `--dry-run` mode with canned fake outputs so the pipeline can be tested without keys. Unit-test score.py on tiny fixtures.
Done when: dry-run produces summary.md and tests pass. Document in eval/README.md how Josh runs it with real keys. Log AI use in AI_USE.md. Do not commit API keys or photos (add to .gitignore).
