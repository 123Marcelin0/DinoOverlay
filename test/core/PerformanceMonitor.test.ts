import { PerformanceMonitor } from '../../src/core/PerformanceMonitor';

// Mock performance API
const mockPerformance = {
  now: jest.fn(),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByType: jest.fn(),
  getEntriesByName: jest.fn(),
  clearMarks: jest.fn(),
  clearMeasures: jest.fn(),
  observer: null as any,
};

// Mock PerformanceObserver
class MockPerformanceObserver {
  private callback: (list: any) => void;
  
  constructor(callback: (list: any) => void) {
    this.callback = callback;
    mockPerformance.observer = this;
  }
  
  observe = jest.fn();
  disconnect = jest.fn();
  
  // Helper method to simulate performance entries
  simulateEntries(entries: any[]) {
    this.callback({
      getEntries: () => entries,
      getEntriesByType: (type: string) => entries.filter(e => e.entryType === type),
      getEntriesByName: (name: string) => entries.filter(e => e.name === name),
    });
  }
}

Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true,
});

Object.defineProperty(global, 'PerformanceObserver', {
  value: MockPerformanceObserver,
  writable: true,
});

describe('PerformanceMonitor', () => {
  let performanceMonitor: PerformanceMonitor;

  beforeEach(() => {
    performanceMonitor = new PerformanceMonitor();
    jest.clearAllMocks();
    mockPerformance.now.mockReturnValue(1000);
  });

  afterEach(() => {
    performanceMonitor.destroy();
  });

  describe('Initialization', () => {
    it('should initialize performance monitoring', () => {
      performanceMonitor.initialize();
      
      expect(mockPerformance.observer.observe).toHaveBeenCalledWith({
        entryTypes: ['measure', 'navigation', 'resource', 'paint']
      });
    });

    it('should handle missing PerformanceObserver gracefully', () => {
      const originalPerformanceObserver = global.PerformanceObserver;
      delete (global as any).PerformanceObserver;
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      performanceMonitor.initialize();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[PerformanceMonitor] PerformanceObserver not supported'
      );
      
      global.PerformanceObserver = originalPerformanceObserver;
      consoleSpy.mockRestore();
    });
  });

  describe('Timing Measurements', () => {
    beforeEach(() => {
      performanceMonitor.initialize();
    });

    it('should start and end timing measurements', () => {
      mockPerformance.now
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(1500);

      performanceMonitor.startTiming('test-operation');
      performanceMonitor.endTiming('test-operation');
      
      expect(mockPerformance.mark).toHaveBeenCalledWith('test-operation-start');
      expect(mockPerformance.mark).toHaveBeenCalledWith('test-operation-end');
      expect(mockPerformance.measure).toHaveBeenCalledWith(
        'test-operation',
        'test-operation-start',
        'test-operation-end'
      );
    });

    it('should handle timing errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockPerformance.measure.mockImplementation(() => {
        throw new Error('Measure failed');
      });

      performanceMonitor.startTiming('test-operation');
      performanceMonitor.endTiming('test-operation');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[PerformanceMonitor] Error measuring test-operation:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should warn when ending timing without start', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      performanceMonitor.endTiming('non-existent-operation');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[PerformanceMonitor] No start mark found for non-existent-operation'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Metrics Collection', () => {
    beforeEach(() => {
      performanceMonitor.initialize();
    });

    it('should collect bundle load metrics', () => {
      const bundleEntries = [
        {
          name: 'dino-overlay.js',
          entryType: 'resource',
          startTime: 100,
          responseEnd: 300,
          transferSize: 50000,
          encodedBodySize: 45000,
          decodedBodySize: 120000,
        }
      ];

      mockPerformance.observer.simulateEntries(bundleEntries);
      
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.bundleLoadTime).toBe(200);
      expect(metrics.bundleSize).toBe(50000);
    });

    it('should collect paint metrics', () => {
      const paintEntries = [
        {
          name: 'first-contentful-paint',
          entryType: 'paint',
          startTime: 500,
        },
        {
          name: 'largest-contentful-paint',
          entryType: 'largest-contentful-paint',
          startTime: 800,
        }
      ];

      mockPerformance.observer.simulateEntries(paintEntries);
      
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.firstContentfulPaint).toBe(500);
      expect(metrics.largestContentfulPaint).toBe(800);
    });

    it('should collect custom timing metrics', () => {
      mockPerformance.now
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(1200);

      performanceMonitor.startTiming('image-detection');
      performanceMonitor.endTiming('image-detection');

      const customEntries = [
        {
          name: 'image-detection',
          entryType: 'measure',
          duration: 200,
        }
      ];

      mockPerformance.observer.simulateEntries(customEntries);
      
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.customTimings['image-detection']).toBe(200);
    });
  });

  describe('Performance Thresholds', () => {
    beforeEach(() => {
      performanceMonitor.initialize();
    });

    it('should detect slow operations', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const slowEntries = [
        {
          name: 'slow-operation',
          entryType: 'measure',
          duration: 2000, // 2 seconds
        }
      ];

      mockPerformance.observer.simulateEntries(slowEntries);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[PerformanceMonitor] Slow operation detected: slow-operation (2000ms)'
      );

      consoleSpy.mockRestore();
    });

    it('should detect large bundle sizes', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const largeBundle = [
        {
          name: 'dino-overlay.js',
          entryType: 'resource',
          transferSize: 300000, // 300KB
        }
      ];

      mockPerformance.observer.simulateEntries(largeBundle);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[PerformanceMonitor] Large bundle detected: 300000 bytes'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Memory Monitoring', () => {
    beforeEach(() => {
      performanceMonitor.initialize();
    });

    it('should collect memory usage when available', () => {
      const mockMemory = {
        usedJSHeapSize: 10000000,
        totalJSHeapSize: 15000000,
        jsHeapSizeLimit: 50000000,
      };

      Object.defineProperty(performance, 'memory', {
        value: mockMemory,
        configurable: true,
      });

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.memoryUsage).toEqual(mockMemory);
    });

    it('should handle missing memory API', () => {
      Object.defineProperty(performance, 'memory', {
        value: undefined,
        configurable: true,
      });

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.memoryUsage).toBeUndefined();
    });
  });

  describe('Metrics Export', () => {
    beforeEach(() => {
      performanceMonitor.initialize();
    });

    it('should export metrics in correct format', () => {
      const metrics = performanceMonitor.getMetrics();
      
      expect(metrics).toHaveProperty('bundleLoadTime');
      expect(metrics).toHaveProperty('bundleSize');
      expect(metrics).toHaveProperty('firstContentfulPaint');
      expect(metrics).toHaveProperty('largestContentfulPaint');
      expect(metrics).toHaveProperty('customTimings');
      expect(metrics).toHaveProperty('memoryUsage');
      expect(metrics).toHaveProperty('timestamp');
    });

    it('should include timestamp in metrics', () => {
      mockPerformance.now.mockReturnValue(5000);
      
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.timestamp).toBe(5000);
    });
  });

  describe('Cleanup', () => {
    it('should disconnect observer on destroy', () => {
      performanceMonitor.initialize();
      performanceMonitor.destroy();
      
      expect(mockPerformance.observer.disconnect).toHaveBeenCalled();
    });

    it('should clear performance marks and measures', () => {
      performanceMonitor.initialize();
      performanceMonitor.destroy();
      
      expect(mockPerformance.clearMarks).toHaveBeenCalled();
      expect(mockPerformance.clearMeasures).toHaveBeenCalled();
    });

    it('should be safe to call destroy multiple times', () => {
      performanceMonitor.initialize();
      performanceMonitor.destroy();
      performanceMonitor.destroy(); // Should not throw
      
      expect(mockPerformance.observer.disconnect).toHaveBeenCalledTimes(1);
    });
  });
});