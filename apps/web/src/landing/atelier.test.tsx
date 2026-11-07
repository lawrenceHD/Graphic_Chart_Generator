// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';
import fr from '../../messages/fr.json' with { type: 'json' };
import productFr from '../../messages/product.fr.json' with { type: 'json' };
import { Atelier } from './atelier';
import { listExamples } from './example-source';

afterEach(cleanup);

describe('Atelier example selector', () => {
  const examples = listExamples();
  const show = () =>
    render(
      <NextIntlClientProvider locale="fr" messages={{ ...fr, ...productFr }}>
        <Atelier examples={examples} />
      </NextIntlClientProvider>,
    );

  it('offers every example of the set', () => {
    show();
    for (const example of examples) {
      expect(screen.getByRole('radio', { name: example.name })).toBeTruthy();
    }
  });

  it('starts on the first example, then follows the selection: palette, contrast, tokens', async () => {
    show();
    const [first, second] = examples;
    if (first === undefined || second === undefined) throw new Error('needs two examples');
    expect(screen.getByRole('radio', { name: first.name })).toHaveProperty('checked', true);
    expect(screen.getByText(first.colors[0]?.hex ?? '')).toBeTruthy();

    await userEvent.click(screen.getByRole('radio', { name: second.name }));

    expect(screen.getByRole('radio', { name: second.name })).toHaveProperty('checked', true);
    expect(screen.getByText(second.colors[0]?.hex ?? '')).toBeTruthy();
    expect(screen.getByText(second.tokens[0] ?? '', { exact: false })).toBeTruthy();
    expect(screen.queryByText(first.colors[0]?.hex ?? '')).toBeNull();
  });
});
