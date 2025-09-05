/**
 * DinoOverlay Fallback Loader
 * 
 * This script provides automatic fallback loading when the primary CDN fails.
 * It attempts to load from the primary CDN first, then falls back to the backup CDN,
 * and finally to a local copy if available.
 */

(function() {
  'use strict';
  
  const FALLBACK_CONFIG = {
    version: '0.1.0',
    primary: 'https://cdn.dinooverlay.com/v1',
    fallback: 'https://backup-cdn.dinooverlay.com/v1',
    local: './dist', // Local fallback path
    timeout: 5000, // 5 second timeout
    retries: 2
  };
  
  const INTEGRITY_HASHES = {
    'dino-overlay-0.1.0.js': 'sha384-badg/rnYoXzABqabanZK6jAmk5W5ur6718ZERBWPIcuKMywg6T1WggrO5Fz2BbVu',
    'dino-overlay-loader.min-0.1.0.js': 'sha384-070IklUck0YB2zvNbvQGH4Hdgx9mxcylnaoMqBpt7eZOYyRIiFK50Ddn2TD/6K4t'
  };
  
  /**
   * Load script with fallback mechanism
   */
  function loadScriptWithFallback(filename, cdnUrls, onSuccess, onError) {
    let currentIndex = 0;
    let retryCount = 0;
    
    function attemptLoad() {
      if (currentIndex >= cdnUrls.length) {
        if (retryCount < FALLBACK_CONFIG.retries) {
          retryCount++;
          currentIndex = 0;
          setTimeout(attemptLoad, 1000 * retryCount); // Exponential backoff
          return;
        }
        onError(new Error('All CDN sources failed'));
        return;
      }
      
      const url = `${cdnUrls[currentIndex]}/${filename}`;
      const script = document.createElement('script');
      const timeoutId = setTimeout(() => {
        script.onerror();
      }, FALLBACK_CONFIG.timeout);
      
      script.onload = function() {
        clearTimeout(timeoutId);
        console.log(`DinoOverlay loaded from: ${url}`);
        onSuccess();
      };
      
      script.onerror = function() {
        clearTimeout(timeoutId);
        console.warn(`Failed to load DinoOverlay from: ${url}`);
        document.head.removeChild(script);
        currentIndex++;
        attemptLoad();
      };
      
      script.src = url;
      script.crossOrigin = 'anonymous';
      script.async = true;
      
      // Add integrity hash if available
      const integrity = INTEGRITY_HASHES[filename];
      if (integrity) {
        script.integrity = integrity;
      }
      
      document.head.appendChild(script);
    }
    
    attemptLoad();
  }
  
  /**
   * Initialize DinoOverlay with fallback loading
   */
  function initializeDinoOverlay() {
    const cdnUrls = [
      FALLBACK_CONFIG.primary,
      FALLBACK_CONFIG.fallback
    ];
    
    // Add local fallback if available
    if (FALLBACK_CONFIG.local && window.location.protocol !== 'file:') {
      cdnUrls.push(FALLBACK_CONFIG.local);
    }
    
    // Load the main widget bundle
    loadScriptWithFallback(
      `dino-overlay-${FALLBACK_CONFIG.version}.js`,
      cdnUrls,
      function onSuccess() {
        // Initialize the widget with user configuration
        if (window.DinoOverlayLoader && window.DinoOverlayConfig) {
          try {
            window.DinoOverlayLoader.init(window.DinoOverlayConfig);
          } catch (error) {
            console.error('DinoOverlay initialization failed:', error);
            
            // Send error to analytics if available
            if (window.gtag) {
              window.gtag('event', 'exception', {
                description: 'DinoOverlay init failed: ' + error.message,
                fatal: false
              });
            }
          }
        } else {
          console.error('DinoOverlay configuration not found. Please set window.DinoOverlayConfig');
        }
      },
      function onError(error) {
        console.error('DinoOverlay failed to load from all sources:', error);
        
        // Send error to analytics if available
        if (window.gtag) {
          window.gtag('event', 'exception', {
            description: 'DinoOverlay load failed: ' + error.message,
            fatal: true
          });
        }
        
        // Show user-friendly error message
        if (window.DinoOverlayConfig && window.DinoOverlayConfig.debug) {
          const errorDiv = document.createElement('div');
          errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ff4444;
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            z-index: 10000;
            max-width: 300px;
          `;
          errorDiv.textContent = 'DinoOverlay failed to load. Please check your internet connection.';
          document.body.appendChild(errorDiv);
          
          setTimeout(() => {
            if (errorDiv.parentNode) {
              errorDiv.parentNode.removeChild(errorDiv);
            }
          }, 5000);
        }
      }
    );
  }
  
  /**
   * Check if DOM is ready
   */
  function domReady(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback);
    } else {
      callback();
    }
  }
  
  // Initialize when DOM is ready
  domReady(initializeDinoOverlay);
  
  // Export for manual initialization if needed
  window.DinoOverlayFallbackLoader = {
    init: initializeDinoOverlay,
    loadScript: loadScriptWithFallback,
    config: FALLBACK_CONFIG
  };
})();