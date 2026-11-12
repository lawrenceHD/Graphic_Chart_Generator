import { describe, expect, it, vi } from 'vitest';
import { categoryOf, createPhotoService, primaryOf } from './photo-service';
import type { Photo } from './providers';

const photo = (id: string, extra: Partial<Photo> = {}): Photo => ({
  id,
  provider: 'pexels',
  thumbnail: `https://images.pexels.com/${id}`,
  image: `https://images.pexels.com/${id}`,
  width: 3,
  height: 4,
  color: '#D88F7A',
  alt: '',
  author: 'A',
  authorLink: 'https://www.pexels.com/@a',
  sourceLink: 'https://www.pexels.com/photo/a',
  downloadLocation: null,
  ...extra,
});
const input = {
  category: 'hospitality' as const,
  word: 'Ndolé',
  orientation: 'portrait' as const,
  primary: '#D88F7A',
};

describe('photo service', () => {
  it('says plainly when no key is set, so the studio offers the graphic composition', async () => {
    const service = createPhotoService({ providers: [], now: () => 0, reportDownload: vi.fn() });
    expect(await service.candidates(input)).toEqual({ ok: false, error: 'PHOTOS_NOT_CONFIGURED' });
  });

  it('asks every provider for the person’s word and the first subject, keeps six, caches an hour', async () => {
    const pexels = vi.fn(({ query }: { query: string }) =>
      Promise.resolve({ ok: true as const, value: [photo(`p-${query}-1`), photo(`p-${query}-2`)] }),
    );
    const unsplash = vi.fn(({ query }: { query: string }) =>
      Promise.resolve({
        ok: true as const,
        value: [photo(`u-${query}`, { provider: 'unsplash' })],
      }),
    );
    let clock = 0;
    const service = createPhotoService({
      providers: [pexels, unsplash],
      now: () => clock,
      reportDownload: vi.fn(),
    });
    const found = await service.candidates(input);
    expect(found.ok && found.value).toHaveLength(6);
    expect(pexels.mock.calls.map(([search]) => search.query)).toEqual([
      'Ndolé',
      'plated dish top view',
    ]);
    await service.candidates(input);
    expect(pexels).toHaveBeenCalledTimes(2);
    clock = 2 * 60 * 60 * 1000;
    await service.candidates(input);
    expect(pexels).toHaveBeenCalledTimes(4);
  });

  it('is unavailable only when every provider failed', async () => {
    const down = () =>
      Promise.resolve({ ok: false as const, error: 'PHOTOS_UNAVAILABLE' as const });
    const up = () => Promise.resolve({ ok: true as const, value: [photo('one')] });
    const failing = createPhotoService({
      providers: [down],
      now: () => 0,
      reportDownload: vi.fn(),
    });
    expect(await failing.candidates(input)).toEqual({ ok: false, error: 'PHOTOS_UNAVAILABLE' });
    const half = createPhotoService({
      providers: [down, up],
      now: () => 0,
      reportDownload: vi.fn(),
    });
    const found = await half.candidates(input);
    expect(found.ok && found.value.map((entry) => entry.id)).toEqual(['one']);
  });

  it('reports to Unsplash only a photo it returned itself, never a location sent by the client', async () => {
    const reportDownload = vi.fn(() => Promise.resolve());
    const unsplash = () =>
      Promise.resolve({
        ok: true as const,
        value: [
          photo('unsplash-Ab3', {
            provider: 'unsplash',
            downloadLocation: 'https://api.unsplash.com/photos/Ab3/download?ixid=x',
          }),
        ],
      });
    const service = createPhotoService({ providers: [unsplash], now: () => 0, reportDownload });
    expect(await service.chosen('unsplash-Ab3')).toBe(false);
    await service.candidates(input);
    expect(await service.chosen('unsplash-Ab3')).toBe(true);
    expect(reportDownload).toHaveBeenCalledWith(
      'https://api.unsplash.com/photos/Ab3/download?ixid=x',
    );
    expect(await service.chosen('https://evil.example/')).toBe(false);
  });
});

describe('what the project tells', () => {
  it('reads the primary of the document and the scene category, with neutral fallbacks', () => {
    expect(primaryOf({ tokens: { colors: { primary: { hex: '#D88F7A' } } } })).toBe('#D88F7A');
    expect(primaryOf(null)).toBe('#8A8178');
    expect(categoryOf('hospitality')).toBe('hospitality');
    expect(categoryOf('moon')).toBe('generic');
  });
});
