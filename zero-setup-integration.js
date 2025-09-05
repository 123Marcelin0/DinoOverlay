// DINOOVERLAY - ZERO SETUP INTEGRATION
// Just add this script to ANY website and it automatically detects real estate images

window.DinoOverlayConfig = {
  apiKey: 'dino_8d85697fca7bad3db26fb5ab9d5e76091606d0c64fb58c7433815a91561e958b',
  apiEndpoint: 'https://dino-overlay-hzdzk7o4h-marces-projects-3950c474.vercel.app/api/overlay',
  theme: 'auto',
  enableAnalytics: false,
  debug: true,
  
  // AUTOMATIC DETECTION - NO SETUP NEEDED
  autoDetect: {
    enabled: true,
    mode: 'smart-automatic'
  }
};

// SMART AUTOMATIC DETECTION
(function() {
  'use strict';
  
  const REAL_ESTATE_KEYWORDS = [
    'room', 'kitchen', 'bedroom', 'living', 'bathroom', 'property', 
    'house', 'home', 'apartment', 'condo', 'interior', 'dining',
    'office', 'studio', 'loft', 'villa', 'mansion', 'penthouse',
    'real estate', 'listing', 'for sale', 'for rent'
  ];
  
  const EXCLUDE_KEYWORDS = [
    'logo', 'icon', 'avatar', 'profile', 'banner', 'ad', 'advertisement',
    'button', 'nav', 'menu', 'header', 'footer', 'sidebar', 'widget',
    'thumbnail', 'preview', 'placeholder'
  ];
  
  function isRealEstateImage(img) {
    if (!img.src || !img.complete || img.naturalWidth === 0) return false;
    
    const alt = (img.alt || '').toLowerCase();
    const src = img.src.toLowerCase();
    const title = (img.title || '').toLowerCase();
    const className = (img.className || '').toLowerCase();
    
    let score = 0;
    
    // Size check (property photos are usually decent size)
    if (img.naturalWidth >= 200 && img.naturalHeight >= 150) {
      score += 2;
    }
    
    // Aspect ratio check (reasonable photo proportions)
    const aspectRatio = img.naturalWidth / img.naturalHeight;
    if (aspectRatio >= 0.5 && aspectRatio <= 3.0) {
      score += 1;
    }
    
    // Keyword matching
    const allText = `${alt} ${src} ${title} ${className}`;
    const realEstateMatches = REAL_ESTATE_KEYWORDS.filter(keyword => allText.includes(keyword));
    score += realEstateMatches.length * 2;
    
    // Exclude non-real estate images
    const excludeMatches = EXCLUDE_KEYWORDS.some(keyword => allText.includes(keyword));
    if (excludeMatches) return false;
    
    // Check if in header/footer/nav (likely not content)
    const nonContentParent = img.closest('header, footer, nav, .header, .footer, .nav, .menu, .sidebar');
    if (nonContentParent) return false;
    
    // Too small = likely icon
    if (img.naturalWidth < 100 || img.naturalHeight < 100) return false;
    
    // Bonus for being in content areas
    const contentParent = img.closest('main, article, .content, .gallery, .listing, .property');
    if (contentParent) score += 2;
    
    // File extension bonus
    if (/\.(jpg|jpeg|png|webp)/i.test(src)) score += 1;
    
    return score >= 3;
  }
  
  function detectAndMarkImages() {
    const images = document.querySelectorAll('img:not(.dino-processed)');
    let detectedCount = 0;
    
    images.forEach(img => {
      img.classList.add('dino-processed'); // Mark as processed
      
      if (isRealEstateImage(img)) {
        img.classList.add('editable-room');
        img.style.cursor = 'pointer';
        img.title = img.title || 'Click to edit with AI';
        detectedCount++;
        
        // Add subtle visual hint
        img.addEventListener('mouseenter', function() {
          this.style.filter = 'brightness(1.1)';
          this.style.transition = 'filter 0.3s ease';
        });
        
        img.addEventListener('mouseleave', function() {
          this.style.filter = 'brightness(1)';
        });
        
        console.log('🏠 Auto-detected:', img.src.substring(0, 50) + '...');
      }
    });
    
    if (detectedCount > 0) {
      console.log(`✅ DinoOverlay auto-detected ${detectedCount} real estate images`);
    }
    
    return detectedCount;
  }
  
  // Initialize detection
  function init() {
    // Initial detection
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => setTimeout(detectAndMarkImages, 500));
    } else {
      setTimeout(detectAndMarkImages, 500);
    }
    
    // Watch for new images (dynamic content)
    const observer = new MutationObserver(() => {
      setTimeout(detectAndMarkImages, 200);
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Re-scan after all images load
    window.addEventListener('load', () => setTimeout(detectAndMarkImages, 1000));
  }
  
  init();
})();

// Load DinoOverlay widget
(function() {
  const script = document.createElement('script');
  script.src = 'https://dino-overlay-hzdzk7o4h-marces-projects-3950c474.vercel.app/cdn/dino-overlay-loader.min-0.1.0.js';
  script.async = true;
  document.head.appendChild(script);
})();