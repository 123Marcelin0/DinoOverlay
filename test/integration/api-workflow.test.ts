/**
 * API Integration and Workflow Tests
 * Tests complete API integration and AI processing workflows
 */

import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Mock API responses for different scenarios
const API_RESPONSES = {
  success: {
    editImage: {
      success: true,
      editedImageUrl: 'https://api.test.com/edited/success-room.jpg',
      editedImageData: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...',
      processingTime: 2500,
      metadata: {
        prompt: 'Apply minimalist styling',
        model: 'gemini-flash-2.5',
        version: '1.0.0'
      }
    },
    chat: {
      success: true,
      response: 'I\'ve applied a modern minimalist style to your room with clean lines and neutral colors.',
      editedImageUrl: 'https://api.test.com/edited/chat-room.jpg',
      suggestions: [
        'Add some plants for a natural touch',
        'Consider warmer lighting',
        'Try a different color palette'
      ],
      conversationId: 'conv_123456'
    }
  },
  error: {
    serverError: {
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR',
      retryAfter: 30
    },
    rateLimited: {
      success: false,
      error: 'Rate limit exceeded',
      code: 'RATE_LIMITED',
      retryAfter: 60,
      remainingQuota: 0
    },
    invalidImage: {
      success: false,
      error: 'Invalid image format',
      code: 'INVALID_IMAGE',
      supportedFormats: ['JPEG', 'PNG', 'WebP']
    },
    processingTimeout: {
      success: false,
      error: 'Processing timeout',
      code: 'TIMEOUT',
      maxProcessingTime: 30000
    }
  },
  slow: {
    editImage: {
      success: true,
      editedImageUrl: 'https://api.test.com/edited/slow-room.jpg',
      processingTime: 8500 // Slow response
    }
  }
};

test.describe('API Integration and Workflow Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Set up default successful API responses
    await page.route('**/overlay/edit-image', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(API_RESPONSES.success.editImage),
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
    });

    await page.route('**/overlay/chat', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(API_RESPONSES.success.chat),
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
    });

    await page.goto('/test.html');
    await page.waitForSelector('#dino-overlay-container');
  });

  test.describe('Image Edit API Workflow', () => {
    
    test('should complete successful image edit workflow', async ({ page }) => {
      const apiRequests: any[] = [];
      
      page.on('request', request => {
        if (request.url().includes('/overlay/edit-image')) {
          apiRequests.push({
            url: request.url(),
            method: request.method(),
            headers: request.headers(),
            postData: request.postData()
          });
        }
      });

      // Step 1: Select image
      const firstImage = page.locator('.editable-room').first();
      await firstImage.click();

      // Step 2: Open sidebar
      const sidebar = page.locator('[data-testid="quick-action-sidebar"]');
      await expect(sidebar).toBeVisible();

      // Step 3: Click action button
      const minimalistButton = sidebar.locator('[data-testid="action-button"]')
        .filter({ hasText: 'Minimalist' });
      await minimalistButton.click();

      // Step 4: Verify processing state
      const processingIndicator = page.locator('[data-testid="processing-indicator"]');
      await expect(processingIndicator).toBeVisible();

      // Step 5: Wait for completion
      await expect(processingIndicator).toBeHidden({ timeout: 10000 });

      // Step 6: Verify result
      const resultImage = page.locator('[data-testid="result-image"]');
      await expect(resultImage).toBeVisible();
      await expect(resultImage).toHaveAttribute('src', /success-room\.jpg/);

      // Verify API request was made correctly
      expect(apiRequests).toHaveLength(1);
      
      const request = apiRequests[0];
      expect(request.method).toBe('POST');
      expect(request.headers['content-type']).toContain('application/json');
      
      const requestData = JSON.parse(request.postData);
      expect(requestData.prompt).toBe('Apply minimalist styling to this room');
      expect(requestData.imageData).toBeTruthy();
      expect(requestData.imageUrl).toBeTruthy();
    });

    test('should handle image data encoding correctly', async ({ page }) => {
      let requestData: any = null;
      
      page.on('request', request => {
        if (request.url().includes('/overlay/edit-image')) {
          requestData = JSON.parse(request.postData() || '{}');
        }
      });

      const firstImage = page.locator('.editable-room').first();
      await firstImage.click();

      const sidebar = page.locator('[data-testid="quick-action-sidebar"]');
      const actionButton = sidebar.locator('[data-testid="action-button"]').first();
      await actionButton.click();

      await page.waitForTimeout(1000);

      // Verify image data is properly base64 encoded
      expect(requestData).toBeTruthy();
      expect(requestData.imageData).toMatch(/^data:image\/(jpeg|png|webp);base64,/);
      
      // Verify image dimensions are included
      expect(requestData.imageDimensions).toBeTruthy();
      expect(requestData.imageDimensions.width).toBeGreaterThan(0);
      expect(requestData.imageDimensions.height).toBeGreaterThan(0);
    });

    test('should include proper authentication headers', async ({ page }) => {
      let requestHeaders: any = {};
      
      page.on('request', request => {
        if (request.url().includes('/overlay/edit-image')) {
          requestHeaders = request.headers();
        }
      });

      const firstImage = page.locator('.editable-room').first();
      await firstImage.click();

      const sidebar = page.locator('[data-testid="quick-action-sidebar"]');
      const actionButton = sidebar.locator('[data-testid="action-button"]').first();
      await actionButton.click();

      await page.waitForTimeout(1000);

      // Verify authentication headers
      expect(requestHeaders.authorization).toBeTruthy();
      expect(requestHeaders.authorization).toMatch(/^Bearer /);
      expect(requestHeaders['x-api-version']).toBe('1.0');
      expect(requestHeaders['user-agent']).toContain('DinoOverlay');
    });

    test('should handle different image formats', async ({ page }) => {
      const imageFormats = ['jpeg', 'png', 'webp'];
      const requests: any[] = [];
      
      page.on('request', request => {
        if (request.url().includes('/overlay/edit-image')) {
          const data = JSON.parse(request.postData() || '{}');
          requests.push(data);
        }
      });

      for (const format of imageFormats) {
        // Simulate different image formats
        await page.evaluate((fmt) => {
          const img = document.querySelector('.editable-room') as HTMLImageElement;
          if (img) {
            img.src = `/test-image.${fmt}`;
          }
        }, format);

        await page.waitForTimeout(200);

        const firstImage = page.locator('.editable-room').first();
        await firstImage.click();

        const sidebar = page.locator('[data-testid="quick-action-sidebar"]');
        const actionButton = sidebar.locator('[data-testid="action-button"]').first();
        await actionButton.click();

        await page.waitForTimeout(500);

        // Close overlay for next iteration
        const closeButton = sidebar.locator('[data-testid="close-button"]');
        await closeButton.click();
      }

      // Verify all formats were handled
      expect(requests).toHaveLength(imageFormats.length);
      
      requests.forEach((request, index) => {
        const expectedFormat = imageFormats[index];
        expect(request.imageData).toMatch(new RegExp(`data:image/${expectedFormat}`));
      });
    });
  });

  test.describe('Chat API Workflow', () => {
    
    test('should complete successful chat workflow', async ({ page }) => {
      const chatRequests: any[] = [];
      
      page.on('request', request => {
        if (request.url().includes('/overlay/chat')) {
          chatRequests.push({
            url: request.url(),
            method: request.method(),
            postData: request.postData()
          });
        }
      });

      // Step 1: Select image
      const firstImage = page.locator('.editable-room').first();
      await firstImage.click();

      // Step 2: Use chat interface
      const chatBar = page.locator('[data-testid="floating-chat-bar"]');
      await expect(chatBar).toBeVisible();

      const chatInput = chatBar.locator('input[type="text"]');
      await chatInput.fill('Make this room more cozy with warm lighting');

      const sendButton = chatBar.locator('[data-testid="send-button"]');
      await sendButton.click();

      // Step 3: Verify processing
      const typingIndicator = page.locator('[data-testid="typing-indicator"]');
      await expect(typingIndicator).toBeVisible();

      // Step 4: Wait for response
      await expect(typingIndicator).toBeHidden({ timeout: 10000 });

      // Step 5: Verify chat response
      const chatResponse = page.locator('[data-testid="chat-response"]');
      await expect(chatResponse).toBeVisible();
      await expect(chatResponse).toContainText(/modern minimalist style/i);

      // Verify API request
      expect(chatRequests).toHaveLength(1);
      
      const request = JSON.parse(chatRequests[0].postData);
      expect(request.message).toBe('Make this room more cozy with warm lighting');
      expect(request.imageContext).toBeTruthy();
    });

    test('should handle conversation context', async ({ page }) => {
      const chatRequests: any[] = [];
      
      page.on('request', request => {
        if (request.url().includes('/overlay/chat')) {
          chatRequests.push(JSON.parse(request.postData() || '{}'));
        }
      });

      const firstImage = page.locator('.editable-room').first();
      await firstImage.click();

      const chatBar = page.locator('[data-testid="floating-chat-bar"]');
      const chatInput = chatBar.locator('input[type="text"]');
      const sendButton = chatBar.locator('[data-testid="send-button"]');

      // First message
      await chatInput.fill('Make it minimalist');
      await sendButton.click();
      await page.waitForTimeout(1000);

      // Second message (should include conversation context)
      await chatInput.fill('Add some plants');
      await sendButton.click();
      await page.waitForTimeout(1000);

      expect(chatRequests).toHaveLength(2);
      
      // First request should not have conversation ID
      expect(chatRequests[0].conversationId).toBeFalsy();
      
      // Second request should include conversation ID from first response
      expect(chatRequests[1].conversationId).toBe('conv_123456');
    });

    test('should handle chat suggestions', async ({ page }) => {
      const firstImage = page.locator('.editable-room').first();
      await firstImage.click();

      const chatBar = page.locator('[data-testid="floating-chat-bar"]');
      const chatInput = chatBar.locator('input[type="text"]');
      const sendButton = chatBar.locator('[data-testid="send-button"]');

      await chatInput.fill('Style this room');
      await sendButton.click();

      // Wait for response
      const chatResponse = page.locator('[data-testid="chat-response"]');
      await expect(chatResponse).toBeVisible();

      // Check for suggestions
      const suggestions = page.locator('[data-testid="chat-suggestions"]');
      await expect(suggestions).toBeVisible();

      const suggestionButtons = suggestions.locator('[data-testid="suggestion-button"]');
      await expect(suggestionButtons).toHaveCount(3);

      // Click on a suggestion
      const firstSuggestion = suggestionButtons.first();
      await expect(firstSuggestion).toContainText('Add some plants');
      
      await firstSuggestion.click();

      // Should populate input with suggestion
      await expect(chatInput).toHaveValue('Add some plants for a natural touch');
    });
  });

  test.describe('Error Handling', () => {
    
    test('should handle server errors gracefully', async ({ page }) => {
      // Mock server error
      await page.route('**/overlay/edit-image', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify(API_RESPONSES.error.serverError)
        });
      });

      const firstImage = page.locator('.editable-room').first();
      await firstImage.click();

      const sidebar = page.locator('[data-testid="quick-action-sidebar"]');
      const actionButton = sidebar.locator('[data-testid="action-button"]').first();
      await actionButton.click();

      // Should show error message
      const errorMessage = page.locator('[data-testid="error-message"]');
      await expect(errorMessage).toBeVisible({ timeout: 5000 });
      await expect(errorMessage).toContainText(/server error/i);

      // Should show retry button
      const retryButton = page.locator('[data-testid="retry-button"]');
      await expect(retryButton).toBeVisible();

      // Should show retry countdown if retryAfter is specified
      const retryCountdown = page.locator('[data-testid="retry-countdown"]');
      await expect(retryCountdown).toBeVisible();
      await expect(retryCountdown).toContainText('30');
    });

    test('should handle rate limiting', async ({ page }) => {
      // Mock rate limit error
      await page.route('**/overlay/edit-image', route => {
        route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify(API_RESPONSES.error.rateLimited)
        });
      });

      const firstImage = page.locator('.editable-room').first();
      await firstImage.click();

      const sidebar = page.locator('[data-testid="quick-action-sidebar"]');
      const actionButton = sidebar.locator('[data-testid="action-button"]').first();
      await actionButton.click();

      // Should show rate limit message
      const errorMessage = page.locator('[data-testid="error-message"]');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText(/rate limit/i);

      // Should show quota information
      const quotaInfo = page.locator('[data-testid="quota-info"]');
      await expect(quotaInfo).toBeVisible();
      await expect(quotaInfo).toContainText('0 requests remaining');
    });

    test('should handle network timeouts', async ({ page }) => {
      // Mock slow response that times out
      await page.route('**/overlay/edit-image', async route => {
        await new Promise(resolve => setTimeout(resolve, 35000)); // Longer than timeout
        route.fulfill({
          status: 200,
          body: JSON.stringify(API_RESPONSES.success.editImage)
        });
      });

      const firstImage = page.locator('.editable-room').first();
      await firstImage.click();

      const sidebar = page.locator('[data-testid="quick-action-sidebar"]');
      const actionButton = sidebar.locator('[data-testid="action-button"]').first();
      await actionButton.click();

      // Should show timeout error
      const errorMessage = page.locator('[data-testid="error-message"]');
      await expect(errorMessage).toBeVisible({ timeout: 35000 });
      await expect(errorMessage).toContainText(/timeout|took too long/i);
    });

    test('should handle invalid image format errors', async ({ page }) => {
      // Mock invalid image error
      await page.route('**/overlay/edit-image', route => {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify(API_RESPONSES.error.invalidImage)
        });
      });

      const firstImage = page.locator('.editable-room').first();
      await firstImage.click();

      const sidebar = page.locator('[data-testid="quick-action-sidebar"]');
      const actionButton = sidebar.locator('[data-testid="action-button"]').first();
      await actionButton.click();

      // Should show format error
      const errorMessage = page.locator('[data-testid="error-message"]');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText(/invalid.*format/i);

      // Should show supported formats
      const formatInfo = page.locator('[data-testid="supported-formats"]');
      await expect(formatInfo).toBeVisible();
      await expect(formatInfo).toContainText('JPEG, PNG, WebP');
    });

    test('should retry failed requests', async ({ page }) => {
      let requestCount = 0;
      
      await page.route('**/overlay/edit-image', route => {
        requestCount++;
        
        if (requestCount === 1) {
          // First request fails
          route.fulfill({
            status: 500,
            body: JSON.stringify(API_RESPONSES.error.serverError)
          });
        } else {
          // Second request succeeds
          route.fulfill({
            status: 200,
            body: JSON.stringify(API_RESPONSES.success.editImage)
          });
        }
      });

      const firstImage = page.locator('.editable-room').first();
      await firstImage.click();

      const sidebar = page.locator('[data-testid="quick-action-sidebar"]');
      const actionButton = sidebar.locator('[data-testid="action-button"]').first();
      await actionButton.click();

      // Should show error first
      const errorMessage = page.locator('[data-testid="error-message"]');
      await expect(errorMessage).toBeVisible();

      // Click retry
      const retryButton = page.locator('[data-testid="retry-button"]');
      await retryButton.click();

      // Should succeed on retry
      const resultImage = page.locator('[data-testid="result-image"]');
      await expect(resultImage).toBeVisible({ timeout: 10000 });

      expect(requestCount).toBe(2);
    });
  });

  test.describe('Performance and Optimization', () => {
    
    test('should handle slow API responses', async ({ page }) => {
      // Mock slow but successful response
      await page.route('**/overlay/edit-image', async route => {
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay
        route.fulfill({
          status: 200,
          body: JSON.stringify(API_RESPONSES.slow.editImage)
        });
      });

      const firstImage = page.locator('.editable-room').first();
      await firstImage.click();

      const sidebar = page.locator('[data-testid="quick-action-sidebar"]');
      const actionButton = sidebar.locator('[data-testid="action-button"]').first();
      await actionButton.click();

      // Should show processing indicator
      const processingIndicator = page.locator('[data-testid="processing-indicator"]');
      await expect(processingIndicator).toBeVisible();

      // Should show progress or time estimate
      const progressInfo = page.locator('[data-testid="progress-info"]');
      await expect(progressInfo).toBeVisible();

      // Should eventually complete
      await expect(processingIndicator).toBeHidden({ timeout: 10000 });

      const resultImage = page.locator('[data-testid="result-image"]');
      await expect(resultImage).toBeVisible();
    });

    test('should handle concurrent API requests', async ({ page }) => {
      let requestCount = 0;
      const requestTimes: number[] = [];
      
      await page.route('**/overlay/edit-image', async route => {
        requestCount++;
        requestTimes.push(Date.now());
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            ...API_RESPONSES.success.editImage,
            editedImageUrl: `https://api.test.com/edited/concurrent-${requestCount}.jpg`
          })
        });
      });

      // Trigger multiple requests quickly
      const images = page.locator('.editable-room');
      const imageCount = await images.count();

      for (let i = 0; i < Math.min(imageCount, 3); i++) {
        await images.nth(i).click();
        
        const sidebar = page.locator('[data-testid="quick-action-sidebar"]');
        const actionButton = sidebar.locator('[data-testid="action-button"]').first();
        await actionButton.click();
        
        // Don't wait for completion, trigger next request
        await page.waitForTimeout(100);
      }

      // Wait for all to complete
      await page.waitForTimeout(5000);

      // Should handle concurrent requests properly
      expect(requestCount).toBe(3);
      
      // Requests should be made concurrently (within reasonable time window)
      const timeSpan = Math.max(...requestTimes) - Math.min(...requestTimes);
      expect(timeSpan).toBeLessThan(2000); // All requests within 2 seconds
    });

    test('should optimize image data transmission', async ({ page }) => {
      let requestData: any = null;
      
      page.on('request', request => {
        if (request.url().includes('/overlay/edit-image')) {
          requestData = JSON.parse(request.postData() || '{}');
        }
      });

      const firstImage = page.locator('.editable-room').first();
      await firstImage.click();

      const sidebar = page.locator('[data-testid="quick-action-sidebar"]');
      const actionButton = sidebar.locator('[data-testid="action-button"]').first();
      await actionButton.click();

      await page.waitForTimeout(1000);

      // Verify image optimization
      expect(requestData).toBeTruthy();
      
      // Should compress large images
      const imageDataSize = requestData.imageData.length;
      expect(imageDataSize).toBeLessThan(1024 * 1024); // Less than 1MB base64
      
      // Should include compression info
      expect(requestData.compression).toBeTruthy();
      expect(requestData.compression.quality).toBeGreaterThan(0);
      expect(requestData.compression.quality).toBeLessThanOrEqual(100);
    });
  });

  test.describe('Security and Validation', () => {
    
    test('should validate API responses', async ({ page }) => {
      // Mock malformed response
      await page.route('**/overlay/edit-image', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            // Missing required fields
            success: true
            // No editedImageUrl or editedImageData
          })
        });
      });

      const firstImage = page.locator('.editable-room').first();
      await firstImage.click();

      const sidebar = page.locator('[data-testid="quick-action-sidebar"]');
      const actionButton = sidebar.locator('[data-testid="action-button"]').first();
      await actionButton.click();

      // Should handle malformed response gracefully
      const errorMessage = page.locator('[data-testid="error-message"]');
      await expect(errorMessage).toBeVisible({ timeout: 5000 });
      await expect(errorMessage).toContainText(/invalid.*response/i);
    });

    test('should sanitize user inputs', async ({ page }) => {
      let requestData: any = null;
      
      page.on('request', request => {
        if (request.url().includes('/overlay/chat')) {
          requestData = JSON.parse(request.postData() || '{}');
        }
      });

      const firstImage = page.locator('.editable-room').first();
      await firstImage.click();

      const chatBar = page.locator('[data-testid="floating-chat-bar"]');
      const chatInput = chatBar.locator('input[type="text"]');
      const sendButton = chatBar.locator('[data-testid="send-button"]');

      // Try to inject malicious content
      const maliciousInput = '<script>alert("xss")</script>Make it modern';
      await chatInput.fill(maliciousInput);
      await sendButton.click();

      await page.waitForTimeout(1000);

      // Should sanitize the input
      expect(requestData.message).not.toContain('<script>');
      expect(requestData.message).toBe('Make it modern'); // Sanitized
    });

    test('should handle CORS preflight requests', async ({ page }) => {
      const preflightRequests: any[] = [];
      
      page.on('request', request => {
        if (request.method() === 'OPTIONS') {
          preflightRequests.push({
            url: request.url(),
            headers: request.headers()
          });
        }
      });

      // Mock CORS preflight
      await page.route('**/overlay/edit-image', route => {
        if (route.request().method() === 'OPTIONS') {
          route.fulfill({
            status: 200,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization',
              'Access-Control-Max-Age': '86400'
            }
          });
        } else {
          route.fulfill({
            status: 200,
            body: JSON.stringify(API_RESPONSES.success.editImage)
          });
        }
      });

      const firstImage = page.locator('.editable-room').first();
      await firstImage.click();

      const sidebar = page.locator('[data-testid="quick-action-sidebar"]');
      const actionButton = sidebar.locator('[data-testid="action-button"]').first();
      await actionButton.click();

      await page.waitForTimeout(2000);

      // Should handle CORS properly
      const resultImage = page.locator('[data-testid="result-image"]');
      await expect(resultImage).toBeVisible();
    });
  });
});