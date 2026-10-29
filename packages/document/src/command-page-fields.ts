import { err } from '@app/kernel';
import { SetPageOverrideInverseSchema, type ApplyInput, type Command } from './command-schema.js';
import {
  expectationFailed,
  expectationFails,
  getFoilMetal,
  omitDataKey,
  type OperationResult,
  replacePage,
  success,
} from './command-internal.js';
import { PageOverridesSchema, type BrandDocument, type Page } from './schema.js';

type PageFieldCommand = Extract<
  ApplyInput,
  {
    readonly type:
      'SetPageField' | 'SetPageOverride' | 'ClearPageOverride' | 'SelectScene' | 'RestoreMockup';
  }
>;
type OverrideKey = keyof Page['overrides'];

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
  if (value !== undefined && !isOverrideValue(key, value)) {
    return undefined;
  }
  const rest = Object.fromEntries(Object.entries(overrides).filter(([name]) => name !== key));
  const next = value === undefined ? rest : { ...rest, [key]: value };
  const parsed = PageOverridesSchema.safeParse(next);
  return parsed.success ? parsed.data : undefined;
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
  const parsed = SetPageOverrideInverseSchema.safeParse({
    type: 'SetPageOverride',
    pageId,
    key,
    value,
    expect: written,
  });
  return parsed.success ? parsed.data : undefined;
}

const OVERRIDE_VALUES: Readonly<Record<Exclude<OverrideKey, 'background'>, readonly string[]>> = {
  layout: ['split', 'grid', 'full-bleed', 'minimal'],
  format: ['landscape', 'portrait'],
};

function isOverrideValue(key: OverrideKey, value: string): boolean {
  return key === 'background' || OVERRIDE_VALUES[key].includes(value);
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
