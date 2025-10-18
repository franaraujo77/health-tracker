# Design Tokens Quick Reference

**Health Tracker - Material Design 3**

Quick lookup table for all design token systems. For detailed usage, see [Design Tokens Overview](./design-tokens.md).

---

## Color Tokens (76 total)

### Primary Usage

| CSS Variable                               | TypeScript                                 | Purpose                    |
| ------------------------------------------ | ------------------------------------------ | -------------------------- |
| `var(--md-sys-color-primary)`              | `tokens.color.get('primary')`              | Main brand color           |
| `var(--md-sys-color-on-primary)`           | `tokens.color.get('on-primary')`           | Text on primary            |
| `var(--md-sys-color-primary-container)`    | `tokens.color.get('primary-container')`    | Primary backgrounds        |
| `var(--md-sys-color-on-primary-container)` | `tokens.color.get('on-primary-container')` | Text on primary containers |

### All Color Roles

```
primary, on-primary, primary-container, on-primary-container
secondary, on-secondary, secondary-container, on-secondary-container
tertiary, on-tertiary, tertiary-container, on-tertiary-container
error, on-error, error-container, on-error-container
background, on-background
surface, on-surface, surface-variant, on-surface-variant
surface-dim, surface-bright
surface-container-lowest, surface-container-low, surface-container
surface-container-high, surface-container-highest
outline, outline-variant
inverse-surface, inverse-on-surface, inverse-primary
scrim, shadow
```

---

## Typography Tokens (75 total)

### Scale Reference

| Scale             | Size | Weight | Use Case               |
| ----------------- | ---- | ------ | ---------------------- |
| `display-large`   | 57px | 400    | Hero text              |
| `display-medium`  | 45px | 400    | Large headlines        |
| `display-small`   | 36px | 400    | Emphasis headers       |
| `headline-large`  | 32px | 400    | Section headers        |
| `headline-medium` | 28px | 400    | Card titles            |
| `headline-small`  | 24px | 400    | List section headers   |
| `title-large`     | 22px | 500    | Prominent titles       |
| `title-medium`    | 16px | 500    | Medium emphasis titles |
| `title-small`     | 14px | 500    | Small titles           |
| `body-large`      | 16px | 400    | Long-form content      |
| `body-medium`     | 14px | 400    | Default body text      |
| `body-small`      | 12px | 400    | Supporting text        |
| `label-large`     | 14px | 500    | Button labels          |
| `label-medium`    | 12px | 500    | Form labels            |
| `label-small`     | 11px | 500    | Captions               |

### Usage

```tsx
// Get all properties
const style = tokens.typography.getAll('headline-large');
// Returns: { fontFamily, fontSize, lineHeight, fontWeight, letterSpacing }

// Get single property
const size = tokens.typography.get('headline-large', 'size');
```

---

## Spacing Tokens (63+ total)

### Scale (8px baseline)

| Token        | Value | Use Case                      |
| ------------ | ----- | ----------------------------- |
| `spacing-0`  | 0px   | No spacing                    |
| `spacing-1`  | 4px   | Tight gaps                    |
| `spacing-2`  | 8px   | Default gaps (most common)    |
| `spacing-3`  | 12px  | Small padding                 |
| `spacing-4`  | 16px  | Default padding (most common) |
| `spacing-5`  | 20px  | Medium padding                |
| `spacing-6`  | 24px  | Large padding                 |
| `spacing-8`  | 32px  | Section spacing               |
| `spacing-10` | 40px  | Large sections                |
| `spacing-12` | 48px  | Page sections                 |
| `spacing-16` | 64px  | Extra large                   |
| `spacing-20` | 80px  | Hero sections                 |
| `spacing-24` | 96px  | Maximum spacing               |

### Component Tokens

```tsx
components.button.paddingX; // 24px
components.button.paddingY; // 12px
components.card.padding; // 16px
components.form.fieldGap; // 16px
components.page.paddingX; // 24px
components.page.sectionGap; // 32px
```

---

## Elevation Tokens (30+ total)

### Levels

| Level | Shadow Depth | Z-Index | Use Case                 |
| ----- | ------------ | ------- | ------------------------ |
| 0     | None         | 0       | No elevation             |
| 1     | 1dp          | 1       | Subtle lift (chips)      |
| 2     | 3dp          | 2       | Cards, contained buttons |
| 3     | 6dp          | 3       | FABs, menus              |
| 4     | 8dp          | 4       | Navigation drawer        |
| 5     | 12dp         | 5       | Dialogs, modal sheets    |

### Usage

```tsx
// Shadow only
boxShadow: tokens.elevation.shadow(2)

// With z-index
boxShadow: tokens.elevation.shadow(2),
zIndex: tokens.elevation.get(2, 'z-index')

// Component shortcuts
boxShadow: components.card.elevation        // Level 2
boxShadow: components.dialog.elevation      // Level 5
```

---

## Shape Tokens (50+ total)

### Scale

| Token               | Value  | Use Case                  |
| ------------------- | ------ | ------------------------- |
| `shape-none`        | 0px    | Sharp corners             |
| `shape-extra-small` | 4px    | Minimal rounding          |
| `shape-small`       | 8px    | Subtle corners            |
| `shape-medium`      | 12px   | Default (most components) |
| `shape-large`       | 16px   | Emphasized rounding       |
| `shape-extra-large` | 28px   | Large components          |
| `shape-full`        | 9999px | Pills (buttons, chips)    |
| `shape-circle`      | 50%    | Avatars, icons            |

### Component Shapes

```tsx
components.button.shape; // full (9999px - pill)
components.card.shape; // medium (12px)
components.dialog.shape; // extra-large (28px)
components.chip.shape; // small (8px)
components.fab.shape; // large (16px)
components.form.textFieldShape; // extra-small (4px)
```

### Asymmetric Patterns

```css
/* Top corners only */
border-radius: var(--md-sys-shape-large) var(--md-sys-shape-large) 0 0;

/* Bottom corners only */
border-radius: 0 0 var(--md-sys-shape-large) var(--md-sys-shape-large);
```

---

## State Layer Tokens (80+ total)

### State Opacities

| State                      | Opacity    | Use Case             |
| -------------------------- | ---------- | -------------------- |
| `state-hover`              | 8% (0.08)  | Hover feedback       |
| `state-focus`              | 12% (0.12) | Keyboard focus       |
| `state-pressed`            | 12% (0.12) | Active press         |
| `state-dragged`            | 16% (0.16) | Drag operations      |
| `state-disabled-content`   | 38% (0.38) | Disabled text        |
| `state-disabled-container` | 12% (0.12) | Disabled backgrounds |

### Usage

```tsx
// Direct opacity
opacity: tokens.state.hover  // 0.08

// Pseudo-element overlay
.button::before {
  background: currentColor;
  opacity: var(--md-sys-state-hover-opacity);
}

// RGBA with primary color
background: rgba(from var(--md-sys-color-primary) r g b / 0.08);
```

### State Stacking

| Combination     | Total Opacity   |
| --------------- | --------------- |
| Hover           | 8%              |
| Focus           | 12%             |
| Hover + Pressed | 20% (8% + 12%)  |
| Focus + Pressed | 24% (12% + 12%) |

---

## Component Shortcuts

### Button

```tsx
import { components } from '@/styles/tokens';

<button
  style={{
    borderRadius: components.button.shape,
    padding: `${components.button.paddingY} ${components.button.paddingX}`,
    gap: components.button.gap,
  }}
/>;
```

### Card

```tsx
<div
  style={{
    borderRadius: components.card.shape,
    padding: components.card.padding,
    gap: components.card.gap,
    boxShadow: components.card.elevation,
  }}
/>
```

### Form Field

```tsx
<input
  style={{
    padding: components.form.inputPadding,
    borderRadius: components.form.textFieldShape,
  }}
/>
```

### Page Layout

```tsx
<main
  style={{
    padding: `${components.page.paddingY} ${components.page.paddingX}`,
    maxWidth: components.page.maxWidth,
    gap: components.page.sectionGap,
  }}
/>
```

---

## Common Patterns

### Filled Button

```tsx
{
  backgroundColor: tokens.color.get('primary'),
  color: tokens.color.get('on-primary'),
  borderRadius: components.button.shape,
  padding: `${components.button.paddingY} ${components.button.paddingX}`,
}
```

### Outlined Button

```tsx
{
  backgroundColor: 'transparent',
  color: tokens.color.get('primary'),
  border: `1px solid ${tokens.color.get('outline')}`,
  borderRadius: components.button.shape,
  padding: `${components.button.paddingY} ${components.button.paddingX}`,
}
```

### Elevated Card

```tsx
{
  backgroundColor: tokens.color.get('surface'),
  color: tokens.color.get('on-surface'),
  borderRadius: components.card.shape,
  padding: components.card.padding,
  boxShadow: tokens.elevation.shadow(2),
}
```

### Dialog

```tsx
{
  backgroundColor: tokens.color.get('surface'),
  borderRadius: components.dialog.shape,
  padding: components.dialog.padding,
  boxShadow: components.dialog.elevation,
  zIndex: tokens.elevation.get(5, 'z-index'),
}
```

---

## Theme Switching

```tsx
import { initializeTheme, toggleTheme, setTheme } from '@/styles/tokens/theme';

// Initialize on app mount
useEffect(() => {
  initializeTheme();
}, []);

// Toggle between light/dark
const handleToggle = () => toggleTheme();

// Set specific theme
setTheme('dark');
```

---

## Naming Conventions

### CSS Custom Properties

```
--md-sys-{category}-{name}
```

### TypeScript

```tsx
tokens.{category}.{method}({arguments})
```

### Component Shortcuts

```tsx
components.{component}.{property}
```

---

## Import Statements

```tsx
// All token utilities
import { tokens, components } from '@/styles/tokens';

// Theme utilities
import { initializeTheme, toggleTheme, setTheme } from '@/styles/tokens/theme';

// Specific functions
import { getColorToken, getSpacingToken } from '@/styles/tokens';
```

---

## Build Scripts

```bash
# Validate tokens
npm run tokens:validate

# Check tokens
npm run tokens:check

# Build (auto-validates)
npm run build
```

---

## Documentation Links

- [Design Tokens Overview](./design-tokens.md) - Complete system documentation
- [Tokens Usage Guide](./tokens-usage-guide.md) - API reference and patterns
- [Typography Guide](./typography-guide.md) - Typography system details
- [Spacing Guide](./spacing-guide.md) - Spacing system details
- [Elevation Guide](./elevation-guide.md) - Elevation system details
- [Shape Guide](./shape-guide.md) - Shape system details
- [State Layers Guide](./state-layers-guide.md) - State layer details

---

**Last Updated:** 2025-10-17
