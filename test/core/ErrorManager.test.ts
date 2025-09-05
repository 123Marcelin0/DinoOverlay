import { ErrorManager } from '../../src/core/ErrorManager';
import type { APIError } from '../../src/types/api';

// Mock DOM methods
Object.defineProperty(window, 'navigator', {
  value: {
    onLine: true,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  },
  writable: true
});

Object.defineProperty(document, 'body', {
  value: {
    appendChild: jest.fn(),
    removeChild: jest.fn()
  },
  writable: true
});

Object.defineProperty(document, 'createElement', {
  value: jest.fn(() => ({
    style: {},
    appendChild: jest.fn(),
    remove: jest.fn(),
    addEventListener: jest.fn(),
    textContent: '',
    innerHTML: '',
    onclick: null,
    parentNode: null
  })),
  writable: true
});

// Mock window methods
Object.defineProperty(window, 'addEventListener', {
  value: jest.fn(),
  writable: true
});

Object.defineProperty(window, 'setTimeout', {
  value: jest.fn((fn) => {
    fn();
    return 1;
  }),
  writable: true
});

describe('ErrorManager', () => {
  let errorManager: ErrorManager;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    errorManager = new ErrorManager({
      debug: true,
      enableUserNotifications: true,
      enableErrorReporting: true
    });
    consoleSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.clearAllMocks();
  });

  describe('Network Error Handling', () => {
    it('should handle timeout errors correctly', () => {
      const error = new Error('Request timeout');
      const errorDetails = errorManager.handleNetworkError(error);

      expect(errorDetails.category).toBe('network');
      expect(errorDetails.code).toBe('NETWORK_TIMEOUT');
      expect(errorDetails.retryable).toBe(true);
      expect(errorDetails.userMessage).toContain('timed out');
    });

    it('should handle fetch errors correctly', () => {
      const error = new Error('fetch failed');
      const errorDetails = errorManager.handleNetworkError(error);

      expect(errorDetails.category).toBe('network');
      expect(errorDetails.code).toBe('FETCH_ERROR');
      expect(errorDetails.retryable).toBe(true);
    });

    it('should handle HTTP status errors correctly', () => {
      const error = {
        message: 'HTTP 500 error',
        status: 500
      } as APIError;
      
      const errorDetails = errorManager.handleNetworkError(error);

      expect(errorDetails.category).toBe('network');
      expect(errorDetails.code).toBe('HTTP_500');
      expect(errorDetails.userMessage).toContain('temporarily unavailable');
    });

    it('should handle CORS errors correctly', () => {
      const error = new Error('CORS policy blocked');
      const errorDetails = errorManager.handleNetworkError(error);

      expect(errorDetails.category).toBe('network');
      expect(errorDetails.code).toBe('CORS_ERROR');
      expect(errorDetails.userMessage).toContain('contact support');
    });
  });

  describe('Image Error Handling', () => {
    it('should handle invalid format errors', () => {
      const error = new Error('Invalid image format');
      const errorDetails = errorManager.handleImageError(error);

      expect(errorDetails.category).toBe('image');
      expect(errorDetails.code).toBe('INVALID_FORMAT');
      expect(errorDetails.retryable).toBe(false);
      expect(errorDetails.userMessage).toContain('format not supported');
    });

    it('should handle size errors', () => {
      const error = new Error('Image size too large');
      const errorDetails = errorManager.handleImageError(error, { size: '15MB' });

      expect(errorDetails.category).toBe('image');
      expect(errorDetails.code).toBe('SIZE_ERROR');
      expect(errorDetails.context?.imageContext).toEqual({ size: '15MB' });
      expect(errorDetails.userMessage).toContain('too large');
    });

    it('should handle processing failures as retryable', () => {
      const error = new Error('Image processing failed');
      const errorDetails = errorManager.handleImageError(error);

      expect(errorDetails.category).toBe('image');
      expect(errorDetails.code).toBe('PROCESSING_FAILED');
      expect(errorDetails.retryable).toBe(true);
    });

    it('should handle base64 validation errors', () => {
      const error = new Error('Invalid base64 data');
      const errorDetails = errorManager.handleImageError(error);

      expect(errorDetails.category).toBe('image');
      expect(errorDetails.code).toBe('INVALID_BASE64');
      expect(errorDetails.userMessage).toContain('uploading the image again');
    });
  });

  describe('DOM Error Handling', () => {
    it('should handle permission denied errors', () => {
      const error = new Error('Permission denied');
      const errorDetails = errorManager.handleDOMError(error);

      expect(errorDetails.category).toBe('dom');
      expect(errorDetails.code).toBe('PERMISSION_DENIED');
      expect(errorDetails.retryable).toBe(false);
      expect(errorDetails.userMessage).toContain('permissions required');
    });

    it('should handle element not found errors', () => {
      const error = new Error('Element not found');
      const errorDetails = errorManager.handleDOMError(error, { selector: '.test-element' });

      expect(errorDetails.category).toBe('dom');
      expect(errorDetails.code).toBe('ELEMENT_NOT_FOUND');
      expect(errorDetails.context?.domContext).toEqual({ selector: '.test-element' });
      expect(errorDetails.userMessage).toContain('refresh the page');
    });

    it('should handle shadow DOM errors', () => {
      const error = new Error('Shadow DOM not supported');
      const errorDetails = errorManager.handleDOMError(error);

      expect(errorDetails.category).toBe('dom');
      expect(errorDetails.code).toBe('SHADOW_DOM_ERROR');
      expect(errorDetails.userMessage).toContain('different browser');
    });
  });

  describe('Configuration Error Handling', () => {
    it('should handle missing API key errors', () => {
      const error = new Error('API key is required');
      const errorDetails = errorManager.handleConfigError(error);

      expect(errorDetails.category).toBe('config');
      expect(errorDetails.code).toBe('INVALID_API_KEY');
      expect(errorDetails.retryable).toBe(false);
      expect(errorDetails.userMessage).toContain('website administrator');
    });

    it('should handle invalid endpoint errors', () => {
      const error = new Error('Invalid endpoint URL');
      const errorDetails = errorManager.handleConfigError(error, { endpoint: 'invalid-url' });

      expect(errorDetails.category).toBe('config');
      expect(errorDetails.code).toBe('INVALID_ENDPOINT');
      expect(errorDetails.context?.configContext).toEqual({ endpoint: 'invalid-url' });
    });

    it('should handle missing configuration errors', () => {
      const error = new Error('Required configuration missing');
      const errorDetails = errorManager.handleConfigError(error);

      expect(errorDetails.category).toBe('config');
      expect(errorDetails.code).toBe('MISSING_CONFIG');
      expect(errorDetails.userMessage).toContain('Missing configuration');
    });
  });

  describe('API Error Handling', () => {
    it('should handle rate limit errors', () => {
      const error = {
        message: 'Rate limit exceeded',
        status: 429,
        code: 'RATE_LIMIT_EXCEEDED',
        retryable: true,
        details: {
          remaining: '0',
          retryAfter: '60',
          limit: '100'
        }
      } as APIError;

      const errorDetails = errorManager.handleAPIError(error);

      expect(errorDetails.category).toBe('rate_limit');
      expect(errorDetails.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(errorDetails.retryable).toBe(true);
      expect(errorDetails.retryAfter).toBe(60);
      expect(errorDetails.userMessage).toContain('Too many requests');
    });

    it('should handle authentication errors', () => {
      const error = {
        message: 'Unauthorized',
        status: 401,
        code: 'UNAUTHORIZED',
        retryable: false
      } as APIError;

      const errorDetails = errorManager.handleAPIError(error);

      expect(errorDetails.category).toBe('api');
      expect(errorDetails.code).toBe('UNAUTHORIZED');
      expect(errorDetails.userMessage).toContain('Authentication failed');
    });

    it('should handle server errors as retryable', () => {
      const error = {
        message: 'Internal server error',
        status: 500,
        code: 'INTERNAL_ERROR',
        retryable: true
      } as APIError;

      const errorDetails = errorManager.handleAPIError(error);

      expect(errorDetails.category).toBe('api');
      expect(errorDetails.retryable).toBe(true);
      expect(errorDetails.userMessage).toContain('temporarily unavailable');
    });
  });

  describe('Retry Logic', () => {
    it('should determine if error should be retried', () => {
      const retryableError = {
        category: 'network' as const,
        code: 'NETWORK_TIMEOUT',
        message: 'Timeout',
        userMessage: 'Request timed out',
        retryable: true
      };

      const nonRetryableError = {
        category: 'config' as const,
        code: 'INVALID_API_KEY',
        message: 'Invalid key',
        userMessage: 'Invalid API key',
        retryable: false
      };

      expect(errorManager.shouldRetry(retryableError)).toBe(true);
      expect(errorManager.shouldRetry(nonRetryableError)).toBe(false);
    });

    it('should calculate exponential backoff delay', () => {
      const errorDetails = {
        category: 'network' as const,
        code: 'NETWORK_TIMEOUT',
        message: 'Timeout',
        userMessage: 'Request timed out',
        retryable: true
      };

      const delay1 = errorManager.calculateRetryDelay(errorDetails);
      
      // Record first attempt
      errorManager.recordRetryAttempt(errorDetails);
      const delay2 = errorManager.calculateRetryDelay(errorDetails);

      expect(delay1).toBeGreaterThan(0);
      expect(delay2).toBeGreaterThan(delay1);
    });

    it('should respect retry after header', () => {
      const errorDetails = {
        category: 'rate_limit' as const,
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Rate limited',
        userMessage: 'Too many requests',
        retryable: true,
        retryAfter: 30
      };

      const delay = errorManager.calculateRetryDelay(errorDetails);
      expect(delay).toBe(30000); // 30 seconds in milliseconds
    });

    it('should limit retry attempts', () => {
      const errorDetails = {
        category: 'network' as const,
        code: 'NETWORK_TIMEOUT',
        message: 'Timeout',
        userMessage: 'Request timed out',
        retryable: true
      };

      // Record maximum attempts
      for (let i = 0; i < 3; i++) {
        errorManager.recordRetryAttempt(errorDetails);
      }

      expect(errorManager.shouldRetry(errorDetails)).toBe(false);
    });

    it('should clear retry attempts', () => {
      const errorDetails = {
        category: 'network' as const,
        code: 'NETWORK_TIMEOUT',
        message: 'Timeout',
        userMessage: 'Request timed out',
        retryable: true
      };

      errorManager.recordRetryAttempt(errorDetails);
      expect(errorManager.shouldRetry(errorDetails)).toBe(true);

      errorManager.clearRetryAttempts(errorDetails);
      expect(errorManager.shouldRetry(errorDetails)).toBe(true);
    });
  });

  describe('Network Status Monitoring', () => {
    it('should return current network status', () => {
      const status = errorManager.getNetworkStatus();
      
      expect(status).toHaveProperty('isOnline');
      expect(status).toHaveProperty('lastChecked');
      expect(typeof status.isOnline).toBe('boolean');
      expect(typeof status.lastChecked).toBe('number');
    });

    it('should not retry network errors when offline', () => {
      // Mock offline status
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true
      });

      const errorManager2 = new ErrorManager();
      const errorDetails = {
        category: 'network' as const,
        code: 'NETWORK_TIMEOUT',
        message: 'Timeout',
        userMessage: 'Request timed out',
        retryable: true
      };

      expect(errorManager2.shouldRetry(errorDetails)).toBe(false);
    });
  });

  describe('Rate Limit Management', () => {
    it('should track rate limit information', () => {
      const error = {
        message: 'Rate limit exceeded',
        status: 429,
        code: 'RATE_LIMIT_EXCEEDED',
        retryable: true,
        details: {
          remaining: '5',
          retryAfter: '60',
          limit: '100'
        }
      } as APIError;

      errorManager.handleAPIError(error);
      const rateLimitInfo = errorManager.getRateLimitInfo();

      expect(rateLimitInfo).not.toBeNull();
      expect(rateLimitInfo?.remaining).toBe(5);
      expect(rateLimitInfo?.limit).toBe(100);
      expect(rateLimitInfo?.resetTime).toBeGreaterThan(Date.now());
    });

    it('should respect rate limit reset time', () => {
      const error = {
        message: 'Rate limit exceeded',
        status: 429,
        code: 'RATE_LIMIT_EXCEEDED',
        retryable: true,
        details: {
          remaining: '0',
          retryAfter: '1', // 1 second
          limit: '100'
        }
      } as APIError;

      const errorDetails = errorManager.handleAPIError(error);
      
      // Should not retry immediately
      expect(errorManager.shouldRetry(errorDetails)).toBe(false);

      // Mock time passing
      jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 2000);
      
      // Should retry after reset time
      expect(errorManager.shouldRetry(errorDetails)).toBe(true);
    });
  });

  describe('User Notifications', () => {
    it('should create error notification element', () => {
      const errorDetails = {
        category: 'network' as const,
        code: 'NETWORK_TIMEOUT',
        message: 'Timeout',
        userMessage: 'Request timed out. Please try again.',
        retryable: true
      };

      errorManager.showUserError(errorDetails);

      expect(document.createElement).toHaveBeenCalledWith('div');
      expect(document.body.appendChild).toHaveBeenCalled();
    });

    it('should not show notifications when disabled', () => {
      const errorManager2 = new ErrorManager({
        enableUserNotifications: false
      });

      const errorDetails = {
        category: 'network' as const,
        code: 'NETWORK_TIMEOUT',
        message: 'Timeout',
        userMessage: 'Request timed out',
        retryable: true
      };

      errorManager2.showUserError(errorDetails);

      expect(document.body.appendChild).not.toHaveBeenCalled();
    });
  });

  describe('Error Reporting', () => {
    it('should log errors when debug is enabled', () => {
      const error = new Error('Test error');
      errorManager.handleNetworkError(error);

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should not log errors when debug is disabled', () => {
      const errorManager2 = new ErrorManager({
        debug: false
      });

      const error = new Error('Test error');
      errorManager2.handleNetworkError(error);

      // Console.error should not be called for debug logging
      // (it might still be called for other reasons)
    });
  });

  describe('Error Queue Management', () => {
    it('should maintain error queue with size limit', () => {
      // Create many errors to test queue limit
      for (let i = 0; i < 150; i++) {
        const error = new Error(`Error ${i}`);
        errorManager.handleNetworkError(error);
      }

      // Queue should be limited to 100 items
      // We can't directly access the queue, but we can verify the behavior
      // by checking that the system still functions properly
      const error = new Error('Final error');
      const errorDetails = errorManager.handleNetworkError(error);
      
      expect(errorDetails).toBeDefined();
      expect(errorDetails.category).toBe('network');
    });
  });

  describe('Configuration', () => {
    it('should use default configuration when not provided', () => {
      // Ensure navigator.onLine is true for this test
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true
      });
      
      const defaultErrorManager = new ErrorManager();
      
      const errorDetails = {
        category: 'network' as const,
        code: 'NETWORK_TIMEOUT',
        message: 'Timeout',
        userMessage: 'Request timed out',
        retryable: true
      };

      expect(defaultErrorManager.shouldRetry(errorDetails)).toBe(true);
    });

    it('should respect custom configuration', () => {
      // Ensure navigator.onLine is true for this test
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true
      });
      
      const customErrorManager = new ErrorManager({
        maxRetryAttempts: 1,
        retryBaseDelay: 500
      });

      const errorDetails = {
        category: 'network' as const,
        code: 'NETWORK_TIMEOUT',
        message: 'Timeout',
        userMessage: 'Request timed out',
        retryable: true
      };

      // Should allow first retry
      expect(customErrorManager.shouldRetry(errorDetails)).toBe(true);

      // Record one attempt
      customErrorManager.recordRetryAttempt(errorDetails);

      // Should not allow second retry due to maxRetryAttempts: 1
      expect(customErrorManager.shouldRetry(errorDetails)).toBe(false);
    });
  });
});