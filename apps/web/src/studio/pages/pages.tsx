'use client';

import type { PageType } from '@app/contracts';
import { Applications } from './applications';
import { ClearSpace } from './clear-space';
import type { Renderer } from './common';
import { Contrast } from './contrast';
import { Cover } from './cover';
import { DoDont } from './do-dont';
import { LogoPage } from './logo-page';
import { Manifesto } from './manifesto';
import { Palette } from './palette';
import { Tokens } from './tokens';
import { Tone } from './tone';
import { Typography } from './typography';

// The eleven page types of the document, one renderer per type (one file per type). Several pages of a
// type read their own variant from the sheet context (variant.ts).
export const RENDERERS: Readonly<Record<PageType, Renderer>> = {
  mockup: Applications,
  cover: Cover,
  manifesto: Manifesto,
  logo: LogoPage,
  'clear-space': ClearSpace,
  'do-dont': DoDont,
  palette: Palette,
  contrast: Contrast,
  typography: Typography,
  'tone-of-voice': Tone,
  tokens: Tokens,
};
