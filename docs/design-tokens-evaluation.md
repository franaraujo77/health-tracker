# Design Token Tooling Evaluation for Material Design 3 Migration

**Date:** 2025-10-16
**Author:** Development Team
**Epic:** Migrate Frontend Components to Material Design 3
**Story:** Design Token System Implementation

## Executive Summary

This document evaluates four design token tooling approaches for implementing Material Design 3 (M3) in the health-tracker frontend application. Based on our technical stack (React 19, Vite 7, TypeScript 5.8) and M3's dynamic color requirements, **we recommend CSS Custom Properties as the primary solution with Style Dictionary for token generation**.

## Current Stack Context

- **Build Tool:** Vite 7.1.7 (ESM-native, extremely fast HMR)
- **Framework:** React 19.1.1 (latest with concurrent features)
- **Language:** TypeScript 5.8.3
- **State Management:** XState 5.22.0
- **No existing design system or CSS-in-JS library**

## Evaluation Criteria

1. **Vite Integration** - Build tool compatibility and HMR performance
2. **M3 Dynamic Color Support** - Runtime theme switching capability
3. **TypeScript Support** - Type-safe token consumption
4. **Developer Experience** - Learning curve, debugging, documentation
5. **Performance** - Bundle size, runtime overhead, theme switching speed
6. **Maintenance** - Community support, future-proofing, extensibility

## Option 1: CSS Custom Properties (Native)

### Overview

Browser-native CSS variables that enable runtime theming without build-time compilation.

### Pros

✅ **Zero build-time dependencies** - Native browser feature
✅ **Perfect M3 fit** - Runtime theme switching is instant (no page reload)
✅ **Excellent Vite integration** - Works seamlessly with Vite's CSS handling
✅ **TypeScript support via declaration files** - Type-safe token consumption
✅ **Superior performance** - No JS runtime overhead, browser-optimized
✅ **Cascade-aware** - Can scope tokens to components naturally
✅ **DevTools friendly** - Easily inspectable in browser developer tools
✅ **Progressive enhancement** - Fallback values built-in

### Cons

❌ **Manual token generation** - Need to create CSS variable definitions manually or via tooling
❌ **No built-in transforms** - Color manipulation requires custom functions
❌ **Limited validation** - Type checking only at consumption, not definition

### M3 Dynamic Color Example

```css
/* Light theme */
:root {
  --md-sys-color-primary: rgb(103, 80, 164);
  --md-sys-color-on-primary: rgb(255, 255, 255);
  --md-sys-color-surface: rgb(255, 251, 254);
}

/* Dark theme */
[data-theme='dark'] {
  --md-sys-color-primary: rgb(208, 188, 255);
  --md-sys-color-on-primary: rgb(56, 30, 114);
  --md-sys-color-surface: rgb(20, 18, 24);
}
```

### TypeScript Integration

```typescript
// src/styles/tokens.d.ts
export interface DesignTokens {
  'md-sys-color-primary': string;
  'md-sys-color-on-primary': string;
  'md-sys-color-surface': string;
  // ... all M3 tokens
}

// Usage in components
import type { DesignTokens } from './styles/tokens';

const primaryColor = `var(--md-sys-color-primary)`;
```

### Performance Characteristics

- **Bundle Impact:** 0 KB (native CSS)
- **Runtime Cost:** Negligible (browser-optimized)
- **Theme Switch Time:** < 16ms (instant repaint)
- **HMR Performance:** Excellent with Vite

### Recommendation Score: 9.5/10

---

## Option 2: Style Dictionary

### Overview

Token transformation platform that generates CSS Custom Properties, SCSS, JS, and more from design token JSON/YAML files.

### Pros

✅ **Multi-platform output** - Generates CSS vars, SCSS, JS, iOS, Android tokens
✅ **Token validation** - Schema validation at build time
✅ **Transform system** - Built-in color manipulation, unit conversion
✅ **Excellent documentation** - Well-maintained by Amazon
✅ **TypeScript generation** - Can output TS type definitions
✅ **Composable tokens** - Reference tokens from other tokens
✅ **Vite integration** - Works as pre-build step or Vite plugin

### Cons

❌ **Build-time only** - Requires compilation step
❌ **Additional complexity** - Need to learn token format and transforms
❌ **Configuration overhead** - Requires setup and build pipeline integration

### M3 Token Definition Example

```json
{
  "color": {
    "primary": {
      "light": { "value": "#6750A4" },
      "dark": { "value": "#D0BCFF" }
    },
    "surface": {
      "light": { "value": "#FFFBFE" },
      "dark": { "value": "#141218" }
    }
  }
}
```

### Output (CSS Custom Properties)

```css
:root {
  --color-primary-light: #6750a4;
  --color-primary-dark: #d0bcff;
}
```

### Vite Integration

```javascript
// vite.config.ts
import { defineConfig } from 'vite';
import StyleDictionary from 'style-dictionary';

export default defineConfig({
  plugins: [
    {
      name: 'style-dictionary',
      buildStart() {
        StyleDictionary.buildPlatform('css');
      },
    },
  ],
});
```

### Performance Characteristics

- **Bundle Impact:** CSS output size (no JS runtime)
- **Build Time:** ~100-500ms (acceptable with Vite)
- **Runtime Cost:** 0 (outputs CSS Custom Properties)
- **HMR Performance:** Good (Vite watches generated files)

### Recommendation Score: 8.5/10

---

## Option 3: Theo (Salesforce)

### Overview

Salesforce's design token generation tool, similar to Style Dictionary but with Lightning Design System heritage.

### Pros

✅ **Battle-tested** - Powers Salesforce Lightning Design System
✅ **Multiple output formats** - CSS, SCSS, JS, JSON, iOS, Android
✅ **Transform functions** - Color manipulation, aliasing
✅ **Good documentation** - Comprehensive guides from Salesforce

### Cons

❌ **Less active maintenance** - Fewer updates compared to Style Dictionary
❌ **Salesforce-centric** - Optimized for Lightning, may have unnecessary features
❌ **Smaller community** - Less Stack Overflow/GitHub support
❌ **No official Vite plugin** - Requires custom integration

### Recommendation Score: 6/10

_Not recommended due to maintenance concerns and Salesforce-specific optimizations_

---

## Option 4: Design Tokens (Figma Tokens Plugin)

### Overview

Figma plugin that syncs design tokens from Figma to code repositories, often paired with Style Dictionary.

### Pros

✅ **Designer-developer sync** - Direct Figma integration
✅ **Visual token management** - Non-technical users can update tokens
✅ **Version control** - Can commit token changes via GitHub

### Cons

❌ **Requires Figma** - Additional tool dependency
❌ **Not standalone** - Still needs Style Dictionary or similar for code generation
❌ **Sync complexity** - Additional workflow step (Figma → GitHub → Build)
❌ **M3 token structure may not match Figma's hierarchy**

### Recommendation Score: 5/10

_Useful for design-heavy teams, but adds complexity for our use case_

---

## Recommended Solution: Hybrid Approach

### Primary: CSS Custom Properties + Material Theme Builder

**Use CSS Custom Properties as the runtime solution** because:

1. M3's dynamic color requires runtime theme switching
2. Zero performance overhead
3. Perfect Vite integration
4. Native browser support (IE11 not a concern in 2025)

**Generate tokens using Material Theme Builder**:

- Google's official M3 token generator: https://m3.material.io/theme-builder
- Outputs complete M3 color schemes (light/dark)
- Provides CSS Custom Property format directly

### Secondary: Style Dictionary (Optional Enhancement)

Add Style Dictionary **only if** we need:

- Multi-platform token output (iOS/Android mobile apps)
- Complex token transformations (color manipulation beyond M3)
- Design token validation in CI/CD

### Implementation Plan

```
src/styles/
├── tokens/
│   ├── m3-light.css          # Generated from Material Theme Builder
│   ├── m3-dark.css           # Generated from Material Theme Builder
│   ├── tokens.d.ts           # TypeScript definitions
│   └── README.md             # Token usage guide
├── theme.ts                   # Theme switching logic
└── index.css                  # Global styles
```

### Sample Implementation

**src/styles/tokens/m3-light.css**

```css
:root {
  /* Primary */
  --md-sys-color-primary: rgb(103, 80, 164);
  --md-sys-color-on-primary: rgb(255, 255, 255);
  --md-sys-color-primary-container: rgb(234, 221, 255);
  --md-sys-color-on-primary-container: rgb(33, 0, 94);

  /* Surface */
  --md-sys-color-surface: rgb(255, 251, 254);
  --md-sys-color-on-surface: rgb(28, 27, 31);
  --md-sys-color-surface-variant: rgb(231, 224, 236);
  --md-sys-color-on-surface-variant: rgb(73, 69, 79);

  /* ... all M3 color tokens */

  /* Typography */
  --md-sys-typescale-display-large-font: 'Roboto';
  --md-sys-typescale-display-large-size: 57px;
  --md-sys-typescale-display-large-weight: 400;

  /* Elevation */
  --md-sys-elevation-level1: 0px 1px 2px rgba(0, 0, 0, 0.3);
  --md-sys-elevation-level2: 0px 2px 6px rgba(0, 0, 0, 0.15);
}
```

**src/styles/theme.ts**

```typescript
export type Theme = 'light' | 'dark';

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);

  // Load corresponding CSS Custom Properties
  if (theme === 'dark') {
    import('./tokens/m3-dark.css');
  } else {
    import('./tokens/m3-light.css');
  }
}

// React hook for theme switching
export function useTheme() {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return { theme, setTheme };
}
```

**src/styles/tokens/tokens.d.ts**

```typescript
export type MDColorToken =
  | 'md-sys-color-primary'
  | 'md-sys-color-on-primary'
  | 'md-sys-color-surface'
  | 'md-sys-color-on-surface';
// ... all M3 tokens

export function cssVar(token: MDColorToken): string;
```

### Benefits of This Approach

1. **Fast Development** - No build tool setup, use Material Theme Builder directly
2. **M3 Compliance** - Official Google token structure
3. **Performance** - Native CSS, instant theme switching
4. **Type Safety** - TypeScript definitions for token consumption
5. **Future-Proof** - Can add Style Dictionary later without refactoring
6. **Vite Optimized** - CSS is tree-shaken and minified automatically

## Migration Path

If we later need Style Dictionary:

1. Convert CSS Custom Properties to Style Dictionary JSON format
2. Add build script to `package.json`
3. Keep existing CSS var consumption code (zero changes needed)
4. Benefit from validation and multi-platform output

## Decision

**✅ Recommended:** CSS Custom Properties + Material Theme Builder

**Rationale:**

- Simplest solution that meets all M3 requirements
- Zero performance overhead
- Perfect Vite integration
- Allows future enhancement with Style Dictionary without refactoring
- Official M3 token structure via Material Theme Builder

**Next Steps:**

1. Generate M3 color schemes using Material Theme Builder
2. Create `src/styles/tokens/` directory structure
3. Implement theme switching logic with XState
4. Create TypeScript type definitions for tokens
5. Document token usage patterns

---

## References

- [Material Design 3 Color System](https://m3.material.io/styles/color/system/overview)
- [Material Theme Builder](https://m3.material.io/theme-builder)
- [CSS Custom Properties (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
- [Style Dictionary Documentation](https://amzn.github.io/style-dictionary/)
- [Vite CSS Features](https://vitejs.dev/guide/features.html#css)

## Appendix: M3 Token Structure

Material Design 3 defines 5 token categories:

1. **Color Tokens** (~40 tokens for light + dark themes)
   - Primary, Secondary, Tertiary
   - Surface, Background
   - Error, Warning, Success

2. **Typography Tokens** (~15 type scales)
   - Display, Headline, Title, Body, Label

3. **Elevation Tokens** (5 levels)
   - Level 0-5 shadow definitions

4. **Shape Tokens** (3 sizes)
   - Small, Medium, Large corner radius

5. **State Tokens** (interaction states)
   - Hover, Focus, Press, Drag

**Total Estimated Tokens:** ~120 tokens for complete M3 implementation
