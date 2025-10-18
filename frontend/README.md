# Health Tracker Frontend

React 19 + TypeScript 5.8 + Vite 7 frontend with Material Design 3 design tokens.

## Tech Stack

- **React 19** - Latest React with improved performance
- **TypeScript 5.8** - Type-safe development
- **Vite 7** - Fast HMR and optimized builds
- **Material Design 3** - Modern design system with design tokens
- **TanStack Query** - Server state management
- **XState** - State machines for complex flows
- **Vitest** - Fast unit testing

## Design Tokens

The frontend uses a comprehensive Material Design 3 design token system for consistent, themeable styling. **374+ tokens** across 6 categories (colors, typography, spacing, elevation, shapes, state layers).

### Quick Start

```tsx
import { tokens, components } from '@/styles/tokens';

// Component shortcuts (fastest)
const buttonStyle = {
  borderRadius: components.button.shape,
  padding: `${components.button.paddingY} ${components.button.paddingX}`,
};

// Type-safe accessors
const cardStyle = {
  backgroundColor: tokens.color.get('surface'),
  borderRadius: tokens.shape.medium,
  padding: tokens.spacing.get(4),
  boxShadow: tokens.elevation.shadow(2),
};
```

### Documentation

See [Design Tokens Documentation](../docs/README.md#design-tokens) for:

- [Complete Overview](../docs/design-tokens.md)
- [Quick Reference](../docs/token-quick-reference.md)
- [Usage Guide](../docs/tokens-usage-guide.md)
- [Category-Specific Guides](../docs/README.md#detailed-guides)

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x';
import reactDom from 'eslint-plugin-react-dom';

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```
