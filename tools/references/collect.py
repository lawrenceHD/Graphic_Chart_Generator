"""Collect a private reference library of professional brand identities, per sector, from Pinterest search.

Owner decision 2026-10-29: internal inspiration base only (analysed, never redistributed or shown as ours).
Output: corpus-reel/pinterest/<sector>/ (git-ignored), one JSON caption per image, plus manifest.json.

Usage (from the repository root):
  tools/references/.venv/Scripts/python tools/references/collect.py [sector ...]
"""

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONFIG = json.loads((Path(__file__).parent / "sectors.json").read_text(encoding="utf-8"))
OUT = ROOT / "corpus-reel" / "pinterest"
CLI = Path(sys.executable).parent / "pinterest-dl"


def collect(sector: str, queries: list[str]) -> None:
    target = OUT / sector
    target.mkdir(parents=True, exist_ok=True)
    for query in queries:
        print(f"[{sector}] {query}", flush=True)
        result = subprocess.run(
            [str(CLI), "search", query, "-o", str(target), "-n", str(CONFIG["perQuery"]),
             "-r", CONFIG["minResolution"], "--caption", "json", "--delay", "1.0", "--timeout", "20"],
            capture_output=True, text=True, encoding="utf-8", errors="replace",
        )
        if result.returncode != 0:
            print(f"  failed ({result.returncode}): {result.stderr.strip().splitlines()[-1:]}", flush=True)


def manifest() -> None:
    entries = []
    for caption in sorted(OUT.glob("*/*.json")):
        data = json.loads(caption.read_text(encoding="utf-8"))
        image = next((p for p in caption.parent.glob(caption.stem + ".*") if p.suffix != ".json"), None)
        if image is None:
            continue
        entries.append({
            "sector": caption.parent.name,
            "file": image.relative_to(OUT).as_posix(),
            "alt": data.get("alt"),
            "origin": data.get("origin"),
            "source": data.get("src"),
        })
    (OUT / "manifest.json").write_text(json.dumps(entries, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"manifest: {len(entries)} images", flush=True)


if __name__ == "__main__":
    wanted = sys.argv[1:] or list(CONFIG["sectors"])
    for name in wanted:
        collect(name, CONFIG["sectors"][name])
    manifest()
