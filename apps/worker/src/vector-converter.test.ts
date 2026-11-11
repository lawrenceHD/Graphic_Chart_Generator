import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  createVectorConverter,
  createVectorcraftRunner,
  withoutPageBox,
  type RunCommand,
  type RunResult,
} from './vector-converter.js';

const text = (value: string): Uint8Array => new TextEncoder().encode(value);

// The real program, when installed (ADR-033): VECTORCRAFT_CLI=<path to vectorcraft-cli>.
const binary = process.env.VECTORCRAFT_CLI ?? '';
describe.runIf(binary !== '')('vectorcraft-cli itself', () => {
  const converter = createVectorConverter({ run: createVectorcraftRunner(binary) });

  it('outlines live text, and refuses a font it does not have', async () => {
    const live = (family: string): Uint8Array =>
      text(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 80"><text x="10" y="55" font-family="${family}" font-size="48">Atelier</text></svg>`,
      );
    const outlined = await converter.toSvg(live('Arial'), 'svg');
    if (outlined.ok) {
      expect(outlined.value).not.toContain('<text');
      expect(outlined.value).toContain('<path');
    } else expect(outlined.error).toBe('ASSET_FONT_MISSING'); // a server without Arial
    expect(await converter.toSvg(live('Police Inexistante Pro'), 'svg')).toEqual({
      ok: false,
      error: 'ASSET_FONT_MISSING',
    });
  }, 60_000);

  it('converts a clean drawing and refuses a broken PDF', async () => {
    const drawing = text(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M10 10 L90 10 L50 90 Z"/></svg>',
    );
    expect((await converter.toSvg(drawing, 'svg')).ok).toBe(true);
    expect((await converter.toSvg(text('%PDF-1.4 broken'), 'pdf')).ok).toBe(false);
  }, 60_000);
});

const INFO_OK = JSON.stringify({
  fonts: [{ family: 'Georgia', missing: false }],
  warnings: [],
});
const INFO_MISSING = JSON.stringify({
  fonts: [
    { family: 'Georgia', missing: false },
    { family: 'Anecor Gheroos', missing: true },
  ],
  warnings: [],
});
const OUTLINED =
  '<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="842" height="595" viewBox="0 0 842 595"><path d="M0 0h10v10z"/></svg>';

interface Call {
  readonly args: readonly string[];
  readonly cwd: string;
}

/** A fake vectorcraft-cli: answers `info` with `info`, writes `output` for `convert`. */
function fakeCli(options: {
  readonly info?: string;
  readonly output?: string;
  readonly convert?: Partial<RunResult>;
  readonly infoResult?: Partial<RunResult>;
}): { readonly run: RunCommand; readonly calls: Call[] } {
  const calls: Call[] = [];
  const run: RunCommand = async (args, cwd) => {
    calls.push({ args, cwd });
    if (args.includes('info'))
      return { code: 0, stdout: options.info ?? INFO_OK, timedOut: false, ...options.infoResult };
    const out = args[args.indexOf('convert') + 2];
    if (out !== undefined && options.output !== undefined)
      await writeFile(path.join(cwd, out), options.output);
    return {
      code: 0,
      stdout: JSON.stringify({ format: 'svg', warnings: [] }),
      timedOut: false,
      ...options.convert,
    };
  };
  return { run, calls };
}

describe('vector converter (vectorcraft-cli, ADR-033)', () => {
  it('turns a vector file into SVG, text as outlines, plug-ins off', async () => {
    const cli = fakeCli({ output: OUTLINED });
    const converted = await createVectorConverter({ run: cli.run }).toSvg(text('%PDF-1.6'), 'pdf');
    expect(converted).toEqual({ ok: true, value: OUTLINED });
    const convert = cli.calls.find((call) => call.args.includes('convert'));
    expect(convert?.args).toEqual([
      '--safe-mode',
      'convert',
      'in.pdf',
      'out.svg',
      '--outline-text',
      '--artboard',
      '0',
    ]);
    expect(cli.calls.every((call) => call.args[0] === '--safe-mode')).toBe(true);
  });

  it('refuses a file naming a font the server lacks, instead of redrawing it in another font', async () => {
    const cli = fakeCli({ info: INFO_MISSING, output: OUTLINED });
    const converted = await createVectorConverter({ run: cli.run }).toSvg(text('<svg/>'), 'svg');
    expect(converted).toEqual({ ok: false, error: 'ASSET_FONT_MISSING' });
    expect(cli.calls.some((call) => call.args.includes('convert'))).toBe(false);
  });

  it('refuses a conversion the converter reports as written with a fallback font', async () => {
    const cli = fakeCli({
      output: OUTLINED,
      convert: {
        stdout: JSON.stringify({
          warnings: [
            "fonts that aren't available were written in the fallback font, Source Sans 3",
          ],
        }),
      },
    });
    const converted = await createVectorConverter({ run: cli.run }).toSvg(text('<svg/>'), 'svg');
    expect(converted).toEqual({ ok: false, error: 'ASSET_FONT_MISSING' });
  });

  it('reports a timeout and a failure with their own codes', async () => {
    const slow = fakeCli({ infoResult: { timedOut: true, code: null } });
    expect(
      await createVectorConverter({ run: slow.run }).toSvg(text('%!PS-Adobe'), 'postscript'),
    ).toEqual({ ok: false, error: 'ASSET_SCAN_TIMEOUT' });
    const broken = fakeCli({ convert: { code: 2 } });
    expect(await createVectorConverter({ run: broken.run }).toSvg(text('%PDF-1.6'), 'pdf')).toEqual(
      { ok: false, error: 'ASSET_DECODE_FAILED' },
    );
    const garbled = fakeCli({ info: 'not json' });
    expect(
      await createVectorConverter({ run: garbled.run }).toSvg(text('%PDF-1.6'), 'pdf'),
    ).toEqual({ ok: false, error: 'ASSET_DECODE_FAILED' });
  });

  it('fails when the converter exits cleanly without writing the file', async () => {
    const cli = fakeCli({});
    expect(await createVectorConverter({ run: cli.run }).toSvg(text('%PDF-1.6'), 'pdf')).toEqual({
      ok: false,
      error: 'ASSET_DECODE_FAILED',
    });
  });

  it('reads the text of a PDF document', async () => {
    const cli = fakeCli({ output: 'La Mèza\nCUISINE DE QUARTIER\n' });
    const read = await createVectorConverter({ run: cli.run }).toText(text('%PDF-1.7'));
    expect(read).toEqual({ ok: true, value: 'La Mèza\nCUISINE DE QUARTIER\n' });
    expect(cli.calls.at(-1)?.args).toEqual(['--safe-mode', 'convert', 'in.pdf', 'out.txt']);
  });

  it('works in a fresh private folder and removes it afterwards, even on failure', async () => {
    const cli = fakeCli({ convert: { code: 1 } });
    await createVectorConverter({ run: cli.run }).toSvg(text('%PDF-1.6'), 'pdf');
    const [first] = cli.calls;
    expect(first?.cwd).toBeDefined();
    expect(existsSync(first?.cwd ?? '')).toBe(false);
  });

  it('hands the bytes over unchanged, PostScript under the .eps name', async () => {
    let seen = '';
    const run: RunCommand = async (args, cwd) => {
      if (args.includes('info')) seen = await readFile(path.join(cwd, 'in.eps'), 'utf8');
      return { code: 0, stdout: INFO_OK, timedOut: false };
    };
    await createVectorConverter({ run }).toSvg(text('%!PS-Adobe-3.0 EPSF'), 'postscript');
    expect(seen).toBe('%!PS-Adobe-3.0 EPSF');
  });
});

describe('vector converter, what it refuses to read back', () => {
  it('refuses an oversized output, and tells the operator why', async () => {
    const reasons: string[] = [];
    const cli = fakeCli({ output: `<svg>${'x'.repeat(5 * 1024 * 1024)}</svg>` });
    const converted = await createVectorConverter({
      run: cli.run,
      onFailure: ({ reason }) => reasons.push(reason),
    }).toSvg(text('%PDF-1.6'), 'pdf');
    expect(converted).toEqual({ ok: false, error: 'ASSET_TOO_LARGE' });
    expect(reasons[0]).toMatch(/bytes/u);
  });

  it('reads back only a regular file, never a folder or a link left in its place', async () => {
    const run: RunCommand = async (args, cwd) => {
      if (args.includes('convert')) await mkdir(path.join(cwd, 'out.svg'));
      return { code: 0, stdout: INFO_OK, timedOut: false };
    };
    expect(await createVectorConverter({ run }).toSvg(text('%PDF-1.6'), 'pdf')).toEqual({
      ok: false,
      error: 'ASSET_DECODE_FAILED',
    });
  });

  it('turns a crash of the converter runner into a verdict, not a failed job', async () => {
    const run: RunCommand = () => Promise.reject(new Error('spawn EACCES'));
    const reasons: string[] = [];
    const converted = await createVectorConverter({
      run,
      onFailure: ({ reason }) => reasons.push(reason),
    }).toText(text('%PDF-1.7'));
    expect(converted).toEqual({ ok: false, error: 'ASSET_DECODE_FAILED' });
    expect(reasons[0]).toContain('EACCES');
  });
});

describe('withoutPageBox', () => {
  it('copes with a `>` inside an attribute value of the root', () => {
    expect(withoutPageBox('<svg data-note="a > b" width="10" height="10"><g/></svg>')).toBe(
      '<svg data-note="a > b"><g/></svg>',
    );
  });
  it('drops the page size of the root so the logo is framed on its own drawing', () => {
    expect(withoutPageBox(OUTLINED)).toBe(
      '<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0h10v10z"/></svg>',
    );
  });
  it('leaves the attributes of inner elements alone', () => {
    const svg = '<svg viewBox="0 0 1 1"><rect width="5" height="5"/></svg>';
    expect(withoutPageBox(svg)).toBe('<svg><rect width="5" height="5"/></svg>');
  });
});
