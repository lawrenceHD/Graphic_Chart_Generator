export { apply, applyInverse, type ApplyResult, type CommandError } from './commands.js';
export { CommandSchema, type ApplyInput, type Command } from './command-schema.js';
export { migrate, type MigrationError } from './migrate.js';
export {
  BrandDocumentSchema,
  CURRENT_SCHEMA_VERSION,
  MAX_DOCUMENT_BYTES,
  PageDataSchema,
  PageOverridesSchema,
  PageSchema,
  type BrandDocument,
  type Page,
  type PageData,
  type PageOverrides,
} from './schema.js';
export {
  checkTargetedUndo,
  redoTarget,
  undoTarget,
  type RevisionRef,
  type TargetedUndoCheck,
} from './history.js';
