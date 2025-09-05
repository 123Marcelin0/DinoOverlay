// Debug script to see what your API is returning
const API_BASE_URL = 'https://dino-overlay-hzdzk7o4h-marces-projects-3950c474.vercel.app/api/overlay';

async function debugAPI() {
  console.log('🔍 Debugging API response...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/edit-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'test-key',
      },
      body: JSON.stringify({
        imageData: 'test',
        prompt: 'test'
      })
    });

    console.log('Status:', response.status);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    
    const text = await response.text();
    console.log('Response body (first 500 chars):');
    console.log(text.substring(0, 500));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugAPI();