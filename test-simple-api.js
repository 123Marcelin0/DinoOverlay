// Simple test to check if basic API is working
const API_BASE_URL = 'https://dino-overlay-hzdzk7o4h-marces-projects-3950c474.vercel.app';

async function testSimpleAPI() {
  console.log('🧪 Testing simple API endpoint...');
  
  try {
    // Test GET request
    console.log('\n📡 Testing GET /api/test');
    const getResponse = await fetch(`${API_BASE_URL}/api/test`);
    const getResult = await getResponse.text();
    
    console.log('GET Status:', getResponse.status);
    console.log('GET Response:', getResult.substring(0, 200));
    
    // Test POST request
    console.log('\n📡 Testing POST /api/test');
    const postResponse = await fetch(`${API_BASE_URL}/api/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ test: 'data' })
    });
    const postResult = await postResponse.text();
    
    console.log('POST Status:', postResponse.status);
    console.log('POST Response:', postResult.substring(0, 200));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testSimpleAPI();