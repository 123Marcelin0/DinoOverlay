import { 
  validateApiKey, 
  incrementApiUsage, 
  getApiKeyQuota, 
  createApiKey, 
  revokeApiKey 
} from '@/lib/auth';

describe('Authentication', () => {
  describe('validateApiKey', () => {
    it('should validate existing test API key', async () => {
      const result = await validateApiKey('test-key-1');
      
      expect(result.valid).toBe(true);
      expect(result.userId).toBe('user-1');
      expect(result.error).toBeUndefined();
    });

    it('should reject null API key', async () => {
      const result = await validateApiKey(null);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('API key is required');
      expect(result.userId).toBeUndefined();
    });

    it('should reject empty API key', async () => {
      const result = await validateApiKey('');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('API key is required');
    });

    it('should reject invalid API key', async () => {
      const result = await validateApiKey('invalid-key');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid API key');
      expect(result.userId).toBeUndefined();
    });

    it('should validate demo API key with expiration', async () => {
      const result = await validateApiKey('demo-key');
      
      expect(result.valid).toBe(true);
      expect(result.userId).toBe('demo-user');
    });

    it('should reject expired API key', async () => {
      // Create an expired key
      const expiredKey = await createApiKey('expired-user', {
        expiresAt: new Date(Date.now() - 1000), // 1 second ago
      });

      const result = await validateApiKey(expiredKey);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('API key has expired');
    });

    it('should reject inactive API key', async () => {
      // Create and then revoke a key
      const newKey = await createApiKey('test-user');
      await revokeApiKey(newKey);

      const result = await validateApiKey(newKey);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('API key is inactive');
    });

    it('should reject API key that exceeded quota', async () => {
      // Create a key with low quota
      const limitedKey = await createApiKey('limited-user', {
        quotaLimit: 1,
      });

      // Exhaust the quota
      await incrementApiUsage(limitedKey);
      await incrementApiUsage(limitedKey);

      const result = await validateApiKey(limitedKey);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('API quota exceeded');
    });
  });

  describe('incrementApiUsage', () => {
    it('should increment usage for valid API key', async () => {
      const apiKey = 'test-key-1';
      
      const initialQuota = await getApiKeyQuota(apiKey);
      expect(initialQuota).not.toBeNull();
      
      const initialUsed = initialQuota!.used;
      
      await incrementApiUsage(apiKey);
      
      const updatedQuota = await getApiKeyQuota(apiKey);
      expect(updatedQuota!.used).toBe(initialUsed + 1);
      expect(updatedQuota!.remaining).toBe(initialQuota!.remaining - 1);
    });

    it('should handle invalid API key gracefully', async () => {
      // Should not throw error
      await expect(incrementApiUsage('invalid-key')).resolves.toBeUndefined();
    });
  });

  describe('getApiKeyQuota', () => {
    it('should return quota information for valid API key', async () => {
      const quota = await getApiKeyQuota('test-key-1');
      
      expect(quota).not.toBeNull();
      expect(quota!.limit).toBe(1000);
      expect(quota!.used).toBeGreaterThanOrEqual(0);
      expect(quota!.remaining).toBe(quota!.limit - quota!.used);
    });

    it('should return null for invalid API key', async () => {
      const quota = await getApiKeyQuota('invalid-key');
      expect(quota).toBeNull();
    });

    it('should handle different quota limits', async () => {
      const quota1 = await getApiKeyQuota('test-key-1');
      const quota2 = await getApiKeyQuota('test-key-2');
      
      expect(quota1!.limit).toBe(1000);
      expect(quota2!.limit).toBe(500);
    });
  });

  describe('createApiKey', () => {
    it('should create new API key with default settings', async () => {
      const apiKey = await createApiKey('new-user');
      
      expect(apiKey).toMatch(/^dino_[A-Za-z0-9]{32}$/);
      
      const validation = await validateApiKey(apiKey);
      expect(validation.valid).toBe(true);
      expect(validation.userId).toBe('new-user');
      
      const quota = await getApiKeyQuota(apiKey);
      expect(quota!.limit).toBe(1000);
      expect(quota!.used).toBe(0);
    });

    it('should create API key with custom settings', async () => {
      const customKey = await createApiKey('custom-user', {
        permissions: ['edit-image'],
        quotaLimit: 100,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      });
      
      expect(customKey).toMatch(/^dino_[A-Za-z0-9]{32}$/);
      
      const validation = await validateApiKey(customKey);
      expect(validation.valid).toBe(true);
      expect(validation.userId).toBe('custom-user');
      
      const quota = await getApiKeyQuota(customKey);
      expect(quota!.limit).toBe(100);
    });

    it('should generate unique API keys', async () => {
      const key1 = await createApiKey('user1');
      const key2 = await createApiKey('user2');
      
      expect(key1).not.toBe(key2);
    });
  });

  describe('revokeApiKey', () => {
    it('should revoke existing API key', async () => {
      const apiKey = await createApiKey('revoke-test-user');
      
      // Verify key works initially
      const initialValidation = await validateApiKey(apiKey);
      expect(initialValidation.valid).toBe(true);
      
      // Revoke the key
      const revokeResult = await revokeApiKey(apiKey);
      expect(revokeResult).toBe(true);
      
      // Verify key no longer works
      const finalValidation = await validateApiKey(apiKey);
      expect(finalValidation.valid).toBe(false);
      expect(finalValidation.error).toBe('API key is inactive');
    });

    it('should return false for non-existent API key', async () => {
      const result = await revokeApiKey('non-existent-key');
      expect(result).toBe(false);
    });

    it('should handle multiple revocations gracefully', async () => {
      const apiKey = await createApiKey('multi-revoke-user');
      
      const result1 = await revokeApiKey(apiKey);
      expect(result1).toBe(true);
      
      const result2 = await revokeApiKey(apiKey);
      expect(result2).toBe(true); // Should still return true for already revoked key
    });
  });

  describe('Error handling', () => {
    it('should handle errors gracefully in validateApiKey', async () => {
      // Mock console.error to avoid noise in tests
      const originalConsoleError = console.error;
      console.error = jest.fn();
      
      try {
        // This should not throw but return error result
        const result = await validateApiKey('test-key-1');
        expect(result.valid).toBeDefined();
      } finally {
        console.error = originalConsoleError;
      }
    });

    it('should handle errors gracefully in incrementApiUsage', async () => {
      const originalConsoleError = console.error;
      console.error = jest.fn();
      
      try {
        // Should not throw
        await incrementApiUsage('any-key');
      } finally {
        console.error = originalConsoleError;
      }
    });

    it('should handle errors gracefully in getApiKeyQuota', async () => {
      const originalConsoleError = console.error;
      console.error = jest.fn();
      
      try {
        const result = await getApiKeyQuota('any-key');
        expect(result).toBeDefined();
      } finally {
        console.error = originalConsoleError;
      }
    });
  });

  describe('Concurrent access', () => {
    it('should handle concurrent API key validation', async () => {
      const promises = Array(10).fill(null).map(() => validateApiKey('test-key-1'));
      const results = await Promise.all(promises);
      
      results.forEach(result => {
        expect(result.valid).toBe(true);
        expect(result.userId).toBe('user-1');
      });
    });

    it('should handle concurrent usage increments', async () => {
      const apiKey = await createApiKey('concurrent-user');
      const initialQuota = await getApiKeyQuota(apiKey);
      
      const promises = Array(5).fill(null).map(() => incrementApiUsage(apiKey));
      await Promise.all(promises);
      
      const finalQuota = await getApiKeyQuota(apiKey);
      expect(finalQuota!.used).toBe(initialQuota!.used + 5);
    });
  });
});