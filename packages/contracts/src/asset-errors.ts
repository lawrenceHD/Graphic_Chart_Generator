import { z } from 'zod';

// docs/04_API_CONTRACTS.md §2: stable, translatable rejection codes of an uploaded asset.
export const ASSET_ERROR_CODES = [
  'ASSET_TOO_LARGE',
  'ASSET_TYPE_UNSUPPORTED',
  'ASSET_SVG_FORBIDDEN_CONTENT',
  'ASSET_SVG_UNSUPPORTED_FEATURE',
  'ASSET_SVG_TOO_COMPLEX',
  'ASSET_DECODE_FAILED',
  'ASSET_SCAN_TIMEOUT',
] as const;

export const AssetErrorCodeSchema = z.enum(ASSET_ERROR_CODES);
export type AssetErrorCode = z.infer<typeof AssetErrorCodeSchema>;

export interface AssetError {
  readonly code: AssetErrorCode;
  /** Technical reason for logs and tests; never user content. */
  readonly reason: string;
  /** User-facing advice key (translated by the interface), e.g. converting text to outlines. */
  readonly hint?: string;
}
