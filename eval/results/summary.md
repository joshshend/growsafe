# Perception bake-off summary

Generated 2026-10-12. Dev and test are scored separately; never tune the prompt on test.

## dev

| provider | model | n | micro P | micro R | macro P | macro R | top-3 hit | false reassurance | parse fail | median latency (s) | cost (USD) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| anthropic (DRY RUN) | dry-run-anthropic | 20 | 79% | 79% | 78% | 75% | 87% (15) | 0% (12) | 5% | 2.05 | 0.1260 |
| google (DRY RUN) | dry-run-google | 20 | 46% | 61% | 59% | 62% | 67% (15) | 17% (12) | 5% | 1.17 | 0.0040 |
| openai (DRY RUN) | dry-run-openai | 20 | 61% | 68% | 62% | 66% | 80% (15) | 0% (12) | 5% | 3.32 | 0.0990 |

### Per-cue, anthropic (DRY RUN), dev

| cue | TP | FP | FN | precision | recall |
|---|---|---|---|---|---|
| unanchored_tv | 2 | 0 | 0 | 100% | 100% |
| unanchored_dresser | 4 | 0 | 1 | 100% | 80% |
| blind_cord | 2 | 0 | 0 | 100% | 100% |
| uncovered_outlet | 2 | 1 | 0 | 67% | 100% |
| open_water_container | 2 | 1 | 0 | 67% | 100% |
| cleaning_products_low | 1 | 2 | 1 | 33% | 50% |
| medicine_within_reach | 1 | 0 | 0 | 100% | 100% |
| small_objects_floor | 0 | 1 | 1 | 0% | 0% |
| crib_loose_items | 4 | 0 | 0 | 100% | 100% |
| stove_knobs_front | 2 | 1 | 1 | 67% | 67% |
| appliance_cord_hanging | 1 | 0 | 1 | 100% | 50% |
| window_low_no_guard | 1 | 0 | 1 | 100% | 50% |

### Per-cue, google (DRY RUN), dev

| cue | TP | FP | FN | precision | recall |
|---|---|---|---|---|---|
| unanchored_tv | 2 | 0 | 0 | 100% | 100% |
| unanchored_dresser | 3 | 0 | 2 | 100% | 60% |
| blind_cord | 2 | 1 | 0 | 67% | 100% |
| uncovered_outlet | 2 | 5 | 0 | 29% | 100% |
| stairs_no_gate | 0 | 1 | 0 | 0% | n/a |
| open_water_container | 1 | 5 | 1 | 17% | 50% |
| cleaning_products_low | 1 | 0 | 1 | 100% | 50% |
| medicine_within_reach | 0 | 0 | 1 | n/a | 0% |
| small_objects_floor | 1 | 1 | 0 | 50% | 100% |
| crib_loose_items | 2 | 6 | 2 | 25% | 50% |
| stove_knobs_front | 1 | 0 | 2 | 100% | 33% |
| appliance_cord_hanging | 2 | 1 | 0 | 67% | 100% |
| window_low_no_guard | 0 | 0 | 2 | n/a | 0% |

### Per-cue, openai (DRY RUN), dev

| cue | TP | FP | FN | precision | recall |
|---|---|---|---|---|---|
| unanchored_tv | 2 | 0 | 0 | 100% | 100% |
| unanchored_dresser | 5 | 1 | 0 | 83% | 100% |
| blind_cord | 2 | 0 | 0 | 100% | 100% |
| uncovered_outlet | 1 | 1 | 1 | 50% | 50% |
| stairs_no_gate | 0 | 1 | 0 | 0% | n/a |
| open_water_container | 1 | 0 | 1 | 100% | 50% |
| cleaning_products_low | 1 | 1 | 1 | 50% | 50% |
| medicine_within_reach | 1 | 1 | 0 | 50% | 100% |
| small_objects_floor | 0 | 1 | 1 | 0% | 0% |
| crib_loose_items | 1 | 0 | 3 | 100% | 25% |
| stove_knobs_front | 2 | 5 | 1 | 29% | 67% |
| appliance_cord_hanging | 2 | 0 | 0 | 100% | 100% |
| window_low_no_guard | 1 | 1 | 1 | 50% | 50% |

## test

| provider | model | n | micro P | micro R | macro P | macro R | top-3 hit | false reassurance | parse fail | median latency (s) | cost (USD) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| anthropic (DRY RUN) | dry-run-anthropic | 10 | 81% | 100% | 74% | 100% | 89% (9) | 0% (9) | 0% | 1.93 | 0.0630 |
| google (DRY RUN) | dry-run-google | 10 | 65% | 52% | 55% | 45% | 44% (9) | 22% (9) | 0% | 1.10 | 0.0020 |
| openai (DRY RUN) | dry-run-openai | 10 | 72% | 86% | 64% | 83% | 67% (9) | 0% (9) | 0% | 3.12 | 0.0495 |

### Per-cue, anthropic (DRY RUN), test

| cue | TP | FP | FN | precision | recall |
|---|---|---|---|---|---|
| unanchored_tv | 3 | 0 | 0 | 100% | 100% |
| unanchored_dresser | 3 | 0 | 0 | 100% | 100% |
| blind_cord | 1 | 1 | 0 | 50% | 100% |
| uncovered_outlet | 2 | 1 | 0 | 67% | 100% |
| stairs_no_gate | 3 | 0 | 0 | 100% | 100% |
| cleaning_products_low | 1 | 1 | 0 | 50% | 100% |
| medicine_within_reach | 1 | 0 | 0 | 100% | 100% |
| small_objects_floor | 1 | 0 | 0 | 100% | 100% |
| crib_loose_items | 2 | 0 | 0 | 100% | 100% |
| stove_knobs_front | 2 | 0 | 0 | 100% | 100% |
| appliance_cord_hanging | 0 | 1 | 0 | 0% | n/a |
| window_low_no_guard | 0 | 1 | 0 | 0% | n/a |
| heavy_items_high_shelf | 2 | 0 | 0 | 100% | 100% |

### Per-cue, google (DRY RUN), test

| cue | TP | FP | FN | precision | recall |
|---|---|---|---|---|---|
| unanchored_tv | 1 | 0 | 2 | 100% | 33% |
| unanchored_dresser | 3 | 0 | 0 | 100% | 100% |
| blind_cord | 0 | 0 | 1 | n/a | 0% |
| uncovered_outlet | 1 | 1 | 1 | 50% | 50% |
| stairs_no_gate | 2 | 0 | 1 | 100% | 67% |
| open_water_container | 0 | 1 | 0 | 0% | n/a |
| cleaning_products_low | 1 | 0 | 0 | 100% | 100% |
| medicine_within_reach | 0 | 0 | 1 | n/a | 0% |
| small_objects_floor | 0 | 0 | 1 | n/a | 0% |
| crib_loose_items | 1 | 1 | 1 | 50% | 50% |
| stove_knobs_front | 0 | 1 | 2 | 0% | 0% |
| appliance_cord_hanging | 0 | 1 | 0 | 0% | n/a |
| window_low_no_guard | 0 | 1 | 0 | 0% | n/a |
| heavy_items_high_shelf | 2 | 0 | 0 | 100% | 100% |

### Per-cue, openai (DRY RUN), test

| cue | TP | FP | FN | precision | recall |
|---|---|---|---|---|---|
| unanchored_tv | 2 | 0 | 1 | 100% | 67% |
| unanchored_dresser | 3 | 0 | 0 | 100% | 100% |
| blind_cord | 0 | 1 | 1 | 0% | 0% |
| uncovered_outlet | 2 | 0 | 0 | 100% | 100% |
| stairs_no_gate | 3 | 0 | 0 | 100% | 100% |
| cleaning_products_low | 1 | 0 | 0 | 100% | 100% |
| medicine_within_reach | 1 | 0 | 0 | 100% | 100% |
| small_objects_floor | 1 | 0 | 0 | 100% | 100% |
| crib_loose_items | 1 | 1 | 1 | 50% | 50% |
| stove_knobs_front | 2 | 2 | 0 | 50% | 100% |
| appliance_cord_hanging | 0 | 1 | 0 | 0% | n/a |
| window_low_no_guard | 0 | 1 | 0 | 0% | n/a |
| heavy_items_high_shelf | 2 | 0 | 0 | 100% | 100% |
| toxic_plant_low | 0 | 1 | 0 | 0% | n/a |

Notes: false reassurance = photos with at least one labeled severe cue where the model returned a valid empty list. Severe cues: blind_cord, cleaning_products_low, medicine_within_reach, open_water_container, stairs_no_gate, unanchored_dresser, unanchored_tv, window_low_no_guard. Cost is an estimate (verify prices).
