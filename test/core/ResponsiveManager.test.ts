import { ResponsiveManager, ViewportInfo } from '../../src/core/ResponsiveManager';
import { DinoOverlayConfig } from '../../src/types/config';

// Mock window and DOM APIs
const mockWindow = {
  innerWidth: 1024,
  innerHeight: 768,
  devicePixelRatio: 1,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  matchMedia: jest.fn(),
  setTimeout: jest.fn(),
  clearTimeout: jest.fn()
};

const mockMediaQuery = {
  matches: false,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
};

const mockResizeObserver = {
  observe: jest.fn(),
  disconnect: jest.fn()
};

// Mock globals
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: 1024
});

Object.defineProperty(window, 'innerHeight', {
  writable: true,
  configurable: true,
  value: 768
});

Object.defineProperty(window, 'devicePixelRatio', {
  writable: true,
  configurable: true,
  value: 1
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: jest.fn(() => mockMediaQuery)
});

Object.defineProperty(global, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: jest.fn(() => mockResizeObserver)
});

Object.defineProperty(navigator, 'maxTouchPoints', {
  writable: true,
  configurable: true,
  value: 0
});

describe('ResponsiveManager', () => {
  let responsiveManager: ResponsiveManager;
  let config: Required<DinoOverlayConfig>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    config = {
      apiEndpoint: 'https://api.test.com',
      apiKey: 'test-key',
      theme: 'auto',
      enableAnalytics: false,
      debug: false
    };

    // Reset window dimensions
    (window as any).innerWidth = 1024;
    (window as any).innerHeight = 768;
    (navigator as any).maxTouchPoints = 0;
    
    responsiveManager = new ResponsiveManager(config);
  });

  afterEach(() => {
    if (responsiveManager) {
      responsiveManager.destroy();
    }
  });

  describe('initialization', () => {
    it('should initialize with correct viewport info', () => {
      const viewport = responsiveManager.getViewportInfo();
      
      expect(viewport.width).toBe(1024);
      expect(viewport.height).toBe(768);
      expect(viewport.isDesktop).toBe(false);
      expect(viewport.isMobile).toBe(false);
      expect(viewport.isTablet).toBe(true);
      expect(viewport.orientation).toBe('landscape');
      expect(viewport.isTouchDevice).toBe(false);
    });

    it('should setup event listeners on initialize', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      
      responsiveManager.initialize();
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function), { passive: true });
      expect(addEventListenerSpy).toHaveBeenCalledWith('orientationchange', expect.any(Function), { passive: true });
    });

    it('should setup media queries on initialize', () => {
      responsiveManager.initialize();
      
      expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 767px)');
      expect(window.matchMedia).toHaveBeenCalledWith('(min-width: 768px) and (max-width: 1199px)');
      expect(window.matchMedia).toHaveBeenCalledWith('(min-width: 1200px)');
      expect(window.matchMedia).toHaveBeenCalledWith('(orientation: portrait)');
      expect(window.matchMedia).toHaveBeenCalledWith('(orientation: landscape)');
    });
  });

  describe('viewport detection', () => {
    it('should detect mobile viewport', () => {
      (window as any).innerWidth = 375;
      (window as any).innerHeight = 667;
      
      const newManager = new ResponsiveManager(config);
      const viewport = newManager.getViewportInfo();
      
      expect(viewport.isMobile).toBe(true);
      expect(viewport.isTablet).toBe(false);
      expect(viewport.isDesktop).toBe(false);
      expect(viewport.orientation).toBe('portrait');
      
      newManager.destroy();
    });

    it('should detect tablet viewport', () => {
      (window as any).innerWidth = 768;
      (window as any).innerHeight = 1024;
      
      const newManager = new ResponsiveManager(config);
      const viewport = newManager.getViewportInfo();
      
      expect(viewport.isMobile).toBe(false);
      expect(viewport.isTablet).toBe(true);
      expect(viewport.isDesktop).toBe(false);
      expect(viewport.orientation).toBe('portrait');
      
      newManager.destroy();
    });

    it('should detect desktop viewport', () => {
      (window as any).innerWidth = 1440;
      (window as any).innerHeight = 900;
      
      const newManager = new ResponsiveManager(config);
      const viewport = newManager.getViewportInfo();
      
      expect(viewport.isMobile).toBe(false);
      expect(viewport.isTablet).toBe(false);
      expect(viewport.isDesktop).toBe(true);
      expect(viewport.orientation).toBe('landscape');
      
      newManager.destroy();
    });

    it('should detect touch device', () => {
      (navigator as any).maxTouchPoints = 1;
      
      const newManager = new ResponsiveManager(config);
      const viewport = newManager.getViewportInfo();
      
      expect(viewport.isTouchDevice).toBe(true);
      
      newManager.destroy();
    });
  });

  describe('breakpoint methods', () => {
    it('should return correct breakpoint states', () => {
      expect(responsiveManager.isMobile()).toBe(false);
      expect(responsiveManager.isTablet()).toBe(true);
      expect(responsiveManager.isDesktop()).toBe(false);
      expect(responsiveManager.isTouchDevice()).toBe(false);
    });

    it('should allow custom breakpoints', () => {
      responsiveManager.setBreakpoints({
        mobile: 600,
        tablet: 900,
        desktop: 1200
      });

      const breakpoints = responsiveManager.getBreakpoints();
      expect(breakpoints.mobile).toBe(600);
      expect(breakpoints.tablet).toBe(900);
      expect(breakpoints.desktop).toBe(1200);
    });
  });

  describe('responsive calculations', () => {
    it('should calculate optimal sidebar width for tablet', () => {
      const width = responsiveManager.getOptimalSidebarWidth();
      expect(width).toBe(Math.min(1024 * 0.6, 480)); // 480 for tablet
    });

    it('should calculate optimal sidebar width for mobile', () => {
      (window as any).innerWidth = 375;
      const newManager = new ResponsiveManager(config);
      
      const width = newManager.getOptimalSidebarWidth();
      expect(width).toBe(Math.min(375 * 0.9, 400));
      
      newManager.destroy();
    });

    it('should calculate optimal chat bar position for tablet', () => {
      const position = responsiveManager.getOptimalChatBarPosition();
      expect(position).toEqual({
        bottom: 20,
        right: 20
      });
    });

    it('should calculate optimal chat bar position for mobile', () => {
      (window as any).innerWidth = 375;
      const newManager = new ResponsiveManager(config);
      
      const position = newManager.getOptimalChatBarPosition();
      expect(position).toEqual({
        bottom: 12,
        right: 12,
        left: 12
      });
      
      newManager.destroy();
    });

    it('should determine mobile layout usage', () => {
      expect(responsiveManager.shouldUseMobileLayout()).toBe(false); // tablet in landscape
      
      (window as any).innerWidth = 375;
      const mobileManager = new ResponsiveManager(config);
      expect(mobileManager.shouldUseMobileLayout()).toBe(true);
      
      mobileManager.destroy();
    });

    it('should return correct touch target size', () => {
      expect(responsiveManager.getTouchTargetSize()).toBe(32);
      
      (navigator as any).maxTouchPoints = 1;
      const touchManager = new ResponsiveManager(config);
      expect(touchManager.getTouchTargetSize()).toBe(44);
      
      touchManager.destroy();
    });
  });

  describe('event handling', () => {
    it('should emit breakpoint changed event', () => {
      const callback = jest.fn();
      responsiveManager.on('breakpointChanged', callback);
      
      // Simulate viewport change
      (window as any).innerWidth = 375;
      (responsiveManager as any).updateViewportInfo();
      
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ isMobile: true }),
        expect.objectContaining({ isMobile: false })
      );
    });

    it('should emit orientation changed event', () => {
      const callback = jest.fn();
      responsiveManager.on('orientationChanged', callback);
      
      // Simulate orientation change from landscape to portrait
      (window as any).innerWidth = 375;
      (window as any).innerHeight = 667;
      (responsiveManager as any).updateViewportInfo();
      
      expect(callback).toHaveBeenCalledWith('portrait');
    });

    it('should emit viewport resized event', () => {
      const callback = jest.fn();
      responsiveManager.on('viewportResized', callback);
      
      // Simulate resize
      (window as any).innerWidth = 800;
      (responsiveManager as any).updateViewportInfo();
      
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ width: 800 })
      );
    });

    it('should remove event listeners', () => {
      const callback = jest.fn();
      responsiveManager.on('breakpointChanged', callback);
      responsiveManager.off('breakpointChanged', callback);
      
      // Simulate viewport change
      (window as any).innerWidth = 375;
      (responsiveManager as any).updateViewportInfo();
      
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('destruction', () => {
    it('should clean up resources on destroy', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
      
      responsiveManager.initialize();
      responsiveManager.destroy();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('orientationchange', expect.any(Function));
      expect(mockResizeObserver.disconnect).toHaveBeenCalled();
    });

    it('should not throw when destroying multiple times', () => {
      responsiveManager.initialize();
      
      expect(() => {
        responsiveManager.destroy();
        responsiveManager.destroy();
      }).not.toThrow();
    });

    it('should throw when using destroyed manager', () => {
      responsiveManager.destroy();
      
      expect(() => {
        responsiveManager.initialize();
      }).toThrow('ResponsiveManager has been destroyed');
    });
  });
});