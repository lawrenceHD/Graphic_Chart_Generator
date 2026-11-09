import { contrastRatio } from '@app/color-engine';
import type { ColorRole, LandingExample } from '../example-source';

/** One role's colour of an example (its palette always carries the four roles). */
export function colorOf(example: LandingExample, role: ColorRole): string {
  return example.colors.find((color) => color.role === role)?.hex ?? '';
}

/** Text colour for a field of the brand: the brand's own paper or ink, whichever reads better. */
export function inkOn(example: LandingExample, background: string): string {
  const paper = colorOf(example, 'neutralLight');
  const ink = colorOf(example, 'neutralDark');
  return contrastRatio(paper, background) >= contrastRatio(ink, background) ? paper : ink;
}
