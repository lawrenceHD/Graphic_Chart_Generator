import { createHash, randomBytes } from 'node:crypto';
import type { ObjectStorage } from '@app/contracts';
import { assets, eq, guestSessions, projects } from '@app/db';
import { createTestDatabase, integrationDatabaseUrl, type TestDatabase } from '@app/db/testing';
import { err, ok, uuidV7 } from '@app/kernel';
import { sanitizeSvg } from '@app/svg-engine';
import { createNodeRasterizer, normalizeRaster } from '@app/svg-engine/raster';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { rejectTimedOut, scanAsset } from './scan.js';

const adminUrl = integrationDatabaseUrl();
const id = (): string => uuidV7(Date.now(), randomBytes(10));
const encode = (text: string): Uint8Array => new TextEncoder().encode(text);
const sha256 = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');
const TRIANGLE =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M10 10 L90 10 L50 90 Z" fill="#1F4BFF"/></svg>';

/** In-memory stand-in for R2 honouring the port's size limit; the scan logic itself stays real. */
function memoryStorage(objects: Map<string, Uint8Array>): ObjectStorage {
  return {
    presignPut: () => Promise.reject(new Error('not used by the worker')),
    presignGet: () => Promise.reject(new Error('not used by the worker')),
    head: (key) => {
      const bytes = objects.get(key);
      return Promise.resolve(bytes === undefined ? null : { bytes: bytes.length });
    },
    get: (key, maxBytes) => {
      const bytes = objects.get(key);
      if (bytes === undefined) return Promise.resolve(err('NOT_FOUND'));
      return Promise.resolve(bytes.length > maxBytes ? err('TOO_LARGE') : ok(bytes));
    },
    put: (key, bytes) => {
      objects.set(key, bytes);
      return Promise.resolve();
    },
    delete: (key) => {
      objects.delete(key);
      return Promise.resolve();
    },
  };
}

describe.runIf(adminUrl !== '')('asset.scan (02_ARCHITECTURE.md §5.1, SEC-11 to SEC-15)', () => {
  let test: TestDatabase;
  let projectId = '';
  const objects = new Map<string, Uint8Array>();
  const rasterizer = createNodeRasterizer();
  const scan = (assetId: string) =>
    scanAsset(
      { orm: test.database.orm, storage: memoryStorage(objects), rasterizer, normalizeRaster },
      assetId,
    );

  beforeAll(async () => {
    test = await createTestDatabase(adminUrl);
    const guestId = id();
    await test.database.orm
      .insert(guestSessions)
      .values({ id: guestId, tokenHash: guestId, expiresAt: new Date() });
    projectId = id();
    await test.database.orm
      .insert(projects)
      .values({ id: projectId, guestSessionId: guestId, title: 'Logo' });
  });
  afterAll(async () => {
    await test.dispose();
  });

  async function upload(bytes: Uint8Array, status: 'quarantined' | 'pending' = 'quarantined') {
    const assetId = id();
    const storageKey = `projects/${projectId}/assets/${assetId}/original`;
    objects.set(storageKey, bytes);
    await test.database.orm.insert(assets).values({
      id: assetId,
      projectId,
      kind: 'logo_original',
      status,
      storageKey,
      bytes: bytes.length,
    });
    return assetId;
  }
  const rowsOf = (assetId: string) =>
    test.database.orm.select().from(assets).where(eq(assets.id, assetId));
  const derivedOf = async (assetId: string) =>
    (await test.database.orm.select().from(assets).where(eq(assets.kind, 'logo_sanitized'))).filter(
      (row) => Reflect.get(Object(row.meta), 'sourceAssetId') === assetId,
    );

  it('cleans an SVG: sanitized copy stored and recorded, original marked clean but kept private', async () => {
    // Editor leftovers the allowlist drops: the stored copy must differ from the upload.
    const original = encode(
      TRIANGLE.replace('<path', '<!-- editor --><metadata>x</metadata><path'),
    );
    const assetId = await upload(original);
    await scan(assetId);
    const [row] = await rowsOf(assetId);
    expect(row).toMatchObject({ status: 'clean', mime: 'image/svg+xml', sha256: sha256(original) });
    const derived = await derivedOf(assetId);
    expect(derived).toHaveLength(1);
    const expected = sanitizeSvg(original);
    const svg = expected.ok ? encode(expected.value.svg) : new Uint8Array(0);
    expect(derived[0]).toMatchObject({
      status: 'clean',
      mime: 'image/svg+xml',
      bytes: svg.length,
      sha256: sha256(svg),
      storageKey: `projects/${projectId}/assets/${assetId}/sanitized`,
    });
    expect(objects.get(derived[0]?.storageKey ?? '')).toEqual(svg);
    expect(svg).not.toEqual(original);
    expect(row?.meta).toEqual({ sanitizedAssetId: derived[0]?.id });
  });

  it('is idempotent: a second run changes nothing, and only quarantined assets are scanned', async () => {
    const assetId = await upload(encode(TRIANGLE));
    await scan(assetId);
    await scan(assetId);
    expect(await derivedOf(assetId)).toHaveLength(1);
    const pending = await upload(encode(TRIANGLE), 'pending');
    await scan(pending);
    expect((await rowsOf(pending))[0]?.status).toBe('pending');
    await expect(scan(id())).resolves.toBeUndefined();
  });

  it('rejects hostile, unknown, oversized or vanished files with a stable code and no derived copy', async () => {
    const cases: [Uint8Array | null, string][] = [
      [
        encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'),
        'ASSET_SVG_FORBIDDEN_CONTENT',
      ],
      [encode('GIF89a not supported'), 'ASSET_TYPE_UNSUPPORTED'],
      [
        encode(
          `<svg xmlns="http://www.w3.org/2000/svg"><!--${' '.repeat(5 * 1024 * 1024)}--></svg>`,
        ),
        'ASSET_TOO_LARGE',
      ],
      [null, 'ASSET_DECODE_FAILED'],
    ];
    for (const [bytes, code] of cases) {
      const assetId = await upload(bytes ?? encode(TRIANGLE));
      if (bytes === null) objects.delete(`projects/${projectId}/assets/${assetId}/original`);
      await scan(assetId);
      expect((await rowsOf(assetId))[0]).toMatchObject({ status: 'rejected', rejectReason: code });
      expect(await derivedOf(assetId)).toHaveLength(0);
    }
  });

  it('rejects as timed out a quarantined asset whose every scan attempt failed, and nothing else', async () => {
    const stuck = await upload(encode(TRIANGLE));
    await rejectTimedOut(test.database.orm, stuck);
    expect((await rowsOf(stuck))[0]).toMatchObject({
      status: 'rejected',
      rejectReason: 'ASSET_SCAN_TIMEOUT',
    });
    // A late dead letter must not overwrite a verdict already reached.
    const done = await upload(encode(TRIANGLE));
    await scan(done);
    await rejectTimedOut(test.database.orm, done);
    expect((await rowsOf(done))[0]).toMatchObject({ status: 'clean', rejectReason: null });
    await expect(rejectTimedOut(test.database.orm, id())).resolves.toBeUndefined();
  });

  it('normalizes a raster to a PNG with its dimensions', async () => {
    const rendered = await rasterizer.rasterize(TRIANGLE, 64);
    const png = rendered.ok ? rendered.value.png : new Uint8Array(0);
    const assetId = await upload(png);
    await scan(assetId);
    expect((await rowsOf(assetId))[0]).toMatchObject({
      status: 'clean',
      mime: 'image/png',
      width: 64,
      height: 64,
    });
    const [derived] = await derivedOf(assetId);
    expect(derived).toMatchObject({ mime: 'image/png', width: 64, height: 64, status: 'clean' });
  });
});
