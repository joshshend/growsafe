# eval

Perception bake-off harness (T8) and the locked eval set (T14).

Goal: decide by Oct 13 whether a hosted vision model finds hazards well enough to demo.
Pure Python, standard library only (Pillow optional). **Python 3.10+** is fine (the brief said 3.11; relaxed 2026-10-11, see DECISIONS.md).

## Files
- `cues.txt` allowed cues, one per line. Order = priority (used for top-3 hit rate).
- `prompt.txt` shared prompt. The model only reports allowed cues as a JSON array; no advice, never says anything is safe, `[]` if none.
- `labels.csv` columns `photo,cues,split`. `cues` = semicolon-separated cues from `cues.txt` (empty = none). `split` = `dev` or `test`.
- `photos/` your JPEGs (git-ignored; no children in frame).
- `run_bakeoff.py` runner and the three providers (Anthropic, OpenAI, Google).
- `score.py` metrics and `results/summary.md`.
- `results/<provider>-<date>.json` raw per-photo outputs (`dryrun-` prefix for dry runs).

## Run it
```
cd eval
python3 run_bakeoff.py --dry-run            # no keys/photos; writes results/dryrun-*.json + summary.md
export ANTHROPIC_API_KEY=...  OPENAI_API_KEY=...  GOOGLE_API_KEY=...   # any subset
python3 run_bakeoff.py --limit 3            # cheap smoke test on real photos
python3 run_bakeoff.py                      # all photos, all providers with keys
python3 run_bakeoff.py --providers anthropic --split dev
python3 score.py                            # rebuild summary.md from results/
```
Providers without a key are skipped. Override models with `ANTHROPIC_MODEL`, `OPENAI_MODEL`, `GOOGLE_MODEL`.
Optional: `pip install Pillow` so EXIF is stripped after applying rotation and images are downscaled to 1568 px; without it a stdlib fallback strips EXIF/APPn segments only (phone photos may then be sent sideways).

## Rules
- Label with a second person if you can. Fill `split` before running; keep about a third as `test`.
- Tune `prompt.txt` using **dev** results only. Never change it based on **test**.
- Costs are estimates from token usage times the prices in `run_bakeoff.py` (`PRICES`). Verify against current price pages. Default model names are guesses; set the env vars to current ones.
- False reassurance = photo with at least one severe labeled cue (`SEVERE_CUES` in `score.py`) where the model returned a valid empty list. Parse failures (including API errors) are counted separately.
- Never commit API keys or photos.

## Tests
```
pip install pytest && python3 -m pytest eval/tests
```
