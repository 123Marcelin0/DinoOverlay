import { APIClient } from '../../src/core/APIClient';
import { SecurityManager } from '../../src/core/SecurityManager';
import { ErrorManager } from '../../src/core/ErrorManager';
import type { APIClientConfig, EditImageRequest, ChatRequest } from '../../src/types/api';

// Mock fetch for testing
global.fetch = jest.fn();

describe('APIClient Security Integration', () => {
  let apiClient: APIClient;
  let securityManager: SecurityManager;
  let errorManager: ErrorManager;

  const mockConfig: APIClientConfig = {
    baseUrl: 'https://api.example.com',
    apiKey: 'test-api-key',
    debug: false
  };

  beforeEach(() => {
    securityManager = new SecurityManager({
      enableCSP: true,
      enableInputSanitization: true,
      enableXSSProtection: true,
      enableAPIKeyEncryption: true,
      allowedDomains: ['https://api.example.com']
    });

    errorManager = new ErrorManager({
      debug: false,
      enableUserNotifications: false,
      enableErrorReporting: false
    });

    apiClient = new APIClient(mockConfig, errorManager, securityManager);

    // Reset fetch mock
    (fetch as jest.Mock).mockClear();
  });

  describe('Request Sanitization', () => {
    it('should sanitize edit image request prompts', async () => {
      const maliciousRequest: EditImageRequest = {
        prompt: '<script>alert("xss")</script>Clean the room',
        imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true, editedImageUrl: 'https://example.com/edited.jpg' })
      });

      await apiClient.editImage(maliciousRequest);

      const fetchCall = (fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      
      // Prompt should be sanitized
      expect(requestBody.prompt).not.toContain('<script>');
      expect(requestBody.prompt).toContain('Clean the room');
    });

    it('should sanitize chat message requests', async () => {
      const maliciousRequest: ChatRequest = {
        message: 'Make it <img src=x onerror=alert(1)> modern',
        conversationId: 'test-conversation'
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true, response: 'I can help with that' })
      });

      await apiClient.sendChatMessage(maliciousRequest);

      const fetchCall = (fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      
      // Message should be sanitized
      expect(requestBody.message).not.toContain('onerror');
      expect(requestBody.message).toContain('modern');
    });

    it('should sanitize nested context objects', async () => {
      const requestWithMaliciousContext: EditImageRequest = {
        prompt: 'Clean the room',
        imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
        context: {
          propertyId: '<script>alert("xss")</script>prop-123',
          roomType: 'living<img src=x onerror=alert(1)>room',
          userId: 'user-456'
        }
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true })
      });

      await apiClient.editImage(requestWithMaliciousContext);

      const fetchCall = (fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      
      expect(requestBody.context.propertyId).not.toContain('<script>');
      expect(requestBody.context.roomType).not.toContain('onerror');
      expect(requestBody.context.userId).toBe('user-456');
    });
  });

  describe('Input Validation', () => {
    it('should reject requests with XSS in prompts', async () => {
      const xssRequest: EditImageRequest = {
        prompt: '<script>alert("xss")</script>',
        imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
      };

      await expect(apiClient.editImage(xssRequest)).rejects.toThrow('Invalid prompt');
    });

    it('should reject requests with invalid base64 data', async () => {
      const invalidBase64Request: EditImageRequest = {
        prompt: 'Clean the room',
        imageData: 'invalid-base64-data!'
      };

      await expect(apiClient.editImage(invalidBase64Request)).rejects.toThrow('Invalid imageData');
    });

    it('should reject requests with malicious URLs', async () => {
      const maliciousUrlRequest: EditImageRequest = {
        prompt: 'Clean the room',
        imageUrl: 'javascript:alert(1)'
      };

      await expect(apiClient.editImage(maliciousUrlRequest)).rejects.toThrow('Invalid imageUrl');
    });

    it('should reject chat messages with XSS', async () => {
      const xssChatRequest: ChatRequest = {
        message: '<script>alert("xss")</script>'
      };

      await expect(apiClient.sendChatMessage(xssChatRequest)).rejects.toThrow('Invalid message');
    });

    it('should validate conversation IDs', async () => {
      const invalidConversationRequest: ChatRequest = {
        message: 'Hello',
        conversationId: '<script>alert(1)</script>'
      };

      await expect(apiClient.sendChatMessage(invalidConversationRequest)).rejects.toThrow('Invalid conversationId');
    });

    it('should enforce maximum length limits', async () => {
      const longPromptRequest: EditImageRequest = {
        prompt: 'a'.repeat(2000), // Exceeds 1000 character limit
        imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
      };

      await expect(apiClient.editImage(longPromptRequest)).rejects.toThrow('Invalid prompt');
    });
  });

  describe('Response Sanitization', () => {
    it('should sanitize API responses', async () => {
      const maliciousResponse = {
        success: true,
        response: '<script>alert("xss")</script>Here is your result',
        suggestions: [
          'Safe suggestion',
          '<img src=x onerror=alert(1)>Malicious suggestion'
        ]
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => maliciousResponse
      });

      const request: ChatRequest = {
        message: 'Hello'
      };

      const result = await apiClient.sendChatMessage(request);

      expect(result.response).not.toContain('<script>');
      expect(result.suggestions?.[1]).not.toContain('onerror');
      expect(result.response).toContain('Here is your result');
    });

    it('should sanitize nested response objects', async () => {
      const nestedMaliciousResponse = {
        success: true,
        data: {
          title: '<script>alert("xss")</script>Clean Room',
          metadata: {
            description: '<img src=x onerror=alert(1)>Modern style'
          }
        }
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => nestedMaliciousResponse
      });

      const request: EditImageRequest = {
        prompt: 'Clean the room',
        imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
      };

      const result = await apiClient.editImage(request);

      expect((result as any).data.title).not.toContain('<script>');
      expect((result as any).data.metadata.description).not.toContain('onerror');
    });
  });

  describe('Secure Headers', () => {
    it('should include security headers in requests', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true })
      });

      const request: ChatRequest = {
        message: 'Hello'
      };

      await apiClient.sendChatMessage(request);

      const fetchCall = (fetch as jest.Mock).mock.calls[0];
      const headers = fetchCall[1].headers;

      expect(headers['Authorization']).toBe(`Bearer ${mockConfig.apiKey}`);
      expect(headers['X-Requested-With']).toBe('XMLHttpRequest');
      expect(headers['X-DinoOverlay-Version']).toBe('1.0.0');
      expect(headers['X-CSP-Nonce']).toBeDefined();
    });

    it('should mark encrypted API keys', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true })
      });

      const request: ChatRequest = {
        message: 'Hello'
      };

      await apiClient.sendChatMessage(request);

      const fetchCall = (fetch as jest.Mock).mock.calls[0];
      const headers = fetchCall[1].headers;

      expect(headers['X-API-Key-Encrypted']).toBe('true');
    });
  });

  describe('URL Validation', () => {
    it('should reject unsafe base URLs during construction', () => {
      const unsafeConfig: APIClientConfig = {
        baseUrl: 'javascript:alert(1)',
        apiKey: 'test-key'
      };

      expect(() => {
        new APIClient(unsafeConfig, errorManager, securityManager);
      }).toThrow('Invalid or unsafe baseUrl');
    });

    it('should allow safe base URLs', () => {
      const safeConfigs = [
        { baseUrl: 'https://api.example.com', apiKey: 'test-key' },
        { baseUrl: 'http://localhost:3000', apiKey: 'test-key' }
      ];

      safeConfigs.forEach(config => {
        expect(() => {
          new APIClient(config, errorManager, securityManager);
        }).not.toThrow();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle security validation errors gracefully', async () => {
      const invalidRequest: EditImageRequest = {
        prompt: '', // Empty prompt should fail validation
        imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
      };

      await expect(apiClient.editImage(invalidRequest)).rejects.toThrow('prompt is required');
    });

    it('should handle malformed responses safely', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => { throw new Error('Invalid JSON'); }
      });

      const request: ChatRequest = {
        message: 'Hello'
      };

      await expect(apiClient.sendChatMessage(request)).rejects.toThrow();
    });
  });

  describe('Performance Impact', () => {
    it('should not significantly impact performance with security features', async () => {
      const request: EditImageRequest = {
        prompt: 'Clean the room with modern furniture',
        imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true, editedImageUrl: 'https://example.com/edited.jpg' })
      });

      const start = performance.now();
      await apiClient.editImage(request);
      const end = performance.now();

      // Security processing should add minimal overhead (< 100ms)
      expect(end - start).toBeLessThan(100);
    });

    it('should handle large payloads efficiently', async () => {
      // Create a large but valid base64 image (1MB)
      const largeImageData = 'data:image/png;base64,' + 'A'.repeat(1024 * 1024);
      
      const request: EditImageRequest = {
        prompt: 'Process this large image',
        imageData: largeImageData
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true })
      });

      const start = performance.now();
      await apiClient.editImage(request);
      const end = performance.now();

      // Should handle large payloads without excessive delay
      expect(end - start).toBeLessThan(1000);
    });
  });
});