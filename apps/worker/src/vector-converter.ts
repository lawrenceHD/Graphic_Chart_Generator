import { execFile } from 'node:child_process';
import { lstat, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { AssetErrorCode } from '@app/contracts';
import { err, ok, type Result } from '@app/kernel';
import { z } from 'zod';

// ADR-033: vectorcraft-cli (Apache-2.0) reads what a designer or a printer sends, Illustrator .ai, EPS and
// PDF, and SVG whose text was never outlined, and writes plain SVG with the text as outlines. It is an
// untrusted external program: it runs in a private temporary folder, plug-ins off (`--safe-mode`), no
// preferences written, an empty environment, a time limit; its JSON answers are validated here. What it
// writes is then sanitized like any uploaded SVG: nothing it produces is trusted.

export type VectorSource = 'svg' | 'pdf' | 'postscript';
export type ConvertFailure = Extract<
  AssetErrorCode,
  'ASSET_FONT_MISSING' | 'ASSET_DECODE_FAILED' | 'ASSET_SCAN_TIMEOUT' | 'ASSET_TOO_LARGE'
>;

export interface VectorConverter {
  /** First artboard as SVG, text as outlines; refused when a font is missing on the server. */
  toSvg(bytes: Uint8Array, source: VectorSource): Promise<Result<string, ConvertFailure>>;
  /** The text of a PDF document (a brand brief). */
  toText(bytes: Uint8Array): Promise<Result<string, ConvertFailure>>;
}

export interface RunResult {
  readonly code: number | null;
  readonly stdout: string;
  readonly timedOut: boolean;
  /** Why it failed, for the operator's log only (never shown to the person). */
  readonly reason?: string;
}
/** Runs vectorcraft-cli with these arguments in this folder. */
export type RunCommand = (args: readonly string[], cwd: string) => Promise<RunResult>;

const EXTENSION: Readonly<Record<VectorSource, string>> = {
  svg: 'svg',
  pdf: 'pdf',
  postscript: 'eps',
};
const MAX_OUTPUT_BYTES = 5 * 1024 * 1024;
const FALLBACK_FONT = /fallback font/iu;

const Info = z.object({
  fonts: z.array(z.object({ family: z.string(), missing: z.boolean() }).loose()),
});
const Written = z.object({ warnings: z.array(z.string()).default([]) }).loose();

function parsed<T>(schema: z.ZodType<T>, stdout: string): T | null {
  try {
    const result = schema.safeParse(JSON.parse(stdout));
    return result.success ? result.data : null;
  } catch {
    return null; // not JSON: the converter answered something unexpected, reported as a failure
  }
}

const failure = (result: RunResult): ConvertFailure | null =>
  result.timedOut ? 'ASSET_SCAN_TIMEOUT' : result.code === 0 ? null : 'ASSET_DECODE_FAILED';

const message = (cause: unknown): string =>
  cause instanceof Error ? cause.message : String(cause);

export interface VectorConverterDeps {
  readonly run: RunCommand;
  /** Operator log of each failure and its technical cause. */
  readonly onFailure?: (failure: {
    readonly code: ConvertFailure;
    readonly reason: string;
  }) => void;
}

export function createVectorConverter(deps: VectorConverterDeps): VectorConverter {
  const fail = (code: ConvertFailure, reason: string): Result<never, ConvertFailure> => {
    deps.onFailure?.({ code, reason });
    return err(code);
  };
  const ran = (result: RunResult, step: string): Result<never, ConvertFailure> | null => {
    const code = failure(result);
    return code === null
      ? null
      : fail(code, `${step}: ${result.reason ?? `exit ${String(result.code)}`}`);
  };

  // Only a regular file the converter wrote is read: a link it may have left points out of the folder.
  async function readOutput(file: string): Promise<Result<string, ConvertFailure>> {
    const info = await lstat(file).catch(() => null);
    if (info === null) return fail('ASSET_DECODE_FAILED', 'no output written');
    if (!info.isFile()) return fail('ASSET_DECODE_FAILED', 'output is not a regular file');
    if (info.size > MAX_OUTPUT_BYTES)
      return fail('ASSET_TOO_LARGE', `output of ${String(info.size)} bytes`);
    return ok(await readFile(file, 'utf8'));
  }

  // Each conversion gets its own folder, removed whatever happens. A file-system failure is a verdict,
  // not a crash of the job, and a failed clean-up never replaces the answer.
  async function inFolder<T>(
    work: (dir: string) => Promise<Result<T, ConvertFailure>>,
  ): Promise<Result<T, ConvertFailure>> {
    let dir: string | undefined;
    try {
      dir = await mkdtemp(path.join(tmpdir(), 'charta-vector-'));
      return await work(dir);
    } catch (cause) {
      return fail('ASSET_DECODE_FAILED', `file system: ${message(cause)}`);
    } finally {
      if (dir !== undefined)
        await rm(dir, { recursive: true, force: true }).catch((cause: unknown) => {
          deps.onFailure?.({ code: 'ASSET_DECODE_FAILED', reason: `clean-up: ${message(cause)}` });
        });
    }
  }

  return {
    toSvg: (bytes, source) =>
      inFolder(async (dir) => {
        const input = `in.${EXTENSION[source]}`;
        await writeFile(path.join(dir, input), bytes);
        const info = await deps.run(['--safe-mode', 'info', input], dir);
        const infoFailed = ran(info, 'info');
        if (infoFailed !== null) return infoFailed;
        const summary = parsed(Info, info.stdout);
        if (summary === null) return fail('ASSET_DECODE_FAILED', 'info: unexpected answer');
        const missing = summary.fonts.filter((font) => font.missing).map((font) => font.family);
        if (missing.length > 0) return fail('ASSET_FONT_MISSING', `missing: ${missing.join(', ')}`);

        const written = await deps.run(
          ['--safe-mode', 'convert', input, 'out.svg', '--outline-text', '--artboard', '0'],
          dir,
        );
        const convertFailed = ran(written, 'convert');
        if (convertFailed !== null) return convertFailed;
        // Second guard: the converter names the fallback font it drew with, should `info` have missed it.
        if (parsed(Written, written.stdout)?.warnings.some((line) => FALLBACK_FONT.test(line)))
          return fail('ASSET_FONT_MISSING', 'written with the fallback font');
        return readOutput(path.join(dir, 'out.svg'));
      }),
    toText: (bytes) =>
      inFolder(async (dir) => {
        await writeFile(path.join(dir, 'in.pdf'), bytes);
        const written = await deps.run(['--safe-mode', 'convert', 'in.pdf', 'out.txt'], dir);
        const convertFailed = ran(written, 'convert');
        if (convertFailed !== null) return convertFailed;
        return readOutput(path.join(dir, 'out.txt'));
      }),
  };
}

/**
 * The root of a converted file carries the page (an A4 artboard around a small logo). Without it the
 * sanitizer asks for the bounding box of the drawing, and the logo is framed on itself.
 */
export function withoutPageBox(svg: string): string {
  // An attribute value may hold a `>`: quoted values are skipped whole.
  return svg.replace(/<svg\b(?:[^>"']|"[^"]*"|'[^']*')*>/u, (root) =>
    root.replace(/\s(?:viewBox|width|height)\s*=\s*(?:"[^"]*"|'[^']*')/gu, ''),
  );
}

/** The real runner: the binary named by VECTORCRAFT_CLI, no shell, no inherited environment. */
export function createVectorcraftRunner(binary: string, timeoutMs = 30_000): RunCommand {
  return (args, cwd) =>
    new Promise((resolve) => {
      // Empty environment: no secret reaches the converter. SystemRoot lets Windows load its libraries;
      // TEMP points into the private folder.
      const env: Record<string, string> = {
        VECTORCRAFT_NO_PREFS: '1',
        TEMP: cwd,
        TMP: cwd,
        TMPDIR: cwd,
      };
      if (process.env.SystemRoot !== undefined) env.SystemRoot = process.env.SystemRoot;
      execFile(
        binary,
        [...args],
        {
          cwd,
          env,
          timeout: timeoutMs,
          killSignal: 'SIGKILL',
          maxBuffer: 1024 * 1024,
          windowsHide: true,
        },
        (error, stdout, stderr) => {
          if (error === null) {
            resolve({ code: 0, stdout, timedOut: false });
            return;
          }
          // Killed by the time limit only: an answer over maxBuffer is killed too, but is a failure.
          const overflow = error.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER';
          const code = typeof error.code === 'number' ? error.code : null;
          const cause = typeof error.code === 'string' ? error.code : `exit ${String(code)}`;
          resolve({
            code,
            stdout,
            timedOut: error.killed === true && !overflow,
            reason: overflow ? 'answer over 1 MB' : `${cause} ${stderr.slice(0, 300)}`.trim(),
          });
        },
      );
    });
}
