# Material Design 3 Migration Guide for Developers

**Health Tracker Application**
**Version:** 1.0
**Last Updated:** 2025-10-17

---

## Table of Contents

1. [Overview](#overview)
2. [What Changed in M3](#what-changed-in-m3)
3. [Migration Workflow](#migration-workflow)
4. [Design Token Usage](#design-token-usage)
5. [Component Patterns](#component-patterns)
6. [Before & After Examples](#before--after-examples)
7. [Common Pitfalls](#common-pitfalls)
8. [Testing Checklist](#testing-checklist)
9. [Resources](#resources)

---

## Overview

This guide helps developers migrate existing components to Material Design 3 (M3) standards using our design token system. The Health Tracker application has completed the foundation work (Stories 1 & 2), establishing design tokens and theme infrastructure.

### Migration Goals

- **Replace all hardcoded values** with M3 design tokens
- **Apply M3 color roles** for semantic color usage
- **Implement M3 shape system** for consistent border radii
- **Add state layers** for interactive feedback
- **Use Material Symbols** for iconography
- **Ensure accessibility** (WCAG 2.1 Level AA)

---

## What Changed in M3

### Key Differences from Material Design 2

| Aspect           | Material Design 2   | Material Design 3                     |
| ---------------- | ------------------- | ------------------------------------- |
| **Colors**       | Fixed color palette | Dynamic color generation from source  |
| **Elevation**    | Heavy drop shadows  | Lighter shadows + surface tints       |
| **Shapes**       | 4px default corners | 7-level shape scale (0-28px + full)   |
| **Typography**   | Roboto only         | Roboto/Roboto Flex with refined scale |
| **State Layers** | Basic hover states  | Standardized opacity-based overlays   |
| **Icons**        | Material Icons      | Material Symbols (variable font)      |

### Breaking Changes

✅ **None for this project** - We're migrating from inline styles, not from MD2 components.

---

## Migration Workflow

### Step-by-Step Process

```
1. Audit Component
   ↓
2. Create CSS File with M3 Tokens
   ↓
3. Replace Inline Styles with Classes
   ↓
4. Test in Both Themes (Light & Dark)
   ↓
5. Verify Build
   ↓
6. Commit Changes
```

### Component Migration Checklist

- [ ] Remove all inline `style={{}}` attributes
- [ ] Create dedicated `.css` file for component
- [ ] Replace hardcoded colors with M3 color roles
- [ ] Apply M3 shape tokens to all rounded elements
- [ ] Use M3 typography tokens for all text
- [ ] Use M3 spacing tokens for padding/margins
- [ ] Add state layers to interactive elements
- [ ] Implement proper disabled states
- [ ] Add elevation to elevated surfaces
- [ ] Replace custom icons with Material Symbols
- [ ] Test accessibility with screen readers
- [ ] Verify in both light and dark themes
- [ ] Run build to ensure no errors

---

## Design Token Usage

### Color Roles

M3 uses semantic color roles instead of direct color values.

#### Surface Colors

```css
/* Background surfaces */
background-color: var(--md-sys-color-surface);
background-color: var(--md-sys-color-surface-container);
background-color: var(--md-sys-color-surface-container-low);
background-color: var(--md-sys-color-surface-container-high);
background-color: var(--md-sys-color-surface-container-highest);

/* Always pair with corresponding "on" color for text */
color: var(--md-sys-color-on-surface);
color: var(--md-sys-color-on-surface-variant);
```

#### Primary Colors

```css
/* Primary actions (main CTA buttons) */
background-color: var(--md-sys-color-primary);
color: var(--md-sys-color-on-primary);

/* Primary containers (chips, tonal buttons) */
background-color: var(--md-sys-color-primary-container);
color: var(--md-sys-color-on-primary-container);
```

#### Error Colors

```css
/* Error states */
background-color: var(--md-sys-color-error-container);
color: var(--md-sys-color-on-error-container);
border-color: var(--md-sys-color-error);
```

#### Outlines

```css
/* Borders and dividers */
border-color: var(--md-sys-color-outline);
border-color: var(--md-sys-color-outline-variant); /* Lighter */
```

### Shape Tokens

```css
/* Component-specific shapes */
border-radius: var(--md-sys-shape-button); /* Fully rounded */
border-radius: var(--md-sys-shape-card); /* 12px */
border-radius: var(--md-sys-shape-text-field-outlined); /* 4px */

/* Generic shape scale */
border-radius: var(--md-sys-shape-none); /* 0px */
border-radius: var(--md-sys-shape-extra-small); /* 4px */
border-radius: var(--md-sys-shape-small); /* 8px */
border-radius: var(--md-sys-shape-medium); /* 12px */
border-radius: var(--md-sys-shape-large); /* 16px */
border-radius: var(--md-sys-shape-extra-large); /* 28px */
border-radius: var(--md-sys-shape-full); /* 9999px (pill) */
```

### Typography Tokens

```css
/* Headline (large display text) */
font-family: var(--md-sys-typescale-headline-large-font);
font-size: var(--md-sys-typescale-headline-large-size);
font-weight: var(--md-sys-typescale-headline-large-weight);
line-height: var(--md-sys-typescale-headline-large-line-height);
letter-spacing: var(--md-sys-typescale-headline-large-tracking);

/* Body (regular text) */
font-family: var(--md-sys-typescale-body-large-font);
font-size: var(--md-sys-typescale-body-large-size);

/* Label (buttons, form labels) */
font-family: var(--md-sys-typescale-label-large-font);
font-size: var(--md-sys-typescale-label-large-size);
font-weight: var(--md-sys-typescale-label-large-weight);
```

### Spacing Tokens

```css
/* Spacing scale (8px baseline) */
padding: var(--md-sys-spacing-1); /* 4px */
padding: var(--md-sys-spacing-2); /* 8px */
padding: var(--md-sys-spacing-3); /* 12px */
padding: var(--md-sys-spacing-4); /* 16px */
padding: var(--md-sys-spacing-5); /* 20px */
padding: var(--md-sys-spacing-6); /* 24px */
/* ... up to spacing-16 (64px) */
```

### Elevation Tokens

```css
/* Elevation levels (shadow + surface tint) */
box-shadow: var(--md-sys-elevation-0); /* No shadow */
box-shadow: var(--md-sys-elevation-1); /* 1dp */
box-shadow: var(--md-sys-elevation-2); /* 3dp */
box-shadow: var(--md-sys-elevation-3); /* 6dp */
box-shadow: var(--md-sys-elevation-4); /* 8dp */
box-shadow: var(--md-sys-elevation-5); /* 12dp */
```

### State Layer Tokens

```css
/* State layer opacities */
opacity: var(--md-sys-state-hover-opacity); /* 0.08 */
opacity: var(--md-sys-state-focus-opacity); /* 0.12 */
opacity: var(--md-sys-state-pressed-opacity); /* 0.12 */
opacity: var(--md-sys-state-dragged-opacity); /* 0.16 */

/* Disabled states */
opacity: var(--md-sys-state-disabled-content-opacity); /* 0.38 */
opacity: var(--md-sys-state-disabled-container-opacity); /* 0.12 */
```

---

## Component Patterns

### M3 Button Pattern

```css
.m3-button {
  /* Base styling */
  position: relative;
  padding: var(--md-sys-spacing-2) var(--md-sys-spacing-6);
  min-height: 40px;
  border: none;
  border-radius: var(--md-sys-shape-full);
  font-family: var(--md-sys-typescale-label-large-font);
  font-size: var(--md-sys-typescale-label-large-size);
  font-weight: var(--md-sys-typescale-label-large-weight);
  cursor: pointer;
  overflow: hidden;
  transition: all 0.2s ease-in-out;
}

/* Filled (Primary) Button */
.m3-button-filled {
  background-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
}

/* State layer overlay */
.m3-button::before {
  content: '';
  position: absolute;
  inset: 0;
  background-color: var(--md-sys-color-on-primary);
  opacity: 0;
  transition: opacity 0.2s ease-in-out;
  pointer-events: none;
  border-radius: inherit;
}

.m3-button:hover::before {
  opacity: var(--md-sys-state-hover-opacity);
}

.m3-button:focus-visible {
  outline: 2px solid var(--md-sys-color-primary);
  outline-offset: 2px;
}

.m3-button:active::before {
  opacity: var(--md-sys-state-pressed-opacity);
}

/* Disabled state */
.m3-button:disabled {
  background-color: rgba(var(--md-sys-color-on-surface-rgb, 0, 0, 0), 0.12);
  color: rgba(var(--md-sys-color-on-surface-rgb, 0, 0, 0), 0.38);
  cursor: not-allowed;
}

.m3-button:disabled::before {
  display: none;
}
```

### M3 Card Pattern

```css
.m3-card {
  padding: var(--md-sys-spacing-4);
  background-color: var(--md-sys-color-surface-container);
  color: var(--md-sys-color-on-surface);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-card);
  box-shadow: var(--md-sys-elevation-1);
  transition: all 0.2s ease-in-out;
}

.m3-card:hover {
  box-shadow: var(--md-sys-elevation-2);
  background-color: var(--md-sys-color-surface-container-high);
}
```

### M3 Text Field Pattern (Outlined)

```css
.m3-text-field {
  width: 100%;
  padding: var(--md-sys-spacing-2);
  min-height: 48px;
  font-family: var(--md-sys-typescale-body-large-font);
  font-size: var(--md-sys-typescale-body-large-size);
  color: var(--md-sys-color-on-surface);
  background-color: var(--md-sys-color-surface-container-highest);
  border: 1px solid var(--md-sys-color-outline);
  border-radius: var(--md-sys-shape-text-field-outlined);
  transition: all 0.2s ease-in-out;
}

.m3-text-field:focus {
  outline: 2px solid var(--md-sys-color-primary);
  outline-offset: -1px;
  border-color: var(--md-sys-color-primary);
}

.m3-text-field:disabled {
  background-color: rgba(var(--md-sys-color-on-surface-rgb, 0, 0, 0), 0.04);
  color: rgba(var(--md-sys-color-on-surface-rgb, 0, 0, 0), 0.38);
  border-color: rgba(var(--md-sys-color-on-surface-rgb, 0, 0, 0), 0.12);
  cursor: not-allowed;
}
```

### M3 Icon Usage

```tsx
import { Icon } from '@/components/Icon';

// Basic icon
<Icon name="favorite" />

// Filled icon
<Icon name="favorite" filled />

// Custom size and weight
<Icon name="search" size={32} weight={500} />

// With accessibility
<Icon name="close" aria-label="Close dialog" />
```

---

## Before & After Examples

### Example 1: Button Migration

**❌ Before (Inline Styles):**

```tsx
<button
  onClick={handleClick}
  style={{
    padding: '8px 16px',
    backgroundColor: '#1976d2',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  }}
>
  Click Me
</button>
```

**✅ After (M3 with Tokens):**

```tsx
// Component
<button onClick={handleClick} className="button-primary">
  Click Me
</button>

// CSS
.button-primary {
  position: relative;
  padding: var(--md-sys-spacing-2) var(--md-sys-spacing-4);
  background-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
  border: none;
  border-radius: var(--md-sys-shape-full);
  font-family: var(--md-sys-typescale-label-large-font);
  font-size: var(--md-sys-typescale-label-large-size);
  font-weight: var(--md-sys-typescale-label-large-weight);
  min-height: 40px;
  cursor: pointer;
  overflow: hidden;
}

/* State layer */
.button-primary::before {
  content: '';
  position: absolute;
  inset: 0;
  background-color: var(--md-sys-color-on-primary);
  opacity: 0;
  transition: opacity 0.2s;
  border-radius: inherit;
}

.button-primary:hover::before {
  opacity: var(--md-sys-state-hover-opacity);
}
```

### Example 2: Card Migration

**❌ Before:**

```tsx
<div
  style={{
    padding: '15px',
    border: '1px solid #e0e0e0',
    borderRadius: '4px',
    backgroundColor: '#fafafa',
  }}
>
  Content
</div>
```

**✅ After:**

```tsx
// Component
<div className="metric-card">Content</div>

// CSS
.metric-card {
  padding: var(--md-sys-spacing-4);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-card);
  background-color: var(--md-sys-color-surface-container);
  color: var(--md-sys-color-on-surface);
  box-shadow: var(--md-sys-elevation-1);
  transition: all 0.2s ease-in-out;
}

.metric-card:hover {
  box-shadow: var(--md-sys-elevation-2);
}
```

### Example 3: Error State Migration

**❌ Before:**

```tsx
<div
  style={{
    padding: '20px',
    backgroundColor: '#ffebee',
    color: '#c62828',
    borderRadius: '4px',
  }}
>
  <strong>Error:</strong> {error.message}
</div>
```

**✅ After:**

```tsx
// Component
<div className="error-banner">
  <strong>Error:</strong> {error.message}
</div>

// CSS
.error-banner {
  padding: var(--md-sys-spacing-4);
  background-color: var(--md-sys-color-error-container);
  color: var(--md-sys-color-on-error-container);
  border-radius: var(--md-sys-shape-small);
  font-family: var(--md-sys-typescale-body-medium-font);
}

.error-banner strong {
  font-weight: var(--md-sys-typescale-label-large-weight);
}
```

---

## Common Pitfalls

### ❌ Pitfall 1: Using Hardcoded Colors

```css
/* DON'T */
background-color: #1976d2;
color: #ffffff;

/* DO */
background-color: var(--md-sys-color-primary);
color: var(--md-sys-color-on-primary);
```

### ❌ Pitfall 2: Forgetting "On" Colors

```css
/* DON'T - Unreadable in dark theme */
.card {
  background-color: var(--md-sys-color-surface);
  color: #333333; /* Hardcoded text color */
}

/* DO - Works in both themes */
.card {
  background-color: var(--md-sys-color-surface);
  color: var(--md-sys-color-on-surface);
}
```

### ❌ Pitfall 3: Inconsistent Border Radius

```css
/* DON'T - Mix of values */
.button {
  border-radius: 20px;
}
.card {
  border-radius: 8px;
}
.dialog {
  border-radius: 16px;
}

/* DO - Use shape tokens */
.button {
  border-radius: var(--md-sys-shape-full);
}
.card {
  border-radius: var(--md-sys-shape-medium);
}
.dialog {
  border-radius: var(--md-sys-shape-extra-large);
}
```

### ❌ Pitfall 4: Missing State Layers

```css
/* DON'T - Only change background */
.button:hover {
  background-color: #1565c0; /* Darker hardcoded color */
}

/* DO - Use state layer overlay */
.button::before {
  /* State layer setup */
}

.button:hover::before {
  opacity: var(--md-sys-state-hover-opacity);
}
```

### ❌ Pitfall 5: Wrong Disabled State

```css
/* DON'T - Generic opacity */
.button:disabled {
  opacity: 0.5;
}

/* DO - M3 spec (12% container, 38% content) */
.button:disabled {
  background-color: rgba(var(--md-sys-color-on-surface-rgb, 0, 0, 0), 0.12);
  color: rgba(var(--md-sys-color-on-surface-rgb, 0, 0, 0), 0.38);
}
```

---

## Testing Checklist

### Visual Testing

- [ ] Component looks correct in **light theme**
- [ ] Component looks correct in **dark theme**
- [ ] Theme switching works smoothly (no flicker)
- [ ] All interactive states work (hover, focus, active)
- [ ] Disabled states render correctly
- [ ] Error states render correctly
- [ ] No visual regressions compared to design

### Accessibility Testing

- [ ] Color contrast meets WCAG 2.1 AA (4.5:1 for text, 3:1 for UI)
- [ ] Focus indicators are visible
- [ ] Screen reader announces content correctly
- [ ] Keyboard navigation works
- [ ] Touch targets are at least 48x48px
- [ ] `aria-*` attributes are correct

### Functional Testing

- [ ] All existing functionality works
- [ ] No console errors
- [ ] Build completes successfully
- [ ] Component renders in Storybook (if applicable)
- [ ] Unit tests pass
- [ ] E2E tests pass (if applicable)

### Cross-Browser Testing

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

---

## Resources

### Official M3 Documentation

- [Material Design 3 Overview](https://m3.material.io/)
- [M3 Color System](https://m3.material.io/styles/color/overview)
- [M3 Typography](https://m3.material.io/styles/typography/overview)
- [M3 Shape](https://m3.material.io/styles/shape/overview)
- [M3 Elevation](https://m3.material.io/styles/elevation/overview)

### Tools

- [Material Theme Builder](https://m3.material.io/theme-builder)
- [Material Symbols](https://fonts.google.com/icons)
- [Material Color Utilities](https://github.com/material-foundation/material-color-utilities)

### Internal Resources

- [Component Migration Inventory](./m3-component-migration-inventory.md)
- Design Token Files: `src/styles/tokens/`
- Theme Context: `src/contexts/ThemeContext.tsx`
- Icon Component: `src/components/Icon.tsx`

---

## Getting Help

### Questions?

- Check the [M3 Component Migration Inventory](./m3-component-migration-inventory.md)
- Review completed migrations: `HealthMetricsList`, `HealthDataEntryForm`, `ThemeToggle`
- Consult [Material Design 3 Guidelines](https://m3.material.io/)

### Found a Bug?

- Check if design tokens are properly imported
- Verify theme provider is wrapping the component
- Test in both light and dark themes
- Check browser console for errors

---

**Document Status:** ✅ Complete
**Version:** 1.0
**Last Updated:** 2025-10-17
**Maintainer:** Development Team
