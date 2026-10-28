// Development-only stand-in for R2 (S3 path style), since MinIO community builds are no longer distributed.
// Serves http://127.0.0.1:9000/<bucket>/<key> from .cache/dev-storage. Presigned URLs are checked for expiry
// but signatures are NOT verified: never expose this server beyond the local machine.
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, join, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.DEV_STORAGE_PORT ?? 9000);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../.cache/dev-storage');
const ALLOWED_ORIGIN = process.env.APP_URL ?? 'http://localhost:3000';
// Same rule as the adapter's keys: no empty, dot-leading or traversal segment can reach the disk.
const SEGMENT = /^[a-z0-9][a-z0-9._-]*$/i;

function objectPath(pathname) {
  const segments = pathname.split('/').slice(1).map(decodeURIComponent);
  if (segments.length < 2 || !segments.every((segment) => SEGMENT.test(segment))) return null;
  return join(ROOT, ...segments);
}

function expired(url) {
  const date = url.searchParams.get('X-Amz-Date');
  if (date === null) return false; // header-signed request from the server
  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(date);
  if (match === null) return true;
  const [, y, mo, d, h, mi, s] = match;
  const signedAt = Date.UTC(+y, +mo - 1, +d, +h, +mi, +s);
  const seconds = Number(url.searchParams.get('X-Amz-Expires') ?? 0);
  return Date.now() > signedAt + seconds * 1000;
}

function cors(response) {
  response.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  response.setHeader('Access-Control-Allow-Methods', 'GET, PUT, HEAD, DELETE');
  response.setHeader('Access-Control-Allow-Headers', 'content-type, content-length');
  response.setHeader('Access-Control-Expose-Headers', 'content-length, etag');
  response.setHeader('Vary', 'Origin');
}

function end(response, status) {
  response.writeHead(status).end();
}

async function handle(request, response) {
  cors(response);
  if (request.method === 'OPTIONS') return end(response, 204);
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
  const file = objectPath(url.pathname);
  if (file === null) return end(response, 400);
  if (expired(url)) return end(response, 403);
  const meta = `${file}.meta.json`;

  if (request.method === 'PUT') {
    await mkdir(dirname(file), { recursive: true });
    const partial = `${file}.partial`;
    await pipeline(request, createWriteStream(partial));
    await rename(partial, file);
    await writeFile(meta, JSON.stringify({ contentType: request.headers['content-type'] ?? '' }));
    return end(response, 200);
  }
  if (request.method === 'DELETE') {
    const found = await stat(file).then(
      () => true,
      () => false,
    );
    await rm(file, { force: true });
    await rm(meta, { force: true });
    return end(response, found ? 204 : 404);
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') return end(response, 405);

  const info = await stat(file).catch(() => null);
  if (info === null || !info.isFile()) return end(response, 404);
  const stored = JSON.parse(await readFile(meta, 'utf8').catch(() => '{}'));
  const contentType = url.searchParams.get('response-content-type') ?? stored.contentType;
  const disposition = url.searchParams.get('response-content-disposition');
  response.setHeader('Content-Length', String(info.size));
  if (contentType) response.setHeader('Content-Type', contentType);
  if (disposition) response.setHeader('Content-Disposition', disposition);
  response.writeHead(200);
  if (request.method === 'HEAD') return response.end();
  await pipeline(createReadStream(file), response);
}

createServer((request, response) => {
  handle(request, response).catch((error) => {
    process.stderr.write(`dev-storage: ${String(error)}\n`);
    if (!response.headersSent) end(response, 500);
    else response.destroy();
  });
}).listen(PORT, '127.0.0.1', () => {
  process.stdout.write(`dev-storage ready on http://127.0.0.1:${String(PORT)} (${ROOT})\n`);
});
