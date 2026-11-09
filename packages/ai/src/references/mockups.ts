// The vision model names mockup objects freely ("shopping bag", "paper bag", "takeaway bag"). Counted as they
// come, one object splits its support into several small entries; folded here, the support adds up.
// Seeded from the most frequent subjects of the 492 indexed references (2026-11-09); extend it as new ones show up.
const SYNONYMS: Readonly<Record<string, readonly string[]>> = {
  'business card': ['name card', 'visiting card', 'card', 'business cards'],
  'coffee cup': ['mug', 'paper cup', 'takeaway cup', 'coffee mug', 'cup', 'coffee cups'],
  'paper bag': ['shopping bag', 'takeaway bag', 'carrier bag', 'gift bag', 'kraft bag'],
  'tote bag': ['canvas bag', 'tote'],
  signage: [
    'storefront sign',
    'shop sign',
    'store sign',
    'sign',
    'signboard',
    'wall sign',
    'door sign',
    'outdoor sign',
  ],
  letterhead: ['letter', 'stationery letter', 'a4 letterhead', 'letter paper'],
  smartphone: ['phone', 'mobile phone', 'mobile', 'iphone', 'phone screen'],
  't-shirt': ['tee', 'tee shirt', 'shirt', 'tshirt'],
  billboard: ['outdoor billboard', 'advertising billboard'],
  poster: ['wall poster', 'flyer poster'],
  packaging: ['product packaging', 'package'],
  box: ['packaging box', 'gift box', 'product box', 'cardboard box'],
  'water bottle': ['bottle'],
  laptop: ['laptop screen', 'computer', 'website mockup'],
  cap: ['baseball cap', 'hat'],
  notebook: ['notepad', 'journal', 'diary'],
};

const canonical = new Map<string, string>();
for (const [subject, aliases] of Object.entries(SYNONYMS)) {
  canonical.set(subject, subject);
  for (const alias of aliases) canonical.set(alias, subject);
}

/** The reference subject of a mockup name: synonyms folded, anything unknown only trimmed and lowercased. */
export function canonicalMockup(name: string): string {
  const key = name.trim().toLowerCase().replace(/\s+/gu, ' ');
  return canonical.get(key) ?? key;
}
