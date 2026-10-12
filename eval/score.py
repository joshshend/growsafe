"""Scoring + summary for the perception bake-off (T8). Stdlib only."""
from __future__ import annotations

import argparse
import glob
import json
import os
import statistics
from collections import defaultdict
from datetime import date

HERE = os.path.dirname(os.path.abspath(__file__))
RESULTS_DIR = os.path.join(HERE, "results")

# Cues whose miss is most dangerous; used for the false-reassurance rate.
SEVERE_CUES = frozenset({
    "unanchored_tv", "unanchored_dresser", "blind_cord", "stairs_no_gate",
    "open_water_container", "cleaning_products_low", "medicine_within_reach",
    "window_low_no_guard",
})


def load_cues(path: str | None = None) -> list[str]:
    path = path or os.path.join(HERE, "cues.txt")
    with open(path, encoding="utf-8") as f:
        return [ln.strip() for ln in f if ln.strip() and not ln.startswith("#")]


def _div(a: float, b: float):
    return a / b if b else None


def _f1(p, r):
    if p is None or r is None or (p + r) == 0:
        return None
    return 2 * p * r / (p + r)


def _mean(vals):
    vals = [v for v in vals if v is not None]
    return sum(vals) / len(vals) if vals else None


def score_records(records: list[dict], cue_order: list[str], severe=SEVERE_CUES) -> dict:
    """records: dicts with truth (list[str]), pred (list[{cue,confidence}]),
    parse_failure (bool), latency_s, cost_usd. Returns metrics dict."""
    tp, fp, fn = defaultdict(int), defaultdict(int), defaultdict(int)
    top3_hits = top3_den = 0
    sev_den = sev_empty = 0
    failures = 0
    for r in records:
        truth = set(r.get("truth", []))
        failed = bool(r.get("parse_failure"))
        failures += failed
        preds = [] if failed else r.get("pred", [])
        pred_set = {p["cue"] for p in preds}
        for c in truth | pred_set:
            if c in truth and c in pred_set:
                tp[c] += 1
            elif c in pred_set:
                fp[c] += 1
            else:
                fn[c] += 1
        if truth:
            top = min(truth, key=lambda c: cue_order.index(c) if c in cue_order else 10**6)
            ranked = sorted(preds, key=lambda p: -float(p.get("confidence", 0)))[:3]
            top3_den += 1
            top3_hits += any(p["cue"] == top for p in ranked)
        if truth & set(severe):
            sev_den += 1
            # Valid empty answer only; a parse failure is reported separately.
            sev_empty += (not failed) and not preds
    cues = [c for c in cue_order if c in tp or c in fp or c in fn]
    cues += sorted(c for c in set(tp) | set(fp) | set(fn) if c not in cues)
    per_cue = {}
    for c in cues:
        p = _div(tp[c], tp[c] + fp[c])
        rc = _div(tp[c], tp[c] + fn[c])
        per_cue[c] = {"tp": tp[c], "fp": fp[c], "fn": fn[c],
                      "precision": p, "recall": rc, "f1": _f1(p, rc)}
    TP, FP, FN = sum(tp.values()), sum(fp.values()), sum(fn.values())
    micro_p, micro_r = _div(TP, TP + FP), _div(TP, TP + FN)
    lat = [r["latency_s"] for r in records if r.get("latency_s") is not None]
    n = len(records)
    return {
        "n_photos": n,
        "per_cue": per_cue,
        "micro": {"precision": micro_p, "recall": micro_r, "f1": _f1(micro_p, micro_r)},
        "macro": {"precision": _mean(v["precision"] for v in per_cue.values()),
                  "recall": _mean(v["recall"] for v in per_cue.values()),
                  "f1": _mean(v["f1"] for v in per_cue.values())},
        "top3_hit_rate": _div(top3_hits, top3_den),
        "top3_n": top3_den,
        "false_reassurance_rate": _div(sev_empty, sev_den),
        "false_reassurance_n": sev_den,
        "parse_failure_rate": _div(failures, n),
        "median_latency_s": statistics.median(lat) if lat else None,
        "total_cost_usd": sum(r.get("cost_usd") or 0 for r in records),
    }


def score_result(result: dict, cue_order: list[str] | None = None) -> dict:
    """Score a result file dict; returns {split_name: metrics}. Dev and test are separate."""
    cue_order = cue_order or load_cues()
    out = {}
    for split in ("dev", "test"):
        recs = [r for r in result["photos"] if r.get("split") == split]
        if recs:
            out[split] = score_records(recs, cue_order)
    other = [r for r in result["photos"] if r.get("split") not in ("dev", "test")]
    if other:
        out["unsplit"] = score_records(other, cue_order)
    return out


def _fmt(v, pct=True, nd=2):
    if v is None:
        return "n/a"
    return f"{v * 100:.0f}%" if pct else f"{v:.{nd}f}"


def render_summary(results: list[dict], cue_order: list[str] | None = None) -> str:
    cue_order = cue_order or load_cues()
    lines = ["# Perception bake-off summary", "",
             f"Generated {date.today().isoformat()}. Dev and test are scored separately; "
             "never tune the prompt on test.", ""]
    scored = [(r, score_result(r, cue_order)) for r in results]
    if not scored:
        return "\n".join(lines + ["No result files found."]) + "\n"
    for split in ("dev", "test", "unsplit"):
        rows = [(r, s[split]) for r, s in scored if split in s]
        if not rows:
            continue
        lines += [f"## {split}", "",
                  "| provider | model | n | micro P | micro R | macro P | macro R | top-3 hit | false reassurance | parse fail | median latency (s) | cost (USD) |",
                  "|---|---|---|---|---|---|---|---|---|---|---|---|"]
        for r, m in rows:
            label = r["provider"] + (" (DRY RUN)" if r.get("dry_run") else "")
            lines.append(
                f"| {label} | {r.get('model', '')} | {m['n_photos']} | "
                f"{_fmt(m['micro']['precision'])} | {_fmt(m['micro']['recall'])} | "
                f"{_fmt(m['macro']['precision'])} | {_fmt(m['macro']['recall'])} | "
                f"{_fmt(m['top3_hit_rate'])} ({m['top3_n']}) | "
                f"{_fmt(m['false_reassurance_rate'])} ({m['false_reassurance_n']}) | "
                f"{_fmt(m['parse_failure_rate'])} | {_fmt(m['median_latency_s'], False)} | "
                f"{m['total_cost_usd']:.4f} |")
        lines.append("")
        for r, m in rows:
            label = r["provider"] + (" (DRY RUN)" if r.get("dry_run") else "")
            lines += [f"### Per-cue, {label}, {split}", "",
                      "| cue | TP | FP | FN | precision | recall |", "|---|---|---|---|---|---|"]
            for c, v in m["per_cue"].items():
                lines.append(f"| {c} | {v['tp']} | {v['fp']} | {v['fn']} | "
                             f"{_fmt(v['precision'])} | {_fmt(v['recall'])} |")
            lines.append("")
    lines += ["Notes: false reassurance = photos with at least one labeled severe cue "
              "where the model returned a valid empty list. Severe cues: "
              + ", ".join(sorted(SEVERE_CUES)) + ". Cost is an estimate (verify prices).", ""]
    return "\n".join(lines)


def latest_results(results_dir: str = RESULTS_DIR) -> list[dict]:
    """Newest result file per (provider, dry_run)."""
    best = {}
    for path in sorted(glob.glob(os.path.join(results_dir, "*.json"))):
        with open(path, encoding="utf-8") as f:
            r = json.load(f)
        best[(r["provider"], bool(r.get("dry_run")))] = r  # sorted names => newest date last
    return list(best.values())


def write_summary(results_dir: str = RESULTS_DIR, results: list[dict] | None = None) -> str:
    results = results if results is not None else latest_results(results_dir)
    path = os.path.join(results_dir, "summary.md")
    with open(path, "w", encoding="utf-8") as f:
        f.write(render_summary(results))
    return path


def main():
    ap = argparse.ArgumentParser(description="Rebuild results/summary.md from results/*.json")
    ap.add_argument("--results-dir", default=RESULTS_DIR)
    args = ap.parse_args()
    print(write_summary(args.results_dir))


if __name__ == "__main__":
    main()
