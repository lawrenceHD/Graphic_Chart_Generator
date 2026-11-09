"""Annotates a generated scene: one mask and one quad per printable surface.

    python tools/scenes/annotate.py <scene dir> <spec.json>

spec.json: {"surfaces": [{"id", "rect": [x0, y0, x1, y1], "quad"?: [[x, y] * 4], "inset"?: px}]}
For each surface, GrabCut segments the object inside `rect` (the blank surface is white, its
surroundings are not); the mask is written as mask-<id>.png (8-bit, feathered 1 px) and, unless the
spec gives one, the quad is the mask's outline simplified to 4 corners (top-left first, clockwise).
A preview (preview.jpg) draws masks and quads for the visual review of 06_MOCKUP_ENGINE.md §7.
Output: annotation.json beside the masks.
"""

import json
import sys
from pathlib import Path

import cv2
import numpy as np


def order(points: np.ndarray) -> list[list[float]]:
    """Top-left, top-right, bottom-right, bottom-left."""
    pts = points.reshape(-1, 2).astype(np.float64)
    s = pts.sum(axis=1)
    d = pts[:, 0] - pts[:, 1]
    return [pts[np.argmin(s)].tolist(), pts[np.argmax(d)].tolist(), pts[np.argmax(s)].tolist(), pts[np.argmin(d)].tolist()]


def quad_of(mask: np.ndarray) -> list[list[float]]:
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    contour = max(contours, key=cv2.contourArea)
    hull = cv2.convexHull(contour)
    perimeter = cv2.arcLength(hull, True)
    for factor in np.linspace(0.005, 0.1, 60):
        approx = cv2.approxPolyDP(hull, factor * perimeter, True)
        if len(approx) == 4:
            return order(approx)
    return order(cv2.boxPoints(cv2.minAreaRect(contour)))


def segment(image: np.ndarray, rect: list[int]) -> np.ndarray:
    x0, y0, x1, y1 = rect
    # GrabCut at full size takes minutes on a 1920 px photograph: segment at half size, upscale the mask.
    full = image
    image = cv2.resize(full, (full.shape[1] // 2, full.shape[0] // 2), interpolation=cv2.INTER_AREA)
    x0, y0, x1, y1 = x0 // 2, y0 // 2, x1 // 2, y1 // 2
    mask = np.zeros(image.shape[:2], np.uint8)
    bgd = np.zeros((1, 65), np.float64)
    fgd = np.zeros((1, 65), np.float64)
    cv2.grabCut(image, mask, (x0, y0, x1 - x0, y1 - y0), bgd, fgd, 6, cv2.GC_INIT_WITH_RECT)
    binary = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    binary = cv2.resize(binary, (full.shape[1], full.shape[0]), interpolation=cv2.INTER_NEAREST)
    # Keep the largest component, fill its holes (a logo-free surface has none).
    count, labels, stats, _ = cv2.connectedComponentsWithStats(binary)
    if count > 1:
        largest = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
        binary = np.where(labels == largest, 255, 0).astype(np.uint8)
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    filled = np.zeros_like(binary)
    cv2.drawContours(filled, contours, -1, 255, thickness=cv2.FILLED)
    return cv2.morphologyEx(filled, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))


def main() -> None:
    scene = Path(sys.argv[1])
    spec = json.loads(Path(sys.argv[2]).read_text(encoding="utf8"))
    image = cv2.imread(str(scene / spec.get("image", "raw.png")))
    preview = image.copy()
    out = {"size": [image.shape[1], image.shape[0]], "surfaces": []}
    colours = [(0, 0, 255), (0, 200, 0), (255, 0, 0), (0, 200, 255), (255, 0, 255)]
    for index, surface in enumerate(spec["surfaces"]):
        if "polygon" in surface:
            mask = np.zeros(image.shape[:2], np.uint8)
            cv2.fillPoly(mask, [np.array(surface["polygon"], np.int32)], 255)
        else:
            mask = segment(image, surface["rect"])
        inset = int(surface.get("inset", 0))
        if inset > 0:
            mask = cv2.erode(mask, np.ones((2 * inset + 1, 2 * inset + 1), np.uint8))
        quad = surface.get("quad") or quad_of(mask)
        feathered = cv2.GaussianBlur(mask, (3, 3), 0)
        cv2.imwrite(str(scene / f"mask-{surface['id']}.png"), feathered)
        colour = colours[index % len(colours)]
        overlay = preview.copy()
        overlay[mask > 0] = colour
        preview = cv2.addWeighted(overlay, 0.35, preview, 0.65, 0)
        cv2.polylines(preview, [np.array(quad, np.int32)], True, colour, 3)
        for corner, (x, y) in enumerate(quad):
            cv2.putText(preview, str(corner), (int(x) + 6, int(y) - 6), cv2.FONT_HERSHEY_SIMPLEX, 1.0, colour, 2)
        out["surfaces"].append({"id": surface["id"], "quad": [[round(x, 1), round(y, 1)] for x, y in quad]})
    (scene / "annotation.json").write_text(json.dumps(out, indent=2), encoding="utf8")
    cv2.imwrite(str(scene / "preview.jpg"), cv2.resize(preview, (image.shape[1] // 2, image.shape[0] // 2)), [cv2.IMWRITE_JPEG_QUALITY, 80])
    print(json.dumps(out))


if __name__ == "__main__":
    main()
