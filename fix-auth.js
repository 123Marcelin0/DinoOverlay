// Quick fix to test API without database
// This will temporarily use the in-memory API keys

const fs = require('fs');

// Read the current auth file
const authFile = 'lib/auth.ts';
let content = fs.readFileSync(authFile, 'utf8');

// Add our test API key to the initialization
const newInitFunction = `function initializeTestApiKeys(): void {
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

  // Add our generated test key
  apiKeyStore.set('dino_8d85697fca7bad3db26fb5ab9d5e76091606d0c64fb58c7433815a91561e958b', {
    userId: 'test-user-123',
    permissions: ['edit-image', 'chat'],
    quotaLimit: 1000,
    quotaUsed: 0,
    isActive: true,
  });
}`;

// Replace the function
content = content.replace(/function initializeTestApiKeys\(\): void \{[\s\S]*?\n\}/m, newInitFunction);

fs.writeFileSync(authFile, content);
console.log('✅ Added test API key to auth system');
console.log('🔄 Now redeploy to Vercel: vercel --prod');