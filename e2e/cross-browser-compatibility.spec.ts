import { test, expect, devices } from '@playwright/test';

// Test across different browsers and devices
const testConfigs = [
  { name: 'Desktop Chrome', device: devices['Desktop Chrome'] },
  { name: 'Desktop Firefox', device: devices['Desktop Firefox'] },
  { name: 'Desktop Safari', device: devices['Desktop Safari'] },
  { name: 'Mobile Chrome', device: devices['Pixel 5'] },
  { name: 'Mobile Safari', device: devices['iPhone 12'] },
  { name: 'Tablet', device: devices['iPad Pro'] },
];

testConfigs.forEach(({ name, device }) => {
  test.describe(`Cross-browser compatibility - ${name}`, () => {
    test.use({ ...device });

    test('should load and initialize overlay system', async ({ page }) => {
      await page.goto('/test.html');
      
      // Wait for overlay to initialize
      await page.waitForSelector('#dino-overlay-container', { timeout: 10000 });
      
      // Check that no JavaScript errors occurred
      const errors: string[] = [];
      page.on('pageerror', (error) => {
        errors.push(error.message);
      });
      
      await page.waitForLoadState('networkidle');
      expect(errors).toHaveLength(0);
    });

    test('should detect editable room images', async ({ page }) => {
      await page.goto('/test.html');
      await page.waitForSelector('#dino-overlay-container');
      
      // Should detect all editable room images
      const editableImages = await page.locator('.editable-room');
      await expect(editableImages).toHaveCount(2);
      
      // Images should have overlay borders
      for (let i = 0; i < 2; i++) {
        const image = editableImages.nth(i);
        await expect(image).toBeVisible();
        
        // Check for glassmorphic border overlay
        const overlay = page.locator(`[data-image-overlay="${i}"]`);
        await expect(overlay).toBeVisible();
      }
    });

    test('should handle image selection and sidebar', async ({ page }) => {
      await page.goto('/test.html');
      await page.waitForSelector('#dino-overlay-container');
      
      const firstImage = page.locator('.editable-room').first();
      
      // Click on editable image
      await firstImage.click();
      
      // Sidebar should slide in
      const sidebar = page.locator('[data-testid="quick-action-sidebar"]');
      await expect(sidebar).toBeVisible({ timeout: 5000 });
      
      // Check sidebar contains action buttons
      const actionButtons = sidebar.locator('[data-testid="action-button"]');
      await expect(actionButtons).toHaveCount(4); // Minimalist, Scandi, Add Sofa, Add Furniture
      
      // Verify button labels
      await expect(actionButtons.nth(0)).toContainText('Minimalist');
      await expect(actionButtons.nth(1)).toContainText('Scandi Style');
      await expect(actionButtons.nth(2)).toContainText('Add Sofa');
      await expect(actionButtons.nth(3)).toContainText('Add Furniture');
    });

    test('should show floating chat bar', async ({ page }) => {
      await page.goto('/test.html');
      await page.waitForSelector('#dino-overlay-container');
      
      const firstImage = page.locator('.editable-room').first();
      await firstImage.click();
      
      // Chat bar should appear
      const chatBar = page.locator('[data-testid="floating-chat-bar"]');
      await expect(chatBar).toBeVisible({ timeout: 5000 });
      
      // Should have input field and send button
      const chatInput = chatBar.locator('input[type="text"]');
      const sendButton = chatBar.locator('[data-testid="send-button"]');
      
      await expect(chatInput).toBeVisible();
      await expect(sendButton).toBeVisible();
      
      // Input should have placeholder text
      await expect(chatInput).toHaveAttribute('placeholder', /describe.*changes/i);
    });

    test('should handle touch interactions on mobile', async ({ page }) => {
      // Skip touch tests on desktop browsers
      if (!name.includes('Mobile') && !name.includes('Tablet')) {
        test.skip();
      }
      
      await page.goto('/test.html');
      await page.waitForSelector('#dino-overlay-container');
      
      const firstImage = page.locator('.editable-room').first();
      
      // Tap on image
      await firstImage.tap();
      
      // Sidebar should appear with touch-friendly sizing
      const sidebar = page.locator('[data-testid="quick-action-sidebar"]');
      await expect(sidebar).toBeVisible();
      
      // Action buttons should be touch-friendly (min 44px)
      const actionButton = sidebar.locator('[data-testid="action-button"]').first();
      const buttonBox = await actionButton.boundingBox();
      
      expect(buttonBox?.height).toBeGreaterThanOrEqual(44);
      expect(buttonBox?.width).toBeGreaterThanOrEqual(44);
    });

    test('should handle responsive layout', async ({ page }) => {
      await page.goto('/test.html');
      await page.waitForSelector('#dino-overlay-container');
      
      const firstImage = page.locator('.editable-room').first();
      await firstImage.click();
      
      const sidebar = page.locator('[data-testid="quick-action-sidebar"]');
      const chatBar = page.locator('[data-testid="floating-chat-bar"]');
      
      await expect(sidebar).toBeVisible();
      await expect(chatBar).toBeVisible();
      
      // Check positioning based on viewport size
      const viewportSize = page.viewportSize();
      
      if (viewportSize && viewportSize.width < 768) {
        // Mobile: sidebar should be full width or positioned differently
        const sidebarBox = await sidebar.boundingBox();
        expect(sidebarBox?.width).toBeGreaterThan(viewportSize.width * 0.8);
      } else {
        // Desktop: sidebar should be positioned on the right
        const sidebarBox = await sidebar.boundingBox();
        expect(sidebarBox?.x).toBeGreaterThan(viewportSize!.width * 0.6);
      }
    });

    test('should handle glassmorphic styling', async ({ page }) => {
      await page.goto('/test.html');
      await page.waitForSelector('#dino-overlay-container');
      
      const firstImage = page.locator('.editable-room').first();
      await firstImage.click();
      
      const sidebar = page.locator('[data-testid="quick-action-sidebar"]');
      await expect(sidebar).toBeVisible();
      
      // Check glassmorphic CSS properties
      const sidebarStyles = await sidebar.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          backdropFilter: styles.backdropFilter,
          background: styles.background,
          borderRadius: styles.borderRadius,
        };
      });
      
      // Should have backdrop blur
      expect(sidebarStyles.backdropFilter).toContain('blur');
      
      // Should have semi-transparent background
      expect(sidebarStyles.background).toMatch(/rgba?\(.*,\s*0\.[0-9]+\)/);
      
      // Should have rounded corners
      expect(parseFloat(sidebarStyles.borderRadius)).toBeGreaterThan(0);
    });

    test('should handle keyboard navigation', async ({ page }) => {
      // Skip keyboard tests on mobile devices
      if (name.includes('Mobile')) {
        test.skip();
      }
      
      await page.goto('/test.html');
      await page.waitForSelector('#dino-overlay-container');
      
      const firstImage = page.locator('.editable-room').first();
      await firstImage.click();
      
      const sidebar = page.locator('[data-testid="quick-action-sidebar"]');
      await expect(sidebar).toBeVisible();
      
      // Tab through action buttons
      await page.keyboard.press('Tab');
      const firstButton = sidebar.locator('[data-testid="action-button"]').first();
      await expect(firstButton).toBeFocused();
      
      // Enter should trigger action
      await page.keyboard.press('Enter');
      
      // Should show processing state
      const processingIndicator = page.locator('[data-testid="processing-indicator"]');
      await expect(processingIndicator).toBeVisible({ timeout: 2000 });
    });

    test('should handle theme adaptation', async ({ page }) => {
      await page.goto('/test.html');
      await page.waitForSelector('#dino-overlay-container');
      
      // Test light theme
      await page.emulateMedia({ colorScheme: 'light' });
      
      const firstImage = page.locator('.editable-room').first();
      await firstImage.click();
      
      const sidebar = page.locator('[data-testid="quick-action-sidebar"]');
      await expect(sidebar).toBeVisible();
      
      // Get light theme colors
      const lightColors = await sidebar.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          background: styles.background,
          color: styles.color,
        };
      });
      
      // Test dark theme
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.waitForTimeout(100); // Allow theme to update
      
      const darkColors = await sidebar.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          background: styles.background,
          color: styles.color,
        };
      });
      
      // Colors should be different between themes
      expect(lightColors.background).not.toBe(darkColors.background);
    });

    test('should handle network errors gracefully', async ({ page }) => {
      // Intercept API calls and simulate network error
      await page.route('**/overlay/edit-image', route => {
        route.abort('failed');
      });
      
      await page.goto('/test.html');
      await page.waitForSelector('#dino-overlay-container');
      
      const firstImage = page.locator('.editable-room').first();
      await firstImage.click();
      
      const sidebar = page.locator('[data-testid="quick-action-sidebar"]');
      const firstButton = sidebar.locator('[data-testid="action-button"]').first();
      
      await firstButton.click();
      
      // Should show error message
      const errorMessage = page.locator('[data-testid="error-message"]');
      await expect(errorMessage).toBeVisible({ timeout: 5000 });
      await expect(errorMessage).toContainText(/network.*error|failed.*connect/i);
    });

    test('should maintain performance standards', async ({ page }) => {
      await page.goto('/test.html');
      
      // Measure load time
      const loadTime = await page.evaluate(() => {
        return performance.timing.loadEventEnd - performance.timing.navigationStart;
      });
      
      // Should load within 2 seconds
      expect(loadTime).toBeLessThan(2000);
      
      // Check bundle size via network requests
      const responses: any[] = [];
      page.on('response', response => {
        if (response.url().includes('dino-overlay')) {
          responses.push({
            url: response.url(),
            size: response.headers()['content-length'],
          });
        }
      });
      
      await page.waitForLoadState('networkidle');
      
      // Main bundle should be under 200KB
      const mainBundle = responses.find(r => r.url.includes('dino-overlay.js'));
      if (mainBundle && mainBundle.size) {
        expect(parseInt(mainBundle.size)).toBeLessThan(200 * 1024);
      }
    });
  });
});