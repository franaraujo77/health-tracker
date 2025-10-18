# Material Design 3 Design Tokens - Health Tracker

**Generated:** 2025-10-16
**Epic:** Migrate Frontend Components to Material Design 3
**Story:** Design Token System Implementation

## Overview

This document provides a comprehensive overview of the Material Design 3 design token system implemented for the Health Tracker application. Design tokens are the **single source of truth** for all visual design decisions, providing centralized, maintainable styling values.

## What Are Design Tokens?

Design tokens are **named entities that store visual design attributes**. They replace hardcoded values with semantic names, enabling:

- **Consistency** - One source of truth for all visual properties
- **Maintainability** - Update once, apply everywhere
- **Scalability** - Easy to extend and customize
- **Themability** - Switch themes without code changes
- **Type Safety** - TypeScript validation for token names

### Example Transformation

**Before (Hardcoded):**

```tsx
const buttonStyle = {
  backgroundColor: '#2E7D32',
  padding: '12px 24px',
  borderRadius: '9999px',
};
```

**After (Token-Based):**

```tsx
const buttonStyle = {
  backgroundColor: 'var(--md-sys-color-primary)',
  padding: 'var(--md-sys-spacing-button-padding-y) var(--md-sys-spacing-button-padding-x)',
  borderRadius: 'var(--md-sys-shape-button)',
};
```

## Token Architecture

### Three-Layer System

```
┌─────────────────────────────────────────────────────────┐
│ Component Tokens (Semantic)                             │
│ - button.shape, card.padding, dialog.elevation          │
│ - Semantic names tied to specific components            │
│ - Example: components.button.shape                      │
├─────────────────────────────────────────────────────────┤
│ System Tokens (Role-Based)                              │
│ - color-primary, spacing-4, elevation-2-shadow          │
│ - Generic purpose, reusable across components           │
│ - Example: tokens.color.get('primary')                  │
├─────────────────────────────────────────────────────────┤
│ Reference Tokens (Raw Values)                           │
│ - JSON source files with raw values                     │
│ - #2E7D32, 16px, 0px 1px 2px rgba(0,0,0,0.3)           │
│ - Transformed into CSS Custom Properties                │
└─────────────────────────────────────────────────────────┘
```

### Design Decision: CSS Custom Properties

We chose **CSS Custom Properties** as our token format because:

1. **Zero Runtime Cost** - No JavaScript bundle overhead
2. **Instant Theme Switching** - Changes apply without re-renders
3. **Perfect M3 Fit** - Dynamic color and surface tints work seamlessly
4. **Browser Support** - All modern browsers supported
5. **No Build Step** - Tokens are directly usable

## Token Categories

### 1. Colors (76 tokens)

**38 light theme + 38 dark theme color roles**

Material Design 3 uses a sophisticated color system with semantic roles:

- **Primary** - Main brand color for key actions
- **Secondary** - Supporting brand color for less prominent actions
- **Tertiary** - Accent color for highlights
- **Error** - Error states and destructive actions
- **Surface** - Background colors for components
- **Containers** - Color pairs with backgrounds and text

**Documentation:** [Color Tokens Guide](./color-tokens-guide.md)
**Files:** `frontend/src/styles/tokens/m3-light.css`, `m3-dark.css`

**Quick Example:**

```tsx
backgroundColor: 'var(--md-sys-color-primary)',
color: 'var(--md-sys-color-on-primary)',
```

### 2. Typography (75 tokens)

**15 type scales × 5 properties = 75 tokens**

M3 defines 15 semantic type scales organized into 5 categories:

- **Display** - Large hero text (large, medium, small)
- **Headline** - Section headers (large, medium, small)
- **Title** - Subsection titles (large, medium, small)
- **Body** - Main content text (large, medium, small)
- **Label** - UI labels and buttons (large, medium, small)

**Documentation:** [Typography Guide](./typography-guide.md)
**Files:** `frontend/src/styles/tokens/typography.json`, `typography.css`

**Quick Example:**

```tsx
...tokens.typography.getAll('headline-large')
// Returns: { fontFamily, fontSize, lineHeight, fontWeight, letterSpacing }
```

### 3. Spacing (63+ tokens)

**13-value scale + 50+ component-specific tokens**

M3 uses an **8px baseline grid** for consistent spacing:

- **Base scales:** 0, 1 (4px), 2 (8px), 3 (12px), 4 (16px), 5 (20px), 6 (24px), 8 (32px), 10 (40px), 12 (48px), 16 (64px), 20 (80px), 24 (96px)
- **Most common:** spacing-4 (16px), spacing-2 (8px), spacing-6 (24px)
- **Component tokens:** button-padding, card-gap, form-field-gap, etc.

**Documentation:** [Spacing Guide](./spacing-guide.md)
**Files:** `frontend/src/styles/tokens/spacing.json`, `spacing.css`

**Quick Example:**

```tsx
padding: 'var(--md-sys-spacing-4)', // 16px
gap: 'var(--md-sys-spacing-2)', // 8px
```

### 4. Elevation (30+ tokens)

**6 elevation levels (0-5) with shadows and surface tints**

M3 uses a two-part elevation system:

- **Shadows** - Depth perception through two-layer shadows
- **Surface Tints** - Primary color overlays that increase with elevation
- **Levels:** 0 (none), 1 (1dp), 2 (3dp), 3 (6dp), 4 (8dp), 5 (12dp)

**Documentation:** [Elevation Guide](./elevation-guide.md)
**Files:** `frontend/src/styles/tokens/elevation.json`, `elevation.css`

**Quick Example:**

```tsx
boxShadow: 'var(--md-sys-elevation-2-shadow)',
zIndex: 'var(--md-sys-elevation-2-z-index)',
```

### 5. Shape (50+ tokens)

**7 shape scales + component shapes + asymmetric patterns**

M3 embraces rounded corners as a signature aesthetic:

- **Scales:** none (0px), extra-small (4px), small (8px), medium (12px), large (16px), extra-large (28px), full (9999px/50%)
- **Default:** medium (12px) for most components
- **Asymmetric:** top-only, bottom-only, left-only, right-only patterns

**Documentation:** [Shape Guide](./shape-guide.md)
**Files:** `frontend/src/styles/tokens/shape.json`, `shape.css`

**Quick Example:**

```tsx
borderRadius: 'var(--md-sys-shape-button)', // 9999px (pill)
borderRadius: 'var(--md-sys-shape-circle)', // 50%
```

### 6. State Layers (80+ tokens)

**5 interaction states × 20+ color roles = 80+ tokens**

State layers provide visual feedback for interactive states:

- **Hover:** 8% opacity - Subtle discoverable feedback
- **Focus:** 12% opacity - Keyboard navigation indicator
- **Pressed:** 12% opacity - Active press feedback
- **Dragged:** 16% opacity - Drag operation indicator
- **Disabled:** 38% (content) / 12% (container)

**Documentation:** [State Layers Guide](./state-layers-guide.md)
**Files:** `frontend/src/styles/tokens/state-layers.json`, `state-layers.css`

**Quick Example:**

```tsx
opacity: 'var(--md-sys-state-hover-opacity)', // 0.08
```

## Token Usage

### Three Usage Methods

#### Method 1: CSS Custom Properties (Recommended)

```tsx
const style = {
  backgroundColor: 'var(--md-sys-color-primary)',
  padding: 'var(--md-sys-spacing-4)',
};
```

**Best for:** Direct CSS access, maximum performance

#### Method 2: TypeScript Utilities (Type-Safe)

```tsx
import { tokens } from '@/styles/tokens';

const style = {
  backgroundColor: tokens.color.get('primary'),
  padding: tokens.spacing.get(4),
};
```

**Best for:** Type safety, autocomplete, compile-time validation

#### Method 3: Component Shortcuts (Fastest)

```tsx
import { components } from '@/styles/tokens';

const style = {
  borderRadius: components.button.shape,
  padding: `${components.button.paddingY} ${components.button.paddingX}`,
};
```

**Best for:** Rapid development, semantic component-specific names

**Complete Guide:** [Tokens Usage Guide](./tokens-usage-guide.md)

## Naming Conventions

### CSS Custom Properties

```
--md-sys-{category}-{name}
```

**Examples:**

- `--md-sys-color-primary`
- `--md-sys-spacing-4`
- `--md-sys-elevation-2-shadow`
- `--md-sys-shape-button`
- `--md-sys-state-hover-opacity`

### TypeScript Utilities

```tsx
tokens.{category}.{method}({arguments})
```

**Examples:**

- `tokens.color.get('primary')`
- `tokens.spacing.get(4)`
- `tokens.elevation.shadow(2)`
- `tokens.shape.full`
- `tokens.state.hover`

### Component Shortcuts

```tsx
components.{component}.{property}
```

**Examples:**

- `components.button.shape`
- `components.card.padding`
- `components.dialog.elevation`

## Theme Switching

The token system includes built-in theme switching:

```tsx
import { initializeTheme, toggleTheme, setTheme } from '@/styles/tokens/theme';

// Initialize on app mount (respects user + system preferences)
useEffect(() => {
  initializeTheme();
}, []);

// Toggle between light and dark
const handleToggle = () => {
  const newTheme = toggleTheme();
  console.log(`Switched to ${newTheme} theme`);
};

// Set specific theme
setTheme('dark');
```

**How It Works:**

- Changes `data-theme` attribute on `<html>` element
- Dark theme CSS overrides light theme via `[data-theme="dark"]` selector
- CSS Custom Properties update instantly (< 16ms repaint)
- No component re-renders needed

## Common Patterns

### Button Component

```tsx
import { components, tokens } from '@/styles/tokens';

export function Button({ variant = 'filled', children }) {
  const baseStyle = {
    borderRadius: components.button.shape,
    padding: `${components.button.paddingY} ${components.button.paddingX}`,
    cursor: 'pointer',
    border: 'none',
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
  };

  return <button style={{ ...baseStyle, ...variantStyles[variant] }}>{children}</button>;
}
```

### Card with Elevation

```tsx
import { components } from '@/styles/tokens';

export function Card({ children, elevated = true }) {
  return (
    <div
      style={{
        borderRadius: components.card.shape,
        padding: components.card.padding,
        ...(elevated && { boxShadow: components.card.elevation }),
      }}
    >
      {children}
    </div>
  );
}
```

### Responsive Page Layout

```tsx
import { components } from '@/styles/tokens';

export function PageLayout({ children }) {
  return (
    <div
      style={{
        padding: `${components.page.paddingY} ${components.page.paddingX}`,
        maxWidth: components.page.maxWidth,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: components.page.sectionGap,
      }}
    >
      {children}
    </div>
  );
}
```

## Best Practices

### ✅ Do

- **Use tokens everywhere** - Never hardcode visual values
- **Use TypeScript utilities** for type safety and autocomplete
- **Use component shortcuts** when available for semantic clarity
- **Follow the 8px grid** for spacing (use spacing-2, spacing-4, spacing-6)
- **Validate before deployment** (`npm run tokens:check`)
- **Document custom patterns** when extending the system

### ❌ Don't

- **Don't hardcode values** - Always use tokens
- **Don't create custom token names** - Use the defined system
- **Don't bypass type safety** - Use the provided utilities
- **Don't mix spacing systems** - Stick to the 8px grid
- **Don't skip prebuild validation** - It catches errors early
- **Don't modify token files directly** - Update JSON sources

## Build Scripts

```bash
# Validate token TypeScript types
npm run tokens:validate

# Check tokens (validation + success message)
npm run tokens:check

# Build (automatically runs tokens:check via prebuild hook)
npm run build
```

## Token Statistics

| Category     | Count    | Description                              |
| ------------ | -------- | ---------------------------------------- |
| Colors       | 76       | 38 light + 38 dark theme color roles     |
| Typography   | 75       | 15 scales × 5 properties                 |
| Spacing      | 63+      | 13-value grid + 50+ component tokens     |
| Elevation    | 30+      | 6 levels with shadows and tints          |
| Shape        | 50+      | 7 scales + component shapes + asymmetric |
| State Layers | 80+      | 5 states × 20+ color roles               |
| **Total**    | **374+** | Complete M3 design token system          |

## File Structure

```
frontend/src/styles/tokens/
├── index.ts                 # Main token export module
├── types.ts                 # TypeScript type definitions
├── theme.ts                 # Theme switching utilities
├── m3-light.css             # Light theme colors
├── m3-dark.css              # Dark theme colors
├── typography.css           # Typography scale
├── typography.json          # Typography definitions
├── spacing.css              # Spacing grid
├── spacing.json             # Spacing definitions
├── elevation.css            # Elevation system
├── elevation.json           # Elevation definitions
├── shape.css                # Shape scale
├── shape.json               # Shape definitions
├── state-layers.css         # State layer opacities
└── state-layers.json        # State layer definitions

docs/
├── design-tokens.md         # This document (overview)
├── tokens-usage-guide.md    # Complete usage guide
├── color-tokens-guide.md    # M3 color system (deleted - use README.md)
├── typography-guide.md      # Typography system
├── spacing-guide.md         # Spacing system
├── elevation-guide.md       # Elevation system
├── shape-guide.md           # Shape system
└── state-layers-guide.md    # State layer system
```

## Documentation Index

### Comprehensive Guides

1. **[Tokens Usage Guide](./tokens-usage-guide.md)** - Complete API reference, usage patterns, component examples
2. **[Typography Guide](./typography-guide.md)** - Type scales, responsive patterns, accessibility
3. **[Spacing Guide](./spacing-guide.md)** - 8px grid system, component patterns, layouts
4. **[Elevation Guide](./elevation-guide.md)** - Shadow + tint system, component elevations
5. **[Shape Guide](./shape-guide.md)** - Corner radius system, asymmetric patterns
6. **[State Layers Guide](./state-layers-guide.md)** - Interaction states, stacking, accessibility

### Quick Reference

- **Token Naming:** `--md-sys-{category}-{name}`
- **TypeScript Access:** `tokens.{category}.{method}()`
- **Component Shortcuts:** `components.{component}.{property}`
- **Theme Switching:** `initializeTheme()`, `toggleTheme()`, `setTheme()`

## Migration Guide

### Step 1: Import Tokens

```tsx
import { tokens, components } from '@/styles/tokens';
```

### Step 2: Replace Hardcoded Values

**Before:**

```tsx
const style = {
  backgroundColor: '#2E7D32',
  color: '#FFFFFF',
  padding: '12px 24px',
  borderRadius: '9999px',
};
```

**After:**

```tsx
const style = {
  backgroundColor: tokens.color.get('primary'),
  color: tokens.color.get('on-primary'),
  padding: `${components.button.paddingY} ${components.button.paddingX}`,
  borderRadius: components.button.shape,
};
```

### Step 3: Initialize Theme

```tsx
import { initializeTheme } from '@/styles/tokens/theme';

useEffect(() => {
  initializeTheme();
}, []);
```

### Step 4: Validate

```bash
npm run tokens:check
```

## Troubleshooting

### Issue: Token not working

**Solution:**

1. Verify CSS is imported in `index.css`
2. Check browser DevTools → Computed styles
3. Run `npm run tokens:validate`

### Issue: TypeScript errors

**Solution:**

1. Run `npm run tokens:validate`
2. Verify you're importing from `@/styles/tokens`
3. Check token name spelling

### Issue: Theme not switching

**Solution:**

1. Verify `initializeTheme()` is called on app mount
2. Check `data-theme` attribute on `<html>` element
3. Ensure `m3-dark.css` is imported

## Resources

- [Material Design 3](https://m3.material.io/)
- [M3 Design Tokens](https://m3.material.io/foundations/design-tokens/overview)
- [M3 Color System](https://m3.material.io/styles/color/overview)
- [M3 Typography](https://m3.material.io/styles/typography/overview)
- [M3 Elevation](https://m3.material.io/styles/elevation/overview)
- [M3 Shape](https://m3.material.io/styles/shape/overview)

---

**Project:** Health Tracker
**Epic:** Migrate Frontend Components to Material Design 3
**Story:** Design Token System Implementation
**Status:** ✅ Complete (9/13 tasks done)
