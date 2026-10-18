// Messages exchanged over IPC with the rasterisation child (child.ts). Kept free of runtime code so that
// the child, run directly from TypeScript in tests, only needs `import type` from here.
export type ChildRequest =
  | { readonly kind: 'render'; readonly svg: string; readonly width: number }
  | { readonly kind: 'bbox'; readonly svg: string };

export type ChildResponse =
  | {
      readonly kind: 'render';
      readonly png: Uint8Array;
      readonly rgba: Uint8Array;
      readonly width: number;
      readonly height: number;
    }
  | {
      readonly kind: 'bbox';
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
    }
  | { readonly kind: 'failure'; readonly reason: string };
