import type { AssetError } from '@app/contracts';
import { err, ok, type Result } from '@app/kernel';
import sax from 'sax';
import { assetError, LIMITS, type RawAttribute, type RawElement, type RawNode } from './model.js';

interface OpenElement {
  readonly uri: string;
  readonly local: string;
  readonly attributes: RawAttribute[];
  readonly children: RawNode[];
}

const GEOMETRY_ATTRIBUTES = new Set(['d', 'points']);

const tooComplex = (reason: string): AssetError => assetError('ASSET_SVG_TOO_COMPLEX', reason);

// Returns the element read from a namespaced tag, or the limit it breaks (§3.1).
function readTag(tag: sax.Tag | sax.QualifiedTag): OpenElement | AssetError {
  // With `xmlns: true` sax always yields qualified tags; the check narrows the type.
  if (!('uri' in tag)) return assetError('ASSET_DECODE_FAILED', 'unqualified tag');
  const attributes = Object.values(tag.attributes);
  if (attributes.length > LIMITS.attributesPerElement) return tooComplex('too many attributes');
  const limitOf = (local: string): number =>
    GEOMETRY_ATTRIBUTES.has(local) ? LIMITS.geometryValueLength : LIMITS.valueLength;
  if (attributes.some((attribute) => attribute.value.length > limitOf(attribute.local))) {
    return tooComplex('attribute value too long');
  }
  return {
    uri: tag.uri,
    local: tag.local,
    attributes: attributes.map(({ uri, prefix, local, value }) => ({ uri, prefix, local, value })),
    children: [],
  };
}

// Strict XML, namespaces resolved, only the five XML entities (no HTML entity table).
export function parseSvg(text: string): Result<RawElement, AssetError> {
  // strictEntities exists in sax 1.6.1 (lib/sax.js) but is missing from @types/sax 1.2.7.
  const options: sax.SAXOptions & { readonly strictEntities: boolean } = {
    xmlns: true,
    strictEntities: true,
  };
  const parser = sax.parser(true, options);
  const stack: OpenElement[] = [];
  let root: OpenElement | undefined;
  let nodes = 0;
  let failure: AssetError | undefined;

  parser.onopentag = (tag) => {
    if (failure) return;
    nodes += 1;
    if (nodes > LIMITS.nodes) {
      failure = tooComplex('too many nodes');
      return;
    }
    if (stack.length >= LIMITS.depth) {
      failure = tooComplex('too deep');
      return;
    }
    const element = readTag(tag);
    if ('code' in element) {
      failure = element;
      return;
    }
    const parent = stack.at(-1);
    if (parent) parent.children.push(element);
    else if (root) failure = assetError('ASSET_DECODE_FAILED', 'several root elements');
    else root = element;
    stack.push(element);
  };
  parser.onclosetag = () => {
    if (!failure) stack.pop();
  };
  const onText = (content: string): void => {
    if (failure) return;
    if (content.length > LIMITS.valueLength) failure = tooComplex('text node too long');
    else stack.at(-1)?.children.push(content);
  };
  parser.ontext = onText;
  parser.oncdata = onText;
  parser.ondoctype = () => {
    failure ??= assetError('ASSET_SVG_FORBIDDEN_CONTENT', 'DOCTYPE');
  };
  parser.onerror = () => {
    failure ??= assetError('ASSET_DECODE_FAILED', 'malformed XML');
  };

  try {
    parser.write(text).close();
  } catch {
    // sax rethrows a recorded error on the next write or close; the first failure is already kept.
    failure ??= assetError('ASSET_DECODE_FAILED', 'malformed XML');
  }
  if (failure) return err(failure);
  if (!root) return err(assetError('ASSET_DECODE_FAILED', 'no root element'));
  return ok(root);
}
