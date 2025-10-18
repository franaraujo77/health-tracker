# Design Tokens Changelog

All notable changes to the Material Design 3 design tokens will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-10-17

### Added

- Initial M3 design token system implementation
- Color tokens for light and dark themes (primary, secondary, tertiary, error, neutral, neutral-variant, surface colors)
- Typography tokens following M3 type scale (display, headline, title, body, label)
- Spacing scale tokens based on 8px baseline grid
- Elevation tokens using M3 shadow and surface tint system (levels 0-5)
- Shape tokens for component corners (none, extra-small, small, medium, large, extra-large, full)
- State layer tokens for interactive states (hover, focus, pressed, dragged)
- Theme switching mechanism with light/dark mode support
- CSS Custom Properties export format
- TypeScript type definitions for design tokens
- Token build system and validation
- Stylelint rules to enforce token usage

### Technical Details

- Seed color: #4CAF50 (Material Green 500)
- Generated using Material Theme Builder
- Naming convention: `--md-sys-{category}-{role}`
- Supports system preference detection (prefers-color-scheme)
- Local storage persistence for user theme preference
- Smooth theme transitions (200ms)

### Breaking Changes

- N/A (Initial release)

### Deprecated

- N/A (Initial release)

---

## Versioning Guidelines

### MAJOR version (X.0.0)

- Breaking changes: token removal or renaming
- Incompatible API changes
- Requires migration guide

### MINOR version (0.X.0)

- New tokens added
- Token deprecation warnings
- Backwards compatible changes

### PATCH version (0.0.X)

- Token value adjustments
- Bug fixes
- Documentation updates

---

## Migration Guides

### Upgrading to 2.0.0 (Future)

_Migration guides will be added here when breaking changes are introduced_

---

## Deprecated Tokens

_Deprecated tokens will be listed here with their replacements and removal timeline_

Example format:

```
### v1.5.0 - Deprecated 2025-03-01, Removed in v2.0.0
- `--old-color-name` → Use `--md-sys-color-primary` instead
```
