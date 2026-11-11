import { describe, expect, it } from 'vitest';
import {
  ellipseFrom3,
  ellipsePoint,
  logoAngle,
  revolutionFrame,
  revolutionPoint,
  type RevolutionGeometry,
  type Vec2,
} from './revolution.js';

// ADR-034, research note §5.1–§5.4.

const cylinder = (patch: Partial<RevolutionGeometry> = {}): RevolutionGeometry => ({
  kind: 'revolution',
  top: { left: [100, 100], right: [500, 100], front: [300, 140] },
  bottom: { left: [100, 500], right: [500, 500], front: [300, 540] },
  band: { from: 0, to: 1 },
  arcDegrees: 90,
  centreDegrees: 0,
  ...patch,
});

const near = (actual: Vec2, expected: Vec2, tolerance: number) => {
  expect(Math.hypot(actual[0] - expected[0], actual[1] - expected[1])).toBeLessThanOrEqual(
    tolerance,
  );
};

describe('ellipseFrom3', () => {
  it('reads the centre, the half-axes and the side the front arc is on', () => {
    const e = ellipseFrom3({ left: [100, 100], right: [500, 100], front: [300, 140] });
    expect(e.ok).toBe(true);
    if (!e.ok) return;
    expect(e.value.centre).toEqual([300, 100]);
    expect(e.value.a).toBe(200);
    expect(e.value.b).toBe(40);
    near(ellipsePoint(e.value, 0), [300, 140], 1e-9);
    near(ellipsePoint(e.value, Math.PI / 2), [500, 100], 1e-9);
    near(ellipsePoint(e.value, -Math.PI / 2), [100, 100], 1e-9);
  });

  it('gives a flat ellipse for a circle seen edge-on, and a negative b seen from below', () => {
    const flat = ellipseFrom3({ left: [0, 50], right: [100, 50], front: [50, 50] });
    expect(flat.ok && flat.value.b).toBe(0);
    const below = ellipseFrom3({ left: [0, 50], right: [100, 50], front: [50, 40] });
    expect(below.ok && below.value.b).toBe(-10);
  });

  it('refuses a front point more than a tenth of the half-axis off the axis', () => {
    expect(ellipseFrom3({ left: [0, 50], right: [100, 50], front: [56, 60] }).ok).toBe(false);
    expect(ellipseFrom3({ left: [0, 50], right: [100, 50], front: [54, 60] }).ok).toBe(true);
    expect(ellipseFrom3({ left: [0, 50], right: [0, 50], front: [0, 60] }).ok).toBe(false);
  });
});

describe('revolutionFrame', () => {
  it('has no vanishing point when the silhouettes are parallel', () => {
    const frame = revolutionFrame(cylinder());
    expect(frame.ok && frame.value.vanishing).toBeNull();
  });

  it('finds the apex of a cone where the silhouettes meet', () => {
    const frame = revolutionFrame(
      cylinder({
        bottom: { left: [150, 500], right: [450, 500], front: [300, 545] },
        radiusRatio: 1.33,
      }),
    );
    expect(frame.ok).toBe(true);
    if (!frame.ok || frame.value.vanishing === null) throw new Error('no apex');
    near(frame.value.vanishing, [300, 1700], 1e-6);
  });

  it('derives the true height from the tilt and the logo box aspect from the arc', () => {
    const frame = revolutionFrame(cylinder());
    expect(frame.ok).toBe(true);
    if (!frame.ok) return;
    // Tilt b/a = 0.2 on both ellipses (no perspective read), axis 400 px: H = 400 / sqrt(1 - 0.04).
    expect(frame.value.focal).toBeNull();
    const height = 400 / Math.sqrt(1 - 0.04);
    expect(frame.value.height).toBeCloseTo(height, 6);
    expect(frame.value.aspect).toBeCloseTo((200 * (Math.PI / 2)) / height, 6);
  });

  it('refuses an invalid ellipse with its name', () => {
    const frame = revolutionFrame(
      cylinder({ top: { left: [100, 100], right: [500, 100], front: [400, 140] } }),
    );
    expect(frame.ok).toBe(false);
    if (frame.ok) return;
    expect(frame.error.reason).toMatch(/^top: /);
  });
});

describe('revolutionPoint', () => {
  const frame = revolutionFrame(cylinder());
  if (!frame.ok) throw new Error('frame');

  it('falls on the front arc at θ = 0 and on the ellipses at s = 0 and s = 1', () => {
    const front = revolutionPoint(frame.value, 0, 0);
    near([front.x, front.y], [300, 140], 1e-9);
    expect(front.facing).toBe(1);
    for (const theta of [-1.2, -0.4, 0.3, 1.1]) {
      const top = revolutionPoint(frame.value, theta, 0);
      near([top.x, top.y], ellipsePoint(frame.value.top, theta), 1e-9);
      const bottom = revolutionPoint(frame.value, theta, 1);
      near([bottom.x, bottom.y], ellipsePoint(frame.value.bottom, theta), 1e-9);
    }
  });

  it('is on the silhouette with no facing at ±90°, and hidden beyond', () => {
    const side = revolutionPoint(frame.value, Math.PI / 2, 0.5);
    near([side.x, side.y], [500, 300], 1e-9);
    expect(side.facing).toBeCloseTo(0, 12);
    expect(revolutionPoint(frame.value, 2, 0.5).facing).toBeLessThan(0);
  });

  it('squeezes the logo towards the edges: the density at θ is cos θ', () => {
    const step = 1e-5;
    const density = (theta: number) =>
      (revolutionPoint(frame.value, theta + step, 0.5).x -
        revolutionPoint(frame.value, theta - step, 0.5).x) /
      (2 * step);
    const centre = density(0);
    for (const theta of [0.3, 0.6, 1.0, 1.4]) {
      expect(density(theta) / centre).toBeCloseTo(Math.cos(theta), 6);
    }
  });

  it('maps the logo box onto the arc around its centre angle', () => {
    const shifted = revolutionFrame(cylinder({ centreDegrees: 30, band: { from: 0.2, to: 0.8 } }));
    if (!shifted.ok) throw new Error('frame');
    const [theta0, s0] = logoAngle(shifted.value, 0, 0);
    const [theta1, s1] = logoAngle(shifted.value, 1, 1);
    expect((theta0 * 180) / Math.PI).toBeCloseTo(-15, 9);
    expect((theta1 * 180) / Math.PI).toBeCloseTo(75, 9);
    expect(s0).toBeCloseTo(0.2, 12);
    expect(s1).toBeCloseTo(0.8, 12);
  });

  it('follows a profile: straight it is the cylinder, bulging it widens the middle', () => {
    const straight = revolutionFrame(
      cylinder({
        profile: [
          [100, 100],
          [100, 500],
        ],
      }),
    );
    const bulging = revolutionFrame(
      cylinder({
        profile: [
          [100, 100],
          [60, 300],
          [100, 500],
        ],
      }),
    );
    if (!straight.ok || !bulging.ok) throw new Error('frame');
    for (const [theta, s] of [
      [0.5, 0.3],
      [-1, 0.6],
      [1.3, 0.9],
    ] as const) {
      const a = revolutionPoint(straight.value, theta, s);
      const b = revolutionPoint(frame.value, theta, s);
      near([a.x, a.y], [b.x, b.y], 1);
    }
    const wide = revolutionPoint(bulging.value, Math.PI / 2, 0.5);
    expect(wide.x).toBeGreaterThan(530);
  });
});

// A real cylinder photographed by a pinhole camera: the three-point ellipses are an approximation (the
// centre of an ellipse is not the image of the circle's centre). The error is measured here.
describe('accuracy against an exact perspective projection', () => {
  const focal = 1800;
  const radius = 0.4;
  const distance = 2.6;
  const tilt = (14 * Math.PI) / 180;
  const project = (theta: number, height: number): [number, number] => {
    const x = radius * Math.sin(theta);
    const y = height;
    const z = -radius * Math.cos(theta);
    // Camera above, looking down by `tilt`: rotate about the x axis, then push away.
    const yr = y * Math.cos(tilt) - z * Math.sin(tilt);
    const zr = y * Math.sin(tilt) + z * Math.cos(tilt) + distance;
    return [1200 + (focal * x) / zr, 800 + (focal * yr) / zr];
  };
  const extremes = (height: number) => {
    let left = project(0, height);
    let right = left;
    let front = left;
    for (let index = 0; index < 7200; index += 1) {
      const p = project((index / 7200) * 2 * Math.PI, height);
      if (p[0] < left[0]) left = p;
      if (p[0] > right[0]) right = p;
      if (p[1] > front[1]) front = p;
    }
    return { left, right, front };
  };
  const top = extremes(-0.45);
  const bottom = extremes(0.45);
  const frame = revolutionFrame(cylinder({ top, bottom }));

  it('stays within 1 % of the apparent radius over the visible face', () => {
    if (!frame.ok) throw new Error(frame.error.reason);
    let worst = 0;
    for (let ti = -8; ti <= 8; ti += 1) {
      for (let si = 0; si <= 4; si += 1) {
        const theta = (ti / 8) * (80 * (Math.PI / 180));
        const s = si / 4;
        const ours = revolutionPoint(frame.value, theta, s);
        const truth = project(theta, lerpHeight(s));
        worst = Math.max(worst, Math.hypot(ours.x - truth[0], ours.y - truth[1]));
      }
    }
    expect(worst / frame.value.top.a).toBeLessThan(0.01);
  });

  it('reads the focal length from the two ellipses, within 5 %', () => {
    if (!frame.ok || frame.value.focal === null) throw new Error('no focal');
    expect(Math.abs(frame.value.focal / focal - 1)).toBeLessThan(0.05);
  });

  it('puts the silhouette, with no facing, a little in front of ±90°', () => {
    if (!frame.ok) throw new Error('frame');
    const kappa = frame.value.top.kappa;
    expect(kappa).toBeGreaterThan(0.1);
    const side = revolutionPoint(frame.value, Math.acos(kappa), 0);
    near([side.x, side.y], top.right, 1e-6);
    expect(side.facing).toBeCloseTo(0, 9);
    expect(revolutionPoint(frame.value, Math.PI / 2, 0).facing).toBeLessThan(0);
  });

  function lerpHeight(s: number): number {
    return -0.45 + 0.9 * s;
  }
});
