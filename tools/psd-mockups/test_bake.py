"""Tests of the warp reading in bake.py (ADR-034, C-09).

    python -m unittest discover -s tools/psd-mockups -p "test_*.py"
"""

import sys
import unittest
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import bake  # noqa: E402


class Enum:
    def __init__(self, value):
        self.enum = value


class Values:
    def __init__(self, values):
        self.values = values


def smart_object(style=b"warpCustom", n=4, extra=None, w=300.0, h=200.0, points=None):
    """A smart-object descriptor as psd-tools reads it, with a regular (identity) warp grid."""
    data = {b"Sz  ": {b"Wdth": w, b"Hght": h}}
    if style is not None:
        xs, ys = points if points is not None else np.meshgrid(np.linspace(0, w, n), np.linspace(0, h, n))
        warp = {b"warpStyle": Enum(style),
                b"customEnvelopeWarp": {b"meshPoints": {b"Hrzn": Values(list(np.ravel(xs))),
                                                        b"Vrtc": Values(list(np.ravel(ys)))}}}
        warp.update(extra or {})
        data[b"warp"] = warp
    return data


def bezier(px, py, u, v):
    """One bicubic patch evaluated directly from its 16 control points."""
    b = lambda t: np.array([(1 - t) ** 3, 3 * t * (1 - t) ** 2, 3 * t ** 2 * (1 - t), t ** 3])
    bu, bv = b(u), b(v)
    return float(bv @ px @ bu), float(bv @ py @ bu)


QUAD = [(100, 50), (420, 80), (400, 300), (120, 260)]


class WarpGrid(unittest.TestCase):
    def test_no_warp_and_warp_none_are_flat(self):
        self.assertIsNone(bake.warp_grid(smart_object(style=None)))
        self.assertIsNone(bake.warp_grid(smart_object(style=b"warpNone")))

    def test_custom_square_grid_is_read(self):
        xs, ys = bake.warp_grid(smart_object(n=7))
        self.assertEqual(xs.shape, (7, 7))
        self.assertAlmostEqual(xs[0, 6], 300.0)
        self.assertAlmostEqual(ys[6, 0], 200.0)

    def test_presets_are_refused_by_name(self):
        for preset in (b"warpArc", b"warpBulge", b"warpFlag", b"warpRise"):
            with self.assertRaises(SystemExit) as raised:
                bake.warp_grid(smart_object(style=preset))
            self.assertIn(preset.decode(), str(raised.exception))

    def test_split_and_non_square_grids_are_refused(self):
        with self.assertRaises(SystemExit):
            bake.warp_grid(smart_object(extra={b"deformNumRows": 4, b"deformNumCols": 7}))
        xs, ys = np.meshgrid(np.linspace(0, 300, 7), np.linspace(0, 200, 4))
        with self.assertRaises(SystemExit):
            bake.warp_grid(smart_object(points=(xs, ys)))


class PhotoshopOrder(unittest.TestCase):
    def test_flat_object_is_the_exact_homography(self):
        data = smart_object(style=None)
        H = bake.homography(np.array(QUAD, float), 300.0, 200.0)
        X, Y = bake.document_points(data, H, np.array([0.5]), np.array([0.5]))
        p = H @ np.array([150.0, 100.0, 1.0])
        self.assertAlmostEqual(X[0], p[0] / p[2], places=6)
        self.assertAlmostEqual(Y[0], p[1] / p[2], places=6)

    def test_control_points_go_through_the_homography_before_the_bezier(self):
        data = smart_object()
        H = bake.homography(np.array(QUAD, float), 300.0, 200.0)
        xs, ys = np.meshgrid(np.linspace(0, 300, 4), np.linspace(0, 200, 4))
        q = H @ np.stack([xs.ravel(), ys.ravel(), np.ones(16)])
        px, py = (q[0] / q[2]).reshape(4, 4), (q[1] / q[2]).reshape(4, 4)
        for u, v in ((0.5, 0.5), (0.2, 0.7), (1.0, 0.0)):
            X, Y = bake.document_points(data, H, np.array([u]), np.array([v]))
            ex, ey = bezier(px, py, u, v)
            self.assertAlmostEqual(X[0], ex, places=6)
            self.assertAlmostEqual(Y[0], ey, places=6)
        # The other order (evaluate, then project) lands elsewhere under a strong perspective.
        p = H @ np.array([150.0, 100.0, 1.0])
        X, Y = bake.document_points(data, H, np.array([0.5]), np.array([0.5]))
        self.assertGreater(np.hypot(X[0] - p[0] / p[2], Y[0] - p[1] / p[2]), 0.5)


class SlotEntry(unittest.TestCase):
    def test_baked_slot_names_its_maps(self):
        entry = bake.slot_entry("slot-1", "mug-logo", 1.0, "normal", 1.0, None)
        self.assertEqual((entry["uv"], entry["vv"]), ("uv-slot-1.png", "vv-slot-1.png"))
        self.assertNotIn("geometry", entry)

    def test_computed_slot_carries_its_geometry_and_no_maps(self):
        geometry = {"kind": "revolution", "arcDegrees": 240}
        entry = bake.slot_entry("slot-1", "mug-logo", 3.4, "multiply", 1.0, geometry)
        self.assertEqual(entry["geometry"], geometry)
        self.assertNotIn("uv", entry)
        self.assertNotIn("vv", entry)
        self.assertEqual(entry["blend"], "multiply")


if __name__ == "__main__":
    unittest.main()
