// Script to update widget configuration with your API URL
// Run with: node update-widget-config.js YOUR_VERCEL_URL

const fs = require('fs');
const path = require('path');

const OLD_API_URL = 'https://api.dinooverlay.com';
let NEW_API_URL = process.argv[2];

if (!NEW_API_URL) {
  console.log('❌ Please provide your Vercel URL');
  console.log('Usage: node update-widget-config.js https://your-project.vercel.app');
  process.exit(1);
}

// Ensure the URL doesn't end with a slash and add /api/overlay
if (NEW_API_URL.endsWith('/')) {
  NEW_API_URL = NEW_API_URL.slice(0, -1);
}
NEW_API_URL = NEW_API_URL + '/api/overlay';

console.log('🔄 Updating widget configuration...');
console.log('From:', OLD_API_URL);
console.log('To:', NEW_API_URL);

// Files to update
const filesToUpdate = [
  'src/types/config.ts',
  'cdn/demo.html',
  'cdn/script-snippet.html',
  'cdn/integration-examples.md',
  'examples/basic-integration.html',
  'dist/dino-overlay.iife.js'
];

let updatedFiles = 0;

filesToUpdate.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      const originalContent = content;
      
      // Replace all occurrences
      content = content.replace(new RegExp(OLD_API_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), NEW_API_URL);
      
      if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        console.log('✅ Updated:', filePath);
        updatedFiles++;
      } else {
        console.log('⏭️  No changes needed:', filePath);
      }
    } catch (error) {
      console.log('❌ Error updating', filePath, ':', error.message);
    }
  } else {
    console.log('⚠️  File not found:', filePath);
  }
});

console.log(`\n🎉 Updated ${updatedFiles} files with your API URL!`);
console.log('\n📝 Next steps:');
console.log('1. Rebuild the widget: npm run build:widget');
console.log('2. Test your API: node test-api.js');
console.log('3. Test the widget with cdn/demo.html');