/**
 * Lazy loading manager for non-critical components
 * Implements code splitting and dynamic imports for optimal bundle size
 */

export interface LazyComponentConfig {
  name: string;
  loader: () => Promise<any>;
  preload?: boolean;
  priority?: 'high' | 'medium' | 'low';
  dependencies?: string[];
}

export interface ComponentLoadResult<T = any> {
  component: T;
  loadTime: number;
  fromCache: boolean;
}

export class LazyComponentLoader {
  private componentCache = new Map<string, any>();
  private loadingPromises = new Map<string, Promise<any>>();
  private preloadQueue: string[] = [];
  private loadedComponents = new Set<string>();

  constructor() {
    this.initializePreloading();
  }

  private initializePreloading(): void {
    // Preload high-priority components when browser is idle
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => this.processPreloadQueue());
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => this.processPreloadQueue(), 100);
    }
  }

  public registerComponent(config: LazyComponentConfig): void {
    if (config.preload) {
      this.preloadQueue.push(config.name);
    }
  }

  public async loadComponent<T = any>(
    name: string,
    loader: () => Promise<any>
  ): Promise<ComponentLoadResult<T>> {
    const startTime = performance.now();

    // Return from cache if available
    if (this.componentCache.has(name)) {
      return {
        component: this.componentCache.get(name),
        loadTime: performance.now() - startTime,
        fromCache: true
      };
    }

    // Return existing loading promise if component is already being loaded
    if (this.loadingPromises.has(name)) {
      const component = await this.loadingPromises.get(name)!;
      return {
        component,
        loadTime: performance.now() - startTime,
        fromCache: false
      };
    }

    // Start loading the component
    const loadingPromise = this.loadComponentInternal(loader);
    this.loadingPromises.set(name, loadingPromise);

    try {
      const component = await loadingPromise;
      this.componentCache.set(name, component);
      this.loadedComponents.add(name);
      
      return {
        component,
        loadTime: performance.now() - startTime,
        fromCache: false
      };
    } finally {
      this.loadingPromises.delete(name);
    }
  }

  private async loadComponentInternal(loader: () => Promise<any>): Promise<any> {
    try {
      const module = await loader();
      return module.default || module;
    } catch (error) {
      console.error('Failed to load component:', error);
      throw error;
    }
  }

  private async processPreloadQueue(): void {
    // Process preload queue in batches to avoid overwhelming the browser
    const batchSize = 2;
    
    while (this.preloadQueue.length > 0) {
      const batch = this.preloadQueue.splice(0, batchSize);
      
      await Promise.allSettled(
        batch.map(async (componentName) => {
          try {
            // This would need to be configured with actual loaders
            // For now, we'll just mark as processed
            console.log(`Preloading component: ${componentName}`);
          } catch (error) {
            console.warn(`Failed to preload component ${componentName}:`, error);
          }
        })
      );

      // Yield control to prevent blocking
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  public preloadComponent(name: string, loader: () => Promise<any>): void {
    if (!this.loadedComponents.has(name) && !this.loadingPromises.has(name)) {
      this.loadComponent(name, loader).catch(error => {
        console.warn(`Failed to preload component ${name}:`, error);
      });
    }
  }

  public isComponentLoaded(name: string): boolean {
    return this.loadedComponents.has(name);
  }

  public getLoadedComponents(): string[] {
    return Array.from(this.loadedComponents);
  }

  public clearCache(): void {
    this.componentCache.clear();
    this.loadedComponents.clear();
    this.loadingPromises.clear();
  }

  public getCacheSize(): number {
    return this.componentCache.size;
  }
}

// Component loaders for lazy loading
export const componentLoaders = {
  // Core components that can be lazy loaded
  quickActionSidebar: () => import('./QuickActionSidebar').then(m => m.QuickActionSidebar),
  floatingChatBar: () => import('./FloatingChatBar').then(m => m.FloatingChatBar),
  imageHighlighter: () => import('./ImageHighlighter').then(m => m.ImageHighlighter),
  
  // Advanced features that can be lazy loaded
  animationSystem: () => import('./AnimationSystem').then(m => m.AnimationSystem),
  themeManager: () => import('./ThemeManager').then(m => m.ThemeManager),
  responsiveManager: () => import('./ResponsiveManager').then(m => m.ResponsiveManager),
  touchGestureHandler: () => import('./TouchGestureHandler').then(m => m.TouchGestureHandler),
  
  // Utility components
  imageOptimizer: () => import('./ImageOptimizer').then(m => m.ImageOptimizer),
  performanceMonitor: () => import('./PerformanceMonitor').then(m => m.PerformanceMonitor)
};

// Component configurations
export const componentConfigs: LazyComponentConfig[] = [
  {
    name: 'quickActionSidebar',
    loader: componentLoaders.quickActionSidebar,
    priority: 'high',
    preload: true
  },
  {
    name: 'floatingChatBar',
    loader: componentLoaders.floatingChatBar,
    priority: 'high',
    preload: true
  },
  {
    name: 'imageHighlighter',
    loader: componentLoaders.imageHighlighter,
    priority: 'high',
    preload: true
  },
  {
    name: 'animationSystem',
    loader: componentLoaders.animationSystem,
    priority: 'medium',
    preload: false
  },
  {
    name: 'themeManager',
    loader: componentLoaders.themeManager,
    priority: 'medium',
    preload: false
  },
  {
    name: 'responsiveManager',
    loader: componentLoaders.responsiveManager,
    priority: 'medium',
    preload: false
  },
  {
    name: 'touchGestureHandler',
    loader: componentLoaders.touchGestureHandler,
    priority: 'low',
    preload: false
  },
  {
    name: 'imageOptimizer',
    loader: componentLoaders.imageOptimizer,
    priority: 'low',
    preload: false
  },
  {
    name: 'performanceMonitor',
    loader: componentLoaders.performanceMonitor,
    priority: 'high',
    preload: true
  }
];

// Global lazy component loader instance
export const lazyComponentLoader = new LazyComponentLoader();

// Register all component configurations
componentConfigs.forEach(config => {
  lazyComponentLoader.registerComponent(config);
});