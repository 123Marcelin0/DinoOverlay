// Script to create API keys for testing
// Run with: node scripts/create-api-key.js

const crypto = require('crypto');

// You'll need to install these packages: npm install @supabase/supabase-js
// For now, this is a simple script to generate what you need

function generateApiKey() {
  return 'dino_' + crypto.randomBytes(32).toString('hex');
}

function hashApiKey(apiKey) {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

async function createApiKey(userId, name) {
  const apiKey = generateApiKey();
  const keyHash = hashApiKey(apiKey);
  
  console.log('Generated API Key:', apiKey);
  console.log('Key Hash (store this in DB):', keyHash);
  console.log('User ID:', userId);
  console.log('Name:', name);
  
  // SQL to run in your Supabase dashboard:
  console.log('\n📝 Run this SQL in your Supabase SQL Editor:');
  console.log(`
INSERT INTO api_keys (key_hash, user_id, name, is_active, rate_limit_per_hour, rate_limit_per_day)
VALUES (
  '${keyHash}',
  '${userId}',
  '${name}',
  true,
  1000,
  10000
);
  `);
  
  return { apiKey, keyHash };
}

// Create a test API key
createApiKey('test-user-123', 'Test API Key');