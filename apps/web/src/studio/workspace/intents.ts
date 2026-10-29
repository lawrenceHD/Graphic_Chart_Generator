import type { BrandDocument, Command } from '@app/document';
import { hexToOklch, parseHexInput, withHue, withLightness } from '../../brand/color';
import { PAIRING_LIST, nextPairing } from '../../brand/pairings';
import type { ColorRole } from './brand-view';

// Requests typed in the copilot, read locally until the Gemini copilot is wired (07 §4): each understood
// request becomes reversible commands; anything else is answered honestly with what can be asked. The parser
// never guesses a value: a colour comes from the text (hex) or from a measured transformation.
export type Intent =
  | { readonly kind: 'commands'; readonly reply: Reply; readonly commands: readonly Command[] }
  | { readonly kind: 'unknown' };

export type Reply =
  | { readonly id: 'color-set'; readonly role: ColorRole; readonly hex: string }
  | {
      readonly id: 'color-darker' | 'color-lighter';
      readonly role: ColorRole;
      readonly hex: string;
    }
  | { readonly id: 'color-warmer' | 'color-cooler'; readonly role: ColorRole; readonly hex: string }
  | { readonly id: 'swap' }
  | { readonly id: 'typeface'; readonly pairing: string }
  | { readonly id: 'format'; readonly format: 'landscape' | 'portrait' }
  | { readonly id: 'title'; readonly title: string };

const fold = (text: string): string =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');

const ROLE_WORDS: readonly (readonly [ColorRole, RegExp])[] = [
  ['accent', /\baccent|secondaire|secondary/u],
  ['neutralLight', /neutre clair|fond|light neutral|background|clair\b/u],
  ['neutralDark', /neutre sombre|texte|dark neutral|text\b/u],
  ['primary', /principal|primaire|primary|main/u],
];

function roleOf(text: string): ColorRole {
  return ROLE_WORDS.find(([, pattern]) => pattern.test(text))?.[0] ?? 'primary';
}

function setColor(document: BrandDocument, role: ColorRole, hex: string): Command {
  return {
    type: 'SetColorToken',
    token: role,
    hex,
    source: 'user',
    expect: document.tokens.colors[role].hex,
  };
}

export function readIntent(
  input: string,
  document: BrandDocument,
  selectedPageId: string | null,
): Intent {
  const text = fold(input.trim());
  if (text === '') return { kind: 'unknown' };
  const colors = document.tokens.colors;

  // "#e24329", "#fff", or six hex characters with a digit: French words such as "efface" are not colours.
  const hexMatch = /#([0-9a-f]{6}|[0-9a-f]{3})\b|\b((?=[a-f]*\d)[0-9a-f]{6})\b/u.exec(text);
  const hex = hexMatch === null ? null : parseHexInput(hexMatch[1] ?? hexMatch[2] ?? '');
  if (hex !== null) {
    const role = roleOf(text);
    return {
      kind: 'commands',
      reply: { id: 'color-set', role, hex },
      commands: [setColor(document, role, hex)],
    };
  }

  if (/echang|inverse|swap|permut/u.test(text)) {
    return {
      kind: 'commands',
      reply: { id: 'swap' },
      commands: [
        setColor(document, 'primary', colors.accent.hex),
        setColor(document, 'accent', colors.primary.hex),
      ],
    };
  }

  const shade = /plus (sombre|fonce)|assombri|fonce|darker|darken/u.test(text)
    ? -0.08
    : /plus clair|eclairci|lighter|lighten/u.test(text)
      ? 0.08
      : 0;
  if (shade !== 0) {
    const role = roleOf(text.replace(/plus clair|plus sombre|eclairci|assombri/gu, ''));
    const current = colors[role].hex;
    const next = withLightness(current, hexToOklch(current).L + shade);
    return {
      kind: 'commands',
      reply: { id: shade < 0 ? 'color-darker' : 'color-lighter', role, hex: next },
      commands: [setColor(document, role, next)],
    };
  }

  const temperature = /plus chaud|rechauff|warmer/u.test(text)
    ? -24
    : /plus froid|refroidi|cooler/u.test(text)
      ? 24
      : 0;
  if (temperature !== 0) {
    const role = roleOf(text);
    const current = colors[role].hex;
    const next = withHue(current, (hexToOklch(current).h ?? 0) + temperature);
    return {
      kind: 'commands',
      reply: { id: temperature < 0 ? 'color-warmer' : 'color-cooler', role, hex: next },
      commands: [setColor(document, role, next)],
    };
  }

  if (/police|typo|font|typeface|caractere/u.test(text)) {
    const current = document.tokens.typography.pairingId;
    const named = PAIRING_LIST.find(
      (pairing) =>
        text.includes(fold(pairing.display.name)) || text.includes(fold(pairing.text.name)),
    );
    const pairingId = named?.id ?? nextPairing(current);
    const pairing = named ?? PAIRING_LIST.find((entry) => entry.id === pairingId);
    return {
      kind: 'commands',
      reply: { id: 'typeface', pairing: pairing?.display.name ?? pairingId },
      commands: [{ type: 'SetTypographyPairing', pairingId, expect: current }],
    };
  }

  if (selectedPageId !== null && /portrait|paysage|landscape|a4|16.9/u.test(text)) {
    const format = /portrait|a4/u.test(text) ? 'portrait' : 'landscape';
    return {
      kind: 'commands',
      reply: { id: 'format', format },
      commands: [{ type: 'SetPageOverride', pageId: selectedPageId, key: 'format', value: format }],
    };
  }

  const titled = /(?:titre|title)\s*[:=]\s*(.+)$/u.exec(input.trim());
  if (selectedPageId !== null && titled?.[1] !== undefined) {
    const title = titled[1].trim().slice(0, 80);
    return {
      kind: 'commands',
      reply: { id: 'title', title },
      commands: [{ type: 'SetPageField', pageId: selectedPageId, field: 'title', value: title }],
    };
  }

  return { kind: 'unknown' };
}
