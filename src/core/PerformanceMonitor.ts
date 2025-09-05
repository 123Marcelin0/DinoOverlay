/**
 * Performance monitoring and metrics collection system
 * Tracks bundle size, load times, API response times, and user engagement
 */

export interface PerformanceMetrics {
  loadTime: number;
  bundleSize: number;
  apiResponseTime: number;
  errorRate: number;
  memoryUsage: number;
  userEngagement: {
    imagesSelected: number;
    actionsTriggered: number;
    chatMessages: number;
    sessionDuration: number;
  };
}

export interface PerformanceThresholds {
  maxLoadTime: number; // 2000ms
  maxBundleSize: number; // 200KB
  maxApiResponseTime: number; // 5000ms
  maxErrorRate: number; // 0.05 (5%)
  maxMemoryUsage: number; // 50MB
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private thresholds: PerformanceThresholds;
  private startTime: number;
  private apiRequestTimes: number[] = [];
  private errorCount: number = 0;
  private totalRequests: number = 0;
  private observers: PerformanceObserver[] = [];

  constructor(thresholds?: Partial<PerformanceThresholds>) {
    this.startTime = performance.now();
    this.thresholds = {
      maxLoadTime: 2000,
      maxBundleSize: 200 * 1024, // 200KB
      maxApiResponseTime: 5000,
      maxErrorRate: 0.05,
      maxMemoryUsage: 50 * 1024 * 1024, // 50MB
      ...thresholds
    };

    this.metrics = {
      loadTime: 0,
      bundleSize: 0,
      apiResponseTime: 0,
      errorRate: 0,
      memoryUsage: 0,
      userEngagement: {
        imagesSelected: 0,
        actionsTriggered: 0,
        chatMessages: 0,
        sessionDuration: 0
      }
    };

    this.initializeMonitoring();
  }

  private initializeMonitoring(): void {
    // Monitor resource loading
    if ('PerformanceObserver' in window) {
      this.setupResourceObserver();
      this.setupNavigationObserver();
      this.setupMemoryObserver();
    }

    // Track initial load time
    if (document.readyState === 'complete') {
      this.calculateLoadTime();
    } else {
      window.addEventListener('load', () => this.calculateLoadTime());
    }
  }

  private setupResourceObserver(): void {
    const resourceObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name.includes('dino-overlay')) {
          this.metrics.bundleSize = (entry as PerformanceResourceTiming).transferSize || 0;
        }
      }
    });

    resourceObserver.observe({ entryTypes: ['resource'] });
    this.observers.push(resourceObserver);
  }

  private setupNavigationObserver(): void {
    const navigationObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const navEntry = entry as PerformanceNavigationTiming;
        this.metrics.loadTime = navEntry.loadEventEnd - navEntry.navigationStart;
      }
    });

    navigationObserver.observe({ entryTypes: ['navigation'] });
    this.observers.push(navigationObserver);
  }

  private setupMemoryObserver(): void {
    // Monitor memory usage if available
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        this.metrics.memoryUsage = memory.usedJSHeapSize;
      }, 5000);
    }
  }

  private calculateLoadTime(): void {
    this.metrics.loadTime = performance.now() - this.startTime;
    this.metrics.userEngagement.sessionDuration = this.metrics.loadTime;
  }

  public trackApiRequest(responseTime: number, isError: boolean = false): void {
    this.apiRequestTimes.push(responseTime);
    this.totalRequests++;
    
    if (isError) {
      this.errorCount++;
    }

    // Calculate average API response time
    this.metrics.apiResponseTime = this.apiRequestTimes.reduce((a, b) => a + b, 0) / this.apiRequestTimes.length;
    
    // Calculate error rate
    this.metrics.errorRate = this.errorCount / this.totalRequests;
  }

  public trackUserEngagement(event: keyof PerformanceMetrics['userEngagement'], increment: number = 1): void {
    if (event === 'sessionDuration') {
      this.metrics.userEngagement.sessionDuration = performance.now() - this.startTime;
    } else {
      this.metrics.userEngagement[event] += increment;
    }
  }

  public getMetrics(): PerformanceMetrics {
    // Update session duration
    this.metrics.userEngagement.sessionDuration = performance.now() - this.startTime;
    return { ...this.metrics };
  }

  public checkThresholds(): { [key: string]: boolean } {
    const results = {
      loadTime: this.metrics.loadTime <= this.thresholds.maxLoadTime,
      bundleSize: this.metrics.bundleSize <= this.thresholds.maxBundleSize,
      apiResponseTime: this.metrics.apiResponseTime <= this.thresholds.maxApiResponseTime,
      errorRate: this.metrics.errorRate <= this.thresholds.maxErrorRate,
      memoryUsage: this.metrics.memoryUsage <= this.thresholds.maxMemoryUsage
    };

    return results;
  }

  public generateReport(): string {
    const metrics = this.getMetrics();
    const thresholdResults = this.checkThresholds();
    
    return `
DinoOverlay Performance Report
=============================
Load Time: ${metrics.loadTime.toFixed(2)}ms ${thresholdResults.loadTime ? '✓' : '✗'}
Bundle Size: ${(metrics.bundleSize / 1024).toFixed(2)}KB ${thresholdResults.bundleSize ? '✓' : '✗'}
API Response Time: ${metrics.apiResponseTime.toFixed(2)}ms ${thresholdResults.apiResponseTime ? '✓' : '✗'}
Error Rate: ${(metrics.errorRate * 100).toFixed(2)}% ${thresholdResults.errorRate ? '✓' : '✗'}
Memory Usage: ${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB ${thresholdResults.memoryUsage ? '✓' : '✗'}

User Engagement:
- Images Selected: ${metrics.userEngagement.imagesSelected}
- Actions Triggered: ${metrics.userEngagement.actionsTriggered}
- Chat Messages: ${metrics.userEngagement.chatMessages}
- Session Duration: ${(metrics.userEngagement.sessionDuration / 1000).toFixed(2)}s
    `.trim();
  }

  public destroy(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();