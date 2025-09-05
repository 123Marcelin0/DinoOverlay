# DinoOverlay CDN Integration Guide

## Overview

The DinoOverlay system provides a robust CDN integration with automatic fallback mechanisms, integrity verification, and comprehensive security features. This guide covers all aspects of integrating DinoOverlay into your website.

## Quick Start

### Basic Integration

The simplest way to integrate DinoOverlay is using our CDN-hosted script:

```html
<script>
  (function(){
    var s=document.createElement('script');
    s.src="https://cdn.dinooverlay.com/v1/dino-overlay-1.0.0.js";
    s.integrity="sha384-[hash-will-be-generated]";
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
</script>
```

### Advanced Integration with Fallback

For production environments, use the advanced loader with automatic fallback:

```html
<!-- Configuration -->
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

<!-- Loader Script -->
<script 
  src="https://cdn.dinooverlay.com/v1/dino-overlay-loader-1.0.0.min.js"
  integrity="sha384-[loader-hash-will-be-generated]"
  crossorigin="anonymous"
  async>
</script>
```

## Framework Integration

### WordPress

Create a WordPress plugin or add to your theme's `functions.php`:

```php
<?php
/**
 * DinoOverlay WordPress Integration
 */

// Add settings page
function dino_overlay_admin_menu() {
    add_options_page(
        'DinoOverlay Settings',
        'DinoOverlay',
        'manage_options',
        'dino-overlay',
        'dino_overlay_settings_page'
    );
}
add_action('admin_menu', 'dino_overlay_admin_menu');

// Settings page
function dino_overlay_settings_page() {
    if (isset($_POST['submit'])) {
        update_option('dino_overlay_api_key', sanitize_text_field($_POST['api_key']));
        update_option('dino_overlay_theme', sanitize_text_field($_POST['theme']));
        update_option('dino_overlay_analytics', isset($_POST['analytics']));
    }
    
    $api_key = get_option('dino_overlay_api_key', '');
    $theme = get_option('dino_overlay_theme', 'auto');
    $analytics = get_option('dino_overlay_analytics', true);
    ?>
    <div class="wrap">
        <h1>DinoOverlay Settings</h1>
        <form method="post">
            <table class="form-table">
                <tr>
                    <th scope="row">API Key</th>
                    <td><input type="text" name="api_key" value="<?php echo esc_attr($api_key); ?>" class="regular-text" /></td>
                </tr>
                <tr>
                    <th scope="row">Theme</th>
                    <td>
                        <select name="theme">
                            <option value="auto" <?php selected($theme, 'auto'); ?>>Auto</option>
                            <option value="light" <?php selected($theme, 'light'); ?>>Light</option>
                            <option value="dark" <?php selected($theme, 'dark'); ?>>Dark</option>
                        </select>
                    </td>
                </tr>
                <tr>
                    <th scope="row">Enable Analytics</th>
                    <td><input type="checkbox" name="analytics" <?php checked($analytics); ?> /></td>
                </tr>
            </table>
            <?php submit_button(); ?>
        </form>
    </div>
    <?php
}

// Add script to frontend
function add_dino_overlay() {
    $api_key = get_option('dino_overlay_api_key');
    if (!$api_key) return;
    
    $theme = get_option('dino_overlay_theme', 'auto');
    $analytics = get_option('dino_overlay_analytics', true);
    ?>
    <script>
      window.DinoOverlayConfig = {
        apiKey: '<?php echo esc_js($api_key); ?>',
        apiEndpoint: 'https://api.dinooverlay.com',
        theme: '<?php echo esc_js($theme); ?>',
        enableAnalytics: <?php echo $analytics ? 'true' : 'false'; ?>
      };
    </script>
    <script 
      src="https://cdn.dinooverlay.com/v1/dino-overlay-loader-1.0.0.min.js"
      integrity="sha384-[hash]"
      crossorigin="anonymous"
      async>
    </script>
    <?php
}
add_action('wp_head', 'add_dino_overlay');

// Add editable-room class to property images
function add_editable_room_class($html, $id, $size, $permalink) {
    // Check if this is a property/real estate image
    $post = get_post($id);
    if ($post && has_term('property', 'category', $post)) {
        $html = str_replace('<img', '<img class="editable-room"', $html);
    }
    return $html;
}
add_filter('wp_get_attachment_image', 'add_editable_room_class', 10, 4);
?>
```

### React

```jsx
import React, { useEffect, useState } from 'react';

const DinoOverlayProvider = ({ children, config }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let script = null;
    let cleanup = null;

    const loadDinoOverlay = async () => {
      try {
        // Create script element
        script = document.createElement('script');
        script.src = 'https://cdn.dinooverlay.com/v1/dino-overlay-1.0.0.js';
        script.integrity = 'sha384-[hash]';
        script.crossOrigin = 'anonymous';
        script.async = true;

        // Promise-based loading
        const loadPromise = new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
        });

        document.head.appendChild(script);
        await loadPromise;

        // Initialize DinoOverlay
        if (window.DinoOverlayLoader) {
          window.DinoOverlayLoader.init(config);
          setLoaded(true);
        } else {
          throw new Error('DinoOverlay not found after script load');
        }
      } catch (err) {
        setError(err.message);
        console.error('DinoOverlay loading failed:', err);
      }
    };

    loadDinoOverlay();

    // Cleanup function
    cleanup = () => {
      if (script && script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };

    return cleanup;
  }, [config]);

  if (error) {
    console.warn('DinoOverlay failed to load:', error);
  }

  return (
    <>
      {children}
      {loaded && (
        <div data-dino-overlay-status="loaded" style={{ display: 'none' }} />
      )}
    </>
  );
};

// Usage example
const App = () => {
  const dinoConfig = {
    apiKey: process.env.REACT_APP_DINO_OVERLAY_API_KEY,
    apiEndpoint: 'https://api.dinooverlay.com',
    theme: 'auto',
    enableAnalytics: true
  };

  return (
    <DinoOverlayProvider config={dinoConfig}>
      <div className="app">
        <h1>Real Estate Listings</h1>
        <div className="property-grid">
          <img 
            src="/property1.jpg" 
            alt="Living Room" 
            className="editable-room property-image"
          />
          <img 
            src="/property2.jpg" 
            alt="Kitchen" 
            className="editable-room property-image"
          />
        </div>
      </div>
    </DinoOverlayProvider>
  );
};

export default App;
```

### Vue.js

```vue
<template>
  <div id="app">
    <div v-if="overlayError" class="error-message">
      DinoOverlay failed to load: {{ overlayError }}
    </div>
    
    <div class="property-listings">
      <h1>Real Estate Properties</h1>
      <div class="image-grid">
        <img 
          v-for="image in propertyImages" 
          :key="image.id"
          :src="image.url" 
          :alt="image.alt"
          class="editable-room property-image"
        />
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'App',
  data() {
    return {
      overlayLoaded: false,
      overlayError: null,
      propertyImages: [
        { id: 1, url: '/property1.jpg', alt: 'Modern Living Room' },
        { id: 2, url: '/property2.jpg', alt: 'Contemporary Kitchen' },
        { id: 3, url: '/property3.jpg', alt: 'Master Bedroom' }
      ]
    };
  },
  async mounted() {
    await this.loadDinoOverlay();
  },
  methods: {
    async loadDinoOverlay() {
      try {
        const script = document.createElement('script');
        script.src = 'https://cdn.dinooverlay.com/v1/dino-overlay-1.0.0.js';
        script.integrity = 'sha384-[hash]';
        script.crossOrigin = 'anonymous';
        script.async = true;

        const loadPromise = new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
        });

        document.head.appendChild(script);
        await loadPromise;

        if (window.DinoOverlayLoader) {
          window.DinoOverlayLoader.init({
            apiKey: process.env.VUE_APP_DINO_OVERLAY_API_KEY,
            apiEndpoint: 'https://api.dinooverlay.com',
            theme: 'auto',
            enableAnalytics: true
          });
          this.overlayLoaded = true;
        } else {
          throw new Error('DinoOverlay object not found');
        }
      } catch (error) {
        this.overlayError = error.message;
        console.error('DinoOverlay loading failed:', error);
      }
    }
  },
  beforeUnmount() {
    // Cleanup if needed
    const scripts = document.querySelectorAll('script[src*="dino-overlay"]');
    scripts.forEach(script => script.remove());
  }
};
</script>

<style scoped>
.property-listings {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.property-image {
  width: 100%;
  height: 200px;
  object-fit: cover;
  border-radius: 8px;
  transition: transform 0.2s ease;
}

.property-image:hover {
  transform: scale(1.02);
}

.error-message {
  background: #fee;
  color: #c33;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 20px;
}
</style>
```

### Next.js

```jsx
// components/DinoOverlayProvider.js
import { useEffect, useState } from 'react';
import Script from 'next/script';

const DinoOverlayProvider = ({ children, config }) => {
  const [loaded, setLoaded] = useState(false);

  const handleLoad = () => {
    if (window.DinoOverlayLoader) {
      window.DinoOverlayLoader.init(config);
      setLoaded(true);
    }
  };

  return (
    <>
      <Script
        src="https://cdn.dinooverlay.com/v1/dino-overlay-1.0.0.js"
        integrity="sha384-[hash]"
        crossOrigin="anonymous"
        strategy="afterInteractive"
        onLoad={handleLoad}
        onError={(e) => {
          console.error('DinoOverlay failed to load:', e);
        }}
      />
      {children}
    </>
  );
};

// pages/_app.js
import DinoOverlayProvider from '../components/DinoOverlayProvider';

function MyApp({ Component, pageProps }) {
  const dinoConfig = {
    apiKey: process.env.NEXT_PUBLIC_DINO_OVERLAY_API_KEY,
    apiEndpoint: 'https://api.dinooverlay.com',
    theme: 'auto',
    enableAnalytics: true
  };

  return (
    <DinoOverlayProvider config={dinoConfig}>
      <Component {...pageProps} />
    </DinoOverlayProvider>
  );
}

export default MyApp;
```

## Configuration Options

### Basic Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | string | **required** | Your DinoOverlay API key |
| `apiEndpoint` | string | `https://api.dinooverlay.com` | API endpoint URL |
| `theme` | string | `auto` | Theme mode: `light`, `dark`, or `auto` |
| `enableAnalytics` | boolean | `true` | Enable usage analytics |
| `debug` | boolean | `false` | Enable debug logging |

### Advanced Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `customActions` | array | `[]` | Custom quick action buttons |
| `localFallback` | string | `null` | Local fallback script URL |
| `retryAttempts` | number | `3` | Number of retry attempts for failed requests |
| `timeout` | number | `10000` | Request timeout in milliseconds |
| `cacheImages` | boolean | `true` | Enable image caching |
| `maxImageSize` | number | `5242880` | Maximum image size in bytes (5MB) |

### Custom Actions

```javascript
{
  customActions: [
    {
      id: 'vintage',
      label: 'Vintage Style',
      prompt: 'Apply vintage styling with warm tones and aged textures',
      icon: 'vintage-icon.svg'
    },
    {
      id: 'minimalist',
      label: 'Minimalist',
      prompt: 'Create a clean, minimalist look with neutral colors',
      icon: 'minimalist-icon.svg'
    }
  ]
}
```

## Security

### Content Security Policy

Add the following directives to your CSP header:

```
Content-Security-Policy: 
  script-src 'self' https://cdn.dinooverlay.com https://backup-cdn.dinooverlay.com;
  connect-src 'self' https://api.dinooverlay.com;
  img-src 'self' data: https://api.dinooverlay.com;
  style-src 'self' 'unsafe-inline';
```

### Subresource Integrity

Always use SRI hashes for security:

```html
<script 
  src="https://cdn.dinooverlay.com/v1/dino-overlay-1.0.0.js"
  integrity="sha384-[generated-hash]"
  crossorigin="anonymous">
</script>
```

### API Key Security

- Never expose API keys in client-side code for production
- Use environment variables or server-side proxy
- Implement rate limiting on your API endpoints
- Monitor API usage for suspicious activity

## Performance Optimization

### Bundle Size

- Main bundle: ~150KB gzipped
- Loader script: ~5KB gzipped
- Total initial load: ~155KB

### Loading Strategy

1. **Async Loading**: Scripts load asynchronously without blocking page render
2. **CDN Caching**: Global edge locations for fast delivery
3. **Fallback Mechanism**: Automatic failover to backup CDN
4. **Local Fallback**: Optional local script fallback

### Image Optimization

```javascript
{
  imageOptimization: {
    enableWebP: true,
    quality: 85,
    maxWidth: 1920,
    maxHeight: 1080,
    progressive: true
  }
}
```

## Troubleshooting

### Common Issues

#### Script Not Loading

1. **Check CSP headers** - Ensure CDN domains are allowed
2. **Verify integrity hash** - Hash mismatch will block loading
3. **Check network connectivity** - Test CDN accessibility
4. **Browser console errors** - Look for specific error messages

#### Images Not Detected

1. **CSS class missing** - Ensure images have `.editable-room` class
2. **DOM timing** - Script may load before images are rendered
3. **Visibility issues** - Images must be visible in viewport
4. **Dynamic content** - Use MutationObserver for dynamic images

#### API Errors

1. **Invalid API key** - Verify key is correct and active
2. **Rate limiting** - Check if you've exceeded rate limits
3. **CORS issues** - Ensure proper CORS headers
4. **Network errors** - Check connectivity to API endpoint

### Debug Mode

Enable debug mode for detailed logging:

```javascript
{
  debug: true,
  logLevel: 'verbose' // 'error', 'warn', 'info', 'verbose'
}
```

### Health Check

Test your integration:

```javascript
// Check if DinoOverlay is loaded
if (window.DinoOverlay) {
  console.log('DinoOverlay version:', window.DinoOverlay.version);
  console.log('Loaded components:', window.DinoOverlay.loadedComponents);
}

// Test API connectivity
window.DinoOverlay.testConnection().then(result => {
  console.log('API connection test:', result);
});
```

## Browser Support

| Browser | Minimum Version | Notes |
|---------|----------------|-------|
| Chrome | 80+ | Full support |
| Firefox | 75+ | Full support |
| Safari | 13+ | Full support |
| Edge | 80+ | Full support |
| IE | Not supported | Use polyfills if needed |

## Migration Guide

### From v0.x to v1.x

1. Update script URLs to use versioned paths
2. Add integrity hashes to script tags
3. Update configuration object structure
4. Test fallback mechanisms

### Breaking Changes

- Configuration object structure changed
- API endpoint URLs updated
- Some CSS classes renamed
- Event names standardized

## Support

- **Documentation**: https://docs.dinooverlay.com
- **API Reference**: https://api.dinooverlay.com/docs
- **GitHub Issues**: https://github.com/dinooverlay/widget/issues
- **Support Email**: support@dinooverlay.com

## License

DinoOverlay is proprietary software. See license agreement for usage terms.