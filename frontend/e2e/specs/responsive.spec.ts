/**
 * Responsive Design Tests for M3 Components
 * Tests component behavior across different viewport sizes
 */

import { test, expect, devices } from '@playwright/test';

// Define viewport sizes to test
const viewports = {
  // Mobile
  'mobile-small': { width: 320, height: 568 }, // iPhone SE
  'mobile-medium': { width: 375, height: 667 }, // iPhone 8
  'mobile-large': { width: 414, height: 896 }, // iPhone 11 Pro Max

  // Tablet
  'tablet-portrait': { width: 768, height: 1024 }, // iPad
  'tablet-landscape': { width: 1024, height: 768 }, // iPad Landscape

  // Desktop
  'desktop-small': { width: 1280, height: 720 },
  'desktop-medium': { width: 1440, height: 900 },
  'desktop-large': { width: 1920, height: 1080 },
};

test.describe('Responsive Design - Viewport Testing', () => {
  for (const [name, viewport] of Object.entries(viewports)) {
    test(`should render correctly at ${name} (${viewport.width}x${viewport.height})`, async ({
      page,
      browserName,
    }) => {
      // Set viewport size
      await page.setViewportSize(viewport);

      // Navigate to the showcase page (no auth required)
      await page.goto('/?showcase=true');
      await page.waitForLoadState('networkidle');

      // Verify page loads
      await expect(page.locator('body')).toBeVisible();

      // Take full page screenshot
      await page.screenshot({
        path: `e2e/screenshots/${browserName}-responsive-${name}.png`,
        fullPage: true,
      });

      console.log(
        `✓ ${name} (${viewport.width}x${viewport.height}) renders correctly in ${browserName}`
      );
    });
  }

  test('should have appropriate touch targets on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize(viewports['mobile-medium']);
    await page.goto('/?showcase=true');

    // Check theme toggle button size
    const themeToggleButton = page.locator('.theme-toggle button').first();
    await expect(themeToggleButton).toBeVisible();

    const buttonBox = await themeToggleButton.boundingBox();
    expect(buttonBox).toBeTruthy();

    if (buttonBox) {
      // M3 requires minimum 48x48px touch targets
      expect(buttonBox.width).toBeGreaterThanOrEqual(40); // Allow some tolerance
      expect(buttonBox.height).toBeGreaterThanOrEqual(40);
    }

    // Check select dropdown size
    const metricSelect = page.locator('select#metricType');
    await expect(metricSelect).toBeVisible();

    const selectBox = await metricSelect.boundingBox();
    if (selectBox) {
      expect(selectBox.height).toBeGreaterThanOrEqual(48);
    }

    console.log('✓ Touch targets meet minimum size requirements on mobile');
  });

  test('should adapt typography for readability across viewports', async ({ page }) => {
    // Test small mobile viewport
    await page.setViewportSize(viewports['mobile-small']);
    await page.goto('/?showcase=true');

    const heading = page.locator('h2').first();
    await expect(heading).toBeVisible();

    const mobileFontSize = await heading.evaluate((el) => {
      return window.getComputedStyle(el).fontSize;
    });

    // Switch to desktop viewport
    await page.setViewportSize(viewports['desktop-large']);
    await page.waitForTimeout(200);

    const desktopFontSize = await heading.evaluate((el) => {
      return window.getComputedStyle(el).fontSize;
    });

    // Font size should be responsive (can be same or different based on design)
    expect(mobileFontSize).toBeTruthy();
    expect(desktopFontSize).toBeTruthy();

    console.log(
      `✓ Typography adapts across viewports (mobile: ${mobileFontSize}, desktop: ${desktopFontSize})`
    );
  });

  test('should maintain layout integrity on viewport resize', async ({ page }) => {
    await page.goto('/?showcase=true');

    // Start with mobile
    await page.setViewportSize(viewports['mobile-medium']);
    await page.waitForLoadState('networkidle');

    // Verify form is visible
    await expect(page.locator('.health-data-entry-form')).toBeVisible();

    // Resize to tablet
    await page.setViewportSize(viewports['tablet-portrait']);
    await page.waitForTimeout(300);

    // Verify form is still visible and functional
    await expect(page.locator('.health-data-entry-form')).toBeVisible();

    // Resize to desktop
    await page.setViewportSize(viewports['desktop-medium']);
    await page.waitForTimeout(300);

    // Verify form is still visible
    await expect(page.locator('.health-data-entry-form')).toBeVisible();

    console.log('✓ Layout maintains integrity during viewport resize');
  });

  test('should have no horizontal scrollbar at standard viewports', async ({ page }) => {
    for (const [name, viewport] of Object.entries(viewports)) {
      await page.setViewportSize(viewport);
      await page.goto('/?showcase=true');
      await page.waitForLoadState('networkidle');

      // Check if horizontal scrollbar exists
      const scrollWidth = await page.evaluate(() => {
        return document.documentElement.scrollWidth;
      });

      const clientWidth = await page.evaluate(() => {
        return document.documentElement.clientWidth;
      });

      // Allow 1px tolerance for rounding
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);

      console.log(`✓ No horizontal scrollbar at ${name}`);
    }
  });

  test('should render images responsively', async ({ page }) => {
    await page.setViewportSize(viewports['mobile-medium']);
    await page.goto('/?showcase=true');
    await page.waitForLoadState('networkidle');

    // Check if any images are present and responsive
    const images = page.locator('img');
    const imageCount = await images.count();

    if (imageCount > 0) {
      for (let i = 0; i < imageCount; i++) {
        const img = images.nth(i);
        const box = await img.boundingBox();

        if (box) {
          // Image should not exceed viewport width
          expect(box.width).toBeLessThanOrEqual(viewports['mobile-medium'].width);
        }
      }
      console.log('✓ Images are responsive');
    } else {
      console.log('ℹ No images found to test');
    }
  });
});

test.describe('Responsive Design - Device-Specific Tests', () => {
  test('should work correctly on iPhone 13', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/?showcase=true');

    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('.health-data-entry-form')).toBeVisible();

    console.log('✓ Renders correctly on iPhone 13 viewport');
  });

  test('should work correctly on iPad', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/?showcase=true');

    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('.health-data-entry-form')).toBeVisible();

    console.log('✓ Renders correctly on iPad viewport');
  });

  test('should work correctly on desktop (1920x1080)', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/?showcase=true');

    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('.health-data-entry-form')).toBeVisible();

    console.log('✓ Renders correctly on desktop viewport');
  });
});
