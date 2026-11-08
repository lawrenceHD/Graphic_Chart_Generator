import type { DemoExample } from '../schema';
import { ATELIER_NACRE } from './atelier-nacre';
import { HALDEN_ADVISORY } from './halden-advisory';
import { HARROW_FIELDS } from './harrow-fields';
import { LA_MEZA } from './la-meza';
import { MAISON_ALBA } from './maison-alba';

// The first example is the default one. Adding a brand is adding a file here and listing it: nothing else changes.
export const EXAMPLE_DATA: readonly DemoExample[] = [
  MAISON_ALBA,
  HALDEN_ADVISORY,
  ATELIER_NACRE,
  HARROW_FIELDS,
  LA_MEZA,
];
