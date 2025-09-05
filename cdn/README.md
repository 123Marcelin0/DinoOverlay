# DinoOverlay CDN Distribution

This directory contains the production-ready CDN distribution files for the DinoOverlay widget system.

## 📁 Directory Structure

```
cdn/
├── README.md                           # This file
├── demo.html                          # Interactive demo page
├── deployment-guide.md                # Comprehensive deployment guide
├── integration-examples.md            # Integration documentation
├── cdn-config.json                    # CDN deployment configuration
├── integrity-manifest.json            # Security hashes for all files
├── csp-config.json                    # Content Security Policy configuration
├── security-headers.json              # HTTP security headers
├── .htaccess                          # Apache server configuration
├── nginx.conf                         # Nginx server configuration
├── dino-overlay-0.1.0.js              # Main widget bundle
├── dino-overlay-0.1.0.js.map          # Source map for debugging
├── dino-overlay-loader.min-0.1.0.js   # Minified loader script
└── examples/                          # Framework-specific examples
    ├── shopify-integration.liquid     # Shopify Liquid template
    ├── squarespace-integration.html   # Squarespace integration
    ├── webflow-integration.html       # Webflow integration
    └── drupal-integration.php         # Drupal module
```

## 🚀 Quick Start

### Basic Integration

Add this script tag to your website's `<head>` section:

```html
<script 
  src="https://cdn.dinooverlay.com/v1/dino-overlay-loader-0.1.0.min.js"
  integrity="sha384-badg/rnYoXzABqabanZK6jAmk5W5ur6718ZERBWPIcuKMywg6T1WggrO5Fz2BbVu"
  crossorigin="anonymous"
  async>
</script>

<script>
  window.DinoOverlayConfig = {
    apiKey: 'your-api-key-here',
    apiEndpoint: 'https://api.dinooverlay.com'
  };
</script>
```

### Add Editable Images

Add the `editable-room` class to any images you want to make editable:

```html
<img src="room-image.jpg" 
     alt="Living Room" 
     class="editable-room"
     data-room-type="living-room" />
```

## 📊 Bundle Information

| File | Size | Compressed | Purpose |
|------|------|------------|---------|
| `dino-overlay-0.1.0.js` | 110KB | 25KB (gzip) | Main widget bundle |
| `dino-overlay-loader.min-0.1.0.js` | 4KB | 1.5KB (gzip) | CDN loader script |
| **Total** | **114KB** | **26.5KB** | Complete system |

## 🔒 Security Features

### Subresource Integrity (SRI)

All files include SHA-384 integrity hashes:

```html
integrity="sha384-badg/rnYoXzABqabanZK6jAmk5W5ur6718ZERBWPIcuKMywg6T1WggrO5Fz2BbVu"
```

### Content Security Policy

Recommended CSP headers:

```http
Content-Security-Policy: script-src 'self' https://cdn.dinooverlay.com https://backup-cdn.dinooverlay.com; connect-src 'self' https://api.dinooverlay.com; img-src 'self' data: https://api.dinooverlay.com;
```

### HTTPS Only

All CDN endpoints use HTTPS with modern TLS encryption.

## 🌐 CDN Endpoints

### Primary CDN (CloudFlare)
- **URL**: `https://cdn.dinooverlay.com/v1/`
- **Features**: Global edge caching, DDoS protection, Brotli compression
- **Uptime**: 99.99% SLA

### Fallback CDN (AWS CloudFront)
- **URL**: `https://backup-cdn.dinooverlay.com/v1/`
- **Features**: Origin failover, real-time logs, edge computing
- **Uptime**: 99.99% SLA

## ⚡ Performance

### Load Times
- **First Load**: < 2 seconds on 3G
- **Cached Load**: < 500ms
- **Time to Interactive**: < 3 seconds

### Optimization Features
- Gzip/Brotli compression
- HTTP/2 support
- Global edge caching
- Immutable cache headers (1 year)

## 🔧 Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | string | required | Your DinoOverlay API key |
| `apiEndpoint` | string | `https://api.dinooverlay.com` | API endpoint URL |
| `theme` | string | `auto` | Theme: `light`, `dark`, or `auto` |
| `enableAnalytics` | boolean | `true` | Enable usage analytics |
| `debug` | boolean | `false` | Enable debug logging |
| `customActions` | array | `[]` | Custom quick action buttons |
| `localFallback` | string | `null` | Local fallback script URL |

### Example Configuration

```javascript
window.DinoOverlayConfig = {
  apiKey: 'your-api-key',
  apiEndpoint: 'https://api.dinooverlay.com',
  theme: 'auto',
  enableAnalytics: true,
  debug: false,
  customActions: [
    { 
      id: 'modern', 
      label: 'Modern Style', 
      prompt: 'Apply modern minimalist styling' 
    },
    { 
      id: 'luxury', 
      label: 'Luxury Look', 
      prompt: 'Apply luxury high-end styling' 
    }
  ]
};
```

## 🖼️ Image Requirements

### Supported Formats
- JPEG (.jpg, .jpeg)
- PNG (.png)
- WebP (.webp)
- SVG (.svg) - limited support

### Size Limits
- **Maximum**: 10MB per image
- **Recommended**: 2MB or less
- **Dimensions**: Up to 4096x4096 pixels

### CSS Classes
- **Required**: `editable-room` - Makes image editable
- **Optional**: Custom classes for styling

### Data Attributes
- `data-room-type`: Room type (e.g., "living-room", "kitchen")
- `data-property-id`: Property identifier
- `data-custom-prompt`: Custom editing prompt

## 🌍 Browser Support

| Browser | Version | Support |
|---------|---------|---------|
| Chrome | 80+ | ✅ Full |
| Firefox | 75+ | ✅ Full |
| Safari | 13+ | ✅ Full |
| Edge | 80+ | ✅ Full |
| IE | 11 | ❌ Not supported |

### Required Features
- ES2020 support
- Shadow DOM v1
- CSS Custom Properties
- Fetch API
- Intersection Observer

## 📱 Framework Integration

### WordPress
See `examples/wordpress-integration.php` for complete plugin code.

### React
```jsx
import { useEffect } from 'react';

const DinoOverlayProvider = ({ children, config }) => {
  useEffect(() => {
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
    
    return () => document.head.removeChild(script);
  }, [config]);
  
  return children;
};
```

### Vue.js
```vue
<script>
export default {
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
            apiEndpoint: 'https://api.dinooverlay.com'
          });
        }
      };
      
      document.head.appendChild(script);
    }
  }
};
</script>
```

## 🐛 Troubleshooting

### Common Issues

1. **Script Not Loading**
   - Check CSP headers
   - Verify integrity hash
   - Test fallback CDN

2. **Images Not Detected**
   - Ensure `editable-room` class is present
   - Check image visibility
   - Verify DOM is loaded

3. **API Errors**
   - Validate API key
   - Check CORS settings
   - Monitor rate limits

### Debug Mode

Enable debug logging:

```javascript
window.DinoOverlayConfig = {
  apiKey: 'your-api-key',
  debug: true
};
```

### Health Check

Test CDN availability:

```bash
curl -I https://cdn.dinooverlay.com/v1/dino-overlay-0.1.0.js
```

## 📞 Support

### Resources
- **Documentation**: https://docs.dinooverlay.com
- **API Reference**: https://docs.dinooverlay.com/api
- **Status Page**: https://status.dinooverlay.com

### Contact
- **Support**: support@dinooverlay.com
- **Emergency**: emergency@dinooverlay.com
- **GitHub**: https://github.com/dinooverlay/widget

## 📝 Changelog

### Version 0.1.0 (Current)
- Initial CDN release
- Dual CDN setup with failover
- Framework integration examples
- Comprehensive security configuration
- Performance optimization
- Error handling and monitoring

## 📄 License

Copyright (c) 2024 DinoOverlay. All rights reserved.

This software is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.