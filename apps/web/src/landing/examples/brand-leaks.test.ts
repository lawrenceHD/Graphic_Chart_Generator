import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { findBrandLeaks } from './check-brand-names';

const roots: string[] = [];
function scratch(files: Readonly<Record<string, string>>): string {
  const root = mkdtempSync(join(tmpdir(), 'brand-leaks-'));
  roots.push(root);
  for (const [path, text] of Object.entries(files)) {
    const full = join(root, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, text);
  }
  return root;
}
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('the demo brand must not leak into product code', () => {
  it('finds no example brand name in the repository outside tests, fixtures and example data', () => {
    const repository = resolve(import.meta.dirname, '../../../../..');
    expect(findBrandLeaks(repository)).toEqual([]);
  });

  it('flags a hard-coded name, with or without the accent, in any case', () => {
    const root = scratch({
      'apps/web/src/a.ts': "const brand = 'La Mèza';",
      'packages/x/src/b.ts': '// LA MEZA',
    });
    expect(findBrandLeaks(root).map((leak) => leak.file)).toEqual([
      'apps/web/src/a.ts',
      'packages/x/src/b.ts',
    ]);
  });

  it('lets tests, fixtures and example data name the brand', () => {
    const root = scratch({
      'apps/web/src/a.test.ts': 'La Mèza',
      'packages/x/fixtures/b.json': '"meza"',
      'apps/web/src/landing/examples/data/la-meza.ts': 'La Mèza',
      'apps/web/node_modules/p/index.js': 'meza',
    });
    expect(findBrandLeaks(root)).toEqual([]);
  });
});
