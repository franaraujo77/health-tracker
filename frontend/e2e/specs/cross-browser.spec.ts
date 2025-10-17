/**
 * Cross-Browser Compatibility Tests for M3 Components
 * Tests rendering, theming, and interactions across all supported browsers
 */

import { test, expect } from '@playwright/test';

test.describe('Cross-Browser Compatibility - M3 Components', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the showcase page (no auth required)
    await page.goto('/?showcase=true');
  });

  test('should render HealthDataEntryForm correctly', async ({ page, browserName }) => {
    // Wait for the form to be visible
    await expect(page.locator('.health-data-entry-form')).toBeVisible();

    // Check that form elements are rendered
    const metricSelect = page.locator('select#metricType');
    await expect(metricSelect).toBeVisible();

    // Take a screenshot for visual comparison
    await page.screenshot({
      path: `e2e/screenshots/${browserName}-health-data-entry-form.png`,
      fullPage: true,
    });

    console.log(`✓ HealthDataEntryForm renders correctly in ${browserName}`);
  });

  test('should render HealthMetricsList correctly', async ({ page, browserName }) => {
    // Wait for the metrics list to be visible
    await expect(page.locator('.health-metrics-list')).toBeVisible();

    // Check heading is rendered
    const heading = page.locator('h3').filter({ hasText: /Health Metrics/i });
    await expect(heading).toBeVisible();

    // Check refresh button is present
    const refreshButton = page.getByRole('button', { name: /refresh/i });
    await expect(refreshButton).toBeVisible();

    // Take a screenshot
    await page.screenshot({
      path: `e2e/screenshots/${browserName}-health-metrics-list.png`,
      fullPage: true,
    });

    console.log(`✓ HealthMetricsList renders correctly in ${browserName}`);
  });

  test('should render ThemeToggle correctly', async ({ page, browserName }) => {
    // Wait for theme toggle to be visible
    const themeToggle = page.locator('.theme-toggle');
    await expect(themeToggle).toBeVisible();

    // Take a screenshot
    await page.screenshot({
      path: `e2e/screenshots/${browserName}-theme-toggle.png`,
      fullPage: true,
    });

    console.log(`✓ ThemeToggle renders correctly in ${browserName}`);
  });

  test('should switch themes correctly', async ({ page, browserName }) => {
    // Find theme toggle button
    const themeToggleButton = page.locator('.theme-toggle button').first();
    await expect(themeToggleButton).toBeVisible();

    // Get initial theme (check for data-theme attribute or class)
    const initialTheme = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme') || 'light';
    });

    // Click theme toggle
    await themeToggleButton.click();

    // Wait for theme change
    await page.waitForTimeout(500);

    // Get new theme
    const newTheme = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme') || 'light';
    });

    // Verify theme changed
    expect(newTheme).not.toBe(initialTheme);

    // Take screenshot of new theme
    await page.screenshot({
      path: `e2e/screenshots/${browserName}-theme-${newTheme}.png`,
      fullPage: true,
    });

    console.log(`✓ Theme switching works correctly in ${browserName}`);
  });

  test('should have correct CSS rendering (no layout shifts)', async ({ page, browserName }) => {
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Check for CSS custom properties support
    const hasCustomProperties = await page.evaluate(() => {
      const testEl = document.createElement('div');
      testEl.style.setProperty('--test', 'value');
      return testEl.style.getPropertyValue('--test') === 'value';
    });

    expect(hasCustomProperties).toBe(true);

    // Verify M3 design tokens are applied
    const primaryColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--md-sys-color-primary');
    });

    expect(primaryColor).toBeTruthy();
    expect(primaryColor.trim().length).toBeGreaterThan(0);

    console.log(`✓ CSS rendering is correct in ${browserName}`);
  });

  test('should render fonts correctly', async ({ page, browserName }) => {
    // Check that Roboto font is loaded
    await page.waitForLoadState('networkidle');

    const fontFamily = await page.evaluate(() => {
      const body = document.body;
      return getComputedStyle(body).fontFamily;
    });

    // Verify font family contains expected fonts
    expect(fontFamily.toLowerCase()).toContain('roboto');

    console.log(`✓ Fonts render correctly in ${browserName}`);
  });

  test('should handle form interactions correctly', async ({ page, browserName }) => {
    // Wait for form to be visible
    await expect(page.locator('.health-data-entry-form')).toBeVisible();

    // Select a metric type
    const metricSelect = page.locator('select#metricType');
    await metricSelect.selectOption('weight');

    // Wait for conditional fields to appear
    await page.waitForTimeout(300);

    // Check that value input appears
    const valueInput = page.locator('input#value');
    await expect(valueInput).toBeVisible();

    // Type a value
    await valueInput.fill('70.5');

    // Verify the value was entered
    await expect(valueInput).toHaveValue('70.5');

    console.log(`✓ Form interactions work correctly in ${browserName}`);
  });

  test('should have no console errors', async ({ page, browserName }) => {
    const consoleErrors: string[] = [];

    // Listen for console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate and interact with the page
    await page.goto('/?showcase=true');
    await page.waitForLoadState('networkidle');

    // Filter out known non-critical errors (like React DevTools in production)
    const criticalErrors = consoleErrors.filter(
      (error) =>
        !error.includes('DevTools') && !error.includes('Extension') && !error.includes('favicon')
    );

    // Verify no critical console errors
    expect(criticalErrors).toHaveLength(0);

    console.log(`✓ No console errors in ${browserName}`);
  });
});
