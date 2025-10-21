import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import security from 'eslint-plugin-security';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import importPlugin from 'eslint-plugin-import';
import testingLibrary from 'eslint-plugin-testing-library';
import jestDom from 'eslint-plugin-jest-dom';
import prettierConfig from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist']),
  // Type-checked rules for source files (excluding tests for performance)
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['**/*.test.{ts,tsx}', '**/__tests__/**'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      tseslint.configs.stylisticTypeChecked,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
      security.configs.recommended,
      jsxA11y.flatConfigs.recommended,
      prettierConfig, // Must be last to disable conflicting rules
    ],
    plugins: {
      import: importPlugin,
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        projectService: {
          allowDefaultProject: ['*.ts', '*.tsx'],
        },
        tsconfigRootDir: import.meta.dirname,
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: '19.0',
      },
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json',
        },
        node: true,
      },
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts', '.tsx'],
      },
    },
    rules: {
      // Import ordering and organization
      'import/order': [
        'warn',
        {
          groups: [
            'builtin', // Node.js built-in modules
            'external', // External packages
            'internal', // Internal modules
            ['parent', 'sibling'], // Relative imports
            'type', // TypeScript type imports
            'index', // Index imports
          ],
          pathGroups: [
            {
              pattern: 'react',
              group: 'builtin',
              position: 'before',
            },
            {
              pattern: '@/**',
              group: 'internal',
            },
          ],
          pathGroupsExcludedImportTypes: ['react'],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
      'import/no-duplicates': 'error',
      'import/no-unresolved': 'error',
      'import/named': 'error',
      'import/default': 'off', // Disabled for React 19 (no default export)
      'import/namespace': 'error',
      'import/no-absolute-path': 'error',
      'import/no-cycle': 'warn',
      'import/no-self-import': 'error',
      'import/newline-after-import': 'warn',
      // React 19-specific rules
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': [
        'warn',
        {
          allowConstantExport: true,
          allowExportNames: ['meta', 'links', 'headers', 'loader', 'action'],
        },
      ],
      // TypeScript strict rules - warnings for gradual adoption
      '@typescript-eslint/explicit-function-return-type': [
        'warn',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
        },
      ],
      // Type safety rules - downgrade to warnings for gradual migration
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-misused-promises': 'warn',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/prefer-promise-reject-errors': 'warn',
      // Style rules
      '@typescript-eslint/no-inferrable-types': 'warn',
      '@typescript-eslint/no-empty-function': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'warn',
      '@typescript-eslint/array-type': 'warn',
      '@typescript-eslint/prefer-regexp-exec': 'warn',
      '@typescript-eslint/restrict-template-expressions': 'warn',
      '@typescript-eslint/naming-convention': [
        'warn',
        {
          selector: 'interface',
          format: ['PascalCase'],
          custom: {
            regex: '^I[A-Z]',
            match: false,
          },
        },
        {
          selector: 'typeAlias',
          format: ['PascalCase'],
        },
        {
          selector: 'enum',
          format: ['PascalCase'],
        },
      ],
    },
  },
  // Test files: basic rules without type checking + testing-library rules
  {
    files: ['**/*.test.{ts,tsx}', '**/__tests__/**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      security.configs.recommended,
      jsxA11y.flatConfigs.recommended,
      testingLibrary.configs['flat/react'],
      jestDom.configs['flat/recommended'],
      prettierConfig, // Must be last to disable conflicting rules
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        ...globals.jest,
      },
    },
    rules: {
      // Relax rules for test files
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      // Testing Library best practices
      'testing-library/prefer-screen-queries': 'error',
      'testing-library/no-await-sync-events': 'error',
      'testing-library/no-wait-for-multiple-assertions': 'error',
      'testing-library/prefer-user-event': 'warn',
      // Jest-DOM best practices
      'jest-dom/prefer-checked': 'warn',
      'jest-dom/prefer-enabled-disabled': 'warn',
      'jest-dom/prefer-required': 'warn',
      'jest-dom/prefer-to-have-attribute': 'warn',
    },
  },
  // E2e and config files: basic rules without type checking
  {
    files: ['e2e/**/*.{ts,tsx}', '*.config.ts'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      security.configs.recommended,
      jsxA11y.flatConfigs.recommended,
      prettierConfig, // Must be last to disable conflicting rules
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
]);
