# Stylelint Setup Guide

This guide helps you set up Stylelint integration in VS Code for the Health Tracker project.

## Prerequisites

- VS Code installed
- Node.js and npm installed
- Project dependencies installed (`npm install` at repository root)

## VS Code Extension Installation

1. **Install Required Extensions**

   VS Code will automatically prompt you to install recommended extensions when you open the project. Click "Install All" or install them individually:

   - **Stylelint** (`stylelint.vscode-stylelint`) - CSS/SCSS linting
   - **ESLint** (`dbaeumer.vscode-eslint`) - JavaScript/TypeScript linting
   - **Prettier** (`esbenp.prettier-vscode`) - Code formatting

   Alternatively, install via command palette (`Cmd+Shift+P` / `Ctrl+Shift+P`):
   ```
   ext install stylelint.vscode-stylelint
   ext install dbaeumer.vscode-eslint
   ext install esbenp.prettier-vscode
   ```

2. **Reload VS Code**

   After installing extensions, reload VS Code to activate them.

## Verify Integration

1. **Open a CSS File**

   Navigate to `frontend/src/index.css` or any `.css` file.

2. **Test Stylelint**

   Add an invalid CSS rule to trigger Stylelint:
   ```css
   .test {
     color: #FF5733; /* Should show error: Use M3 design tokens */
   }
   ```

   You should see:
   - Red squiggly underline under `#FF5733`
   - Error message: "Use M3 design tokens instead of hex colors"

3. **Test Auto-Fix on Save**

   Add CSS with incorrect property order:
   ```css
   .test {
     color: var(--md-sys-color-primary);
     display: flex;
   }
   ```

   Save the file (`Cmd+S` / `Ctrl+S`). Properties should automatically reorder:
   ```css
   .test {
     display: flex;
     color: var(--md-sys-color-primary);
   }
   ```

## Configuration Details

### Workspace Settings (`.vscode/settings.json`)

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.fixAll.stylelint": "explicit"
  },
  "css.validate": false,
  "stylelint.validate": ["css", "postcss"]
}
```

**Key Settings:**
- `editor.formatOnSave`: Auto-format on save
- `source.fixAll.stylelint`: Auto-fix Stylelint violations on save
- `css.validate: false`: Disable VS Code's built-in CSS validation (use Stylelint instead)

### Stylelint Configuration (`.stylelintrc.json`)

Located at `frontend/.stylelintrc.json`. Key features:

1. **Strict CSS Rules**
   - No redundant longhand properties
   - No redundant shorthand values
   - URL quotes required

2. **Property Ordering**
   - Custom properties (--md-sys-*) first
   - Logical grouping: positioning → display → box-model → typography → visual → animation

3. **Material Design 3 Token Enforcement**
   - No hardcoded hex colors (use `var(--md-sys-color-*)`)
   - No hardcoded spacing values (use `var(--md-sys-spacing-*)`)
   - No hardcoded typography (use `var(--md-sys-typescale-*)`)

## Common Issues & Troubleshooting

### Issue: Stylelint Not Running

**Solution:**
1. Check Stylelint extension is installed and enabled
2. Reload VS Code window (`Cmd+Shift+P` → "Reload Window")
3. Check VS Code output panel: View → Output → Select "Stylelint" from dropdown
4. Verify `frontend/.stylelintrc.json` exists

### Issue: Auto-Fix Not Working on Save

**Solution:**
1. Check `.vscode/settings.json` has `source.fixAll.stylelint: "explicit"`
2. Ensure `editor.formatOnSave: true` is set
3. Try manual fix: Right-click in CSS file → "Fix all auto-fixable problems"

### Issue: M3 Token Validation Errors

**Common Errors:**

| Error | Wrong | Correct |
|-------|-------|---------|
| Hex color | `color: #FF5733;` | `color: var(--md-sys-color-primary);` |
| Hardcoded spacing | `padding: 16px;` | `padding: var(--md-sys-spacing-4);` |
| Hardcoded font | `font-size: 14px;` | `font-size: var(--md-sys-typescale-body-medium-size);` |

**Available M3 Tokens:**
- Colors: `--md-sys-color-*` (primary, secondary, error, surface, etc.)
- Spacing: `--md-sys-spacing-*` (1-12 for 4px-48px increments)
- Typography: `--md-sys-typescale-*` (display, headline, body, label)
- Elevation: `--md-sys-elevation-*` (level0-level5)

### Issue: Property Order Not Auto-Fixing

**Solution:**
1. Run manual fix: `npm run lint:css -- --fix` from `frontend/` directory
2. Check file is not in `.stylelintignore`
3. Verify properties are in the defined groups (custom-properties, positioning, display, box-model, typography, visual, animation)

### Issue: Extension Conflicts with Prettier

**Solution:**
- This is not an issue! Stylelint 16+ removed all stylistic rules
- Prettier handles formatting (indentation, line breaks)
- Stylelint handles CSS quality (property order, M3 tokens, best practices)
- Both work together seamlessly

## Running Stylelint from Command Line

### Lint All CSS Files
```bash
cd frontend
npm run lint:css
```

### Auto-Fix CSS Issues
```bash
npm run lint:css -- --fix
```

### Lint Specific Files
```bash
npm run lint:css -- src/components/**/*.css
```

### Fail on Warnings
```bash
npm run lint:css -- --max-warnings=0
```

## CI/CD Integration

Stylelint runs automatically in GitHub Actions CI/CD pipeline:
- Runs on every pull request
- Checks all CSS files in `frontend/`
- **Fails the build** if any CSS violations are found
- Generates clear error messages for violations

## Integration with ESLint and Prettier

All three tools work together:

1. **ESLint**: JavaScript/TypeScript quality and best practices
2. **Stylelint**: CSS quality and M3 token enforcement
3. **Prettier**: Code formatting (JS, TS, CSS)

Pre-commit hooks run all three automatically before each commit.

## Additional Resources

- [Stylelint Official Docs](https://stylelint.io/)
- [Stylelint VS Code Extension](https://marketplace.visualstudio.com/items?itemName=stylelint.vscode-stylelint)
- [Material Design 3 Design Tokens](https://m3.material.io/styles/color/system/overview)
- Project Stylelint Config: `frontend/.stylelintrc.json`

## Need Help?

1. Check the Stylelint output panel in VS Code
2. Run `npm run lint:css` to see all violations
3. Review this guide's troubleshooting section
4. Ask the team in Slack #frontend channel
