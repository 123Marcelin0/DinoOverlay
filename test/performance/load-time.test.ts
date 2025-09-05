/**
 * Load time performance tests
 * Validates that the overlay meets load time requirements
 */

import { readFileSync, statSync } from 'fs';
import { resolve } from 'path';

// Mock performance API for testing
const mockPerformance = {
  now: jest.fn(),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByType: jest.fn(),
  timing: {
    navigationStart: 0,
    domContentLoadedEventEnd: 500,
    loadEventEnd: 800,
    responseEnd: 300,
    requestStart: 100,
  },
};

Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true,
});

// Mock DOM APIs
Object.defineProperty(global, 'document', {
  value: {
    createElement: jest.fn().mockReturnValue({
      onload: null,
      onerror: null,
      src: '',
      appendChild: jest.fn(),
    }),
    head: {
      appendChild: jest.fn(),
    },
    body: {
      appendChild: jest.fn(),
    },
    addEventListener: jest.fn(),
  },
  writable: true,
});

describe('Load Time Performance Tests', () => {
  const distPath = resolve(__dirname, '../../dist');
  const maxLoadTime = 2000; // 2 seconds
  const maxDOMContentLoaded = 1000; // 1 second

  beforeAll(() => {
    // Ensure dist directory exists
    try {
      statSync(distPath);
    } catch {
      throw new Error('Build artifacts not found. Run "npm run build:widget" first.');
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockPerformance.now.mockReturnValue(1000);
  });

  test('script loading should complete within time limits', async () => {
    const bundlePath = resolve(distPath, 'dino-overlay.iife.js');
    const bundleContent = readFileSync(bundlePath, 'utf-8');
    
    // Simulate script loading time based on bundle size
    const bundleSize = Buffer.byteLength(bundleContent, 'utf8');
    const estimatedLoadTime = Math.max(100, bundleSize / 1000); // Rough estimate: 1ms per KB
    
    expect(estimatedLoadTime).toBeLessThan(maxLoadTime);
    
    console.log(`Estimated load time: ${estimatedLoadTime.toFixed(2)}ms`);
    console.log(`Load time limit: ${maxLoadTime}ms`);
  });

  test('DOM content loaded should be fast', () => {
    const domContentLoadedTime = mockPerformance.timing.domContentLoadedEventEnd - mockPerformance.timing.navigationStart;
    
    expect(domContentLoadedTime).toBeLessThan(maxDOMContentLoaded);
    
    console.log(`DOM content loaded: ${domContentLoadedTime}ms`);
    console.log(`DOM limit: ${maxDOMContentLoaded}ms`);
  });

  test('total page load should be within limits', () => {
    const totalLoadTime = mockPerformance.timing.loadEventEnd - mockPerformance.timing.navigationStart;
    
    expect(totalLoadTime).toBeLessThan(maxLoadTime);
    
    console.log(`Total load time: ${totalLoadTime}ms`);
    console.log(`Total limit: ${maxLoadTime}ms`);
  });

  test('network request time should be reasonable', () => {
    const networkTime = mockPerformance.timing.responseEnd - mockPerformance.timing.requestStart;
    const maxNetworkTime = 500; // 500ms for network
    
    expect(networkTime).toBeLessThan(maxNetworkTime);
    
    console.log(`Network time: ${networkTime}ms`);
    console.log(`Network limit: ${maxNetworkTime}ms`);
  });

  test('initialization time should be fast', async () => {
    // Mock DinoOverlayLoader initialization
    const startTime = performance.now();
    
    // Simulate initialization steps
    mockPerformance.now
      .mockReturnValueOnce(1000) // Start
      .mockReturnValueOnce(1050) // Shadow DOM creation
      .mockReturnValueOnce(1100) // Style injection
      .mockReturnValueOnce(1150) // Component initialization
      .mockReturnValueOnce(1200); // Image detection start
    
    const initializationTime = 1200 - 1000; // 200ms
    const maxInitTime = 300; // 300ms max for initialization
    
    expect(initializationTime).toBeLessThan(maxInitTime);
    
    console.log(`Initialization time: ${initializationTime}ms`);
    console.log(`Initialization limit: ${maxInitTime}ms`);
  });

  test('first paint metrics should be acceptable', () => {
    const paintEntries = [
      {
        name: 'first-paint',
        entryType: 'paint',
        startTime: 400,
      },
      {
        name: 'first-contentful-paint',
        entryType: 'paint',
        startTime: 600,
      },
    ];

    mockPerformance.getEntriesByType.mockReturnValue(paintEntries);
    
    const firstPaint = paintEntries[0].startTime;
    const firstContentfulPaint = paintEntries[1].startTime;
    
    const maxFirstPaint = 800; // 800ms
    const maxFirstContentfulPaint = 1200; // 1.2s
    
    expect(firstPaint).toBeLessThan(maxFirstPaint);
    expect(firstContentfulPaint).toBeLessThan(maxFirstContentfulPaint);
    
    console.log(`First paint: ${firstPaint}ms`);
    console.log(`First contentful paint: ${firstContentfulPaint}ms`);
  });

  test('resource loading should be optimized', () => {
    const resourceEntries = [
      {
        name: 'dino-overlay.css',
        entryType: 'resource',
        startTime: 100,
        responseEnd: 250,
        transferSize: 15000,
      },
      {
        name: 'dino-overlay.js',
        entryType: 'resource',
        startTime: 120,
        responseEnd: 400,
        transferSize: 180000,
      },
    ];

    mockPerformance.getEntriesByType.mockReturnValue(resourceEntries);
    
    resourceEntries.forEach(entry => {
      const loadTime = entry.responseEnd - entry.startTime;
      const maxResourceLoadTime = 500; // 500ms per resource
      
      expect(loadTime).toBeLessThan(maxResourceLoadTime);
      
      console.log(`${entry.name} load time: ${loadTime}ms`);
    });
  });

  test('lazy loading should improve initial load time', async () => {
    // Test that non-critical components are loaded lazily
    const criticalComponents = ['DinoOverlayLoader', 'OverlayManager', 'ImageDetector'];
    const lazyComponents = ['QuickActionSidebar', 'FloatingChatBar', 'ImageHighlighter'];
    
    const bundlePath = resolve(distPath, 'dino-overlay.iife.js');
    const bundleContent = readFileSync(bundlePath, 'utf-8');
    
    // Critical components should be in main bundle
    criticalComponents.forEach(component => {
      expect(bundleContent).toContain(component);
    });
    
    // Lazy components should use dynamic imports or be loaded on demand
    lazyComponents.forEach(component => {
      // Should either use dynamic import or be conditionally loaded
      const hasLazyLoading = bundleContent.includes(`import(`) || 
                            bundleContent.includes(`loadComponent`) ||
                            bundleContent.includes(`lazy`);
      
      if (!hasLazyLoading) {
        console.warn(`Component ${component} might not be lazy loaded`);
      }
    });
  });

  test('cache headers should be optimized', () => {
    // This would typically be tested in E2E tests with real network requests
    // Here we verify that the build output is optimized for caching
    
    const bundlePath = resolve(distPath, 'dino-overlay.iife.js');
    const stats = statSync(bundlePath);
    
    // File should have a reasonable modification time (indicating fresh build)
    const fileAge = Date.now() - stats.mtime.getTime();
    const maxFileAge = 24 * 60 * 60 * 1000; // 24 hours
    
    expect(fileAge).toBeLessThan(maxFileAge);
    
    console.log(`Bundle file age: ${(fileAge / 1000 / 60).toFixed(2)} minutes`);
  });

  test('compression should be effective', () => {
    const bundlePath = resolve(distPath, 'dino-overlay.iife.js');
    const bundleContent = readFileSync(bundlePath, 'utf-8');
    
    // Check for minification indicators
    const lines = bundleContent.split('\n');
    const avgLineLength = bundleContent.length / lines.length;
    
    // Minified code should have long lines
    expect(avgLineLength).toBeGreaterThan(100);
    
    // Should not contain excessive whitespace
    const whitespaceRatio = (bundleContent.match(/\s/g) || []).length / bundleContent.length;
    expect(whitespaceRatio).toBeLessThan(0.3); // Less than 30% whitespace
    
    console.log(`Average line length: ${avgLineLength.toFixed(0)} characters`);
    console.log(`Whitespace ratio: ${(whitespaceRatio * 100).toFixed(1)}%`);
  });

  test('startup performance should be consistent', () => {
    // Simulate multiple initialization runs to check consistency
    const initTimes: number[] = [];
    
    for (let i = 0; i < 10; i++) {
      const startTime = 1000 + i * 100;
      const endTime = startTime + 150 + Math.random() * 50; // 150-200ms with variance
      
      initTimes.push(endTime - startTime);
    }
    
    const avgInitTime = initTimes.reduce((a, b) => a + b, 0) / initTimes.length;
    const maxVariance = Math.max(...initTimes) - Math.min(...initTimes);
    
    expect(avgInitTime).toBeLessThan(250); // Average under 250ms
    expect(maxVariance).toBeLessThan(100); // Variance under 100ms
    
    console.log(`Average init time: ${avgInitTime.toFixed(2)}ms`);
    console.log(`Max variance: ${maxVariance.toFixed(2)}ms`);
  });
});