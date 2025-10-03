// Root ESLint configuration for monorepo
// Each workspace (frontend, shared/*) has its own eslint.config.js

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/target/**',
      '**/.git/**',
      'backend/**', // Java backend uses separate linting
    ],
  },
];
