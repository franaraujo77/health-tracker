# E2E Cross-Browser Testing

End-to-end tests for Material Design 3 components using Playwright.

## Setup

Install Playwright browsers (first time only):

```bash
npx playwright install
```

## Running Tests

```bash
# Run all tests across all browsers
npm run test:e2e

# Run specific browser
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit

# Run mobile browser tests
npm run test:e2e:mobile

# Interactive test runner (UI mode)
npm run test:e2e:ui

# View test report
npm run test:e2e:report
```

## Test Structure

- **`specs/cross-browser.spec.ts`**: Core cross-browser compatibility tests
  - Component rendering across browsers
  - Theme switching functionality
  - CSS feature support validation
  - Form interactions
  - Console error detection

- **`specs/responsive.spec.ts`**: Responsive design tests
  - Multiple viewport sizes (320px - 1920px)
  - Touch target size validation
  - Typography scaling
  - Layout integrity
  - Device-specific tests

## Browser Coverage

- **Desktop**: Chrome, Firefox, Safari (WebKit), Edge
- **Mobile**: iOS Safari, Chrome Android
- **Tablet**: iPad Pro

## Screenshots

Test screenshots are saved to `e2e/screenshots/` and are gitignored. They can be useful for visual comparison during test failures.

## CI/CD Integration

Tests run automatically in GitHub Actions on every PR. See `.github/workflows/frontend-ci.yml` for configuration.

## Debugging

```bash
# Run tests in headed mode (see browser)
npx playwright test --headed

# Run tests in debug mode
npx playwright test --debug

# Run specific test file
npx playwright test specs/cross-browser.spec.ts
```

## Documentation

See [docs/browser-support.md](../docs/browser-support.md) for comprehensive browser compatibility information.
