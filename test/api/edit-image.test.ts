import { NextRequest } from 'next/server';
import { POST } from '@/app/api/overlay/edit-image/route';

// Mock the dependencies
jest.mock('@/lib/rate-limit');
jest.mock('@/lib/auth');
jest.mock('@/lib/image-processor');
jest.mock('@/lib/ai-service');

import { rateLimit } from '@/lib/rate-limit';
import { validateApiKey } from '@/lib/auth';
import { processImage } from '@/lib/image-processor';
import { aiImageEdit } from '@/lib/ai-service';

const mockRateLimit = rateLimit as jest.MockedFunction<typeof rateLimit>;
const mockValidateApiKey = validateApiKey as jest.MockedFunction<typeof validateApiKey>;
const mockProcessImage = processImage as jest.MockedFunction<typeof processImage>;
const mockAiImageEdit = aiImageEdit as jest.MockedFunction<typeof aiImageEdit>;

describe('/api/overlay/edit-image', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default successful mocks
    mockRateLimit.mockResolvedValue({ success: true });
    mockValidateApiKey.mockResolvedValue({ valid: true, userId: 'test-user' });
    mockProcessImage.mockResolvedValue({
      success: true,
      processedImageData: 'data:image/jpeg;base64,processed-image-data',
      metadata: {
        width: 800,
        height: 600,
        format: 'image/jpeg',
        size: 50000,
      },
    });
    mockAiImageEdit.mockResolvedValue({
      success: true,
      editedImageUrl: 'https://example.com/edited-image.jpg',
      editedImageData: 'data:image/jpeg;base64,edited-image-data',
    });
  });

  const createRequest = (body: any, headers: Record<string, string> = {}) => {
    return new NextRequest('http://localhost:3000/api/overlay/edit-image', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': 'test-key',
        ...headers,
      },
      body: JSON.stringify(body),
    });
  };

  describe('Successful requests', () => {
    it('should successfully process image edit request', async () => {
      const requestBody = {
        imageData: 'data:image/jpeg;base64,test-image-data',
        prompt: 'Add modern furniture to this living room',
        context: {
          propertyId: 'prop-123',
          roomType: 'living-room',
        },
      };

      const request = createRequest(requestBody);
      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.editedImageUrl).toBe('https://example.com/edited-image.jpg');
      expect(result.editedImageData).toBe('data:image/jpeg;base64,edited-image-data');
      expect(typeof result.processingTime).toBe('number');
    });

    it('should handle request without optional context', async () => {
      const requestBody = {
        imageData: 'data:image/jpeg;base64,test-image-data',
        prompt: 'Brighten the room',
      };

      const request = createRequest(requestBody);
      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
    });
  });

  describe('Rate limiting', () => {
    it('should return 429 when rate limit exceeded', async () => {
      mockRateLimit.mockResolvedValue({
        success: false,
        retryAfter: 60,
      });

      const requestBody = {
        imageData: 'data:image/jpeg;base64,test-image-data',
        prompt: 'Add furniture',
      };

      const request = createRequest(requestBody);
      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(429);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Rate limit exceeded');
      expect(result.retryAfter).toBe(60);
    });
  });

  describe('Authentication', () => {
    it('should return 401 when API key is missing', async () => {
      const requestBody = {
        imageData: 'data:image/jpeg;base64,test-image-data',
        prompt: 'Add furniture',
      };

      const request = createRequest(requestBody, { 'x-api-key': '' });
      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(401);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid API key');
    });

    it('should return 401 when API key is invalid', async () => {
      mockValidateApiKey.mockResolvedValue({
        valid: false,
        error: 'Invalid API key',
      });

      const requestBody = {
        imageData: 'data:image/jpeg;base64,test-image-data',
        prompt: 'Add furniture',
      };

      const request = createRequest(requestBody);
      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(401);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid API key');
    });
  });

  describe('Request validation', () => {
    it('should return 400 when imageData is missing', async () => {
      const requestBody = {
        prompt: 'Add furniture',
      };

      const request = createRequest(requestBody);
      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid request data');
      expect(result.details).toBeDefined();
    });

    it('should return 400 when prompt is missing', async () => {
      const requestBody = {
        imageData: 'data:image/jpeg;base64,test-image-data',
      };

      const request = createRequest(requestBody);
      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid request data');
    });

    it('should return 400 when prompt is too long', async () => {
      const requestBody = {
        imageData: 'data:image/jpeg;base64,test-image-data',
        prompt: 'a'.repeat(501), // Exceeds 500 character limit
      };

      const request = createRequest(requestBody);
      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid request data');
    });

    it('should return 400 when imageUrl is invalid', async () => {
      const requestBody = {
        imageData: 'data:image/jpeg;base64,test-image-data',
        prompt: 'Add furniture',
        imageUrl: 'not-a-valid-url',
      };

      const request = createRequest(requestBody);
      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid request data');
    });
  });

  describe('Image processing errors', () => {
    it('should return 400 when image processing fails', async () => {
      mockProcessImage.mockResolvedValue({
        success: false,
        error: 'Invalid image format',
      });

      const requestBody = {
        imageData: 'data:image/jpeg;base64,invalid-image-data',
        prompt: 'Add furniture',
      };

      const request = createRequest(requestBody);
      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid image format');
    });
  });

  describe('AI service errors', () => {
    it('should return 500 when AI service fails', async () => {
      mockAiImageEdit.mockResolvedValue({
        success: false,
        error: 'AI service temporarily unavailable',
      });

      const requestBody = {
        imageData: 'data:image/jpeg;base64,test-image-data',
        prompt: 'Add furniture',
      };

      const request = createRequest(requestBody);
      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.success).toBe(false);
      expect(result.error).toBe('AI service temporarily unavailable');
    });

    it('should return 500 when AI service throws exception', async () => {
      mockAiImageEdit.mockRejectedValue(new Error('Network error'));

      const requestBody = {
        imageData: 'data:image/jpeg;base64,test-image-data',
        prompt: 'Add furniture',
      };

      const request = createRequest(requestBody);
      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Internal server error');
    });
  });

  describe('Malformed requests', () => {
    it('should handle invalid JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/overlay/edit-image', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': 'test-key',
        },
        body: 'invalid-json',
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Internal server error');
    });
  });
});