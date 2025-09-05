import { ImageOptimizer } from '../../src/core/ImageOptimizer';

describe('ImageOptimizer', () => {
  let imageOptimizer: ImageOptimizer;

  beforeEach(() => {
    imageOptimizer = new ImageOptimizer();
  });

  describe('Image Format Detection', () => {
    it('should detect JPEG format', () => {
      const jpegDataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A';
      
      const format = imageOptimizer.detectFormat(jpegDataUrl);
      expect(format).toBe('jpeg');
    });

    it('should detect PNG format', () => {
      const pngDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGA4nEKtAAAAABJRU5ErkJggg==';
      
      const format = imageOptimizer.detectFormat(pngDataUrl);
      expect(format).toBe('png');
    });

    it('should detect WebP format', () => {
      const webpDataUrl = 'data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA';
      
      const format = imageOptimizer.detectFormat(webpDataUrl);
      expect(format).toBe('webp');
    });

    it('should return unknown for invalid format', () => {
      const invalidDataUrl = 'data:image/invalid;base64,invalid';
      
      const format = imageOptimizer.detectFormat(invalidDataUrl);
      expect(format).toBe('unknown');
    });
  });

  describe('Image Compression', () => {
    it('should compress JPEG image', async () => {
      const jpegDataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A';
      
      const compressed = await imageOptimizer.compressImage(jpegDataUrl, 0.8);
      expect(compressed).toBeDefined();
      expect(compressed.startsWith('data:image/jpeg')).toBe(true);
    });

    it('should handle compression errors gracefully', async () => {
      const invalidDataUrl = 'invalid-data-url';
      
      await expect(imageOptimizer.compressImage(invalidDataUrl, 0.8))
        .rejects.toThrow('Invalid image data URL');
    });

    it('should validate quality parameter', async () => {
      const jpegDataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A';
      
      await expect(imageOptimizer.compressImage(jpegDataUrl, 1.5))
        .rejects.toThrow('Quality must be between 0 and 1');
      
      await expect(imageOptimizer.compressImage(jpegDataUrl, -0.1))
        .rejects.toThrow('Quality must be between 0 and 1');
    });
  });

  describe('WebP Conversion', () => {
    it('should convert JPEG to WebP when supported', async () => {
      // Mock WebP support
      const mockCanvas = {
        toDataURL: jest.fn().mockReturnValue('data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA'),
        getContext: jest.fn().mockReturnValue({
          drawImage: jest.fn(),
        }),
        width: 1,
        height: 1,
      };
      
      jest.spyOn(document, 'createElement').mockReturnValue(mockCanvas as any);
      
      const jpegDataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A';
      
      const webpResult = await imageOptimizer.convertToWebP(jpegDataUrl);
      expect(webpResult.startsWith('data:image/webp')).toBe(true);
    });

    it('should return original image when WebP conversion fails', async () => {
      const mockCanvas = {
        toDataURL: jest.fn().mockReturnValue('data:,'),
        getContext: jest.fn().mockReturnValue({
          drawImage: jest.fn(),
        }),
        width: 1,
        height: 1,
      };
      
      jest.spyOn(document, 'createElement').mockReturnValue(mockCanvas as any);
      
      const jpegDataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A';
      
      const result = await imageOptimizer.convertToWebP(jpegDataUrl);
      expect(result).toBe(jpegDataUrl);
    });
  });

  describe('Image Resizing', () => {
    it('should resize image to specified dimensions', async () => {
      const mockCanvas = {
        toDataURL: jest.fn().mockReturnValue('data:image/jpeg;base64,resized'),
        getContext: jest.fn().mockReturnValue({
          drawImage: jest.fn(),
        }),
        width: 100,
        height: 100,
      };
      
      const mockImage = {
        onload: null as any,
        onerror: null as any,
        src: '',
        width: 200,
        height: 200,
      };
      
      jest.spyOn(document, 'createElement')
        .mockReturnValueOnce(mockCanvas as any)
        .mockReturnValueOnce(mockImage as any);
      
      const jpegDataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A';
      
      const resizePromise = imageOptimizer.resizeImage(jpegDataUrl, 100, 100);
      
      // Simulate image load
      setTimeout(() => {
        if (mockImage.onload) {
          mockImage.onload({} as any);
        }
      }, 0);
      
      const resized = await resizePromise;
      expect(resized).toBe('data:image/jpeg;base64,resized');
    });

    it('should handle image load errors', async () => {
      const mockImage = {
        onload: null as any,
        onerror: null as any,
        src: '',
      };
      
      jest.spyOn(document, 'createElement').mockReturnValue(mockImage as any);
      
      const jpegDataUrl = 'data:image/jpeg;base64,invalid';
      
      const resizePromise = imageOptimizer.resizeImage(jpegDataUrl, 100, 100);
      
      // Simulate image error
      setTimeout(() => {
        if (mockImage.onerror) {
          mockImage.onerror({} as any);
        }
      }, 0);
      
      await expect(resizePromise).rejects.toThrow('Failed to load image for resizing');
    });
  });

  describe('Image Size Calculation', () => {
    it('should calculate image size from data URL', () => {
      const dataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A';
      
      const size = imageOptimizer.calculateImageSize(dataUrl);
      expect(size).toBeGreaterThan(0);
    });

    it('should return 0 for invalid data URL', () => {
      const invalidDataUrl = 'invalid-data-url';
      
      const size = imageOptimizer.calculateImageSize(invalidDataUrl);
      expect(size).toBe(0);
    });
  });
});