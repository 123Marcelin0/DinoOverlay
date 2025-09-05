/**
 * Real Estate Website Integration Tests
 * Tests DinoOverlay integration with various real estate platforms
 */

import { test, expect, Page } from '@playwright/test';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Test configurations for different real estate platforms
const PLATFORM_CONFIGS = {
  wordpress: {
    name: 'WordPress Real Estate',
    testUrl: '/test-wordpress.html',
    selector: '.property-image.editable-room',
    expectedCount: 3,
    framework: 'WordPress'
  },
  react: {
    name: 'React Real Estate App',
    testUrl: '/test-react.html',
    selector: '.room-image.editable-room',
    expectedCount: 4,
    framework: 'React'
  },
  vue: {
    name: 'Vue.js Property Site',
    testUrl: '/test-vue.html',
    selector: '.property-photo.editable-room',
    expectedCount: 2,
    framework: 'Vue.js'
  },
  vanilla: {
    name: 'Plain HTML Site',
    testUrl: '/test-vanilla.html',
    selector: '.listing-image.editable-room',
    expectedCount: 5,
    framework: 'Vanilla JS'
  },
  shopify: {
    name: 'Shopify Real Estate Theme',
    testUrl: '/test-shopify.html',
    selector: '.product-image.editable-room',
    expectedCount: 2,
    framework: 'Shopify'
  }
};

test.describe('Real Estate Platform Integration Tests', () => {
  
  test.beforeAll(async () => {
    // Ensure widget is built
    try {
      execSync('npm run build:widget', { stdio: 'inherit' });
    } catch (error) {
      console.warn('Widget build failed, using existing build');
    }
  });

  Object.entries(PLATFORM_CONFIGS).forEach(([platform, config]) => {
    test.describe(`${config.name} Integration`, () => {
      
      test('should load overlay without conflicts', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (error) => {
          errors.push(`${error.name}: ${error.message}`);
        });

        await page.goto(config.testUrl);
        await page.waitForLoadState('networkidle');

        // Check for JavaScript errors
        expect(errors).toHaveLength(0);

        // Verify overlay container exists
        const container = page.locator('#dino-overlay-container');
        await expect(container).toBeAttached();

        // Verify Shadow DOM isolation
        const shadowRoot = await container.evaluate(el => el.shadowRoot !== null);
        expect(shadowRoot).toBe(true);
      });

      test('should detect editable room images', async ({ page }) => {
        await page.goto(config.testUrl);
        await page.waitForSelector('#dino-overlay-container');

        // Wait for image detection
        await page.waitForTimeout(1000);

        const editableImages = page.locator(config.selector);
        await expect(editableImages).toHaveCount(config.expectedCount);

        // Verify each image has overlay
        for (let i = 0; i < config.expectedCount; i++) {
          const image = editableImages.nth(i);
          await expect(image).toBeVisible();
          
          // Check for overlay border
          const overlay = page.locator(`[data-image-overlay="${i}"]`);
          await expect(overlay).toBeVisible();
        }
      });

      test('should handle framework-specific DOM updates', async ({ page }) => {
        await page.goto(config.testUrl);
        await page.waitForSelector('#dino-overlay-container');

        // Simulate dynamic content loading (common in SPAs)
        if (config.framework === 'React' || config.framework === 'Vue.js') {
          await page.evaluate(() => {
            // Add new editable image dynamically
            const newImage = document.createElement('img');
            newImage.src = '/placeholder.jpg';
            newImage.className = 'room-image editable-room';
            newImage.alt = 'Dynamic room image';
            document.body.appendChild(newImage);
          });

          // Wait for mutation observer to detect new image
          await page.waitForTimeout(500);

          // Should detect the new image
          const editableImages = page.locator(config.selector);
          await expect(editableImages).toHaveCount(config.expectedCount + 1);
        }
      });

      test('should maintain styling isolation', async ({ page }) => {
        await page.goto(config.testUrl);
        await page.waitForSelector('#dino-overlay-container');

        const firstImage = page.locator(config.selector).first();
        await firstImage.click();

        const sidebar = page.locator('[data-testid="quick-action-sidebar"]');
        await expect(sidebar).toBeVisible();

        // Check that overlay styles don't affect host site
        const hostElement = page.locator('body');
        const hostStyles = await hostElement.evaluate(el => {
          const styles = window.getComputedStyle(el);
          return {
            fontFamily: styles.fontFamily,
            fontSize: styles.fontSize,
            color: styles.color
          };
        });

        // Overlay should not change host site styles
        expect(hostStyles.fontFamily).not.toContain('Inter'); // Overlay font
        expect(hostStyles.fontSize).not.toBe('14px'); // Overlay font size
      });

      test('should handle responsive breakpoints', async ({ page }) => {
        // Test desktop
        await page.setViewportSize({ width: 1200, height: 800 });
        await page.goto(config.testUrl);
        await page.waitForSelector('#dino-overlay-container');

        const firstImage = page.locator(config.selector).first();
        await firstImage.click();

        const sidebar = page.locator('[data-testid="quick-action-sidebar"]');
        await expect(sidebar).toBeVisible();

        // Desktop: sidebar should be positioned on the right
        const desktopSidebarBox = await sidebar.boundingBox();
        expect(desktopSidebarBox?.x).toBeGreaterThan(800);

        // Test mobile
        await page.setViewportSize({ width: 375, height: 667 });
        await page.waitForTimeout(200); // Allow responsive adjustments

        const mobileSidebarBox = await sidebar.boundingBox();
        // Mobile: sidebar should be full-width or repositioned
        expect(mobileSidebarBox?.width).toBeGreaterThan(300);
      });

      test('should handle API integration', async ({ page }) => {
        // Mock API responses
        await page.route('**/overlay/edit-image', route => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              editedImageUrl: 'https://api.test.com/edited/room.jpg',
              processingTime: 1500
            })
          });
        });

        await page.goto(config.testUrl);
        await page.waitForSelector('#dino-overlay-container');

        const firstImage = page.locator(config.selector).first();
        await firstImage.click();

        const sidebar = page.locator('[data-testid="quick-action-sidebar"]');
        const minimalistButton = sidebar.locator('[data-testid="action-button"]')
          .filter({ hasText: 'Minimalist' });
        
        await minimalistButton.click();

        // Should show processing state
        const processingIndicator = page.locator('[data-testid="processing-indicator"]');
        await expect(processingIndicator).toBeVisible();

        // Should complete successfully
        await expect(processingIndicator).toBeHidden({ timeout: 5000 });

        const resultImage = page.locator('[data-testid="result-image"]');
        await expect(resultImage).toBeVisible();
      });

      test('should handle performance requirements', async ({ page }) => {
        const startTime = Date.now();
        
        await page.goto(config.testUrl);
        await page.waitForSelector('#dino-overlay-container');
        
        const loadTime = Date.now() - startTime;
        
        // Should load within 2 seconds
        expect(loadTime).toBeLessThan(2000);

        // Check memory usage
        const memoryUsage = await page.evaluate(() => {
          return (performance as any).memory?.usedJSHeapSize || 0;
        });

        // Should use less than 50MB
        if (memoryUsage > 0) {
          expect(memoryUsage).toBeLessThan(50 * 1024 * 1024);
        }
      });

      test('should handle error scenarios gracefully', async ({ page }) => {
        // Mock API error
        await page.route('**/overlay/edit-image', route => {
          route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: 'Internal server error'
            })
          });
        });

        await page.goto(config.testUrl);
        await page.waitForSelector('#dino-overlay-container');

        const firstImage = page.locator(config.selector).first();
        await firstImage.click();

        const sidebar = page.locator('[data-testid="quick-action-sidebar"]');
        const actionButton = sidebar.locator('[data-testid="action-button"]').first();
        
        await actionButton.click();

        // Should show error message
        const errorMessage = page.locator('[data-testid="error-message"]');
        await expect(errorMessage).toBeVisible({ timeout: 5000 });
        await expect(errorMessage).toContainText(/error/i);

        // Should offer retry option
        const retryButton = page.locator('[data-testid="retry-button"]');
        await expect(retryButton).toBeVisible();
      });

      test('should cleanup properly on page unload', async ({ page }) => {
        await page.goto(config.testUrl);
        await page.waitForSelector('#dino-overlay-container');

        // Activate overlay
        const firstImage = page.locator(config.selector).first();
        await firstImage.click();

        // Navigate away
        await page.goto('/blank.html');

        // Check for memory leaks (simplified check)
        const memoryAfterNavigation = await page.evaluate(() => {
          return (performance as any).memory?.usedJSHeapSize || 0;
        });

        // Memory usage should not be excessive after navigation
        if (memoryAfterNavigation > 0) {
          expect(memoryAfterNavigation).toBeLessThan(30 * 1024 * 1024);
        }
      });
    });
  });

  test.describe('Cross-Platform Compatibility', () => {
    
    test('should work consistently across all platforms', async ({ page }) => {
      const results: any[] = [];

      for (const [platform, config] of Object.entries(PLATFORM_CONFIGS)) {
        await page.goto(config.testUrl);
        await page.waitForSelector('#dino-overlay-container');

        const editableImages = page.locator(config.selector);
        const imageCount = await editableImages.count();

        const firstImage = editableImages.first();
        await firstImage.click();

        const sidebar = page.locator('[data-testid="quick-action-sidebar"]');
        const sidebarVisible = await sidebar.isVisible();

        results.push({
          platform,
          imageCount,
          sidebarVisible,
          expectedCount: config.expectedCount
        });
      }

      // All platforms should detect correct number of images
      for (const result of results) {
        expect(result.imageCount).toBe(result.expectedCount);
        expect(result.sidebarVisible).toBe(true);
      }
    });

    test('should maintain consistent performance across platforms', async ({ page }) => {
      const performanceResults: any[] = [];

      for (const [platform, config] of Object.entries(PLATFORM_CONFIGS)) {
        const startTime = Date.now();
        
        await page.goto(config.testUrl);
        await page.waitForSelector('#dino-overlay-container');
        
        const loadTime = Date.now() - startTime;
        
        performanceResults.push({
          platform,
          loadTime
        });
      }

      // All platforms should load within acceptable time
      for (const result of performanceResults) {
        expect(result.loadTime).toBeLessThan(3000); // 3 second tolerance
      }

      // Performance should be consistent (no platform > 2x slower than fastest)
      const loadTimes = performanceResults.map(r => r.loadTime);
      const minTime = Math.min(...loadTimes);
      const maxTime = Math.max(...loadTimes);
      
      expect(maxTime).toBeLessThan(minTime * 2);
    });
  });
});