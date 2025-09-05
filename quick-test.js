// Quick test to see what's happening with your API
console.log('⏳ Waiting 10 seconds for deployment...');

setTimeout(async () => {
  const { spawn } = require('child_process');
  const testProcess = spawn('node', ['test-simple-api.js'], { stdio: 'inherit' });
}, 10000);