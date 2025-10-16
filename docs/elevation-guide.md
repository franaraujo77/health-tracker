# Material Design 3 Elevation Guide - Health Tracker

**Generated:** 2025-10-16
**Epic:** Migrate Frontend Components to Material Design 3
**Story:** Design Token System Implementation
**Task:** Create M3 elevation tokens (shadow and surface tint system)

## Overview

This document describes the Material Design 3 elevation system implemented for the Health Tracker application. M3 uses a sophisticated two-part system: **shadows for depth perception** + **surface tints for brand cohesion**.

## M3 Elevation Revolution

Material Design 3 fundamentally changed how elevation works:

### Old Approach (M2)

- Heavy drop shadows only
- Dark theme shadows barely visible
- No brand integration

### New Approach (M3)

- **Light shadows** + **primary color tint overlay**
- Dark theme: prominent tints (shadows less important)
- Creates cohesive brand presence across surfaces

## Elevation Levels

M3 defines **6 elevation levels** (0-5) corresponding to physical heights in density-independent pixels (dp):

| Level | DP   | Shadow    | Tint (Light) | Tint (Dark) | Usage                      |
| ----- | ---- | --------- | ------------ | ----------- | -------------------------- |
| **0** | 0dp  | None      | 0%           | 0%          | Base surface, no elevation |
| **1** | 1dp  | Subtle    | 5%           | 8%          | Search bars, input fields  |
| **2** | 3dp  | Light     | 8%           | 11%         | Cards, buttons, menus      |
| **3** | 6dp  | Medium    | 11%          | 14%         | FAB, snackbars, tooltips   |
| **4** | 8dp  | Prominent | 14%          | 17%         | Nav drawer, app bar        |
| **5** | 12dp | Maximum   | 17%          | 20%         | Dialogs, bottom sheets     |

### Key Observations

- **Dark theme tints are stronger** (shadows less visible on dark backgrounds)
- **Tint opacity increases with elevation** (higher = more primary color)
- **Shadows remain subtle** (not heavy like M2)

## Shadow Composition

M3 uses **two-layer shadows** for realistic depth:

1. **Key Shadow** - Directional shadow simulating light source
2. **Ambient Shadow** - Soft diffusion creating subtle halo

**Example (Level 2):**

```css
box-shadow:
  0px 1px 2px rgba(0, 0, 0, 0.3),
  /* Key shadow */ 0px 2px 6px 2px rgba(0, 0, 0, 0.15); /* Ambient shadow */
```

## Surface Tint System

Surface tints apply the **primary color as a semi-transparent overlay**:

**Light Theme:**

- Tint opacity: 5-17%
- Creates subtle brand presence
- Shadows remain primary depth cue

**Dark Theme:**

- Tint opacity: 8-20% (stronger!)
- Tint becomes primary depth cue
- Elevated surfaces literally "glow" with brand color

### How Tints Work

```css
/* Surface with level 2 elevation */
.card {
  position: relative;
  background-color: var(--md-sys-color-surface);
  box-shadow: var(--md-sys-elevation-2-shadow);
}

/* Tint overlay (::before pseudo-element) */
.card::before {
  content: '';
  position: absolute;
  inset: 0;
  background-color: var(--md-sys-color-primary);
  opacity: var(--md-sys-elevation-2-tint-opacity); /* 8% light, 11% dark */
  pointer-events: none;
  border-radius: inherit;
}
```

## Implementation Methods

### Method 1: Shadow Only (Simple)

Use when tint is not needed:

```tsx
<div className="elevation-2">Card content</div>
```

```css
.elevation-2 {
  box-shadow: var(--md-sys-elevation-2-shadow);
  z-index: 2;
}
```

### Method 2: Shadow + Tint (Complete M3)

For full M3 specification with tint:

```tsx
<div className="elevation-tint-2">Card content with surface tint</div>
```

```css
.elevation-tint-2 {
  position: relative;
  box-shadow: var(--md-sys-elevation-2-shadow);
  z-index: 2;
}

.elevation-tint-2::before {
  content: '';
  position: absolute;
  inset: 0;
  background-color: var(--md-sys-color-primary);
  opacity: var(--md-sys-elevation-2-tint-opacity);
  pointer-events: none;
  border-radius: inherit;
}
```

### Method 3: CSS Variables (Custom)

For custom implementations:

```css
.custom-surface {
  box-shadow: var(--md-sys-elevation-3-shadow);
  z-index: var(--md-sys-elevation-3-z-index);
}
```

### Method 4: Component-Specific

Use pre-configured component elevations:

```css
.my-card {
  box-shadow: var(--md-sys-elevation-card);
}

.my-card:hover {
  box-shadow: var(--md-sys-elevation-card-hover);
}
```

## Component Elevations

### Cards

```css
--md-sys-elevation-card: level 2 (3dp) --md-sys-elevation-card-hover: level 3 (6dp);
```

**Usage:**

```tsx
<div className="elevation-card">
  <h3>Daily Steps</h3>
  <p>10,245 steps today</p>
</div>
```

### Floating Action Button (FAB)

```css
--md-sys-elevation-fab: level 3 (6dp) --md-sys-elevation-fab-hover: level 4 (8dp)
  --md-sys-elevation-fab-pressed: level 3 (6dp);
```

**Usage:**

```tsx
<button className="elevation-fab">
  <PlusIcon />
</button>
```

### Dialogs

```css
--md-sys-elevation-dialog: level 5 (12dp);
```

**Usage:**

```tsx
<dialog className="elevation-dialog">
  <h2>Confirm Action</h2>
  <p>Are you sure?</p>
</dialog>
```

### App Bar

```css
--md-sys-elevation-app-bar: level 0 (0dp) when at top --md-sys-elevation-app-bar-scrolled: level 4
  (8dp) when scrolled;
```

**Usage:**

```tsx
const [scrolled, setScrolled] = useState(false);

<header className={scrolled ? 'elevation-4' : 'elevation-0'}>
  <h1>Health Tracker</h1>
</header>;
```

### Navigation Drawer

```css
--md-sys-elevation-nav-drawer: level 4 (8dp);
```

### Menus & Dropdowns

```css
--md-sys-elevation-menu: level 2 (3dp);
```

### Snackbars & Tooltips

```css
--md-sys-elevation-snackbar: level 3 (6dp) --md-sys-elevation-tooltip: level 3 (6dp);
```

## Hover & Interaction States

Elevation changes on interaction provide tactile feedback:

```css
.card {
  box-shadow: var(--md-sys-elevation-2-shadow);
  transition: box-shadow 280ms cubic-bezier(0.4, 0, 0.2, 1);
}

.card:hover {
  box-shadow: var(--md-sys-elevation-3-shadow);
}
```

**Transition:** 280ms with M3 easing curve (`cubic-bezier(0.4, 0, 0.2, 1)`)

## Z-Index Management

Elevation levels map directly to z-index values:

| Level | Z-Index | Purpose             |
| ----- | ------- | ------------------- |
| 0     | 0       | Base content        |
| 1     | 1       | Slightly elevated   |
| 2     | 2       | Cards, menus        |
| 3     | 3       | FABs, snackbars     |
| 4     | 4       | Nav drawer, app bar |
| 5     | 5       | Modals, dialogs     |

This creates predictable stacking behavior.

## Best Practices

### ✅ Do

- Use elevation levels consistently (don't create custom levels)
- Include both shadow and tint for complete M3 implementation
- Use smooth transitions for elevation changes (280ms)
- Map z-index to elevation level
- Use component-specific elevations when available

### ❌ Don't

- Don't create custom shadow values outside the 6 levels
- Don't use heavy shadows (M3 is subtle)
- Don't ignore surface tints (they're essential in dark theme)
- Don't mix M2 and M3 elevation styles
- Don't use elevation for decorative purposes (use borders instead)

## Common Patterns

### Dashboard Card Grid

```tsx
<div
  style={{
    display: 'grid',
    gap: 'var(--md-sys-spacing-grid-gap)',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  }}
>
  <div
    className="elevation-tint-2"
    style={{
      padding: 'var(--md-sys-spacing-card-padding)',
      borderRadius: '12px',
    }}
  >
    <h3>Card 1</h3>
  </div>
  <div
    className="elevation-tint-2"
    style={{
      padding: 'var(--md-sys-spacing-card-padding)',
      borderRadius: '12px',
    }}
  >
    <h3>Card 2</h3>
  </div>
</div>
```

### Floating Action Button

```tsx
<button
  className="elevation-fab"
  style={{
    position: 'fixed',
    bottom: 'var(--md-sys-spacing-6)',
    right: 'var(--md-sys-spacing-6)',
    borderRadius: '50%',
    width: '56px',
    height: '56px',
    backgroundColor: 'var(--md-sys-color-primary)',
    color: 'var(--md-sys-color-on-primary)',
  }}
>
  <PlusIcon />
</button>
```

### Modal Dialog

```tsx
<dialog
  className="elevation-dialog"
  style={{
    padding: 'var(--md-sys-spacing-dialog-padding)',
    borderRadius: '24px',
    backgroundColor: 'var(--md-sys-color-surface)',
    color: 'var(--md-sys-color-on-surface)',
  }}
>
  <h2>Confirm Deletion</h2>
  <p>This action cannot be undone.</p>
  <div style={{ gap: 'var(--md-sys-spacing-dialog-actions-gap)', display: 'flex' }}>
    <button>Cancel</button>
    <button>Delete</button>
  </div>
</dialog>
```

## Integration with Index.css

Add elevation import to your main CSS file:

```css
/* frontend/src/index.css */
@import './styles/tokens/m3-light.css';
@import './styles/tokens/m3-dark.css';
@import './styles/tokens/typography.css';
@import './styles/tokens/spacing.css';
@import './styles/tokens/elevation.css';
```

## Accessibility

- **Focus indicators** should use elevation changes sparingly
- **Keyboard navigation** should not rely solely on elevation
- **Screen readers** don't convey elevation - use ARIA labels
- **Motion reduction** - respect `prefers-reduced-motion` for transitions

## Resources

- [Material Design 3 Elevation](https://m3.material.io/styles/elevation/overview)
- [Elevation Tokens](https://m3.material.io/styles/elevation/tokens)
- [Surface Tint](https://m3.material.io/styles/color/the-color-system/color-roles#surface-tint)

---

**Files:**

- `frontend/src/styles/tokens/elevation.json` - Token definitions
- `frontend/src/styles/tokens/elevation.css` - CSS Custom Properties
- `docs/elevation-guide.md` - This documentation
