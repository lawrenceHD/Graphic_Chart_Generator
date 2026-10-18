// Vitest (Vite) resolves `import.meta.glob` at test time. The pure-package rules forbid `node:fs`, even in
// tests, so the logo corpus is loaded this way; only the subset of the signature used here is declared.
interface ImportMeta {
  glob<T>(
    pattern: string,
    options: {
      readonly query: '?raw' | '?inline';
      readonly import: 'default';
      readonly eager: true;
    },
  ): Record<string, T>;
}
