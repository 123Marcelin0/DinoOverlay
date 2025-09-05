import { NextRequest } from 'next/server';
import { POST as editImagePOST } from '@/app/api/overlay/edit-image/route';
import { POST as chatPOST } from '@/app/api/overlay/chat/route';

describe('API Integration Tests', () => {
  const validApiKey = 'test-key-1';
  const validImageData = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A';

  const createRequest = (url: string, body: any, headers: Record<string, string> = {}) => {
    return new NextRequest(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': validApiKey,
        ...headers,
      },
      body: JSON.stringify(body),
    });
  };

  describe('Complete workflow tests', () => {
    it('should handle complete image editing workflow', async () => {
      const editRequest = createRequest('http://localhost:3000/api/overlay/edit-image', {
        imageData: validImageData,
        prompt: 'Add modern furniture to this living room',
        context: {
          propertyId: 'prop-123',
          roomType: 'living-room',
        },
      });

      const editResponse = await editImagePOST(editRequest);
      const editResult = await editResponse.json();

      expect(editResponse.status).toBe(200);
      expect(editResult.success).toBe(true);
      expect(editResult.editedImageUrl).toBeDefined();
      expect(editResult.processingTime).toBeGreaterThan(0);
    });

    it('should handle complete chat workflow', async () => {
      const chatRequest = createRequest('http://localhost:3000/api/overlay/chat', {
        message: 'How can I make this room look more modern?',
        imageContext: validImageData,
      });

      const chatResponse = await chatPOST(chatRequest);
      const chatResult = await chatResponse.json();

      expect(chatResponse.status).toBe(200);
      expect(chatResult.success).toBe(true);
      expect(chatResult.response).toBeDefined();
      expect(chatResult.conversationId).toBeDefined();
    });

    it('should handle conversation continuity', async () => {
      // First message
      const firstRequest = createRequest('http://localhost:3000/api/overlay/chat', {
        message: 'I want to redecorate my living room',
      });

      const firstResponse = await chatPOST(firstRequest);
      const firstResult = await firstResponse.json();

      expect(firstResponse.status).toBe(200);
      expect(firstResult.success).toBe(true);
      const conversationId = firstResult.conversationId;

      // Follow-up message
      const followUpRequest = createRequest('http://localhost:3000/api/overlay/chat', {
        message: 'What colors would you recommend?',
        conversationId,
      });

      const followUpResponse = await chatPOST(followUpRequest);
      const followUpResult = await followUpResponse.json();

      expect(followUpResponse.status).toBe(200);
      expect(followUpResult.success).toBe(true);
      expect(followUpResult.conversationId).toBe(conversationId);
    });
  });

  describe('Cross-endpoint error handling', () => {
    it('should handle rate limiting across endpoints', async () => {
      const requests = [];

      // Make many requests to both endpoints to test rate limiting
      for (let i = 0; i < 15; i++) {
        const editRequest = createRequest('http://localhost:3000/api/overlay/edit-image', {
          imageData: validImageData,
          prompt: `Test prompt ${i}`,
        });
        requests.push(editImagePOST(editRequest));

        const chatRequest = createRequest('http://localhost:3000/api/overlay/chat', {
          message: `Test message ${i}`,
        });
        requests.push(chatPOST(chatRequest));
      }

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited (429 status)
      const rateLimitedResponses = responses.filter(response => response.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should handle authentication consistently across endpoints', async () => {
      const invalidApiKey = 'invalid-key';

      const editRequest = createRequest('http://localhost:3000/api/overlay/edit-image', {
        imageData: validImageData,
        prompt: 'Test prompt',
      }, { 'x-api-key': invalidApiKey });

      const chatRequest = createRequest('http://localhost:3000/api/overlay/chat', {
        message: 'Test message',
      }, { 'x-api-key': invalidApiKey });

      const [editResponse, chatResponse] = await Promise.all([
        editImagePOST(editRequest),
        chatPOST(chatRequest),
      ]);

      expect(editResponse.status).toBe(401);
      expect(chatResponse.status).toBe(401);

      const editResult = await editResponse.json();
      const chatResult = await chatResponse.json();

      expect(editResult.success).toBe(false);
      expect(chatResult.success).toBe(false);
      expect(editResult.error).toBe('Invalid API key');
      expect(chatResult.error).toBe('Invalid API key');
    });
  });

  describe('Performance and load testing', () => {
    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 5;
      const startTime = Date.now();

      const requests = Array(concurrentRequests).fill(null).map((_, index) => {
        if (index % 2 === 0) {
          return editImagePOST(createRequest('http://localhost:3000/api/overlay/edit-image', {
            imageData: validImageData,
            prompt: `Concurrent edit ${index}`,
          }));
        } else {
          return chatPOST(createRequest('http://localhost:3000/api/overlay/chat', {
            message: `Concurrent chat ${index}`,
          }));
        }
      });

      const responses = await Promise.all(requests);
      const endTime = Date.now();

      // All requests should complete successfully
      for (const response of responses) {
        expect([200, 429]).toContain(response.status); // Allow rate limiting
      }

      // Should complete in reasonable time (less than 10 seconds for mock services)
      expect(endTime - startTime).toBeLessThan(10000);
    });

    it('should handle large payloads appropriately', async () => {
      const largePrompt = 'A'.repeat(400); // Near the 500 character limit
      const largeMessage = 'B'.repeat(900); // Near the 1000 character limit

      const editRequest = createRequest('http://localhost:3000/api/overlay/edit-image', {
        imageData: validImageData,
        prompt: largePrompt,
      });

      const chatRequest = createRequest('http://localhost:3000/api/overlay/chat', {
        message: largeMessage,
      });

      const [editResponse, chatResponse] = await Promise.all([
        editImagePOST(editRequest),
        chatPOST(chatRequest),
      ]);

      expect(editResponse.status).toBe(200);
      expect(chatResponse.status).toBe(200);

      const editResult = await editResponse.json();
      const chatResult = await chatResponse.json();

      expect(editResult.success).toBe(true);
      expect(chatResult.success).toBe(true);
    });
  });

  describe('Error recovery and resilience', () => {
    it('should handle malformed requests gracefully', async () => {
      const malformedEditRequest = new NextRequest('http://localhost:3000/api/overlay/edit-image', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': validApiKey,
        },
        body: 'malformed-json{',
      });

      const malformedChatRequest = new NextRequest('http://localhost:3000/api/overlay/chat', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': validApiKey,
        },
        body: 'malformed-json{',
      });

      const [editResponse, chatResponse] = await Promise.all([
        editImagePOST(malformedEditRequest),
        chatPOST(malformedChatRequest),
      ]);

      expect(editResponse.status).toBe(500);
      expect(chatResponse.status).toBe(500);

      const editResult = await editResponse.json();
      const chatResult = await chatResponse.json();

      expect(editResult.success).toBe(false);
      expect(chatResult.success).toBe(false);
      expect(editResult.error).toBe('Internal server error');
      expect(chatResult.error).toBe('Internal server error');
    });

    it('should maintain service availability during errors', async () => {
      // Send a bad request followed by a good request
      const badRequest = createRequest('http://localhost:3000/api/overlay/edit-image', {
        imageData: 'invalid-data',
        prompt: 'Test',
      });

      const goodRequest = createRequest('http://localhost:3000/api/overlay/edit-image', {
        imageData: validImageData,
        prompt: 'Test',
      });

      const badResponse = await editImagePOST(badRequest);
      const goodResponse = await editImagePOST(goodRequest);

      expect(badResponse.status).toBe(400);
      expect(goodResponse.status).toBe(200);

      const badResult = await badResponse.json();
      const goodResult = await goodResponse.json();

      expect(badResult.success).toBe(false);
      expect(goodResult.success).toBe(true);
    });
  });

  describe('Data validation and security', () => {
    it('should validate and sanitize all inputs', async () => {
      const xssAttempt = '<script>alert("xss")</script>';
      
      const editRequest = createRequest('http://localhost:3000/api/overlay/edit-image', {
        imageData: validImageData,
        prompt: xssAttempt,
      });

      const chatRequest = createRequest('http://localhost:3000/api/overlay/chat', {
        message: xssAttempt,
      });

      const [editResponse, chatResponse] = await Promise.all([
        editImagePOST(editRequest),
        chatPOST(chatRequest),
      ]);

      // Requests should be processed (validation doesn't reject HTML-like strings)
      // but the system should handle them safely
      expect([200, 400]).toContain(editResponse.status);
      expect([200, 400]).toContain(chatResponse.status);
    });

    it('should enforce proper content types', async () => {
      const request = new NextRequest('http://localhost:3000/api/overlay/edit-image', {
        method: 'POST',
        headers: {
          'content-type': 'text/plain',
          'x-api-key': validApiKey,
        },
        body: 'plain text body',
      });

      const response = await editImagePOST(request);
      
      // Should handle gracefully even with wrong content type
      expect([400, 500]).toContain(response.status);
    });
  });

  describe('Response format consistency', () => {
    it('should return consistent response format for success cases', async () => {
      const editRequest = createRequest('http://localhost:3000/api/overlay/edit-image', {
        imageData: validImageData,
        prompt: 'Test prompt',
      });

      const chatRequest = createRequest('http://localhost:3000/api/overlay/chat', {
        message: 'Test message',
      });

      const [editResponse, chatResponse] = await Promise.all([
        editImagePOST(editRequest),
        chatPOST(chatRequest),
      ]);

      const editResult = await editResponse.json();
      const chatResult = await chatResponse.json();

      // Both should have success field
      expect(editResult).toHaveProperty('success');
      expect(chatResult).toHaveProperty('success');

      // Success responses should have expected fields
      if (editResult.success) {
        expect(editResult).toHaveProperty('editedImageUrl');
        expect(editResult).toHaveProperty('processingTime');
      }

      if (chatResult.success) {
        expect(chatResult).toHaveProperty('response');
        expect(chatResult).toHaveProperty('conversationId');
      }
    });

    it('should return consistent error format', async () => {
      const editRequest = createRequest('http://localhost:3000/api/overlay/edit-image', {
        prompt: 'Missing image data',
      });

      const chatRequest = createRequest('http://localhost:3000/api/overlay/chat', {
        // Missing message
      });

      const [editResponse, chatResponse] = await Promise.all([
        editImagePOST(editRequest),
        chatPOST(chatRequest),
      ]);

      const editResult = await editResponse.json();
      const chatResult = await chatResponse.json();

      // Both should have consistent error format
      expect(editResult.success).toBe(false);
      expect(chatResult.success).toBe(false);
      expect(editResult).toHaveProperty('error');
      expect(chatResult).toHaveProperty('error');
      expect(typeof editResult.error).toBe('string');
      expect(typeof chatResult.error).toBe('string');
    });
  });
});