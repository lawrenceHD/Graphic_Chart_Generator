import type { DemoExample } from '../schema';
import { DREAMHOST } from './dreamhost';
import { GETYOURGUIDE } from './getyourguide';
import { KHAN_ACADEMY } from './khan-academy';
import { LA_MEZA } from './la-meza';
import { SHOGUN } from './shogun';

// The first example is the default one. Adding a brand is adding a file here and listing it: nothing else changes.
// Every logo here is a real mark (the owner's own, or one from the reference library): no logo drawn by the project.
export const EXAMPLE_DATA: readonly DemoExample[] = [
  KHAN_ACADEMY,
  DREAMHOST,
  GETYOURGUIDE,
  SHOGUN,
  LA_MEZA,
];
