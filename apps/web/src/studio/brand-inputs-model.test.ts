import { describe, expect, it } from 'vitest';
import {
  EMPTY_INPUTS,
  addLogo,
  primaryLogo,
  removeLogo,
  setDocument,
  setPrimary,
  setRole,
  toUploads,
} from './brand-inputs-model';

const file = (name: string): File => new File([new Uint8Array([1])], name);
let counter = 0;
const id = (): string => `id-${String(++counter)}`;

describe('brand inputs (several logos, one primary, an optional document)', () => {
  it('makes the first logo primary whatever its name suggests', () => {
    const state = addLogo(EMPTY_INPUTS, file('logo-noir.svg'), id).state;
    expect(state.logos).toHaveLength(1);
    expect(state.logos[0]).toMatchObject({ primary: true, role: 'primary' });
  });

  it('detects the role of the next logos from their name and keeps one primary', () => {
    let state = addLogo(EMPTY_INPUTS, file('logo.svg'), id).state;
    state = addLogo(state, file('logo-horizontal.svg'), id).state;
    state = addLogo(state, file('favicon.png'), id).state;
    expect(state.logos.map((logo) => [logo.role, logo.primary])).toEqual([
      ['primary', true],
      ['horizontal', false],
      ['icon', false],
    ]);
  });

  it('refuses a seventh logo and says so', () => {
    let state = EMPTY_INPUTS;
    for (let index = 0; index < 6; index += 1)
      state = addLogo(state, file(`l${String(index)}.svg`), id).state;
    const seventh = addLogo(state, file('l7.svg'), id);
    expect(seventh.state.logos).toHaveLength(6);
    expect(seventh.error).toBe('TOO_MANY_LOGOS');
  });

  it('changes the primary: the old one gets a role from its name, the new one is "primary"', () => {
    let state = addLogo(EMPTY_INPUTS, file('logo-blanc.svg'), () => 'a').state;
    state = addLogo(state, file('logo-horizontal.svg'), () => 'b').state;
    state = setPrimary(state, 'b');
    expect(state.logos.map((logo) => [logo.id, logo.role, logo.primary])).toEqual([
      ['a', 'mono-white', false],
      ['b', 'primary', true],
    ]);
  });

  it('changes the role of a variant but never of the primary', () => {
    let state = addLogo(EMPTY_INPUTS, file('a.svg'), () => 'a').state;
    state = addLogo(state, file('b.svg'), () => 'b').state;
    state = setRole(state, 'b', 'mono-white');
    state = setRole(state, 'a', 'icon');
    expect(state.logos.map((logo) => logo.role)).toEqual(['primary', 'mono-white']);
  });

  it('promotes the next logo when the primary is removed', () => {
    let state = addLogo(EMPTY_INPUTS, file('a.svg'), () => 'a').state;
    state = addLogo(state, file('b.svg'), () => 'b').state;
    state = removeLogo(state, 'a');
    expect(state.logos).toHaveLength(1);
    expect(state.logos[0]).toMatchObject({ id: 'b', primary: true, role: 'primary' });
    expect(removeLogo(state, 'b').logos).toHaveLength(0);
  });

  it('holds at most one document, replaced by the next one and removable', () => {
    let state = setDocument(EMPTY_INPUTS, file('a.md'));
    state = setDocument(state, file('b.docx'));
    expect(state.document?.name).toBe('b.docx');
    expect(setDocument(state, null).document).toBeNull();
  });

  it('lists the uploads: logos first (primary first), then the document, with declared roles', () => {
    let state = addLogo(EMPTY_INPUTS, file('icon.svg'), () => 'a').state;
    state = addLogo(state, file('logo.svg'), () => 'b').state;
    state = setPrimary(state, 'b');
    state = setDocument(state, file('manifeste.md'));
    expect(primaryLogo(state)?.name).toBe('logo.svg');
    expect(toUploads(state).map((upload) => [upload.file.name, upload.declaration])).toEqual([
      ['logo.svg', { kind: 'logo_original', role: 'primary', primary: true }],
      ['icon.svg', { kind: 'logo_original', role: 'icon', primary: false }],
      ['manifeste.md', { kind: 'brief_doc' }],
    ]);
  });
});
