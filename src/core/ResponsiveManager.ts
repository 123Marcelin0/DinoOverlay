import { DinoOverlayConfig } from '../types/config';

export interface ResponsiveBreakpoints {
  mobile: number;
  tablet: number;
  desktop: number;
}

export interface ViewportInfo {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  orientation: 'portrait' | 'landscape';
  devicePixelRatio: number;
  isTouchDevice: boolean;
}

export interface ResponsiveManagerEvents {
  breakpointChanged: (viewport: ViewportInfo, previousViewport: ViewportInfo) => void;
  orientationChanged: (orientation: 'portrait' | 'landscape') => void;
  viewportResized: (viewport: ViewportInfo) => void;
}

export class ResponsiveManager {
  private breakpoints: ResponsiveBreakpoints;
  private currentViewport: ViewportInfo;
  private previousViewport: ViewportInfo;
  private eventListeners: Map<string, Function[]> = new Map();
  private resizeObserver: ResizeObserver | null = null;
  private mediaQueries: Map<string, MediaQueryList> = new Map();
  private isDestroyed: boolean = false;
  private config: Required<DinoOverlayConfig>;

  constructor(config: Required<DinoOverlayConfig>) {
    this.config = config;
    this.breakpoints = {
      mobile: 768,
      tablet: 1024,
      desktop: 1200
    };

    // Initialize viewport info
    this.currentViewport = this.calculateViewportInfo();
    this.previousViewport = { ...this.currentViewport };

    // Bind methods
    this.handleResize = this.handleResize.bind(this);
    this.handleOrientationChange = this.handleOrientationChange.bind(this);
    this.handleMediaQueryChange = this.handleMediaQueryChange.bind(this);
  }

  public initialize(): void {
    if (this.isDestroyed) {
      throw new Error('ResponsiveManager has been destroyed');
    }

    this.setupEventListeners();
    this.setupMediaQueries();
    this.setupResizeObserver();

    if (this.config.debug) {
      console.log('[ResponsiveManager] Initialized with viewport:', this.currentViewport);
    }
  }

  public destroy(): void {
    if (this.isDestroyed) {
      return;
    }

    this.isDestroyed = true;

    // Remove event listeners
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('orientationchange', this.handleOrientationChange);

    // Disconnect resize observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    // Remove media query listeners
    for (const [key, mediaQuery] of this.mediaQueries) {
      mediaQuery.removeEventListener('change', this.handleMediaQueryChange);
    }
    this.mediaQueries.clear();

    // Clear event listeners
    this.eventListeners.clear();

    if (this.config.debug) {
      console.log('[ResponsiveManager] Destroyed');
    }
  }

  public getViewportInfo(): ViewportInfo {
    return { ...this.currentViewport };
  }

  public isMobile(): boolean {
    return this.currentViewport.isMobile;
  }

  public isTablet(): boolean {
    return this.currentViewport.isTablet;
  }

  public isDesktop(): boolean {
    return this.currentViewport.isDesktop;
  }

  public isTouchDevice(): boolean {
    return this.currentViewport.isTouchDevice;
  }

  public getBreakpoints(): ResponsiveBreakpoints {
    return { ...this.breakpoints };
  }

  public setBreakpoints(breakpoints: Partial<ResponsiveBreakpoints>): void {
    this.breakpoints = { ...this.breakpoints, ...breakpoints };
    this.updateViewportInfo();
  }

  public on<K extends keyof ResponsiveManagerEvents>(
    event: K,
    callback: ResponsiveManagerEvents[K]
  ): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  public off<K extends keyof ResponsiveManagerEvents>(
    event: K,
    callback: ResponsiveManagerEvents[K]
  ): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  public getOptimalSidebarWidth(): number {
    if (this.currentViewport.isMobile) {
      return Math.min(this.currentViewport.width * 0.9, 400);
    } else if (this.currentViewport.isTablet) {
      return Math.min(this.currentViewport.width * 0.6, 480);
    } else {
      return 320;
    }
  }

  public getOptimalChatBarPosition(): { bottom: number; right: number; left?: number } {
    const padding = this.currentViewport.isMobile ? 12 : 20;
    
    if (this.currentViewport.isMobile) {
      // Center chat bar on mobile
      return {
        bottom: padding,
        right: padding,
        left: padding
      };
    } else {
      // Bottom-right on larger screens
      return {
        bottom: padding,
        right: padding
      };
    }
  }

  public shouldUseMobileLayout(): boolean {
    return this.currentViewport.isMobile || 
           (this.currentViewport.isTablet && this.currentViewport.orientation === 'portrait');
  }

  public getTouchTargetSize(): number {
    // Minimum 44px touch target as per accessibility guidelines
    return this.currentViewport.isTouchDevice ? 44 : 32;
  }

  private calculateViewportInfo(): ViewportInfo {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const isMobile = width < this.breakpoints.mobile;
    const isTablet = width >= this.breakpoints.mobile && width < this.breakpoints.desktop;
    const isDesktop = width >= this.breakpoints.desktop;
    const orientation = width > height ? 'landscape' : 'portrait';
    const devicePixelRatio = window.devicePixelRatio || 1;
    const isTouchDevice = this.detectTouchDevice();

    return {
      width,
      height,
      isMobile,
      isTablet,
      isDesktop,
      orientation,
      devicePixelRatio,
      isTouchDevice
    };
  }

  private detectTouchDevice(): boolean {
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      (navigator as any).msMaxTouchPoints > 0
    );
  }

  private updateViewportInfo(): void {
    this.previousViewport = { ...this.currentViewport };
    this.currentViewport = this.calculateViewportInfo();

    // Check for breakpoint changes
    if (this.hasBreakpointChanged()) {
      this.emit('breakpointChanged', this.currentViewport, this.previousViewport);
    }

    // Check for orientation changes
    if (this.previousViewport.orientation !== this.currentViewport.orientation) {
      this.emit('orientationChanged', this.currentViewport.orientation);
    }

    // Always emit viewport resize
    this.emit('viewportResized', this.currentViewport);

    if (this.config.debug) {
      console.log('[ResponsiveManager] Viewport updated:', this.currentViewport);
    }
  }

  private hasBreakpointChanged(): boolean {
    return (
      this.previousViewport.isMobile !== this.currentViewport.isMobile ||
      this.previousViewport.isTablet !== this.currentViewport.isTablet ||
      this.previousViewport.isDesktop !== this.currentViewport.isDesktop
    );
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.handleResize, { passive: true });
    window.addEventListener('orientationchange', this.handleOrientationChange, { passive: true });
  }

  private setupMediaQueries(): void {
    const queries = {
      mobile: `(max-width: ${this.breakpoints.mobile - 1}px)`,
      tablet: `(min-width: ${this.breakpoints.mobile}px) and (max-width: ${this.breakpoints.desktop - 1}px)`,
      desktop: `(min-width: ${this.breakpoints.desktop}px)`,
      portrait: '(orientation: portrait)',
      landscape: '(orientation: landscape)',
      touch: '(pointer: coarse)',
      hover: '(hover: hover)'
    };

    for (const [key, query] of Object.entries(queries)) {
      const mediaQuery = window.matchMedia(query);
      mediaQuery.addEventListener('change', this.handleMediaQueryChange);
      this.mediaQueries.set(key, mediaQuery);
    }
  }

  private setupResizeObserver(): void {
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.handleResize();
      });

      // Observe the document body for size changes
      this.resizeObserver.observe(document.body);
    }
  }

  private handleResize(): void {
    if (this.isDestroyed) {
      return;
    }

    // Debounce resize events
    clearTimeout((this as any).resizeTimeout);
    (this as any).resizeTimeout = setTimeout(() => {
      this.updateViewportInfo();
    }, 16); // ~60fps
  }

  private handleOrientationChange(): void {
    if (this.isDestroyed) {
      return;
    }

    // Delay to allow viewport to update after orientation change
    setTimeout(() => {
      this.updateViewportInfo();
    }, 100);
  }

  private handleMediaQueryChange(): void {
    if (this.isDestroyed) {
      return;
    }

    this.updateViewportInfo();
  }

  private emit<K extends keyof ResponsiveManagerEvents>(
    event: K,
    ...args: Parameters<ResponsiveManagerEvents[K]>
  ): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        try {
          (listener as any)(...args);
        } catch (error) {
          console.error(`[ResponsiveManager] Error in ${event} listener:`, error);
        }
      }
    }
  }
}