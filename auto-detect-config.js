// Enhanced DinoOverlay Configuration with Auto-Detection
window.DinoOverlayConfig = {
  apiKey: 'dino_8d85697fca7bad3db26fb5ab9d5e76091606d0c64fb58c7433815a91561e958b',
  apiEndpoint: 'https://dino-overlay-hzdzk7o4h-marces-projects-3950c474.vercel.app/api/overlay',
  theme: 'auto',
  enableAnalytics: false,
  debug: true,
  
  // AUTO-DETECTION SETTINGS
  autoDetect: {
    enabled: true,
    
    // Method 1: Container-based detection
    containers: [
      '.property-gallery',
      '.real-estate-images', 
      '.listing-photos',
      '.property-photos',
      '.gallery-container',
      '#property-images'
    ],
    
    // Method 2: Image attribute detection
    imageSelectors: [
      'img[alt*="room" i]',           // Images with "room" in alt text
      'img[alt*="kitchen" i]',        // Images with "kitchen" in alt text  
      'img[alt*="bedroom" i]',        // Images with "bedroom" in alt text
      'img[alt*="living" i]',         // Images with "living" in alt text
      'img[alt*="bathroom" i]',       // Images with "bathroom" in alt text
      'img[alt*="property" i]',       // Images with "property" in alt text
      'img[src*="room"]',             // Images with "room" in filename
      'img[src*="property"]',         // Images with "property" in filename
      'img[data-room-type]',          // Images with room type data attribute
      'img[class*="room"]',           // Images with "room" in class name
      'img[class*="property"]'        // Images with "property" in class name
    ],
    
    // Method 3: Size-based detection (large images are likely property photos)
    minWidth: 200,                    // Minimum width in pixels
    minHeight: 150,                   // Minimum height in pixels
    
    // Method 4: Exclude certain images
    excludeSelectors: [
      'img[alt*="logo" i]',
      'img[alt*="icon" i]',
      'img[src*="logo"]',
      'img[src*="icon"]',
      '.logo img',
      '.header img',
      '.footer img',
      '.navigation img'
    ]
  }
};