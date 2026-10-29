import { PAIRING_IDS, type PairingId } from '@app/contracts';

// Closed typographic catalogue of 09_DESIGN_SYSTEM §8, self-hosted (src/styles/fonts.css). The family names
// are the CSS names of the bundled faces; the display names are what the guideline prints.
export interface Pairing {
  readonly id: PairingId;
  readonly display: { readonly name: string; readonly css: string };
  readonly text: { readonly name: string; readonly css: string };
}

const face = (name: string, variable = true) => ({
  name,
  css: `'${name}${variable ? ' Variable' : ''}', ui-sans-serif, system-ui, sans-serif`,
});
const serif = (name: string, variable = true) => ({
  name,
  css: `'${name}${variable ? ' Variable' : ''}', ui-serif, Georgia, serif`,
});

export const PAIRINGS: Readonly<Record<PairingId, Pairing>> = {
  'editorial-classic': {
    id: 'editorial-classic',
    display: serif('Playfair Display'),
    text: face('Source Sans 3'),
  },
  'modern-geometric': {
    id: 'modern-geometric',
    display: face('Plus Jakarta Sans'),
    text: face('Inter'),
  },
  'tech-grotesk': { id: 'tech-grotesk', display: face('Space Grotesk'), text: face('Inter') },
  'warm-serif': { id: 'warm-serif', display: serif('Fraunces'), text: face('Work Sans') },
  'luxury-light': {
    id: 'luxury-light',
    display: serif('Cormorant Garamond'),
    text: face('Montserrat'),
  },
  'friendly-soft': {
    id: 'friendly-soft',
    display: serif('DM Serif Display', false),
    text: face('DM Sans'),
  },
  'bold-display': {
    id: 'bold-display',
    display: face('Bricolage Grotesque'),
    text: face('Inter'),
  },
  'humanist-book': {
    id: 'humanist-book',
    display: serif('Libre Baskerville', false),
    text: face('Lato', false),
  },
};

export const PAIRING_LIST: readonly Pairing[] = PAIRING_IDS.map((id) => PAIRINGS[id]);

/** The next pairing of the catalogue, for the copilot's "another typeface" suggestion. */
export function nextPairing(current: PairingId): PairingId {
  const index = PAIRING_IDS.indexOf(current);
  return PAIRING_IDS[(index + 1) % PAIRING_IDS.length] ?? current;
}
