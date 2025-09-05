# DinoOverlay Integration Guide

## Quick Start

The DinoOverlay system can be integrated into any website using a simple script tag. The system automatically detects images with the `.editable-room` class and provides AI-powered editing capabilities.

### Basic Integration

```html
<!-- Basic DinoOverlay Integration -->
<script>
  (function(){
    var s=document.createElement('script');
    s.src="https://cdn.dinooverlay.com/v1/dino-overlay-0.1.0.js";
    s.integrity="sha384-badg/rnYoXzABqabanZK6jAmk5W5ur6718ZERBWPIcuKMywg6T1WggrO5Fz2BbVu";
    s.crossOrigin="anonymous";
    s.async=true;
    s.onload=function(){
      DinoOverlayLoader.init({
        apiKey: 'your-api-key-here',
        apiEndpoint: 'https://dino-overlay-hzdzk7o4h-marces-projects-3950c474.vercel.app/api/overlay'
      });
    };
    document.head.appendChild(s);
  })();
</script>
```

### Advanced Integration with Fallback

```html
<!-- Advanced DinoOverlay Integration with Fallback -->
<script>
  window.DinoOverlayConfig = {
    apiKey: 'your-api-key-here',
    apiEndpoint: 'https://dino-overlay-hzdzk7o4h-marces-projects-3950c474.vercel.app/api/overlay',
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
  src="https://cdn.dinooverlay.com/v1/dino-overlay-loader-0.1.0.min.js"
  integrity="sha384-badg/rnYoXzABqabanZK6jAmk5W5ur6718ZERBWPIcuKMywg6T1WggrO5Fz2BbVu"
  crossorigin="anonymous"
  async>
</script>
```

## Framework-Specific Integration

### WordPress

```php
<?php
// WordPress Integration Example
function add_dino_overlay() {
    $api_key = get_option('dino_overlay_api_key');
    if (!$api_key) return;
    
    ?>
    <script>
      window.DinoOverlayConfig = {
        apiKey: '<?php echo esc_js($api_key); ?>',
        apiEndpoint: 'https://dino-overlay-hzdzk7o4h-marces-projects-3950c474.vercel.app/api/overlay',
        theme: 'auto',
        enableAnalytics: <?php echo get_option('dino_overlay_analytics', true) ? 'true' : 'false'; ?>
      };
    </script>
    <script 
      src="https://cdn.dinooverlay.com/v1/dino-overlay-loader-0.1.0.min.js"
      integrity="sha384-badg/rnYoXzABqabanZK6jAmk5W5ur6718ZERBWPIcuKMywg6T1WggrO5Fz2BbVu"
      crossorigin="anonymous"
      async>
    </script>
    <?php
}
add_action('wp_head', 'add_dino_overlay');
?>
```

### React

```jsx
// React Integration Example
import { useEffect } from 'react';

const DinoOverlayProvider = ({ children, config }) => {
  useEffect(() => {
    // Load DinoOverlay script
    const script = document.createElement('script');
    script.src = 'https://cdn.dinooverlay.com/v1/dino-overlay-0.1.0.js';
    script.integrity = 'sha384-badg/rnYoXzABqabanZK6jAmk5W5ur6718ZERBWPIcuKMywg6T1WggrO5Fz2BbVu';
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
  apiEndpoint: 'https://dino-overlay-hzdzk7o4h-marces-projects-3950c474.vercel.app/api/overlay',
  theme: 'auto'
}}>
  <YourApp />
</DinoOverlayProvider>
```

### Vue.js

```vue
<!-- Vue.js Integration Example -->
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
      script.src = 'https://cdn.dinooverlay.com/v1/dino-overlay-0.1.0.js';
      script.integrity = 'sha384-badg/rnYoXzABqabanZK6jAmk5W5ur6718ZERBWPIcuKMywg6T1WggrO5Fz2BbVu';
      script.crossOrigin = 'anonymous';
      script.async = true;
      
      script.onload = () => {
        if (window.DinoOverlayLoader) {
          window.DinoOverlayLoader.init({
            apiKey: process.env.VUE_APP_DINO_OVERLAY_API_KEY,
            apiEndpoint: 'https://dino-overlay-hzdzk7o4h-marces-projects-3950c474.vercel.app/api/overlay',
            theme: 'auto'
          });
        }
      };
      
      document.head.appendChild(script);
    }
  }
};
</script>
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | string | required | Your DinoOverlay API key |
| `apiEndpoint` | string | `https://dino-overlay-hzdzk7o4h-marces-projects-3950c474.vercel.app/api/overlay` | API endpoint URL |
| `theme` | string | `auto` | Theme mode: `light`, `dark`, or `auto` |
| `enableAnalytics` | boolean | `true` | Enable usage analytics |
| `debug` | boolean | `false` | Enable debug logging |
| `customActions` | array | `[]` | Custom quick action buttons |
| `localFallback` | string | `null` | Local fallback script URL |

## Security

### Content Security Policy

Add the following to your CSP header:

```
script-src 'self' https://cdn.dinooverlay.com https://backup-cdn.dinooverlay.com;
connect-src 'self' https://dino-overlay-hzdzk7o4h-marces-projects-3950c474.vercel.app/api/overlay;
img-src 'self' data: https://dino-overlay-hzdzk7o4h-marces-projects-3950c474.vercel.app/api/overlay;
```

### Subresource Integrity

The script includes SRI hash for security:

```
integrity="sha384-badg/rnYoXzABqabanZK6jAmk5W5ur6718ZERBWPIcuKMywg6T1WggrO5Fz2BbVu"
```

## Performance

- **Bundle Size**: 108KB gzipped
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

1. Ensure images have `.editable-room` class
2. Check that images are visible in viewport
3. Verify DOM is fully loaded before script runs

### API Errors

1. Verify API key is valid
2. Check API endpoint URL
3. Ensure proper CORS headers
4. Check rate limiting status

## Support

For technical support, visit: https://docs.dinooverlay.com
