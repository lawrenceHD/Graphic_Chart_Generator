"""Packages an annotated scene into the catalogue (06_MOCKUP_ENGINE.md §3, schema v2).

    python tools/scenes/package.py <generated dir> <direction.json> <catalogue dir>

direction.json: {"scenes": {"<id>": {"category", "light": [x, y, z], "surfaces": {"<surface id>":
{"material", "paint": [...], "finishes": [...], "padding"?: 0.2, "aspect"?: number}}}}}
For every scene of the direction: base.webp (the photograph), mask-<surface>.png, scene.json with the
quads of annotation.json, each surface's baseTint (median colour under its mask), and LICENSE.md
(model, date and prompt from prompt.txt).
"""

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image


def edge(a, b):
    return float(np.hypot(b[0] - a[0], b[1] - a[1]))


def main() -> None:
    generated = Path(sys.argv[1])
    direction = json.loads(Path(sys.argv[2]).read_text(encoding="utf8"))
    catalogue = Path(sys.argv[3])
    for scene_id, spec in direction["scenes"].items():
        source = generated / scene_id
        annotation = json.loads((source / "annotation.json").read_text(encoding="utf8"))
        photo = Image.open(source / "raw.png").convert("RGB")
        pixels = np.asarray(photo).astype(np.float64) / 255
        target = catalogue / scene_id
        target.mkdir(parents=True, exist_ok=True)
        photo.save(target / "base.webp", "WEBP", quality=90, method=6)
        surfaces = []
        for surface in annotation["surfaces"]:
            sid = surface["id"]
            look = spec["surfaces"][sid]
            mask = Image.open(source / f"mask-{sid}.png").convert("L")
            mask.save(target / f"mask-{sid}.png", optimize=True)
            inside = np.asarray(mask) > 200
            tint = np.median(pixels[inside], axis=0) if inside.any() else np.array([0.9, 0.9, 0.9])
            q = surface["quad"]
            aspect = look.get("aspect") or ((edge(q[0], q[1]) + edge(q[3], q[2])) / (edge(q[0], q[3]) + edge(q[1], q[2])))
            light = np.array(spec.get("light", [-0.4, -0.6, 0.69]), dtype=np.float64)
            light = (light / np.linalg.norm(light)).round(4).tolist()
            surfaces.append(
                {
                    "id": sid,
                    "quad": [[int(round(x)), int(round(y))] for x, y in q],
                    "logoBox": {"aspect": round(aspect, 3), "fit": "contain", "paddingRatio": look.get("padding", 0.2)},
                    "baseTint": [round(float(c), 3) for c in tint],
                    "light": {"direction": light},
                    "finishes": look["finishes"],
                    "mask": f"mask-{sid}.png",
                    "material": look["material"],
                    "paint": look["paint"],
                }
            )
        scene = {
            "id": scene_id,
            "schemaVersion": 2,
            "category": spec["category"],
            "size": {"width": photo.width, "height": photo.height},
            "surfaces": surfaces,
        }
        (target / "scene.json").write_text(json.dumps(scene, indent=2) + "\n", encoding="utf8")
        model, date, prompt = (source / "prompt.txt").read_text(encoding="utf8").split("\n", 2)
        licence = [
            f"# {scene_id}",
            "",
            f"- Origine : image générée par IA ({model.replace('@cf/', 'cloudflare:')}), le {date[:10]}.",
            "- Usage : commercial.",
            "- Licence du modèle : Apache-2.0 (https://huggingface.co/black-forest-labs/FLUX.2-klein-4B).",
            "- Conditions du fournisseur : https://www.cloudflare.com/service-specific-terms-developer-platform/",
            f"- Prompt : {prompt.strip()}",
            "- Masques et coins : tools/scenes/annotate.py (GrabCut OpenCV), vérifiés sur preview.jpg.",
            "- Aucun logo dans l'image : le logo est posé par calcul (mockup-engine).",
            "",
        ]
        (target / "LICENSE.md").write_text("\n".join(licence), encoding="utf8")
        print(scene_id, [s["baseTint"] for s in surfaces])


if __name__ == "__main__":
    main()
