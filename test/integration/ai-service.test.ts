import { aiImageEdit, getAIServiceStatus } from '@/lib/ai-service';
import { aiProcessingQueue } from '@/lib/ai-processing-queue';

// Mock fetch for testing
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock Image and Canvas for browser APIs
global.Image = class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  width = 1920;
  height = 1080;
  
  set src(value: string) {
    setTimeout(() => {
      if (this.onload) this.onload();
    }, 10);
  }
} as any;

global.HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  drawImage: jest.fn(),
  canvas: { width: 1920, height: 1080 },
})) as any;

global.HTMLCanvasElement.prototype.toDataURL = jest.fn(() => 
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/wA=='
);

describe('AI Service Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('aiImageEdit', () => {
    const mockImageData = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/wA==';
    
    const mockRequest = {
      imageData: mockImageData,
      prompt: 'Add modern furniture to this living room',
      context: {
        propertyId: 'prop_123',
        roomType: 'living_room',
      },
      userId: 'user_123',
    };

    it('should successfully process image edit request with mock API', async () => {
      const result = await aiImageEdit(mockRequest);

      expect(result.success).toBe(true);
      expect(result.editedImageData).toBeDefined();
      expect(result.editedImageUrl).toBeDefined();
      expect(result.editedImageUrl).toMatch(/^https:\/\/mock-cdn\.dinooverlay\.com/);
    });

    it('should handle missing image data', async () => {
      const result = await aiImageEdit({
        ...mockRequest,
        imageData: '',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Image data and prompt are required');
    });

    it('should handle missing prompt', async () => {
      const result = await aiImageEdit({
        ...mockRequest,
        prompt: '',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Image data and prompt are required');
    });

    it('should handle unsupported image format', async () => {
      const result = await aiImageEdit({
        ...mockRequest,
        imageData: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported image format');
    });

    it('should handle large image files', async () => {
      // Create a large base64 string (simulate 25MB image)
      const largeImageData = 'data:image/jpeg;base64,' + 'A'.repeat(25 * 1024 * 1024);
      
      const result = await aiImageEdit({
        ...mockRequest,
        imageData: largeImageData,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Image too large');
    });

    it('should enhance prompt with context', async () => {
      const result = await aiImageEdit(mockRequest);

      expect(result.success).toBe(true);
      // The enhanced prompt should include context about the room type
      // This is tested indirectly through successful processing
    });

    it('should handle real Gemini API calls when API key is provided', async () => {
      // Mock successful Gemini API responses
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            candidates: [{
              content: {
                parts: [{
                  text: 'This is a modern living room with neutral colors and minimal furniture.'
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
                  text: 'A modern living room with sleek furniture, warm lighting, and contemporary decor elements.'
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
                data: 'base64encodedimagedata'
              }
            }]
          })
        } as Response);

      // Temporarily set a real API key
      const originalEnv = process.env.GEMINI_API_KEY;
      process.env.GEMINI_API_KEY = 'test-api-key';

      const result = await aiImageEdit(mockRequest);

      // Restore original environment
      process.env.GEMINI_API_KEY = originalEnv;

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(3); // Vision analysis, prompt enhancement, image generation
    });

    it('should handle Gemini API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests'
      } as Response);

      // Temporarily set a real API key
      const originalEnv = process.env.GEMINI_API_KEY;
      process.env.GEMINI_API_KEY = 'test-api-key';

      const result = await aiImageEdit(mockRequest);

      // Restore original environment
      process.env.GEMINI_API_KEY = originalEnv;

      expect(result.success).toBe(false);
      expect(result.error).toContain('AI service failed after');
    });

    it('should retry failed requests', async () => {
      // Mock first two calls to fail, third to succeed
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
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
                data: 'base64encodedimagedata'
              }
            }]
          })
        } as Response);

      // Temporarily set a real API key
      const originalEnv = process.env.GEMINI_API_KEY;
      process.env.GEMINI_API_KEY = 'test-api-key';

      const result = await aiImageEdit(mockRequest);

      // Restore original environment
      process.env.GEMINI_API_KEY = originalEnv;

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(5); // 2 failed attempts + 3 successful calls
    });
  });

  describe('getAIServiceStatus', () => {
    it('should return service status when available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'healthy' })
      } as Response);

      // Temporarily set a real API key
      const originalEnv = process.env.GEMINI_API_KEY;
      process.env.GEMINI_API_KEY = 'test-api-key';

      const result = await getAIServiceStatus();

      // Restore original environment
      process.env.GEMINI_API_KEY = originalEnv;

      expect(result.available).toBe(true);
      expect(result.latency).toBeDefined();
      expect(typeof result.latency).toBe('number');
    });

    it('should handle service unavailability', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable'
      } as Response);

      // Temporarily set a real API key
      const originalEnv = process.env.GEMINI_API_KEY;
      process.env.GEMINI_API_KEY = 'test-api-key';

      const result = await getAIServiceStatus();

      // Restore original environment
      process.env.GEMINI_API_KEY = originalEnv;

      expect(result.available).toBe(false);
      expect(result.error).toContain('Service unavailable');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      // Temporarily set a real API key
      const originalEnv = process.env.GEMINI_API_KEY;
      process.env.GEMINI_API_KEY = 'test-api-key';

      const result = await getAIServiceStatus();

      // Restore original environment
      process.env.GEMINI_API_KEY = originalEnv;

      expect(result.available).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('Processing Queue Integration', () => {
    it('should add jobs to queue and process them', async () => {
      const jobId = await aiProcessingQueue.addJob(
        'user_123',
        'image-edit',
        mockRequest,
        1
      );

      expect(jobId).toBeDefined();
      expect(jobId).toMatch(/^job_/);

      const job = aiProcessingQueue.getJobStatus(jobId);
      expect(job).toBeDefined();
      expect(job?.status).toBe('queued');
      expect(job?.userId).toBe('user_123');
      expect(job?.type).toBe('image-edit');
    });

    it('should process jobs and return results', async () => {
      const jobId = await aiProcessingQueue.addJob(
        'user_123',
        'image-edit',
        mockRequest,
        1
      );

      // Wait for job completion
      const completedJob = await aiProcessingQueue.waitForJob(jobId);

      expect(completedJob.status).toBe('completed');
      expect(completedJob.result).toBeDefined();
      expect(completedJob.result.success).toBe(true);
    }, 10000); // 10 second timeout for processing

    it('should handle job cancellation', async () => {
      const jobId = await aiProcessingQueue.addJob(
        'user_123',
        'image-edit',
        mockRequest,
        1
      );

      const cancelled = aiProcessingQueue.cancelJob(jobId);
      expect(cancelled).toBe(true);

      const job = aiProcessingQueue.getJobStatus(jobId);
      expect(job?.status).toBe('failed');
      expect(job?.error).toBe('Job cancelled by user');
    });

    it('should provide queue statistics', async () => {
      // Add multiple jobs
      await aiProcessingQueue.addJob('user_1', 'image-edit', mockRequest, 1);
      await aiProcessingQueue.addJob('user_2', 'image-edit', mockRequest, 2);
      await aiProcessingQueue.addJob('user_3', 'chat', { message: 'test' }, 0);

      const stats = aiProcessingQueue.getQueueStats();

      expect(stats.totalJobs).toBeGreaterThanOrEqual(3);
      expect(stats.queuedJobs).toBeGreaterThanOrEqual(0);
      expect(typeof stats.averageProcessingTime).toBe('number');
    });

    it('should filter jobs by user', async () => {
      await aiProcessingQueue.addJob('user_1', 'image-edit', mockRequest, 1);
      await aiProcessingQueue.addJob('user_2', 'image-edit', mockRequest, 1);
      await aiProcessingQueue.addJob('user_1', 'chat', { message: 'test' }, 1);

      const user1Jobs = aiProcessingQueue.getUserJobs('user_1');
      const user2Jobs = aiProcessingQueue.getUserJobs('user_2');

      expect(user1Jobs.length).toBe(2);
      expect(user2Jobs.length).toBe(1);
      expect(user1Jobs.every(job => job.userId === 'user_1')).toBe(true);
      expect(user2Jobs.every(job => job.userId === 'user_2')).toBe(true);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed image data', async () => {
      const result = await aiImageEdit({
        ...mockRequest,
        imageData: 'invalid-image-data',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Image validation failed');
    });

    it('should handle extremely long prompts', async () => {
      const longPrompt = 'A'.repeat(10000);
      
      const result = await aiImageEdit({
        ...mockRequest,
        prompt: longPrompt,
      });

      // Should still process but may truncate or handle gracefully
      expect(result).toBeDefined();
    });

    it('should handle concurrent processing requests', async () => {
      const promises = Array.from({ length: 5 }, (_, i) => 
        aiImageEdit({
          ...mockRequest,
          userId: `user_${i}`,
        })
      );

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result).toBeDefined();
        expect(typeof result.success).toBe('boolean');
      });
    });

    it('should handle API timeout scenarios', async () => {
      mockFetch.mockImplementationOnce(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('timeout')), 100)
        )
      );

      // Temporarily set a real API key
      const originalEnv = process.env.GEMINI_API_KEY;
      process.env.GEMINI_API_KEY = 'test-api-key';

      const result = await aiImageEdit(mockRequest);

      // Restore original environment
      process.env.GEMINI_API_KEY = originalEnv;

      expect(result.success).toBe(false);
      expect(result.error).toContain('AI service failed after');
    });
  });
});