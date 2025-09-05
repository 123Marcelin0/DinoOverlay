import { FrameworkType, FrameworkInfo } from './types';

export class FrameworkDetector {
  private detectionCache: Map<string, FrameworkInfo> = new Map();
  private detectionPromise: Promise<FrameworkInfo> | null = null;

  public async detectFramework(): Promise<FrameworkInfo> {
    // Return cached result if available
    if (this.detectionPromise) {
      return this.detectionPromise;
    }

    this.detectionPromise = this.performDetection();
    return this.detectionPromise;
  }

  public clearCache(): void {
    this.detectionCache.clear();
    this.detectionPromise = null;
  }

  private async performDetection(): Promise<FrameworkInfo> {
    const cacheKey = this.generateCacheKey();
    
    if (this.detectionCache.has(cacheKey)) {
      return this.detectionCache.get(cacheKey)!;
    }

    const detectionResults = await Promise.all([
      this.detectWordPress(),
      this.detectReact(),
      this.detectVue(),
      this.detectPlainHTML()
    ]);

    // Find the framework with highest confidence
    const bestMatch = detectionResults.reduce((best, current) => 
      current.confidence > best.confidence ? current : best
    );

    this.detectionCache.set(cacheKey, bestMatch);
    return bestMatch;
  }

  private async detectWordPress(): Promise<FrameworkInfo> {
    const indicators = {
      // WordPress-specific globals
      wpGlobals: typeof window !== 'undefined' && (
        'wp' in window || 
        'wpApiSettings' in window || 
        'ajaxurl' in window
      ),
      
      // WordPress meta tags
      wpMeta: document.querySelector('meta[name="generator"][content*="WordPress"]') !== null,
      
      // WordPress CSS/JS
      wpAssets: document.querySelector('link[href*="wp-content"], script[src*="wp-content"]') !== null,
      
      // WordPress body classes
      wpBodyClass: document.body?.className.includes('wp-') || false,
      
      // WordPress admin bar
      adminBar: document.querySelector('#wpadminbar') !== null,
      
      // Common WordPress themes
      commonThemes: this.detectWordPressTheme()
    };

    const confidence = this.calculateConfidence([
      indicators.wpGlobals ? 0.3 : 0,
      indicators.wpMeta ? 0.25 : 0,
      indicators.wpAssets ? 0.2 : 0,
      indicators.wpBodyClass ? 0.15 : 0,
      indicators.adminBar ? 0.1 : 0
    ]);

    return {
      type: 'wordpress',
      detected: confidence > 0.5,
      confidence,
      theme: indicators.commonThemes,
      plugins: this.detectWordPressPlugins()
    };
  }

  private async detectReact(): Promise<FrameworkInfo> {
    const indicators = {
      // React globals
      reactGlobals: typeof window !== 'undefined' && (
        'React' in window || 
        'ReactDOM' in window ||
        '__REACT_DEVTOOLS_GLOBAL_HOOK__' in window
      ),
      
      // React fiber nodes
      reactFiber: this.hasReactFiberNodes(),
      
      // React attributes
      reactAttrs: document.querySelector('[data-reactroot], [data-react-helmet]') !== null,
      
      // React development indicators
      reactDev: document.querySelector('script[src*="react"]') !== null,
      
      // Next.js specific
      nextJs: document.querySelector('script[src*="_next"], #__next') !== null
    };

    const confidence = this.calculateConfidence([
      indicators.reactGlobals ? 0.3 : 0,
      indicators.reactFiber ? 0.25 : 0,
      indicators.reactAttrs ? 0.2 : 0,
      indicators.reactDev ? 0.15 : 0,
      indicators.nextJs ? 0.1 : 0
    ]);

    return {
      type: 'react',
      detected: confidence > 0.5,
      confidence,
      version: this.getReactVersion()
    };
  }

  private async detectVue(): Promise<FrameworkInfo> {
    const indicators = {
      // Vue globals
      vueGlobals: typeof window !== 'undefined' && (
        'Vue' in window || 
        '__VUE__' in window ||
        '__VUE_DEVTOOLS_GLOBAL_HOOK__' in window
      ),
      
      // Vue attributes
      vueAttrs: document.querySelector('[v-], [data-v-]') !== null,
      
      // Vue app containers
      vueApp: document.querySelector('#app[data-v-app], [data-app]') !== null,
      
      // Vue development indicators
      vueDev: document.querySelector('script[src*="vue"]') !== null,
      
      // Nuxt.js specific
      nuxtJs: document.querySelector('#__nuxt, [data-nuxt-ssr]') !== null
    };

    const confidence = this.calculateConfidence([
      indicators.vueGlobals ? 0.3 : 0,
      indicators.vueAttrs ? 0.25 : 0,
      indicators.vueApp ? 0.2 : 0,
      indicators.vueDev ? 0.15 : 0,
      indicators.nuxtJs ? 0.1 : 0
    ]);

    return {
      type: 'vue',
      detected: confidence > 0.5,
      confidence,
      version: this.getVueVersion()
    };
  }

  private async detectPlainHTML(): Promise<FrameworkInfo> {
    const indicators = {
      // jQuery presence
      jquery: typeof window !== 'undefined' && (
        '$' in window || 
        'jQuery' in window
      ),
      
      // No major framework detected
      noFramework: !this.hasModernFrameworkIndicators(),
      
      // Traditional HTML patterns
      traditionalHTML: this.hasTraditionalHTMLPatterns(),
      
      // Static site generators
      staticSite: this.detectStaticSiteGenerator()
    };

    // Plain HTML gets higher confidence when no other frameworks are detected
    const confidence = this.calculateConfidence([
      indicators.noFramework ? 0.4 : 0,
      indicators.traditionalHTML ? 0.3 : 0,
      indicators.jquery ? 0.2 : 0,
      indicators.staticSite ? 0.1 : 0
    ]);

    return {
      type: 'html',
      detected: confidence > 0.3, // Lower threshold for plain HTML
      confidence
    };
  }

  private detectWordPressTheme(): string | undefined {
    const themeIndicators = [
      { name: 'Twenty Twenty-Four', selector: 'body.wp-theme-twentytwentyfour' },
      { name: 'Twenty Twenty-Three', selector: 'body.wp-theme-twentytwentythree' },
      { name: 'Astra', selector: 'body.astra-theme' },
      { name: 'GeneratePress', selector: 'body.generatepress' },
      { name: 'OceanWP', selector: 'body.oceanwp-theme' },
      { name: 'Divi', selector: 'body.et_divi_theme' }
    ];

    for (const theme of themeIndicators) {
      if (document.querySelector(theme.selector)) {
        return theme.name;
      }
    }

    return undefined;
  }

  private detectWordPressPlugins(): string[] {
    const plugins: string[] = [];
    
    // Common plugin indicators
    const pluginIndicators = [
      { name: 'WooCommerce', selector: 'body.woocommerce, .woocommerce' },
      { name: 'Elementor', selector: 'body.elementor-page' },
      { name: 'Yoast SEO', selector: 'script[src*="yoast"]' },
      { name: 'Contact Form 7', selector: '.wpcf7' },
      { name: 'WP Rocket', selector: 'script[data-rocket-src]' }
    ];

    pluginIndicators.forEach(plugin => {
      if (document.querySelector(plugin.selector)) {
        plugins.push(plugin.name);
      }
    });

    return plugins;
  }

  private hasReactFiberNodes(): boolean {
    // Check for React Fiber properties on DOM nodes
    const elements = document.querySelectorAll('*');
    for (let i = 0; i < Math.min(elements.length, 50); i++) {
      const element = elements[i] as any;
      if (element._reactInternalFiber || element.__reactInternalInstance) {
        return true;
      }
    }
    return false;
  }

  private getReactVersion(): string | undefined {
    if (typeof window !== 'undefined' && 'React' in window) {
      return (window as any).React.version;
    }
    return undefined;
  }

  private getVueVersion(): string | undefined {
    if (typeof window !== 'undefined' && 'Vue' in window) {
      return (window as any).Vue.version;
    }
    return undefined;
  }

  private hasModernFrameworkIndicators(): boolean {
    return !!(
      document.querySelector('[data-reactroot], [v-], [ng-], [data-v-]') ||
      (typeof window !== 'undefined' && (
        'React' in window || 
        'Vue' in window || 
        'angular' in window
      ))
    );
  }

  private hasTraditionalHTMLPatterns(): boolean {
    return !!(
      document.querySelector('form[action], table, frameset') ||
      document.documentElement.innerHTML.includes('document.write') ||
      document.documentElement.innerHTML.includes('innerHTML')
    );
  }

  private detectStaticSiteGenerator(): boolean {
    return !!(
      document.querySelector('meta[name="generator"][content*="Jekyll"]') ||
      document.querySelector('meta[name="generator"][content*="Hugo"]') ||
      document.querySelector('meta[name="generator"][content*="Gatsby"]')
    );
  }

  private calculateConfidence(scores: number[]): number {
    return Math.min(1, scores.reduce((sum, score) => sum + score, 0));
  }

  private generateCacheKey(): string {
    // Generate a simple cache key based on current page characteristics
    return [
      document.title,
      document.body?.className || '',
      document.querySelectorAll('script').length,
      document.querySelectorAll('link').length
    ].join('|');
  }
}