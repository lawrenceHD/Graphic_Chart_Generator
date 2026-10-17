import { describe, expect, it } from 'vitest';
import { problem } from './error.js';

describe('problem', () => {
  it('creates an RFC 9457 problem with a stable code extension', () => {
    expect(problem('ASSET_SVG_UNSUPPORTED_FEATURE', 422, 'Unsupported SVG feature')).toEqual({
      type: '/errors/asset-svg-unsupported-feature',
      title: 'Asset Svg Unsupported Feature',
      status: 422,
      code: 'ASSET_SVG_UNSUPPORTED_FEATURE',
      detail: 'Unsupported SVG feature',
    });
  });

  it('adds a hint only when one is provided', () => {
    expect(problem('ASSET_INVALID', 415, 'Unsupported asset', 'Export a PNG or SVG.')).toEqual({
      type: '/errors/asset-invalid',
      title: 'Asset Invalid',
      status: 415,
      code: 'ASSET_INVALID',
      detail: 'Unsupported asset',
      hint: 'Export a PNG or SVG.',
    });
  });
});
