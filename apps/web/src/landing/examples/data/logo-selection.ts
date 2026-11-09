import type { LogoPick } from '../schema';

const pick = (
  id: string,
  name: string,
  sourceFile: string,
  sector: string,
  markType: LogoPick['markType'],
  palette: readonly string[],
): LogoPick => ({
  id,
  name,
  sourceFile,
  logo: `/demo/logos/${id}.svg`,
  sector,
  markType,
  palette: [...palette],
});

// Sixteen real marks picked from the reference library for their drawing (simple, legible in one to three
// colours, easy to vectorise and to print on a mock-up). Palettes are the colours found in each SVG file.
export const LOGO_SELECTION: readonly LogoPick[] = [
  pick('prisma', 'Prisma', 'prisma.svg', 'Données', 'abstract', ['#000000']),
  pick('snowpack', 'Snowpack', 'snowpack.svg', 'Outils de développement', 'pictorial', ['#000000']),
  pick('buck', 'Buck', 'buck.svg', 'Outils de développement', 'pictorial', ['#4A69A5']),
  pick('buffer', 'Buffer', 'buffer.svg', 'Marketing', 'abstract', ['#000000']),
  pick('basecamp', 'Basecamp', 'basecamp.svg', 'Collaboration', 'pictorial', [
    '#B6DEFF',
    '#66CC66',
    '#17AD49',
  ]),
  pick('khan-academy', 'Khan Academy', 'khan_academy-icon.svg', 'Éducation', 'pictorial', [
    '#14BF96',
    '#FFFFFF',
  ]),
  pick('dreamhost', 'DreamHost', 'dreamhost.svg', 'Hébergement', 'pictorial', [
    '#1F3244',
    '#3E95BE',
  ]),
  pick('adyen', 'Adyen', 'adyen.svg', 'Paiement', 'wordmark', ['#32AA52']),
  pick('shogun', 'Shogun', 'shogun.svg', 'E-commerce', 'wordmark', ['#5D50C6']),
  pick('prott', 'Prott', 'prott.svg', 'Design', 'wordmark', ['#3E3E3E']),
  pick('getyourguide', 'GetYourGuide', 'getyourguide.svg', 'Voyages', 'wordmark', ['#FF5533']),
  pick('corda', 'Corda', 'corda.svg', 'Finance', 'wordmark', ['#E0081C']),
  pick('marvel', 'Marvel', 'marvel.svg', 'Design', 'wordmark', ['#20B6FF']),
  pick('handlebars', 'Handlebars', 'handlebars.svg', 'Logiciel', 'pictorial', ['#423426']),
  pick('patreon', 'Patreon', 'patreon.svg', 'Créateurs', 'letterform', ['#FF424D']),
  pick('manjaro', 'Manjaro', 'manjaro.svg', 'Systèmes', 'letterform', ['#35BF5C']),
];
