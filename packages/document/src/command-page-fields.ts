import { err } from '@app/kernel';
import type { ApplyInput, Command } from './command-schema.js';
import {
  expectationFailed,
  expectationFails,
  getFoilMetal,
  omitDataKey,
  type OperationResult,
  replacePage,
  success,
} from './command-internal.js';
import type { BrandDocument, Page } from './schema.js';

type PageFieldCommand = Extract<
  ApplyInput,
  {
    readonly type:
      'SetPageField' | 'SetPageOverride' | 'ClearPageOverride' | 'SelectScene' | 'RestoreMockup';
  }
>;
type OverrideKey = 'background' | 'layout';

export function applyPageFieldCommand(
  document: BrandDocument,
  command: PageFieldCommand,
): OperationResult {
  const page = document.pages.find((entry) => entry.id === command.pageId);
  if (!page) {
    return err({ code: 'PAGE_NOT_FOUND' });
  }
  switch (command.type) {
    case 'SetPageField':
      return applyPageField(document, page, command);
    case 'SetPageOverride':
      return setOverride(document, page, command.key, command.value, command.expect);
    case 'ClearPageOverride':
      return setOverride(document, page, command.key, undefined, command.expect);
    case 'SelectScene':
    case 'RestoreMockup':
      return applyMockup(document, page, command);
  }
}

function applyPageField(
  document: BrandDocument,
  page: Page,
  command: Extract<Command, { readonly type: 'SetPageField' }>,
): OperationResult {
  const previous = command.field === 'title' ? page.title : page.data[command.field];
  if (typeof previous !== 'string') {
    return err({ code: 'FIELD_NOT_ALLOWED' });
  }
  if (expectationFails(command.expect, previous)) {
    return expectationFailed();
  }
  const updated: Page =
    command.field === 'title'
      ? { ...page, title: command.value }
      : { ...page, data: { ...page.data, [command.field]: command.value } };
  return success(
    replacePage(document, page.id, () => updated),
    {
      type: 'SetPageField',
      pageId: page.id,
      field: command.field,
      value: previous,
      expect: command.value,
    },
  );
}

// `value === undefined` clears the override; the inverse restores the previous state either way.
function setOverride(
  document: BrandDocument,
  page: Page,
  key: OverrideKey,
  value: string | undefined,
  expected: unknown,
): OperationResult {
  const previous = page.overrides[key];
  if (expectationFails(expected, previous)) {
    return expectationFailed();
  }
  const overrides = withOverride(page.overrides, key, value);
  if (!overrides) {
    return err({ code: 'INVALID_COMMAND' });
  }
  const inverse = overrideCommand(page.id, key, previous, value ?? null);
  if (!inverse) {
    return err({ code: 'INVALID_COMMAND' });
  }
  return success(
    replacePage(document, page.id, (entry) => ({ ...entry, overrides })),
    inverse,
  );
}

function withOverride(
  overrides: Page['overrides'],
  key: OverrideKey,
  value: string | undefined,
): Page['overrides'] | undefined {
  const { background, layout } = overrides;
  const next = key === 'background' ? { background: value, layout } : { background, layout: value };
  const result: Page['overrides'] = {};
  if (next.background !== undefined) {
    result.background = next.background;
  }
  if (next.layout !== undefined) {
    if (!isLayout(next.layout)) {
      return undefined;
    }
    result.layout = next.layout;
  }
  return result;
}

function overrideCommand(
  pageId: string,
  key: OverrideKey,
  value: string | undefined,
  written: string | null,
): ApplyInput | undefined {
  if (value === undefined) {
    return { type: 'ClearPageOverride', pageId, key, expect: written };
  }
  if (key === 'background') {
    return { type: 'SetPageOverride', pageId, key, value, expect: written };
  }
  if (!isLayout(value) || (written !== null && !isLayout(written))) {
    return undefined;
  }
  return { type: 'SetPageOverride', pageId, key, value, expect: written };
}

function isLayout(value: string): value is NonNullable<Page['overrides']['layout']> {
  return ['split', 'grid', 'full-bleed', 'minimal'].includes(value);
}

function applyMockup(
  document: BrandDocument,
  page: Page,
  command: Extract<ApplyInput, { readonly type: 'SelectScene' | 'RestoreMockup' }>,
): OperationResult {
  if (page.type !== 'mockup') {
    return err({ code: 'FIELD_NOT_ALLOWED' });
  }
  const hadMockup = Object.hasOwn(page.data, 'mockup');
  const previous: unknown = hadMockup ? page.data.mockup : undefined;
  if (expectationFails(command.expect, previous)) {
    return expectationFailed();
  }
  let data: Page['data'];
  if (command.type === 'SelectScene') {
    const foilMetal = getFoilMetal(previous);
    const mockup =
      foilMetal === undefined
        ? { sceneId: command.sceneId, finish: command.finish }
        : { sceneId: command.sceneId, finish: command.finish, foilMetal };
    data = { ...page.data, mockup };
  } else {
    data = command.hadMockup
      ? { ...page.data, mockup: command.previousMockup }
      : omitDataKey(page.data, 'mockup');
  }
  const written: unknown = Object.hasOwn(data, 'mockup') ? data.mockup : null;
  const inverse: ApplyInput = hadMockup
    ? {
        type: 'RestoreMockup',
        pageId: page.id,
        hadMockup: true,
        previousMockup: previous,
        expect: written,
      }
    : { type: 'RestoreMockup', pageId: page.id, hadMockup: false, expect: written };
  return success(
    replacePage(document, page.id, (entry) => ({ ...entry, data })),
    inverse,
  );
}
