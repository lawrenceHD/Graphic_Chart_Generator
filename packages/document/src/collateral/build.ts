import type {
  Archetype,
  HeadlineOrigin,
  LayoutError,
  LayoutNode,
  PhotoTreatment,
} from '@app/contracts';
import type { Result } from '@app/kernel';
import type { BrandDocument } from '../schema.js';
import type { Frame } from './geometry.js';
import type { LogoShape } from './logo.js';
import type { TextContext } from './text.js';

// What every template receives: the sheet, the brand and the injected measure.
export type Build = TextContext & {
  readonly frame: Frame;
  readonly brand: BrandDocument['brand'];
  readonly rules: BrandDocument['tokens']['logo'];
  readonly logo: LogoShape;
  readonly archetype: Archetype;
  // Capitals for the headline: bold-display pairing, or a hero or outlaw brand (§2.0).
  readonly uppercase: boolean;
  readonly treatment: PhotoTreatment;
  readonly series: number;
  readonly calm: 'top' | 'bottom';
  readonly photo: { readonly id: string; readonly credit: string } | undefined;
  readonly placeholders: Placeholders | undefined;
};

export type Placeholders = {
  readonly name: string;
  readonly role: string;
  readonly phone: string;
  readonly email: string;
  readonly website: string;
};

export type Built = {
  readonly nodes: readonly LayoutNode[];
  readonly headline: HeadlineOrigin | null;
  readonly exampleLegend: boolean;
};

export type Template = Result<Built, LayoutError>;
