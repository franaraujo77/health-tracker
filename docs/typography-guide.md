# Material Design 3 Typography Guide - Health Tracker

**Generated:** 2025-10-16
**Epic:** Migrate Frontend Components to Material Design 3
**Story:** Design Token System Implementation
**Task:** Create M3 typography token definitions

## Overview

This document describes the Material Design 3 typography system implemented for the Health Tracker application. The type scale defines **15 typography styles** across 5 categories, ensuring consistent and hierarchical text presentation throughout the application.

## Type Scale Categories

Material Design 3 organizes typography into 5 semantic categories:

1. **Display** - Largest, most prominent text (hero sections, major headlines)
2. **Headline** - Page and section titles
3. **Title** - Prominent UI elements (cards, dialogs, lists)
4. **Body** - Paragraph text and descriptions
5. **Label** - UI labels (buttons, chips, form fields)

Each category has **3 sizes** (Large, Medium, Small) = **15 total type scales**

## Font Families

Three font stacks are defined for different use cases:

### Brand Font (Primary)

```css
--md-sys-typescale-font-family-brand: 'Roboto', system-ui, -apple-system, 'Segoe UI', sans-serif;
```

**Usage:** Most UI text (default)
**Benefits:** Professional, highly legible, optimized for screens

### Plain Font (System)

```css
--md-sys-typescale-font-family-plain:
  system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif;
```

**Usage:** High-performance scenarios, native system feel
**Benefits:** Zero font loading time, native OS aesthetics

### Code Font (Monospace)

```css
--md-sys-typescale-font-family-code: 'Roboto Mono', 'Courier New', monospace;
```

**Usage:** Code snippets, numeric data, fixed-width content
**Benefits:** Character alignment, data readability

## Type Scale Reference

### Display Scales

#### Display Large

**Usage:** Hero sections, major headlines (e.g., dashboard welcome message)

| Property       | Value         |
| -------------- | ------------- |
| Font Size      | 57px          |
| Line Height    | 64px          |
| Font Weight    | 400 (Regular) |
| Letter Spacing | -0.25px       |

```css
.md-typescale-display-large {
  font-family: var(--md-sys-typescale-display-large-font);
  font-size: var(--md-sys-typescale-display-large-size);
  line-height: var(--md-sys-typescale-display-large-line-height);
  font-weight: var(--md-sys-typescale-display-large-weight);
  letter-spacing: var(--md-sys-typescale-display-large-tracking);
}
```

**Example:**

```tsx
<h1 className="md-typescale-display-large">Welcome to Health Tracker</h1>
```

#### Display Medium

**Usage:** Section headers, feature callouts

| Property       | Value         |
| -------------- | ------------- |
| Font Size      | 45px          |
| Line Height    | 52px          |
| Font Weight    | 400 (Regular) |
| Letter Spacing | 0px           |

#### Display Small

**Usage:** Card headers, dialog titles

| Property       | Value         |
| -------------- | ------------- |
| Font Size      | 36px          |
| Line Height    | 44px          |
| Font Weight    | 400 (Regular) |
| Letter Spacing | 0px           |

---

### Headline Scales

#### Headline Large

**Usage:** Page titles, main navigation headers

| Property       | Value         |
| -------------- | ------------- |
| Font Size      | 32px          |
| Line Height    | 40px          |
| Font Weight    | 400 (Regular) |
| Letter Spacing | 0px           |

**Example:**

```tsx
<h2 className="md-typescale-headline-large">Daily Activity Summary</h2>
```

#### Headline Medium

**Usage:** Section titles, modal headers

| Property       | Value         |
| -------------- | ------------- |
| Font Size      | 28px          |
| Line Height    | 36px          |
| Font Weight    | 400 (Regular) |
| Letter Spacing | 0px           |

#### Headline Small

**Usage:** Subsection titles, widget headers

| Property       | Value         |
| -------------- | ------------- |
| Font Size      | 24px          |
| Line Height    | 32px          |
| Font Weight    | 400 (Regular) |
| Letter Spacing | 0px           |

---

### Title Scales

#### Title Large

**Usage:** Prominent list items, card headers, emphasized content

| Property       | Value         |
| -------------- | ------------- |
| Font Size      | 22px          |
| Line Height    | 28px          |
| Font Weight    | 400 (Regular) |
| Letter Spacing | 0px           |

**Example:**

```tsx
<h3 className="md-typescale-title-large">Today's Workout</h3>
```

#### Title Medium

**Usage:** Dialog headers, emphasized text, list categories

| Property       | Value        |
| -------------- | ------------ |
| Font Size      | 16px         |
| Line Height    | 24px         |
| Font Weight    | 500 (Medium) |
| Letter Spacing | 0.15px       |

#### Title Small

**Usage:** List item headers, dense UI, compact cards

| Property       | Value        |
| -------------- | ------------ |
| Font Size      | 14px         |
| Line Height    | 20px         |
| Font Weight    | 500 (Medium) |
| Letter Spacing | 0.1px        |

---

### Body Scales

#### Body Large

**Usage:** Article content, long-form reading, detailed descriptions

| Property       | Value         |
| -------------- | ------------- |
| Font Size      | 16px          |
| Line Height    | 24px          |
| Font Weight    | 400 (Regular) |
| Letter Spacing | 0.5px         |

**Example:**

```tsx
<p className="md-typescale-body-large">
  Your weekly progress shows significant improvement in cardiovascular endurance and overall fitness
  levels...
</p>
```

#### Body Medium (Default)

**Usage:** Default paragraph text, descriptions, most UI content

| Property       | Value         |
| -------------- | ------------- |
| Font Size      | 14px          |
| Line Height    | 20px          |
| Font Weight    | 400 (Regular) |
| Letter Spacing | 0.25px        |

**This is the default body text scale - use for most content**

#### Body Small

**Usage:** Captions, helper text, secondary information

| Property       | Value         |
| -------------- | ------------- |
| Font Size      | 12px          |
| Line Height    | 16px          |
| Font Weight    | 400 (Regular) |
| Letter Spacing | 0.4px         |

---

### Label Scales

#### Label Large

**Usage:** Prominent buttons, primary tabs, call-to-action text

| Property       | Value        |
| -------------- | ------------ |
| Font Size      | 14px         |
| Line Height    | 20px         |
| Font Weight    | 500 (Medium) |
| Letter Spacing | 0.1px        |

**Example:**

```tsx
<button className="md-typescale-label-large">Start Workout</button>
```

#### Label Medium

**Usage:** Standard buttons, chips, form labels, menu items

| Property       | Value        |
| -------------- | ------------ |
| Font Size      | 12px         |
| Line Height    | 16px         |
| Font Weight    | 500 (Medium) |
| Letter Spacing | 0.5px        |

**Most common label size**

#### Label Small

**Usage:** Timestamps, badges, overlines, dense labels

| Property       | Value        |
| -------------- | ------------ |
| Font Size      | 11px         |
| Line Height    | 16px         |
| Font Weight    | 500 (Medium) |
| Letter Spacing | 0.5px        |

---

## Implementation Methods

### Method 1: CSS Utility Classes (Recommended)

Use pre-built utility classes for quick typography application:

```tsx
// Display
<h1 className="md-typescale-display-large">Hero Title</h1>

// Headline
<h2 className="md-typescale-headline-medium">Section Title</h2>

// Body
<p className="md-typescale-body-medium">Paragraph text</p>

// Label
<button className="md-typescale-label-large">Button Text</button>
```

### Method 2: CSS Custom Properties (Component Styles)

Use CSS variables directly in component stylesheets:

```css
.card-title {
  font-family: var(--md-sys-typescale-title-large-font);
  font-size: var(--md-sys-typescale-title-large-size);
  line-height: var(--md-sys-typescale-title-large-line-height);
  font-weight: var(--md-sys-typescale-title-large-weight);
  letter-spacing: var(--md-sys-typescale-title-large-tracking);
}
```

### Method 3: TypeScript Helper (Type-Safe)

Create a typography helper function:

```typescript
// src/styles/tokens/typography.ts
export type MDTypeScale =
  | 'display-large'
  | 'display-medium'
  | 'display-small'
  | 'headline-large'
  | 'headline-medium'
  | 'headline-small'
  | 'title-large'
  | 'title-medium'
  | 'title-small'
  | 'body-large'
  | 'body-medium'
  | 'body-small'
  | 'label-large'
  | 'label-medium'
  | 'label-small';

export function getTypeScaleClass(scale: MDTypeScale): string {
  return `md-typescale-${scale}`;
}

// Usage
import { getTypeScaleClass } from './styles/tokens/typography';

<h1 className={getTypeScaleClass('display-large')}>
  Title
</h1>
```

## Typography Decision Tree

Use this flowchart to select the appropriate type scale:

```
Is it a hero or major headline?
├─ Yes → Display Large/Medium/Small
└─ No
   ├─ Is it a page/section title?
   │  └─ Yes → Headline Large/Medium/Small
   └─ No
      ├─ Is it a UI element header (card, dialog)?
      │  └─ Yes → Title Large/Medium/Small
      └─ No
         ├─ Is it paragraph/description text?
         │  └─ Yes → Body Large/Medium/Small
         └─ No
            └─ Is it a button/chip/form label?
               └─ Yes → Label Large/Medium/Small
```

## Common Use Cases

### Dashboard Welcome

```tsx
<div>
  <h1 className="md-typescale-display-large">Good Morning, Alex</h1>
  <p className="md-typescale-body-large">You're 75% to your weekly goal</p>
</div>
```

### Card Component

```tsx
<div className="card">
  <h3 className="md-typescale-title-large">Daily Steps</h3>
  <p className="md-typescale-body-medium">10,245 steps today</p>
  <span className="md-typescale-label-small">Updated 2 min ago</span>
</div>
```

### Dialog

```tsx
<dialog>
  <h2 className="md-typescale-headline-medium">Confirm Deletion</h2>
  <p className="md-typescale-body-medium">Are you sure you want to delete this workout?</p>
  <button className="md-typescale-label-large">Delete</button>
  <button className="md-typescale-label-large">Cancel</button>
</dialog>
```

### Form

```tsx
<form>
  <label className="md-typescale-label-medium">Weight (kg)</label>
  <input type="number" />
  <span className="md-typescale-body-small">Enter your current weight</span>
</form>
```

## Responsive Typography

Currently, all type scales use fixed pixel values (no responsive scaling). For responsive behavior, you can:

### Option 1: CSS Media Queries

```css
@media (max-width: 768px) {
  :root {
    --md-sys-typescale-display-large-size: 45px;
    --md-sys-typescale-display-large-line-height: 52px;
  }
}
```

### Option 2: Container Queries (Modern Browsers)

```css
@container (max-width: 600px) {
  .card-title {
    font-size: var(--md-sys-typescale-title-medium-size);
  }
}
```

## Best Practices

### ✅ Do

- Use semantic type scales (display for heroes, headline for titles, etc.)
- Maintain hierarchy (display > headline > title > body > label)
- Use utility classes for consistency
- Combine type scales with M3 color tokens

### ❌ Don't

- Mix different type scale categories inconsistently
- Override font sizes without changing the entire type scale
- Use display scales for body text (poor readability)
- Hardcode font values instead of using tokens

## Accessibility

### Font Size Minimums

- **Body text:** Never below 14px (body-medium is the minimum)
- **Labels:** Never below 11px (label-small is the minimum)
- **Interactive elements:** Minimum touch target 44x44px

### Line Height

All type scales include optimal line heights for readability:

- **Display/Headline:** 1.12-1.25 ratio (tighter for large text)
- **Body:** 1.4-1.5 ratio (optimal for reading)
- **Label:** 1.33-1.45 ratio (balanced for UI elements)

### Letter Spacing

Positive tracking improves readability for smaller text:

- **Large text (>24px):** 0px or negative tracking
- **Medium text (14-22px):** 0-0.5px
- **Small text (<14px):** 0.4-0.5px

## Integration with Index.css

Add typography import to your main CSS file:

```css
/* frontend/src/index.css */
@import './styles/tokens/m3-light.css';
@import './styles/tokens/m3-dark.css';
@import './styles/tokens/typography.css';

body {
  /* Use body-medium as default */
  font-family: var(--md-sys-typescale-body-medium-font);
  font-size: var(--md-sys-typescale-body-medium-size);
  line-height: var(--md-sys-typescale-body-medium-line-height);
  font-weight: var(--md-sys-typescale-body-medium-weight);
  letter-spacing: var(--md-sys-typescale-body-medium-tracking);
}

h1 {
  /* Override with appropriate type scale in components */
}
h2 {
  /* Override with appropriate type scale in components */
}
h3 {
  /* Override with appropriate type scale in components */
}
```

## Resources

- [Material Design 3 Typography](https://m3.material.io/styles/typography/overview)
- [Type Scale Tokens](https://m3.material.io/styles/typography/type-scale-tokens)
- [Google Fonts - Roboto](https://fonts.google.com/specimen/Roboto)
- [Typography Accessibility (WCAG)](https://www.w3.org/WAI/WCAG21/Understanding/visual-presentation.html)

---

**Files:**

- `frontend/src/styles/tokens/typography.json` - Token definitions
- `frontend/src/styles/tokens/typography.css` - CSS Custom Properties
- `docs/typography-guide.md` - This documentation
