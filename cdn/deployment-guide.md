# DinoOverlay CDN Deployment Guide

## Overview

This guide covers the complete deployment process for the DinoOverlay CDN system, including build processes, security configurations, and deployment strategies.

## Build Process

### 1. Widget Build

```bash
# Build the main widget bundle
npm run build:widget

# Build CDN-ready files with loader
npm run build:cdn

# Generate security artifacts
npm run build:security

# Complete production build
npm run build:production
```

### 2. Generated Files

After running the build process, the following files are generated in the `cdn/` directory:

- `dino-overlay-{version}.js` - Main widget bundle
- `dino-overlay-{version}.js.map` - Source map for debugging
- `dino-overlay-loader.min-{version}.js` - Minified loader script
- `integration-examples.md` - Integration documentation
- `cdn-config.json` - Deployment configuration
- `integrity-manifest.json` - Security hashes
- `csp-config.json` - Content Security Policy configuration
- `security-headers.json` - HTTP security headers
- `.htaccess` - Apache server configuration
- `nginx.conf` - Nginx server configuration

## CDN Configuration

### Primary CDN (CloudFlare)

```json
{
  "name": "CloudFlare",
  "endpoint": "https://api.cloudflare.com/client/v4",
  "zone": "your-zone-id",
  "domain": "cdn.dinooverlay.com",
  "features": [
    "Global edge caching",
    "DDoS protection",
    "SSL/TLS encryption",
    "Brotli compression",
    "HTTP/2 support"
  ]
}
```

### Fallback CDN (AWS CloudFront)

```json
{
  "name": "AWS CloudFront",
  "endpoint": "https://cloudfront.amazonaws.com",
  "distributionId": "your-distribution-id",
  "domain": "backup-cdn.dinooverlay.com",
  "features": [
    "Global distribution",
    "Origin failover",
    "Real-time logs",
    "Edge computing",
    "Custom SSL certificates"
  ]
}
```

## Security Configuration

### Content Security Policy (CSP)

```http
Content-Security-Policy: script-src 'self' https://cdn.dinooverlay.com https://backup-cdn.dinooverlay.com; connect-src 'self' https://api.dinooverlay.com; img-src 'self' data: https://api.dinooverlay.com; style-src 'self' 'unsafe-inline'
```

### Subresource Integrity (SRI)

All CDN files include SRI hashes for security:

```html
<script 
  src="https://cdn.dinooverlay.com/v1/dino-overlay-0.1.0.js"
  integrity="sha384-badg/rnYoXzABqabanZK6jAmk5W5ur6718ZERBWPIcuKMywg6T1WggrO5Fz2BbVu"
  crossorigin="anonymous">
</script>
```

### HTTP Security Headers

```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

## Deployment Process

### 1. Environment Setup

```bash
# Set required environment variables
export CLOUDFLARE_ZONE_ID="your-zone-id"
export CLOUDFLARE_API_TOKEN="your-api-token"
export AWS_DISTRIBUTION_ID="your-distribution-id"
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
```

### 2. Deploy to CDN

```bash
# Deploy to both primary and fallback CDNs
npm run deploy:cdn

# Deploy specific version
VERSION=1.0.0 npm run deploy:cdn
```

### 3. Rollback Process

```bash
# Rollback to previous version
npm run rollback:cdn 0.9.0

# List available versions
node scripts/deploy-cdn.js list-versions
```

## Performance Optimization

### Bundle Analysis

```bash
# Analyze bundle size and composition
npm run analyze:bundle

# Generate performance report
npm run test:performance
```

### Caching Strategy

- **Static Assets**: 1 year cache with immutable flag
- **API Responses**: 1 hour cache with validation
- **Configuration Files**: No cache for dynamic updates

### Compression

- **Gzip**: Enabled for all text-based files
- **Brotli**: Enabled for modern browsers
- **Image Optimization**: WebP format with fallbacks

## Monitoring and Analytics

### Performance Metrics

- Bundle size: < 200KB (current: 108KB)
- Load time: < 2 seconds on 3G
- First Contentful Paint: < 1.5 seconds
- Time to Interactive: < 3 seconds

### Error Tracking

```javascript
// Error monitoring integration
window.DinoOverlay.onError = function(error) {
  // Send to monitoring service
  analytics.track('DinoOverlay Error', {
    message: error.message,
    stack: error.stack,
    version: window.DinoOverlay.version
  });
};
```

### Usage Analytics

```javascript
// Track user interactions
window.DinoOverlay.onInteraction = function(event) {
  analytics.track('DinoOverlay Interaction', {
    type: event.type,
    element: event.element,
    timestamp: Date.now()
  });
};
```

## Troubleshooting

### Common Issues

1. **Script Loading Failures**
   - Check CSP headers
   - Verify SRI hash matches
   - Test fallback CDN

2. **API Connection Issues**
   - Validate API key
   - Check CORS configuration
   - Monitor rate limits

3. **Performance Problems**
   - Analyze bundle size
   - Check network conditions
   - Review caching headers

### Debug Mode

Enable debug mode for detailed logging:

```javascript
DinoOverlayLoader.init({
  apiKey: 'your-api-key',
  debug: true,
  logLevel: 'verbose'
});
```

### Health Checks

```bash
# Check CDN health
curl -I https://cdn.dinooverlay.com/v1/dino-overlay-0.1.0.js

# Verify integrity
node scripts/verify-integrity.js
```

## Version Management

### Semantic Versioning

- **Major**: Breaking changes (1.0.0 → 2.0.0)
- **Minor**: New features (1.0.0 → 1.1.0)
- **Patch**: Bug fixes (1.0.0 → 1.0.1)

### Release Process

1. Update version in `package.json`
2. Run comprehensive tests
3. Build production assets
4. Deploy to staging CDN
5. Perform integration tests
6. Deploy to production CDN
7. Update documentation
8. Create release notes

### Backward Compatibility

- Support previous major version for 6 months
- Provide migration guides for breaking changes
- Maintain API compatibility within major versions

## Integration Testing

### Automated Tests

```bash
# Run comprehensive test suite
npm run test:comprehensive

# Test CDN integration
npm run test:cdn-integration

# Cross-browser testing
npm run test:e2e:cross-browser
```

### Manual Testing Checklist

- [ ] Script loads from primary CDN
- [ ] Fallback CDN works when primary fails
- [ ] SRI verification passes
- [ ] Images are detected correctly
- [ ] Overlay UI renders properly
- [ ] API communication works
- [ ] Error handling functions
- [ ] Performance meets targets

## Support and Documentation

### Resources

- **API Documentation**: https://docs.dinooverlay.com/api
- **Integration Guide**: https://docs.dinooverlay.com/integration
- **Troubleshooting**: https://docs.dinooverlay.com/troubleshooting
- **Status Page**: https://status.dinooverlay.com

### Contact

- **Technical Support**: support@dinooverlay.com
- **Emergency Contact**: emergency@dinooverlay.com
- **GitHub Issues**: https://github.com/dinooverlay/widget/issues

## Changelog

### Version 0.1.0 (Current)

- Initial CDN deployment system
- Dual CDN setup with failover
- Comprehensive security configuration
- Framework integration examples
- Performance optimization
- Error handling and monitoring