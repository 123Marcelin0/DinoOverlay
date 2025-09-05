// DEBUG VERSION - DinoOverlay for Framer
// This version shows detailed console logs to help debug

console.log('🔍 DinoOverlay Debug Script Loading...');

window.DinoOverlayConfig = {
  apiKey: 'dino_8d85697fca7bad3db26fb5ab9d5e76091606d0c64fb58c7433815a91561e958b',
  apiEndpoint: 'https://dino-overlay-hzdzk7o4h-marces-projects-3950c474.vercel.app/api/overlay',
  theme: 'auto',
  enableAnalytics: false,
  debug: true
};

console.log('✅ DinoOverlay Config Set:', window.DinoOverlayConfig);

// AGGRESSIVE AUTO-DETECTION FOR DEBUGGING
function debugImageDetection() {
  console.log('🔍 Starting image detection...');
  
  const allImages = document.querySelectorAll('img');
  console.log(`📊 Found ${allImages.length} total images on page`);
  
  let detectedCount = 0;
  
  allImages.forEach((img, index) => {
    console.log(`\n🖼️ Image ${index + 1}:`);
    console.log('  - Source:', img.src);
    console.log('  - Alt:', img.alt);
    console.log('  - Size:', `${img.naturalWidth}x${img.naturalHeight}`);
    console.log('  - Classes:', img.className);
    console.log('  - Complete:', img.complete);
    
    // For debugging, make ALL images editable
    if (img.src && img.complete && img.naturalWidth > 50 && img.naturalHeight > 50) {
      img.classList.add('editable-room');
      img.style.cursor = 'pointer';
      img.style.border = '2px dashed #00ff00'; // Green border for debugging
      img.title = 'DEBUG: Click to test DinoOverlay';
      
      // Add click handler for debugging
      img.addEventListener('click', function(e) {
        console.log('🖱️ Image clicked!', this.src);
        alert('Image clicked! DinoOverlay should activate here.');
        e.preventDefault();
      });
      
      detectedCount++;
      console.log('  ✅ MADE EDITABLE');
    } else {
      console.log('  ❌ SKIPPED (too small or not loaded)');
    }
  });
  
  console.log(`\n🎯 Total images made editable: ${detectedCount}`);
  
  // Also check if DinoOverlay widget loaded
  setTimeout(() => {
    if (window.DinoOverlayLoader) {
      console.log('✅ DinoOverlay widget loaded successfully');
    } else {
      console.log('❌ DinoOverlay widget NOT loaded');
    }
  }, 2000);
}

// Run detection multiple times to catch dynamic content
function runDetection() {
  console.log('🚀 Running detection...');
  debugImageDetection();
}

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runDetection);
} else {
  runDetection();
}

// Run again after a delay
setTimeout(runDetection, 1000);
setTimeout(runDetection, 3000);
setTimeout(runDetection, 5000);

// Watch for new images
const observer = new MutationObserver(() => {
  console.log('🔄 DOM changed, re-running detection...');
  setTimeout(runDetection, 500);
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

console.log('🎉 Debug script initialized');

// Load DinoOverlay widget
console.log('📦 Loading DinoOverlay widget...');
const script = document.createElement('script');
script.src = 'https://dino-overlay-hzdzk7o4h-marces-projects-3950c474.vercel.app/cdn/dino-overlay-loader.min-0.1.0.js';
script.async = true;
script.onload = () => console.log('✅ DinoOverlay widget script loaded');
script.onerror = () => console.log('❌ DinoOverlay widget script failed to load');
document.head.appendChild(script);