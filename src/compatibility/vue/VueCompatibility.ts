import { CompatibilityAdapter, FrameworkType, LifecycleHooks } from '../types';

export class VueCompatibility implements CompatibilityAdapter {
  readonly frameworkType: FrameworkType = 'vue';
  
  private eventListeners: Map<HTMLElement, Map<string, EventListener>> = new Map();
  private vueInstances: Set<any> = new Set();
  private mutationObserver: MutationObserver | null = null;
  private lifecycleHooks: LifecycleHooks = {};
  private isInitialized = false;
  private vueVersion: string | null = null;
  private isVue3 = false;

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.detectVueVersion();
      this.preventStyleConflicts();
      this.setupVueLifecycleIntegration();
      this.handleVueReactivityConflicts();
      this.optimizeForFramework();
      
      this.isInitialized = true;
      console.log('[DinoOverlay] Vue compatibility initialized', { 
        version: this.vueVersion,
        isVue3: this.isVue3 
      });
    } catch (error) {
      console.error('[DinoOverlay] Vue compatibility initialization failed:', error);
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

    // Clear Vue instances tracking
    this.vueInstances.clear();

    this.isInitialized = false;
  }

  public findEditableImages(): HTMLImageElement[] {
    const selectors = [
      '.editable-room',
      '[v-bind\\:src]',
      '[\\:src]',
      // Vue component patterns
      '.vue-image img',
      '.v-img img',
      // Nuxt.js patterns
      'nuxt-img',
      'NuxtImg',
      // Common Vue image patterns
      '.image-component img',
      '.photo img'
    ];

    const images: HTMLImageElement[] = [];
    
    selectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          if (element instanceof HTMLImageElement) {
            // Check if image is part of Vue component
            if (this.isVueElement(element)) {
              images.push(element);
            }
          } else {
            // Handle wrapper elements and Vue components
            const img = element.querySelector('img');
            if (img && this.isVueElement(img)) {
              images.push(img);
            }
          }
        });
      } catch (error) {
        // Some selectors might be invalid, skip them
        console.warn('[DinoOverlay] Invalid selector:', selector);
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
      // Wrap listener to work with Vue's event system
      const wrappedListener = this.wrapEventListenerForVue(listener, element);
      
      // Use capture phase to avoid conflicts with Vue's event handling
      element.addEventListener(eventType, wrappedListener, { 
        capture: true,
        passive: true 
      });
      
      elementListeners.set(eventType, wrappedListener);
    });
  }

  public removeEventListeners(element: HTMLElement): void {
    const elementListeners = this.eventListeners.get(element);
    if (!elementListeners) return;

    elementListeners.forEach((listener, eventType) => {
      element.removeEventListener(eventType, listener, { capture: true });
    });

    this.eventListeners.delete(element);
  }

  public onFrameworkMount(): void {
    this.lifecycleHooks.afterMount?.();
    this.setupVueInstanceObservation();
  }

  public onFrameworkUnmount(): void {
    this.lifecycleHooks.beforeUnmount?.();
    this.cleanup();
  }

  public onFrameworkUpdate(): void {
    this.lifecycleHooks.onUpdate?.();
    // Re-scan for images after Vue updates
    setTimeout(() => this.triggerImageRescan(), 0);
  }

  public preventStyleConflicts(): void {
    // Vue-specific style isolation
    this.preventVueStyleConflicts();
    this.handleScopedCSSConflicts();
    this.handleVuetifyConflicts();
  }

  public optimizeForFramework(): void {
    // Vue-specific optimizations
    this.optimizeForVueLifecycle();
    this.optimizeForNuxtJS();
    this.optimizeForVueRouter();
    this.handleVueDevtools();
  }

  private detectVueVersion(): void {
    if (typeof window !== 'undefined') {
      // Try to get Vue version from global
      if ('Vue' in window) {
        const Vue = (window as any).Vue;
        this.vueVersion = Vue.version;
        this.isVue3 = Vue.version && Vue.version.startsWith('3.');
      }
      
      // Try to detect from Vue DevTools
      if ('__VUE_DEVTOOLS_GLOBAL_HOOK__' in window) {
        const devtools = (window as any).__VUE_DEVTOOLS_GLOBAL_HOOK__;
        if (devtools.Vue) {
          this.vueVersion = devtools.Vue.version;
          this.isVue3 = devtools.Vue.version && devtools.Vue.version.startsWith('3.');
        }
      }

      // Check for Vue 3 specific globals
      if ('__VUE__' in window) {
        this.isVue3 = true;
      }
    }
  }

  private isVueElement(element: HTMLElement): boolean {
    // Check if element is part of Vue component
    let current: any = element;
    
    while (current) {
      // Vue 2 properties
      if (current.__vue__ || current._vnode || current.$vnode) {
        return true;
      }
      
      // Vue 3 properties
      if (current.__vueParentComponent || current.__vue_app__) {
        return true;
      }
      
      // Check for Vue directives
      const attributes = current.attributes;
      if (attributes) {
        for (let i = 0; i < attributes.length; i++) {
          const attr = attributes[i];
          if (attr.name.startsWith('v-') || 
              attr.name.startsWith(':') || 
              attr.name.startsWith('@') ||
              attr.name.startsWith('data-v-')) {
            return true;
          }
        }
      }
      
      current = current.parentElement;
    }
    
    return false;
  }

  private setupVueLifecycleIntegration(): void {
    // Hook into Vue lifecycle events
    this.setupVueDevToolsIntegration();
    this.setupVueInstanceDetection();
    this.setupComponentUpdateDetection();
  }

  private setupVueDevToolsIntegration(): void {
    if (typeof window !== 'undefined' && '__VUE_DEVTOOLS_GLOBAL_HOOK__' in window) {
      const devtools = (window as any).__VUE_DEVTOOLS_GLOBAL_HOOK__;
      
      // Hook into Vue DevTools events
      if (devtools.on) {
        devtools.on('component:updated', () => {
          this.onFrameworkUpdate();
        });
        
        devtools.on('component:added', () => {
          this.onFrameworkUpdate();
        });
        
        devtools.on('component:removed', () => {
          this.onFrameworkUpdate();
        });
      }
    }
  }

  private setupVueInstanceDetection(): void {
    // Detect Vue instances
    if (this.isVue3) {
      this.detectVue3Instances();
    } else {
      this.detectVue2Instances();
    }
  }

  private detectVue3Instances(): void {
    // Vue 3 instance detection
    const appContainers = document.querySelectorAll('[data-v-app], #app');
    appContainers.forEach(container => {
      const vueApp = (container as any).__vue_app__;
      if (vueApp) {
        this.vueInstances.add(vueApp);
      }
    });
  }

  private detectVue2Instances(): void {
    // Vue 2 instance detection
    const vueElements = document.querySelectorAll('[data-v-]');
    vueElements.forEach(element => {
      const vueInstance = (element as any).__vue__;
      if (vueInstance) {
        this.vueInstances.add(vueInstance);
      }
    });
  }

  private setupComponentUpdateDetection(): void {
    // Set up mutation observer to detect Vue component updates
    this.mutationObserver = new MutationObserver((mutations) => {
      let shouldRescan = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          // Check if added/removed nodes are Vue components
          const addedNodes = Array.from(mutation.addedNodes);
          const removedNodes = Array.from(mutation.removedNodes);
          
          const hasVueChanges = [...addedNodes, ...removedNodes].some(node => {
            return node instanceof HTMLElement && this.isVueElement(node);
          });
          
          if (hasVueChanges) {
            shouldRescan = true;
          }
        }
        
        // Check for Vue directive changes
        if (mutation.type === 'attributes') {
          const target = mutation.target as HTMLElement;
          if (mutation.attributeName && 
              (mutation.attributeName.startsWith('v-') || 
               mutation.attributeName.startsWith('data-v-'))) {
            shouldRescan = true;
          }
        }
      });
      
      if (shouldRescan) {
        this.debounceRescan();
      }
    });

    // Observe Vue app containers
    const appContainers = document.querySelectorAll('#app, [data-v-app], [data-app]');
    appContainers.forEach(container => {
      this.mutationObserver!.observe(container, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['v-', 'data-v-', ':', '@']
      });
    });
  }

  private handleVueReactivityConflicts(): void {
    // Prevent conflicts with Vue's reactivity system
    this.preventReactivityInterference();
    this.handleVueObserverConflicts();
  }

  private preventReactivityInterference(): void {
    // Ensure our DOM manipulations don't interfere with Vue's reactivity
    // Our overlay should be in Shadow DOM to avoid this
  }

  private handleVueObserverConflicts(): void {
    // Vue uses Object.defineProperty (Vue 2) or Proxy (Vue 3) for reactivity
    // Ensure we don't modify reactive properties
  }

  private preventVueStyleConflicts(): void {
    // Vue-specific style conflict prevention
    const styleOverrides = `
      /* Vue compatibility styles */
      .dino-overlay-root {
        /* Ensure our styles don't interfere with Vue components */
        isolation: isolate;
      }
      
      /* Prevent Vue scoped CSS conflicts */
      .dino-overlay-root * {
        /* Reset any inherited styles from Vue components */
        all: unset;
        display: revert;
        box-sizing: border-box;
      }
      
      /* Restore our component styles */
      .dino-overlay-root .glass,
      .dino-overlay-root .interactive {
        all: revert;
      }
      
      /* Handle Vue transition conflicts */
      .dino-overlay-root .v-enter-active,
      .dino-overlay-root .v-leave-active {
        transition: none !important;
      }
    `;

    const styleElement = document.createElement('style');
    styleElement.textContent = styleOverrides;
    document.head.appendChild(styleElement);
  }

  private handleScopedCSSConflicts(): void {
    // Handle Vue scoped CSS conflicts
    // Vue scoped CSS uses data-v-* attributes
    // Our Shadow DOM should prevent conflicts
  }

  private handleVuetifyConflicts(): void {
    // Handle Vuetify UI framework conflicts
    if (document.querySelector('.v-application')) {
      // Vuetify is present
      const vuetifyOverrides = `
        /* Vuetify compatibility */
        .dino-overlay-root {
          /* Ensure our overlay appears above Vuetify components */
          z-index: 9999 !important;
        }
        
        /* Prevent Vuetify theme conflicts */
        .dino-overlay-root .v-btn,
        .dino-overlay-root .v-card {
          all: unset !important;
        }
      `;

      const styleElement = document.createElement('style');
      styleElement.textContent = vuetifyOverrides;
      document.head.appendChild(styleElement);
    }
  }

  private optimizeForVueLifecycle(): void {
    // Optimize for Vue's lifecycle
    this.handleVueNextTick();
    this.handleVueWatchers();
  }

  private handleVueNextTick(): void {
    // Use Vue's nextTick for DOM updates if available
    if (typeof window !== 'undefined' && 'Vue' in window) {
      const Vue = (window as any).Vue;
      if (Vue.nextTick) {
        // Use Vue's nextTick for our updates
        Vue.nextTick(() => {
          this.triggerImageRescan();
        });
      }
    }
  }

  private handleVueWatchers(): void {
    // Handle Vue watchers that might affect our overlay
    // Vue watchers can trigger DOM updates
  }

  private optimizeForNuxtJS(): void {
    // Nuxt.js specific optimizations
    if (this.isNuxtJSApp()) {
      this.handleNuxtRouting();
      this.handleNuxtSSR();
      this.handleNuxtImageComponent();
    }
  }

  private isNuxtJSApp(): boolean {
    return !!(
      document.querySelector('#__nuxt') ||
      document.querySelector('[data-nuxt-ssr]') ||
      (typeof window !== 'undefined' && '__NUXT__' in window)
    );
  }

  private handleNuxtRouting(): void {
    // Handle Nuxt.js routing
    if (typeof window !== 'undefined' && '$nuxt' in window) {
      const nuxt = (window as any).$nuxt;
      
      if (nuxt.$router) {
        nuxt.$router.afterEach(() => {
          // Route has changed, rescan for images
          setTimeout(() => this.triggerImageRescan(), 100);
        });
      }
    }
  }

  private handleNuxtSSR(): void {
    // Handle Nuxt.js Server-Side Rendering
    if (typeof window !== 'undefined' && '__NUXT__' in window) {
      // SSR content is present
      // Wait for hydration to complete
      setTimeout(() => this.triggerImageRescan(), 1000);
    }
  }

  private handleNuxtImageComponent(): void {
    // Handle Nuxt Image component
    const nuxtImages = document.querySelectorAll('nuxt-img, NuxtImg');
    nuxtImages.forEach(img => {
      // Add our class to Nuxt images
      img.classList.add('editable-room');
    });
  }

  private optimizeForVueRouter(): void {
    // Vue Router specific optimizations
    if (typeof window !== 'undefined' && 'VueRouter' in window) {
      // Vue Router is present
      this.handleVueRouterNavigation();
    }
  }

  private handleVueRouterNavigation(): void {
    // Handle Vue Router navigation
    // Listen for route changes
    window.addEventListener('popstate', () => {
      setTimeout(() => this.triggerImageRescan(), 100);
    });
  }

  private handleVueDevtools(): void {
    // Handle Vue DevTools
    if (typeof window !== 'undefined' && '__VUE_DEVTOOLS_GLOBAL_HOOK__' in window) {
      const devtools = (window as any).__VUE_DEVTOOLS_GLOBAL_HOOK__;
      
      // DevTools might cause re-renders
      if (devtools.on) {
        devtools.on('flush', () => {
          this.onFrameworkUpdate();
        });
      }
    }
  }

  private setupVueInstanceObservation(): void {
    // Observe Vue instances for changes
    this.vueInstances.forEach(instance => {
      if (this.isVue3) {
        this.observeVue3Instance(instance);
      } else {
        this.observeVue2Instance(instance);
      }
    });
  }

  private observeVue3Instance(app: any): void {
    // Vue 3 instance observation
    if (app._container && this.mutationObserver) {
      this.mutationObserver.observe(app._container, {
        childList: true,
        subtree: true,
        attributes: true
      });
    }
  }

  private observeVue2Instance(vm: any): void {
    // Vue 2 instance observation
    if (vm.$el && this.mutationObserver) {
      this.mutationObserver.observe(vm.$el, {
        childList: true,
        subtree: true,
        attributes: true
      });
    }
  }

  private wrapEventListenerForVue(listener: EventListener, element: HTMLElement): EventListener {
    return (event: Event) => {
      try {
        // Prevent conflicts with Vue's event system
        // Vue uses event delegation and modifiers
        listener(event);
      } catch (error) {
        console.error('[DinoOverlay] Vue event listener error:', error);
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