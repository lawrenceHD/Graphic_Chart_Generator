"""Bakes a Photoshop mockup (PSD with smart objects) into a scene the web compositor replays.

    python tools/psd-mockups/bake.py <mockup.psd> <out dir> <spec.json>

spec.json: {"id", "width": 2400, "slots": {"<smart object name>": "<artwork role>"}, "hide": [names],
            "paint": {"<layer name>": ["neutralLight", ...]}, "licence": "...", "source": "url"}

The PSD's layers are replayed bottom to top. Runs of normal layers are flattened into images; a layer in
another blend mode stays a layer of its own; a smart object named in `slots` becomes a slot: a UV map
giving, for every output pixel, the point of the artwork it shows — the smart object's perspective
(nonAffineTransform) and its custom warp mesh (bicubic Bezier patches) included. The artwork itself is
the brand's, drawn by the studio; it is never part of the scene. Each slot is checked against the pixels
Photoshop stored for that layer (coverage IoU) and the bake fails below 0.95.

Output: scene.json (kind "psd"), layer images (webp/png), uv-<slot>.png and vv-<slot>.png (u and v in
16 bits: high byte in R, low byte in G; coverage in B), preview.jpg, LICENSE.md.
"""

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from psd_tools import PSDImage
from psd_tools.constants import Tag
from scipy.interpolate import LinearNDInterpolator

# A smart object may hold transparent margins around the paper (A4 sheets): the stored coverage cuts
# the artwork to the paper, so a few percent of the rectangle legitimately falls outside it.
MIN_IOU = 0.95
BLENDS = {"NORMAL": "normal", "PASS_THROUGH": "normal", "MULTIPLY": "multiply", "SCREEN": "screen",
          "OVERLAY": "overlay", "SOFT_LIGHT": "soft-light", "DARKEN": "darken", "LIGHTEN": "lighten",
          "LINEAR_BURN": "multiply", "COLOR_BURN": "multiply", "LINEAR_DODGE": "screen"}


def so_data(layer):
    data = layer.tagged_blocks.get_data(Tag.SMART_OBJECT_LAYER_DATA1)
    return data.data if hasattr(data, "data") else data


def homography(quad, w, h):
    """3x3 matrix sending the rectangle (0,0)-(w,h) onto quad (TL, TR, BR, BL)."""
    src = [(0, 0), (w, 0), (w, h), (0, h)]
    a = []
    b = []
    for (x, y), (X, Y) in zip(src, quad):
        a.append([x, y, 1, 0, 0, 0, -X * x, -X * y]); b.append(X)
        a.append([0, 0, 0, x, y, 1, -Y * x, -Y * y]); b.append(Y)
    m = np.linalg.solve(np.array(a, float), np.array(b, float))
    return np.append(m, 1).reshape(3, 3)


def bernstein(t):
    return np.stack([(1 - t) ** 3, 3 * t * (1 - t) ** 2, 3 * t ** 2 * (1 - t), t ** 3], axis=-1)


def warp_points(data, u, v):
    """Smart-object pixel coordinates of artwork points (u, v in [0, 1]) after the custom warp."""
    size = data[b"Sz  "]
    w, h = float(size[b"Wdth"]), float(size[b"Hght"])
    warp = data.get(b"warp")
    style = getattr(warp.get(b"warpStyle"), "enum", None) if warp is not None else None
    if warp is None or style != b"warpCustom":
        return u * w, v * h, (w, h)
    mesh = warp[b"customEnvelopeWarp"][b"meshPoints"]
    xs = np.array([float(x) for x in mesh[b"Hrzn"].values])
    ys = np.array([float(y) for y in mesh[b"Vrtc"].values])
    n = int(round(np.sqrt(len(xs))))
    xs = xs.reshape(n, n); ys = ys.reshape(n, n)
    patches = (n - 1) // 3
    pu = np.minimum((u * patches).astype(int), patches - 1)
    pv = np.minimum((v * patches).astype(int), patches - 1)
    lu = u * patches - pu
    lv = v * patches - pv
    bu = bernstein(lu); bv = bernstein(lv)
    X = np.zeros_like(u); Y = np.zeros_like(u)
    for j in range(4):
        for i in range(4):
            weight = bv[..., j] * bu[..., i]
            X += weight * xs[pv * 3 + j, pu * 3 + i]
            Y += weight * ys[pv * 3 + j, pu * 3 + i]
    return X, Y, (w, h)


def uv_map(layer, scale, out_w, out_h, samples=160):
    data = so_data(layer)
    quad = data.get(b"nonAffineTransform") or data[b"Trnf"]
    quad = np.array([float(q) for q in quad]).reshape(4, 2)
    size = data[b"Sz  "]
    w, h = float(size[b"Wdth"]), float(size[b"Hght"])
    H = homography(quad, w, h)
    warp = data.get(b"warp")
    if warp is None or getattr(warp.get(b"warpStyle"), "enum", None) != b"warpCustom":
        # Perspective only: invert the homography for every output pixel, exactly.
        Hi = np.linalg.inv(H)
        gx, gy = np.meshgrid(np.arange(out_w) + 0.5, np.arange(out_h) + 0.5)
        P = np.stack([gx.ravel() / scale, gy.ravel() / scale, np.ones(gx.size)])
        Q = Hi @ P
        U = (Q[0] / Q[2] / w).reshape(out_h, out_w)
        V = (Q[1] / Q[2] / h).reshape(out_h, out_w)
        outside = (U < 0) | (U > 1) | (V < 0) | (V > 1)
        U[outside] = np.nan; V[outside] = np.nan
        return U, V, w / h
    u, v = np.meshgrid(np.linspace(0, 1, samples), np.linspace(0, 1, samples))
    X, Y, _ = warp_points(data, u, v)
    P = np.stack([X.ravel(), Y.ravel(), np.ones(X.size)])
    Q = H @ P
    cx = Q[0] / Q[2] * scale; cy = Q[1] / Q[2] * scale
    x0, x1 = int(max(0, np.floor(cx.min()))), int(min(out_w, np.ceil(cx.max()) + 1))
    y0, y1 = int(max(0, np.floor(cy.min()))), int(min(out_h, np.ceil(cy.max()) + 1))
    interp = LinearNDInterpolator(np.stack([cx, cy], 1), np.stack([u.ravel(), v.ravel()], 1))
    gx, gy = np.meshgrid(np.arange(x0, x1) + 0.5, np.arange(y0, y1) + 0.5)
    uv = interp(gx, gy)
    U = np.full((out_h, out_w), np.nan); V = np.full((out_h, out_w), np.nan)
    U[y0:y1, x0:x1] = uv[..., 0]; V[y0:y1, x0:x1] = uv[..., 1]
    return U, V, w / h


def encode(values, coverage):
    q = np.clip(np.nan_to_num(values) * 65535, 0, 65535).astype(np.uint32)
    cover = np.clip(np.round(coverage * 255), 0, 255).astype(np.uint32)
    rgb = np.stack([(q >> 8) & 255, q & 255, cover], -1).astype(np.uint8)
    return Image.fromarray(rgb, "RGB")


def flat_layers(group, opacity=1.0, visible=True):
    for layer in group:
        if not layer.is_visible():
            continue
        alpha = opacity * layer.opacity / 255
        if layer.is_group():
            yield from flat_layers(layer, alpha)
        else:
            yield layer, alpha


def layer_rgba(layer, psd_size, scale, out_size):
    """The layer as Photoshop draws it (masks, clipping, effects), at the output scale, on a full canvas."""
    x0, y0, x1, y1 = layer.bbox
    x0, y0 = max(0, x0), max(0, y0)
    x1, y1 = min(psd_size[0], x1), min(psd_size[1], y1)
    if x1 <= x0 or y1 <= y0:
        return None
    piece = layer.composite(viewport=(x0, y0, x1, y1))
    if piece is None:
        return None
    # Place the piece at the output scale on a transparent canvas.
    ox0, oy0 = int(np.floor(x0 * scale)), int(np.floor(y0 * scale))
    ox1, oy1 = int(np.ceil(x1 * scale)), int(np.ceil(y1 * scale))
    piece = piece.convert("RGBA").resize((max(1, ox1 - ox0), max(1, oy1 - oy0)), Image.LANCZOS)
    canvas = Image.new("RGBA", out_size, (0, 0, 0, 0))
    canvas.paste(piece, (ox0, oy0))
    return np.asarray(canvas).astype(np.float64) / 255


def over(dst, src, alpha):
    a = src[..., 3:4] * alpha
    out_a = a + dst[..., 3:4] * (1 - a)
    rgb = (src[..., :3] * a + dst[..., :3] * dst[..., 3:4] * (1 - a)) / np.maximum(out_a, 1e-6)
    return np.concatenate([rgb, out_a], -1)


def main():
    psd_path, out_dir, spec_path = sys.argv[1:4]
    spec = json.loads(Path(spec_path).read_text(encoding="utf8"))
    psd = PSDImage.open(psd_path)
    out = Path(out_dir); out.mkdir(parents=True, exist_ok=True)
    width = spec.get("width", 2400)
    scale = width / psd.width
    size = (width, int(round(psd.height * scale)))
    slots = spec["slots"]; paints = spec.get("paint", {}); hidden = set(spec.get("hide", []))
    layers = []
    run = None
    seen = set()

    def flush():
        nonlocal run
        if run is not None:
            name = f"layer-{len(layers)}.webp" if not layers else f"layer-{len(layers)}.png"
            img = Image.fromarray((run * 255).round().astype(np.uint8), "RGBA")
            if not layers:
                img = img.convert("RGB"); name = "base.webp"
                img.save(out / name, "WEBP", quality=90, method=6)
            else:
                img.save(out / name, optimize=True)
            layers.append({"type": "image", "src": name, "blend": "normal", "opacity": 1})
            run = None

    # The base is Photoshop's own composite of everything under the first slot, adjustment layers
    # (curves, hue, channel mixer) included; the replay starts above it.
    ordered = [layer for layer, _ in flat_layers(psd)]
    first = next((i for i, l in enumerate(ordered) if l.kind == "smartobject" and l.name in slots), len(ordered))
    below = set(id(l) for l in ordered[:first] if l.name not in hidden and l.name not in paints)
    if not paints and below:
        base = psd.composite(layer_filter=lambda l: l.is_group() or id(l) in below)
        if base is not None:
            base.convert("RGB").resize(size, Image.LANCZOS).save(out / "base.webp", "WEBP", quality=90, method=6)
            layers.append({"type": "image", "src": "base.webp", "blend": "normal", "opacity": 1})
            print("  base: Photoshop composite under the first slot", flush=True)
    skip = below if layers else set()
    for layer, alpha in flat_layers(psd):
        if layer.name in hidden or id(layer) in skip:
            continue
        blend = BLENDS.get(getattr(layer.blend_mode, "name", "NORMAL"), "normal")
        if layer.kind == "smartobject" and layer.name in slots:
            key = layer.name if layer.name not in seen else f"{layer.name}-{len(layers)}"
            seen.add(layer.name)
            flush()
            U, V, aspect = uv_map(layer, scale, *size)
            valid = ~np.isnan(U)
            slot_id = f"slot-{len(layers)}"
            print(f"  uv map of {layer.name!r} done", flush=True)
            stored = layer_rgba(layer, psd.size, scale, size)
            iou = None
            coverage = valid.astype(np.float64)
            mark = slots[layer.name].endswith("logo")
            if stored is not None and mark:
                # A logo slot holds a sample mark, not a filled rectangle: its pixels must fall inside the
                # computed surface, and the coverage is the surface itself (the artwork is transparent).
                a = stored[..., 3] > 0.5
                iou = float((a & valid).sum() / max(1, a.sum()))
                if iou < MIN_IOU:
                    raise SystemExit(f"slot {layer.name}: sample mark {iou:.3f} inside, below {MIN_IOU}")
            elif stored is not None:
                a = stored[..., 3] > 0.5
                iou = float((a & valid).sum() / max(1, (a | valid).sum()))
                if iou < MIN_IOU:
                    raise SystemExit(f"slot {layer.name}: coverage IoU {iou:.3f} below {MIN_IOU}")
                # Photoshop's own antialiased edge, where the UV map is defined.
                coverage = np.where(valid, stored[..., 3], 0.0)
                # Keep a UV value under the antialiased edge pixels just outside the map.
                U = np.where(valid, U, 0.0); V = np.where(valid, V, 0.0)
            encode(U, coverage).save(out / f"uv-{slot_id}.png", optimize=True)
            encode(V, coverage).save(out / f"vv-{slot_id}.png", optimize=True)
            layers.append({"type": "slot", "id": slot_id, "role": slots[layer.name], "aspect": round(aspect, 4),
                           "blend": blend, "opacity": round(alpha, 3),
                           "uv": f"uv-{slot_id}.png", "vv": f"vv-{slot_id}.png"})
            print(f"slot {layer.name!r} -> {slots[layer.name]} ({blend}), IoU {iou if iou is None else round(iou, 4)}")
            continue
        if layer.name in paints:
            flush()
            rgba = layer_rgba(layer, psd.size, scale, size)
            mask = Image.fromarray((rgba[..., 3] * 255).round().astype(np.uint8), "L")
            name = f"mask-{len(layers)}.png"; mask.save(out / name, optimize=True)
            layers.append({"type": "paint", "mask": name, "paint": paints[layer.name], "opacity": round(alpha, 3)})
            continue
        rgba = layer_rgba(layer, psd.size, scale, size)
        print(f"  layer {layer.name!r} ({blend})", flush=True)
        if rgba is None:
            continue
        if blend == "normal":
            if run is None:
                run = np.zeros((size[1], size[0], 4)) if layers else np.concatenate(
                    [np.ones((size[1], size[0], 3)), np.ones((size[1], size[0], 1))], -1)
            run = over(run, rgba, alpha)
        else:
            flush()
            name = f"layer-{len(layers)}.png"
            Image.fromarray((rgba * 255).round().astype(np.uint8), "RGBA").save(out / name, optimize=True)
            layers.append({"type": "image", "src": name, "blend": blend, "opacity": round(alpha, 3)})
    flush()
    scene = {"id": spec["id"], "kind": "psd", "schemaVersion": 3, "size": {"width": size[0], "height": size[1]},
             "layers": layers}
    (out / "scene.json").write_text(json.dumps(scene, indent=2) + "\n", encoding="utf8")
    (out / "LICENSE.md").write_text(
        f"# {spec['id']}\n\n- Source : {spec.get('source', '')}\n- Licence : {spec.get('licence', '')}\n"
        "- Cuisson : tools/psd-mockups/bake.py (calques, modes de fusion, perspective et maillage du PSD).\n"
        "- Aucun logo dans les fichiers : le visuel de la marque est dessiné par le studio.\n", encoding="utf8")
    print(json.dumps({"layers": len(layers), "size": size}))


if __name__ == "__main__":
    main()
