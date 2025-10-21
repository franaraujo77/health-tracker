# VS Code Setup Guide for Health Tracker

This guide walks you through setting up Visual Studio Code for optimal development experience with automated linting, formatting, and code quality checks.

## Quick Start

When you open this project in VS Code for the first time, you should see a prompt to install recommended extensions. Click **"Install All"** and you're 90% done!

## Prerequisites

- Visual Studio Code (latest version)
- Node.js 20+ and npm installed
- Repository cloned and dependencies installed (`npm install`)

## Automatic Setup

### Step 1: Install Recommended Extensions

VS Code will automatically detect `.vscode/extensions.json` and prompt you to install recommended extensions.

**If you see the prompt:**
1. Click **"Install All"** (recommended)
2. Wait for extensions to install
3. Reload VS Code when prompted

**If you don't see the prompt:**
1. Open Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
2. Type: `Extensions: Show Recommended Extensions`
3. Click the cloud icon ☁️ to install all at once

### Step 2: Verify Auto-Configuration

The project includes `.vscode/settings.json` which automatically configures:
- ✅ Format on save
- ✅ ESLint auto-fix on save
- ✅ Stylelint auto-fix on save
- ✅ Prettier as default formatter
- ✅ Proper file encoding and line endings

**No manual configuration needed!**

## Recommended Extensions

These extensions are automatically recommended and provide the core linting experience:

### 1. ESLint (`dbaeumer.vscode-eslint`)

**What it does:**
- Real-time JavaScript/TypeScript linting
- Shows errors and warnings while you type
- Auto-fixes issues on save

**Features:**
- Catches bugs before runtime
- Enforces code style and best practices
- Highlights accessibility issues
- Security vulnerability detection

### 2. Prettier (`esbenp.prettier-vscode`)

**What it does:**
- Automatic code formatting
- Consistent style across the team
- Works with JS, TS, CSS, JSON, Markdown

**Features:**
- Formats on save
- No manual formatting needed
- Eliminates style debates
- Integrates with ESLint seamlessly

### 3. Stylelint (`stylelint.vscode-stylelint`)

**What it does:**
- CSS/SCSS linting
- Enforces Material Design 3 token usage
- Property ordering automation

**Features:**
- Catches CSS errors
- Auto-fixes property order
- Prevents hardcoded colors/spacing
- Enforces design system compliance

## Manual Installation

If automatic installation doesn't work:

### Option 1: Install via Command Palette

1. Open Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
2. Type: `Extensions: Install Extensions`
3. Search for each extension:
   - Search: `ESLint` → Install "ESLint" by Microsoft
   - Search: `Prettier` → Install "Prettier - Code formatter"
   - Search: `Stylelint` → Install "Stylelint" by Stylelint

### Option 2: Install via Terminal

```bash
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension stylelint.vscode-stylelint
```

### Option 3: Install from Extensions Marketplace

1. Click Extensions icon in sidebar (or `Cmd+Shift+X` / `Ctrl+Shift+X`)
2. Search and install each extension individually

## Verify Setup

### Test 1: Format on Save

1. Open any TypeScript file (e.g., `frontend/src/App.tsx`)
2. Make a formatting change (add extra spaces, mess up indentation)
3. Save the file (`Cmd+S` / `Ctrl+S`)
4. **Expected**: File automatically formats to proper style

### Test 2: ESLint Auto-Fix

1. Open a `.tsx` file
2. Add code with ESLint violations:
   ```typescript
   const foo = 5  // Missing semicolon, const never used
   ```
3. Save the file
4. **Expected**:
   - Semicolon auto-added
   - Warning about unused variable appears

### Test 3: Stylelint Auto-Fix

1. Open a `.css` file
2. Add CSS with wrong property order:
   ```css
   .test {
     color: var(--md-sys-color-primary);
     display: flex;
   }
   ```
3. Save the file
4. **Expected**: Properties reorder automatically (display before color)

### Test 4: Real-time Error Highlighting

1. Open any TypeScript file
2. Type invalid code: `const x: string = 123;`
3. **Expected**: Red squiggly underline appears immediately
4. Hover over the error to see the message

## Workspace Settings

The project's `.vscode/settings.json` configures:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.fixAll.stylelint": "explicit"
  },
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ],
  "stylelint.validate": ["css", "postcss"],
  "css.validate": false,
  "files.eol": "\n",
  "editor.tabSize": 2,
  "editor.insertSpaces": true
}
```

**Key Settings Explained:**
- `editor.formatOnSave`: Auto-format every time you save
- `editor.defaultFormatter`: Use Prettier for all formatting
- `editor.codeActionsOnSave`: Auto-fix ESLint and Stylelint issues on save
- `css.validate: false`: Disable VS Code's built-in CSS validation (use Stylelint instead)
- `files.eol`: Use LF (Unix) line endings
- `editor.tabSize`: 2 spaces for indentation

## Troubleshooting

### Issue: Extensions Not Auto-Installing

**Solution:**
1. Check you're opening the workspace root (not a subdirectory)
2. Manually install extensions (see Manual Installation above)
3. Reload VS Code window: `Cmd+Shift+P` → "Reload Window"

### Issue: Format on Save Not Working

**Symptoms:** File doesn't format when you save

**Solutions:**

1. **Check Default Formatter:**
   - Right-click in file → "Format Document With..." → "Configure Default Formatter"
   - Select "Prettier - Code formatter"

2. **Verify Settings:**
   - Open Settings (`Cmd+,` / `Ctrl+,`)
   - Search: `format on save`
   - Ensure "Editor: Format On Save" is checked

3. **Check File Type:**
   - Prettier works with: `.js`, `.jsx`, `.ts`, `.tsx`, `.css`, `.json`, `.md`
   - Some file types may need explicit configuration

### Issue: ESLint Not Showing Errors

**Solutions:**

1. **Check ESLint Output:**
   - View → Output → Select "ESLint" from dropdown
   - Look for errors or warnings

2. **Restart ESLint Server:**
   - `Cmd+Shift+P` / `Ctrl+Shift+P`
   - Type: `ESLint: Restart ESLint Server`

3. **Check ESLint Config:**
   - Verify `frontend/eslint.config.js` exists
   - Run `npm run lint` from terminal to test ESLint manually

### Issue: Stylelint Not Working

**Solutions:**

1. **Check Stylelint Output:**
   - View → Output → Select "Stylelint" from dropdown

2. **Verify Configuration:**
   - Check `frontend/.stylelintrc.json` exists
   - Run `npm run lint:css` from terminal

3. **Disable Built-in CSS Validation:**
   - Settings → Search: `css.validate`
   - Uncheck "CSS > Validate"

### Issue: Auto-Fix Not Running on Save

**Symptoms:** Errors show but don't auto-fix when saving

**Solutions:**

1. **Check Code Actions Setting:**
   - Settings → Search: `code actions on save`
   - Ensure `source.fixAll.eslint` is set to `explicit`
   - Ensure `source.fixAll.stylelint` is set to `explicit`

2. **Manual Fix:**
   - Right-click in file → "Source Action" → "Fix all auto-fixable problems"

3. **Check for Conflicting Extensions:**
   - Disable other formatting extensions temporarily
   - Common conflicts: Beautify, TSLint (deprecated), older Prettier versions

### Issue: Workspace Settings Not Applying

**Solution:**
1. Check you opened the workspace root: `/Users/.../health-tracker/`
2. User settings may override workspace settings
3. Check settings precedence:
   - User Settings (lowest priority)
   - Workspace Settings (medium - this is `.vscode/settings.json`)
   - Folder Settings (highest)

### Issue: Slow Performance / Lag

**Symptoms:** VS Code freezes or lags when saving files

**Solutions:**

1. **Disable ESLint on Large Files:**
   - Settings → Search: `eslint.run`
   - Set to `onSave` instead of `onType`

2. **Exclude Large Directories:**
   - Add to `.vscode/settings.json`:
     ```json
     "files.watcherExclude": {
       "**/node_modules/**": true,
       "**/dist/**": true,
       "**/build/**": true,
       "**/.git/**": true
     }
     ```

3. **Increase Memory:**
   - Settings → Search: `max memory`
   - Increase ESLint/TypeScript max memory if available

## Alternative IDEs

While this project is optimized for VS Code, you can use other IDEs with similar setups:

### WebStorm / IntelliJ IDEA

1. ESLint: Built-in, enable in Preferences → Languages & Frameworks → JavaScript → Code Quality Tools → ESLint
2. Prettier: Install Prettier plugin, enable "On Save" in settings
3. Stylelint: Install Stylelint plugin

### Sublime Text

1. Install Package Control
2. Install packages: SublimeLinter, SublimeLinter-eslint, JsPrettier, SublimeLinter-stylelint
3. Configure packages to use project configs

### Neovim / Vim

1. Use LSP with `nvim-lspconfig`
2. Configure `null-ls` for ESLint, Prettier, Stylelint
3. Set up auto-commands for format on save

**Note:** For non-VS Code setups, refer to your IDE's documentation for integrating ESLint, Prettier, and Stylelint.

## Advanced Configuration

### Per-File-Type Formatters

If you want different formatters for specific file types:

```json
{
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[json]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

### Disable Auto-Fix for Specific Rules

If a rule is too aggressive:

```json
{
  "eslint.codeActionsOnSave.rules": [
    "!@typescript-eslint/explicit-function-return-type"
  ]
}
```

### Organize Imports on Save

Add to `.vscode/settings.json`:

```json
{
  "editor.codeActionsOnSave": {
    "source.organizeImports": "explicit",
    "source.fixAll.eslint": "explicit",
    "source.fixAll.stylelint": "explicit"
  }
}
```

## Best Practices

### DO:
✅ Install all recommended extensions
✅ Let auto-format and auto-fix run on every save
✅ Check the Problems panel for errors and warnings
✅ Use "Format Document" if auto-format doesn't trigger
✅ Keep extensions updated

### DON'T:
❌ Install conflicting formatting extensions
❌ Disable format on save (defeats the purpose)
❌ Override project settings with user settings
❌ Ignore linting errors and warnings
❌ Skip extension updates

## Keyboard Shortcuts

Useful shortcuts for linting and formatting:

| Action | macOS | Windows/Linux |
|--------|-------|---------------|
| Format Document | `Shift+Option+F` | `Shift+Alt+F` |
| Format Selection | `Cmd+K Cmd+F` | `Ctrl+K Ctrl+F` |
| Quick Fix | `Cmd+.` | `Ctrl+.` |
| Show Problems | `Cmd+Shift+M` | `Ctrl+Shift+M` |
| Go to Next Problem | `F8` | `F8` |
| Go to Previous Problem | `Shift+F8` | `Shift+F8` |

## Additional Resources

- [ESLint Setup Guide](./eslint-setup.md) (if available)
- [Stylelint Setup Guide](./stylelint-setup.md)
- [Pre-commit Hooks Guide](./pre-commit-hooks.md)
- [VS Code ESLint Extension Docs](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
- [VS Code Prettier Extension Docs](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
- [VS Code Stylelint Extension Docs](https://marketplace.visualstudio.com/items?itemName=stylelint.vscode-stylelint)

## Need Help?

1. Check this troubleshooting guide first
2. Review extension output panels (View → Output)
3. Run linters manually from terminal to isolate issues:
   ```bash
   cd frontend
   npm run lint
   npm run lint:css
   npm run format:check
   ```
4. Ask in Slack #frontend channel
5. Tag @frontend-lead for urgent setup issues
