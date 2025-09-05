// Script to wait a bit and then test the API
console.log('⏳ Waiting 30 seconds for Vercel deployment to complete...');

setTimeout(async () => {
  console.log('🧪 Testing API after deployment...');
  
  const { spawn } = require('child_process');
  const testProcess = spawn('node', ['test-api.js'], { stdio: 'inherit' });
  
  testProcess.on('close', (code) => {
    if (code === 0) {
      console.log('\n🎉 API test completed!');
    } else {
      console.log('\n❌ API test failed. Check the output above.');
    }
  });
}, 30000); // Wait 30 seconds