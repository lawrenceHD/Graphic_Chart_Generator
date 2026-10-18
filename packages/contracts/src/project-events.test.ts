import { describe, expect, it } from 'vitest';
import { parseProjectEvent } from './project-events.js';

const ASSET = '0192f3a0-0000-7000-8000-000000000001';

describe('parseProjectEvent (04_API_CONTRACTS.md §5)', () => {
  it('accepts the four contract events', () => {
    expect(
      parseProjectEvent('asset.status', {
        assetId: ASSET,
        status: 'rejected',
        rejectReason: 'ASSET_TOO_LARGE',
      }),
    ).toEqual({
      type: 'asset.status',
      data: { assetId: ASSET, status: 'rejected', rejectReason: 'ASSET_TOO_LARGE' },
    });
    expect(
      parseProjectEvent('analysis.step', { step: 2, state: 'failed', code: 'EMPTY_IMAGE' }),
    ).not.toBeNull();
    expect(parseProjectEvent('analysis.done', { seq: 3 })).not.toBeNull();
    expect(parseProjectEvent('export.status', { exportId: ASSET, status: 'done' })).not.toBeNull();
  });

  it('refuses unknown types, extra fields and data of another event', () => {
    expect(parseProjectEvent('asset.deleted', { assetId: ASSET })).toBeNull();
    expect(parseProjectEvent('analysis.done', { seq: 3, extra: true })).toBeNull();
    expect(parseProjectEvent('analysis.step', { seq: 3 })).toBeNull();
    expect(parseProjectEvent('analysis.step', { step: 5, state: 'done' })).toBeNull();
    expect(
      parseProjectEvent('analysis.step', { step: 1, state: 'failed', code: 'free text' }),
    ).toBeNull();
    expect(
      parseProjectEvent('asset.status', { assetId: ASSET, status: 'clean', rejectReason: 'NOPE' }),
    ).toBeNull();
  });
});
