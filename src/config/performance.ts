/**
 * Performance configuration and optimization settings
 * Centralizes all performance-related configurations
 */

export interface PerformanceConfig {
  bundleOptimization: {
    maxBundleSize: number;
    maxGzipSize: number;
    enableTreeShaking: boolean;
    enableCodeSplitting: boolean;
    enableMinification: boolean;
  };
  lazyLoading: {
    enableComponentLazyLoading: boolean;
    enableImageLazyLoading: boolean;
    intersectionThreshold: number;
    rootMargin: string;
    preloadCriticalComponents: boolean;
  };
  imageOptimization: {
    enableWebP: boolean;
    defaultQuality: number;
    maxWidth: number;
    maxHeight: number;
    enableCompression: boolean;
  };
  monitoring: {
    enablePerformanceMonitoring: boolean;
    enableUserEngagementTracking: boolean;
    enableErrorTracking: boolean;
    sampleRate: number;
  };
  caching: {
    enableComponentCache: boolean;
    enableImageCache: boolean;
    cacheMaxAge: number;
    maxCacheSize: number;
  };
  thresholds: {
    maxLoadTime: number;
    maxInitTime: number;
    maxApiResponseTime: number;
    maxMemoryUsage: number;
    maxErrorRate: number;
  };
}

export const defaultPerformanceConfig: PerformanceConfig = {
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
    rootMargin: '50px',
    preloadCriticalComponents: true
  },
  imageOptimization: {
    enableWebP: true,
    defaultQuality: 0.8,
    maxWidth: 1920,
    maxHeight: 1080,
    enableCompression: true
  },
  monitoring: {
    enablePerformanceMonitoring: true,
    enableUserEngagementTracking: true,
    enableErrorTracking: true,
    sampleRate: 1.0 // 100% sampling in development
  },
  caching: {
    enableComponentCache: true,
    enableImageCache: true,
    cacheMaxAge: 3600000, // 1 hour
    maxCacheSize: 50 * 1024 * 1024 // 50MB
  },
  thresholds: {
    maxLoadTime: 2000,      // 2 seconds
    maxInitTime: 500,       // 500ms
    maxApiResponseTime: 5000, // 5 seconds
    maxMemoryUsage: 50 * 1024 * 1024, // 50MB
    maxErrorRate: 0.05      // 5%
  }
};

export const productionPerformanceConfig: PerformanceConfig = {
  ...defaultPerformanceConfig,
  monitoring: {
    ...defaultPerformanceConfig.monitoring,
    sampleRate: 0.1 // 10% sampling in production
  },
  bundleOptimization: {
    ...defaultPerformanceConfig.bundleOptimization,
    maxBundleSize: 150 * 1024, // Stricter limit for production
    maxGzipSize: 40 * 1024
  }
};

export class PerformanceConfigManager {
  private config: PerformanceConfig;
  private isProduction: boolean;

  constructor(customConfig?: Partial<PerformanceConfig>) {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.config = {
      ...(this.isProduction ? productionPerformanceConfig : defaultPerformanceConfig),
      ...customConfig
    };
  }

  public getConfig(): PerformanceConfig {
    return { ...this.config };
  }

  public updateConfig(updates: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  public getBundleConfig() {
    return this.config.bundleOptimization;
  }

  public getLazyLoadingConfig() {
    return this.config.lazyLoading;
  }

  public getImageOptimizationConfig() {
    return this.config.imageOptimization;
  }

  public getMonitoringConfig() {
    return this.config.monitoring;
  }

  public getCachingConfig() {
    return this.config.caching;
  }

  public getThresholds() {
    return this.config.thresholds;
  }

  public shouldEnableFeature(feature: keyof PerformanceConfig): boolean {
    const featureConfig = this.config[feature];
    
    // Check if feature has an enable flag
    if (typeof featureConfig === 'object' && featureConfig !== null) {
      const enableKey = Object.keys(featureConfig).find(key => key.startsWith('enable'));
      if (enableKey) {
        return (featureConfig as any)[enableKey];
      }
    }
    
    return true;
  }

  public validateThresholds(metrics: {
    loadTime?: number;
    bundleSize?: number;
    apiResponseTime?: number;
    memoryUsage?: number;
    errorRate?: number;
  }): { [key: string]: boolean } {
    const thresholds = this.getThresholds();
    const results: { [key: string]: boolean } = {};

    if (metrics.loadTime !== undefined) {
      results.loadTime = metrics.loadTime <= thresholds.maxLoadTime;
    }

    if (metrics.bundleSize !== undefined) {
      results.bundleSize = metrics.bundleSize <= this.config.bundleOptimization.maxBundleSize;
    }

    if (metrics.apiResponseTime !== undefined) {
      results.apiResponseTime = metrics.apiResponseTime <= thresholds.maxApiResponseTime;
    }

    if (metrics.memoryUsage !== undefined) {
      results.memoryUsage = metrics.memoryUsage <= thresholds.maxMemoryUsage;
    }

    if (metrics.errorRate !== undefined) {
      results.errorRate = metrics.errorRate <= thresholds.maxErrorRate;
    }

    return results;
  }
}

// Global performance config manager
export const performanceConfigManager = new PerformanceConfigManager();