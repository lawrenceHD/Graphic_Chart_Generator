export {
  isSvgElement,
  sanitizeSvg,
  sanitizeSvgTree,
  serializeSvg,
  type SanitizedTree,
  type SvgElement,
  type SvgNode,
  type SanitizedSvg,
  type SanitizeStats,
  type SvgWarning,
  type WarningCode,
} from './sanitize/index.js';
export { detectType, type DetectedType } from './detect/detect-type.js';
export { downscaleNearest, type RgbaImage } from './detect/downscale.js';
export { ensureViewBox } from './sanitize/ensure-view-box.js';
