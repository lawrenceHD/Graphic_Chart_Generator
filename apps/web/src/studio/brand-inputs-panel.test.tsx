// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { EMPTY_INPUTS, type BrandInputs } from './brand-inputs-model';
import { BrandInputsPanel } from './brand-inputs-panel';
import { frMessages, renderFr } from './intl-test-utils';

const t = frMessages.brandInputs;
const png = (name: string) =>
  new File([Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0])], name);
const markdown = new File(['# Ma marque\n\nDu pain.'], 'manifeste.md');

let seen: BrandInputs = EMPTY_INPUTS;
let counter = 0;
function Harness() {
  const [value, setValue] = useState<BrandInputs>(EMPTY_INPUTS);
  return (
    <BrandInputsPanel
      value={value}
      newId={() => `id-${String(++counter)}`}
      onChange={(next) => {
        seen = next;
        setValue(next);
      }}
    />
  );
}

beforeEach(() => {
  seen = EMPTY_INPUTS;
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: () => 'blob:x' });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: () => undefined });
});
afterEach(cleanup);

describe('BrandInputsPanel (several logos and a document)', () => {
  it('takes several logos and a document in one drop, guesses the roles, first is primary', async () => {
    renderFr(<Harness />);
    fireEvent.drop(screen.getByTestId('logo-dropzone'), {
      dataTransfer: { files: [png('logo.png'), png('logo-noir.png'), png('icone.png'), markdown] },
    });
    await waitFor(() => {
      expect(screen.getAllByTestId('logo-entry')).toHaveLength(3);
    });
    expect(seen.logos.map((logo) => [logo.role, logo.primary])).toEqual([
      ['primary', true],
      ['mono-black', false],
      ['icon', false],
    ]);
    expect(seen.document?.name).toBe('manifeste.md');
    expect(screen.getByText(/manifeste\.md/u)).toBeDefined();
  });

  it('lets the person remove a logo and the document, and change a role', async () => {
    renderFr(<Harness />);
    fireEvent.drop(screen.getByTestId('logo-dropzone'), {
      dataTransfer: { files: [png('a.png'), png('b.png'), markdown] },
    });
    await waitFor(() => {
      expect(screen.getAllByTestId('logo-entry')).toHaveLength(2);
    });
    await userEvent.selectOptions(screen.getByRole('combobox'), 'mono-white');
    expect(seen.logos[1]?.role).toBe('mono-white');
    await userEvent.click(
      screen.getByRole('button', { name: t.remove.replace('{name}', 'a.png') }),
    );
    expect(seen.logos).toHaveLength(1);
    expect(seen.logos[0]).toMatchObject({ primary: true });
    await userEvent.click(
      screen.getByRole('button', { name: t.remove.replace('{name}', 'manifeste.md') }),
    );
    expect(seen.document).toBeNull();
  });

  it('takes a PDF brief as the document, read by the server (ADR-033)', async () => {
    renderFr(<Harness />);
    await userEvent.upload(
      screen.getByLabelText(frMessages.dropzone.choose),
      new File(['%PDF-1.7 x'], 'manifeste.pdf'),
    );
    expect(await screen.findByText(/manifeste\.pdf/u)).toBeDefined();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
