import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest

import run_bakeoff as rb
import score

ORDER = ["unanchored_tv", "blind_cord", "uncovered_outlet", "toxic_plant_low"]
SEV = {"unanchored_tv", "blind_cord"}


def rec(truth, pred, fail=False, lat=1.0, cost=0.01):
    return {"truth": truth, "pred": [{"cue": c, "confidence": conf} for c, conf in pred],
            "parse_failure": fail, "latency_s": lat, "cost_usd": cost}


def test_precision_recall_micro_macro():
    recs = [
        rec(["unanchored_tv"], [("unanchored_tv", 0.9)]),               # TP tv
        rec(["blind_cord"], [("uncovered_outlet", 0.8)]),               # FN cord, FP outlet
        rec([], [("unanchored_tv", 0.5)]),                              # FP tv
    ]
    m = score.score_records(recs, ORDER, SEV)
    tv = m["per_cue"]["unanchored_tv"]
    assert (tv["tp"], tv["fp"], tv["fn"]) == (1, 1, 0)
    assert tv["precision"] == 0.5 and tv["recall"] == 1.0
    assert m["per_cue"]["blind_cord"]["recall"] == 0.0
    assert m["per_cue"]["uncovered_outlet"]["precision"] == 0.0
    assert m["micro"]["precision"] == pytest.approx(1 / 3)
    assert m["micro"]["recall"] == pytest.approx(1 / 2)
    assert m["macro"]["precision"] == pytest.approx((0.5 + 0.0) / 2)  # blind_cord precision undefined
    assert m["macro"]["recall"] == pytest.approx((1.0 + 0.0) / 2)     # outlet recall undefined


def test_top3_uses_highest_priority_truth_cue():
    truth = ["blind_cord", "toxic_plant_low"]  # blind_cord is higher priority
    hit = rec(truth, [("toxic_plant_low", 0.99), ("blind_cord", 0.2)])
    miss = rec(truth, [("toxic_plant_low", 0.9), ("uncovered_outlet", 0.8),
                       ("unanchored_tv", 0.7), ("blind_cord", 0.1)])  # 4th by confidence
    m = score.score_records([hit, miss], ORDER, SEV)
    assert m["top3_n"] == 2 and m["top3_hit_rate"] == 0.5


def test_false_reassurance_and_parse_failures():
    recs = [
        rec(["unanchored_tv"], []),                  # severe, valid empty: false reassurance
        rec(["blind_cord"], [("blind_cord", 0.9)]),  # severe, found
        rec(["blind_cord"], [], fail=True),          # severe, parse failure: not counted as empty
        rec(["toxic_plant_low"], []),                # not severe: ignored
    ]
    m = score.score_records(recs, ORDER, SEV)
    assert m["false_reassurance_n"] == 3
    assert m["false_reassurance_rate"] == pytest.approx(1 / 3)
    assert m["parse_failure_rate"] == 0.25


def test_latency_cost_and_empty():
    m = score.score_records([rec([], [], lat=1.0, cost=0.5), rec([], [], lat=3.0, cost=0.25),
                             rec([], [], lat=2.0, cost=0.25)], ORDER, SEV)
    assert m["median_latency_s"] == 2.0 and m["total_cost_usd"] == pytest.approx(1.0)
    assert m["micro"]["precision"] is None and m["top3_hit_rate"] is None


def test_dev_and_test_scored_separately():
    result = {"photos": [dict(rec(["blind_cord"], [("blind_cord", 1)]), split="dev"),
                         dict(rec(["blind_cord"], []), split="test")]}
    s = score.score_result(result, ORDER)
    assert s["dev"]["micro"]["recall"] == 1.0 and s["test"]["micro"]["recall"] == 0.0


def test_parse_findings():
    cues = ORDER
    ok = rb.parse_findings('```json\n[{"cue":"blind_cord","confidence":0.7,"note":"x"}]\n```', cues)
    assert ok[0]["cue"] == "blind_cord"
    assert rb.parse_findings("[]", cues) == []
    for bad in ["not json", '{"cue":"blind_cord"}', '[{"cue":"nope","confidence":0.5,"note":"x"}]',
                '[{"cue":"blind_cord","confidence":2,"note":"x"}]',
                '[{"cue":"blind_cord","confidence":0.5}]',
                '[{"cue":"blind_cord","confidence":0.5,"note":"a"},{"cue":"blind_cord","confidence":0.4,"note":"b"}]']:
        with pytest.raises(rb.ParseError):
            rb.parse_findings(bad, cues)


def test_strip_exif_jpeg_removes_app1():
    exif = b"\xff\xe1" + (2 + 6).to_bytes(2, "big") + b"Exif\x00\x00"
    app0 = b"\xff\xe0\x00\x04ab"
    sos = b"\xff\xda\x00\x02" + b"\x01\x02\xff\xd9"
    data = b"\xff\xd8" + app0 + exif + sos
    out = rb.strip_exif_jpeg(data)
    assert b"Exif" not in out and app0 in out and out.endswith(sos)
    assert rb.strip_exif_jpeg(b"notjpeg") == b"notjpeg"


def test_dry_run_end_to_end(tmp_path):
    rb.main(["--dry-run", "--results-dir", str(tmp_path)])
    md = (tmp_path / "summary.md").read_text()
    assert "## dev" in md and "## test" in md and "DRY RUN" in md
    assert len(list(tmp_path.glob("dryrun-*.json"))) == 3
