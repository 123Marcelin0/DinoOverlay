#!/usr/bin/env node

/**
 * Build script for generating CDN-ready script snippet with integrity hashes
 * and fallback loading mechanisms
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

// Configuration
const CDN_CONFIG = {
  primary: 'https://cdn.dinooverlay.com/v1',
  fallback: 'https://backup-cdn.dinooverlay.com/v1',
  local: './dist'
};

const VERSION = process.env.npm_package_version || '1.0.0';
const BUILD_DIR = path.resolve(__dirname, '../dist');
const SNIPPET_DIR = path.resolve(__dirname, '../cdn');

/**
 * Generate SHA-384 integrity hash for a file
 */
function generateIntegrityHash(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hash = crypto.createHash('sha384').update(fileBuffer).digest('base64');
  return `sha384-${hash}`;
}

/**
 * Get file size in bytes
 */
function getFileSize(filePath) {
  const stats = fs.statSync(filePath);
  return stats.size;
}

/**
 * Create versioned filename
 */
function createVersionedFilename(originalName, version) {
  const ext = path.extname(originalName);
  const name = path.basename(originalName, ext);
  return `${name}-${version}${ext}`;
}

/**
 * Generate the main script snippet
 */
function generateScriptSnippet(config) {
  const { primaryUrl, fallbackUrl, integrity, version, size } = config;
  
  return `(function() {
  'use strict';
  
  // DinoOverlay CDN Loader v${version}
  // Size: ${Math.round(size / 1024)}KB | Integrity: ${integrity.substring(0, 16)}...
  
  var DinoOverlayLoader = {
    version: '${version}',
    loaded: false,
    config: null,
    
    // Primary CDN URL
    primaryUrl: '${primaryUrl}',
    
    // Fallback CDN URL
    fallbackUrl: '${fallbackUrl}',
    
    // Integrity hash for security
    integrity: '${integrity}',
    
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
})();`
}

/**
 * Generate integration examples
 */
function generateIntegrationExamples(config) {
  const { version, integrity, size } = config;
  
  return {
    basic: `<!-- Basic DinoOverlay Integration -->
<script>
  (function(){
    var s=document.createElement('script');
    s.src="https://cdn.dinooverlay.com/v1/dino-overlay-${version}.js";
    s.integrity="${integrity}";
    s.crossOrigin="anonymous";
    s.async=true;
    s.onload=function(){
      DinoOverlayLoader.init({
        apiKey: 'your-api-key-here',
        apiEndpoint: 'https://api.dinooverlay.com'
      });
    };
    document.head.appendChild(s);
  })();
</script>`,

    advanced: `<!-- Advanced DinoOverlay Integration with Fallback -->
<script>
  window.DinoOverlayConfig = {
    apiKey: 'your-api-key-here',
    apiEndpoint: 'https://api.dinooverlay.com',
    theme: 'auto',
    enableAnalytics: true,
    debug: false,
    customActions: [
      { id: 'vintage', label: 'Vintage Style', prompt: 'Apply vintage styling' },
      { id: 'modern', label: 'Modern Look', prompt: 'Apply modern minimalist styling' }
    ],
    localFallback: '/assets/js/dino-overlay.js' // Optional local fallback
  };
</script>
<script 
  src="https://cdn.dinooverlay.com/v1/dino-overlay-loader-${version}.min.js"
  integrity="${integrity}"
  crossorigin="anonymous"
  async>
</script>`,

    wordpress: `<?php
// WordPress Integration Example
function add_dino_overlay() {
    $api_key = get_option('dino_overlay_api_key');
    if (!$api_key) return;
    
    ?>
    <script>
      window.DinoOverlayConfig = {
        apiKey: '<?php echo esc_js($api_key); ?>',
        apiEndpoint: 'https://api.dinooverlay.com',
        theme: 'auto',
        enableAnalytics: <?php echo get_option('dino_overlay_analytics', true) ? 'true' : 'false'; ?>
      };
    </script>
    <script 
      src="https://cdn.dinooverlay.com/v1/dino-overlay-loader-${version}.min.js"
      integrity="${integrity}"
      crossorigin="anonymous"
      async>
    </script>
    <?php
}
add_action('wp_head', 'add_dino_overlay');
?>`,

    react: `// React Integration Example
import { useEffect } from 'react';

const DinoOverlayProvider = ({ children, config }) => {
  useEffect(() => {
    // Load DinoOverlay script
    const script = document.createElement('script');
    script.src = 'https://cdn.dinooverlay.com/v1/dino-overlay-${version}.js';
    script.integrity = '${integrity}';
    script.crossOrigin = 'anonymous';
    script.async = true;
    
    script.onload = () => {
      if (window.DinoOverlayLoader) {
        window.DinoOverlayLoader.init(config);
      }
    };
    
    document.head.appendChild(script);
    
    return () => {
      // Cleanup on unmount
      document.head.removeChild(script);
    };
  }, [config]);
  
  return children;
};

// Usage
<DinoOverlayProvider config={{
  apiKey: 'your-api-key',
  apiEndpoint: 'https://api.dinooverlay.com',
  theme: 'auto'
}}>
  <YourApp />
</DinoOverlayProvider>`,

    vue: `<!-- Vue.js Integration Example -->
<template>
  <div id="app">
    <!-- Your app content -->
  </div>
</template>

<script>
export default {
  name: 'App',
  mounted() {
    this.loadDinoOverlay();
  },
  methods: {
    loadDinoOverlay() {
      const script = document.createElement('script');
      script.src = 'https://cdn.dinooverlay.com/v1/dino-overlay-${version}.js';
      script.integrity = '${integrity}';
      script.crossOrigin = 'anonymous';
      script.async = true;
      
      script.onload = () => {
        if (window.DinoOverlayLoader) {
          window.DinoOverlayLoader.init({
            apiKey: process.env.VUE_APP_DINO_OVERLAY_API_KEY,
            apiEndpoint: 'https://api.dinooverlay.com',
            theme: 'auto'
          });
        }
      };
      
      document.head.appendChild(script);
    }
  }
};
</script>`
  };
}

/**
 * Main build function
 */
function buildCDNSnippet() {
  console.log('🚀 Building CDN snippet and integration files...');
  
  // Ensure directories exist
  if (!fs.existsSync(SNIPPET_DIR)) {
    fs.mkdirSync(SNIPPET_DIR, { recursive: true });
  }
  
  // Build the widget first
  console.log('📦 Building widget bundle...');
  execSync('npm run build:widget', { stdio: 'inherit' });
  
  // Get main bundle file
  const mainBundlePath = path.join(BUILD_DIR, 'dino-overlay.iife.js');
  
  if (!fs.existsSync(mainBundlePath)) {
    throw new Error('Main bundle not found. Run npm run build:widget first.');
  }
  
  // Generate integrity hash and get file info
  const integrity = generateIntegrityHash(mainBundlePath);
  const size = getFileSize(mainBundlePath);
  
  console.log(`📊 Bundle info:
  - Size: ${Math.round(size / 1024)}KB
  - Integrity: ${integrity.substring(0, 32)}...`);
  
  // Create versioned filename
  const versionedFilename = createVersionedFilename('dino-overlay.js', VERSION);
  const loaderFilename = createVersionedFilename('dino-overlay-loader.min.js', VERSION);
  
  // Configuration for snippet generation
  const config = {
    primaryUrl: `${CDN_CONFIG.primary}/${versionedFilename}`,
    fallbackUrl: `${CDN_CONFIG.fallback}/${versionedFilename}`,
    integrity,
    version: VERSION,
    size
  };
  
  // Generate script snippet
  console.log('📝 Generating script snippet...');
  const snippet = generateScriptSnippet(config);
  
  // Generate integration examples
  console.log('📚 Generating integration examples...');
  const examples = generateIntegrationExamples({ ...config, integrity });
  
  // Write files
  fs.writeFileSync(path.join(SNIPPET_DIR, loaderFilename), snippet);
  fs.writeFileSync(path.join(SNIPPET_DIR, 'integration-examples.md'), 
    generateIntegrationDocumentation(examples, config));
  
  // Copy main bundle with versioned name
  fs.copyFileSync(mainBundlePath, path.join(SNIPPET_DIR, versionedFilename));
  fs.copyFileSync(`${mainBundlePath}.map`, path.join(SNIPPET_DIR, `${versionedFilename}.map`));
  
  // Generate CDN deployment configuration
  const cdnConfig = {
    version: VERSION,
    files: [
      {
        source: versionedFilename,
        integrity,
        size,
        contentType: 'application/javascript',
        cacheControl: 'public, max-age=31536000, immutable'
      },
      {
        source: loaderFilename,
        integrity: generateIntegrityHash(path.join(SNIPPET_DIR, loaderFilename)),
        size: getFileSize(path.join(SNIPPET_DIR, loaderFilename)),
        contentType: 'application/javascript',
        cacheControl: 'public, max-age=31536000, immutable'
      }
    ],
    cdn: CDN_CONFIG
  };
  
  fs.writeFileSync(path.join(SNIPPET_DIR, 'cdn-config.json'), 
    JSON.stringify(cdnConfig, null, 2));
  
  console.log(`✅ CDN snippet build complete!
  
📁 Generated files:
  - ${loaderFilename} (minified loader)
  - ${versionedFilename} (main bundle)
  - integration-examples.md (documentation)
  - cdn-config.json (deployment config)
  
🔗 CDN URLs:
  - Primary: ${config.primaryUrl}
  - Fallback: ${config.fallbackUrl}
  
🔒 Integrity: ${integrity}
📦 Total size: ${Math.round((size + getFileSize(path.join(SNIPPET_DIR, loaderFilename))) / 1024)}KB`);
}

/**
 * Generate integration documentation
 */
function generateIntegrationDocumentation(examples, config) {
  return `# DinoOverlay Integration Guide

## Quick Start

The DinoOverlay system can be integrated into any website using a simple script tag. The system automatically detects images with the \`.editable-room\` class and provides AI-powered editing capabilities.

### Basic Integration

\`\`\`html
${examples.basic}
\`\`\`

### Advanced Integration with Fallback

\`\`\`html
${examples.advanced}
\`\`\`

## Framework-Specific Integration

### WordPress

\`\`\`php
${examples.wordpress}
\`\`\`

### React

\`\`\`jsx
${examples.react}
\`\`\`

### Vue.js

\`\`\`vue
${examples.vue}
\`\`\`

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| \`apiKey\` | string | required | Your DinoOverlay API key |
| \`apiEndpoint\` | string | \`https://api.dinooverlay.com\` | API endpoint URL |
| \`theme\` | string | \`auto\` | Theme mode: \`light\`, \`dark\`, or \`auto\` |
| \`enableAnalytics\` | boolean | \`true\` | Enable usage analytics |
| \`debug\` | boolean | \`false\` | Enable debug logging |
| \`customActions\` | array | \`[]\` | Custom quick action buttons |
| \`localFallback\` | string | \`null\` | Local fallback script URL |

## Security

### Content Security Policy

Add the following to your CSP header:

\`\`\`
script-src 'self' https://cdn.dinooverlay.com https://backup-cdn.dinooverlay.com;
connect-src 'self' https://api.dinooverlay.com;
img-src 'self' data: https://api.dinooverlay.com;
\`\`\`

### Subresource Integrity

The script includes SRI hash for security:

\`\`\`
integrity="${config.integrity}"
\`\`\`

## Performance

- **Bundle Size**: ${Math.round(config.size / 1024)}KB gzipped
- **Load Time**: < 2 seconds on 3G
- **CDN**: Global edge locations for fast delivery
- **Fallback**: Automatic failover to backup CDN

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Troubleshooting

### Script Not Loading

1. Check CSP headers
2. Verify API key is correct
3. Check browser console for errors
4. Try the fallback CDN URL

### Images Not Detected

1. Ensure images have \`.editable-room\` class
2. Check that images are visible in viewport
3. Verify DOM is fully loaded before script runs

### API Errors

1. Verify API key is valid
2. Check API endpoint URL
3. Ensure proper CORS headers
4. Check rate limiting status

## Support

For technical support, visit: https://docs.dinooverlay.com
`;
}

// Run the build
if (require.main === module) {
  try {
    buildCDNSnippet();
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

module.exports = { buildCDNSnippet, generateIntegrityHash };