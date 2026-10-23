// Single import point for route files.
export {
  getAnalysisHandlers,
  getAssetHandlers,
  getDocumentHandlers,
  getEventHandlers,
  getGuestHandlers,
  getProjectHandlers,
} from './context';
export type { RouteParams } from './route-guard';
