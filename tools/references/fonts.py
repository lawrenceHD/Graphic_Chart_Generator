"""Build the typeface catalogue the studio recommends from: open-source Google Fonts only (OFL/Apache), so every
recommended font can be embedded in the exported guideline and downloaded by the client without a licence risk.

Sources (public, no key): https://fonts.google.com/metadata/fonts (families, weights, axes, popularity) and
https://github.com/google/fonts tags/all/families.csv (classification, expressive and quality scores, 0 to 100).
Output: packages/ai/src/fonts/catalogue.json, validated by Zod when loaded.

Usage (from the repository root): python tools/references/fonts.py
"""

import csv
import io
import json
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TARGET = ROOT / "packages" / "ai" / "src" / "fonts" / "catalogue.json"
METADATA = "https://fonts.google.com/metadata/fonts"
TAGS = "https://raw.githubusercontent.com/google/fonts/main/tags/all/families.csv"
CLASSES = ("/Sans/", "/Serif/", "/Slab/", "/Script/", "/Monospace/", "/Theme/")
EXPRESSIVE = "/Expressive/"
QUALITY = "/Quality/"
# Families designed first for Chinese, Japanese or Korean: their Latin glyphs are a secondary companion.
CJK_SCRIPTS = {"Jpan", "Hira", "Kana", "Kore", "Hang", "Hans", "Hant", "Hani"}


def fetch(url: str) -> str:
    with urllib.request.urlopen(url, timeout=60) as response:
        return response.read().decode("utf-8")


def main() -> None:
    text = fetch(METADATA)
    families = json.loads(text[text.index("{"):])["familyMetadataList"]
    tags: dict[str, dict[str, dict[str, int]]] = {}
    for row in csv.reader(io.StringIO(fetch(TAGS))):
        if len(row) < 4 or row[1]:
            continue  # row[1] is an axis location: keep the family-level tags only
        family, tag, value = row[0], row[2], row[3]
        entry = tags.setdefault(family, {"classes": {}, "expressive": {}, "quality": {}})
        score = round(float(value))
        if tag.startswith(CLASSES):
            entry["classes"][tag.strip("/")] = score
        elif tag.startswith(EXPRESSIVE):
            entry["expressive"][tag[len(EXPRESSIVE):]] = score
        elif tag.startswith(QUALITY):
            entry["quality"][tag[len(QUALITY):]] = score
    catalogue = []
    for family in families:
        name = family["family"]
        tagged = tags.get(name)
        if (not family.get("isOpenSource") or family.get("isNoto") or family.get("colorCapabilities")
                or "latin-ext" not in family.get("subsets", []) or tagged is None or not tagged["quality"]
                or family.get("primaryScript") in CJK_SCRIPTS):
            continue
        weights = sorted({int(k.rstrip("i")) for k in family["fonts"] if k.rstrip("i").isdigit()})
        axes = [a["tag"] for a in family.get("axes", [])]
        if "wght" in axes:
            axis = next(a for a in family["axes"] if a["tag"] == "wght")
            weights = [w for w in range(100, 1000, 100) if axis["min"] <= w <= axis["max"]]
        catalogue.append({
            "family": name,
            "category": family["category"],
            "classes": tagged["classes"],
            "expressive": tagged["expressive"],
            "quality": round(sum(tagged["quality"].values()) / len(tagged["quality"])),
            "popularity": family["popularity"],
            "weights": weights,
            "italic": any(k.endswith("i") for k in family["fonts"]),
            "variable": "wght" in axes,
        })
    catalogue.sort(key=lambda f: f["popularity"])
    if len(catalogue) < 500:
        # An upstream format change must not overwrite a good catalogue with a near-empty one.
        raise SystemExit(f"only {len(catalogue)} families parsed: catalogue left unchanged")
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    temporary = TARGET.with_suffix(".tmp")
    temporary.write_text(json.dumps({"source": "Google Fonts metadata and google/fonts tags", "families": catalogue},
                                    ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    temporary.replace(TARGET)
    print(f"{len(catalogue)} families kept of {len(families)} -> {TARGET.relative_to(ROOT)} "
          f"({TARGET.stat().st_size // 1024} KiB)")


if __name__ == "__main__":
    main()
