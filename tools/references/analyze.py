"""Index the private reference library: one Gemini vision card and one image embedding per reference.

Owner decision 2026-10-29: internal inspiration base only. Free tier only (ADR-027): one request at a time, paced,
exponential backoff on 429/5xx, and resumable: references already in the index are skipped, so a run stopped by the
daily quota continues the next day where it stopped.

Output: corpus-reel/pinterest/index.jsonl, one line per reference:
  {"id", "sector", "file", "card": {...}, "embedding": [768 floats], "model": {...}}
The vocabulary is tools/references/vocabulary.json, mirrored by the Zod schema in packages/contracts (a test keeps
both in sync), and every line is validated again by Zod when the studio loads it.

Usage (from the repository root): python tools/references/analyze.py [--limit N] [--sector NAME] [--root DIR]
--root DIR: analyse another library laid out like corpus-reel/pinterest (manifest.json, <sector>/<file>, and the
index.jsonl written there); tools/references/fetch-on-demand.mjs uses it on a temporary folder it deletes afterwards.
"""

import argparse
import base64
import http.client
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "corpus-reel" / "pinterest"
INDEX = OUT / "index.jsonl"
VOCAB = json.loads((Path(__file__).parent / "vocabulary.json").read_text(encoding="utf-8"))
VISION_MODEL = "gemini-3.5-flash-lite"
EMBED_MODEL = "gemini-embedding-2"
EMBED_DIM = 768
API = "https://generativelanguage.googleapis.com/v1beta/models"
MIME = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}


def api_key() -> str:
    if os.environ.get("AI_API_KEY", "").strip():
        return os.environ["AI_API_KEY"].strip()
    text = (ROOT / ".env.local").read_text(encoding="utf-8")
    match = re.search(r"^AI_API_KEY=(.*)$", text, re.M)
    if not match or not match.group(1).strip():
        sys.exit("AI_API_KEY missing from .env.local")
    return match.group(1).strip().strip('"')


def enum(values: list[str]) -> dict:
    return {"type": "STRING", "enum": values}


CARD_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "kind": enum(VOCAB["kinds"]),
        "sections": {"type": "ARRAY", "items": enum(VOCAB["sections"])},
        "mockups": {"type": "ARRAY", "items": {"type": "STRING"}},
        "styles": {"type": "ARRAY", "items": enum(VOCAB["styles"])},
        "headingType": enum(VOCAB["typeStyles"]),
        "bodyType": enum(VOCAB["typeStyles"]),
        "whitespace": enum(VOCAB["whitespace"]),
        "background": enum(VOCAB["backgrounds"]),
        "palette": {"type": "ARRAY", "items": {"type": "STRING"}},
        "quality": {"type": "INTEGER"},
        "insight": {"type": "STRING"},
    },
    "required": ["kind", "sections", "mockups", "styles", "headingType", "bodyType", "whitespace", "background",
                 "palette", "quality", "insight"],
    "propertyOrdering": ["kind", "sections", "mockups", "styles", "headingType", "bodyType", "whitespace",
                         "background", "palette", "quality", "insight"],
}

PROMPT = """You are a senior brand identity art director cataloguing professional references for a design studio.
Describe this image as structured data, only from what is visible.
- kind: what the image is overall.
- sections: every brand guideline section visibly shown (logo, palette, typography, stationery, signage...).
- mockups: the physical or digital objects shown as mockups, short lowercase English nouns ("business card",
  "coffee cup", "tote bag", "storefront sign", "instagram post"); empty if none.
- styles: 1 to 4 visual style tags.
- headingType / bodyType: the classification of the display and text typefaces used in the layout (not the logo
  drawing); "none" if there is no such text.
- whitespace, background: how the composition is set.
- palette: up to 6 dominant brand colours as #RRGGBB, most important first, excluding plain white and black paper.
- quality: 1 (amateur) to 5 (agency portfolio level).
- insight: one sentence (max 160 characters) on the concrete layout or presentation technique a designer should
  borrow from it."""


def post(model: str, method: str, body: dict, key: str) -> dict:
    request = urllib.request.Request(f"{API}/{model}:{method}", data=json.dumps(body).encode(),
                                     headers={"Content-Type": "application/json", "x-goog-api-key": key})
    delay = 10.0
    for attempt in range(6):
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                return json.load(response)
        except urllib.error.HTTPError as error:
            detail = error.read().decode(errors="replace")
            if error.code == 429 and re.search(r"per ?day", detail, re.I):
                raise QuotaExhausted(model) from error
            if error.code in (400, 401, 403):
                raise Fatal(f"{model} HTTP {error.code}: {detail[:200]}") from error
            if error.code not in (429, 500, 502, 503, 504) or attempt == 5:
                raise RuntimeError(f"{model} HTTP {error.code}: {detail[:200]}") from error
        except (urllib.error.URLError, TimeoutError, ConnectionError, http.client.HTTPException) as error:
            if attempt == 5:
                raise RuntimeError(f"{model} network: {error}") from error
        time.sleep(delay)
        delay = min(delay * 2, 120)
    raise RuntimeError("unreachable")


class QuotaExhausted(Exception):
    pass


class Fatal(Exception):
    """Key refused or request malformed: every next call would fail the same way."""


HEX = re.compile(r"^#[0-9A-Fa-f]{6}$")


def valid_card(card: dict) -> bool:
    """Mirror of ReferenceCardSchema's hard rules, so an invalid card is retried later, not stored."""
    return (card.get("kind") in VOCAB["kinds"]
            and all(s in VOCAB["sections"] for s in card.get("sections", []))
            and 1 <= len(card.get("styles", [])) and all(s in VOCAB["styles"] for s in card["styles"])
            and card.get("headingType") in VOCAB["typeStyles"] and card.get("bodyType") in VOCAB["typeStyles"]
            and card.get("whitespace") in VOCAB["whitespace"] and card.get("background") in VOCAB["backgrounds"]
            and isinstance(card.get("quality"), int) and 1 <= card["quality"] <= 5
            and isinstance(card.get("insight"), str) and len(card["insight"]) <= 240)


def analyse(image: Path, key: str) -> tuple[dict, list[float]]:
    part = {"inline_data": {"mime_type": MIME[image.suffix.lower()],
                            "data": base64.b64encode(image.read_bytes()).decode()}}
    vision = post(VISION_MODEL, "generateContent", {
        "contents": [{"parts": [part, {"text": PROMPT}]}],
        "generationConfig": {"responseMimeType": "application/json", "responseSchema": CARD_SCHEMA,
                             "temperature": 0.2},
    }, key)
    text = vision["candidates"][0]["content"]["parts"][0]["text"]
    card = json.loads(text)
    if not valid_card(card):
        raise RuntimeError(f"card outside the vocabulary: {text[:160]}")
    embedding = post(EMBED_MODEL, "embedContent", {
        "content": {"parts": [part]}, "outputDimensionality": EMBED_DIM,
    }, key)["embedding"]["values"]
    if len(embedding) != EMBED_DIM:
        raise RuntimeError(f"embedding of size {len(embedding)}")
    return card, [round(v, 6) for v in embedding]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--sector", default="")
    parser.add_argument("--root", default="", help="library folder (default corpus-reel/pinterest)")
    parser.add_argument("--pace", type=float, default=4.5, help="seconds between references (free tier RPM)")
    args = parser.parse_args()
    global OUT, INDEX
    if args.root:
        OUT = Path(args.root).resolve()
        INDEX = OUT / "index.jsonl"
    key = api_key()
    manifest = json.loads((OUT / "manifest.json").read_text(encoding="utf-8"))
    done = set()
    corrupt = 0
    if INDEX.exists():
        for line in INDEX.read_text(encoding="utf-8").splitlines():
            try:
                entry = json.loads(line)
                if valid_card(entry["card"]) and len(entry["embedding"]) == EMBED_DIM:
                    done.add(entry["file"])
                else:
                    corrupt += 1
            except (json.JSONDecodeError, KeyError, TypeError):
                corrupt += 1  # truncated by a crash: reported, and the reference is analysed again
        text = INDEX.read_bytes()
        if text and not text.endswith(b"\n"):
            with INDEX.open("ab") as sink:
                sink.write(b"\n")
    unsupported = sum(1 for e in manifest if Path(e["file"]).suffix.lower() not in MIME)
    todo = [e for e in manifest if e["file"] not in done and (not args.sector or e["sector"] == args.sector)
            and Path(e["file"]).suffix.lower() in MIME]
    if args.limit:
        todo = todo[: args.limit]
    print(f"indexed {len(done)}, to do {len(todo)}, invalid lines {corrupt}, unsupported files {unsupported}",
          flush=True)
    failures = 0
    streak = 0
    root = OUT.resolve()
    with INDEX.open("a", encoding="utf-8") as sink:
        for count, entry in enumerate(todo, 1):
            started = time.time()
            image = (OUT / entry["file"]).resolve()
            if not image.is_relative_to(root):
                failures += 1
                print(f"  refused path outside the library: {entry['file']}", flush=True)
                continue
            try:
                card, embedding = analyse(image, key)
                streak = 0
            except QuotaExhausted as error:
                print(f"daily quota reached on {error}; rerun tomorrow to resume", flush=True)
                break
            except Fatal as error:
                print(f"stopping: {error}", flush=True)
                break
            except (RuntimeError, KeyError, IndexError, TypeError, OSError, json.JSONDecodeError) as error:
                failures += 1
                streak += 1
                print(f"  failed {entry['file']}: {error}", flush=True)
                if streak >= 10:
                    print("stopping: 10 failures in a row", flush=True)
                    break
                time.sleep(args.pace)
                continue
            # The unique key is "file"; "id" is only a label.
            line = {"id": Path(entry["file"]).stem[:80], "sector": entry["sector"], "file": entry["file"],
                    "card": card, "embedding": embedding,
                    "model": {"vision": VISION_MODEL, "embedding": EMBED_MODEL, "dimensions": EMBED_DIM}}
            sink.write(json.dumps(line, ensure_ascii=False) + "\n")
            sink.flush()
            if count % 25 == 0:
                print(f"{count}/{len(todo)} ({failures} failed)", flush=True)
            time.sleep(max(0.0, args.pace - (time.time() - started)))
    print(f"done, {failures} failed", flush=True)
    if failures:
        sys.exit(1)


if __name__ == "__main__":
    main()
