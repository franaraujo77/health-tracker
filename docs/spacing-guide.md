# Material Design 3 Spacing Guide - Health Tracker

**Generated:** 2025-10-16
**Epic:** Migrate Frontend Components to Material Design 3
**Story:** Design Token System Implementation
**Task:** Define M3 spacing scale tokens (8px baseline grid)

## Overview

This document describes the Material Design 3 spacing system implemented for the Health Tracker application. The spacing scale follows an **8px baseline grid** with **13 scale values** and **50+ component-specific tokens** for consistent layout and spacing throughout the application.

## The 8px Baseline Grid

### Why 8px?

Material Design uses an 8px baseline grid because:

1. **Screen Density Compatibility** - Most screen densities (72dpi, 96dpi, 144dpi, 192dpi) divide evenly by 8
2. **Pixel-Perfect Rendering** - Prevents sub-pixel rendering and blurry edges
3. **Scalability** - Layouts scale consistently across devices
4. **Predictability** - Simple mental math (2 units = 16px, 3 units = 24px)
5. **Flexibility** - 4px half-steps (0.5 units) for tight spacing needs

### Base Unit

```
1 unit = 8px
```

All spacing values are multiples or half-multiples of this base unit.

## Spacing Scale Reference

| Token        | Value | Units | Use Case                                        |
| ------------ | ----- | ----- | ----------------------------------------------- |
| `spacing-0`  | 0px   | 0     | No spacing, flush layouts, reset spacing        |
| `spacing-1`  | 4px   | 0.5   | Extra small - tight gaps, minimal padding       |
| `spacing-2`  | 8px   | 1     | Small - compact UI, icon gaps                   |
| `spacing-3`  | 12px  | 1.5   | Small-medium - button padding, chip gaps        |
| `spacing-4`  | 16px  | 2     | **Medium - standard padding (most common)**     |
| `spacing-5`  | 20px  | 2.5   | Medium-large - card padding, section gaps       |
| `spacing-6`  | 24px  | 3     | Large - generous padding, visual breathing room |
| `spacing-8`  | 32px  | 4     | Extra large - section separators, modal padding |
| `spacing-10` | 40px  | 5     | 2X large - major section gaps                   |
| `spacing-12` | 48px  | 6     | 3X large - hero sections, page-level gaps       |
| `spacing-16` | 64px  | 8     | 4X large - dramatic separation                  |
| `spacing-20` | 80px  | 10    | 5X large - landing page sections                |
| `spacing-24` | 96px  | 12    | 6X large - maximum separation                   |

### Most Common Values

- **`spacing-4` (16px)** - Default for most padding and gaps
- **`spacing-2` (8px)** - Compact UI, tight layouts
- **`spacing-6` (24px)** - Generous spacing, cards
- **`spacing-8` (32px)** - Section separation

## Component-Specific Spacing

### Buttons

```css
/* Standard button */
padding: var(--md-sys-spacing-button-padding-y) var(--md-sys-spacing-button-padding-x);
/* 12px 24px */

gap: var(--md-sys-spacing-button-gap); /* 8px between icon and text */
```

**Button Sizes:**

| Size     | Padding X | Padding Y | Example         |
| -------- | --------- | --------- | --------------- |
| Small    | 16px      | 8px       | Compact actions |
| Standard | 24px      | 12px      | Default buttons |
| Large    | 32px      | 16px      | Primary CTAs    |

**Example:**

```tsx
<button style={{
  padding: `${var(--md-sys-spacing-button-padding-y)} ${var(--md-sys-spacing-button-padding-x)}`,
  gap: var(--md-sys-spacing-button-gap)
}}>
  <Icon /> Start Workout
</button>
```

### Cards

```css
/* Standard card */
padding: var(--md-sys-spacing-card-padding); /* 16px */

/* Large card (featured content) */
padding: var(--md-sys-spacing-card-padding-large); /* 24px */

/* Gap between card elements */
gap: var(--md-sys-spacing-card-gap); /* 16px */

/* Tight gap (related elements) */
gap: var(--md-sys-spacing-card-gap-small); /* 8px */
```

**Example:**

```tsx
<div
  style={{
    padding: 'var(--md-sys-spacing-card-padding)',
    gap: 'var(--md-sys-spacing-card-gap)',
    display: 'flex',
    flexDirection: 'column',
  }}
>
  <h3>Daily Steps</h3>
  <p>10,245 steps today</p>
  <span>Updated 2 min ago</span>
</div>
```

### Dialogs

```css
/* Dialog content padding */
padding: var(--md-sys-spacing-dialog-padding); /* 24px */

/* Margin below title */
margin-bottom: var(--md-sys-spacing-dialog-title-margin); /* 16px */

/* Gap between action buttons */
gap: var(--md-sys-spacing-dialog-actions-gap); /* 8px */
```

**Example:**

```tsx
<dialog style={{ padding: 'var(--md-sys-spacing-dialog-padding)' }}>
  <h2 style={{ marginBottom: 'var(--md-sys-spacing-dialog-title-margin)' }}>Confirm Deletion</h2>
  <p>Are you sure you want to delete this workout?</p>
  <div style={{ gap: 'var(--md-sys-spacing-dialog-actions-gap)', display: 'flex' }}>
    <button>Cancel</button>
    <button>Delete</button>
  </div>
</dialog>
```

### Lists

```css
/* List item padding */
padding: var(--md-sys-spacing-list-item-padding); /* 12px */

/* Gap between list items */
gap: var(--md-sys-spacing-list-item-gap); /* 4px */

/* Gap between list sections */
gap: var(--md-sys-spacing-list-section-gap); /* 24px */
```

### Forms

```css
/* Gap between form fields */
gap: var(--md-sys-spacing-form-field-gap); /* 16px */

/* Margin below labels */
margin-bottom: var(--md-sys-spacing-form-label-margin); /* 8px */

/* Gap between form sections */
gap: var(--md-sys-spacing-form-section-gap); /* 32px */

/* Input field padding */
padding: var(--md-sys-spacing-form-input-padding); /* 12px */
```

**Example:**

```tsx
<form
  style={{
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--md-sys-spacing-form-field-gap)',
  }}
>
  <div>
    <label style={{ marginBottom: 'var(--md-sys-spacing-form-label-margin)' }}>Weight (kg)</label>
    <input type="number" style={{ padding: 'var(--md-sys-spacing-form-input-padding)' }} />
  </div>
  <button>Submit</button>
</form>
```

### Chips

```css
/* Chip padding */
padding: var(--md-sys-spacing-chip-padding-y) var(--md-sys-spacing-chip-padding-x);
/* 6px 12px */

/* Gap between chips */
gap: var(--md-sys-spacing-chip-gap); /* 8px */

/* Gap between icon and text */
gap: var(--md-sys-spacing-chip-icon-gap); /* 4px */
```

**Note:** Chip vertical padding (6px) is an exception to the 8px grid for better visual balance.

### Navigation

```css
/* Navigation item padding */
padding: var(--md-sys-spacing-nav-item-padding); /* 16px */

/* Gap between nav items */
gap: var(--md-sys-spacing-nav-item-gap); /* 4px */

/* Gap between nav sections */
gap: var(--md-sys-spacing-nav-section-gap); /* 32px */
```

### Page Layout

```css
/* Page horizontal padding */
padding-left: var(--md-sys-spacing-page-padding-x); /* 24px mobile, 40px tablet, 48px desktop */
padding-right: var(--md-sys-spacing-page-padding-x);

/* Page vertical padding */
padding-top: var(--md-sys-spacing-page-padding-y); /* 24px */
padding-bottom: var(--md-sys-spacing-page-padding-y);

/* Gap between major page sections */
gap: var(--md-sys-spacing-page-section-gap); /* 48px mobile, 64px tablet, 80px desktop */

/* Maximum content width */
max-width: var(--md-sys-spacing-page-max-width); /* 1200px */
```

### Grid Layouts

```css
/* Standard grid gap */
gap: var(--md-sys-spacing-grid-gap); /* 16px */

/* Compact grid */
gap: var(--md-sys-spacing-grid-gap-small); /* 8px */

/* Generous grid */
gap: var(--md-sys-spacing-grid-gap-large); /* 24px */
```

**Example:**

```tsx
<div
  style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: 'var(--md-sys-spacing-grid-gap)',
  }}
>
  <Card />
  <Card />
  <Card />
</div>
```

## Implementation Methods

### Method 1: CSS Custom Properties (Recommended)

```css
.card {
  padding: var(--md-sys-spacing-card-padding);
  gap: var(--md-sys-spacing-card-gap);
}
```

### Method 2: Utility Classes

Quick spacing via pre-built classes:

```html
<!-- Margin -->
<div class="mt-4 mb-6">Content with top margin (16px) and bottom margin (24px)</div>

<!-- Padding -->
<div class="p-4">Content with padding (16px)</div>

<!-- Gap (for flexbox/grid) -->
<div class="gap-4" style="display: flex;">
  <div>Item 1</div>
  <div>Item 2</div>
</div>
```

**Available utility classes:**

- Margin: `.m-{0-8}`, `.mt-{0-8}`, `.mb-{0-8}`
- Padding: `.p-{0-8}`
- Gap: `.gap-{0-8}`

### Method 3: Inline Styles (TypeScript)

```tsx
const cardStyle = {
  padding: 'var(--md-sys-spacing-card-padding)',
  gap: 'var(--md-sys-spacing-card-gap)',
  display: 'flex',
  flexDirection: 'column' as const,
};

<div style={cardStyle}>
  <h3>Card Title</h3>
  <p>Card content</p>
</div>;
```

## Responsive Spacing

The spacing system includes responsive adjustments for different viewport sizes:

### Mobile (< 768px)

```css
--md-sys-spacing-page-padding-x: 24px;
--md-sys-spacing-page-section-gap: 48px;
```

### Tablet (768px - 1024px)

```css
--md-sys-spacing-page-padding-x: 40px;
--md-sys-spacing-page-section-gap: 64px;
```

### Desktop (> 1024px)

```css
--md-sys-spacing-page-padding-x: 48px;
--md-sys-spacing-page-section-gap: 80px;
```

**Custom responsive spacing:**

```css
.custom-element {
  padding: var(--md-sys-spacing-4);
}

@media (min-width: 768px) {
  .custom-element {
    padding: var(--md-sys-spacing-6);
  }
}
```

## Spacing Decision Guide

### Choosing the Right Spacing Value

**Use this flowchart:**

```
Is it a tight/compact layout?
├─ Yes → spacing-1 (4px) or spacing-2 (8px)
└─ No
   ├─ Is it standard UI spacing?
   │  └─ Yes → spacing-4 (16px) ← Most common
   └─ No
      ├─ Need generous spacing?
      │  └─ Yes → spacing-6 (24px)
      └─ No
         └─ Major separation? → spacing-8+ (32px+)
```

### Common Patterns

| Pattern            | Spacing Value                | Example               |
| ------------------ | ---------------------------- | --------------------- |
| Icon + Text        | `spacing-2` (8px)            | Button icon gap       |
| Form field stack   | `spacing-4` (16px)           | Vertical form fields  |
| Card padding       | `spacing-4` or `spacing-6`   | Internal card spacing |
| Section separation | `spacing-8` to `spacing-12`  | Page sections         |
| Hero sections      | `spacing-16` to `spacing-24` | Landing pages         |

## Best Practices

### ✅ Do

- **Use the spacing scale** - Always use tokens, never hardcode pixel values
- **Stick to the 8px grid** - Use `spacing-2`, `spacing-4`, `spacing-6`, etc.
- **Use `spacing-4` as default** - 16px is the most versatile spacing value
- **Combine with flexbox gap** - Modern CSS gap property works perfectly with spacing tokens
- **Use component tokens** - Prefer `--md-sys-spacing-button-padding-x` over generic spacing
- **Consider touch targets** - Minimum 44x44px for interactive elements

### ❌ Don't

- **Don't hardcode pixel values** - Use tokens for consistency
- **Don't mix spacing systems** - Stick to the 8px grid
- **Don't use odd pixel values** - Avoid 13px, 17px, etc. (breaks grid alignment)
- **Don't over-space** - More spacing isn't always better
- **Don't forget responsive** - Adjust spacing for mobile vs desktop

## Integration with Index.css

Add spacing import to your main CSS file:

```css
/* frontend/src/index.css */
@import './styles/tokens/m3-light.css';
@import './styles/tokens/m3-dark.css';
@import './styles/tokens/typography.css';
@import './styles/tokens/spacing.css';

body {
  padding: var(--md-sys-spacing-page-padding-y) var(--md-sys-spacing-page-padding-x);
  max-width: var(--md-sys-spacing-page-max-width);
  margin: 0 auto;
}
```

## Common Use Cases

### Dashboard Layout

```tsx
<div
  style={{
    padding: 'var(--md-sys-spacing-page-padding-y) var(--md-sys-spacing-page-padding-x)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--md-sys-spacing-page-section-gap)',
    maxWidth: 'var(--md-sys-spacing-page-max-width)',
    margin: '0 auto',
  }}
>
  <h1 className="md-typescale-display-large">Dashboard</h1>

  <section style={{ display: 'grid', gap: 'var(--md-sys-spacing-grid-gap)' }}>
    <Card />
    <Card />
    <Card />
  </section>
</div>
```

### Form Layout

```tsx
<form
  style={{
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--md-sys-spacing-form-field-gap)',
  }}
>
  <div>
    <label style={{ marginBottom: 'var(--md-sys-spacing-form-label-margin)' }}>Email</label>
    <input style={{ padding: 'var(--md-sys-spacing-form-input-padding)' }} />
  </div>

  <div style={{ marginTop: 'var(--md-sys-spacing-form-section-gap)' }}>
    <button
      style={{
        padding: `var(--md-sys-spacing-button-padding-y) var(--md-sys-spacing-button-padding-x)`,
      }}
    >
      Submit
    </button>
  </div>
</form>
```

### Card Grid

```tsx
<div
  style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: 'var(--md-sys-spacing-grid-gap)',
  }}
>
  {cards.map((card) => (
    <div
      style={{
        padding: 'var(--md-sys-spacing-card-padding)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--md-sys-spacing-card-gap)',
      }}
    >
      <h3>{card.title}</h3>
      <p>{card.content}</p>
    </div>
  ))}
</div>
```

## Accessibility Considerations

### Touch Target Sizes

Ensure interactive elements meet minimum touch target sizes:

```css
button {
  min-height: 44px; /* WCAG 2.1 Level AA */
  min-width: 44px;
  padding: var(--md-sys-spacing-button-padding-y) var(--md-sys-spacing-button-padding-x);
}
```

### Reading Comfort

Maintain appropriate spacing for readability:

```css
p {
  margin-bottom: var(--md-sys-spacing-4); /* 16px between paragraphs */
  max-width: 70ch; /* Optimal line length */
}
```

## Resources

- [Material Design 3 Layout](https://m3.material.io/foundations/layout/understanding-layout/overview)
- [Applying Layout - Spacing](https://m3.material.io/foundations/layout/applying-layout/spacing)
- [8-Point Grid System](https://spec.fm/specifics/8-pt-grid)
- [WCAG 2.1 - Touch Target Size](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html)

---

**Files:**

- `frontend/src/styles/tokens/spacing.json` - Token definitions
- `frontend/src/styles/tokens/spacing.css` - CSS Custom Properties
- `docs/spacing-guide.md` - This documentation
