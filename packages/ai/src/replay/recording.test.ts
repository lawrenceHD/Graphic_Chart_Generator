import { describe, expect, it } from 'vitest';
import { loadFontCatalogue } from '../fonts/catalogue.js';
import type { GeminiTransport } from '../gemini/transport.js';
import { direction as axis, reference } from '../references/fixtures.js';
import { researchBrand } from '../research.js';
import {
  createRecording,
  fingerprintLogo,
  findRecording,
  parseRecording,
  serializeRecording,
} from './recording.js';

const image = { data: new Uint8Array([1, 2, 3]), mimeType: 'image/png' as const };
const other = { data: new Uint8Array([9, 9, 9]), mimeType: 'image/png' as const };
const reading = {
  sector: 'restaurant',
  industryLabel: 'Restaurant',
  styles: ['warm'],
  letteringType: 'serif-oldstyle',
  typefaceGuess: null,
  searchKeywords: ['fine dining'],
};
const transport: GeminiTransport = (_model, method) =>
  Promise.resolve(
    method === 'embedContent'
      ? { ok: true, value: { embedding: { values: axis(0) } } }
      : {
          ok: true,
          value: { candidates: [{ content: { parts: [{ text: JSON.stringify(reading) }] } }] },
        },
  );

async function liveResearch() {
  const result = await researchBrand(
    {
      transport,
      visionModel: 'gemini-test',
      library: [reference('menu-1', 'restaurant', axis(0), { sections: ['menu'] })],
      catalogue: loadFontCatalogue(),
    },
    { logo: image, palette: ['#7A1F2B'] },
  );
  if (!result.ok) throw new Error('research failed');
  return result.value;
}

describe('research recording', () => {
  it('round-trips a real research through JSON validated by Zod', async () => {
    const recording = createRecording(await liveResearch(), image, '2026-11-07T10:00:00.000Z');
    const parsed = parseRecording(serializeRecording(recording));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.value).toEqual(recording);
  });

  it('rejects corrupt or tampered recordings instead of replaying them', async () => {
    const recording = createRecording(await liveResearch(), image, '2026-11-07T10:00:00.000Z');
    expect(parseRecording('not json').ok).toBe(false);
    expect(parseRecording(JSON.stringify({ ...recording, version: 2 })).ok).toBe(false);
    const bad = { ...recording, research: { ...recording.research, deepQueries: 'x' } };
    expect(parseRecording(JSON.stringify(bad)).ok).toBe(false);
    const text = serializeRecording(recording);
    const tampered = text.replace('"section": "cover"', '"section": "drop-table"');
    expect(tampered).not.toBe(text);
    expect(parseRecording(tampered).ok).toBe(false);
  });

  it('matches a recording by logo fingerprint, with a wildcard recording as fallback', async () => {
    const research = await liveResearch();
    const exact = createRecording(research, image, '2026-11-07T10:00:00.000Z');
    const wildcard = { ...createRecording(research, other, '2026-11-07T10:00:00.000Z'), key: '*' };
    expect(fingerprintLogo(image)).not.toBe(fingerprintLogo(other));
    expect(findRecording([exact], image)).toBe(exact);
    expect(findRecording([exact], other)).toBeUndefined();
    expect(findRecording([exact, wildcard], other)).toBe(wildcard);
  });

  it('writes keys its own parser accepts, whatever the declared mime type', async () => {
    const research = await liveResearch();
    for (const mimeType of ['image/svg+xml', 'image/x-icon', 'application/octet-stream', '']) {
      const recording = createRecording(
        research,
        { data: image.data, mimeType },
        '2026-11-07T10:00:00.000Z',
      );
      const parsed = parseRecording(serializeRecording(recording));
      expect(parsed.ok, mimeType).toBe(true);
      if (parsed.ok)
        expect(findRecording([parsed.value], { data: image.data, mimeType })).toBeDefined();
    }
  });
});
