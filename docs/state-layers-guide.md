# Material Design 3 State Layers Guide - Health Tracker

**Generated:** 2025-10-16
**Epic:** Migrate Frontend Components to Material Design 3
**Story:** Design Token System Implementation
**Task:** Create state layer tokens (hover, focus, pressed, dragged)

## Overview

This document describes the Material Design 3 state layer system implemented for the Health Tracker application. State layers provide **visual feedback for interactive states** through **colored overlays with specific opacity values**, creating intuitive and accessible user interactions.

## What Are State Layers?

State layers are **semi-transparent colored overlays** that appear on interactive elements (buttons, cards, list items) when users interact with them. They provide immediate visual feedback that an element is:

- **Hoverable** - Mouse is over the element
- **Focused** - Keyboard navigation has selected the element
- **Pressed** - Element is being clicked or touched
- **Dragged** - Element is being dragged or moved

## M3 State Layer Philosophy

### Why State Layers?

1. **Instant Feedback** - Users know their actions are registered
2. **Discoverability** - Hoverable elements are immediately obvious
3. **Accessibility** - Keyboard focus becomes clearly visible
4. **Consistency** - Uniform interaction feedback across all components
5. **Tactile Feel** - Creates sense of physical interaction with digital elements

### M3 vs Traditional Hover Effects

| Aspect            | Traditional                 | M3 State Layers                   |
| ----------------- | --------------------------- | --------------------------------- |
| **Method**        | Darken/lighten background   | Colored overlay with opacity      |
| **Color**         | Arbitrary shade adjustments | Uses component's semantic color   |
| **Opacity**       | Inconsistent (varies)       | Standardized (8%, 12%, 16%)       |
| **Stacking**      | Not stackable               | Stackable (hover + pressed = 20%) |
| **Accessibility** | Often unclear focus         | 12% minimum for visible focus     |
| **Consistency**   | Varies by component         | Uniform across entire system      |

## State Layer Opacity Scale

M3 defines **4 interaction states** + **1 disabled state**:

| State        | Opacity                         | Usage                               | Trigger                           |
| ------------ | ------------------------------- | ----------------------------------- | --------------------------------- |
| **Hover**    | 8%                              | Mouse/pen hovers over element       | Mouse enter, pen hover            |
| **Focus**    | 12%                             | Keyboard navigation selects element | Tab, arrow keys                   |
| **Pressed**  | 12%                             | Element actively being pressed      | Mouse down, touch down            |
| **Dragged**  | 16%                             | Element being dragged/moved         | Drag operation                    |
| **Disabled** | 38% (content) / 12% (container) | Element is non-interactive          | disabled attribute, aria-disabled |

### Key Observations

- **Hover is subtle (8%)** - Lightest feedback for discoverable interactions
- **Focus is prominent (12%)** - Must be clearly visible for accessibility
- **Pressed matches focus (12%)** - Consistent weight for active states
- **Dragged is strongest (16%)** - Most dramatic feedback for ongoing action
- **State layers stack** - Hover (8%) + Pressed (12%) = 20% total

## State Opacity Details

### Hover (8%)

**Subtle feedback when pointer hovers over interactive element**

```css
opacity: var(--md-sys-state-hover-opacity); /* 0.08 */
```

**Behavior:**

- Triggered by mouse enter or pen hover
- Lightest state layer - indicates element is interactive
- Disappears on mouse leave
- Can combine with pressed state (both visible simultaneously)

**Example:**

```tsx
<button className="state-layer-primary">Hover Me</button>
```

**Visual Result:** 8% primary color overlay appears on hover

### Focus (12%)

**Indicates element has keyboard focus**

```css
opacity: var(--md-sys-state-focus-opacity); /* 0.12 */
```

**Behavior:**

- Triggered by keyboard navigation (Tab, Arrow keys)
- Must be clearly visible for WCAG compliance
- Persists until focus moves to another element
- Often accompanied by outline for maximum visibility

**Example:**

```tsx
<button className="state-layer-primary">
  {/* Keyboard navigation will show 12% overlay + outline */}
  Tab to Me
</button>
```

**Accessibility:** Focus indicators must meet 3:1 contrast ratio (WCAG 2.1)

### Pressed (12%)

**Active press or click feedback**

```css
opacity: var(--md-sys-state-pressed-opacity); /* 0.12 */
```

**Behavior:**

- Triggered by mouse down, touch down
- Same opacity as focus (12%) for consistency
- Visible during click/touch action
- Stacks with hover if both active

**Example:**

```tsx
<button className="state-layer-primary">
  {/* Shows 8% on hover, 20% when pressed (8% hover + 12% pressed) */}
  Click Me
</button>
```

**Stacking:** Hover (8%) + Pressed (12%) = 20% total opacity

### Dragged (16%)

**Element being dragged or moved**

```css
opacity: var(--md-sys-state-dragged-opacity); /* 0.16 */
```

**Behavior:**

- Highest opacity for maximum visibility
- Triggered during drag operations
- Persists throughout drag action
- Used for reordering, drag-and-drop

**Example:**

```tsx
<div draggable className="state-layer-on-surface">
  {/* Shows 16% overlay when being dragged */}
  Drag Me
</div>
```

**Use Case:** Reordering lists, dragging cards, moving elements

### Disabled (38% content / 12% container)

**Non-interactive state with reduced opacity**

```css
/* Disabled content (text, icons) */
opacity: var(--md-sys-state-disabled-content-opacity); /* 0.38 */

/* Disabled container (background, borders) */
opacity: var(--md-sys-state-disabled-container-opacity); /* 0.12 */
```

**Behavior:**

- Two separate opacity values for content vs container
- Content (38%) remains somewhat readable
- Container (12%) creates subtle presence
- No hover, focus, or pressed states
- Cursor changes to `not-allowed`

**Example:**

```tsx
<button
  disabled
  style={{
    opacity: 'var(--md-sys-state-disabled-content-opacity)',
  }}
>
  Cannot Click
</button>
```

## Implementation Methods

M3 state layers can be implemented using **3 primary methods**:

### Method 1: Pseudo-Element Overlay (Recommended)

**Use `::before` or `::after` pseudo-element with background-color and opacity**

```css
.button {
  position: relative;
  overflow: hidden;
  background-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
}

.button::before {
  content: '';
  position: absolute;
  inset: 0;
  background-color: var(--md-sys-color-on-primary);
  opacity: 0;
  transition: opacity 100ms cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
  border-radius: inherit;
}

.button:hover::before {
  opacity: 0.08; /* 8% hover state */
}

.button:focus-visible::before {
  opacity: 0.12; /* 12% focus state */
}

.button:active::before {
  opacity: 0.12; /* 12% pressed state */
}
```

**Pros:**

- Natural stacking (hover + pressed automatically combine)
- No extra DOM elements
- Easy to animate
- Inherits border-radius from parent

**Cons:**

- Requires `position: relative` on parent
- Uses up pseudo-element (can't use for other purposes)

### Method 2: RGBA Background (Simple)

**Use `rgba()` with state layer color and opacity**

```css
.button {
  background-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
  transition: background-color 100ms;
}

.button:hover {
  background-color: color-mix(
    in srgb,
    var(--md-sys-color-primary),
    var(--md-sys-color-on-primary) 8%
  );
}
```

**Pros:**

- Simple, no pseudo-elements needed
- Works with modern `color-mix()`
- Direct background manipulation

**Cons:**

- Cannot stack states (hover + pressed overwrites)
- Requires modern browser support for `color-mix()`

### Method 3: CSS Variable Control (Advanced)

**Use CSS custom property to control state layer opacity dynamically**

```css
.button {
  --state-layer-opacity: 0;
  position: relative;
  overflow: hidden;
}

.button::before {
  content: '';
  position: absolute;
  inset: 0;
  background-color: var(--md-sys-color-on-primary);
  opacity: var(--state-layer-opacity);
  transition: opacity 100ms;
  pointer-events: none;
}

.button:hover {
  --state-layer-opacity: 0.08;
}

.button:focus-visible {
  --state-layer-opacity: 0.12;
}

.button:active {
  --state-layer-opacity: calc(var(--state-layer-opacity) + 0.12);
}
```

**Pros:**

- Centralized opacity control
- Can manipulate via JavaScript
- Flexible for complex interactions

**Cons:**

- More verbose
- Requires understanding of CSS variables

## Component-Specific State Layers

### Filled Button

**Primary button with on-primary state layer**

```tsx
<button
  className="button-filled"
  style={{
    backgroundColor: 'var(--md-sys-color-primary)',
    color: 'var(--md-sys-color-on-primary)',
    borderRadius: 'var(--md-sys-shape-button)',
    padding: 'var(--md-sys-spacing-button-padding-y) var(--md-sys-spacing-button-padding-x)',
  }}
>
  Submit
</button>
```

```css
.button-filled {
  position: relative;
  overflow: hidden;
}

.button-filled::before {
  content: '';
  position: absolute;
  inset: 0;
  background-color: var(--md-sys-color-on-primary);
  opacity: 0;
  transition: opacity 100ms;
  pointer-events: none;
  border-radius: inherit;
}

.button-filled:hover::before {
  opacity: var(--md-sys-state-on-primary-hover); /* 8% */
}

.button-filled:focus-visible::before {
  opacity: var(--md-sys-state-on-primary-focus); /* 12% */
}

.button-filled:active::before {
  opacity: var(--md-sys-state-on-primary-pressed); /* 12% */
}
```

### Outlined Button

**Transparent button with primary state layer**

```tsx
<button
  className="button-outlined"
  style={{
    backgroundColor: 'transparent',
    color: 'var(--md-sys-color-primary)',
    border: '1px solid var(--md-sys-color-outline)',
    borderRadius: 'var(--md-sys-shape-button)',
  }}
>
  Cancel
</button>
```

```css
.button-outlined::before {
  background-color: var(--md-sys-color-primary);
}

.button-outlined:hover::before {
  opacity: var(--md-sys-state-primary-hover); /* 8% */
}
```

### Text Button

**Text-only button with primary state layer**

```tsx
<button
  className="button-text"
  style={{
    backgroundColor: 'transparent',
    color: 'var(--md-sys-color-primary)',
    border: 'none',
  }}
>
  Learn More
</button>
```

```css
.button-text::before {
  background-color: var(--md-sys-color-primary);
}

.button-text:hover::before {
  opacity: var(--md-sys-state-primary-hover); /* 8% */
}
```

### Interactive Card

**Card with on-surface state layer**

```tsx
<div
  className="card-interactive"
  style={{
    borderRadius: 'var(--md-sys-shape-card)',
    padding: 'var(--md-sys-spacing-card-padding)',
  }}
>
  <h3>Workout Summary</h3>
  <p>Click to view details</p>
</div>
```

```css
.card-interactive {
  position: relative;
  overflow: hidden;
  cursor: pointer;
}

.card-interactive::before {
  content: '';
  position: absolute;
  inset: 0;
  background-color: var(--md-sys-color-on-surface);
  opacity: 0;
  transition: opacity 100ms;
  pointer-events: none;
  border-radius: inherit;
}

.card-interactive:hover::before {
  opacity: var(--md-sys-state-on-surface-hover); /* 8% */
}

.card-interactive:active::before {
  opacity: var(--md-sys-state-on-surface-pressed); /* 12% */
}
```

### List Item

**Interactive list item with on-surface state layer**

```tsx
<li
  className="list-item-interactive"
  style={{
    padding: 'var(--md-sys-spacing-list-item-padding)',
  }}
>
  Dashboard
</li>
```

```css
.list-item-interactive {
  position: relative;
  cursor: pointer;
}

.list-item-interactive::before {
  content: '';
  position: absolute;
  inset: 0;
  background-color: var(--md-sys-color-on-surface);
  opacity: 0;
  transition: opacity 100ms;
  pointer-events: none;
}

.list-item-interactive:hover::before {
  opacity: var(--md-sys-state-on-surface-hover); /* 8% */
}
```

## State Layer Stacking

One of M3's key features is that **state layers can stack** - multiple states can be visible simultaneously:

### Hover + Pressed

**Most common stacking scenario**

```
Hover (8%) + Pressed (12%) = 20% total opacity
```

**Behavior:**

1. User hovers over button → 8% overlay appears
2. User clicks (mouse down) → additional 12% overlay appears
3. Total visible: 20% overlay
4. User releases (mouse up) → 12% pressed layer disappears, 8% hover remains

**CSS Implementation:**

```css
.button::before {
  opacity: 0;
}

.button:hover::before {
  opacity: 0.08; /* Base hover state */
}

.button:hover:active::before {
  opacity: 0.2; /* 8% hover + 12% pressed */
}
```

### Focus + Pressed

**Keyboard interaction with click**

```
Focus (12%) + Pressed (12%) = 24% total opacity
```

**Behavior:**

- Element has keyboard focus (12%)
- User presses Enter or Space (12% more)
- Total visible: 24% overlay

## Transitions and Timing

State layer transitions should be **quick and responsive**:

```css
--md-sys-state-transition-hover: 100ms cubic-bezier(0.4, 0, 0.2, 1);
--md-sys-state-transition-focus: 150ms cubic-bezier(0.4, 0, 0.2, 1);
--md-sys-state-transition-pressed: 150ms cubic-bezier(0.4, 0, 0.2, 1);
```

| State   | Duration | Easing                       | Reason                            |
| ------- | -------- | ---------------------------- | --------------------------------- |
| Hover   | 100ms    | cubic-bezier(0.4, 0, 0.2, 1) | Instant feedback, rapid response  |
| Focus   | 150ms    | cubic-bezier(0.4, 0, 0.2, 1) | Slightly slower for accessibility |
| Pressed | 150ms    | cubic-bezier(0.4, 0, 0.2, 1) | Tactile feel, not too abrupt      |

**Motion Preferences:**

```css
@media (prefers-reduced-motion: reduce) {
  .state-layer::before {
    transition: none; /* Disable animations for accessibility */
  }
}
```

## Accessibility

### Focus Indicators

State layers alone may not provide sufficient focus indication. **Combine with outlines**:

```css
.button:focus-visible {
  outline: 2px solid var(--md-sys-color-primary);
  outline-offset: 2px;
}

.button:focus-visible::before {
  opacity: 0.12; /* 12% state layer + outline */
}
```

**WCAG Requirements:**

- Focus indicators must have **3:1 contrast ratio** with adjacent colors
- State layer (12% opacity) + outline (solid 2px) meets this requirement

### Keyboard Navigation

Ensure all interactive elements support keyboard navigation:

```tsx
<button
  className="state-layer-primary"
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      // Handle activation
    }
  }}
>
  Accessible Button
</button>
```

### Screen Reader Announcements

State layers are visual only - ensure proper ARIA labels:

```tsx
<button className="state-layer-primary" aria-label="Submit workout data" aria-pressed={isPressed}>
  Submit
</button>
```

## Best Practices

### ✅ Do

- **Use standardized opacities** - Stick to 8%, 12%, 16% (don't create custom values)
- **Implement with pseudo-elements** - Cleanest approach for state stacking
- **Combine with focus outlines** - Ensure keyboard navigation is visible
- **Use quick transitions** - 100-150ms for responsive feedback
- **Stack states naturally** - Hover + pressed should combine to 20%
- **Respect motion preferences** - Disable transitions when `prefers-reduced-motion: reduce`
- **Use semantic colors** - State layer color should match component's role

### ❌ Don't

- **Don't use arbitrary opacities** - 8%, 12%, 16% are standardized
- **Don't skip focus indicators** - State layers alone may not meet WCAG contrast
- **Don't use slow transitions** - > 200ms feels sluggish
- **Don't forget disabled states** - Disabled elements need 38% content opacity
- **Don't ignore keyboard users** - Focus states must be clearly visible
- **Don't hardcode state values** - Use CSS custom properties for consistency

## Common Patterns

### Primary Action Button

```tsx
<button
  style={{
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: 'var(--md-sys-color-primary)',
    color: 'var(--md-sys-color-on-primary)',
    borderRadius: 'var(--md-sys-shape-button)',
    padding: 'var(--md-sys-spacing-button-padding-y) var(--md-sys-spacing-button-padding-x)',
    border: 'none',
    cursor: 'pointer',
  }}
>
  <span style={{ position: 'relative', zIndex: 1 }}>Start Workout</span>
  <span
    style={{
      position: 'absolute',
      inset: 0,
      backgroundColor: 'var(--md-sys-color-on-primary)',
      opacity: 0,
      transition: 'opacity 100ms',
      pointerEvents: 'none',
    }}
    className="state-layer-hover"
  />
</button>
```

### Card Grid with Hover States

```tsx
<div style={{ display: 'grid', gap: 'var(--md-sys-spacing-grid-gap)' }}>
  {cards.map((card) => (
    <div
      key={card.id}
      className="card-interactive elevation-2 shape-card"
      style={{
        padding: 'var(--md-sys-spacing-card-padding)',
        cursor: 'pointer',
      }}
    >
      <h3>{card.title}</h3>
      <p>{card.description}</p>
    </div>
  ))}
</div>
```

### Navigation Menu with Focus States

```tsx
<nav>
  <ul>
    {menuItems.map((item) => (
      <li
        key={item.id}
        className="list-item-interactive"
        tabIndex={0}
        style={{
          padding: 'var(--md-sys-spacing-nav-item-padding)',
        }}
      >
        {item.label}
      </li>
    ))}
  </ul>
</nav>
```

## Integration with Index.css

Add state layers import to your main CSS file:

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

## Resources

- [Material Design 3 - Interaction States](https://m3.material.io/foundations/interaction/states/overview)
- [State Layer Tokens](https://m3.material.io/foundations/interaction/states/state-layers)
- [WCAG 2.1 - Focus Visible](https://www.w3.org/WAI/WCAG21/Understanding/focus-visible.html)

---

**Files:**

- `frontend/src/styles/tokens/state-layers.json` - Token definitions
- `frontend/src/styles/tokens/state-layers.css` - CSS Custom Properties
- `docs/state-layers-guide.md` - This documentation
