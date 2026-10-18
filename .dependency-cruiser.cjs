// Allowed internal dependencies per package (ADR-017). Each package may also import itself.
const ALLOWED = {
  kernel: [],
  contracts: ['kernel'],
  'color-engine': ['kernel'],
  document: ['kernel', 'contracts', 'color-engine'],
  'svg-engine': ['kernel', 'contracts'],
  'logo-kit': ['kernel', 'contracts', 'svg-engine', 'color-engine'],
  'mockup-engine': ['kernel', 'contracts'],
  db: ['kernel', 'contracts'],
  ai: ['kernel', 'contracts', 'document'],
};

const PURE_PACKAGES = ['kernel', 'color-engine', 'document', 'logo-kit', 'svg-engine'];

function packageRule(name, allowed) {
  const ok = [name, ...allowed].join('|');
  return {
    name: `${name}-restricted-deps`,
    severity: 'error',
    comment: allowed.length
      ? `${name} can only depend on ${allowed.join(', ')} (ADR-017)`
      : `${name} must have no internal dependencies (ADR-017)`,
    from: { path: `^packages/${name}/` },
    to: { path: `^(packages/(?!(${ok})/)|apps/)|^@app/(?!(${ok})$)` },
  };
}

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Circular dependencies are strictly forbidden',
      from: {},
      to: { circular: true },
    },
    {
      name: 'packages-cannot-import-apps',
      severity: 'error',
      comment: 'Packages must never import from apps',
      from: { path: '^packages/' },
      to: { path: '^apps/|^@app/(web|worker)' },
    },
    {
      name: 'apps-cannot-import-each-other',
      severity: 'error',
      comment: 'web and worker share code through packages only',
      from: { path: '^apps/(web|worker)/' },
      to: { path: '^apps/(?!$1/)' },
    },
    ...Object.entries(ALLOWED).map(([name, allowed]) => packageRule(name, allowed)),
    {
      name: 'pure-packages-no-node-builtins',
      severity: 'error',
      comment:
        'Pure packages never touch Node.js (ADR-016); only svg-engine raster (source and build) may',
      from: {
        path: `^packages/(${PURE_PACKAGES.join('|')})/`,
        pathNot: '^packages/svg-engine/(src|dist)/raster/',
      },
      to: { dependencyTypes: ['core'] },
    },
    {
      name: 'mockup-engine-browser-only',
      severity: 'error',
      comment: 'mockup-engine runs in the browser only (ADR-016)',
      from: { path: '^packages/mockup-engine/' },
      to: { dependencyTypes: ['core'] },
    },
    {
      name: 'raster-only-from-worker',
      severity: 'error',
      comment: 'ADR-016: the Node rasterizer is imported by apps/worker and its own tests only',
      from: { pathNot: '^(apps/worker/|packages/svg-engine/(src|dist)/raster/)' },
      to: { path: '^packages/svg-engine/(src|dist)/raster/' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.base.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
      mainFields: ['module', 'main', 'types'],
    },
  },
};
