import { OverlayAnimations, OverlayAnimationConfig } from '../../src/core/OverlayAnimations';
import { AnimationSystem } from '../../src/core/AnimationSystem';
import { SelectedImage } from '../../src/types/overlay';

// Mock AnimationSystem
const mockAnimationSystem = {
  slideIn: jest.fn(),
  slideOut: jest.fn(),
  fadeIn: jest.fn(),
  fadeOut: jest.fn(),
  createCustomAnimation: jest.fn(),
  setupHoverAnimation: jest.fn(),
  setupFocusAnimation: jest.fn(),
  pulse: jest.fn(),
  shake: jest.fn(),
  glow: jest.fn(),
  spin: jest.fn()
} as unknown as AnimationSystem;

const mockCleanup = {
  cancel: jest.fn(),
  finish: jest.fn(),
  pause: jest.fn(),
  play: jest.fn()
};

const mockHoverCleanup = jest.fn();

// Mock HTMLElement
const createMockElement = () => ({
  style: {} as CSSStyleDeclaration,
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(),
  children: [],
  className: 'test-element'
} as unknown as HTMLElement);

// Mock SelectedImage
const createMockSelectedImage = (): SelectedImage => ({
  element: document.createElement('img'),
  rect: {
    x: 100,
    y: 100,
    width: 200,
    height: 150,
    top: 100,
    left: 100,
    bottom: 250,
    right: 300,
    toJSON: () => ({})
  } as DOMRect,
  borderRadius: '8px'
});

// Mock window.matchMedia for reduced motion detection
const mockMatchMedia = jest.fn().mockImplementation(query => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
}));

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: mockMatchMedia,
});

describe('OverlayAnimations', () => {
  let overlayAnimations: OverlayAnimations;
  let mockElement: HTMLElement;
  let mockSelectedImage: SelectedImage;

  beforeEach(() => {
    // Reset matchMedia to default (no reduced motion)
    mockMatchMedia.mockImplementation(query => ({
      matches: false,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    }));

    overlayAnimations = new OverlayAnimations(mockAnimationSystem);
    mockElement = createMockElement();
    mockSelectedImage = createMockSelectedImage();

    // Reset all mocks
    Object.values(mockAnimationSystem).forEach(mock => {
      if (jest.isMockFunction(mock)) {
        mock.mockReturnValue(mockCleanup);
      }
    });
    
    // Setup specific mocks for hover/focus animations
    (mockAnimationSystem.setupHoverAnimation as jest.Mock).mockReturnValue(mockHoverCleanup);
    (mockAnimationSystem.setupFocusAnimation as jest.Mock).mockReturnValue(mockHoverCleanup);
    
    jest.clearAllMocks();
  });

  afterEach(() => {
    overlayAnimations.cleanup();
  });

  describe('animateSidebarIn', () => {
    it('should animate sidebar in for desktop', () => {
      const mockBackdrop = createMockElement();
      const mockPanel = createMockElement();
      
      mockElement.querySelector = jest.fn()
        .mockReturnValueOnce(mockBackdrop)
        .mockReturnValueOnce(mockPanel);

      overlayAnimations.animateSidebarIn(mockElement, false);

      expect(mockElement.style.display).toBe('block');
      expect(mockElement.style.pointerEvents).toBe('auto');
      expect(mockAnimationSystem.fadeIn).toHaveBeenCalledWith(mockBackdrop, { duration: 240 });
      expect(mockAnimationSystem.createCustomAnimation).toHaveBeenCalledWith(
        mockPanel,
        [
          {
            transform: 'translateX(100%) scale(0.95)',
            opacity: '0'
          },
          {
            transform: 'translateX(0) scale(1)',
            opacity: '1'
          }
        ],
        expect.objectContaining({
          duration: 300,
          easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
        })
      );
    });

    it('should animate sidebar in for mobile', () => {
      const mockBackdrop = createMockElement();
      const mockPanel = createMockElement();
      
      mockElement.querySelector = jest.fn()
        .mockReturnValueOnce(mockBackdrop)
        .mockReturnValueOnce(mockPanel);

      overlayAnimations.animateSidebarIn(mockElement, true);

      expect(mockAnimationSystem.createCustomAnimation).toHaveBeenCalledWith(
        mockPanel,
        [
          {
            transform: 'translateY(100%) scale(0.95)',
            opacity: '0'
          },
          {
            transform: 'translateY(0) scale(1)',
            opacity: '1'
          }
        ],
        expect.objectContaining({
          duration: 400,
          easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
        })
      );
    });

    it('should accept custom animation config', () => {
      const mockPanel = createMockElement();
      mockElement.querySelector = jest.fn().mockReturnValue(mockPanel);

      const config: OverlayAnimationConfig = {
        duration: 500,
        easing: 'ease-in-out',
        stagger: 50
      };

      overlayAnimations.animateSidebarIn(mockElement, false, config);

      expect(mockAnimationSystem.createCustomAnimation).toHaveBeenCalledWith(
        mockPanel,
        expect.any(Array),
        expect.objectContaining({
          duration: 500,
          easing: 'ease-in-out',
          delay: 50
        })
      );
    });

    it('should skip animation when respectsReducedMotion is true and user prefers reduced motion', () => {
      // Mock reduced motion preference
      mockMatchMedia.mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      }));

      // Create new instance to pick up the mocked matchMedia
      const reducedMotionAnimations = new OverlayAnimations(mockAnimationSystem);
      
      const cleanup = reducedMotionAnimations.animateSidebarIn(mockElement, false, {
        respectsReducedMotion: true
      });

      expect(mockAnimationSystem.createCustomAnimation).not.toHaveBeenCalled();
      expect(cleanup.cancel).toBeDefined();
    });
  });

  describe('animateSidebarOut', () => {
    it('should animate sidebar out for desktop', () => {
      const mockBackdrop = createMockElement();
      const mockPanel = createMockElement();
      
      mockElement.querySelector = jest.fn()
        .mockReturnValueOnce(mockBackdrop)
        .mockReturnValueOnce(mockPanel);

      overlayAnimations.animateSidebarOut(mockElement, false);

      expect(mockAnimationSystem.fadeOut).toHaveBeenCalledWith(mockBackdrop, { duration: 150 });
      expect(mockAnimationSystem.createCustomAnimation).toHaveBeenCalledWith(
        mockPanel,
        [
          {
            transform: 'translateX(0) scale(1)',
            opacity: '1'
          },
          {
            transform: 'translateX(100%) scale(0.95)',
            opacity: '0'
          }
        ],
        expect.objectContaining({
          duration: 250,
          easing: 'cubic-bezier(0.4, 0, 1, 1)'
        })
      );
    });

    it('should animate sidebar out for mobile', () => {
      const mockPanel = createMockElement();
      mockElement.querySelector = jest.fn().mockReturnValue(mockPanel);

      overlayAnimations.animateSidebarOut(mockElement, true);

      expect(mockAnimationSystem.createCustomAnimation).toHaveBeenCalledWith(
        mockPanel,
        [
          {
            transform: 'translateY(0) scale(1)',
            opacity: '1'
          },
          {
            transform: 'translateY(100%) scale(0.95)',
            opacity: '0'
          }
        ],
        expect.objectContaining({
          duration: 350,
          easing: 'cubic-bezier(0.4, 0, 1, 1)'
        })
      );
    });
  });

  describe('animateChatBarIn', () => {
    it('should animate chat bar in', () => {
      overlayAnimations.animateChatBarIn(mockElement);

      expect(mockElement.style.display).toBe('block');
      expect(mockElement.style.pointerEvents).toBe('auto');
      expect(mockAnimationSystem.createCustomAnimation).toHaveBeenCalledWith(
        mockElement,
        [
          {
            transform: 'translateY(100%) scale(0.9)',
            opacity: '0'
          },
          {
            transform: 'translateY(0) scale(1)',
            opacity: '1'
          }
        ],
        expect.objectContaining({
          duration: 300,
          easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
        })
      );
    });

    it('should accept custom config', () => {
      const config: OverlayAnimationConfig = {
        duration: 400,
        easing: 'ease-out',
        stagger: 100
      };

      overlayAnimations.animateChatBarIn(mockElement, config);

      expect(mockAnimationSystem.createCustomAnimation).toHaveBeenCalledWith(
        mockElement,
        expect.any(Array),
        expect.objectContaining({
          duration: 400,
          easing: 'ease-out',
          delay: 100
        })
      );
    });
  });

  describe('animateChatBarOut', () => {
    it('should animate chat bar out', () => {
      overlayAnimations.animateChatBarOut(mockElement);

      expect(mockAnimationSystem.createCustomAnimation).toHaveBeenCalledWith(
        mockElement,
        [
          {
            transform: 'translateY(0) scale(1)',
            opacity: '1'
          },
          {
            transform: 'translateY(100%) scale(0.9)',
            opacity: '0'
          }
        ],
        expect.objectContaining({
          duration: 250,
          easing: 'cubic-bezier(0.4, 0, 1, 1)'
        })
      );
    });
  });

  describe('animateHighlighterIn', () => {
    it('should animate highlighter in and position it correctly', () => {
      overlayAnimations.animateHighlighterIn(mockElement, mockSelectedImage);

      // Check positioning
      expect(mockElement.style.position).toBe('absolute');
      expect(mockElement.style.left).toBe('100px');
      expect(mockElement.style.top).toBe('100px');
      expect(mockElement.style.width).toBe('200px');
      expect(mockElement.style.height).toBe('150px');
      expect(mockElement.style.borderRadius).toBe('8px');

      expect(mockAnimationSystem.createCustomAnimation).toHaveBeenCalledWith(
        mockElement,
        [
          {
            opacity: '0',
            transform: 'scale(0.8)',
            borderWidth: '0px'
          },
          {
            opacity: '1',
            transform: 'scale(1)',
            borderWidth: '2px'
          }
        ],
        expect.objectContaining({
          duration: 400,
          easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
        })
      );

      expect(mockAnimationSystem.glow).toHaveBeenCalledWith(
        mockElement,
        'rgba(59, 130, 246, 0.6)',
        expect.objectContaining({
          duration: 2000,
          iterations: Infinity
        })
      );
    });
  });

  describe('animateHighlighterOut', () => {
    it('should animate highlighter out', () => {
      overlayAnimations.animateHighlighterOut(mockElement);

      expect(mockAnimationSystem.createCustomAnimation).toHaveBeenCalledWith(
        mockElement,
        [
          {
            opacity: '1',
            transform: 'scale(1)'
          },
          {
            opacity: '0',
            transform: 'scale(0.8)'
          }
        ],
        expect.objectContaining({
          duration: 200,
          easing: 'cubic-bezier(0.4, 0, 1, 1)'
        })
      );
    });
  });

  describe('setupButtonHoverAnimation', () => {
    it('should setup button hover animation', () => {
      const cleanup = overlayAnimations.setupButtonHoverAnimation(mockElement);

      expect(mockAnimationSystem.setupHoverAnimation).toHaveBeenCalledWith(
        mockElement,
        {
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.08))',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.2)'
        },
        expect.objectContaining({
          duration: 200,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          scaleOnHover: true,
          glowOnHover: true,
          glowColor: 'rgba(59, 130, 246, 0.3)'
        })
      );

      expect(typeof cleanup).toBe('function');
    });

    it('should skip animation when respectsReducedMotion is true', () => {
      // Mock reduced motion preference
      mockMatchMedia.mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      }));

      const reducedMotionAnimations = new OverlayAnimations(mockAnimationSystem);
      const cleanup = reducedMotionAnimations.setupButtonHoverAnimation(mockElement, {
        respectsReducedMotion: true
      });

      expect(mockAnimationSystem.setupHoverAnimation).not.toHaveBeenCalled();
      expect(typeof cleanup).toBe('function');
    });
  });

  describe('setupButtonFocusAnimation', () => {
    it('should setup button focus animation', () => {
      const cleanup = overlayAnimations.setupButtonFocusAnimation(mockElement);

      expect(mockAnimationSystem.setupFocusAnimation).toHaveBeenCalledWith(
        mockElement,
        {
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.08))'
        },
        expect.objectContaining({
          duration: 200,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          glowOnFocus: true,
          glowColor: 'rgba(59, 130, 246, 0.5)'
        })
      );

      expect(typeof cleanup).toBe('function');
    });
  });

  describe('animateLoadingState', () => {
    it('should animate loading state when isLoading is true', () => {
      const mockIcon = createMockElement();
      mockElement.querySelector = jest.fn().mockReturnValue(mockIcon);

      overlayAnimations.animateLoadingState(mockElement, true);

      expect(mockAnimationSystem.pulse).toHaveBeenCalledWith(
        mockElement,
        expect.objectContaining({
          duration: 1000,
          iterations: Infinity
        })
      );
    });

    it('should remove loading spinner when isLoading is false', () => {
      const mockSpinner = createMockElement();
      mockSpinner.remove = jest.fn();
      mockElement.querySelector = jest.fn().mockReturnValue(mockSpinner);

      overlayAnimations.animateLoadingState(mockElement, false);

      expect(mockSpinner.remove).toHaveBeenCalled();
    });
  });

  describe('animateErrorState', () => {
    it('should animate error state with shake and styling', () => {
      const originalBackground = 'original-bg';
      const originalBorder = 'original-border';
      mockElement.style.background = originalBackground;
      mockElement.style.border = originalBorder;

      overlayAnimations.animateErrorState(mockElement);

      expect(mockElement.style.background).toBe('linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.1))');
      expect(mockElement.style.border).toBe('1px solid rgba(239, 68, 68, 0.3)');
      expect(mockAnimationSystem.shake).toHaveBeenCalledWith(
        mockElement,
        expect.objectContaining({
          duration: 500,
          easing: 'ease-in-out'
        })
      );
    });
  });

  describe('animateStaggeredList', () => {
    it('should animate list items with stagger', () => {
      const mockChild1 = createMockElement();
      const mockChild2 = createMockElement();
      const mockChild3 = createMockElement();
      
      mockElement.children = [mockChild1, mockChild2, mockChild3] as any;

      const cleanups = overlayAnimations.animateStaggeredList(mockElement);

      expect(cleanups).toHaveLength(3);
      expect(mockAnimationSystem.createCustomAnimation).toHaveBeenCalledTimes(3);

      // Check stagger delays
      expect(mockAnimationSystem.createCustomAnimation).toHaveBeenNthCalledWith(
        1,
        mockChild1,
        expect.any(Array),
        expect.objectContaining({ delay: 0 })
      );
      expect(mockAnimationSystem.createCustomAnimation).toHaveBeenNthCalledWith(
        2,
        mockChild2,
        expect.any(Array),
        expect.objectContaining({ delay: 50 })
      );
      expect(mockAnimationSystem.createCustomAnimation).toHaveBeenNthCalledWith(
        3,
        mockChild3,
        expect.any(Array),
        expect.objectContaining({ delay: 100 })
      );
    });

    it('should return empty array when respectsReducedMotion is true', () => {
      // Mock reduced motion preference
      mockMatchMedia.mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      }));

      const reducedMotionAnimations = new OverlayAnimations(mockAnimationSystem);
      const cleanups = reducedMotionAnimations.animateStaggeredList(mockElement, {
        respectsReducedMotion: true
      });

      expect(cleanups).toEqual([]);
      expect(mockAnimationSystem.createCustomAnimation).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should clean up all active animations', () => {
      // Reset the mock to ensure it's a jest function
      mockCleanup.cancel = jest.fn();
      
      // Create some animations
      overlayAnimations.animateSidebarIn(mockElement);
      overlayAnimations.animateChatBarIn(mockElement);

      overlayAnimations.cleanup();

      expect(mockCleanup.cancel).toHaveBeenCalled();
    });

    it('should clean up specific animation', () => {
      // Spy on the cleanupAnimation method to verify it's called
      const cleanupSpy = jest.spyOn(overlayAnimations, 'cleanupAnimation');
      
      overlayAnimations.cleanupAnimation('sidebar-in');

      expect(cleanupSpy).toHaveBeenCalledWith('sidebar-in');
      
      cleanupSpy.mockRestore();
    });
  });

  describe('reduced motion detection', () => {
    it('should detect reduced motion preference on initialization', () => {
      mockMatchMedia.mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      }));

      const reducedMotionAnimations = new OverlayAnimations(mockAnimationSystem);
      
      // Should skip animations when reduced motion is preferred
      const cleanup = reducedMotionAnimations.animateSidebarIn(mockElement, false, {
        respectsReducedMotion: true
      });

      expect(mockAnimationSystem.createCustomAnimation).not.toHaveBeenCalled();
    });

    it('should listen for changes in reduced motion preference', () => {
      const mockMediaQuery = {
        matches: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      };

      mockMatchMedia.mockReturnValue(mockMediaQuery);

      new OverlayAnimations(mockAnimationSystem);

      expect(mockMediaQuery.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });
  });
});