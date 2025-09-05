import { test, expect } from '@playwright/test';

test.describe('DinoOverlay Widget', () => {
  test('should load overlay script without errors', async ({ page }) => {
    // Navigate to test page
    await page.goto('/test.html');

    // Check that no JavaScript errors occurred
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);

    // Check that the overlay container was created
    const container = await page.locator('#dino-overlay-container');
    await expect(container).toBeAttached();
  });

  test('should detect editable room images', async ({ page }) => {
    await page.goto('/test.html');
    await page.waitForLoadState('networkidle');

    // Should detect 2 editable room images
    const editableImages = await page.locator('.editable-room');
    await expect(editableImages).toHaveCount(2);
    
    // Should have 1 non-editable image
    const nonEditableImages = await page.locator('.non-editable');
    await expect(nonEditableImages).toHaveCount(1);
  });
});