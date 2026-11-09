import { IndexedReferenceSchema } from '@app/contracts';
import { describe, expect, it } from 'vitest';
import { direction, reference } from './fixtures.js';
import {
  createPacer,
  MAX_ON_DEMAND_REFERENCES,
  extractPreviewImage,
  onDemandQueries,
  parseSourceLink,
  referenceFileName,
} from './on-demand.js';

describe('parseSourceLink', () => {
  it('accepts a Pinterest pin page and reads its id', () => {
    expect(parseSourceLink('https://www.pinterest.com/pin/1077415910884278124/')).toEqual({
      ok: true,
      value: {
        kind: 'pin',
        id: '1077415910884278124',
        url: 'https://www.pinterest.com/pin/1077415910884278124/',
      },
    });
    const regional = parseSourceLink('https://fr.pinterest.com/pin/123456/?utm_source=x#top');
    expect(regional.ok && regional.value).toEqual({
      kind: 'pin',
      id: '123456',
      url: 'https://fr.pinterest.com/pin/123456/',
    });
  });

  it('accepts a direct image of the Pinterest or Behance image hosts', () => {
    const pin = parseSourceLink('https://i.pinimg.com/736x/ab/cd/ef/abcdef0123.jpg');
    expect(pin.ok && pin.value.kind).toBe('image');
    const behance = parseSourceLink('https://mir-s3-cdn-cf.behance.net/projects/404/x.png');
    expect(behance.ok && behance.value.kind).toBe('image');
  });

  it('refuses plain http, other hosts and look-alike hosts', () => {
    const code = (raw: string): string | undefined => {
      const result = parseSourceLink(raw);
      return result.ok ? undefined : result.error;
    };
    expect(code('http://www.pinterest.com/pin/1/')).toBe('not-https');
    expect(code('https://evil.example/pin/1/')).toBe('host-not-allowed');
    expect(code('https://pinterest.com.evil.example/pin/1/')).toBe('host-not-allowed');
    expect(code('https://user:pw@www.pinterest.com/pin/1/')).toBe('invalid-url');
    expect(code('https://www.pinterest.com/search/pins/?q=logo')).toBe('unsupported-page');
    expect(code('not a url')).toBe('invalid-url');
  });
});

describe('extractPreviewImage', () => {
  it('reads the public preview image of a page whatever the attribute order', () => {
    const a = '<meta property="og:image" content="https://i.pinimg.com/736x/aa/bb.jpg">';
    const b = '<meta content="https://i.pinimg.com/736x/cc/dd.jpg" property="og:image" />';
    expect(extractPreviewImage(a)).toBe('https://i.pinimg.com/736x/aa/bb.jpg');
    expect(extractPreviewImage(b)).toBe('https://i.pinimg.com/736x/cc/dd.jpg');
  });

  it('ignores a preview image hosted anywhere else', () => {
    const html = '<meta property="og:image" content="https://tracker.example/x.jpg">';
    expect(extractPreviewImage(html)).toBeUndefined();
    expect(extractPreviewImage('<html></html>')).toBeUndefined();
  });
});

describe('referenceFileName', () => {
  it('makes a name the library index accepts, without any trace of the source file name', () => {
    const name = referenceFileName('cafe-bakery', { kind: 'pin', id: '123', url: 'https://x' });
    expect(name).toBe('cafe-bakery/pin-123.jpg');
    const line = IndexedReferenceSchema.safeParse({
      ...reference('pin-123', 'cafe-bakery', direction(0)),
      file: name,
    });
    expect(line.success).toBe(true);
  });
});

describe('onDemandQueries', () => {
  it('asks for the objects of the mockup scene the task needs', () => {
    expect(
      onDemandQueries({
        task: 'mockups',
        sector: 'cafe-bakery',
        styles: ['handcrafted'],
        subjects: ['paper bag', 'coffee cup'],
      }),
    ).toEqual([
      'paper bag mockup handcrafted cafe bakery',
      'coffee cup mockup handcrafted cafe bakery',
    ]);
  });

  it('asks for guideline pages of the sector for a charter task', () => {
    expect(
      onDemandQueries({ task: 'charter', sector: 'finance', styles: ['corporate', 'minimal'] }),
    ).toEqual(['finance brand guidelines corporate', 'finance brand identity guidelines minimal']);
  });

  it('never returns more than the on-demand cap of queries', () => {
    const subjects = Array.from({ length: 30 }, (_, index) => `object ${String(index)}`);
    const queries = onDemandQueries({ task: 'mockups', sector: 'other', styles: [], subjects });
    expect(queries.length).toBeLessThanOrEqual(MAX_ON_DEMAND_REFERENCES);
    expect(new Set(queries).size).toBe(queries.length);
  });
});

describe('createPacer', () => {
  it('spaces the calls by the minimum interval, with an injected clock', async () => {
    let now = 0;
    const slept: number[] = [];
    const pacer = createPacer({
      minIntervalMs: 2000,
      now: () => now,
      sleep: (ms) => {
        slept.push(ms);
        now += ms;
        return Promise.resolve();
      },
    });
    await pacer.wait();
    await pacer.wait();
    now += 500;
    await pacer.wait();
    expect(slept).toEqual([2000, 1500]);
  });
});
