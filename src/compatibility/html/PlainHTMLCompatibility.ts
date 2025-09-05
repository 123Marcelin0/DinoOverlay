import { CompatibilityAdapter, FrameworkType } from '../types';

export class PlainHTMLCompatibility implements CompatibilityAdapter {
  readonly frameworkType: FrameworkType = 'html';
  
  private eventListeners: Map<HTMLElement, Map<string, EventListener>> = new Map();
  private mutationObserver: MutationObserver | null = null;
  private jQueryVersion: string | null = null;
  private isInitialized = false;
  private resizeObserver: ResizeObserver | null = null;

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.detectjQuery();
      this.preventStyleConflicts();
      this.setupDOMObservation();
      this.handleLegacyBrowsers();
      this.optimizeForFramework();
      
      this.isInitialized = true;
      console.log('[DinoOverlay] Plain HTML compatibility initialized', { 
        jQuery: this.jQueryVersion 
      });
    } catch (error) {
      console.error('[DinoOverlay] Plain HTML compatibility initialization failed:', error);
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

    // Disconnect observers
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    this.isInitialized = false;
  }

  public findEditableImages(): HTMLImageElement[] {
    const selectors = [
      '.editable-room',
      // Common HTML patterns
      '.gallery img',
      '.photo img',
      '.image img',
      '.property-image img',
      '.room-image img',
      // jQuery plugin patterns
      '.slick-slide img',
      '.owl-item img',
      '.swiper-slide img',
      '.fancybox img',
      '.lightbox img',
      // Bootstrap patterns
      '.carousel-item img',
      '.card-img',
      '.img-fluid',
      // Foundation patterns
      '.orbit-slide img',
      // Legacy patterns
      'img[class*="room"]',
      'img[class*="property"]',
      'img[id*="room"]',
      'img[id*="property"]'
    ];

    const images: HTMLImageElement[] = [];
    
    selectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          if (element instanceof HTMLImageElement) {
            images.push(element);
          } else {
            // Handle wrapper elements
            const img = element.querySelector('img');
            if (img) images.push(img);
          }
        });
      } catch (error) {
        // Some selectors might be invalid in older browsers
        console.warn('[DinoOverlay] Invalid selector:', selector);
      }
    });

    // Also check for images with specific data attributes
    const dataImages = document.querySelectorAll('img[data-room], img[data-property], img[data-editable]');
    dataImages.forEach(img => {
      if (img instanceof HTMLImageElement) {
        images.push(img);
      }
    });

    return Array.from(new Set(images));
  }

  public attachEventListeners(element: HTMLElement, events: Record<string, EventListener>): void {
    if (!this.eventListeners.has(element)) {
      this.eventListeners.set(element, new Map());
    }

    const elementListeners = this.eventListeners.get(element)!;

    Object.entries(events).forEach(([eventType, listener]) => {
      // Wrap listener for plain HTML compatibility
      const wrappedListener = this.wrapEventListenerForHTML(listener, element);
      
      // Use standard event handling
      element.addEventListener(eventType, wrappedListener, { passive: true });
      elementListeners.set(eventType, wrappedListener);
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
    // Plain HTML specific style isolation
    this.preventCSSFrameworkConflicts();
    this.preventjQueryUIConflicts();
    this.preventLegacyStyleConflicts();
  }

  public optimizeForFramework(): void {
    // Plain HTML specific optimizations
    this.optimizeForjQuery();
    this.optimizeForCSSFrameworks();
    this.optimizeForLegacyBrowsers();
    this.handleCommonPlugins();
  }

  private detectjQuery(): void {
    if (typeof window !== 'undefined') {
      // Check for jQuery
      if ('jQuery' in window) {
        this.jQueryVersion = (window as any).jQuery.fn.jquery;
      } else if ('$' in window && (window as any).$.fn) {
        this.jQueryVersion = (window as any).$.fn.jquery;
      }
    }
  }

  private setupDOMObservation(): void {
    // Set up mutation observer for dynamic content
    this.mutationObserver = new MutationObserver((mutations) => {
      let shouldRescan = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          // Check for added images
          const addedNodes = Array.from(mutation.addedNodes);
          const hasNewImages = addedNodes.some(node => {
            if (node instanceof HTMLImageElement) return true;
            if (node instanceof HTMLElement) {
              return node.querySelector('img') !== null;
            }
            return false;
          });
          
          if (hasNewImages) {
            shouldRescan = true;
          }
        }
        
        // Check for attribute changes that might affect image selection
        if (mutation.type === 'attributes') {
          const target = mutation.target as HTMLElement;
          if (target instanceof HTMLImageElement || target.querySelector('img')) {
            shouldRescan = true;
          }
        }
      });
      
      if (shouldRescan) {
        this.debounceRescan();
      }
    });

    // Observe the entire document for changes
    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'id', 'data-room', 'data-property', 'data-editable']
    });

    // Set up resize observer for responsive handling
    if ('ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver((entries) => {
        // Handle image resize events
        this.handleImageResize(entries);
      });
    }
  }

  private handleImageResize(entries: ResizeObserverEntry[]): void {
    // Handle image resize events
    entries.forEach(entry => {
      if (entry.target instanceof HTMLImageElement) {
        // Image has been resized, update overlay positioning
        this.triggerImageRescan();
      }
    });
  }

  private handleLegacyBrowsers(): void {
    // Handle legacy browser compatibility
    this.polyfillMissingFeatures();
    this.handleIECompatibility();
    this.handleOldWebkitBrowsers();
  }

  private polyfillMissingFeatures(): void {
    // Polyfill missing features for older browsers
    
    // CustomEvent polyfill
    if (typeof window !== 'undefined' && !window.CustomEvent) {
      (window as any).CustomEvent = function(event: string, params: any) {
        params = params || { bubbles: false, cancelable: false, detail: undefined };
        const evt = document.createEvent('CustomEvent');
        evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
        return evt;
      };
    }

    // Array.from polyfill
    if (!Array.from) {
      Array.from = function(arrayLike: any) {
        return Array.prototype.slice.call(arrayLike);
      };
    }

    // Object.assign polyfill
    if (!Object.assign) {
      Object.assign = function(target: any, ...sources: any[]) {
        sources.forEach(source => {
          if (source) {
            Object.keys(source).forEach(key => {
              target[key] = source[key];
            });
          }
        });
        return target;
      };
    }
  }

  private handleIECompatibility(): void {
    // Internet Explorer specific handling
    const isIE = navigator.userAgent.indexOf('MSIE') !== -1 || 
                 navigator.userAgent.indexOf('Trident/') !== -1;
    
    if (isIE) {
      // IE-specific optimizations
      this.optimizeForIE();
    }
  }

  private optimizeForIE(): void {
    // Internet Explorer optimizations
    // Disable advanced features that IE doesn't support
    const ieOverrides = `
      /* IE compatibility */
      .dino-overlay-root {
        /* Disable backdrop-filter for IE */
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
        
        /* Use solid background instead */
        background: rgba(255, 255, 255, 0.9) !important;
      }
      
      /* Disable CSS Grid for IE */
      .dino-overlay-root .grid {
        display: block !important;
      }
      
      /* Use flexbox fallbacks */
      .dino-overlay-root .flex {
        display: -ms-flexbox !important;
        display: flex !important;
      }
    `;

    const styleElement = document.createElement('style');
    styleElement.textContent = ieOverrides;
    document.head.appendChild(styleElement);
  }

  private handleOldWebkitBrowsers(): void {
    // Handle old WebKit browsers (Safari < 9, Chrome < 50)
    const webkitVersion = this.getWebkitVersion();
    
    if (webkitVersion && webkitVersion < 537) {
      // Old WebKit browser
      this.optimizeForOldWebkit();
    }
  }

  private getWebkitVersion(): number | null {
    const match = navigator.userAgent.match(/WebKit\/(\d+)/);
    return match ? parseInt(match[1]) : null;
  }

  private optimizeForOldWebkit(): void {
    // Old WebKit optimizations
    const webkitOverrides = `
      /* Old WebKit compatibility */
      .dino-overlay-root {
        /* Use -webkit- prefixes */
        -webkit-backdrop-filter: blur(10px);
        -webkit-transform: translateZ(0);
      }
    `;

    const styleElement = document.createElement('style');
    styleElement.textContent = webkitOverrides;
    document.head.appendChild(styleElement);
  }

  private preventCSSFrameworkConflicts(): void {
    // Prevent conflicts with CSS frameworks
    this.handleBootstrapConflicts();
    this.handleFoundationConflicts();
    this.handleBulmaConflicts();
  }

  private handleBootstrapConflicts(): void {
    // Bootstrap framework conflicts
    if (document.querySelector('.bootstrap, [class*="bs-"]') || 
        document.querySelector('link[href*="bootstrap"]')) {
      
      const bootstrapOverrides = `
        /* Bootstrap compatibility */
        .dino-overlay-root .btn {
          /* Override Bootstrap button styles */
          all: unset !important;
        }
        
        .dino-overlay-root .card {
          /* Override Bootstrap card styles */
          all: unset !important;
        }
        
        /* Restore our styles */
        .dino-overlay-root .glass {
          all: revert !important;
        }
      `;

      const styleElement = document.createElement('style');
      styleElement.textContent = bootstrapOverrides;
      document.head.appendChild(styleElement);
    }
  }

  private handleFoundationConflicts(): void {
    // Foundation framework conflicts
    if (document.querySelector('.foundation-sites') || 
        document.querySelector('link[href*="foundation"]')) {
      
      const foundationOverrides = `
        /* Foundation compatibility */
        .dino-overlay-root .button {
          all: unset !important;
        }
        
        .dino-overlay-root .card {
          all: unset !important;
        }
      `;

      const styleElement = document.createElement('style');
      styleElement.textContent = foundationOverrides;
      document.head.appendChild(styleElement);
    }
  }

  private handleBulmaConflicts(): void {
    // Bulma framework conflicts
    if (document.querySelector('link[href*="bulma"]')) {
      const bulmaOverrides = `
        /* Bulma compatibility */
        .dino-overlay-root .button {
          all: unset !important;
        }
        
        .dino-overlay-root .card {
          all: unset !important;
        }
      `;

      const styleElement = document.createElement('style');
      styleElement.textContent = bulmaOverrides;
      document.head.appendChild(styleElement);
    }
  }

  private preventjQueryUIConflicts(): void {
    // jQuery UI conflicts
    if (this.jQueryVersion && document.querySelector('link[href*="jquery-ui"]')) {
      const jqueryUIOverrides = `
        /* jQuery UI compatibility */
        .dino-overlay-root .ui-widget {
          all: unset !important;
        }
        
        .dino-overlay-root .ui-button {
          all: unset !important;
        }
      `;

      const styleElement = document.createElement('style');
      styleElement.textContent = jqueryUIOverrides;
      document.head.appendChild(styleElement);
    }
  }

  private preventLegacyStyleConflicts(): void {
    // Legacy style conflicts
    const legacyOverrides = `
      /* Legacy browser compatibility */
      .dino-overlay-root {
        /* Ensure proper box model */
        -webkit-box-sizing: border-box;
        -moz-box-sizing: border-box;
        box-sizing: border-box;
      }
      
      .dino-overlay-root * {
        -webkit-box-sizing: border-box;
        -moz-box-sizing: border-box;
        box-sizing: border-box;
      }
      
      /* Reset common legacy styles */
      .dino-overlay-root table {
        border-collapse: separate !important;
      }
      
      .dino-overlay-root img {
        border: none !important;
      }
    `;

    const styleElement = document.createElement('style');
    styleElement.textContent = legacyOverrides;
    document.head.appendChild(styleElement);
  }

  private optimizeForjQuery(): void {
    // jQuery specific optimizations
    if (this.jQueryVersion) {
      this.handlejQueryPlugins();
      this.handlejQueryEvents();
    }
  }

  private handlejQueryPlugins(): void {
    // Handle common jQuery plugins
    const $ = (window as any).$ || (window as any).jQuery;
    
    if ($) {
      // Slick carousel
      if ($.fn.slick) {
        this.handleSlickCarousel($);
      }
      
      // Owl carousel
      if ($.fn.owlCarousel) {
        this.handleOwlCarousel($);
      }
      
      // Swiper
      if ($.fn.swiper) {
        this.handleSwiper($);
      }
      
      // Fancybox
      if ($.fn.fancybox) {
        this.handleFancybox($);
      }
    }
  }

  private handleSlickCarousel($: any): void {
    // Slick carousel integration
    $(document).on('afterChange', '.slick-slider', () => {
      setTimeout(() => this.triggerImageRescan(), 100);
    });
  }

  private handleOwlCarousel($: any): void {
    // Owl carousel integration
    $(document).on('changed.owl.carousel', '.owl-carousel', () => {
      setTimeout(() => this.triggerImageRescan(), 100);
    });
  }

  private handleSwiper($: any): void {
    // Swiper integration
    $(document).on('slideChange', '.swiper-container', () => {
      setTimeout(() => this.triggerImageRescan(), 100);
    });
  }

  private handleFancybox($: any): void {
    // Fancybox integration
    $(document).on('onComplete.fb', () => {
      setTimeout(() => this.triggerImageRescan(), 100);
    });
  }

  private handlejQueryEvents(): void {
    // Handle jQuery event system
    const $ = (window as any).$ || (window as any).jQuery;
    
    if ($) {
      // Listen for jQuery DOM ready
      $(document).ready(() => {
        setTimeout(() => this.triggerImageRescan(), 100);
      });
      
      // Listen for jQuery load events
      $(window).on('load', () => {
        setTimeout(() => this.triggerImageRescan(), 200);
      });
    }
  }

  private optimizeForCSSFrameworks(): void {
    // CSS framework optimizations
    if (document.querySelector('.container, .row, .col')) {
      // Bootstrap-like grid system detected
      this.optimizeForGridSystems();
    }
  }

  private optimizeForGridSystems(): void {
    // Grid system optimizations
    // Handle responsive breakpoints
    const mediaQueries = [
      '(max-width: 576px)',
      '(max-width: 768px)',
      '(max-width: 992px)',
      '(max-width: 1200px)'
    ];

    mediaQueries.forEach(query => {
      const mediaQuery = window.matchMedia(query);
      mediaQuery.addListener(() => {
        // Breakpoint changed, rescan images
        setTimeout(() => this.triggerImageRescan(), 100);
      });
    });
  }

  private optimizeForLegacyBrowsers(): void {
    // Legacy browser optimizations
    this.reduceFeaturesForOldBrowsers();
    this.optimizePerformanceForOldBrowsers();
  }

  private reduceFeaturesForOldBrowsers(): void {
    // Reduce features for old browsers
    const isOldBrowser = this.isOldBrowser();
    
    if (isOldBrowser) {
      // Disable advanced features
      this.disableAdvancedFeatures();
    }
  }

  private isOldBrowser(): boolean {
    // Detect old browsers
    const userAgent = navigator.userAgent;
    
    return (
      userAgent.indexOf('MSIE') !== -1 ||
      userAgent.indexOf('Trident/') !== -1 ||
      (userAgent.indexOf('Chrome/') !== -1 && 
       parseInt(userAgent.match(/Chrome\/(\d+)/)![1]) < 50) ||
      (userAgent.indexOf('Safari/') !== -1 && 
       parseInt(userAgent.match(/Version\/(\d+)/)![1]) < 9)
    );
  }

  private disableAdvancedFeatures(): void {
    // Disable advanced features for old browsers
    const oldBrowserOverrides = `
      /* Old browser compatibility */
      .dino-overlay-root {
        /* Disable advanced CSS features */
        backdrop-filter: none !important;
        filter: none !important;
        transform: none !important;
        transition: none !important;
        animation: none !important;
      }
    `;

    const styleElement = document.createElement('style');
    styleElement.textContent = oldBrowserOverrides;
    document.head.appendChild(styleElement);
  }

  private optimizePerformanceForOldBrowsers(): void {
    // Performance optimizations for old browsers
    // Reduce animation frequency
    // Simplify DOM operations
    // Use setTimeout instead of requestAnimationFrame
  }

  private handleCommonPlugins(): void {
    // Handle common JavaScript plugins
    this.handleLazyLoadingPlugins();
    this.handleImageGalleryPlugins();
    this.handleModalPlugins();
  }

  private handleLazyLoadingPlugins(): void {
    // Handle lazy loading plugins
    const lazyImages = document.querySelectorAll('img[data-src], img[data-lazy]');
    
    lazyImages.forEach(img => {
      // Set up intersection observer for lazy loaded images
      if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const image = entry.target as HTMLImageElement;
              image.addEventListener('load', () => {
                this.triggerImageRescan();
              }, { once: true });
            }
          });
        });
        
        observer.observe(img);
      }
    });
  }

  private handleImageGalleryPlugins(): void {
    // Handle image gallery plugins
    const gallerySelectors = [
      '.gallery',
      '.image-gallery',
      '.photo-gallery',
      '.lightbox-gallery'
    ];

    gallerySelectors.forEach(selector => {
      const galleries = document.querySelectorAll(selector);
      galleries.forEach(gallery => {
        // Observe gallery for changes
        if (this.mutationObserver) {
          this.mutationObserver.observe(gallery, {
            childList: true,
            subtree: true
          });
        }
      });
    });
  }

  private handleModalPlugins(): void {
    // Handle modal plugins
    document.addEventListener('show.bs.modal', () => {
      // Bootstrap modal shown
      setTimeout(() => this.triggerImageRescan(), 100);
    });

    document.addEventListener('shown.bs.modal', () => {
      // Bootstrap modal fully shown
      setTimeout(() => this.triggerImageRescan(), 100);
    });
  }

  private wrapEventListenerForHTML(listener: EventListener, element: HTMLElement): EventListener {
    return (event: Event) => {
      try {
        // Standard event handling for plain HTML
        listener(event);
      } catch (error) {
        console.error('[DinoOverlay] HTML event listener error:', error);
      }
    };
  }

  private debounceRescan = this.debounce(() => {
    this.triggerImageRescan();
  }, 100);

  private debounce(func: Function, wait: number): Function {
    let timeout: NodeJS.Timeout;
    return function executedFunction(...args: any[]) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  private triggerImageRescan(): void {
    // Trigger a rescan of images
    const event = new CustomEvent('dino-overlay-rescan-images');
    document.dispatchEvent(event);
  }
}