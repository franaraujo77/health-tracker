# Documentation

Comprehensive documentation for the Health Tracker project.

## Structure

- `architecture/` - System architecture diagrams and design docs
- `api/` - API documentation and contracts
- **Design Tokens** - Material Design 3 design token system

## Design Tokens

The Health Tracker frontend uses a comprehensive Material Design 3 design token system for consistent, themeable, and maintainable styling.

### Quick Start

```tsx
import { tokens, components } from '@/styles/tokens';

// Use component shortcuts for rapid development
const buttonStyle = {
  borderRadius: components.button.shape,
  padding: `${components.button.paddingY} ${components.button.paddingX}`,
};

// Or use type-safe token accessors
const cardStyle = {
  backgroundColor: tokens.color.get('surface'),
  borderRadius: tokens.shape.medium,
  padding: tokens.spacing.get(4),
  boxShadow: tokens.elevation.shadow(2),
};
```

### Documentation

- **[Design Tokens Overview](./design-tokens.md)** - Complete system documentation with architecture, categories, and patterns
- **[Token Quick Reference](./token-quick-reference.md)** - Fast lookup tables for all tokens
- **[Tokens Usage Guide](./tokens-usage-guide.md)** - API reference and component examples

#### Detailed Guides

- [Typography Guide](./typography-guide.md) - 15 type scales, responsive patterns, accessibility
- [Spacing Guide](./spacing-guide.md) - 8px baseline grid, component spacing
- [Elevation Guide](./elevation-guide.md) - Shadow + tint system, 6 elevation levels
- [Shape Guide](./shape-guide.md) - Border radius system, asymmetric patterns
- [State Layers Guide](./state-layers-guide.md) - Interaction states (hover, focus, pressed)

### Token Categories

| Category         | Count    | Description                          |
| ---------------- | -------- | ------------------------------------ |
| **Colors**       | 76       | 38 light + 38 dark theme color roles |
| **Typography**   | 75       | 15 scales × 5 properties             |
| **Spacing**      | 63+      | 8px grid + component tokens          |
| **Elevation**    | 30+      | 6 levels with shadows and tints      |
| **Shape**        | 50+      | 7 scales + component shapes          |
| **State Layers** | 80+      | 5 states × 20+ color roles           |
| **Total**        | **374+** | Complete M3 design token system      |

### Three Usage Methods

**1. CSS Custom Properties** (Direct)

```tsx
backgroundColor: 'var(--md-sys-color-primary)';
```

**2. TypeScript Utilities** (Type-Safe)

```tsx
backgroundColor: tokens.color.get('primary');
```

**3. Component Shortcuts** (Semantic)

```tsx
borderRadius: components.button.shape;
```

### Theme Switching

```tsx
import { initializeTheme, toggleTheme } from '@/styles/tokens/theme';

// Initialize on app mount
useEffect(() => {
  initializeTheme();
}, []);

// Toggle between light and dark
const handleToggle = () => toggleTheme();
```

### Build Scripts

```bash
# Validate token types
npm run tokens:validate

# Check tokens before build
npm run tokens:check

# Build (automatically validates)
npm run build
```

### Resources

- [Material Design 3](https://m3.material.io/)
- [M3 Design Tokens](https://m3.material.io/foundations/design-tokens/overview)
- [Token Implementation Files](../frontend/src/styles/tokens/)
