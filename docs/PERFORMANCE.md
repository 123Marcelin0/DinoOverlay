# DinoOverlay Performance Guide

This document outlines the performance optimization features implemented in the DinoOverlay widget system.

## Bundle Optimization

### Tree Shaking
The build system automatically removes unused code through aggressive tree shaking:
- Removes unused exports and imports
- Eliminates dead code paths
- Optimizes module side effects

### Code Splitting
Components are split into lazy-loadable chunks:
- Core components load immediately
- Advanced features load on demand
- Non-critical utilities are deferred

### Minification
Production builds are heavily optimized:
- Variable name mangling
- Dead code elimination
- Console statement removal
- Comment stripping

## Performance Monitoring

### Metrics Tracked
- **Load Time**: Time from script injection to full initialization
- **Bundle Size**: Raw and gzipped bundle sizes
- **API Response Time**: Average response time for backend calls
- **Memory Usage**: JavaScript heap usage monitoring
- **User Engagement**: Interaction tracking and session duration

### Usage
```typescript
import { performanceMonitor } from 'dino-overlay-widget';

// Track custom events
performanceMonitor.trackUserEngagement('imagesSelected', 1);
performanceMonitor.trackApiRequest(responseTime, isError);

// Get current metrics
const metrics = performanceMonitor.getMetrics();
console.log(performanceMonitor.generateReport());
```

## Image Optimization

### WebP Support
Automatic format detection and conversion:
- WebP for supported browsers
- JPEG fallback for older browsers
- Quality optimization based on content

### Lazy Loading
Images load only when needed:
- Intersection Observer API
- Configurable thresholds
- Smooth loading transitions

### Compression
Intelligent image compression:
- Quality-based optimization
- Size constraints
- Format-specific settings

### Usage
```typescript
import { imageOptimizer } from 'dino-overlay-widget';

// Optimize an image
const optimized = await imageOptimizer.optimizeImage(imageElement, {
  quality: 0.8,
  maxWidth: 1920,
  format: 'webp'
});

console.log(`Compression ratio: ${optimized.compressionRatio}`);
```

## Lazy Component Loading

### Component Categories
- **High Priority**: Core overlay components (preloaded)
- **Medium Priority**: Advanced features (loaded on demand)
- **Low Priority**: Utility components (loaded when needed)

### Usage
```typescript
import { lazyComponentLoader } from 'dino-overlay-widget';

// Load a component on demand
const { component, loadTime } = await lazyComponentLoader.loadComponent(
  'quickActionSidebar',
  () => import('./QuickActionSidebar')
);

// Check if component is loaded
if (lazyComponentLoader.isComponentLoaded('themeManager')) {
  // Component is available
}
```

## Performance Configuration

### Default Settings
```typescript
const config = {
  bundleOptimization: {
    maxBundleSize: 200 * 1024, // 200KB
    maxGzipSize: 50 * 1024,    // 50KB
    enableTreeShaking: true,
    enableCodeSplitting: true,
    enableMinification: true
  },
  lazyLoading: {
    enableComponentLazyLoading: true,
    enableImageLazyLoading: true,
    intersectionThreshold: 0.1,
    rootMargin: '50px'
  },
  imageOptimization: {
    enableWebP: true,
    defaultQuality: 0.8,
    maxWidth: 1920,
    maxHeight: 1080
  },
  thresholds: {
    maxLoadTime: 2000,      // 2 seconds
    maxInitTime: 500,       // 500ms
    maxApiResponseTime: 5000, // 5 seconds
    maxMemoryUsage: 50 * 1024 * 1024 // 50MB
  }
};
```

### Custom Configuration
```typescript
import { PerformanceConfigManager } from 'dino-overlay-widget';

const configManager = new PerformanceConfigManager({
  thresholds: {
    maxLoadTime: 1500, // Stricter requirement
    maxBundleSize: 150 * 1024 // Smaller bundle limit
  }
});
```

## Performance Testing

### Bundle Size Tests
```bash
npm run test:bundle-size
```
Validates:
- Bundle size under 200KB
- Gzipped size under 50KB
- No development code in production
- Proper minification
- Source map validity

### Load Time Tests
```bash
npm run test:performance:e2e
```
Validates:
- Widget loads within 2 seconds
- Initialization under 500ms
- Core Web Vitals compliance
- Memory usage stability
- Non-blocking page rendering

### Bundle Analysis
```bash
npm run analyze:bundle
```
Provides:
- Detailed size breakdown
- Compression analysis
- Content validation
- Component verification
- Optimization recommendations

## Performance Thresholds

### Bundle Size
- **Raw Size**: 200KB maximum
- **Gzipped**: 50KB maximum
- **Warning**: 150KB (75% of limit)

### Load Times
- **Initial Load**: 2 seconds maximum
- **Initialization**: 500ms maximum
- **First Paint**: 1 second maximum
- **Largest Contentful Paint**: 2.5 seconds maximum

### Runtime Performance
- **API Response**: 5 seconds maximum
- **Memory Usage**: 50MB maximum
- **Error Rate**: 5% maximum
- **First Input Delay**: 100ms maximum

## Optimization Strategies

### Bundle Size Reduction
1. **Tree Shaking**: Remove unused code
2. **Code Splitting**: Load components on demand
3. **Minification**: Compress and obfuscate code
4. **External Dependencies**: Avoid bundling large libraries

### Load Time Optimization
1. **Async Loading**: Non-blocking script injection
2. **Preloading**: Critical resources loaded early
3. **Caching**: Aggressive browser caching
4. **CDN**: Fast content delivery

### Runtime Performance
1. **Lazy Loading**: Defer non-critical components
2. **Image Optimization**: Compress and convert images
3. **Memory Management**: Clean up unused resources
4. **Event Debouncing**: Reduce excessive event handling

## Monitoring and Debugging

### Development Mode
- Full performance monitoring enabled
- Detailed console logging
- Source maps for debugging
- Unminified code for inspection

### Production Mode
- Sampled monitoring (10% by default)
- Console statements removed
- Minified and optimized code
- Error tracking only

### Performance Dashboard
Access performance metrics through:
```typescript
// Get current performance report
console.log(window.DinoOverlay.performanceMonitor.generateReport());

// Check threshold compliance
const thresholds = performanceConfigManager.validateThresholds(metrics);
```

## Best Practices

### Implementation
1. Always use the performance configuration manager
2. Monitor bundle size during development
3. Test performance on various devices
4. Use lazy loading for non-critical features

### Optimization
1. Regularly run bundle analysis
2. Monitor Core Web Vitals
3. Optimize images before bundling
4. Use appropriate caching strategies

### Monitoring
1. Set up performance alerts
2. Track user engagement metrics
3. Monitor error rates
4. Analyze load time trends

## Troubleshooting

### Large Bundle Size
1. Check for unused dependencies
2. Enable more aggressive tree shaking
3. Split large components
4. Remove development code

### Slow Load Times
1. Optimize image sizes
2. Enable lazy loading
3. Use CDN for delivery
4. Minimize blocking resources

### High Memory Usage
1. Clean up event listeners
2. Remove unused components from cache
3. Optimize image handling
4. Monitor for memory leaks

### Poor Performance Metrics
1. Check network conditions
2. Validate browser compatibility
3. Review component loading strategy
4. Optimize critical rendering path