import { CompatibilityAdapter, FrameworkType, ConflictPrevention } from '../types';

export class WordPressCompatibility implements CompatibilityAdapter {
  readonly frameworkType: FrameworkType = 'wordpress';
  
  private eventListeners: Map<HTMLElement, Map<string, EventListener>> = new Map();
  private mutationObserver: MutationObserver | null = null;
  private wpHooks: Map<string, Function[]> = new Map();
  private isInitialized = false;

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.preventStyleConflicts();
      this.setupWordPressHooks();
      this.handleThemeCompatibility();
      this.setupPluginCompatibility();
      this.optimizeForFramework();
      
      this.isInitialized = true;
      console.log('[DinoOverlay] WordPress compatibility initialized');
    } catch (error) {
      console.error('[DinoOverlay] WordPress compatibility initialization failed:', error);
      throw error;
    }
  }

  public cleanup(): void {
    // Remove all event listeners
    this.eventListeners.forEach((listeners, element) => {
      listeners.forEach((listener, event) => {
        element.removeEventListener(event, listener);
      });
    });
    this.eventListeners.clear();

    // Disconnect mutation observer
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }

    // Remove WordPress hooks
    this.wpHooks.clear();

    this.isInitialized = false;
  }

  public findEditableImages(): HTMLImageElement[] {
    const selectors = [
      '.editable-room',
      '.wp-block-image img',
      '.gallery-item img',
      '.attachment-full',
      '.wp-post-image',
      // Theme-specific selectors
      '.elementor-image img',
      '.et_pb_image img', // Divi
      '.astra-image img',
      '.generatepress-image img'
    ];

    const images: HTMLImageElement[] = [];
    
    selectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          if (element instanceof HTMLImageElement) {
            images.push(element);
          } else if (element && typeof element.querySelector === 'function') {
            // Handle wrapper elements
            const img = element.querySelector('img');
            if (img) images.push(img);
          }
        });
      } catch (error) {
        console.warn('[DinoOverlay] Error with selector:', selector, error);
      }
    });

    // Remove duplicates
    return Array.from(new Set(images));
  }

  public attachEventListeners(element: HTMLElement, events: Record<string, EventListener>): void {
    if (!this.eventListeners.has(element)) {
      this.eventListeners.set(element, new Map());
    }

    const elementListeners = this.eventListeners.get(element)!;

    Object.entries(events).forEach(([eventType, listener]) => {
      try {
        // Wrap listener to prevent conflicts with WordPress event handling
        const wrappedListener = this.wrapEventListener(listener);
        
        element.addEventListener(eventType, wrappedListener, { passive: true });
        elementListeners.set(eventType, wrappedListener);
      } catch (error) {
        console.error('[DinoOverlay] Error attaching event listener:', error);
      }
    });
  }

  public removeEventListeners(element: HTMLElement): void {
    const elementListeners = this.eventListeners.get(element);
    if (!elementListeners) return;

    elementListeners.forEach((listener, eventType) => {
      element.removeEventListener(eventType, listener);
    });

    this.eventListeners.delete(element);
  }

  public preventStyleConflicts(): void {
    // WordPress-specific style isolation
    const conflictPrevention: ConflictPrevention = {
      cssNamespacing: true,
      eventBubbling: true,
      domMutation: true,
      globalVariables: true
    };

    this.preventCSSConflicts();
    this.preventJavaScriptConflicts();
    this.preventPluginConflicts();
  }

  public optimizeForFramework(): void {
    // WordPress-specific optimizations
    this.optimizeForWordPressThemes();
    this.optimizeForCommonPlugins();
    this.setupWordPressAjaxIntegration();
    this.handleWordPressCustomizer();
  }

  private preventCSSConflicts(): void {
    try {
      // Common WordPress CSS conflicts
      const conflictingSelectors = [
        '.wp-block-image',
        '.gallery',
        '.attachment',
        '.wp-caption',
        '.alignleft',
        '.alignright',
        '.aligncenter'
      ];

      // Ensure our styles have higher specificity
      const styleOverrides = `
        /* WordPress theme compatibility */
        .dino-overlay-root .glass {
          position: relative !important;
          z-index: 999999 !important;
        }
        
        /* Prevent WordPress image styling conflicts */
        .dino-overlay-root img {
          max-width: none !important;
          height: auto !important;
          border: none !important;
          box-shadow: none !important;
        }
        
        /* Override common theme styles */
        .dino-overlay-root .interactive {
          text-decoration: none !important;
          color: inherit !important;
        }
      `;

      const styleElement = document.createElement('style');
      if (styleElement) {
        styleElement.textContent = styleOverrides;
        if (document.head) {
          document.head.appendChild(styleElement);
        }
      }
    } catch (error) {
      console.error('[DinoOverlay] Error preventing CSS conflicts:', error);
    }
  }

  private preventJavaScriptConflicts(): void {
    // Prevent conflicts with WordPress globals
    const originalJQuery = (window as any).$;
    const originalWordPress = (window as any).wp;

    // Restore globals after our operations if they were modified
    if (originalJQuery && (window as any).$ !== originalJQuery) {
      (window as any).$ = originalJQuery;
    }
    
    if (originalWordPress && (window as any).wp !== originalWordPress) {
      (window as any).wp = originalWordPress;
    }
  }

  private preventPluginConflicts(): void {
    // Handle common plugin conflicts
    const commonPlugins = [
      'elementor',
      'divi',
      'woocommerce',
      'yoast',
      'wpml'
    ];

    commonPlugins.forEach(plugin => {
      this.handlePluginSpecificConflicts(plugin);
    });
  }

  private handlePluginSpecificConflicts(plugin: string): void {
    switch (plugin) {
      case 'elementor':
        // Elementor uses its own image handling
        this.handleElementorConflicts();
        break;
      case 'divi':
        // Divi has custom image modules
        this.handleDiviConflicts();
        break;
      case 'woocommerce':
        // WooCommerce product images
        this.handleWooCommerceConflicts();
        break;
    }
  }

  private handleElementorConflicts(): void {
    // Wait for Elementor to finish loading
    if ((window as any).elementorFrontend) {
      (window as any).elementorFrontend.hooks.addAction(
        'frontend/element_ready/global',
        () => {
          // Re-scan for images after Elementor loads content
          setTimeout(() => this.triggerImageRescan(), 100);
        }
      );
    }
  }

  private handleDiviConflicts(): void {
    // Divi uses ET_Builder
    if ((window as any).ET_Builder) {
      // Hook into Divi's module loading
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => this.triggerImageRescan(), 500);
      });
    }
  }

  private handleWooCommerceConflicts(): void {
    // WooCommerce product image galleries
    if ((window as any).wc_single_product_params) {
      // Handle WooCommerce image zoom and gallery
      document.addEventListener('woocommerce_gallery_init', () => {
        this.triggerImageRescan();
      });
    }
  }

  private setupWordPressHooks(): void {
    try {
      // WordPress action/filter system integration
      if ((window as any).wp && (window as any).wp.hooks) {
        const hooks = (window as any).wp.hooks;
        
        // Add our hooks
        if (typeof hooks.addAction === 'function') {
          hooks.addAction('wp.editor.ready', 'dino-overlay', () => {
            this.handleGutenbergEditor();
          });
        }
        
        if (typeof hooks.addFilter === 'function') {
          hooks.addFilter('blocks.registerBlockType', 'dino-overlay', (settings: any) => {
            return this.enhanceBlockType(settings);
          });
        }
      }
    } catch (error) {
      console.error('[DinoOverlay] Error setting up WordPress hooks:', error);
    }
  }

  private handleGutenbergEditor(): void {
    // Handle Gutenberg block editor
    const editorContainer = document.querySelector('.block-editor');
    if (editorContainer) {
      // Set up mutation observer for dynamic content
      this.mutationObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            this.triggerImageRescan();
          }
        });
      });

      this.mutationObserver.observe(editorContainer, {
        childList: true,
        subtree: true
      });
    }
  }

  private enhanceBlockType(settings: any): any {
    // Enhance WordPress blocks to work with our overlay
    if (settings.name === 'core/image') {
      // Add our class to image blocks
      const originalEdit = settings.edit;
      settings.edit = (props: any) => {
        const result = originalEdit(props);
        // Add editable-room class to images
        if (result && result.props && result.props.className) {
          result.props.className += ' editable-room';
        }
        return result;
      };
    }
    
    return settings;
  }

  private handleThemeCompatibility(): void {
    // Detect and handle specific WordPress themes
    const body = document.body;
    
    if (body.classList.contains('astra-theme')) {
      this.handleAstraTheme();
    } else if (body.classList.contains('generatepress')) {
      this.handleGeneratePressTheme();
    } else if (body.classList.contains('et_divi_theme')) {
      this.handleDiviTheme();
    } else if (body.classList.contains('oceanwp-theme')) {
      this.handleOceanWPTheme();
    }
  }

  private handleAstraTheme(): void {
    // Astra theme specific handling
    const astraConfig = {
      imageSelectors: ['.astra-image', '.ast-single-post img'],
      excludeSelectors: ['.site-logo img', '.custom-logo']
    };
    
    this.applyThemeConfig(astraConfig);
  }

  private handleGeneratePressTheme(): void {
    // GeneratePress theme specific handling
    const gpConfig = {
      imageSelectors: ['.generate-image', '.entry-content img'],
      excludeSelectors: ['.site-logo img']
    };
    
    this.applyThemeConfig(gpConfig);
  }

  private handleDiviTheme(): void {
    // Divi theme specific handling
    const diviConfig = {
      imageSelectors: ['.et_pb_image', '.et_pb_gallery_image'],
      excludeSelectors: ['.et_pb_menu_logo img']
    };
    
    this.applyThemeConfig(diviConfig);
  }

  private handleOceanWPTheme(): void {
    // OceanWP theme specific handling
    const oceanConfig = {
      imageSelectors: ['.oceanwp-image', '.entry-media img'],
      excludeSelectors: ['.custom-logo']
    };
    
    this.applyThemeConfig(oceanConfig);
  }

  private applyThemeConfig(config: { imageSelectors: string[], excludeSelectors: string[] }): void {
    // Apply theme-specific configuration
    config.imageSelectors.forEach(selector => {
      const images = document.querySelectorAll(selector);
      images.forEach(img => {
        if (img instanceof HTMLImageElement) {
          img.classList.add('editable-room');
        }
      });
    });
  }

  private setupPluginCompatibility(): void {
    // Setup compatibility with common WordPress plugins
    this.handleLazyLoadingPlugins();
    this.handleCachingPlugins();
    this.handleSEOPlugins();
  }

  private handleLazyLoadingPlugins(): void {
    try {
      // Handle lazy loading plugins (WP Rocket, Lazy Load, etc.)
      if ('IntersectionObserver' in window) {
        const lazyLoadObserver = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const img = entry.target as HTMLImageElement;
              if (img.dataset.src || img.dataset.lazySrc) {
                // Image is being lazy loaded, wait for it to load
                img.addEventListener('load', () => {
                  this.triggerImageRescan();
                }, { once: true });
              }
            }
          });
        });

        // Observe all images with lazy loading attributes
        document.querySelectorAll('img[data-src], img[data-lazy-src]').forEach(img => {
          lazyLoadObserver.observe(img);
        });
      }
    } catch (error) {
      console.error('[DinoOverlay] Error handling lazy loading plugins:', error);
    }
  }

  private handleCachingPlugins(): void {
    // Handle caching plugins that might affect our script loading
    if ((window as any).wp_rocket_lazy_load) {
      // WP Rocket lazy loading
      document.addEventListener('rocket-lazy-loaded', () => {
        this.triggerImageRescan();
      });
    }
  }

  private handleSEOPlugins(): void {
    // Handle SEO plugins that might modify image attributes
    if ((window as any).yoast) {
      // Yoast SEO might modify image alt attributes
      // No specific handling needed, but we're aware of it
    }
  }

  private optimizeForWordPressThemes(): void {
    // WordPress-specific performance optimizations
    this.deferNonCriticalOperations();
    this.optimizeForMobileThemes();
  }

  private optimizeForCommonPlugins(): void {
    // Optimize for common WordPress plugins
    if (document.querySelector('.woocommerce')) {
      this.optimizeForWooCommerce();
    }
    
    if (document.querySelector('.elementor-page')) {
      this.optimizeForElementor();
    }
  }

  private optimizeForWooCommerce(): void {
    // WooCommerce specific optimizations
    // Handle product image galleries
    document.addEventListener('woocommerce_gallery_init', () => {
      setTimeout(() => this.triggerImageRescan(), 100);
    });
  }

  private optimizeForElementor(): void {
    // Elementor specific optimizations
    if ((window as any).elementorFrontend) {
      (window as any).elementorFrontend.hooks.addAction(
        'frontend/element_ready/global',
        () => {
          this.triggerImageRescan();
        }
      );
    }
  }

  private setupWordPressAjaxIntegration(): void {
    // Integrate with WordPress AJAX system
    if ((window as any).ajaxurl) {
      // WordPress AJAX is available
      // We can use it for our API calls if needed
    }
  }

  private handleWordPressCustomizer(): void {
    // Handle WordPress Customizer
    if ((window as any).wp && (window as any).wp.customize) {
      (window as any).wp.customize.bind('ready', () => {
        // Customizer is ready, re-scan for images
        this.triggerImageRescan();
      });
    }
  }

  private deferNonCriticalOperations(): void {
    // Defer non-critical operations until after WordPress is fully loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => this.performDeferredOperations(), 100);
      });
    } else {
      setTimeout(() => this.performDeferredOperations(), 100);
    }
  }

  private performDeferredOperations(): void {
    // Perform operations that can be deferred
    this.triggerImageRescan();
  }

  private optimizeForMobileThemes(): void {
    // Mobile theme optimizations
    if (window.innerWidth <= 768) {
      // Mobile-specific optimizations
      this.reducedAnimations();
    }
  }

  private reducedAnimations(): void {
    // Reduce animations on mobile for better performance
    // This will be handled by the animation system
  }

  private wrapEventListener(listener: EventListener): EventListener {
    return (event: Event) => {
      try {
        // Prevent conflicts with WordPress event handling
        event.stopPropagation();
        listener(event);
      } catch (error) {
        console.error('[DinoOverlay] Event listener error:', error);
      }
    };
  }

  private triggerImageRescan(): void {
    // Trigger a rescan of images (this would be called by the main overlay system)
    const event = new CustomEvent('dino-overlay-rescan-images');
    document.dispatchEvent(event);
  }
}