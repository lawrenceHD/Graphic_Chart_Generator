import type { VisualStyle } from '@app/contracts';
import { err, ok, type Result } from '@app/kernel';

// Pure half of tools/references/fetch-on-demand.mjs: which links may be fetched, what to read from a page, how to
// pace the requests and what to ask for. The tool owns the network and the disk; nothing here touches either.

// A run fetches a handful of references for one task, never a library.
export const MAX_ON_DEMAND_REFERENCES = 12;

export type SourceLink = { kind: 'pin'; id: string; url: string } | { kind: 'image'; url: string };

export type SourceLinkError = 'invalid-url' | 'not-https' | 'host-not-allowed' | 'unsupported-page';

const IMAGE_HOSTS = ['i.pinimg.com', 'mir-s3-cdn-cf.behance.net'] as const;
const IMAGE_EXTENSION = /\.(?:jpe?g|png|webp)$/iu;
const PIN_PATH = /^\/pin\/(\d{1,25})\/?$/u;

const isPinterestHost = (host: string): boolean =>
  host === 'pinterest.com' || /^[a-z0-9-]+\.pinterest\.com$/u.test(host);
const isImageHost = (host: string): boolean => IMAGE_HOSTS.some((allowed) => allowed === host);

/** Only public Pinterest pin pages and the image hosts of Pinterest and Behance: no search, no other site. */
export function parseSourceLink(raw: string): Result<SourceLink, SourceLinkError> {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return err('invalid-url');
  }
  if (url.username !== '' || url.password !== '') return err('invalid-url');
  if (url.protocol !== 'https:') return err(url.protocol === 'http:' ? 'not-https' : 'invalid-url');
  const host = url.hostname.toLowerCase();
  if (isImageHost(host)) {
    if (!IMAGE_EXTENSION.test(url.pathname)) return err('unsupported-page');
    return ok({ kind: 'image', url: `https://${host}${url.pathname}` });
  }
  if (!isPinterestHost(host)) return err('host-not-allowed');
  const pin = PIN_PATH.exec(url.pathname);
  if (!pin?.[1]) return err('unsupported-page');
  return ok({ kind: 'pin', id: pin[1], url: `https://${host}/pin/${pin[1]}/` });
}

const META = /<meta\b[^>]*>/giu;
const attribute = (tag: string, name: string): string | undefined =>
  new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, 'iu').exec(tag)?.[1];

/** The image the page itself publishes for link previews (og:image), if it sits on an allowed image host. */
export function extractPreviewImage(html: string): string | undefined {
  for (const tag of html.match(META) ?? []) {
    if (attribute(tag, 'property')?.toLowerCase() !== 'og:image') continue;
    const content = attribute(tag, 'content');
    if (content === undefined) continue;
    const parsed = parseSourceLink(content);
    if (parsed.ok && parsed.value.kind === 'image') return parsed.value.url;
  }
  return undefined;
}

/** `<sector>/pin-<id>.<ext>`: the shape the library index accepts, with no trace of a third-party file name. */
export function referenceFileName(sector: string, link: SourceLink, extension = 'jpg'): string {
  const original = link.url.split('/').pop() ?? '';
  const slug = original
    .replace(/\.[^.]*$/u, '')
    .replace(/[^a-z0-9]/giu, '')
    .slice(0, 40)
    .toLowerCase();
  const stem = link.kind === 'pin' ? `pin-${link.id}` : `img-${slug === '' ? 'image' : slug}`;
  return `${sector}/${stem}.${extension.replace(/[^a-z0-9]/giu, '').toLowerCase()}`;
}

export interface OnDemandTask {
  task: 'mockups' | 'charter';
  sector: string;
  styles: readonly VisualStyle[];
  // Mockup subjects the composition needs ("paper bag"); ignored for a charter.
  subjects?: readonly string[];
}

const CHARTER_TEMPLATES = ['brand guidelines', 'brand identity guidelines', 'brand book'] as const;

/** Search phrases for the opt-in search mode, at most MAX_ON_DEMAND_REFERENCES, without duplicates. */
export function onDemandQueries(task: OnDemandTask): string[] {
  const sector = task.sector === 'other' ? '' : task.sector.replaceAll('-', ' ');
  const join = (...parts: string[]): string => parts.filter(Boolean).join(' ');
  const style = task.styles[0] ?? '';
  const queries =
    task.task === 'mockups'
      ? (task.subjects ?? []).map((subject) =>
          join(subject.trim().toLowerCase(), 'mockup', style, sector),
        )
      : Array.from(
          { length: Math.max(1, Math.min(task.styles.length, CHARTER_TEMPLATES.length)) },
          (_, index) =>
            join(sector, CHARTER_TEMPLATES[index] ?? 'brand guidelines', task.styles[index] ?? ''),
        );
  return [...new Set(queries.filter((query) => query.split(' ').length >= 2))].slice(
    0,
    MAX_ON_DEMAND_REFERENCES,
  );
}

export interface PacerOptions {
  minIntervalMs: number;
  now: () => number;
  sleep: (ms: number) => Promise<void>;
}

/** Spaces the requests: `wait()` resolves once at least `minIntervalMs` has passed since the previous one. */
export function createPacer(options: PacerOptions): { wait: () => Promise<void> } {
  let last: number | undefined;
  return {
    wait: async () => {
      if (last !== undefined) {
        const remaining = options.minIntervalMs - (options.now() - last);
        if (remaining > 0) await options.sleep(remaining);
      }
      last = options.now();
    },
  };
}
