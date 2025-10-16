# Design Tokens Usage Guide - Health Tracker

**Generated:** 2025-10-16
**Epic:** Migrate Frontend Components to Material Design 3
**Story:** Design Token System Implementation
**Task:** Implement token build system and export configuration

## Overview

This document describes how to consume and use the Material Design 3 design tokens in the Health Tracker application. The token system provides **type-safe programmatic access** and **CSS Custom Properties** for runtime theming.

## Token Architecture

### Design Decision: CSS Custom Properties

We chose **CSS Custom Properties** as our primary token format (from Task 1 evaluation) because:

1. **Zero Runtime Cost** - No JavaScript processing, instant updates
2. **Native Theme Switching** - Change themes without component re-renders
3. **Perfect M3 Fit** - Dynamic color and surface tints work seamlessly
4. **Browser Support** - Supported in all modern browsers
5. **No Build Step** - Tokens are directly usable

### Token Layers

```
┌─────────────────────────────────────┐
│   Component Tokens (Semantic)       │  ← card.shape, button.padding
├─────────────────────────────────────┤
│   System Tokens (Role-based)        │  ← color.primary, spacing-4
├─────────────────────────────────────┤
│   Reference Tokens (Raw values)     │  ← JSON files (source of truth)
└─────────────────────────────────────┘
```

## Installation & Setup

### 1. Import Tokens in Your App

All tokens are automatically imported in `index.css`:

```css
/* frontend/src/index.css */
@import './styles/tokens/m3-light.css';
@import './styles/tokens/m3-dark.css';
@import './styles/tokens/typography.css';
@import './styles/tokens/spacing.css';
@import './styles/tokens/elevation.css';
@import './styles/tokens/shape.css';
@import './styles/tokens/state-layers.css';
```

### 2. TypeScript Module Import

For programmatic access in TypeScript/JavaScript:

```tsx
// Import all token utilities
import { tokens, components } from '@/styles/tokens';

// Or import specific utilities
import { getColorToken, getSpacingToken } from '@/styles/tokens';

// Or import theme utilities
import { setTheme, toggleTheme, initializeTheme } from '@/styles/tokens/theme';
```

## Usage Methods

There are **3 primary ways** to use design tokens:

### Method 1: CSS Custom Properties (Recommended)

**Best for:** Stylesheets, inline styles, any CSS context

```tsx
const ButtonStyle = {
  backgroundColor: 'var(--md-sys-color-primary)',
  color: 'var(--md-sys-color-on-primary)',
  borderRadius: 'var(--md-sys-shape-button)',
  padding: 'var(--md-sys-spacing-button-padding-y) var(--md-sys-spacing-button-padding-x)',
  boxShadow: 'var(--md-sys-elevation-2-shadow)',
};
```

**Pros:**

- Direct CSS access
- Theme changes are instant (no re-render)
- Works in CSS files and inline styles
- Smallest bundle size

**Cons:**

- No TypeScript type safety
- Can't validate token names at compile time

### Method 2: TypeScript Utilities (Type-Safe)

**Best for:** Components that need type safety, programmatic token access

```tsx
import { tokens } from '@/styles/tokens';

const ButtonStyle = {
  backgroundColor: tokens.color.get('primary'),
  color: tokens.color.get('on-primary'),
  borderRadius: tokens.shape.full,
  padding: `${tokens.spacing.get(3)} ${tokens.spacing.get(6)}`,
  boxShadow: tokens.elevation.shadow(2),
};
```

**Pros:**

- Full TypeScript type safety
- Autocomplete for token names
- Compile-time validation
- Organized namespace access

**Cons:**

- Slightly more verbose
- Still outputs CSS custom properties (no actual overhead)

### Method 3: Component Shortcuts (Fastest)

**Best for:** Common components with pre-configured tokens

```tsx
import { components } from '@/styles/tokens';

const ButtonStyle = {
  borderRadius: components.button.shape,
  padding: `${components.button.paddingY} ${components.button.paddingX}`,
  gap: components.button.gap,
};

const CardStyle = {
  borderRadius: components.card.shape,
  padding: components.card.padding,
  gap: components.card.gap,
  boxShadow: components.card.elevation,
};
```

**Pros:**

- Fastest to write
- Component-specific semantics
- Pre-configured for common patterns

**Cons:**

- Limited to pre-defined components
- Less flexible than direct token access

## Token Categories

### Colors

**374 color tokens** (38 light + 38 dark + state variants)

```tsx
// Method 1: CSS Custom Properties
const style = {
  backgroundColor: 'var(--md-sys-color-primary)',
  color: 'var(--md-sys-color-on-primary)',
};

// Method 2: TypeScript utilities
import { tokens } from '@/styles/tokens';

const style = {
  backgroundColor: tokens.color.get('primary'),
  color: tokens.color.get('on-primary'),
};

// Available color roles:
// primary, on-primary, primary-container, on-primary-container
// secondary, on-secondary, secondary-container, on-secondary-container
// tertiary, on-tertiary, tertiary-container, on-tertiary-container
// error, on-error, error-container, on-error-container
// background, on-background
// surface, on-surface, surface-variant, on-surface-variant
// surface-dim, surface-bright
// surface-container-lowest, surface-container-low, surface-container,
// surface-container-high, surface-container-highest
// outline, outline-variant
// inverse-surface, inverse-on-surface, inverse-primary
// scrim, shadow
```

### Typography

**75 typography tokens** (15 scales × 5 properties)

```tsx
// Method 1: CSS Custom Properties
const headingStyle = {
  fontFamily: 'var(--md-sys-typescale-headline-large-font)',
  fontSize: 'var(--md-sys-typescale-headline-large-size)',
  lineHeight: 'var(--md-sys-typescale-headline-large-line-height)',
  fontWeight: 'var(--md-sys-typescale-headline-large-weight)',
  letterSpacing: 'var(--md-sys-typescale-headline-large-tracking)',
};

// Method 2: TypeScript utilities
import { tokens } from '@/styles/tokens';

const headingStyle = tokens.typography.getAll('headline-large');
// Returns: { fontFamily, fontSize, lineHeight, fontWeight, letterSpacing }

// Available scales:
// display-large, display-medium, display-small
// headline-large, headline-medium, headline-small
// title-large, title-medium, title-small
// body-large, body-medium, body-small
// label-large, label-medium, label-small
```

### Spacing

**63+ spacing tokens** (13-value scale + 50+ component tokens)

```tsx
// Method 1: CSS Custom Properties
const cardStyle = {
  padding: 'var(--md-sys-spacing-4)', // 16px
  gap: 'var(--md-sys-spacing-2)', // 8px
};

// Method 2: TypeScript utilities
import { tokens } from '@/styles/tokens';

const cardStyle = {
  padding: tokens.spacing.get(4), // 16px
  gap: tokens.spacing.get(2), // 8px
};

// Available scales: 0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24
// Most common: spacing-4 (16px), spacing-2 (8px), spacing-6 (24px)
```

### Elevation

**30+ elevation tokens** (6 levels with shadows and tints)

```tsx
// Method 1: CSS Custom Properties
const cardStyle = {
  boxShadow: 'var(--md-sys-elevation-2-shadow)',
  zIndex: 'var(--md-sys-elevation-2-z-index)',
};

// Method 2: TypeScript utilities
import { tokens } from '@/styles/tokens';

const cardStyle = {
  boxShadow: tokens.elevation.shadow(2),
  zIndex: tokens.elevation.get(2, 'z-index'),
};

// Available levels: 0, 1, 2, 3, 4, 5
// Common: elevation-2 (cards), elevation-3 (FAB), elevation-5 (dialogs)
```

### Shapes

**50+ shape tokens** (7 scales + component shapes + asymmetric patterns)

```tsx
// Method 1: CSS Custom Properties
const buttonStyle = {
  borderRadius: 'var(--md-sys-shape-button)', // 9999px (pill)
};

const avatarStyle = {
  borderRadius: 'var(--md-sys-shape-circle)', // 50%
};

// Method 2: TypeScript utilities
import { tokens } from '@/styles/tokens';

const buttonStyle = {
  borderRadius: tokens.shape.full, // 9999px
};

const avatarStyle = {
  borderRadius: tokens.shape.circle, // 50%
};

// Available scales:
// none, extra-small, small, medium, large, extra-large, full, circle
```

### State Layers

**80+ state layer tokens** (5 states × 20+ color roles)

```tsx
// Method 1: CSS Custom Properties
const buttonHoverStyle = {
  opacity: 'var(--md-sys-state-hover-opacity)', // 0.08
};

// Method 2: TypeScript utilities
import { tokens } from '@/styles/tokens';

const buttonHoverStyle = {
  opacity: tokens.state.hover, // 0.08
};

// Available states:
// hover (8%), focus (12%), pressed (12%), dragged (16%)
// disabled content (38%), disabled container (12%)
```

## Component Examples

### Button Component

```tsx
import { components, tokens } from '@/styles/tokens';

export function Button({ variant = 'filled', children }) {
  const baseStyle = {
    borderRadius: components.button.shape,
    padding: `${components.button.paddingY} ${components.button.paddingX}`,
    gap: components.button.gap,
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.2s',
  };

  const variantStyles = {
    filled: {
      backgroundColor: tokens.color.get('primary'),
      color: tokens.color.get('on-primary'),
    },
    outlined: {
      backgroundColor: 'transparent',
      color: tokens.color.get('primary'),
      border: `1px solid ${tokens.color.get('outline')}`,
    },
    text: {
      backgroundColor: 'transparent',
      color: tokens.color.get('primary'),
    },
  };

  return <button style={{ ...baseStyle, ...variantStyles[variant] }}>{children}</button>;
}
```

### Card Component

```tsx
import { components, tokens } from '@/styles/tokens';

export function Card({ children, elevated = false }) {
  const cardStyle = {
    borderRadius: components.card.shape,
    padding: components.card.padding,
    backgroundColor: tokens.color.get('surface'),
    color: tokens.color.get('on-surface'),
    ...(elevated && {
      boxShadow: components.card.elevation,
    }),
  };

  return <div style={cardStyle}>{children}</div>;
}
```

### Form Field

```tsx
import { components, tokens } from '@/styles/tokens';

export function FormField({ label, ...props }) {
  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: components.form.labelMargin,
  };

  const labelStyle = {
    ...tokens.typography.getAll('label-large'),
    color: tokens.color.get('on-surface'),
  };

  const inputStyle = {
    padding: components.form.inputPadding,
    borderRadius: components.form.textFieldShape,
    border: `1px solid ${tokens.color.get('outline')}`,
    backgroundColor: tokens.color.get('surface'),
    color: tokens.color.get('on-surface'),
  };

  return (
    <div style={containerStyle}>
      <label style={labelStyle}>{label}</label>
      <input style={inputStyle} {...props} />
    </div>
  );
}
```

## Theme Switching

```tsx
import { setTheme, toggleTheme, getTheme, initializeTheme } from '@/styles/tokens/theme';

// Initialize theme on app load (respects user preference and system preference)
useEffect(() => {
  initializeTheme();
}, []);

// Toggle between light and dark
function handleToggleTheme() {
  const newTheme = toggleTheme();
  console.log(`Switched to ${newTheme} theme`);
}

// Set specific theme
function handleSetLightTheme() {
  setTheme('light');
}

// Get current theme
const currentTheme = getTheme(); // 'light' or 'dark'
```

## Build Scripts

### Available Scripts

```bash
# Validate token TypeScript types
npm run tokens:validate

# Check tokens before build
npm run tokens:check

# Build will automatically validate tokens (prebuild hook)
npm run build
```

### Token Validation

The `tokens:validate` script ensures:

- All token types are correctly defined
- No TypeScript errors in token exports
- Token utilities compile successfully

This runs automatically before every production build via the `prebuild` hook.

## Best Practices

### ✅ Do

- **Use component shortcuts** when available (`components.button.shape`)
- **Use TypeScript utilities** for type safety (`tokens.color.get('primary')`)
- **Use CSS Custom Properties** for maximum performance
- **Import from centralized index** (`import { tokens } from '@/styles/tokens'`)
- **Validate tokens before deployment** (`npm run tokens:check`)
- **Follow naming conventions** (kebab-case for CSS, camelCase for TS)

### ❌ Don't

- **Don't hardcode values** - Always use tokens
- **Don't create custom token names** - Use the defined system
- **Don't bypass type safety** - Use the provided utilities
- **Don't modify token files directly** - Update JSON sources
- **Don't skip prebuild validation** - It catches errors early

## Token Naming Conventions

### CSS Custom Properties

```
--md-sys-{category}-{name}
```

Examples:

- `--md-sys-color-primary`
- `--md-sys-spacing-4`
- `--md-sys-elevation-2-shadow`
- `--md-sys-shape-button`
- `--md-sys-state-hover-opacity`

### TypeScript Utilities

```tsx
tokens.{category}.{method}({arguments})
```

Examples:

- `tokens.color.get('primary')`
- `tokens.spacing.get(4)`
- `tokens.elevation.shadow(2)`
- `tokens.shape.full`
- `tokens.state.hover`

### Component Shortcuts

```tsx
components.{component}.{property}
```

Examples:

- `components.button.shape`
- `components.card.padding`
- `components.form.fieldGap`

## Migration from Hardcoded Values

### Before (Hardcoded)

```tsx
const buttonStyle = {
  backgroundColor: '#2E7D32',
  color: '#FFFFFF',
  borderRadius: '9999px',
  padding: '12px 24px',
  boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.3), 0px 2px 6px 2px rgba(0, 0, 0, 0.15)',
};
```

### After (Token-Based)

```tsx
import { components, tokens } from '@/styles/tokens';

const buttonStyle = {
  backgroundColor: tokens.color.get('primary'),
  color: tokens.color.get('on-primary'),
  borderRadius: components.button.shape,
  padding: `${components.button.paddingY} ${components.button.paddingX}`,
  boxShadow: tokens.elevation.shadow(2),
};
```

**Benefits:**

- Theme switching works automatically
- Consistent with M3 specifications
- Type-safe token names
- Maintainable and scalable

## Troubleshooting

### Token Not Working

**Problem:** Token value not applied

**Solution:**

1. Verify CSS is imported in `index.css`
2. Check browser DevTools → Computed styles
3. Ensure token name is correct (check type hints)
4. Run `npm run tokens:validate` to check for errors

### TypeScript Errors

**Problem:** TypeScript complains about token types

**Solution:**

1. Run `npm run tokens:validate` to see specific errors
2. Ensure you're importing from `@/styles/tokens`
3. Check that token name is spelled correctly
4. Verify TypeScript version is 5.8+

### Theme Not Switching

**Problem:** Theme change doesn't apply

**Solution:**

1. Verify `initializeTheme()` is called on app mount
2. Check that `data-theme` attribute is set on `<html>` element
3. Ensure dark theme CSS is imported (`m3-dark.css`)
4. Inspect browser DevTools → Elements → html[data-theme]

## Resources

- [Token JSON Definitions](../frontend/src/styles/tokens/)
- [Color Tokens Guide](./color-tokens-guide.md)
- [Typography Guide](./typography-guide.md)
- [Spacing Guide](./spacing-guide.md)
- [Elevation Guide](./elevation-guide.md)
- [Shape Guide](./shape-guide.md)
- [State Layers Guide](./state-layers-guide.md)
- [Material Design 3 Tokens](https://m3.material.io/foundations/design-tokens/overview)

---

**Files:**

- `frontend/src/styles/tokens/index.ts` - Main token export module
- `frontend/src/styles/tokens/types.ts` - TypeScript type definitions
- `frontend/src/styles/tokens/theme.ts` - Theme switching utilities
- `frontend/package.json` - Build scripts (`tokens:validate`, `tokens:check`)
- `docs/tokens-usage-guide.md` - This documentation
