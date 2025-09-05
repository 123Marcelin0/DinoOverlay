import { NextRequest } from 'next/server';
import { rateLimit, cleanupRateLimitStore } from '@/lib/rate-limit';

describe('Rate Limiting', () => {
  beforeEach(() => {
    // Clear any existing rate limit data
    cleanupRateLimitStore();
  });

  const createRequest = (ip: string = '127.0.0.1', apiKey?: string) => {
    const headers: Record<string, string> = {
      'x-forwarded-for': ip,
    };
    
    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }

    return new NextRequest('http://localhost:3000/test', {
      method: 'POST',
      headers,
    });
  };

  describe('Basic rate limiting', () => {
    it('should allow requests within limit', async () => {
      const request = createRequest();
      
      const result1 = await rateLimit(request);
      expect(result1.success).toBe(true);
      
      const result2 = await rateLimit(request);
      expect(result2.success).toBe(true);
    });

    it('should block requests exceeding default limit', async () => {
      const request = createRequest();
      
      // Make requests up to the limit (50 for default)
      for (let i = 0; i < 50; i++) {
        const result = await rateLimit(request);
        expect(result.success).toBe(true);
      }
      
      // Next request should be blocked
      const blockedResult = await rateLimit(request);
      expect(blockedResult.success).toBe(false);
      expect(blockedResult.retryAfter).toBeGreaterThan(0);
    });

    it('should use different limits for different endpoints', async () => {
      const request = createRequest();
      
      // edit-image endpoint has limit of 10
      for (let i = 0; i < 10; i++) {
        const result = await rateLimit(request, 'edit-image');
        expect(result.success).toBe(true);
      }
      
      // Next request should be blocked
      const blockedResult = await rateLimit(request, 'edit-image');
      expect(blockedResult.success).toBe(false);
      expect(blockedResult.retryAfter).toBeGreaterThan(0);
    });

    it('should use different limits for chat endpoint', async () => {
      const request = createRequest();
      
      // chat endpoint has limit of 30
      for (let i = 0; i < 30; i++) {
        const result = await rateLimit(request, 'chat');
        expect(result.success).toBe(true);
      }
      
      // Next request should be blocked
      const blockedResult = await rateLimit(request, 'chat');
      expect(blockedResult.success).toBe(false);
    });
  });

  describe('Client identification', () => {
    it('should rate limit by IP address', async () => {
      const request1 = createRequest('192.168.1.1');
      const request2 = createRequest('192.168.1.2');
      
      // Exhaust limit for first IP
      for (let i = 0; i < 50; i++) {
        await rateLimit(request1);
      }
      
      const blockedResult = await rateLimit(request1);
      expect(blockedResult.success).toBe(false);
      
      // Second IP should still work
      const allowedResult = await rateLimit(request2);
      expect(allowedResult.success).toBe(true);
    });

    it('should rate limit by API key when provided', async () => {
      const request1 = createRequest('127.0.0.1', 'api-key-1');
      const request2 = createRequest('127.0.0.1', 'api-key-2');
      
      // Exhaust limit for first API key
      for (let i = 0; i < 50; i++) {
        await rateLimit(request1);
      }
      
      const blockedResult = await rateLimit(request1);
      expect(blockedResult.success).toBe(false);
      
      // Second API key should still work
      const allowedResult = await rateLimit(request2);
      expect(allowedResult.success).toBe(true);
    });

    it('should prefer API key over IP for identification', async () => {
      const requestWithApiKey = createRequest('127.0.0.1', 'test-api-key');
      const requestWithoutApiKey = createRequest('127.0.0.1');
      
      // Exhaust limit using API key
      for (let i = 0; i < 50; i++) {
        await rateLimit(requestWithApiKey);
      }
      
      const blockedResult = await rateLimit(requestWithApiKey);
      expect(blockedResult.success).toBe(false);
      
      // Same IP without API key should still work (different identifier)
      const allowedResult = await rateLimit(requestWithoutApiKey);
      expect(allowedResult.success).toBe(true);
    });
  });

  describe('Time window behavior', () => {
    it('should reset counter after time window expires', async () => {
      const request = createRequest();
      
      // Mock Date.now to control time
      const originalNow = Date.now;
      let currentTime = 1000000;
      Date.now = jest.fn(() => currentTime);
      
      try {
        // Exhaust the limit
        for (let i = 0; i < 10; i++) {
          await rateLimit(request, 'edit-image');
        }
        
        // Should be blocked
        const blockedResult = await rateLimit(request, 'edit-image');
        expect(blockedResult.success).toBe(false);
        
        // Advance time past the window (60 seconds)
        currentTime += 61000;
        
        // Should work again
        const allowedResult = await rateLimit(request, 'edit-image');
        expect(allowedResult.success).toBe(true);
        
      } finally {
        Date.now = originalNow;
      }
    });
  });

  describe('Error handling', () => {
    it('should allow requests when rate limiting fails', async () => {
      const request = createRequest();
      
      // Mock an error in the rate limiting logic
      const originalConsoleError = console.error;
      console.error = jest.fn();
      
      // Create a request with invalid headers to trigger an error
      const invalidRequest = {
        headers: {
          get: jest.fn(() => {
            throw new Error('Header access failed');
          }),
        },
      } as unknown as NextRequest;
      
      try {
        const result = await rateLimit(invalidRequest);
        expect(result.success).toBe(true); // Should allow on error
        expect(console.error).toHaveBeenCalled();
      } finally {
        console.error = originalConsoleError;
      }
    });
  });

  describe('Cleanup functionality', () => {
    it('should clean up expired entries', async () => {
      const request = createRequest();
      
      // Mock Date.now to control time
      const originalNow = Date.now;
      let currentTime = 1000000;
      Date.now = jest.fn(() => currentTime);
      
      try {
        // Make a request to create an entry
        await rateLimit(request);
        
        // Advance time past expiration
        currentTime += 120000; // 2 minutes
        
        // Cleanup should remove expired entries
        cleanupRateLimitStore();
        
        // Should be able to make full quota of requests again
        for (let i = 0; i < 50; i++) {
          const result = await rateLimit(request);
          expect(result.success).toBe(true);
        }
        
      } finally {
        Date.now = originalNow;
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle missing IP headers gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/test', {
        method: 'POST',
        headers: {}, // No IP headers
      });
      
      const result = await rateLimit(request);
      expect(result.success).toBe(true);
    });

    it('should handle multiple forwarded IPs', async () => {
      const request = new NextRequest('http://localhost:3000/test', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1, 172.16.0.1',
        },
      });
      
      const result = await rateLimit(request);
      expect(result.success).toBe(true);
    });

    it('should handle concurrent requests correctly', async () => {
      const request = createRequest();
      
      // Make multiple concurrent requests
      const promises = Array(10).fill(null).map(() => rateLimit(request));
      const results = await Promise.all(promises);
      
      // All should succeed since we're within the limit
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });
});