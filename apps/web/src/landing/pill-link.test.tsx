import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PillLink } from './pill-link';

const classesOf = (html: string): string[] =>
  (/class="([^"]*)"/u.exec(html)?.[1] ?? '').split(/\s+/u).filter((token) => token !== '');

describe('PillLink display', () => {
  it('is displayed by default', () => {
    const classes = classesOf(renderToStaticMarkup(<PillLink href="/x">Go</PillLink>));
    expect(classes).toContain('inline-flex');
    expect(classes).not.toContain('hidden');
  });

  it('hidden below a breakpoint never also carries a bare display utility (they fight, the later wins)', () => {
    const classes = classesOf(
      renderToStaticMarkup(
        <PillLink href="/x" hideBelow="lg">
          Go
        </PillLink>,
      ),
    );
    expect(classes).toContain('hidden');
    expect(classes).toContain('lg:inline-flex');
    expect(classes).not.toContain('inline-flex');
  });
});
