interface AuthResult {
  valid: boolean;
  userId?: string;
  error?: string;
}

interface ApiKeyData {
  userId: string;
  permissions: string[];
  quotaLimit: number;
  quotaUsed: number;
  isActive: boolean;
  expiresAt?: Date;
}

// In-memory API key store (in production, use database)
const apiKeyStore = new Map<string, ApiKeyData>();

// Initialize with some test API keys
initializeTestApiKeys();

export async function validateApiKey(apiKey: string | null): Promise<AuthResult> {
  if (!apiKey) {
    return { valid: false, error: 'API key is required' };
  }

  try {
    const keyData = apiKeyStore.get(apiKey);
    
    if (!keyData) {
      return { valid: false, error: 'Invalid API key' };
    }

    if (!keyData.isActive) {
      return { valid: false, error: 'API key is inactive' };
    }

    if (keyData.expiresAt && keyData.expiresAt < new Date()) {
      return { valid: false, error: 'API key has expired' };
    }

    if (keyData.quotaUsed >= keyData.quotaLimit) {
      return { valid: false, error: 'API quota exceeded' };
    }

    return { 
      valid: true, 
      userId: keyData.userId 
    };

  } catch (error) {
    console.error('API key validation error:', error);
    return { valid: false, error: 'Authentication service error' };
  }
}

export async function incrementApiUsage(apiKey: string): Promise<void> {
  try {
    const keyData = apiKeyStore.get(apiKey);
    if (keyData) {
      keyData.quotaUsed++;
      apiKeyStore.set(apiKey, keyData);
    }
  } catch (error) {
    console.error('Error incrementing API usage:', error);
  }
}

export async function getApiKeyQuota(apiKey: string): Promise<{
  limit: number;
  used: number;
  remaining: number;
} | null> {
  try {
    const keyData = apiKeyStore.get(apiKey);
    if (!keyData) {
      return null;
    }

    return {
      limit: keyData.quotaLimit,
      used: keyData.quotaUsed,
      remaining: Math.max(0, keyData.quotaLimit - keyData.quotaUsed),
    };
  } catch (error) {
    console.error('Error getting API quota:', error);
    return null;
  }
}

function initializeTestApiKeys(): void {
  // Test API keys for development
  apiKeyStore.set('test-key-1', {
    userId: 'user-1',
    permissions: ['edit-image', 'chat'],
    quotaLimit: 1000,
    quotaUsed: 0,
    isActive: true,
  });

  apiKeyStore.set('test-key-2', {
    userId: 'user-2',
    permissions: ['edit-image', 'chat'],
    quotaLimit: 500,
    quotaUsed: 0,
    isActive: true,
  });

  apiKeyStore.set('demo-key', {
    userId: 'demo-user',
    permissions: ['edit-image', 'chat'],
    quotaLimit: 100,
    quotaUsed: 0,
    isActive: true,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  });
}

// API key management functions
export async function createApiKey(userId: string, options: {
  permissions?: string[];
  quotaLimit?: number;
  expiresAt?: Date;
} = {}): Promise<string> {
  const apiKey = generateApiKey();
  
  apiKeyStore.set(apiKey, {
    userId,
    permissions: options.permissions || ['edit-image', 'chat'],
    quotaLimit: options.quotaLimit || 1000,
    quotaUsed: 0,
    isActive: true,
    expiresAt: options.expiresAt,
  });

  return apiKey;
}

export async function revokeApiKey(apiKey: string): Promise<boolean> {
  const keyData = apiKeyStore.get(apiKey);
  if (keyData) {
    keyData.isActive = false;
    apiKeyStore.set(apiKey, keyData);
    return true;
  }
  return false;
}

function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'dino_';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}