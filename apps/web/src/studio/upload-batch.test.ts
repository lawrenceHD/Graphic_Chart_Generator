import type { AssetVerdict } from './timeline';
import { describe, expect, it } from 'vitest';
import { addLogo, EMPTY_INPUTS, setDocument } from './brand-inputs-model';
import { settleBatch, uploadBatch, type BatchUpload } from './upload-batch';

const file = (name: string): File => new File([new Uint8Array([1])], name);
const inputs = (() => {
  let state = addLogo(EMPTY_INPUTS, file('logo.svg'), () => 'a').state;
  state = addLogo(state, file('logo-noir.svg'), () => 'b').state;
  return setDocument(state, file('manifeste.md'));
})();

const asset = (id: string, status: string, rejectReason: string | null = null) => ({
  id,
  status,
  rejectReason,
});

/** Fetch double answering declare, PUT and complete for each file in order, asset ids a1, a2, a3. */
function server(outcomes: readonly ('ok' | 'rejected' | 'http-error')[]) {
  const calls: string[] = [];
  let index = 0;
  let current = 0;
  const fetcher = (url: string, init?: RequestInit): Promise<Response> => {
    calls.push(`${init?.method ?? 'GET'} ${url}`);
    if (url.endsWith('/uploads')) {
      current = index;
      index += 1;
      if (outcomes[current] === 'http-error')
        return Promise.resolve(Response.json({ code: 'ASSET_LIMIT_REACHED' }, { status: 409 }));
      return Promise.resolve(
        Response.json(
          {
            asset: asset(`0190a0b0-0000-7000-8000-00000000000${String(current + 1)}`, 'pending'),
            upload: { url: 'https://r2.example/put', method: 'PUT', headers: {} },
          },
          { status: 201 },
        ),
      );
    }
    if (init?.method === 'PUT') return Promise.resolve(new Response(null, { status: 200 }));
    const rejected = outcomes[current] === 'rejected';
    return Promise.resolve(
      Response.json({
        asset: asset(
          `0190a0b0-0000-7000-8000-00000000000${String(current + 1)}`,
          rejected ? 'rejected' : 'quarantined',
          rejected ? 'ASSET_SVG_TOO_COMPLEX' : null,
        ),
      }),
    );
  };
  return { calls, fetcher };
}
const P = '0190a0b0-0000-7000-8000-00000000000a';
const ID = (n: number) => `0190a0b0-0000-7000-8000-00000000000${String(n)}`;

describe('uploadBatch (logos, primary first, then the document)', () => {
  it('declares each file with its role and returns the accepted assets in order', async () => {
    const { fetcher, calls } = server(['ok', 'ok', 'ok']);
    const into: BatchUpload = { accepted: [], refused: [] };
    await uploadBatch(fetcher, P, inputs, new Set(), () => undefined, into);
    expect(into.accepted).toEqual([
      { assetId: ID(1), name: 'logo.svg', document: false, clean: false },
      { assetId: ID(2), name: 'logo-noir.svg', document: false, clean: false },
      { assetId: ID(3), name: 'manifeste.md', document: true, clean: false },
    ]);
    expect(calls.filter((call) => call.endsWith('/uploads'))).toHaveLength(3);
  });

  it('reports a file refused at completion and goes on with the others', async () => {
    const { fetcher } = server(['ok', 'rejected', 'ok']);
    const into: BatchUpload = { accepted: [], refused: [] };
    await uploadBatch(fetcher, P, inputs, new Set(), () => undefined, into);
    expect(into.refused).toEqual([{ name: 'logo-noir.svg', code: 'ASSET_SVG_TOO_COMPLEX' }]);
    expect(into.accepted).toHaveLength(2);
  });

  it('never fails the whole batch for a document refused by the API, but does for a logo', async () => {
    const docSink: BatchUpload = { accepted: [], refused: [] };
    const doc = await uploadBatch(
      server(['ok', 'ok', 'http-error']).fetcher,
      P,
      inputs,
      new Set(),
      () => undefined,
      docSink,
    );
    expect(doc.ok).toBe(true);
    expect(docSink.refused).toEqual([{ name: 'manifeste.md', code: 'ASSET_DECODE_FAILED' }]);
    const logoSink: BatchUpload = { accepted: [], refused: [] };
    const logo = await uploadBatch(
      server(['http-error']).fetcher,
      P,
      inputs,
      new Set(),
      () => undefined,
      logoSink,
    );
    expect(logo).toMatchObject({ ok: false, error: { kind: 'http', code: 'ASSET_LIMIT_REACHED' } });
  });

  it('skips files an earlier try already sent', async () => {
    const { fetcher, calls } = server(['ok']);
    const skip = new Set(inputs.logos.map((logo) => logo.file));
    const doc = inputs.document;
    if (doc !== null) skip.add(doc);
    skip.delete(inputs.logos[1]?.file ?? doc ?? file('x'));
    await uploadBatch(fetcher, P, inputs, skip, () => undefined, { accepted: [], refused: [] });
    expect(calls.filter((call) => call.endsWith('/uploads'))).toHaveLength(1);
  });
});

describe('settleBatch (every verdict known before acting)', () => {
  const accepted = [
    { assetId: 'a', name: 'logo.svg', document: false, clean: false },
    { assetId: 'b', name: 'manifeste.md', document: true, clean: false },
  ];
  const verdicts = (entries: [string, AssetVerdict][]) => new Map(entries);

  it('waits while a verdict is missing', () => {
    expect(settleBatch(accepted, verdicts([['a', { status: 'clean' }]]), [], 0)).toBeNull();
  });
  it('counts clean logos and lists rejected files', () => {
    const out = settleBatch(
      accepted,
      verdicts([
        ['a', { status: 'clean' }],
        ['b', { status: 'rejected', code: 'ASSET_DOCUMENT_EMPTY' }],
      ]),
      [{ name: 'x.png', code: 'ASSET_DECODE_FAILED' }],
      0,
    );
    expect(out).toEqual({
      cleanLogos: 1,
      refused: [
        { name: 'x.png', code: 'ASSET_DECODE_FAILED' },
        { name: 'manifeste.md', code: 'ASSET_DOCUMENT_EMPTY' },
      ],
    });
  });
  it('keeps the logos already clean from an earlier try', () => {
    const out = settleBatch(
      [{ assetId: 'c', name: 'icon.svg', document: false, clean: true }],
      verdicts([]),
      [],
      2,
    );
    expect(out?.cleanLogos).toBe(3);
  });
});
