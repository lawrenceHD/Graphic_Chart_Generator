// Defences for text that is not ours (brief, brand name, text read from third-party images): it reaches
// a prompt only as quoted data (07_AI_COPILOT.md §3.4). This is the second line; the first is the
// delimited <data> blocks and the structured, Zod-validated answers.

const WHITESPACE = /[\p{White_Space}]+/gu;
// Control (Cc) and format (Cf: zero-width, bidi overrides, BOM) characters hide or reorder text.
const INVISIBLE = /[\p{Cc}\p{Cf}]/gu;

/** Plain, single-line, length-capped text; angle brackets cannot open or close a block. */
export function sanitizeUntrusted(text: string, max: number): string {
  return text
    .replace(WHITESPACE, ' ')
    .replace(INVISIBLE, '')
    .replaceAll('<', '‹')
    .replaceAll('>', '›')
    .trim()
    .slice(0, max);
}

const PATTERNS: readonly RegExp[] = [
  /\b(ignore|disregard|forget|override)\b[^.\n]{0,40}\b(previous|above|prior|earlier|all|any|your|these)\b[^.\n]{0,30}\b(instructions?|prompts?|rules?|messages?)\b/i,
  /\b(you are now|act as|pretend (to be|you are)|from now on you)\b/i,
  /\b(system|developer) (prompt|message|instructions?)\b/i,
  /\b(reveal|print|show|leak)\b[^.\n]{0,30}\b(api[ -]?key|secret|password|token|prompt)\b/i,
  /\b(oublie[zs]?|ignore[zr]?|ignorez|ne tiens pas compte)\b[^.\n]{0,40}\b(instructions?|consignes?|r[èe]gles?|pr[ée]c[ée]dent\w*)\b/i,
  /\b(r[ée]v[èe]le[zr]?|affiche[zr]?)\b[^.\n]{0,30}\b(cl[ée]|mot de passe|secret|prompt)\b/i,
];

/** Heuristic flag for instruction-like text. A flag never replaces validation, it only makes the case visible. */
export function looksLikeInjection(text: string): boolean {
  const flat = text.replace(INVISIBLE, '').replace(WHITESPACE, ' ');
  return PATTERNS.some((pattern) => pattern.test(flat));
}
