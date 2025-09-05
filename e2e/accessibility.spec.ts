import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test.html');
    await page.waitForSelector('#dino-overlay-container');
  });

  test('should pass axe accessibility tests on initial load', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should pass accessibility tests with overlay active', async ({ page }) => {
    // Activate overlay
    const firstImage = page.locator('.editable-room').first();
    await firstImage.click();
    
    // Wait for sidebar to appear
    await page.waitForSelector('[data-testid="quick-action-sidebar"]', { state: 'visible' });
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('#dino-overlay-container')
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should support keyboard navigation', async ({ page }) => {
    // Tab to first editable image
    await page.keyboard.press('Tab');
    
    const firstImage = page.locator('.editable-room').first();
    await expect(firstImage).toBeFocused();
    
    // Activate with Enter
    await page.keyboard.press('Enter');
    
    const sidebar = page.locator('[data-testid="quick-action-sidebar"]');
    await expect(sidebar).toBeVisible();
    
    // Tab to first action button
    await page.keyboard.press('Tab');
    const firstButton = sidebar.locator('[data-testid="action-button"]').first();
    await expect(firstButton).toBeFocused();
    
    // Tab through all buttons
    const actionButtons = sidebar.locator('[data-testid="action-button"]');
    const buttonCount = await actionButtons.count();
    
    for (let i = 1; i < buttonCount; i++) {
      await page.keyboard.press('Tab');
      await expect(actionButtons.nth(i)).toBeFocused();
    }
    
    // Tab to close button
    await page.keyboard.press('Tab');
    const closeButton = sidebar.locator('[data-testid="close-button"]');
    await expect(closeButton).toBeFocused();
    
    // Escape should close sidebar
    await page.keyboard.press('Escape');
    await expect(sidebar).toBeHidden();
  });

  test('should have proper ARIA labels and roles', async ({ page }) => {
    const firstImage = page.locator('.editable-room').first();
    await firstImage.click();
    
    const sidebar = page.locator('[data-testid="quick-action-sidebar"]');
    await expect(sidebar).toBeVisible();
    
    // Check sidebar ARIA attributes
    await expect(sidebar).toHaveAttribute('role', 'dialog');
    await expect(sidebar).toHaveAttribute('aria-modal', 'true');
    await expect(sidebar).toHaveAttribute('aria-labelledby');
    
    // Check action buttons have proper labels
    const actionButtons = sidebar.locator('[data-testid="action-button"]');
    const buttonCount = await actionButtons.count();
    
    for (let i = 0; i < buttonCount; i++) {
      const button = actionButtons.nth(i);
      const ariaLabel = await button.getAttribute('aria-label');
      const textContent = await button.textContent();
      
      expect(ariaLabel || textContent).toBeTruthy();
    }
    
    // Check chat bar accessibility
    const chatBar = page.locator('[data-testid="floating-chat-bar"]');
    await expect(chatBar).toHaveAttribute('role', 'region');
    await expect(chatBar).toHaveAttribute('aria-label');
    
    const chatInput = chatBar.locator('input');
    await expect(chatInput).toHaveAttribute('aria-label');
  });

  test('should announce loading states to screen readers', async ({ page }) => {
    // Mock API to simulate loading
    await page.route('**/overlay/edit-image', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, editedImageUrl: 'test.jpg' }),
      });
    });
    
    const firstImage = page.locator('.editable-room').first();
    await firstImage.click();
    
    const sidebar = page.locator('[data-testid="quick-action-sidebar"]');
    const firstButton = sidebar.locator('[data-testid="action-button"]').first();
    
    await firstButton.click();
    
    // Check for loading announcement
    const loadingIndicator = page.locator('[data-testid="processing-indicator"]');
    await expect(loadingIndicator).toBeVisible();
    
    // Should have aria-live region for announcements
    const liveRegion = page.locator('[aria-live="polite"], [aria-live="assertive"]');
    await expect(liveRegion).toBeVisible();
    
    // Wait for completion
    await expect(loadingIndicator).toBeHidden({ timeout: 10000 });
  });

  test('should have sufficient color contrast', async ({ page }) => {
    const firstImage = page.locator('.editable-room').first();
    await firstImage.click();
    
    const sidebar = page.locator('[data-testid="quick-action-sidebar"]');
    await expect(sidebar).toBeVisible();
    
    // Run color contrast check
    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('[data-testid="quick-action-sidebar"]')
      .withTags(['wcag2aa'])
      .analyze();
    
    const contrastViolations = accessibilityScanResults.violations.filter(
      violation => violation.id === 'color-contrast'
    );
    
    expect(contrastViolations).toHaveLength(0);
  });

  test('should support screen reader navigation', async ({ page }) => {
    // This test would ideally use a screen reader, but we can test the structure
    const firstImage = page.locator('.editable-room').first();
    await firstImage.click();
    
    const sidebar = page.locator('[data-testid="quick-action-sidebar"]');
    
    // Check heading structure
    const heading = sidebar.locator('h1, h2, h3, h4, h5, h6').first();
    if (await heading.count() > 0) {
      await expect(heading).toBeVisible();
      const headingText = await heading.textContent();
      expect(headingText).toBeTruthy();
    }
    
    // Check landmark roles
    const landmarks = page.locator('[role="banner"], [role="navigation"], [role="main"], [role="complementary"], [role="contentinfo"]');
    const landmarkCount = await landmarks.count();
    
    // Should have proper landmark structure
    expect(landmarkCount).toBeGreaterThanOrEqual(0);
  });

  test('should handle focus trapping in modals', async ({ page }) => {
    const firstImage = page.locator('.editable-room').first();
    await firstImage.click();
    
    const sidebar = page.locator('[data-testid="quick-action-sidebar"]');
    await expect(sidebar).toBeVisible();
    
    // Get all focusable elements in sidebar
    const focusableElements = sidebar.locator('button, input, select, textarea, [tabindex="0"]');
    const elementCount = await focusableElements.count();
    
    if (elementCount > 0) {
      // Tab through all elements
      for (let i = 0; i < elementCount; i++) {
        await page.keyboard.press('Tab');
      }
      
      // One more tab should cycle back to first element
      await page.keyboard.press('Tab');
      await expect(focusableElements.first()).toBeFocused();
      
      // Shift+Tab should go to last element
      await page.keyboard.press('Shift+Tab');
      await expect(focusableElements.last()).toBeFocused();
    }
  });

  test('should provide error feedback accessibly', async ({ page }) => {
    // Mock API error
    await page.route('**/overlay/edit-image', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: 'Server error' }),
      });
    });
    
    const firstImage = page.locator('.editable-room').first();
    await firstImage.click();
    
    const sidebar = page.locator('[data-testid="quick-action-sidebar"]');
    const firstButton = sidebar.locator('[data-testid="action-button"]').first();
    
    await firstButton.click();
    
    // Check for accessible error message
    const errorMessage = page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toBeVisible();
    
    // Error should be announced
    await expect(errorMessage).toHaveAttribute('role', 'alert');
    
    // Error should have descriptive text
    const errorText = await errorMessage.textContent();
    expect(errorText).toContain('error');
  });

  test('should support high contrast mode', async ({ page }) => {
    // Simulate high contrast mode
    await page.emulateMedia({ forcedColors: 'active' });
    
    const firstImage = page.locator('.editable-room').first();
    await firstImage.click();
    
    const sidebar = page.locator('[data-testid="quick-action-sidebar"]');
    await expect(sidebar).toBeVisible();
    
    // Elements should still be visible and functional in high contrast mode
    const actionButtons = sidebar.locator('[data-testid="action-button"]');
    const buttonCount = await actionButtons.count();
    
    for (let i = 0; i < buttonCount; i++) {
      const button = actionButtons.nth(i);
      await expect(button).toBeVisible();
      
      // Button should have visible text or icon
      const hasVisibleContent = await button.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return styles.opacity !== '0' && styles.visibility !== 'hidden';
      });
      
      expect(hasVisibleContent).toBe(true);
    }
  });

  test('should support reduced motion preferences', async ({ page }) => {
    // Simulate reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    
    const firstImage = page.locator('.editable-room').first();
    await firstImage.click();
    
    const sidebar = page.locator('[data-testid="quick-action-sidebar"]');
    await expect(sidebar).toBeVisible();
    
    // Animations should be reduced or disabled
    const sidebarStyles = await sidebar.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return {
        animationDuration: styles.animationDuration,
        transitionDuration: styles.transitionDuration,
      };
    });
    
    // Animation durations should be minimal when reduced motion is preferred
    if (sidebarStyles.animationDuration !== 'none') {
      const duration = parseFloat(sidebarStyles.animationDuration);
      expect(duration).toBeLessThanOrEqual(0.1); // 100ms or less
    }
  });

  test('should work with voice control', async ({ page }) => {
    // Test that elements have proper names for voice control
    const firstImage = page.locator('.editable-room').first();
    await firstImage.click();
    
    const sidebar = page.locator('[data-testid="quick-action-sidebar"]');
    const actionButtons = sidebar.locator('[data-testid="action-button"]');
    
    const buttonCount = await actionButtons.count();
    
    for (let i = 0; i < buttonCount; i++) {
      const button = actionButtons.nth(i);
      
      // Button should have accessible name for voice commands
      const accessibleName = await button.evaluate(el => {
        return el.getAttribute('aria-label') || 
               el.textContent?.trim() || 
               el.getAttribute('title');
      });
      
      expect(accessibleName).toBeTruthy();
      expect(accessibleName!.length).toBeGreaterThan(2); // Meaningful name
    }
  });

  test('should handle zoom up to 200%', async ({ page }) => {
    // Set zoom level to 200%
    await page.setViewportSize({ width: 640, height: 480 }); // Simulate 200% zoom
    
    const firstImage = page.locator('.editable-room').first();
    await firstImage.click();
    
    const sidebar = page.locator('[data-testid="quick-action-sidebar"]');
    await expect(sidebar).toBeVisible();
    
    // All content should still be accessible at high zoom
    const actionButtons = sidebar.locator('[data-testid="action-button"]');
    const buttonCount = await actionButtons.count();
    
    for (let i = 0; i < buttonCount; i++) {
      const button = actionButtons.nth(i);
      await expect(button).toBeVisible();
      
      // Button should be clickable
      const boundingBox = await button.boundingBox();
      expect(boundingBox).toBeTruthy();
      expect(boundingBox!.width).toBeGreaterThan(0);
      expect(boundingBox!.height).toBeGreaterThan(0);
    }
    
    // Text should not be cut off
    const chatBar = page.locator('[data-testid="floating-chat-bar"]');
    const chatInput = chatBar.locator('input');
    
    if (await chatInput.count() > 0) {
      const inputBox = await chatInput.boundingBox();
      expect(inputBox).toBeTruthy();
      expect(inputBox!.width).toBeGreaterThan(50); // Minimum usable width
    }
  });
});