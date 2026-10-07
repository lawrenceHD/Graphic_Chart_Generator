/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Circular dependencies are strictly forbidden',
      from: {},
      to: {
        circular: true,
      },
    },
    {
      name: 'packages-cannot-import-apps',
      severity: 'error',
      comment: 'Packages must never import from apps',
      from: {
        path: '^packages/',
      },
      to: {
        path: '^apps/|^@app/(web|worker)',
      },
    },
    {
      name: 'contracts-no-internal-deps',
      severity: 'error',
      comment: 'contracts must have no internal dependencies',
      from: {
        path: '^packages/contracts/',
      },
      to: {
        path: '^(packages/(?!contracts/)|apps/)|^@app/(?!contracts$)',
      },
    },
    {
      name: 'color-engine-no-internal-deps',
      severity: 'error',
      comment: 'color-engine must have no internal dependencies',
      from: {
        path: '^packages/color-engine/',
      },
      to: {
        path: '^(packages/(?!color-engine/)|apps/)|^@app/(?!color-engine$)',
      },
    },
    {
      name: 'document-restricted-deps',
      severity: 'error',
      comment: 'document can only depend on contracts and color-engine',
      from: {
        path: '^packages/document/',
      },
      to: {
        path: '^(packages/(?!(document|contracts|color-engine)/)|apps/)|^@app/(?!(document|contracts|color-engine)$)',
      },
    },
    {
      name: 'svg-engine-restricted-deps',
      severity: 'error',
      comment: 'svg-engine can only depend on contracts',
      from: {
        path: '^packages/svg-engine/',
      },
      to: {
        path: '^(packages/(?!(svg-engine|contracts)/)|apps/)|^@app/(?!(svg-engine|contracts)$)',
      },
    },
    {
      name: 'logo-kit-restricted-deps',
      severity: 'error',
      comment: 'logo-kit can only depend on svg-engine, color-engine, contracts',
      from: {
        path: '^packages/logo-kit/',
      },
      to: {
        path: '^(packages/(?!(logo-kit|svg-engine|color-engine|contracts)/)|apps/)|^@app/(?!(logo-kit|svg-engine|color-engine|contracts)$)',
      },
    },
    {
      name: 'mockup-engine-restricted-deps',
      severity: 'error',
      comment: 'mockup-engine can only depend on contracts',
      from: {
        path: '^packages/mockup-engine/',
      },
      to: {
        path: '^(packages/(?!(mockup-engine|contracts)/)|apps/)|^@app/(?!(mockup-engine|contracts)$)',
      },
    },
    {
      name: 'db-restricted-deps',
      severity: 'error',
      comment: 'db can only depend on contracts',
      from: {
        path: '^packages/db/',
      },
      to: {
        path: '^(packages/(?!(db|contracts)/)|apps/)|^@app/(?!(db|contracts)$)',
      },
    },
    {
      name: 'ai-restricted-deps',
      severity: 'error',
      comment: 'ai can only depend on contracts and document',
      from: {
        path: '^packages/ai/',
      },
      to: {
        path: '^(packages/(?!(ai|contracts|document)/)|apps/)|^@app/(?!(ai|contracts|document)$)',
      },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    tsConfig: {
      fileName: 'tsconfig.base.json',
    },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
      mainFields: ['module', 'main', 'types'],
    },
  },
};
