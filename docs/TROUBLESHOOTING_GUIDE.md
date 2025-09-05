# DinoOverlay Troubleshooting Guide

## Overview

This comprehensive troubleshooting guide helps diagnose and resolve common issues with the DinoOverlay system across different deployment scenarios and platforms.

## Table of Contents

1. [Quick Diagnostics](#quick-diagnostics)
2. [Installation Issues](#installation-issues)
3. [Image Detection Problems](#image-detection-problems)
4. [UI Component Issues](#ui-component-issues)
5. [API Integration Problems](#api-integration-problems)
6. [Performance Issues](#performance-issues)
7. [Security and CORS Issues](#security-and-cors-issues)
8. [Framework-Specific Issues](#framework-specific-issues)
9. [Mobile and Responsive Issues](#mobile-and-responsive-issues)
10. [Advanced Debugging](#advanced-debugging)

## Quick Diagnostics

### System Health Check

Run this quick diagnostic script to identify common issues:

```javascript
// Paste this in browser console for quick diagnosis
(function() {
  const diagnostics = {
    scriptLoaded: !!window.DinoOverlay,
    containerExists: !!document.getElementById('dino-overlay-container'),
    shadowDOMSupported: !!document.createElement('div').attachShadow,
    editableImages: document.querySelectorAll('.editable-room').length,
    apiKeyConfigured: !!(window.DinoOverlay && window.DinoOverlay.config && window.DinoOverlay.config.apiKey),
    errors: []
  };
  
  // Check for common issues
  if (!diagnostics.scriptLoaded) {
    diagnostics.errors.push('DinoOverlay script not loaded');
  }
  if (!diagnostics.shadowDOMSupported) {
    diagnostics.errors.push('Browser does not support Shadow DOM');
  }
  if (diagnostics.editableImages === 0) {
    diagnostics.errors.push('No images with .editable-room class found');
  }
  if (!diagnostics.apiKeyConfigured) {
    diagnostics.errors.push('API key not configured');
  }
  
  console.log('DinoOverlay Diagnostics:', diagnostics);
  return diagnostics;
})();
```

### Browser Compatibility Check

```javascript
// Check browser compatibility
(function() {
  const compatibility = {
    shadowDOM: !!Element.prototype.attachShadow,
    customElements: !!window.customElements,
    fetch: !!window.fetch,
    promises: !!window.Promise,
    intersectionObserver: !!window.IntersectionObserver,
    mutationObserver: !!window.MutationObserver,
    webGL: !!window.WebGLRenderingContext
  };
  
  const unsupported = Object.entries(compatibility)
    .filter(([key, supported]) => !supported)
    .map(([key]) => key);
  
  if (unsupported.length > 0) {
    console.warn('Unsupported features:', unsupported);
  } else {
    console.log('Browser fully compatible');
  }
  
  return compatibility;
})();
```

## Installation Issues

### Script Not Loading

**Symptoms:**
- No overlay appears
- Console error: "DinoOverlay is not defined"
- Network errors in browser dev tools

**Diagnosis:**
```bash
# Check CDN availability
curl -I https://cdn.dinooverlay.com/v1/dino-overlay-0.1.0.js

# Test fallback CDN
curl -I https://backup-cdn.dinooverlay.com/v1/dino-overlay-0.1.0.js

# Check DNS resolution
nslookup cdn.dinooverlay.com
```

**Solutions:**

1. **CDN Issues:**
   ```html
   <!-- Add fallback script loading -->
   <script>
   (function() {
     var script = document.createElement('script');
     script.src = 'https://cdn.dinooverlay.com/v1/dino-overlay-loader.min-0.1.0.js';
     script.onerror = function() {
       // Fallback to backup CDN
       var fallback = document.createElement('script');
       fallback.src = 'https://backup-cdn.dinooverlay.com/v1/dino-overlay-loader.min-0.1.0.js';
       document.head.appendChild(fallback);
     };
     document.head.appendChild(script);
   })();
   </script>
   ```

2. **Firewall/Proxy Issues:**
   ```javascript
   // Test local loading
   DinoOverlayLoader.init({
     apiEndpoint: 'https://api.dinooverlay.com',
     apiKey: 'your-api-key',
     localMode: true // Use local resources if available
   });
   ```

3. **CSP Violations:**
   ```html
   <!-- Add to CSP header -->
   <meta http-equiv="Content-Security-Policy" 
         content="script-src 'self' https://cdn.dinooverlay.com https://backup-cdn.dinooverlay.com;">
   ```

### Initialization Failures

**Symptoms:**
- Script loads but overlay doesn't initialize
- Console error: "Failed to initialize DinoOverlay"

**Diagnosis:**
```javascript
// Check initialization status
console.log('DinoOverlay status:', {
  loaded: !!window.DinoOverlay,
  initialized: !!(window.DinoOverlay && window.DinoOverlay.initialized),
  config: window.DinoOverlay && window.DinoOverlay.config,
  errors: window.DinoOverlay && window.DinoOverlay.errors
});
```

**Solutions:**

1. **Missing API Key:**
   ```javascript
   DinoOverlayLoader.init({
     apiKey: 'your-actual-api-key', // Required
     apiEndpoint: 'https://api.dinooverlay.com'
   });
   ```

2. **Invalid Configuration:**
   ```javascript
   // Validate configuration
   const config = {
     apiKey: 'your-api-key',
     apiEndpoint: 'https://api.dinooverlay.com',
     theme: 'auto', // 'light', 'dark', or 'auto'
     enableAnalytics: true,
     debug: true // Enable for troubleshooting
   };
   
   DinoOverlayLoader.init(config);
   ```

3. **DOM Ready Issues:**
   ```javascript
   // Ensure DOM is ready
   if (document.readyState === 'loading') {
     document.addEventListener('DOMContentLoaded', function() {
       DinoOverlayLoader.init(config);
     });
   } else {
     DinoOverlayLoader.init(config);
   }
   ```

## Image Detection Problems

### Images Not Detected

**Symptoms:**
- No overlay borders appear on images
- Console message: "No editable images found"

**Diagnosis:**
```javascript
// Check for editable images
const editableImages = document.querySelectorAll('.editable-room');
console.log('Found editable images:', editableImages.length);

editableImages.forEach((img, index) => {
  console.log(`Image ${index}:`, {
    src: img.src,
    loaded: img.complete,
    visible: img.offsetWidth > 0 && img.offsetHeight > 0,
    inViewport: img.getBoundingClientRect().top < window.innerHeight
  });
});
```

**Solutions:**

1. **Missing CSS Class:**
   ```html
   <!-- Ensure images have the correct class -->
   <img src="room1.jpg" class="editable-room" alt="Living room">
   <img src="room2.jpg" class="property-image editable-room" alt="Bedroom">
   ```

2. **Images Not Loaded:**
   ```javascript
   // Wait for images to load
   function waitForImages() {
     const images = document.querySelectorAll('.editable-room');
     const promises = Array.from(images).map(img => {
       if (img.complete) return Promise.resolve();
       return new Promise(resolve => {
         img.onload = resolve;
         img.onerror = resolve;
       });
     });
     return Promise.all(promises);
   }
   
   waitForImages().then(() => {
     DinoOverlayLoader.init(config);
   });
   ```

3. **Dynamic Content:**
   ```javascript
   // Re-scan for images after dynamic content loads
   window.DinoOverlay.rescanImages();
   
   // Or set up automatic detection
   DinoOverlayLoader.init({
     ...config,
     autoDetect: true, // Automatically detect new images
     debounceMs: 500   // Debounce detection for performance
   });
   ```

### Overlay Positioning Issues

**Symptoms:**
- Overlay appears in wrong position
- Overlay doesn't follow image when scrolling

**Diagnosis:**
```javascript
// Check image positioning
function debugImagePositioning() {
  const images = document.querySelectorAll('.editable-room');
  images.forEach((img, index) => {
    const rect = img.getBoundingClientRect();
    const styles = window.getComputedStyle(img);
    
    console.log(`Image ${index} positioning:`, {
      rect: rect,
      position: styles.position,
      transform: styles.transform,
      zIndex: styles.zIndex,
      parent: img.parentElement.tagName
    });
  });
}

debugImagePositioning();
```

**Solutions:**

1. **CSS Conflicts:**
   ```css
   /* Ensure images have proper positioning context */
   .editable-room {
     position: relative !important;
   }
   
   /* Fix for absolute positioned images */
   .property-container {
     position: relative;
   }
   ```

2. **Transform Issues:**
   ```javascript
   // Handle CSS transforms
   DinoOverlayLoader.init({
     ...config,
     handleTransforms: true,
     updateOnScroll: true,
     updateOnResize: true
   });
   ```

3. **Viewport Issues:**
   ```javascript
   // Force position update
   window.addEventListener('scroll', () => {
     if (window.DinoOverlay) {
       window.DinoOverlay.updatePositions();
     }
   });
   ```

## UI Component Issues

### Sidebar Not Appearing

**Symptoms:**
- Click on image but sidebar doesn't show
- Sidebar appears but is positioned incorrectly

**Diagnosis:**
```javascript
// Check sidebar state
function debugSidebar() {
  const sidebar = document.querySelector('[data-testid="quick-action-sidebar"]');
  if (sidebar) {
    const styles = window.getComputedStyle(sidebar);
    console.log('Sidebar debug:', {
      display: styles.display,
      visibility: styles.visibility,
      opacity: styles.opacity,
      transform: styles.transform,
      zIndex: styles.zIndex,
      position: styles.position
    });
  } else {
    console.log('Sidebar element not found');
  }
}

debugSidebar();
```

**Solutions:**

1. **Z-Index Conflicts:**
   ```css
   /* Increase z-index if sidebar is hidden behind other elements */
   #dino-overlay-container {
     z-index: 999999 !important;
   }
   ```

2. **Viewport Issues:**
   ```javascript
   // Adjust sidebar positioning for small screens
   DinoOverlayLoader.init({
     ...config,
     responsive: {
       mobile: {
         sidebarPosition: 'bottom',
         sidebarWidth: '100%'
       }
     }
   });
   ```

3. **Animation Issues:**
   ```javascript
   // Disable animations if causing problems
   DinoOverlayLoader.init({
     ...config,
     animations: false,
     reducedMotion: true
   });
   ```

### Chat Interface Problems

**Symptoms:**
- Chat input not responding
- Messages not sending
- Chat bar not visible

**Diagnosis:**
```javascript
// Debug chat interface
function debugChat() {
  const chatBar = document.querySelector('[data-testid="floating-chat-bar"]');
  const chatInput = chatBar && chatBar.querySelector('input');
  
  console.log('Chat debug:', {
    chatBarExists: !!chatBar,
    inputExists: !!chatInput,
    inputValue: chatInput && chatInput.value,
    inputDisabled: chatInput && chatInput.disabled,
    apiConnected: !!(window.DinoOverlay && window.DinoOverlay.apiClient)
  });
}

debugChat();
```

**Solutions:**

1. **Input Focus Issues:**
   ```javascript
   // Fix input focus on mobile
   const chatInput = document.querySelector('[data-testid="floating-chat-bar"] input');
   if (chatInput) {
     chatInput.addEventListener('touchstart', function() {
       this.focus();
     });
   }
   ```

2. **API Connection Issues:**
   ```javascript
   // Test API connection
   DinoOverlayLoader.init({
     ...config,
     apiTimeout: 10000, // Increase timeout
     retryAttempts: 3,
     debug: true
   });
   ```

## API Integration Problems

### Authentication Failures

**Symptoms:**
- Console error: "401 Unauthorized"
- API calls failing with authentication errors

**Diagnosis:**
```bash
# Test API key directly
curl -X POST https://api.dinooverlay.com/overlay/test \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json"
```

**Solutions:**

1. **Invalid API Key:**
   ```javascript
   // Verify API key format
   const apiKey = 'your-api-key';
   if (!apiKey || apiKey.length < 32) {
     console.error('Invalid API key format');
   }
   
   DinoOverlayLoader.init({
     apiKey: apiKey,
     apiEndpoint: 'https://api.dinooverlay.com'
   });
   ```

2. **Key Rotation:**
   ```javascript
   // Handle API key rotation
   DinoOverlayLoader.init({
     ...config,
     onAuthError: function(error) {
       console.log('Authentication failed, check API key');
       // Implement key refresh logic
     }
   });
   ```

### Rate Limiting Issues

**Symptoms:**
- Console error: "429 Too Many Requests"
- API calls being rejected

**Diagnosis:**
```javascript
// Check rate limit status
function checkRateLimit() {
  fetch('https://api.dinooverlay.com/overlay/status', {
    headers: {
      'Authorization': 'Bearer your-api-key'
    }
  })
  .then(response => {
    console.log('Rate limit headers:', {
      remaining: response.headers.get('X-RateLimit-Remaining'),
      reset: response.headers.get('X-RateLimit-Reset'),
      limit: response.headers.get('X-RateLimit-Limit')
    });
  });
}

checkRateLimit();
```

**Solutions:**

1. **Implement Backoff:**
   ```javascript
   DinoOverlayLoader.init({
     ...config,
     rateLimitHandling: {
       enabled: true,
       backoffMultiplier: 2,
       maxRetries: 3,
       baseDelay: 1000
     }
   });
   ```

2. **Queue Requests:**
   ```javascript
   // Implement request queuing
   DinoOverlayLoader.init({
     ...config,
     requestQueue: {
       enabled: true,
       maxConcurrent: 2,
       timeout: 30000
     }
   });
   ```

### Network Connectivity Issues

**Symptoms:**
- Intermittent API failures
- Timeout errors
- Network unreachable errors

**Diagnosis:**
```javascript
// Test network connectivity
function testConnectivity() {
  const testUrls = [
    'https://api.dinooverlay.com/health',
    'https://cdn.dinooverlay.com/health'
  ];
  
  testUrls.forEach(url => {
    fetch(url, { method: 'HEAD' })
      .then(response => console.log(`${url}: ${response.status}`))
      .catch(error => console.error(`${url}: ${error.message}`));
  });
}

testConnectivity();
```

**Solutions:**

1. **Offline Handling:**
   ```javascript
   DinoOverlayLoader.init({
     ...config,
     offlineMode: {
       enabled: true,
       showMessage: true,
       retryInterval: 5000
     }
   });
   ```

2. **Connection Monitoring:**
   ```javascript
   // Monitor connection status
   window.addEventListener('online', function() {
     if (window.DinoOverlay) {
       window.DinoOverlay.reconnect();
     }
   });
   
   window.addEventListener('offline', function() {
     if (window.DinoOverlay) {
       window.DinoOverlay.enterOfflineMode();
     }
   });
   ```

## Performance Issues

### Slow Loading

**Symptoms:**
- Long delay before overlay appears
- Sluggish animations
- High memory usage

**Diagnosis:**
```javascript
// Performance monitoring
function monitorPerformance() {
  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      if (entry.name.includes('dino-overlay')) {
        console.log('Performance entry:', entry);
      }
    });
  });
  
  observer.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
  
  // Memory usage
  if (performance.memory) {
    console.log('Memory usage:', {
      used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + 'MB',
      total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + 'MB',
      limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024) + 'MB'
    });
  }
}

monitorPerformance();
```

**Solutions:**

1. **Lazy Loading:**
   ```javascript
   DinoOverlayLoader.init({
     ...config,
     lazyLoad: true,
     loadOnDemand: true,
     preloadImages: false
   });
   ```

2. **Performance Optimization:**
   ```javascript
   DinoOverlayLoader.init({
     ...config,
     performance: {
       debounceScroll: 100,
       throttleResize: 250,
       maxImages: 50,
       imageQuality: 0.8
     }
   });
   ```

3. **Memory Management:**
   ```javascript
   // Clean up resources
   window.addEventListener('beforeunload', function() {
     if (window.DinoOverlay) {
       window.DinoOverlay.cleanup();
     }
   });
   ```

### Bundle Size Issues

**Symptoms:**
- Slow initial load
- Large network requests
- Poor performance on slow connections

**Diagnosis:**
```bash
# Check bundle sizes
npm run analyze:bundle

# Test with network throttling
npm run test:performance -- --slow-network
```

**Solutions:**

1. **Code Splitting:**
   ```javascript
   // Load components on demand
   DinoOverlayLoader.init({
     ...config,
     codeSplitting: true,
     loadComponents: ['sidebar', 'chat'] // Only load needed components
   });
   ```

2. **Compression:**
   ```html
   <!-- Ensure compression is enabled -->
   <script src="https://cdn.dinooverlay.com/v1/dino-overlay-0.1.0.js" 
           type="application/javascript"
           crossorigin="anonymous"></script>
   ```

## Security and CORS Issues

### CORS Errors

**Symptoms:**
- Console error: "CORS policy blocked"
- API calls failing with CORS errors

**Diagnosis:**
```javascript
// Test CORS configuration
fetch('https://api.dinooverlay.com/overlay/test', {
  method: 'OPTIONS',
  headers: {
    'Origin': window.location.origin,
    'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'Content-Type, Authorization'
  }
})
.then(response => {
  console.log('CORS preflight response:', {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries())
  });
});
```

**Solutions:**

1. **Domain Whitelist:**
   ```javascript
   // Contact support to whitelist your domain
   DinoOverlayLoader.init({
     ...config,
     domain: 'your-domain.com', // Ensure this matches your actual domain
     apiEndpoint: 'https://api.dinooverlay.com'
   });
   ```

2. **Proxy Setup:**
   ```javascript
   // Use proxy for API calls if CORS is an issue
   DinoOverlayLoader.init({
     ...config,
     apiEndpoint: '/api/proxy', // Your proxy endpoint
     proxyHeaders: {
       'X-Target-URL': 'https://api.dinooverlay.com'
     }
   });
   ```

### CSP Violations

**Symptoms:**
- Console error: "Content Security Policy violation"
- Scripts or styles blocked

**Diagnosis:**
```javascript
// Check CSP headers
fetch(window.location.href, { method: 'HEAD' })
  .then(response => {
    const csp = response.headers.get('Content-Security-Policy');
    console.log('CSP header:', csp);
  });
```

**Solutions:**

1. **Update CSP:**
   ```html
   <meta http-equiv="Content-Security-Policy" 
         content="script-src 'self' 'unsafe-inline' https://cdn.dinooverlay.com https://backup-cdn.dinooverlay.com; 
                  connect-src 'self' https://api.dinooverlay.com; 
                  img-src 'self' data: https://api.dinooverlay.com;
                  style-src 'self' 'unsafe-inline';">
   ```

2. **Nonce Support:**
   ```html
   <script nonce="your-nonce" 
           src="https://cdn.dinooverlay.com/v1/dino-overlay-0.1.0.js"></script>
   ```

## Framework-Specific Issues

### WordPress Issues

**Common Problems:**
- Theme conflicts
- Plugin interference
- jQuery conflicts

**Solutions:**

1. **Theme Compatibility:**
   ```php
   // Add to theme's functions.php
   function add_dino_overlay() {
     if (is_single() && has_post_thumbnail()) {
       ?>
       <script>
       jQuery(document).ready(function($) {
         // Add editable-room class to property images
         $('.property-image, .listing-image').addClass('editable-room');
         
         // Initialize DinoOverlay
         DinoOverlayLoader.init({
           apiKey: '<?php echo get_option('dino_overlay_api_key'); ?>',
           apiEndpoint: 'https://api.dinooverlay.com'
         });
       });
       </script>
       <?php
     }
   }
   add_action('wp_footer', 'add_dino_overlay');
   ```

2. **Plugin Conflicts:**
   ```javascript
   // Avoid jQuery conflicts
   (function($) {
     $(document).ready(function() {
       // Use jQuery in no-conflict mode
       DinoOverlayLoader.init(config);
     });
   })(jQuery);
   ```

### React Issues

**Common Problems:**
- Virtual DOM conflicts
- State management issues
- Component lifecycle problems

**Solutions:**

1. **React Integration:**
   ```jsx
   import { useEffect, useRef } from 'react';
   
   function PropertyImage({ src, alt }) {
     const imgRef = useRef(null);
     
     useEffect(() => {
       if (imgRef.current) {
         imgRef.current.classList.add('editable-room');
         
         // Trigger re-scan if DinoOverlay is already loaded
         if (window.DinoOverlay) {
           window.DinoOverlay.rescanImages();
         }
       }
     }, []);
     
     return <img ref={imgRef} src={src} alt={alt} />;
   }
   ```

2. **State Management:**
   ```jsx
   // Avoid React state conflicts
   useEffect(() => {
     DinoOverlayLoader.init({
       ...config,
       reactMode: true, // Prevents React state interference
       manualImageDetection: true
     });
   }, []);
   ```

### Vue.js Issues

**Common Problems:**
- Reactivity conflicts
- Component mounting issues
- Directive conflicts

**Solutions:**

1. **Vue Integration:**
   ```vue
   <template>
     <img :src="imageSrc" 
          class="editable-room" 
          @load="onImageLoad" />
   </template>
   
   <script>
   export default {
     mounted() {
       this.$nextTick(() => {
         if (window.DinoOverlay) {
           window.DinoOverlay.rescanImages();
         }
       });
     },
     methods: {
       onImageLoad() {
         // Notify DinoOverlay of new image
         if (window.DinoOverlay) {
           window.DinoOverlay.addImage(this.$el);
         }
       }
     }
   };
   </script>
   ```

## Mobile and Responsive Issues

### Touch Interface Problems

**Symptoms:**
- Touch events not working
- Sidebar not opening on mobile
- Poor mobile performance

**Diagnosis:**
```javascript
// Test touch support
function testTouchSupport() {
  console.log('Touch support:', {
    touchEvents: 'ontouchstart' in window,
    pointerEvents: !!window.PointerEvent,
    maxTouchPoints: navigator.maxTouchPoints || 0,
    userAgent: navigator.userAgent
  });
}

testTouchSupport();
```

**Solutions:**

1. **Touch Event Handling:**
   ```javascript
   DinoOverlayLoader.init({
     ...config,
     touch: {
       enabled: true,
       tapTimeout: 300,
       longPressTimeout: 500,
       swipeThreshold: 50
     }
   });
   ```

2. **Mobile Optimization:**
   ```javascript
   DinoOverlayLoader.init({
     ...config,
     mobile: {
       enabled: true,
       sidebarPosition: 'bottom',
       chatPosition: 'fixed',
       touchFriendly: true,
       minTouchTarget: 44 // iOS minimum
     }
   });
   ```

### Viewport Issues

**Symptoms:**
- Layout broken on small screens
- Elements positioned incorrectly
- Zoom issues

**Solutions:**

1. **Viewport Configuration:**
   ```html
   <meta name="viewport" 
         content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
   ```

2. **Responsive Breakpoints:**
   ```javascript
   DinoOverlayLoader.init({
     ...config,
     responsive: {
       breakpoints: {
         mobile: 768,
         tablet: 1024,
         desktop: 1200
       },
       adaptiveLayout: true
     }
   });
   ```

## Advanced Debugging

### Debug Mode

Enable comprehensive debugging:

```javascript
DinoOverlayLoader.init({
  ...config,
  debug: true,
  logLevel: 'verbose', // 'error', 'warn', 'info', 'debug', 'verbose'
  debugPanel: true,    // Shows debug panel in UI
  performanceMonitoring: true
});
```

### Console Commands

Use these console commands for debugging:

```javascript
// Get system status
DinoOverlay.getStatus();

// Force re-scan for images
DinoOverlay.rescanImages();

// Get performance metrics
DinoOverlay.getMetrics();

// Test API connection
DinoOverlay.testAPI();

// Clear cache and restart
DinoOverlay.restart();

// Export debug information
DinoOverlay.exportDebugInfo();
```

### Network Debugging

Monitor network requests:

```javascript
// Log all DinoOverlay network requests
const originalFetch = window.fetch;
window.fetch = function(...args) {
  if (args[0].includes('dinooverlay')) {
    console.log('DinoOverlay request:', args);
  }
  return originalFetch.apply(this, args)
    .then(response => {
      if (args[0].includes('dinooverlay')) {
        console.log('DinoOverlay response:', response);
      }
      return response;
    });
};
```

### Error Reporting

Set up comprehensive error reporting:

```javascript
DinoOverlayLoader.init({
  ...config,
  errorReporting: {
    enabled: true,
    endpoint: 'https://your-error-tracking.com/api/errors',
    includeStackTrace: true,
    includeUserAgent: true,
    includeURL: true,
    customData: {
      userId: 'user-123',
      siteId: 'site-456'
    }
  }
});
```

## Getting Help

### Support Channels

1. **Documentation**: https://docs.dinooverlay.com
2. **GitHub Issues**: https://github.com/dinooverlay/widget/issues
3. **Email Support**: support@dinooverlay.com
4. **Emergency Contact**: emergency@dinooverlay.com

### When Contacting Support

Include this information:

```javascript
// Generate support information
function generateSupportInfo() {
  const info = {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
    dinoOverlayVersion: window.DinoOverlay?.version,
    config: window.DinoOverlay?.config,
    errors: window.DinoOverlay?.getErrors(),
    performance: window.DinoOverlay?.getMetrics(),
    browserSupport: {
      shadowDOM: !!Element.prototype.attachShadow,
      fetch: !!window.fetch,
      intersectionObserver: !!window.IntersectionObserver
    }
  };
  
  console.log('Support Info (copy and send):', JSON.stringify(info, null, 2));
  return info;
}

generateSupportInfo();
```

### Status Page

Check system status: https://status.dinooverlay.com

### Community Resources

- Stack Overflow: Tag questions with `dinooverlay`
- Discord Community: https://discord.gg/dinooverlay
- Reddit: r/dinooverlay