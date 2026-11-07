'use client';

import { SheetFrame, u, type SheetContext } from './sheet';

// A page of a type the guideline has no further content for: it says so rather than repeat another page.
export function BeyondPage({
  context,
  rank,
}: {
  readonly context: SheetContext;
  readonly rank: number;
}) {
  return (
    <SheetFrame context={context}>
      <div className="grid h-full place-items-center">
        <p
          className="m-0 text-balance"
          style={{ fontSize: u(1.4), opacity: 0.6, maxWidth: '48ch' }}
        >
          {context.words.beyond(rank)}
        </p>
      </div>
    </SheetFrame>
  );
}
