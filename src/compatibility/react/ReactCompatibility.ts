import { CompatibilityAdapter, FrameworkType, LifecycleHooks } from '../types';

export class ReactCompatibility implements CompatibilityAdapter {
  readonly frameworkType: FrameworkType = 'react';
  
  private eventListeners: Map<HTMLElement, Map<string, EventListener>> = new Map();
  private reactRoots: Set<Element> = new Set();
  private mutationObserver: MutationObserver | null = null;
  private lifecycleHooks: LifecycleHooks = {};
  private isInitialized = false;
  private reactVersion: string | null = null;

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.detectReactVersion();
      this.preventStyleConflicts();
      this.setupReactLifecycleIntegration();
      this.handleVirtualDOMConflicts();
      this.optimizeForFramework();
      
      this.isInitialized = true;
      console.log('[DinoOverlay] React compatibility initialized', { version: this.reactVersion });
    } catch (error) {
      console.error('[DinoOverlay] React compatibility initialization failed:', error);
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

    // Clear React roots tracking
    this.reactRoots.clear();

    this.isInitialized = false;
  }

  public findEditableImages(): HTMLImageElement[] {
    const selectors = [
      '.editable-room',
      '[data-testid*="image"]',
      '.react-image',
      // Next.js Image component
      'img[data-nimg]',
      // Common React image patterns
      '.image-component img',
      '.photo img',
      '.gallery-image img'
    ];

    const images: HTMLImageElement[] = [];
    
    selectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          if (element instanceof HTMLImageElement) {
            // Check if image is part of React component tree
            if (this.isReactElement(element)) {
              images.push(element);
            }
          } else if (element && typeof element.querySelector === 'function') {
            // Handle wrapper elements
            const img = element.querySelector('img');
            if (img && this.isReactElement(img)) {
              images.push(img);
            }
          }
        });
      } catch (error) {
        console.warn('[DinoOverlay] Error with selector:', selector, error);
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
      try {
        // Wrap listener to work with React's synthetic event system
        const wrappedListener = this.wrapEventListenerForReact(listener, element);
        
        // Use capture phase to avoid conflicts with React's event delegation
        element.addEventListener(eventType, wrappedListener, { 
          capture: true,
          passive: true 
        });
        
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
      element.removeEventListener(eventType, listener, { capture: true });
    });

    this.eventListeners.delete(element);
  }

  public onFrameworkMount(): void {
    this.lifecycleHooks.afterMount?.();
    this.setupReactRootObservation();
  }

  public onFrameworkUnmount(): void {
    this.lifecycleHooks.beforeUnmount?.();
    this.cleanup();
  }

  public onFrameworkUpdate(): void {
    this.lifecycleHooks.onUpdate?.();
    // Re-scan for images after React updates
    setTimeout(() => this.triggerImageRescan(), 0);
  }

  public preventStyleConflicts(): void {
    // React-specific style isolation
    this.preventReactStyleConflicts();
    this.handleStyledComponentsConflicts();
    this.handleCSSModulesConflicts();
  }

  public optimizeForFramework(): void {
    // React-specific optimizations
    this.optimizeForReactLifecycle();
    this.optimizeForNextJS();
    this.optimizeForCreateReactApp();
    this.handleReactStrictMode();
  }

  private detectReactVersion(): void {
    try {
      if (typeof window !== 'undefined') {
        // Try to get React version from global
        if ('React' in window && (window as any).React && (window as any).React.version) {
          this.reactVersion = (window as any).React.version;
        }
        
        // Try to detect from React DevTools
        if ('__REACT_DEVTOOLS_GLOBAL_HOOK__' in window) {
          const devtools = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
          if (devtools && devtools.renderers && devtools.renderers.size > 0) {
            const renderer = Array.from(devtools.renderers.values())[0];
            if (renderer && renderer.version) {
              this.reactVersion = renderer.version;
            }
          }
        }
      }
    } catch (error) {
      console.warn('[DinoOverlay] Error detecting React version:', error);
    }
  }

  private isReactElement(element: HTMLElement): boolean {
    // Check if element is part of React component tree
    let current: any = element;
    
    while (current) {
      // React Fiber properties
      if (current._reactInternalFiber || 
          current.__reactInternalInstance || 
          current._reactInternalInstance ||
          current.__reactFiber$) {
        return true;
      }
      
      // Check for React props
      const keys = Object.keys(current);
      if (keys.some(key => key.startsWith('__reactProps') || key.startsWith('__reactEventHandlers'))) {
        return true;
      }
      
      current = current.parentElement;
    }
    
    return false;
  }

  private setupReactLifecycleIntegration(): void {
    // Hook into React lifecycle events
    this.setupReactDevToolsIntegration();
    this.setupReactRootDetection();
    this.setupComponentUpdateDetection();
  }

  private setupReactDevToolsIntegration(): void {
    if (typeof window !== 'undefined' && '__REACT_DEVTOOLS_GLOBAL_HOOK__' in window) {
      const devtools = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
      
      // Hook into React DevTools events
      const originalOnCommitFiberRoot = devtools.onCommitFiberRoot;
      devtools.onCommitFiberRoot = (id: number, root: any, ...args: any[]) => {
        // React component tree has been updated
        this.onFrameworkUpdate();
        
        if (originalOnCommitFiberRoot) {
          return originalOnCommitFiberRoot.call(devtools, id, root, ...args);
        }
      };
    }
  }

  private setupReactRootDetection(): void {
    // Detect React roots (React 18+ and legacy)
    const rootSelectors = [
      '[data-reactroot]',
      '#root',
      '#app',
      '.react-root',
      '[data-react-app]'
    ];

    rootSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        this.reactRoots.add(element);
      });
    });
  }

  private setupComponentUpdateDetection(): void {
    // Set up mutation observer to detect React component updates
    this.mutationObserver = new MutationObserver((mutations) => {
      let shouldRescan = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          // Check if added/removed nodes are React components
          const addedNodes = Array.from(mutation.addedNodes);
          const removedNodes = Array.from(mutation.removedNodes);
          
          const hasReactChanges = [...addedNodes, ...removedNodes].some(node => {
            return node instanceof HTMLElement && this.isReactElement(node);
          });
          
          if (hasReactChanges) {
            shouldRescan = true;
          }
        }
      });
      
      if (shouldRescan) {
        // Debounce rescans to avoid excessive calls
        this.debounceRescan();
      }
    });

    // Observe React roots
    this.reactRoots.forEach(root => {
      this.mutationObserver!.observe(root, {
        childList: true,
        subtree: true,
        attributes: false
      });
    });
  }

  private handleVirtualDOMConflicts(): void {
    // Prevent conflicts with React's virtual DOM
    this.preventDirectDOMManipulation();
    this.handleReactEventDelegation();
    this.preventReactKeyConflicts();
  }

  private preventDirectDOMManipulation(): void {
    // Ensure we don't directly manipulate DOM elements managed by React
    // Our overlay should be in Shadow DOM to avoid this
  }

  private handleReactEventDelegation(): void {
    // React uses event delegation on document
    // Use capture phase to handle events before React
  }

  private preventReactKeyConflicts(): void {
    // Avoid adding properties that might conflict with React's internal properties
    const reservedProps = [
      'key',
      'ref',
      'children',
      '__reactInternalInstance',
      '_reactInternalFiber'
    ];
    
    // Ensure we don't use these property names
  }

  private preventReactStyleConflicts(): void {
    // React-specific style conflict prevention
    const styleOverrides = `
      /* React compatibility styles */
      .dino-overlay-root {
        /* Ensure our styles don't interfere with React components */
        isolation: isolate;
      }
      
      /* Prevent React CSS-in-JS conflicts */
      .dino-overlay-root * {
        /* Reset any inherited styles from React components */
        all: unset;
        display: revert;
        box-sizing: border-box;
      }
      
      /* Restore our component styles */
      .dino-overlay-root .glass,
      .dino-overlay-root .interactive {
        all: revert;
      }
    `;

    const styleElement = document.createElement('style');
    styleElement.textContent = styleOverrides;
    document.head.appendChild(styleElement);
  }

  private handleStyledComponentsConflicts(): void {
    // Handle styled-components library conflicts
    if (typeof window !== 'undefined' && '__styled-components-stylesheet__' in window) {
      // styled-components is present
      // Ensure our styles have higher specificity
    }
  }

  private handleCSSModulesConflicts(): void {
    // Handle CSS Modules conflicts
    // CSS Modules use hashed class names, so conflicts are unlikely
    // But we should still ensure proper isolation
  }

  private optimizeForReactLifecycle(): void {
    // Optimize for React's lifecycle
    this.setupReactSchedulerIntegration();
    this.handleReactConcurrentMode();
  }

  private setupReactSchedulerIntegration(): void {
    // Integrate with React's scheduler if available
    if (typeof window !== 'undefined' && 'scheduler' in window) {
      const scheduler = (window as any).scheduler;
      
      // Use React's scheduler for our updates
      if (scheduler.unstable_scheduleCallback) {
        // Schedule our updates with low priority
      }
    }
  }

  private handleReactConcurrentMode(): void {
    // Handle React Concurrent Mode (React 18+)
    // Ensure our updates don't interfere with React's time slicing
  }

  private optimizeForNextJS(): void {
    // Next.js specific optimizations
    if (this.isNextJSApp()) {
      this.handleNextJSRouting();
      this.handleNextJSImageComponent();
      this.handleNextJSSSR();
    }
  }

  private isNextJSApp(): boolean {
    return !!(
      document.querySelector('#__next') ||
      document.querySelector('script[src*="_next"]') ||
      (typeof window !== 'undefined' && '__NEXT_DATA__' in window)
    );
  }

  private handleNextJSRouting(): void {
    // Handle Next.js client-side routing
    if (typeof window !== 'undefined' && 'next' in window) {
      const router = (window as any).next.router;
      
      if (router) {
        router.events.on('routeChangeComplete', () => {
          // Page has changed, rescan for images
          setTimeout(() => this.triggerImageRescan(), 100);
        });
      }
    }
  }

  private handleNextJSImageComponent(): void {
    // Handle Next.js Image component
    // Next.js images have data-nimg attribute
    const nextImages = document.querySelectorAll('img[data-nimg]');
    nextImages.forEach(img => {
      if (img instanceof HTMLImageElement) {
        // Add our class to Next.js images
        img.classList.add('editable-room');
      }
    });
  }

  private handleNextJSSSR(): void {
    // Handle Next.js Server-Side Rendering
    // Ensure our overlay works with SSR content
    if (typeof window !== 'undefined' && '__NEXT_DATA__' in window) {
      // SSR content is present
      // Wait for hydration to complete
      setTimeout(() => this.triggerImageRescan(), 1000);
    }
  }

  private optimizeForCreateReactApp(): void {
    // Create React App specific optimizations
    if (this.isCreateReactApp()) {
      this.handleCRAServiceWorker();
      this.handleCRAHotReloading();
    }
  }

  private isCreateReactApp(): boolean {
    return !!(
      document.querySelector('meta[name="theme-color"]') &&
      document.querySelector('link[rel="manifest"]') &&
      document.querySelector('#root')
    );
  }

  private handleCRAServiceWorker(): void {
    // Handle Create React App service worker
    if ('serviceWorker' in navigator) {
      // Service worker might cache our resources
    }
  }

  private handleCRAHotReloading(): void {
    // Handle Create React App hot reloading in development
    if (process.env.NODE_ENV === 'development') {
      // Hot reloading might cause our overlay to be removed
      // Set up re-initialization
    }
  }

  private handleReactStrictMode(): void {
    // React Strict Mode causes double rendering in development
    // Ensure our initialization is idempotent
  }

  private setupReactRootObservation(): void {
    // Observe React roots for changes
    this.reactRoots.forEach(root => {
      if (this.mutationObserver) {
        this.mutationObserver.observe(root, {
          childList: true,
          subtree: true
        });
      }
    });
  }

  private wrapEventListenerForReact(listener: EventListener, element: HTMLElement): EventListener {
    return (event: Event) => {
      try {
        // Prevent conflicts with React's synthetic event system
        // Use capture phase to handle before React
        listener(event);
      } catch (error) {
        console.error('[DinoOverlay] React event listener error:', error);
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