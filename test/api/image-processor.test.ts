import { 
  processImage, 
  validateImageFormat, 
  getMaxFileSize, 
  getMaxDimensions, 
  getSupportedFormats 
} from '@/lib/image-processor';

// Mock fetch for URL testing
global.fetch = jest.fn();

describe('Image Processor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const validJpegBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A';
  const validPngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

  describe('processImage', () => {
    it('should successfully process valid JPEG image', async () => {
      const result = await processImage(validJpegBase64);
      
      expect(result.success).toBe(true);
      expect(result.processedImageData).toBe(validJpegBase64);
      expect(result.metadata).toBeDefined();
      expect(result.metadata!.format).toBe('image/jpeg');
      expect(result.error).toBeUndefined();
    });

    it('should successfully process valid PNG image', async () => {
      const result = await processImage(validPngBase64);
      
      expect(result.success).toBe(true);
      expect(result.processedImageData).toBe(validPngBase64);
      expect(result.metadata).toBeDefined();
      expect(result.metadata!.format).toBe('image/png');
    });

    it('should reject invalid base64 format', async () => {
      const result = await processImage('invalid-base64-data');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid image data format');
    });

    it('should reject non-image data URL', async () => {
      const result = await processImage('data:text/plain;base64,SGVsbG8gV29ybGQ=');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid image data format');
    });

    it('should reject unsupported image format', async () => {
      const gifData = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      const result = await processImage(gifData);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported image format');
    });

    it('should handle image URL fetching', async () => {
      const mockResponse = {
        ok: true,
        headers: {
          get: jest.fn().mockReturnValue('image/jpeg'),
        },
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(1000)),
      };
      
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
      
      const result = await processImage('', 'https://example.com/image.jpg');
      
      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith('https://example.com/image.jpg');
    });

    it('should handle failed URL fetch', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
      };
      
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
      
      const result = await processImage('', 'https://example.com/nonexistent.jpg');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to fetch image');
    });

    it('should handle network errors during URL fetch', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      const result = await processImage('', 'https://example.com/image.jpg');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to fetch image from URL');
    });

    it('should reject unsupported content type from URL', async () => {
      const mockResponse = {
        ok: true,
        headers: {
          get: jest.fn().mockReturnValue('text/html'),
        },
      };
      
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
      
      const result = await processImage('', 'https://example.com/page.html');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported content type');
    });
  });

  describe('Image validation', () => {
    it('should validate supported image formats', () => {
      expect(validateImageFormat('image/jpeg')).toBe(true);
      expect(validateImageFormat('image/png')).toBe(true);
      expect(validateImageFormat('image/webp')).toBe(true);
    });

    it('should reject unsupported image formats', () => {
      expect(validateImageFormat('image/gif')).toBe(false);
      expect(validateImageFormat('image/bmp')).toBe(false);
      expect(validateImageFormat('image/tiff')).toBe(false);
      expect(validateImageFormat('text/plain')).toBe(false);
    });

    it('should handle case sensitivity', () => {
      expect(validateImageFormat('IMAGE/JPEG')).toBe(false);
      expect(validateImageFormat('Image/Png')).toBe(false);
    });
  });

  describe('Configuration getters', () => {
    it('should return correct max file size', () => {
      const maxSize = getMaxFileSize();
      expect(maxSize).toBe(10 * 1024 * 1024); // 10MB
    });

    it('should return correct max dimensions', () => {
      const maxDimensions = getMaxDimensions();
      expect(maxDimensions.width).toBe(4096);
      expect(maxDimensions.height).toBe(4096);
    });

    it('should return supported formats array', () => {
      const formats = getSupportedFormats();
      expect(formats).toEqual(['image/jpeg', 'image/png', 'image/webp']);
      
      // Should return a copy, not the original array
      formats.push('image/gif');
      const formats2 = getSupportedFormats();
      expect(formats2).not.toContain('image/gif');
    });
  });

  describe('Base64 validation', () => {
    it('should validate proper data URL format', async () => {
      const result = await processImage(validJpegBase64);
      expect(result.success).toBe(true);
    });

    it('should reject malformed data URL', async () => {
      const malformedData = 'data:image/jpeg,not-base64-data';
      const result = await processImage(malformedData);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid image data format');
    });

    it('should reject data URL without base64 prefix', async () => {
      const invalidData = 'data:image/jpeg;charset=utf-8,some-data';
      const result = await processImage(invalidData);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid image data format');
    });

    it('should reject invalid base64 encoding', async () => {
      const invalidBase64 = 'data:image/jpeg;base64,invalid-base64-!@#$%';
      const result = await processImage(invalidBase64);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid image data format');
    });
  });

  describe('Metadata extraction', () => {
    it('should extract basic metadata from valid image', async () => {
      const result = await processImage(validJpegBase64);
      
      expect(result.success).toBe(true);
      expect(result.metadata).toBeDefined();
      expect(result.metadata!.format).toBe('image/jpeg');
      expect(result.metadata!.width).toBeGreaterThan(0);
      expect(result.metadata!.height).toBeGreaterThan(0);
      expect(result.metadata!.size).toBeGreaterThan(0);
    });

    it('should handle different image formats in metadata', async () => {
      const pngResult = await processImage(validPngBase64);
      expect(pngResult.metadata!.format).toBe('image/png');
      
      const jpegResult = await processImage(validJpegBase64);
      expect(jpegResult.metadata!.format).toBe('image/jpeg');
    });
  });

  describe('Error handling', () => {
    it('should handle processing errors gracefully', async () => {
      // Mock console.error to avoid noise in tests
      const originalConsoleError = console.error;
      console.error = jest.fn();
      
      try {
        // Pass undefined to trigger an error
        const result = await processImage(undefined as any);
        expect(result.success).toBe(false);
        expect(result.error).toBe('Image processing failed');
      } finally {
        console.error = originalConsoleError;
      }
    });

    it('should handle metadata extraction errors', async () => {
      const originalConsoleError = console.error;
      console.error = jest.fn();
      
      try {
        // Create a data URL that will pass initial validation but fail metadata extraction
        const problematicData = 'data:image/jpeg;base64,dGVzdA=='; // "test" in base64
        const result = await processImage(problematicData);
        
        expect(result.success).toBe(false);
        expect(result.error).toContain('Unable to process image metadata');
      } finally {
        console.error = originalConsoleError;
      }
    });
  });

  describe('Size and dimension limits', () => {
    it('should create large base64 string to test size limits', async () => {
      // Create a base64 string that would exceed the 10MB limit
      const largeBase64Data = 'A'.repeat(15 * 1024 * 1024); // 15MB of 'A' characters
      const largeDataUrl = `data:image/jpeg;base64,${largeBase64Data}`;
      
      const result = await processImage(largeDataUrl);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Image too large');
    });

    it('should handle dimension validation', async () => {
      // This is a simplified test since we don't have actual image parsing
      // In a real implementation, you would test with actual large images
      const result = await processImage(validJpegBase64);
      
      // Should pass for small test image
      expect(result.success).toBe(true);
    });
  });

  describe('Optimization', () => {
    it('should return optimized image data', async () => {
      const result = await processImage(validJpegBase64);
      
      expect(result.success).toBe(true);
      expect(result.processedImageData).toBeDefined();
      // In this mock implementation, it returns the original data
      expect(result.processedImageData).toBe(validJpegBase64);
    });
  });
});