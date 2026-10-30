import type { Result } from '@app/kernel';
import type { AssetErrorCode } from './asset-errors.js';

// ADR-016: pure packages (logo-kit, svg-engine outside src/raster) receive a Rasterizer; only apps/worker
// and integration tests construct the Node implementation from `@app/svg-engine/raster`.
export type RasterErrorCode =
  | Extract<AssetErrorCode, 'ASSET_SCAN_TIMEOUT' | 'ASSET_DECODE_FAILED' | 'ASSET_TOO_LARGE'>
  | Extract<AssetErrorCode, 'ASSET_TYPE_UNSUPPORTED'>
  | 'RASTER_NOT_SANITIZED'
  | 'RASTER_FAILED';

export interface RasterError {
  readonly code: RasterErrorCode;
  /** Technical reason for logs and tests; never user content. */
  readonly reason: string;
}

export interface RasterImage {
  readonly png: Uint8Array;
  /** Straight-alpha RGBA pixels of the same render, row-major (for pure analysis without a PNG decoder). */
  readonly rgba: Uint8Array;
  readonly width: number;
  readonly height: number;
}

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface Rasterizer {
  /** Renders a sanitized SVG to a transparent PNG `width` pixels wide. */
  rasterize(svg: string, width: number): Promise<Result<RasterImage, RasterError>>;
  /** Bounding box of the visible content, in user units, transforms applied. */
  bbox(svg: string): Promise<Result<Rect, RasterError>>;
}

/** One-bit image: 1 = ink, row-major. */
export interface BinaryMask {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;
}

/** A traced outline: SVG path data in the mask's pixels, offset by (dx, dy). */
export interface TracedPath {
  readonly d: string;
  readonly dx: number;
  readonly dy: number;
}

export interface Vectorizer {
  /** Traces the ink of a binary mask into outlines (holes as inner subpaths, nonzero fill). */
  trace(mask: BinaryMask): Promise<Result<readonly TracedPath[], RasterError>>;
}
