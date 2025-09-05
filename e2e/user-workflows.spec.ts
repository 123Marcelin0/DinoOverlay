import { test, expect } from '@playwright/test';

test.describe('Complete User Workflows', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses
    await page.route('**/overlay/edit-image', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing time
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          editedImageUrl: 'https://api.test.com/edited/minimalist-room.jpg',
          processingTime: 2500,
        }),
      });
    });

    await page.route('**/overlay/chat', async route => {
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulate processing time
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          response: 'I\'ve applied a modern minimalist style to your room with clean lines and neutral colors.',
          editedImageUrl: 'https://api.test.com/edited/chat-room.jpg',
        }),
      });
    });

    await page.goto('/test.html');
    await page.waitForSelector('#dino-overlay-container');
  });

  test('Complete quick action workflow', async ({ page }) => {
    // Step 1: Select an editable room image
    const firstImage = page.locator('.editable-room').first();
    await firstImage.click();

    // Step 2: Verify sidebar appears
    const sidebar = page.locator('[data-testid="quick-action-sidebar"]');
    await expect(sidebar).toBeVisible({ timeout: 5000 });

    // Step 3: Click on "Minimalist" action
    const minimalistButton = sidebar.locator('[data-testid="action-button"]').filter({ hasText: 'Minimalist' });
    await minimalistButton.click();

    // Step 4: Verify processing state
    const processingIndicator = page.locator('[data-testid="processing-indicator"]');
    await expect(processingIndicator).toBeVisible();
    
    // Should show loading animation on the selected image
    const imageOverlay = page.locator('[data-testid="image-overlay"]');
    await expect(imageOverlay).toHaveClass(/processing/);

    // Step 5: Wait for processing to complete
    await expect(processingIndicator).toBeHidden({ timeout: 10000 });

    // Step 6: Verify result display
    const resultImage = page.locator('[data-testid="result-image"]');
    await expect(resultImage).toBeVisible();
    await expect(resultImage).toHaveAttribute('src', /edited.*minimalist/);

    // Step 7: Verify success message
    const successMessage = page.locator('[data-testid="success-message"]');
    await expect(successMessage).toBeVisible();
    await expect(successMessage).toContainText(/successfully.*applied/i);
  });

  test('Complete chat workflow', async ({ page }) => {
    // Step 1: Select an editable room image
    const firstImage = page.locator('.editable-room').first();
    await firstImage.click();

    // Step 2: Verify chat bar appears
    const chatBar = page.locator('[data-testid="floating-chat-bar"]');
    await expect(chatBar).toBeVisible({ timeout: 5000 });

    // Step 3: Type a custom message
    const chatInput = chatBar.locator('input[type="text"]');
    await chatInput.fill('Make this room more cozy with warm lighting and soft textures');

    // Step 4: Send the message
    const sendButton = chatBar.locator('[data-testid="send-button"]');
    await sendButton.click();

    // Step 5: Verify typing indicator
    const typingIndicator = page.locator('[data-testid="typing-indicator"]');
    await expect(typingIndicator).toBeVisible();

    // Step 6: Verify processing state
    const processingIndicator = page.locator('[data-testid="processing-indicator"]');
    await expect(processingIndicator).toBeVisible();

    // Step 7: Wait for response
    await expect(typingIndicator).toBeHidden({ timeout: 10000 });
    await expect(processingIndicator).toBeHidden({ timeout: 10000 });

    // Step 8: Verify chat response
    const chatResponse = page.locator('[data-testid="chat-response"]');
    await expect(chatResponse).toBeVisible();
    await expect(chatResponse).toContainText(/modern minimalist style/i);

    // Step 9: Verify result image
    const resultImage = page.locator('[data-testid="result-image"]');
    await expect(resultImage).toBeVisible();
    await expect(resultImage).toHaveAttribute('src', /edited.*chat/);

    // Step 10: Input should be cleared
    await expect(chatInput).toHaveValue('');
  });

  test('Image switching workflow', async ({ page }) => {
    // Step 1: Select first image
    const firstImage = page.locator('.editable-room').first();
    await firstImage.click();

    const sidebar = page.locator('[data-testid="quick-action-sidebar"]');
    await expect(sidebar).toBeVisible();

    // Step 2: Verify first image is selected
    const firstImageOverlay = page.locator('[data-testid="image-overlay"]').first();
    await expect(firstImageOverlay).toHaveClass(/selected/);

    // Step 3: Click on second image
    const secondImage = page.locator('.editable-room').nth(1);
    await secondImage.click();

    // Step 4: Verify selection switched
    const secondImageOverlay = page.locator('[data-testid="image-overlay"]').nth(1);
    await expect(secondImageOverlay).toHaveClass(/selected/);
    await expect(firstImageOverlay).not.toHaveClass(/selected/);

    // Step 5: Sidebar should remain visible
    await expect(sidebar).toBeVisible();
  });

  test('Close overlay workflow', async ({ page }) => {
    // Step 1: Select an image
    const firstImage = page.locator('.editable-room').first();
    await firstImage.click();

    const sidebar = page.locator('[data-testid="quick-action-sidebar"]');
    const chatBar = page.locator('[data-testid="floating-chat-bar"]');
    
    await expect(sidebar).toBeVisible();
    await expect(chatBar).toBeVisible();

    // Step 2: Click close button on sidebar
    const closeButton = sidebar.locator('[data-testid="close-button"]');
    await closeButton.click();

    // Step 3: Verify overlay closes
    await expect(sidebar).toBeHidden();
    await expect(chatBar).toBeHidden();

    // Step 4: Verify image deselection
    const imageOverlay = page.locator('[data-testid="image-overlay"]');
    await expect(imageOverlay).not.toHaveClass(/selected/);
  });

  test('Click outside to close workflow', async ({ page }) => {
    // Step 1: Select an image
    const firstImage = page.locator('.editable-room').first();
    await firstImage.click();

    const sidebar = page.locator('[data-testid="quick-action-sidebar"]');
    await expect(sidebar).toBeVisible();

    // Step 2: Click outside the overlay
    await page.click('body', { position: { x: 50, y: 50 } });

    // Step 3: Verify overlay closes
    await expect(sidebar).toBeHidden();
  });

  test('Error handling workflow', async ({ page }) => {
    // Mock API error
    await page.route('**/overlay/edit-image', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Internal server error',
        }),
      });
    });

    // Step 1: Select image and trigger action
    const firstImage = page.locator('.editable-room').first();
    await firstImage.click();

    const sidebar = page.locator('[data-testid="quick-action-sidebar"]');
    const minimalistButton = sidebar.locator('[data-testid="action-button"]').filter({ hasText: 'Minimalist' });
    await minimalistButton.click();

    // Step 2: Verify error handling
    const errorMessage = page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
    await expect(errorMessage).toContainText(/error.*occurred/i);

    // Step 3: Verify retry button
    const retryButton = page.locator('[data-testid="retry-button"]');
    await expect(retryButton).toBeVisible();

    // Step 4: Test retry functionality
    await retryButton.click();
    await expect(errorMessage).toBeVisible(); // Should show error again
  });

  test('Multiple actions workflow', async ({ page }) => {
    // Step 1: Select image and perform first action
    const firstImage = page.locator('.editable-room').first();
    await firstImage.click();

    const sidebar = page.locator('[data-testid="quick-action-sidebar"]');
    const minimalistButton = sidebar.locator('[data-testid="action-button"]').filter({ hasText: 'Minimalist' });
    await minimalistButton.click();

    // Wait for first action to complete
    const processingIndicator = page.locator('[data-testid="processing-indicator"]');
    await expect(processingIndicator).toBeHidden({ timeout: 10000 });

    // Step 2: Perform second action
    const scandiButton = sidebar.locator('[data-testid="action-button"]').filter({ hasText: 'Scandi Style' });
    await scandiButton.click();

    // Step 3: Verify second processing
    await expect(processingIndicator).toBeVisible();
    await expect(processingIndicator).toBeHidden({ timeout: 10000 });

    // Step 4: Verify final result
    const resultImage = page.locator('[data-testid="result-image"]');
    await expect(resultImage).toBeVisible();
  });

  test('Responsive mobile workflow', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Step 1: Tap on image
    const firstImage = page.locator('.editable-room').first();
    await firstImage.tap();

    // Step 2: Verify mobile-optimized sidebar
    const sidebar = page.locator('[data-testid="quick-action-sidebar"]');
    await expect(sidebar).toBeVisible();

    // Should be full-width on mobile
    const sidebarBox = await sidebar.boundingBox();
    expect(sidebarBox?.width).toBeGreaterThan(300); // Most of screen width

    // Step 3: Verify touch-friendly buttons
    const actionButton = sidebar.locator('[data-testid="action-button"]').first();
    const buttonBox = await actionButton.boundingBox();
    
    expect(buttonBox?.height).toBeGreaterThanOrEqual(44); // iOS touch target minimum
    expect(buttonBox?.width).toBeGreaterThanOrEqual(44);

    // Step 4: Test mobile chat
    const chatBar = page.locator('[data-testid="floating-chat-bar"]');
    await expect(chatBar).toBeVisible();

    // Chat bar should be positioned appropriately for mobile
    const chatBox = await chatBar.boundingBox();
    expect(chatBox?.y).toBeGreaterThan(400); // Near bottom of screen
  });

  test('Keyboard accessibility workflow', async ({ page }) => {
    // Step 1: Navigate to first image using keyboard
    await page.keyboard.press('Tab');
    
    const firstImage = page.locator('.editable-room').first();
    await expect(firstImage).toBeFocused();

    // Step 2: Activate with Enter
    await page.keyboard.press('Enter');

    const sidebar = page.locator('[data-testid="quick-action-sidebar"]');
    await expect(sidebar).toBeVisible();

    // Step 3: Tab through action buttons
    await page.keyboard.press('Tab');
    const firstButton = sidebar.locator('[data-testid="action-button"]').first();
    await expect(firstButton).toBeFocused();

    // Step 4: Activate button with Enter
    await page.keyboard.press('Enter');

    const processingIndicator = page.locator('[data-testid="processing-indicator"]');
    await expect(processingIndicator).toBeVisible();

    // Step 5: Test Escape to close
    await page.keyboard.press('Escape');
    await expect(sidebar).toBeHidden();
  });

  test('Performance during workflow', async ({ page }) => {
    // Monitor performance during complete workflow
    await page.evaluate(() => {
      (window as any).performanceMarks = [];
      const originalMark = performance.mark;
      performance.mark = function(name: string) {
        (window as any).performanceMarks.push({ name, time: performance.now() });
        return originalMark.call(this, name);
      };
    });

    // Execute complete workflow
    const firstImage = page.locator('.editable-room').first();
    await firstImage.click();

    const sidebar = page.locator('[data-testid="quick-action-sidebar"]');
    const minimalistButton = sidebar.locator('[data-testid="action-button"]').filter({ hasText: 'Minimalist' });
    await minimalistButton.click();

    const processingIndicator = page.locator('[data-testid="processing-indicator"]');
    await expect(processingIndicator).toBeHidden({ timeout: 10000 });

    // Check performance metrics
    const performanceData = await page.evaluate(() => {
      return {
        marks: (window as any).performanceMarks,
        memory: (performance as any).memory,
        timing: performance.timing,
      };
    });

    // Verify no excessive performance marks (indicating efficient execution)
    expect(performanceData.marks.length).toBeLessThan(50);

    // Verify memory usage is reasonable (if available)
    if (performanceData.memory) {
      expect(performanceData.memory.usedJSHeapSize).toBeLessThan(50 * 1024 * 1024); // 50MB
    }
  });
});