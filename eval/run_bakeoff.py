#!/usr/bin/env python3
"""Perception bake-off harness (T8). Stdlib only; Pillow optional (EXIF strip + resize).

  python3 run_bakeoff.py --dry-run
  python3 run_bakeoff.py --providers anthropic,openai,google [--split dev]
"""
from __future__ import annotations

import argparse
import base64
import csv
import hashlib
import io
import json
import os
import random
import re
import struct
import sys
import time
import urllib.error
import urllib.request
from datetime import date

import score

HERE = os.path.dirname(os.path.abspath(__file__))
MAX_SIDE = 1568  # downscale long edge; cheaper, and models resize anyway

# USD per 1M tokens (input, output). ESTIMATES (old models): verify against current price pages before trusting the cost column.
# Also try ANTHROPIC_MODEL=claude-haiku-5-5 for a cheaper run. Check OpenAI/Google model names in their docs and set OPENAI_MODEL / GOOGLE_MODEL.
PRICES = {
    "anthropic": (3.0, 15.0),
    "openai": (2.5, 10.0),
    "google": (0.10, 0.40),
}
DEFAULT_MODELS = {
    "anthropic": "claude-sonnet-5-5",
    "openai": "gpt-4o",
    "google": "gemini-2.0-flash",
}

# JSON schema for one finding (documented; validated by validate_findings below).
FINDINGS_SCHEMA = {
    "type": "array",
    "items": {
        "type": "object",
        "required": ["cue", "confidence", "note"],
        "properties": {
            "cue": {"type": "string", "enum": "<cues.txt>"},
            "confidence": {"type": "number", "minimum": 0, "maximum": 1},
            "note": {"type": "string"},
        },
        "additionalProperties": False,
    },
}


class ParseError(Exception):
    pass


# ---------- image prep ----------

def strip_exif_jpeg(data: bytes) -> bytes:
    """Fallback: drop APPn (except APP0), COM segments from a JPEG. No rotation fix."""
    if data[:2] != b"\xff\xd8":
        return data
    out, i = [data[:2]], 2
    while i + 4 <= len(data):
        if data[i] != 0xFF:
            break
        marker = data[i + 1]
        if marker == 0xDA:  # start of scan: copy the rest
            out.append(data[i:])
            return b"".join(out)
        (length,) = struct.unpack(">H", data[i + 2:i + 4])
        seg = data[i:i + 2 + length]
        keep = not (0xE1 <= marker <= 0xEF or marker == 0xFE)
        if keep:
            out.append(seg)
        i += 2 + length
    out.append(data[i:])
    return b"".join(out)


def prepare_image(data: bytes) -> bytes:
    """Strip EXIF (apply orientation first when Pillow is present) and downscale."""
    try:
        from PIL import Image, ImageOps
    except ImportError:
        return strip_exif_jpeg(data)
    try:
        im = Image.open(io.BytesIO(data))
        im = ImageOps.exif_transpose(im).convert("RGB")
        im.thumbnail((MAX_SIDE, MAX_SIDE))
        buf = io.BytesIO()
        im.save(buf, "JPEG", quality=88)  # new file: no EXIF carried over
        return buf.getvalue()
    except Exception:
        return strip_exif_jpeg(data)


# ---------- prompt + parsing ----------

def build_prompt(cues: list[str], path: str | None = None) -> str:
    with open(path or os.path.join(HERE, "prompt.txt"), encoding="utf-8") as f:
        text = f.read()
    return text.replace("{cues}", "\n".join(f"- {c}" for c in cues))


def validate_findings(obj, cues: list[str]) -> list[dict]:
    if not isinstance(obj, list):
        raise ParseError("top level is not an array")
    seen, out = set(), []
    for item in obj:
        if not isinstance(item, dict) or set(item) != {"cue", "confidence", "note"}:
            raise ParseError("item must have exactly cue, confidence, note")
        cue, conf, note = item["cue"], item["confidence"], item["note"]
        if cue not in cues:
            raise ParseError(f"unknown cue: {cue!r}")
        if isinstance(conf, bool) or not isinstance(conf, (int, float)) or not 0 <= conf <= 1:
            raise ParseError("confidence must be a number in [0, 1]")
        if not isinstance(note, str):
            raise ParseError("note must be a string")
        if cue in seen:
            raise ParseError(f"duplicate cue: {cue}")
        seen.add(cue)
        out.append({"cue": cue, "confidence": float(conf), "note": note})
    return out


def parse_findings(text: str, cues: list[str]) -> list[dict]:
    t = text.strip()
    t = re.sub(r"^```(?:json)?\s*|\s*```$", "", t)  # tolerate fences; counted as OK
    try:
        obj = json.loads(t)
    except json.JSONDecodeError as e:
        raise ParseError(f"invalid JSON: {e}") from e
    return validate_findings(obj, cues)


# ---------- providers ----------

class Provider:
    name = "base"
    key_env = ""

    def __init__(self):
        self.model = os.environ.get(f"{self.name.upper()}_MODEL", DEFAULT_MODELS.get(self.name, ""))
        self.prompt = ""
        self.last_usage = (0, 0)  # (input_tokens, output_tokens) of the last call

    @property
    def available(self) -> bool:
        return bool(os.environ.get(self.key_env))

    def _post(self, url: str, headers: dict, body: dict) -> dict:
        req = urllib.request.Request(
            url, data=json.dumps(body).encode(), method="POST",
            headers={"content-type": "application/json", **headers})
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                return json.load(resp)
        except urllib.error.HTTPError as e:
            raise RuntimeError(f"HTTP {e.code}: {e.read()[:300]!r}") from e

    def call(self, image_bytes: bytes) -> str:  # returns raw model text; sets last_usage
        raise NotImplementedError

    def detect(self, image_bytes: bytes, cues: list[str]) -> list[dict]:
        self.prompt = self.prompt or build_prompt(cues)
        return parse_findings(self.call(image_bytes), cues)

    def cost(self) -> float:
        pin, pout = PRICES.get(self.name, (0, 0))
        return (self.last_usage[0] * pin + self.last_usage[1] * pout) / 1e6


class AnthropicProvider(Provider):
    name, key_env = "anthropic", "ANTHROPIC_API_KEY"

    def call(self, image_bytes):
        r = self._post("https://api.anthropic.com/v1/messages",
                       {"x-api-key": os.environ[self.key_env], "anthropic-version": "2023-06-01"},
                       {"model": self.model, "max_tokens": 1024, "messages": [{"role": "user", "content": [
                           {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg",
                                                        "data": base64.b64encode(image_bytes).decode()}},
                           {"type": "text", "text": self.prompt}]}]})
        u = r.get("usage", {})
        self.last_usage = (u.get("input_tokens", 0), u.get("output_tokens", 0))
        return "".join(b.get("text", "") for b in r.get("content", []))


class OpenAIProvider(Provider):
    name, key_env = "openai", "OPENAI_API_KEY"

    def call(self, image_bytes):
        uri = "data:image/jpeg;base64," + base64.b64encode(image_bytes).decode()
        r = self._post("https://api.openai.com/v1/chat/completions",
                       {"authorization": "Bearer " + os.environ[self.key_env]},
                       {"model": self.model, "max_tokens": 1024, "messages": [{"role": "user", "content": [
                           {"type": "text", "text": self.prompt},
                           {"type": "image_url", "image_url": {"url": uri}}]}]})
        u = r.get("usage", {})
        self.last_usage = (u.get("prompt_tokens", 0), u.get("completion_tokens", 0))
        return r["choices"][0]["message"].get("content") or ""


class GoogleProvider(Provider):
    name, key_env = "google", "GOOGLE_API_KEY"

    def call(self, image_bytes):
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent"
        r = self._post(url, {"x-goog-api-key": os.environ[self.key_env]},
                       {"contents": [{"parts": [
                           {"text": self.prompt},
                           {"inline_data": {"mime_type": "image/jpeg",
                                            "data": base64.b64encode(image_bytes).decode()}}]}],
                        "generationConfig": {"maxOutputTokens": 1024}})
        u = r.get("usageMetadata", {})
        self.last_usage = (u.get("promptTokenCount", 0), u.get("candidatesTokenCount", 0))
        parts = r["candidates"][0].get("content", {}).get("parts", [])
        return "".join(p.get("text", "") for p in parts)


class DryRunProvider(Provider):
    """Canned outputs. Fake 'images' carry their truth: b'FAKE:' + ';'-joined cues."""

    def __init__(self, base: str, recall: float, fp_rate: float, fail_rate: float, latency: float):
        self.name, self.model = base, f"dry-run-{base}"
        self.recall, self.fp_rate, self.fail_rate, self.fake_latency = recall, fp_rate, fail_rate, latency
        self.prompt, self.last_usage = "", (0, 0)
        self._cues: list[str] = []

    available = True

    def detect(self, image_bytes, cues):
        self._cues = cues
        return super().detect(image_bytes, cues)

    def call(self, image_bytes):
        rng = random.Random(hashlib.sha256(self.name.encode() + image_bytes).digest())
        truth = [c for c in image_bytes.decode().removeprefix("FAKE:").split(";") if c]
        self.last_usage = (1500, 120)
        if rng.random() < self.fail_rate:
            return "Sorry, I can only describe this image in words."  # forces a parse failure
        found = [c for c in truth if rng.random() < self.recall]
        found += [c for c in self._cues if c not in truth and rng.random() < self.fp_rate]
        return json.dumps([{"cue": c, "confidence": round(rng.uniform(0.4, 0.99), 2),
                            "note": "canned dry-run output"} for c in found])


REAL_PROVIDERS = {"anthropic": AnthropicProvider, "openai": OpenAIProvider, "google": GoogleProvider}


def dry_providers():
    return [DryRunProvider("anthropic", 0.85, 0.03, 0.02, 2.1),
            DryRunProvider("openai", 0.75, 0.05, 0.05, 3.4),
            DryRunProvider("google", 0.65, 0.04, 0.10, 1.2)]


# ---------- data ----------

def load_labels(path: str) -> list[dict]:
    rows = []
    with open(path, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if not (r.get("photo") or "").strip():
                continue
            rows.append({"photo": r["photo"].strip(),
                         "truth": [c.strip() for c in (r.get("cues") or "").split(";") if c.strip()],
                         "split": (r.get("split") or "").strip().lower()})
    return rows


def check_labels(rows: list[dict], cues: list[str]):
    for r in rows:
        bad = [c for c in r["truth"] if c not in cues]
        if bad:
            raise SystemExit(f"labels.csv: {r['photo']} has unknown cues {bad}")
        if r["split"] not in ("dev", "test"):
            raise SystemExit(f"labels.csv: {r['photo']} needs split = dev or test")


def synthetic_rows(cues: list[str]) -> list[dict]:
    rng = random.Random(7)
    rows = []
    for i in range(30):
        truth = rng.sample(cues, rng.choice([0, 1, 1, 2, 3]))
        rows.append({"photo": f"fake_{i:02d}.jpg", "truth": truth,
                     "split": "test" if i % 3 == 2 else "dev"})
    return rows


# ---------- run ----------

def run_provider(p: Provider, rows, cues, read_image, dry: bool) -> dict:
    p.prompt = build_prompt(cues)
    photos = []
    for i, r in enumerate(rows, 1):
        img = prepare_image(read_image(r))
        t0 = time.perf_counter()
        pred, failure, err = [], False, None
        try:
            pred = p.detect(img, cues)
        except ParseError as e:
            failure, err = True, str(e)
        except Exception as e:  # network/API errors count as failures too
            failure, err = True, f"api error: {e}"
        latency = getattr(p, "fake_latency", None) if dry else time.perf_counter() - t0
        if dry:  # jitter so medians are not degenerate
            latency = round(latency * (0.8 + 0.4 * random.Random(r["photo"]).random()), 3)
        photos.append({"photo": r["photo"], "split": r["split"], "truth": r["truth"], "pred": pred,
                       "parse_failure": failure, "error": err, "latency_s": round(latency, 3),
                       "cost_usd": round(p.cost(), 6)})
        print(f"  [{p.name}] {i}/{len(rows)} {r['photo']} "
              f"{'FAIL' if failure else str(len(pred)) + ' findings'}", file=sys.stderr)
    return {"provider": p.name, "model": p.model, "date": date.today().isoformat(),
            "dry_run": dry, "prompt_sha256": hashlib.sha256(p.prompt.encode()).hexdigest()[:12],
            "photos": photos}


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dry-run", action="store_true", help="canned fake outputs; no keys, photos or network")
    ap.add_argument("--providers", default="anthropic,openai,google")
    ap.add_argument("--split", choices=["dev", "test", "all"], default="all")
    ap.add_argument("--limit", type=int, help="only the first N photos (cheap smoke test)")
    ap.add_argument("--labels", default=os.path.join(HERE, "labels.csv"))
    ap.add_argument("--photos-dir", default=os.path.join(HERE, "photos"))
    ap.add_argument("--results-dir", default=os.path.join(HERE, "results"))
    args = ap.parse_args(argv)

    cues = score.load_cues()
    os.makedirs(args.results_dir, exist_ok=True)

    if args.dry_run:
        rows = synthetic_rows(cues)
        providers = dry_providers()
        read_image = lambda r: ("FAKE:" + ";".join(r["truth"])).encode()
    else:
        rows = load_labels(args.labels)
        check_labels(rows, cues)
        missing = [r["photo"] for r in rows if not os.path.exists(os.path.join(args.photos_dir, r["photo"]))]
        if missing:
            print(f"warning: {len(missing)} labeled photos not found, skipping: {missing[:5]}", file=sys.stderr)
        rows = [r for r in rows if r["photo"] not in missing]
        if not rows:
            raise SystemExit("No labeled photos found. Add photos to eval/photos/ and rows to eval/labels.csv.")
        names = [n.strip() for n in args.providers.split(",") if n.strip()]
        providers = []
        for n in names:
            if n not in REAL_PROVIDERS:
                raise SystemExit(f"unknown provider {n}")
            p = REAL_PROVIDERS[n]()
            if p.available:
                providers.append(p)
            else:
                print(f"skipping {n}: {p.key_env} not set", file=sys.stderr)
        if not providers:
            raise SystemExit("No providers available: set ANTHROPIC_API_KEY, OPENAI_API_KEY and/or GOOGLE_API_KEY.")
        read_image = lambda r: open(os.path.join(args.photos_dir, r["photo"]), "rb").read()

    if args.split != "all":
        rows = [r for r in rows if r["split"] == args.split]
    if args.limit:
        rows = rows[:args.limit]

    results = []
    for p in providers:
        print(f"running {p.name} ({p.model}) on {len(rows)} photos", file=sys.stderr)
        res = run_provider(p, rows, cues, read_image, args.dry_run)
        prefix = "dryrun-" if args.dry_run else ""
        path = os.path.join(args.results_dir, f"{prefix}{p.name}-{res['date']}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(res, f, indent=1)
        print("wrote", path, file=sys.stderr)
        results.append(res)

    print("wrote", score.write_summary(args.results_dir), file=sys.stderr)


if __name__ == "__main__":
    main()
