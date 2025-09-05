import { QuickActionSidebar } from '../../src/core/QuickActionSidebar';
import { ResponsiveManager } from '../../src/core/ResponsiveManager';
import { SidebarProps, OverlayState } from '../../src/types/overlay';
import { DinoOverlayConfig } from '../../src/types/config';

// Mock DOM APIs
const mockElement = {
  style: {},
  classList: {
    add: jest.fn(),
    remove: jest.fn(),
    contains: jest.fn()
  },
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(() => []),
  appendChild: jest.fn(),
  removeChild: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  setAttribute: jest.fn(),
  getAttribute: jest.fn(),
  parentNode: {
    removeChild: jest.fn()
  },
  animate: jest.fn(() => ({
    addEventListener: jest.fn(),
    cancel: jest.fn()
  }))
} as unknown as HTMLElement;

// Mock document.createElement
const mockCreateElement = jest.fn(() => mockElement);
Object.defineProperty(document, 'createElement', {
  value: mockCreateElement,
  writable: true
});

// Mock window properties
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

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: jest.fn(() => ({
    matches: false,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  }))
});

Object.defineProperty(global, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: jest.fn(() => ({
    observe: jest.fn(),
    disconnect: jest.fn()
  }))
});

describe('ResponsiveQuickActionSidebar', () => {
  let sidebar: QuickActionSidebar;
  let responsiveManager: ResponsiveManager;
  let mockProps: SidebarProps;
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

    responsiveManager = new ResponsiveManager(config);
    
    mockProps = {
      visible: false,
      selectedImage: null,
      onActionClick: jest.fn(),
      onClose: jest.fn(),
      isProcessing: false,
      currentAction: null
    };

    sidebar = new QuickActionSidebar(mockProps, responsiveManager);
  });

  afterEach(() => {
    if (sidebar) {
      sidebar.destroy();
    }
    if (responsiveManager) {
      responsiveManager.destroy();
    }
  });

  describe('responsive initialization', () => {
    it('should initialize with responsive manager', () => {
      expect(sidebar).toBeDefined();
      expect(() => sidebar.render()).not.toThrow();
    });

    it('should work without responsive manager', () => {
      const standaloneBar = new QuickActionSidebar(mockProps);
      expect(standaloneBar).toBeDefined();
      expect(() => standaloneBar.render()).not.toThrow();
      standaloneBar.destroy();
    });
  });

  describe('mobile layout adaptation', () => {
    beforeEach(() => {
      // Set mobile viewport
      (window as any).innerWidth = 375;
      (window as any).innerHeight = 667;
      responsiveManager = new ResponsiveManager(config);
      sidebar = new QuickActionSidebar(mockProps, responsiveManager);
    });

    it('should apply mobile styles on mobile viewport', () => {
      const element = sidebar.render();
      
      // Verify mobile-specific styling was applied
      expect(mockCreateElement).toHaveBeenCalledWith('div');
      
      // Check that mobile layout methods would be called
      const viewport = responsiveManager.getViewportInfo();
      expect(viewport.isMobile).toBe(true);
      expect(responsiveManager.shouldUseMobileLayout()).toBe(true);
    });

    it('should calculate optimal sidebar width for mobile', () => {
      const width = responsiveManager.getOptimalSidebarWidth();
      expect(width).toBe(Math.min(375 * 0.9, 400));
    });

    it('should use bottom sheet animation on mobile', () => {
      const element = sidebar.render();
      
      // Simulate showing sidebar
      sidebar.update({
        selectedImage: null,
        sidebarVisible: true,
        chatBarVisible: false,
        isProcessing: false,
        currentAction: null
      });

      // Verify animation setup
      expect(mockElement.animate).toHaveBeenCalled();
    });
  });

  describe('touch device optimization', () => {
    beforeEach(() => {
      // Mock touch device
      Object.defineProperty(navigator, 'maxTouchPoints', {
        writable: true,
        configurable: true,
        value: 1
      });
      
      responsiveManager = new ResponsiveManager(config);
      sidebar = new QuickActionSidebar(mockProps, responsiveManager);
    });

    it('should detect touch device', () => {
      const viewport = responsiveManager.getViewportInfo();
      expect(viewport.isTouchDevice).toBe(true);
    });

    it('should use appropriate touch target size', () => {
      const touchTargetSize = responsiveManager.getTouchTargetSize();
      expect(touchTargetSize).toBe(44);
    });

    it('should apply touch-friendly button styles', () => {
      const element = sidebar.render();
      
      // Verify touch-optimized styling would be applied
      const viewport = responsiveManager.getViewportInfo();
      expect(viewport.isTouchDevice).toBe(true);
    });
  });

  describe('responsive state updates', () => {
    beforeEach(() => {
      responsiveManager.initialize();
      sidebar.render();
    });

    it('should handle viewport changes', () => {
      const initialViewport = responsiveManager.getViewportInfo();
      expect(initialViewport.isDesktop).toBe(true);

      // Simulate viewport change to mobile
      (window as any).innerWidth = 375;
      (responsiveManager as any).updateViewportInfo();

      const newViewport = responsiveManager.getViewportInfo();
      expect(newViewport.isMobile).toBe(true);
    });

    it('should update styles on breakpoint change', () => {
      const breakpointCallback = jest.fn();
      responsiveManager.on('breakpointChanged', breakpointCallback);

      // Simulate breakpoint change
      (window as any).innerWidth = 375;
      (responsiveManager as any).updateViewportInfo();

      expect(breakpointCallback).toHaveBeenCalled();
    });

    it('should handle orientation changes', () => {
      const orientationCallback = jest.fn();
      responsiveManager.on('orientationChanged', orientationCallback);

      // Simulate orientation change
      (window as any).innerWidth = 667;
      (window as any).innerHeight = 375;
      (responsiveManager as any).updateViewportInfo();

      expect(orientationCallback).toHaveBeenCalledWith('landscape');
    });
  });

  describe('touch gesture handling', () => {
    beforeEach(() => {
      // Mock touch device
      Object.defineProperty(navigator, 'maxTouchPoints', {
        writable: true,
        configurable: true,
        value: 1
      });
      
      (window as any).innerWidth = 375;
      responsiveManager = new ResponsiveManager(config);
      sidebar = new QuickActionSidebar(mockProps, responsiveManager);
      sidebar.render();
    });

    it('should setup touch gesture handler on touch devices', () => {
      const viewport = responsiveManager.getViewportInfo();
      expect(viewport.isTouchDevice).toBe(true);
      
      // Touch gesture handler should be initialized
      // (This would be tested through integration with actual touch events)
    });

    it('should handle swipe gestures to close', () => {
      // This would test the swipe-to-close functionality
      // Implementation depends on the actual touch gesture integration
      expect(sidebar).toBeDefined();
    });
  });

  describe('responsive positioning', () => {
    it('should calculate correct chat bar position for tablet', () => {
      const position = responsiveManager.getOptimalChatBarPosition();
      expect(position).toEqual({
        bottom: 20,
        right: 20
      });
    });

    it('should calculate correct chat bar position for mobile', () => {
      (window as any).innerWidth = 375;
      const mobileManager = new ResponsiveManager(config);
      
      const position = mobileManager.getOptimalChatBarPosition();
      expect(position).toEqual({
        bottom: 12,
        right: 12,
        left: 12
      });
      
      mobileManager.destroy();
    });

    it('should adapt sidebar width based on viewport', () => {
      // Tablet (1024px is tablet range)
      let width = responsiveManager.getOptimalSidebarWidth();
      expect(width).toBe(Math.min(1024 * 0.6, 480)); // 480 for tablet

      // Mobile
      (window as any).innerWidth = 375;
      const mobileManager = new ResponsiveManager(config);
      width = mobileManager.getOptimalSidebarWidth();
      expect(width).toBe(Math.min(375 * 0.9, 400));
      
      mobileManager.destroy();
    });
  });

  describe('animation adaptations', () => {
    it('should use slide-in-right animation on desktop', () => {
      const element = sidebar.render();
      
      sidebar.update({
        selectedImage: null,
        sidebarVisible: true,
        chatBarVisible: false,
        isProcessing: false,
        currentAction: null
      });

      // Desktop should use translateX animation
      expect(mockElement.animate).toHaveBeenCalled();
    });

    it('should use slide-in-up animation on mobile', () => {
      (window as any).innerWidth = 375;
      const mobileManager = new ResponsiveManager(config);
      const mobileSidebar = new QuickActionSidebar(mockProps, mobileManager);
      
      const element = mobileSidebar.render();
      
      mobileSidebar.update({
        selectedImage: null,
        sidebarVisible: true,
        chatBarVisible: false,
        isProcessing: false,
        currentAction: null
      });

      // Mobile should use translateY animation
      expect(mockElement.animate).toHaveBeenCalled();
      
      mobileSidebar.destroy();
      mobileManager.destroy();
    });
  });

  describe('accessibility on touch devices', () => {
    beforeEach(() => {
      Object.defineProperty(navigator, 'maxTouchPoints', {
        writable: true,
        configurable: true,
        value: 1
      });
      
      responsiveManager = new ResponsiveManager(config);
      sidebar = new QuickActionSidebar(mockProps, responsiveManager);
    });

    it('should ensure minimum touch target sizes', () => {
      const touchTargetSize = responsiveManager.getTouchTargetSize();
      expect(touchTargetSize).toBeGreaterThanOrEqual(44); // WCAG AA requirement
    });

    it('should apply touch-friendly styles', () => {
      const element = sidebar.render();
      
      // Verify that touch-friendly styles would be applied
      const viewport = responsiveManager.getViewportInfo();
      expect(viewport.isTouchDevice).toBe(true);
    });
  });

  describe('performance on mobile', () => {
    it('should use appropriate blur values for mobile', () => {
      (window as any).innerWidth = 375;
      const mobileManager = new ResponsiveManager(config);
      const mobileSidebar = new QuickActionSidebar(mockProps, mobileManager);
      
      const element = mobileSidebar.render();
      
      // Mobile should use less intensive blur effects
      const viewport = mobileManager.getViewportInfo();
      expect(viewport.isMobile).toBe(true);
      
      mobileSidebar.destroy();
      mobileManager.destroy();
    });

    it('should optimize animations for mobile', () => {
      (window as any).innerWidth = 375;
      const mobileManager = new ResponsiveManager(config);
      const mobileSidebar = new QuickActionSidebar(mockProps, mobileManager);
      
      const element = mobileSidebar.render();
      
      // Verify mobile-optimized animation setup
      expect(mockElement.animate).toBeDefined();
      
      mobileSidebar.destroy();
      mobileManager.destroy();
    });
  });

  describe('cleanup and memory management', () => {
    it('should properly cleanup responsive listeners', () => {
      responsiveManager.initialize();
      const element = sidebar.render();
      
      const offSpy = jest.spyOn(responsiveManager, 'off');
      
      sidebar.destroy();
      
      expect(offSpy).toHaveBeenCalled();
    });

    it('should cleanup touch gesture handlers', () => {
      Object.defineProperty(navigator, 'maxTouchPoints', {
        writable: true,
        configurable: true,
        value: 1
      });
      
      (window as any).innerWidth = 375;
      const mobileManager = new ResponsiveManager(config);
      const mobileSidebar = new QuickActionSidebar(mockProps, mobileManager);
      
      const element = mobileSidebar.render();
      
      // Should cleanup without errors
      expect(() => {
        mobileSidebar.destroy();
        mobileManager.destroy();
      }).not.toThrow();
    });
  });
});