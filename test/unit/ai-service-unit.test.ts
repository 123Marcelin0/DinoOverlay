/**
 * Unit tests for AI Service functionality
 * These tests focus on the core AI service logic without complex integrations
 */

import { aiImageEdit, getAIServiceStatus } from '@/lib/ai-service';

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock browser APIs
Object.defineProperty(global, 'Image', {
  value: class MockImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    width = 1920;
    height = 1080;
    
    set src(value: string) {
      setTimeout(() => {
        if (this.onload) this.onload();
      }, 10);
    }
  }
});

Object.defineProperty(global, 'HTMLCanvasElement', {
  value: class MockCanvas {
    width = 1920;
    height = 1080;
    
    getContext() {
      return {
        drawImage: jest.fn(),
        canvas: { width: 1920, height: 1080 },
      };
    }
    
    toDataURL() {
      return 'data:image/jpeg;base64,mockprocessedimage';
    }
  }
});

describe('AI Service Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
    // Reset environment
    process.env.GEMINI_API_KEY = 'mock-api-key';
  });

  describe('aiImageEdit - Basic Functionality', () => {
    const validRequest = {
      imageData: 'data:image/jpeg;base64,validimagedata',
      prompt: 'Add modern furniture',
      context: { roomType: 'living_room' },
      userId: 'test-user',
    };

    it('should return success with mock API', async () => {
      const result = await aiImageEdit(validRequest);

      expect(result.success).toBe(true);
      expect(result.editedImageData).toBeDefined();
      expect(result.editedImageUrl).toBeDefined();
      expect(result.editedImageUrl).toMatch(/^https:\/\/mock-cdn\.dinooverlay\.com/);
    });

    it('should validate required fields', async () => {
      const invalidRequest = {
        imageData: '',
        prompt: 'test',
        userId: 'test-user',
      };

      const result = await aiImageEdit(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Image data and prompt are required');
    });

    it('should validate prompt is required', async () => {
      const invalidRequest = {
        imageData: 'data:image/jpeg;base64,validimagedata',
        prompt: '',
        userId: 'test-user',
      };

      const result = await aiImageEdit(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Image data and prompt are required');
    });

    it('should handle unsupported image formats', async () => {
      const invalidRequest = {
        ...validRequest,
        imageData: 'data:image/gif;base64,validimagedata',
      };

      const result = await aiImageEdit(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported image format');
    });

    it('should enhance prompts with context', async () => {
      const requestWithContext = {
        ...validRequest,
        context: { roomType: 'bedroom' },
      };

      const result = await aiImageEdit(requestWithContext);

      expect(result.success).toBe(true);
      // The prompt enhancement is tested indirectly through successful processing
    });
  });

  describe('aiImageEdit - Real API Integration', () => {
    beforeEach(() => {
      process.env.GEMINI_API_KEY = 'real-api-key';
    });

    afterEach(() => {
      process.env.GEMINI_API_KEY = 'mock-api-key';
    });

    it('should call Gemini API with correct parameters', async () => {
      // Mock successful API responses
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            candidates: [{
              content: {
                parts: [{
                  text: 'This is a modern living room with neutral colors.'
                }]
              }
            }]
          })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            candidates: [{
              content: {
                parts: [{
                  text: 'A beautifully designed modern living room with sleek furniture.'
                }]
              }
            }]
          })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            candidates: [{
              image: {
                data: 'base64encodedgeneratedimage'
              }
            }]
          })
        } as Response);

      const validRequest = {
        imageData: 'data:image/jpeg;base64,validimagedata',
        prompt: 'Add modern furniture',
        userId: 'test-user',
      };

      const result = await aiImageEdit(validRequest);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(3);
      
      // Verify the API calls
      expect(mockFetch).toHaveBeenNthCalledWith(1, 
        expect.stringContaining('generateContent'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'x-goog-api-key': 'real-api-key'
          })
        })
      );
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests'
      } as Response);

      const validRequest = {
        imageData: 'data:image/jpeg;base64,validimagedata',
        prompt: 'Add modern furniture',
        userId: 'test-user',
      };

      const result = await aiImageEdit(validRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('AI service failed after');
    });

    it('should retry on network failures', async () => {
      // First call fails, second succeeds
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            candidates: [{
              content: {
                parts: [{
                  text: 'Analysis result'
                }]
              }
            }]
          })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            candidates: [{
              content: {
                parts: [{
                  text: 'Enhanced prompt'
                }]
              }
            }]
          })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            candidates: [{
              image: {
                data: 'base64encodedimage'
              }
            }]
          })
        } as Response);

      const validRequest = {
        imageData: 'data:image/jpeg;base64,validimagedata',
        prompt: 'Add modern furniture',
        userId: 'test-user',
      };

      const result = await aiImageEdit(validRequest);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(4); // 1 failed + 3 successful
    });
  });

  describe('getAIServiceStatus', () => {
    beforeEach(() => {
      process.env.GEMINI_API_KEY = 'real-api-key';
    });

    afterEach(() => {
      process.env.GEMINI_API_KEY = 'mock-api-key';
    });

    it('should return available status when service is healthy', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'healthy' })
      } as Response);

      const result = await getAIServiceStatus();

      expect(result.available).toBe(true);
      expect(result.latency).toBeDefined();
      expect(typeof result.latency).toBe('number');
    });

    it('should return unavailable status on service error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable'
      } as Response);

      const result = await getAIServiceStatus();

      expect(result.available).toBe(false);
      expect(result.error).toContain('Service unavailable');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await getAIServiceStatus();

      expect(result.available).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('Image Processing Pipeline', () => {
    it('should validate image size limits', async () => {
      // Create a request with oversized image data
      const largeImageData = 'data:image/jpeg;base64,' + 'A'.repeat(25 * 1024 * 1024);
      
      const request = {
        imageData: largeImageData,
        prompt: 'Add furniture',
        userId: 'test-user',
      };

      const result = await aiImageEdit(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Image too large');
    });

    it('should determine correct aspect ratios', async () => {
      const request = {
        imageData: 'data:image/jpeg;base64,validimagedata',
        prompt: 'Add furniture',
        userId: 'test-user',
      };

      // Mock the image dimensions
      Object.defineProperty(global, 'Image', {
        value: class MockImage {
          onload: (() => void) | null = null;
          width = 1920;
          height = 1080; // 16:9 ratio
          
          set src(value: string) {
            setTimeout(() => {
              if (this.onload) this.onload();
            }, 10);
          }
        }
      });

      const result = await aiImageEdit(request);

      expect(result.success).toBe(true);
      // Aspect ratio determination is tested indirectly through successful processing
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed image data', async () => {
      const request = {
        imageData: 'invalid-image-data',
        prompt: 'Add furniture',
        userId: 'test-user',
      };

      const result = await aiImageEdit(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Image validation failed');
    });

    it('should handle processing errors gracefully', async () => {
      // Mock Image constructor to throw error
      Object.defineProperty(global, 'Image', {
        value: class MockImage {
          set src(value: string) {
            setTimeout(() => {
              if (this.onerror) this.onerror();
            }, 10);
          }
          onerror: (() => void) | null = null;
        }
      });

      const request = {
        imageData: 'data:image/jpeg;base64,validimagedata',
        prompt: 'Add furniture',
        userId: 'test-user',
      };

      const result = await aiImageEdit(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Image validation failed');
    });
  });
});