# Material Design 3 Shape Guide - Health Tracker

**Generated:** 2025-10-16
**Epic:** Migrate Frontend Components to Material Design 3
**Story:** Design Token System Implementation
**Task:** Define M3 shape tokens for component corners

## Overview

This document describes the Material Design 3 shape system implemented for the Health Tracker application. M3 uses **rounded corners as a signature aesthetic**, creating a softer, more approachable interface with **7 shape scale values** and **15+ component-specific mappings**.

## M3 Shape Philosophy

Material Design 3 embraces rounded corners as a core design principle:

### Why Rounded Corners?

1. **Approachability** - Softer edges create a friendlier, more inviting interface
2. **Brand Identity** - Distinctive M3 aesthetic differentiates from flat M2 design
3. **Visual Hierarchy** - Larger corner radii indicate more important surfaces
4. **Touch Friendliness** - Rounded targets feel more natural on touchscreens
5. **Flow & Movement** - Curves guide the eye through layouts more naturally

### M3 vs M2 Shapes

| Aspect          | M2                      | M3                                  |
| --------------- | ----------------------- | ----------------------------------- |
| **Default**     | 4px corners             | 12px corners (medium)               |
| **Range**       | Limited (0px, 4px, 8px) | Expansive (0px - 28px + full)       |
| **Buttons**     | 4px corners             | Fully rounded (pill shape)          |
| **Dialogs**     | Small corners (8px)     | Extra large corners (28px)          |
| **Philosophy**  | Subtle, minimal         | Bold, expressive                    |
| **Consistency** | Fixed values            | Semantic scale with component roles |

## Shape Scale Reference

M3 defines **7 shape scale values** for border-radius:

| Token           | Value      | Visual | Use Case                          |
| --------------- | ---------- | ------ | --------------------------------- |
| **none**        | 0px        | ▭      | Sharp corners, legacy components  |
| **extra-small** | 4px        | ▢      | Text fields, menus, tooltips      |
| **small**       | 8px        | ▢      | Chips, small cards                |
| **medium**      | 12px       | ▢      | Cards, standard components        |
| **large**       | 16px       | ▢      | Large cards, FAB, dialogs         |
| **extra-large** | 28px       | ▢      | Prominent surfaces (dialogs, FAB) |
| **full**        | 9999px/50% | ●      | Pills (buttons), circles (avatar) |

### Key Observations

- **Medium (12px) is the default** - Most components use medium corners
- **Full rounding is common** - Buttons, badges, switches use pill/circle shapes
- **Hierarchy through size** - Larger radii = more prominent surfaces
- **Extra-large is dramatic** - 28px creates strong visual impact

## Shape Scale Details

### None (0px)

**Sharp corners - no rounding**

```css
border-radius: var(--md-sys-shape-none); /* 0px */
```

**Usage:**

- Fullscreen dialogs
- Edge-to-edge surfaces
- Legacy components requiring sharp corners
- Specific design needs

**Example:**

```tsx
<dialog className="shape-none">Fullscreen Dialog</dialog>
```

### Extra Small (4px)

**Subtle rounding - minimal softness**

```css
border-radius: var(--md-sys-shape-extra-small); /* 4px */
```

**Usage:**

- Text fields (filled and outlined)
- Dropdown menus
- Tooltips
- Snackbars
- Compact components

**Example:**

```tsx
<input className="shape-extra-small" type="text" placeholder="Enter weight" />
```

### Small (8px)

**Gentle rounding - balanced softness**

```css
border-radius: var(--md-sys-shape-small); /* 8px */
```

**Usage:**

- Chips (assist, filter, input, suggestion)
- Small cards
- Navigation items
- List items

**Example:**

```tsx
<div className="shape-small">
  <span>Filter</span>
</div>
```

### Medium (12px)

**Balanced rounding - M3 default**

```css
border-radius: var(--md-sys-shape-medium); /* 12px */
```

**Usage:**

- Cards (standard size)
- Input fields
- Tabs
- Most standard components

**Example:**

```tsx
<div className="shape-card">
  <h3>Daily Steps</h3>
  <p>10,245 steps today</p>
</div>
```

### Large (16px)

**Prominent rounding - strong presence**

```css
border-radius: var(--md-sys-shape-large); /* 16px */
```

**Usage:**

- Large cards
- FAB (Floating Action Button)
- Extended FAB
- Navigation drawer
- Bottom navigation

**Example:**

```tsx
<button className="shape-fab">
  <PlusIcon />
</button>
```

### Extra Large (28px)

**Dramatic rounding - maximum impact**

```css
border-radius: var(--md-sys-shape-extra-large); /* 28px */
```

**Usage:**

- Modal dialogs
- Bottom sheets (top corners)
- Large FAB
- Hero sections
- Prominent surfaces

**Example:**

```tsx
<dialog className="shape-dialog">
  <h2>Confirm Action</h2>
  <p>Are you sure?</p>
</dialog>
```

### Full (9999px / 50%)

**Fully rounded - pills and circles**

```css
border-radius: var(--md-sys-shape-full); /* 9999px */
border-radius: var(--md-sys-shape-circle); /* 50% */
```

**Usage:**

- **9999px** - Pill shapes (buttons, badges, tracks)
- **50%** - Perfect circles (avatars, icon buttons, thumbs)

**Example:**

```tsx
{
  /* Pill button */
}
<button className="shape-button">Start Workout</button>;

{
  /* Circular avatar */
}
<img src="avatar.jpg" className="shape-avatar" />;
```

## Component-Specific Shapes

### Buttons

```css
--md-sys-shape-button: 9999px; /* Standard button - fully rounded (pill) */
--md-sys-shape-button-icon: 50%; /* Icon button - circular */
--md-sys-shape-button-extended: 16px; /* Extended FAB - large corners */
```

**Usage:**

```tsx
{
  /* Standard button */
}
<button style={{ borderRadius: 'var(--md-sys-shape-button)' }}>Submit</button>;

{
  /* Icon button */
}
<button
  style={{
    borderRadius: 'var(--md-sys-shape-button-icon)',
    width: '48px',
    height: '48px',
  }}
>
  <SearchIcon />
</button>;
```

### Cards

```css
--md-sys-shape-card: 12px; /* Standard card - medium */
--md-sys-shape-card-large: 16px; /* Large feature card - large */
```

**Usage:**

```tsx
{
  /* Standard card */
}
<div className="shape-card elevation-2">
  <h3>Health Metrics</h3>
  <p>Your daily summary</p>
</div>;

{
  /* Large feature card */
}
<div className="shape-card-large elevation-2">
  <h2>Workout Plan</h2>
  <p>Premium content</p>
</div>;
```

### Chips

```css
--md-sys-shape-chip: 8px; /* All chip types use small corners */
```

**Usage:**

```tsx
<div className="shape-chip">
  <span>Cardio</span>
  <CloseIcon />
</div>
```

### Dialogs

```css
--md-sys-shape-dialog: 28px; /* Modal dialog - extra large */
--md-sys-shape-dialog-fullscreen: 0px; /* Fullscreen dialog - no rounding */
```

**Usage:**

```tsx
{
  /* Modal dialog */
}
<dialog className="shape-dialog elevation-dialog">
  <h2>Delete Workout?</h2>
  <p>This action cannot be undone.</p>
  <div>
    <button>Cancel</button>
    <button>Delete</button>
  </div>
</dialog>;
```

### FAB (Floating Action Button)

```css
--md-sys-shape-fab-small: 12px; /* Small FAB - medium */
--md-sys-shape-fab: 16px; /* Standard FAB - large */
--md-sys-shape-fab-large: 28px; /* Large FAB - extra large */
--md-sys-shape-fab-extended: 16px; /* Extended FAB - large */
```

**FAB Sizes:**

| Size     | Corner Radius | Width × Height | Icon Size |
| -------- | ------------- | -------------- | --------- |
| Small    | 12px          | 40px × 40px    | 24px      |
| Standard | 16px          | 56px × 56px    | 24px      |
| Large    | 28px          | 96px × 96px    | 36px      |
| Extended | 16px          | Auto × 56px    | 24px      |

**Usage:**

```tsx
{
  /* Standard FAB */
}
<button
  className="shape-fab"
  style={{
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    width: '56px',
    height: '56px',
  }}
>
  <AddIcon />
</button>;

{
  /* Extended FAB */
}
<button
  className="shape-fab-extended"
  style={{
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    padding: '0 16px',
    height: '56px',
  }}
>
  <AddIcon />
  <span>New Workout</span>
</button>;
```

### Text Fields

```css
--md-sys-shape-text-field-filled: 4px 4px 0 0; /* Filled - top corners only */
--md-sys-shape-text-field-outlined: 4px; /* Outlined - all corners */
```

**Usage:**

```tsx
{
  /* Filled text field */
}
<input style={{ borderRadius: 'var(--md-sys-shape-text-field-filled)' }} type="text" />;

{
  /* Outlined text field */
}
<input style={{ borderRadius: 'var(--md-sys-shape-text-field-outlined)' }} type="text" />;
```

### Navigation Drawer

```css
--md-sys-shape-nav-drawer: 0 16px 16px 0; /* Standard - right corners only */
--md-sys-shape-nav-drawer-modal: 16px; /* Modal - all corners */
```

**Usage:**

```tsx
{
  /* Standard drawer (left edge) */
}
<nav style={{ borderRadius: 'var(--md-sys-shape-nav-drawer)' }}>
  <ul>
    <li>Dashboard</li>
    <li>Workouts</li>
    <li>Settings</li>
  </ul>
</nav>;
```

### Bottom Sheet

```css
--md-sys-shape-bottom-sheet: 28px 28px 0 0; /* Top corners only - extra large */
```

**Usage:**

```tsx
<div
  className="shape-bottom-sheet"
  style={{
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
  }}
>
  <h3>Filter Options</h3>
  <div>Sheet content</div>
</div>
```

### Other Components

```css
--md-sys-shape-menu: 4px; /* Dropdown menus */
--md-sys-shape-snackbar: 4px; /* Snackbars */
--md-sys-shape-tooltip: 4px; /* Tooltips */
--md-sys-shape-badge: 9999px; /* Badges - fully rounded */
--md-sys-shape-avatar: 50%; /* Avatars - circular */
--md-sys-shape-switch-track: 9999px; /* Switch track - pill */
--md-sys-shape-switch-thumb: 50%; /* Switch thumb - circular */
--md-sys-shape-slider-track: 9999px; /* Slider track - pill */
--md-sys-shape-slider-thumb: 50%; /* Slider thumb - circular */
--md-sys-shape-progress-linear: 9999px; /* Linear progress - pill */
--md-sys-shape-progress-circular: 50%; /* Circular progress - circular */
```

## Asymmetric Corner Patterns

M3 supports **asymmetric rounding** for surfaces that connect to edges or other surfaces:

### Top-Only Rounding

**Use when:** Surface connects to bottom edge or continues downward

```css
--md-sys-shape-top-extra-small: 4px 4px 0 0;
--md-sys-shape-top-small: 8px 8px 0 0;
--md-sys-shape-top-medium: 12px 12px 0 0;
--md-sys-shape-top-large: 16px 16px 0 0;
--md-sys-shape-top-extra-large: 28px 28px 0 0;
```

**Example:**

```tsx
<div className="shape-top-extra-large">
  <h3>Bottom Sheet Header</h3>
</div>
```

### Bottom-Only Rounding

**Use when:** Surface connects to top edge or continues upward

```css
--md-sys-shape-bottom-extra-small: 0 0 4px 4px;
--md-sys-shape-bottom-small: 0 0 8px 8px;
--md-sys-shape-bottom-medium: 0 0 12px 12px;
--md-sys-shape-bottom-large: 0 0 16px 16px;
--md-sys-shape-bottom-extra-large: 0 0 28px 28px;
```

**Example:**

```tsx
<div className="shape-bottom-medium">
  <p>Card footer</p>
</div>
```

### Left-Only Rounding

**Use when:** Surface connects to right edge (left-side drawer)

```css
--md-sys-shape-left-large: 16px 0 0 16px;
```

**Example:**

```tsx
<nav
  style={{
    borderRadius: 'var(--md-sys-shape-left-large)',
    position: 'fixed',
    right: 0,
  }}
>
  Right-side navigation
</nav>
```

### Right-Only Rounding

**Use when:** Surface connects to left edge (standard drawer)

```css
--md-sys-shape-right-large: 0 16px 16px 0;
```

**Example:**

```tsx
<nav
  style={{
    borderRadius: 'var(--md-sys-shape-right-large)',
    position: 'fixed',
    left: 0,
  }}
>
  Left-side navigation
</nav>
```

## Implementation Methods

### Method 1: CSS Custom Properties (Recommended)

```css
.my-card {
  border-radius: var(--md-sys-shape-card);
}

.my-button {
  border-radius: var(--md-sys-shape-button);
}
```

### Method 2: Utility Classes

```html
<!-- Medium corners -->
<div class="shape-medium">Content</div>

<!-- Fully rounded button -->
<button class="shape-button">Click me</button>

<!-- Top corners only -->
<div class="shape-top-extra-large">Bottom sheet</div>
```

### Method 3: Inline Styles (TypeScript)

```tsx
const cardStyle = {
  borderRadius: 'var(--md-sys-shape-card)',
  padding: 'var(--md-sys-spacing-card-padding)',
};

<div style={cardStyle}>
  <h3>Card Title</h3>
</div>;
```

### Method 4: Combined with Elevation

```tsx
<div className="shape-card elevation-tint-2">
  <h3>Elevated Card with Rounded Corners</h3>
</div>
```

## Shape Decision Guide

### Choosing the Right Shape Value

**Use this flowchart:**

```
Is it a button or pill-shaped element?
├─ Yes → shape-full (9999px)
└─ No
   ├─ Is it circular? (avatar, icon button, thumb)
   │  └─ Yes → shape-circle (50%)
   └─ No
      ├─ Is it a prominent surface? (dialog, large card, FAB)
      │  └─ Yes → shape-extra-large (28px) or shape-large (16px)
      └─ No
         ├─ Is it a standard component? (card, tab)
         │  └─ Yes → shape-medium (12px) ← Most common
         └─ No
            ├─ Is it compact? (chip, small card)
            │  └─ Yes → shape-small (8px)
            └─ No
               └─ Minimal rounding? → shape-extra-small (4px)
```

### Common Patterns

| Component Type   | Shape Value   | Example                |
| ---------------- | ------------- | ---------------------- |
| Buttons          | `full`        | Submit, Cancel buttons |
| Icon Buttons     | `circle`      | Search, Menu icons     |
| Cards            | `medium`      | Dashboard cards        |
| Large Cards      | `large`       | Feature cards          |
| Dialogs          | `extra-large` | Modal dialogs          |
| FAB              | `large`       | Floating action button |
| Chips            | `small`       | Filter, category chips |
| Text Fields      | `extra-small` | Input fields           |
| Menus            | `extra-small` | Dropdown menus         |
| Bottom Sheets    | `top-xl`      | Modal bottom sheets    |
| Filled TextField | `top-xs`      | Material filled input  |
| Navigation       | `right-large` | Left-side drawer       |

## Best Practices

### ✅ Do

- **Use the shape scale** - Always use tokens, never hardcode border-radius
- **Stick to component shapes** - Use `--md-sys-shape-button` instead of generic scale
- **Use medium as default** - When unsure, `shape-medium` (12px) works for most components
- **Match hierarchy** - Larger corners = more important surfaces
- **Use asymmetric patterns** - Top-only rounding for bottom sheets, right-only for drawers
- **Combine with elevation** - Shapes work beautifully with M3 elevation system
- **Use full for pills** - Buttons, badges, and tracks should use `shape-full` (9999px)
- **Use circle for perfect circles** - Avatars, icon buttons use `shape-circle` (50%)

### ❌ Don't

- **Don't hardcode border-radius** - Use tokens for consistency
- **Don't mix shape systems** - Stick to M3 shape scale (no random values like 15px)
- **Don't over-round small elements** - Text fields shouldn't use large corners
- **Don't under-round large surfaces** - Dialogs need extra-large corners (28px)
- **Don't forget responsive** - Larger screens can support larger corner radii
- **Don't use sharp corners by default** - M3 is about rounded corners
- **Don't ignore asymmetric patterns** - They're essential for edge-connected surfaces

## Integration with Index.css

Add shape import to your main CSS file:

```css
/* frontend/src/index.css */
@import './styles/tokens/m3-light.css';
@import './styles/tokens/m3-dark.css';
@import './styles/tokens/typography.css';
@import './styles/tokens/spacing.css';
@import './styles/tokens/elevation.css';
@import './styles/tokens/shape.css';
```

## Common Use Cases

### Dashboard Card Grid

```tsx
<div
  style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: 'var(--md-sys-spacing-grid-gap)',
  }}
>
  <div
    className="shape-card elevation-tint-2"
    style={{ padding: 'var(--md-sys-spacing-card-padding)' }}
  >
    <h3>Steps Today</h3>
    <p>10,245</p>
  </div>
  <div
    className="shape-card elevation-tint-2"
    style={{ padding: 'var(--md-sys-spacing-card-padding)' }}
  >
    <h3>Calories Burned</h3>
    <p>1,847 kcal</p>
  </div>
</div>
```

### Floating Action Button

```tsx
<button
  className="shape-fab elevation-fab"
  style={{
    position: 'fixed',
    bottom: 'var(--md-sys-spacing-6)',
    right: 'var(--md-sys-spacing-6)',
    width: '56px',
    height: '56px',
    backgroundColor: 'var(--md-sys-color-primary)',
    color: 'var(--md-sys-color-on-primary)',
    border: 'none',
    cursor: 'pointer',
  }}
>
  <AddIcon />
</button>
```

### Modal Dialog

```tsx
<dialog
  className="shape-dialog elevation-dialog"
  style={{
    padding: 'var(--md-sys-spacing-dialog-padding)',
    backgroundColor: 'var(--md-sys-color-surface)',
    color: 'var(--md-sys-color-on-surface)',
    border: 'none',
  }}
>
  <h2 style={{ marginBottom: 'var(--md-sys-spacing-dialog-title-margin)' }}>Confirm Deletion</h2>
  <p>This workout will be permanently deleted.</p>
  <div style={{ display: 'flex', gap: 'var(--md-sys-spacing-dialog-actions-gap)' }}>
    <button className="shape-button">Cancel</button>
    <button className="shape-button">Delete</button>
  </div>
</dialog>
```

### Bottom Sheet

```tsx
<div
  className="shape-bottom-sheet elevation-dialog"
  style={{
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 'var(--md-sys-spacing-dialog-padding)',
    backgroundColor: 'var(--md-sys-color-surface)',
  }}
>
  <h3>Filter Workouts</h3>
  <div style={{ display: 'flex', gap: 'var(--md-sys-spacing-2)', flexWrap: 'wrap' }}>
    <div className="shape-chip">Cardio</div>
    <div className="shape-chip">Strength</div>
    <div className="shape-chip">Yoga</div>
  </div>
</div>
```

### Chip Collection

```tsx
<div style={{ display: 'flex', gap: 'var(--md-sys-spacing-2)', flexWrap: 'wrap' }}>
  {categories.map((category) => (
    <div
      key={category}
      className="shape-chip"
      style={{
        padding: 'var(--md-sys-spacing-chip-padding-y) var(--md-sys-spacing-chip-padding-x)',
        backgroundColor: 'var(--md-sys-color-secondary-container)',
        color: 'var(--md-sys-color-on-secondary-container)',
      }}
    >
      {category}
    </div>
  ))}
</div>
```

## Accessibility Considerations

### Focus Indicators

Border-radius should not interfere with focus indicators:

```css
button {
  border-radius: var(--md-sys-shape-button);
  outline-offset: 2px; /* Keeps focus ring outside rounded corners */
}

button:focus-visible {
  outline: 2px solid var(--md-sys-color-primary);
}
```

### Touch Targets

Ensure rounded corners don't reduce touch target size:

```css
button {
  min-width: 44px; /* WCAG 2.1 Level AA */
  min-height: 44px;
  border-radius: var(--md-sys-shape-button);
}
```

### Visual Clarity

Corner rounding is purely aesthetic and doesn't affect:

- Screen reader announcements
- Keyboard navigation
- Tab order
- ARIA labels

## Resources

- [Material Design 3 Shape](https://m3.material.io/styles/shape/overview)
- [Shape Tokens](https://m3.material.io/styles/shape/shape-scale-tokens)
- [Applying Shape](https://m3.material.io/styles/shape/applying-shape)

---

**Files:**

- `frontend/src/styles/tokens/shape.json` - Token definitions
- `frontend/src/styles/tokens/shape.css` - CSS Custom Properties
- `docs/shape-guide.md` - This documentation
