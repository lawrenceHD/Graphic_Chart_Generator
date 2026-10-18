import { fork } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RasterError, RasterImage, Rasterizer, Rect } from '@app/contracts';
import { err, ok, type Result } from '@app/kernel';
import { sanitizeSvg } from '../sanitize/index.js';
import type { ChildRequest, ChildResponse } from './protocol.js';

export interface NodeRasterizerOptions {
  /** Delay before the child is killed (05_ENGINES.md §3.7: 5 s). */
  readonly timeoutMs?: number;
  /** V8 heap cap of the child (§3.7: 512 MB). */
  readonly memoryMb?: number;
  /** Test hook: receives the pid of every child started. */
  readonly onSpawn?: (pid: number) => void;
}

const MAX_WIDTH = 8192;
const failed = (reason: string): RasterError => ({ code: 'RASTER_FAILED', reason });

// Tests run the TypeScript source directly (Node type stripping); production runs the compiled file.
function childScript(): string {
  const extension = import.meta.url.endsWith('.ts') ? '.ts' : '.js';
  return fileURLToPath(new URL(`./child${extension}`, import.meta.url));
}

// The child may read its own package and the pnpm store holding resvg and its native binary, nothing else:
// in particular not the repository root, where .env.local lives.
function readablePaths(): string[] {
  const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
  const resvgEntry = createRequire(import.meta.url).resolve('@resvg/resvg-js');
  const marker = `${path.sep}.pnpm${path.sep}`;
  const at = resvgEntry.indexOf(marker);
  const store = at >= 0 ? resvgEntry.slice(0, at + marker.length - 1) : path.dirname(resvgEntry);
  return [packageDir, store];
}

function isSanitized(svg: string): boolean {
  const result = sanitizeSvg(new TextEncoder().encode(svg));
  // sanitizeSvg is idempotent: only its own output comes back unchanged (T-008 "sanitization marker").
  return result.ok && result.value.svg === svg;
}

function readResponse(message: unknown): Result<ChildResponse, RasterError> {
  if (typeof message !== 'object' || message === null) return err(failed('invalid answer'));
  const field = (name: string): unknown => Reflect.get(message, name);
  const numbers = (...names: string[]): boolean =>
    names.every((name) => typeof field(name) === 'number');
  const kind = field('kind');
  const png = field('png');
  if (kind === 'render' && png instanceof Uint8Array && numbers('width', 'height')) {
    return ok({ kind, png, width: Number(field('width')), height: Number(field('height')) });
  }
  if (kind === 'bbox' && numbers('x', 'y', 'width', 'height')) {
    const [x, y, width, height] = ['x', 'y', 'width', 'height'].map((name) => Number(field(name)));
    return ok({ kind, x: x ?? 0, y: y ?? 0, width: width ?? 0, height: height ?? 0 });
  }
  return err(failed(kind === 'failure' ? String(field('reason')) : 'invalid answer'));
}

/** Node flags of the child: heap cap, permission model, read access limited to readablePaths(). */
export function childExecArgv(memoryMb = 512): string[] {
  return [
    `--max-old-space-size=${String(memoryMb)}`,
    '--permission',
    '--allow-addons',
    ...readablePaths().map((readable) => `--allow-fs-read=${readable}`),
  ];
}

function runChild(
  request: ChildRequest,
  options: NodeRasterizerOptions,
): Promise<Result<ChildResponse, RasterError>> {
  const execArgv = childExecArgv(options.memoryMb);
  // Empty environment: no secret reaches the child. SystemRoot lets Windows load the native addon.
  const env = process.env.SystemRoot === undefined ? {} : { SystemRoot: process.env.SystemRoot };
  return new Promise((resolve) => {
    const child = fork(childScript(), [], {
      execArgv,
      env,
      serialization: 'advanced',
      stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
    });
    if (child.pid !== undefined) options.onSpawn?.(child.pid);
    let outcome: Result<ChildResponse, RasterError> | undefined;
    const settle = (result: Result<ChildResponse, RasterError>): void => {
      outcome ??= result;
      child.kill('SIGKILL');
    };
    // Resolved on exit only, so a timed-out child is really gone when the caller resumes.
    const timer = setTimeout(() => {
      settle(err({ code: 'ASSET_SCAN_TIMEOUT', reason: 'rasterisation delay exceeded' }));
    }, options.timeoutMs ?? 5_000);
    child.once('message', (message: unknown) => {
      settle(readResponse(message));
    });
    child.once('error', () => {
      settle(err(failed('child process error')));
    });
    child.once('exit', () => {
      clearTimeout(timer);
      resolve(outcome ?? err(failed('child exited without answer')));
    });
    child.send(request);
  });
}

/** Node implementation of the Rasterizer port (ADR-016), for apps/worker and integration tests only. */
export function createNodeRasterizer(options: NodeRasterizerOptions = {}): Rasterizer {
  return {
    async rasterize(svg: string, width: number): Promise<Result<RasterImage, RasterError>> {
      if (!Number.isInteger(width) || width < 1 || width > MAX_WIDTH)
        return err(failed('invalid width'));
      if (!isSanitized(svg))
        return err({ code: 'RASTER_NOT_SANITIZED', reason: 'not a sanitizeSvg output' });
      const response = await runChild({ kind: 'render', svg, width }, options);
      if (!response.ok) return response;
      return response.value.kind === 'render'
        ? ok({
            png: response.value.png,
            width: response.value.width,
            height: response.value.height,
          })
        : err(failed('unexpected answer'));
    },
    async bbox(svg: string): Promise<Result<Rect, RasterError>> {
      if (!isSanitized(svg))
        return err({ code: 'RASTER_NOT_SANITIZED', reason: 'not a sanitizeSvg output' });
      const response = await runChild({ kind: 'bbox', svg }, options);
      if (!response.ok) return response;
      const { value } = response;
      return value.kind === 'bbox'
        ? ok({ x: value.x, y: value.y, width: value.width, height: value.height })
        : err(failed('unexpected answer'));
    },
  };
}
