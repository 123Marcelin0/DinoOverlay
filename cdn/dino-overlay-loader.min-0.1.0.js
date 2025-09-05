(function() {
  'use strict';
  
  // DinoOverlay CDN Loader v0.1.0
  // Size: 108KB | Integrity: sha384-badg/rnYo...
  
  var DinoOverlayLoader = {
    version: '0.1.0',
    loaded: false,
    config: null,
    
    // Primary CDN URL
    primaryUrl: 'https://cdn.dinooverlay.com/v1/dino-overlay-0.1.0.js',
    
    // Fallback CDN URL
    fallbackUrl: 'https://backup-cdn.dinooverlay.com/v1/dino-overlay-0.1.0.js',
    
    // Integrity hash for security
    integrity: 'sha384-badg/rnYoXzABqabanZK6jAmk5W5ur6718ZERBWPIcuKMywg6T1WggrO5Fz2BbVu',
    
    // Initialize with configuration
    init: function(userConfig) {
      if (this.loaded) {
        console.warn('DinoOverlay already loaded');
        return;
      }
      
      this.config = this.validateConfig(userConfig);
      this.loadScript();
    },
    
    // Validate user configuration
    validateConfig: function(config) {
      if (!config || typeof config !== 'object') {
        throw new Error('DinoOverlay: Configuration object required');
      }
      
      if (!config.apiKey) {
        throw new Error('DinoOverlay: API key required');
      }
      
      return {
        apiEndpoint: config.apiEndpoint || 'https://api.dinooverlay.com',
        apiKey: config.apiKey,
        theme: config.theme || 'auto',
        enableAnalytics: config.enableAnalytics !== false,
        customActions: config.customActions || [],
        debug: config.debug || false
      };
    },
    
    // Load the main script with fallback
    loadScript: function() {
      var self = this;
      var script = document.createElement('script');
      
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.integrity = this.integrity;
      script.src = this.primaryUrl;
      
      // Success handler
      script.onload = function() {
        self.onScriptLoaded();
      };
      
      // Error handler with fallback
      script.onerror = function() {
        console.warn('DinoOverlay: Primary CDN failed, trying fallback...');
        self.loadFallbackScript();
      };
      
      // Add to document
      document.head.appendChild(script);
      
      // Timeout fallback (5 seconds)
      setTimeout(function() {
        if (!self.loaded) {
          console.warn('DinoOverlay: Primary CDN timeout, trying fallback...');
          self.loadFallbackScript();
        }
      }, 5000);
    },
    
    // Load fallback script
    loadFallbackScript: function() {
      var self = this;
      var fallbackScript = document.createElement('script');
      
      fallbackScript.async = true;
      fallbackScript.crossOrigin = 'anonymous';
      fallbackScript.integrity = this.integrity;
      fallbackScript.src = this.fallbackUrl;
      
      fallbackScript.onload = function() {
        self.onScriptLoaded();
      };
      
      fallbackScript.onerror = function() {
        self.onLoadError();
      };
      
      document.head.appendChild(fallbackScript);
      
      // Final timeout (5 seconds)
      setTimeout(function() {
        if (!self.loaded) {
          self.onLoadError();
        }
      }, 5000);
    },
    
    // Handle successful script load
    onScriptLoaded: function() {
      this.loaded = true;
      
      if (window.DinoOverlay && window.DinoOverlay.init) {
        try {
          window.DinoOverlay.init(this.config);
          
          if (this.config.debug) {
            console.log('DinoOverlay loaded successfully', {
              version: this.version,
              config: this.config
            });
          }
        } catch (error) {
          console.error('DinoOverlay initialization failed:', error);
        }
      } else {
        console.error('DinoOverlay: Script loaded but DinoOverlay object not found');
      }
    },
    
    // Handle load errors
    onLoadError: function() {
      console.error('DinoOverlay: Failed to load from both primary and fallback CDNs');
      
      // Optionally try local fallback if configured
      if (this.config && this.config.localFallback) {
        this.loadLocalFallback();
      }
    },
    
    // Load local fallback (if configured)
    loadLocalFallback: function() {
      var localScript = document.createElement('script');
      localScript.async = true;
      localScript.src = this.config.localFallback;
      localScript.onload = this.onScriptLoaded.bind(this);
      localScript.onerror = function() {
        console.error('DinoOverlay: All loading methods failed');
      };
      document.head.appendChild(localScript);
    }
  };
  
  // Expose loader globally
  window.DinoOverlayLoader = DinoOverlayLoader;
  
  // Auto-initialize if config is already available
  if (window.DinoOverlayConfig) {
    DinoOverlayLoader.init(window.DinoOverlayConfig);
  }
})();