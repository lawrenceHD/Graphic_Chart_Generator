import brandsJson from '../data/brands.json';

export interface ColorInfo {
  hex: string;
  rgb: number[];
  oklch: number[];
  cmyk: number[];
}

export interface Brand {
  slug: string;
  name: string;
  sector: string;
  brief: string;
  fonts: { display: string; text: string };
  logo: string;
  bbox: { x: number; y: number; width: number; height: number };
  extracted: { hex: string; share: number }[];
  roles: {
    primary: ColorInfo;
    accent: ColorInfo;
    neutralDark: ColorInfo;
    neutralLight: ColorInfo;
  };
  extra: ColorInfo[];
  scales: {
    primary: { step: number; hex: string }[];
    accent: { step: number; hex: string }[];
  };
  contrast: { text: string; background: string; ratio: number; level: string }[];
  mono: {
    black: string;
    white: string;
    tonal: string;
    path: string;
    separated: boolean;
    structure: number | null;
  };
  clearSpace: string;
  favicon: string;
  donts: { kind: string; svg: string }[];
}

export const BRANDS: Brand[] = brandsJson as unknown as Brand[];

export const svgUrl = (svg: string): string =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

// Realistic scenes mapping
export const REALISTIC_SCENES = [
  { id: 'cards', label: 'Cartes de Visite Coton', subtitle: 'Papier texturé 350g, flat lay lin', icon: 'CreditCard' },
  { id: 'phone', label: 'Écran Mobile Dining', subtitle: 'Interface iOS, lumière naturelle du soir', icon: 'Smartphone' },
  { id: 'billboard', label: 'Affichage Urbain', subtitle: 'Panneau 4x3m cadre chêne contemporain', icon: 'Maximize2' },
  { id: 'store', label: 'Enseigne Laiton Brossé', subtitle: 'Devanture restaurant / atelier chic', icon: 'Store' },
  { id: 'tote', label: 'Tote Bag Toile Canvas', subtitle: 'Coton bio écru, patère murale', icon: 'ShoppingBag' },
  { id: 'office', label: 'Papeterie Complète', subtitle: 'En-tête, enveloppe, sceau de cire', icon: 'Building2' }
];

// Preloaded mock projects for the user dashboard
export interface UserProject {
  id: string;
  slug: string;
  name: string;
  sector: string;
  updatedAt: string;
  palette: string[];
  status: 'ready' | 'draft' | 'analyzing';
  artboardsCount: number;
}

export const INITIAL_USER_PROJECTS: UserProject[] = [
  {
    id: 'proj-1',
    slug: 'instacart',
    name: 'Instacart Fresh',
    sector: 'Livraison & Épicerie',
    updatedAt: 'Modifié il y a 2 heures',
    palette: ['#003d29', '#ff8200', '#f4efe7', '#111827'],
    status: 'ready',
    artboardsCount: 6
  },
  {
    id: 'proj-2',
    slug: 'basecamp',
    name: 'Basecamp 4',
    sector: 'Gestion de projet & Équipe',
    updatedAt: 'Modifié hier à 17:42',
    palette: ['#228b22', '#ffcc00', '#f9f9f9', '#212121'],
    status: 'ready',
    artboardsCount: 6
  },
  {
    id: 'proj-3',
    slug: 'gitlab',
    name: 'GitLab One',
    sector: 'DevOps & Collaboration',
    updatedAt: 'Modifié le 28 Octobre',
    palette: ['#fc6d26', '#e24329', '#171321', '#fdfaff'],
    status: 'ready',
    artboardsCount: 6
  },
  {
    id: 'proj-4',
    slug: 'blablacar',
    name: 'BlaBlaCar Express',
    sector: 'Mobilité & Voyage',
    updatedAt: 'Modifié le 24 Octobre',
    palette: ['#00aff5', '#00d66c', '#054752', '#ffffff'],
    status: 'ready',
    artboardsCount: 6
  }
];
