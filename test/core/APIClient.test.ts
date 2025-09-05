import { APIClient } from '../../src/core/APIClient';
import type { 
  APIClientConfig, 
  EditImageRequest, 
  ChatRequest 
} from '../../src/types/api';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('APIClient', () => {
  let apiClient: APIClient;
  let config: APIClientConfig;

  beforeEach(() => {
    config = {
      baseUrl: 'https://api.test.com',
      apiKey: 'test-api-key',
      debug: false
    };
    apiClient = new APIClient(config);
    mockFetch.mockReset();
  });

  describe('constructor', () => {
    it('should create APIClient with valid config', () => {
      expect(apiClient).toBeInstanceOf(APIClient);
    });

    it('should throw error if baseUrl is missing', () => {
      expect(() => new APIClient({ ...config, baseUrl: '' }))
        .toThrow('APIClient: baseUrl is required');
    });

    it('should throw error if apiKey is missing', () => {
      expect(() => new APIClient({ ...config, apiKey: '' }))
        .toThrow('APIClient: apiKey is required');
    });

    it('should use default values for optional config', () => {
      const client = new APIClient({
        baseUrl: 'https://api.test.com',
        apiKey: 'test-key'
      });
      expect(client).toBeInstanceOf(APIClient);
    });
  });

  describe('editImage', () => {
    const validRequest: EditImageRequest = {
      imageData: 'data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
      prompt: 'Make it modern'
    };

    it('should successfully edit image with valid request', async () => {
      const mockResponse = {
        success: true,
        editedImageData: 'data:image/jpeg;base64,edited-image-data',
        processingTime: 1500,
        requestId: 'req-123'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => mockResponse
      });

      const result = await apiClient.editImage(validRequest);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/overlay/edit-image',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-api-key'
          }),
          body: JSON.stringify(validRequest)
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should throw error for invalid request - missing prompt', async () => {
      const invalidRequest = { ...validRequest, prompt: '' };
      
      await expect(apiClient.editImage(invalidRequest))
        .rejects.toThrow('EditImageRequest: prompt is required');
    });

    it('should throw error for invalid request - missing image data', async () => {
      const invalidRequest = { prompt: 'test' } as EditImageRequest;
      
      await expect(apiClient.editImage(invalidRequest))
        .rejects.toThrow('EditImageRequest: either imageData or imageUrl is required');
    });

    it('should throw error for invalid base64 data', async () => {
      const invalidRequest = { ...validRequest, imageData: 'invalid-base64' };
      
      await expect(apiClient.editImage(invalidRequest))
        .rejects.toThrow('EditImageRequest: imageData must be valid base64');
    });

    it('should handle API error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({ error: 'Invalid image format' })
      });

      await expect(apiClient.editImage(validRequest))
        .rejects.toThrow('Failed to edit image');
    });

    it('should retry on retryable errors', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Map([['content-type', 'application/json']]),
          json: async () => ({ success: true, editedImageData: 'success' })
        });

      const result = await apiClient.editImage(validRequest);
      
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
    });
  });

  describe('sendChatMessage', () => {
    const validChatRequest: ChatRequest = {
      message: 'How can I improve this room?',
      imageContext: 'data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
    };

    it('should successfully send chat message', async () => {
      const mockResponse = {
        success: true,
        response: 'I suggest adding some plants and modern furniture.',
        suggestions: ['Add plants', 'Modern furniture', 'Better lighting'],
        conversationId: 'conv-123'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => mockResponse
      });

      const result = await apiClient.sendChatMessage(validChatRequest);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/overlay/chat',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-api-key'
          }),
          body: JSON.stringify(validChatRequest)
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should throw error for empty message', async () => {
      const invalidRequest = { ...validChatRequest, message: '' };
      
      await expect(apiClient.sendChatMessage(invalidRequest))
        .rejects.toThrow('ChatRequest: message is required');
    });

    it('should throw error for message too long', async () => {
      const longMessage = 'a'.repeat(2001);
      const invalidRequest = { ...validChatRequest, message: longMessage };
      
      await expect(apiClient.sendChatMessage(invalidRequest))
        .rejects.toThrow('ChatRequest: message must be less than 2000 characters');
    });

    it('should handle network timeout', async () => {
      mockFetch.mockImplementationOnce(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );

      await expect(apiClient.sendChatMessage(validChatRequest))
        .rejects.toThrow('Failed to send chat message');
    });
  });

  describe('retry logic', () => {
    const testRequest: EditImageRequest = {
      imageData: 'data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
      prompt: 'Make it modern'
    };

    it('should respect maxRetries configuration', async () => {
      const clientWithRetries = new APIClient({
        ...config,
        retryConfig: { maxRetries: 2, baseDelay: 10 },
        debug: false // Disable debug logging for cleaner test output
      });

      // Mock all attempts to fail with network error
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'));

      await expect(clientWithRetries.editImage(testRequest))
        .rejects.toThrow('Failed to edit image');

      expect(mockFetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should not retry on non-retryable errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: new Map(),
        json: async () => ({ error: 'Unauthorized' })
      });

      await expect(apiClient.editImage(testRequest))
        .rejects.toThrow();

      expect(mockFetch).toHaveBeenCalledTimes(1); // No retry for 401
    });
  });
});