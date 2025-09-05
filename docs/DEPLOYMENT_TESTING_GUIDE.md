# DinoOverlay Deployment Testing Guide

## Overview

This guide provides comprehensive instructions for testing the DinoOverlay system integration and deployment across various real estate platforms and environments.

## Table of Contents

1. [Pre-Deployment Testing](#pre-deployment-testing)
2. [Integration Testing](#integration-testing)
3. [Performance Testing](#performance-testing)
4. [Security Testing](#security-testing)
5. [Cross-Browser Testing](#cross-browser-testing)
6. [CDN Deployment Testing](#cdn-deployment-testing)
7. [API Integration Testing](#api-integration-testing)
8. [Troubleshooting](#troubleshooting)
9. [Deployment Checklist](#deployment-checklist)

## Pre-Deployment Testing

### Build Verification

Before deployment, ensure all build artifacts are properly generated:

```bash
# Build the widget
npm run build:widget

# Build CDN-ready files
npm run build:cdn

# Generate security artifacts
npm run build:security

# Complete production build
npm run build:production
```

### File Integrity Check

Verify all required files are present and have correct integrity hashes:

```bash
# Run CDN verification script
node cdn/verify-integration.js

# Check file sizes
npm run test:bundle-size

# Verify integrity hashes
node scripts/generate-integrity.js --verify
```

### Local Testing

Test the widget locally before CDN deployment:

```bash
# Start local test server
npm run dev

# Run comprehensive test suite
npm run test:comprehensive

# Test specific components
npm run test:unit
npm run test:integration
npm run test:e2e
```

## Integration Testing

### Real Estate Platform Testing

Test integration with various real estate platforms:

#### WordPress Integration

```bash
# Test WordPress compatibility
npm run test -- test/integration/real-estate-integration.test.ts --grep "WordPress"

# Manual testing steps:
# 1. Install on WordPress test site
# 2. Add script to theme header
# 3. Add .editable-room class to property images
# 4. Verify overlay functionality
```

#### React Application Integration

```bash
# Test React compatibility
npm run test -- test/integration/real-estate-integration.test.ts --grep "React"

# Manual testing:
# 1. Add script to React app's public/index.html
# 2. Ensure no virtual DOM conflicts
# 3. Test dynamic content updates
# 4. Verify state management isolation
```

#### Vue.js Integration

```bash
# Test Vue compatibility
npm run test -- test/integration/real-estate-integration.test.ts --grep "Vue"

# Manual testing:
# 1. Add script to Vue app template
# 2. Test component lifecycle compatibility
# 3. Verify reactive data handling
# 4. Check for style conflicts
```

#### Plain HTML Sites

```bash
# Test vanilla HTML compatibility
npm run test -- test/integration/real-estate-integration.test.ts --grep "Vanilla"

# Manual testing:
# 1. Add script tag to HTML head
# 2. Test with various CSS frameworks
# 3. Verify jQuery compatibility
# 4. Check mobile responsiveness
```

### Framework Compatibility Matrix

| Platform | Status | Notes |
|----------|--------|-------|
| WordPress | ✅ | Tested with popular themes |
| React | ✅ | No virtual DOM conflicts |
| Vue.js | ✅ | Compatible with Vue 2 & 3 |
| Angular | ✅ | Tested with Angular 12+ |
| Shopify | ✅ | Liquid template compatible |
| Squarespace | ✅ | Code injection method |
| Webflow | ✅ | Custom code embed |
| Plain HTML | ✅ | Universal compatibility |

## Performance Testing

### Bundle Size Testing

```bash
# Test bundle size requirements
npm run test:bundle-size

# Analyze bundle composition
npm run analyze:bundle

# Expected results:
# - Main bundle: < 200KB
# - Loader script: < 10KB
# - Total size: < 210KB
```

### Load Time Testing

```bash
# Test load performance
npm run test:performance

# Expected metrics:
# - Initial load: < 2 seconds
# - First Contentful Paint: < 1.5 seconds
# - Time to Interactive: < 3 seconds
```

### Memory Usage Testing

```bash
# Test memory consumption
npm run test -- test/performance/memory-usage.test.ts

# Expected limits:
# - Initial memory: < 10MB
# - Peak usage: < 50MB
# - Memory leaks: None detected
```

### Network Performance

Test performance under various network conditions:

```bash
# Simulate slow 3G
npm run test:e2e -- --grep "slow network"

# Test with network throttling
# Expected: Graceful degradation, no timeouts
```

## Security Testing

### Content Security Policy (CSP)

```bash
# Test CSP compliance
npm run test -- test/security/csp-compliance.test.ts

# Verify CSP headers:
# - script-src: 'self' https://cdn.dinooverlay.com
# - connect-src: 'self' https://api.dinooverlay.com
# - img-src: 'self' data: https://api.dinooverlay.com
```

### Subresource Integrity (SRI)

```bash
# Verify SRI hashes
node cdn/verify-integration.js

# Check integrity manifest
cat cdn/integrity-manifest.json

# Expected: All files have valid SHA-384 hashes
```

### Input Sanitization

```bash
# Test XSS prevention
npm run test -- test/security/xss-prevention.test.ts

# Test injection attacks
npm run test -- test/security/injection-attacks.test.ts
```

### HTTPS Enforcement

```bash
# Verify HTTPS-only resources
npm run test -- test/security/https-enforcement.test.ts

# Check security headers
curl -I https://cdn.dinooverlay.com/v1/dino-overlay-0.1.0.js
```

## Cross-Browser Testing

### Automated Cross-Browser Tests

```bash
# Run cross-browser compatibility tests
npm run test:e2e:cross-browser

# Test specific browsers
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Manual Browser Testing

Test manually on these browser/device combinations:

#### Desktop Browsers
- Chrome 90+ (Windows, macOS, Linux)
- Firefox 88+ (Windows, macOS, Linux)
- Safari 14+ (macOS)
- Edge 90+ (Windows)

#### Mobile Browsers
- Chrome Mobile (Android 8+)
- Safari Mobile (iOS 13+)
- Samsung Internet (Android)
- Firefox Mobile (Android)

#### Testing Checklist per Browser
- [ ] Script loads without errors
- [ ] Overlay renders correctly
- [ ] Image detection works
- [ ] Sidebar animations smooth
- [ ] Chat interface functional
- [ ] API calls successful
- [ ] Error handling works
- [ ] Performance acceptable

## CDN Deployment Testing

### CDN Functionality Tests

```bash
# Test CDN deployment
npm run test -- test/integration/cdn-deployment.test.ts

# Verify CDN endpoints
curl -I https://cdn.dinooverlay.com/v1/dino-overlay-0.1.0.js
curl -I https://backup-cdn.dinooverlay.com/v1/dino-overlay-0.1.0.js
```

### Failover Testing

```bash
# Test primary CDN failure
npm run test -- test/integration/cdn-deployment.test.ts --grep "fallback"

# Manual failover test:
# 1. Block primary CDN in browser
# 2. Reload test page
# 3. Verify fallback CDN loads
# 4. Confirm overlay still works
```

### Cache Testing

```bash
# Test cache headers
curl -I https://cdn.dinooverlay.com/v1/dino-overlay-0.1.0.js

# Expected headers:
# Cache-Control: public, max-age=31536000, immutable
# ETag: "sha384-hash"
# Last-Modified: [timestamp]
```

### Geographic Distribution

Test CDN performance from different regions:

```bash
# Test from multiple locations
# Use tools like GTmetrix, Pingdom, or WebPageTest

# Expected results:
# - Global load time: < 3 seconds
# - CDN hit rate: > 95%
# - Geographic latency: < 200ms
```

## API Integration Testing

### API Endpoint Testing

```bash
# Test API integration
npm run test -- test/integration/api-workflow.test.ts

# Test specific endpoints
npm run test:api

# Expected functionality:
# - Image editing API
# - Chat message API
# - Error handling
# - Rate limiting
# - Authentication
```

### AI Processing Workflow

```bash
# Test complete AI workflow
npm run test -- test/integration/api-workflow.test.ts --grep "workflow"

# Manual AI testing:
# 1. Select room image
# 2. Apply quick action
# 3. Verify processing indicator
# 4. Check result image quality
# 5. Test chat interface
# 6. Verify conversation context
```

### Error Scenarios

Test various error conditions:

```bash
# Test error handling
npm run test -- test/integration/api-workflow.test.ts --grep "error"

# Error scenarios to test:
# - Network timeouts
# - Server errors (500)
# - Rate limiting (429)
# - Invalid images (400)
# - Authentication failures (401)
```

## Troubleshooting

### Common Issues and Solutions

#### Script Loading Issues

**Problem**: Script fails to load from CDN
```bash
# Check CDN status
curl -I https://cdn.dinooverlay.com/health

# Verify DNS resolution
nslookup cdn.dinooverlay.com

# Test fallback CDN
curl -I https://backup-cdn.dinooverlay.com/v1/dino-overlay-0.1.0.js
```

**Solution**: 
1. Check CDN provider status
2. Verify DNS configuration
3. Test fallback mechanism
4. Check firewall/proxy settings

#### Image Detection Problems

**Problem**: Images not detected or overlay not appearing
```javascript
// Debug image detection
console.log('Editable images:', document.querySelectorAll('.editable-room'));

// Check Shadow DOM
console.log('Overlay container:', document.getElementById('dino-overlay-container'));
```

**Solution**:
1. Verify `.editable-room` class is applied
2. Check for CSS conflicts
3. Ensure images are loaded
4. Verify Shadow DOM creation

#### API Communication Issues

**Problem**: API calls failing or timing out
```bash
# Test API endpoints directly
curl -X POST https://api.dinooverlay.com/overlay/edit-image \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{"test": true}'
```

**Solution**:
1. Verify API key validity
2. Check CORS configuration
3. Test network connectivity
4. Review rate limiting

#### Performance Issues

**Problem**: Slow loading or poor performance
```bash
# Analyze performance
npm run test:performance

# Check bundle size
npm run analyze:bundle

# Profile memory usage
npm run test -- test/performance/memory-usage.test.ts
```

**Solution**:
1. Optimize bundle size
2. Enable compression
3. Use CDN caching
4. Minimize API calls

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

Monitor system health:

```bash
# Check all system components
node scripts/health-check.js

# Monitor CDN status
curl https://status.dinooverlay.com/api/status

# Check API health
curl https://api.dinooverlay.com/health
```

## Deployment Checklist

### Pre-Deployment

- [ ] All tests passing
- [ ] Bundle size within limits
- [ ] Security scan completed
- [ ] Performance benchmarks met
- [ ] Cross-browser testing done
- [ ] Documentation updated
- [ ] Rollback plan prepared

### Deployment Steps

1. **Build and Verify**
   ```bash
   npm run build:production
   npm run test:comprehensive
   node cdn/verify-integration.js
   ```

2. **Deploy to Staging**
   ```bash
   npm run deploy:staging
   npm run test:staging
   ```

3. **Deploy to Production**
   ```bash
   npm run deploy:cdn
   npm run verify:production
   ```

4. **Post-Deployment Verification**
   ```bash
   npm run test:production
   npm run monitor:start
   ```

### Post-Deployment

- [ ] CDN deployment verified
- [ ] API endpoints responding
- [ ] Monitoring alerts configured
- [ ] Performance metrics baseline
- [ ] Error tracking active
- [ ] Documentation published
- [ ] Team notified

### Rollback Procedure

If issues are detected:

```bash
# Immediate rollback
npm run rollback:cdn [previous-version]

# Verify rollback
npm run test:production

# Monitor for stability
npm run monitor:check
```

## Monitoring and Maintenance

### Continuous Monitoring

Set up monitoring for:
- CDN availability and performance
- API response times and error rates
- Bundle size and load times
- User interaction metrics
- Error frequency and types

### Regular Testing

Schedule regular tests:
- Daily: Smoke tests
- Weekly: Full integration tests
- Monthly: Performance benchmarks
- Quarterly: Security audits

### Update Procedures

For updates and patches:
1. Test in development environment
2. Deploy to staging
3. Run full test suite
4. Deploy to production with monitoring
5. Verify deployment success
6. Update documentation

## Support and Resources

### Documentation
- [API Documentation](https://docs.dinooverlay.com/api)
- [Integration Guide](https://docs.dinooverlay.com/integration)
- [Troubleshooting Guide](https://docs.dinooverlay.com/troubleshooting)

### Support Channels
- Technical Support: support@dinooverlay.com
- Emergency Contact: emergency@dinooverlay.com
- GitHub Issues: https://github.com/dinooverlay/widget/issues

### Status and Monitoring
- Status Page: https://status.dinooverlay.com
- Performance Dashboard: https://metrics.dinooverlay.com
- Error Tracking: https://errors.dinooverlay.com