// Test the public API endpoints
const API_BASE_URL = 'https://dino-overlay-hzdzk7o4h-marces-projects-3950c474.vercel.app/api/public';

// Simple test image (1x1 pixel)
const TEST_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

async function testPublicAPI() {
  console.log('🧪 Testing Public DinoOverlay API...');
  console.log('API Base URL:', API_BASE_URL);
  console.log('='.repeat(50));
  
  try {
    // Test edit-image endpoint
    console.log('📡 Testing POST /api/public/edit-image');
    const editResponse = await fetch(`${API_BASE_URL}/edit-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageData: TEST_IMAGE,
        prompt: 'add a modern sofa to this room'
      })
    });

    console.log('Edit Image Status:', editResponse.status);
    const editResult = await editResponse.json();
    console.log('Edit Image Response:', JSON.stringify(editResult, null, 2));
    
    if (editResponse.ok) {
      console.log('✅ Edit Image API working!');
    } else {
      console.log('❌ Edit Image API failed');
    }
    
  } catch (error) {
    console.error('❌ Error testing edit-image:', error.message);
  }
  
  try {
    // Test chat endpoint
    console.log('\n📡 Testing POST /api/public/chat');
    const chatResponse = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'How can I make this room look more modern?'
      })
    });

    console.log('Chat Status:', chatResponse.status);
    const chatResult = await chatResponse.json();
    console.log('Chat Response:', JSON.stringify(chatResult, null, 2));
    
    if (chatResponse.ok) {
      console.log('✅ Chat API working!');
    } else {
      console.log('❌ Chat API failed');
    }
    
  } catch (error) {
    console.error('❌ Error testing chat:', error.message);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('🎉 Public API tests completed!');
}

// Wait a bit for deployment then test
console.log('⏳ Waiting 15 seconds for deployment...');
setTimeout(testPublicAPI, 15000);