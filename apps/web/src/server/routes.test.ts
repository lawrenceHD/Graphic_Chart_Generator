import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ROUTES } from './routes';

const API = fileURLToPath(new URL('../app/api/v1', import.meta.url));

function routeFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return routeFiles(full);
    return entry.name === 'route.ts' ? [full] : [];
  });
}

describe('route table (SEC-08, ADR-014)', () => {
  it('declares exactly the methods exported by the route files under /api/v1', () => {
    const exported = routeFiles(API).flatMap((file) => {
      const route = `/${path.relative(API, path.dirname(file)).split(path.sep).join('/')}`;
      const source = readFileSync(file, 'utf8');
      return [...source.matchAll(/export (?:async )?function (GET|POST|PATCH|DELETE)\b/g)].map(
        (match) => `${match[1] ?? ''} ${route}`,
      );
    });
    expect(exported.sort()).toEqual(ROUTES.map((entry) => `${entry.method} ${entry.path}`).sort());
  });
});
