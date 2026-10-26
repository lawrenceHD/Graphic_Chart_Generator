import { describe, expect, it } from 'vitest';
import { parseScene } from './scene.js';

const scene = (quad: readonly (readonly [number, number])[]) => ({
  id: 'poster-01',
  schemaVersion: 1,
  category: 'signage',
  size: { width: 3840, height: 2160 },
  surfaces: [
    {
      id: 'front',
      quad,
      logoBox: { aspect: 0.7, fit: 'contain', paddingRatio: 0.2 },
      baseTint: [1, 1, 1],
      light: { direction: [0, 0, 1] },
      finishes: ['flat', 'emboss'],
    },
  ],
});

describe('parseScene — validation at load time (06_MOCKUP_ENGINE §3, §5)', () => {
  it('returns the scene with a homography per surface', () => {
    const result = parseScene(
      scene([
        [100, 50],
        [420, 80],
        [400, 300],
        [120, 260],
      ]),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.scene.id).toBe('poster-01');
    expect(result.value.homographies.get('front')?.[2]).toBe(100);
  });

  it('refuses malformed JSON shapes with SCENE_INVALID and the Zod paths', () => {
    const result = parseScene({ id: 'x' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('SCENE_INVALID');
    expect(result.error.issues).toContain('schemaVersion');
  });

  it('refuses a well-formed scene whose quad is not a convex, unmirrored quad', () => {
    const result = parseScene(
      scene([
        [100, 50],
        [120, 260],
        [400, 300],
        [420, 80],
      ]),
    );
    expect(result).toEqual({
      ok: false,
      error: { code: 'SCENE_INVALID', issues: ['surfaces.0.quad: mirrored'] },
    });
  });
});
