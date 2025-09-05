// Test script for your DinoOverlay API
// Run with: node test-api.js

const API_BASE_URL = 'https://dino-overlay-hzdzk7o4h-marces-projects-3950c474.vercel.app/api/overlay';
const TEST_API_KEY = 'dino_8d85697fca7bad3db26fb5ab9d5e76091606d0c64fb58c7433815a91561e958b';

// Simple test image (1x1 pixel)
const TEST_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

async function testEditImageAPI() {
  console.log('🧪 Testing /edit-image endpoint...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/edit-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': TEST_API_KEY,
      },
      body: JSON.stringify({
        imageData: TEST_IMAGE,
        prompt: 'add a modern sofa to this room',
        context: {
          roomType: 'living-room',
          propertyId: 'test-property-123'
        }
      })
    });

    const result = await response.json();
    
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Edit Image API working!');
    } else {
      console.log('❌ Edit Image API failed');
    }
  } catch (error) {
    console.error('❌ Error testing edit-image:', error.message);
  }
}

async function testChatAPI() {
  console.log('\n🧪 Testing /chat endpoint...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': TEST_API_KEY,
      },
      body: JSON.stringify({
        message: 'How can I make this room look more modern?',
        imageContext: TEST_IMAGE
      })
    });

    const result = await response.json();
    
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Chat API working!');
    } else {
      console.log('❌ Chat API failed');
    }
  } catch (error) {
    console.error('❌ Error testing chat:', error.message);
  }
}

async function runTests() {
  console.log('🚀 Testing DinoOverlay API...\n');
  console.log('API Base URL:', API_BASE_URL);
  console.log('Test API Key:', TEST_API_KEY);
  console.log('='.repeat(50));
  
  await testEditImageAPI();
  await testChatAPI();
  
  console.log('\n' + '='.repeat(50));
  console.log('✨ Tests completed!');
}

// API URL is configured

runTests();