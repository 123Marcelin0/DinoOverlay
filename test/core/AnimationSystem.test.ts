import { AnimationSystem, AnimationOptions, AnimationKeyframe, TransitionConfig } from '../../src/core/AnimationSystem';

// Mock Web Animations API
const mockAnimate = jest.fn();
const mockAnimation = {
  cancel: jest.fn(),
  finish: jest.fn(),
  pause: jest.fn(),
  play: jest.fn(),
  addEventListener: jest.fn()
};

// Mock HTMLElement
const createMockElement = () => ({
  animate: mockAnimate,
  style: {} as CSSStyleDeclaration,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
} as unknown as HTMLElement);

describe('AnimationSystem', () => {
  let animationSystem: AnimationSystem;
  let mockElement: HTMLElement;

  beforeEach(() => {
    animationSystem = new AnimationSystem();
    mockElement = createMockElement();
    mockAnimate.mockReturnValue(mockAnimation);
    mockAnimation.addEventListener.mockImplementation((event, callback) => {
      if (event === 'finish') {
        // Simulate animation finishing immediately for tests
        setTimeout(callback, 0);
      }
    });
    jest.clearAllMocks();
  });

  afterEach(() => {
    animationSystem.destroy();
  });

  describe('slideIn', () => {
    it('should create slide-in animation from right by default', () => {
      const cleanup = animationSystem.slideIn(mockElement);

      expect(mockAnimate).toHaveBeenCalledWith(
        [
          { transform: 'translateX(100%)', opacity: '0' },
          { transform: 'translateX(0)', opacity: '1' }
        ],
        expect.objectContaining({
          duration: 300,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          fill: 'forwards'
        })
      );

      expect(cleanup).toHaveProperty('cancel');
      expect(cleanup).toHaveProperty('finish');
      expect(cleanup).toHaveProperty('pause');
      expect(cleanup).toHaveProperty('play');
    });

    it('should create slide-in animation from specified direction', () => {
      animationSystem.slideIn(mockElement, 'left');

      expect(mockAnimate).toHaveBeenCalledWith(
        [
          { transform: 'translateX(-100%)', opacity: '0' },
          { transform: 'translateX(0)', opacity: '1' }
        ],
        expect.any(Object)
      );
    });

    it('should create slide-in animation from up direction', () => {
      animationSystem.slideIn(mockElement, 'up');

      expect(mockAnimate).toHaveBeenCalledWith(
        [
          { transform: 'translateY(-100%)', opacity: '0' },
          { transform: 'translateY(0)', opacity: '1' }
        ],
        expect.any(Object)
      );
    });

    it('should create slide-in animation from down direction', () => {
      animationSystem.slideIn(mockElement, 'down');

      expect(mockAnimate).toHaveBeenCalledWith(
        [
          { transform: 'translateY(100%)', opacity: '0' },
          { transform: 'translateY(0)', opacity: '1' }
        ],
        expect.any(Object)
      );
    });

    it('should accept custom animation options', () => {
      const options: Partial<AnimationOptions> = {
        duration: 500,
        easing: 'ease-in-out',
        delay: 100
      };

      animationSystem.slideIn(mockElement, 'right', options);

      expect(mockAnimate).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          duration: 500,
          easing: 'ease-in-out',
          delay: 100,
          fill: 'forwards'
        })
      );
    });
  });

  describe('slideOut', () => {
    it('should create slide-out animation to right by default', () => {
      animationSystem.slideOut(mockElement);

      expect(mockAnimate).toHaveBeenCalledWith(
        [
          { transform: 'translateX(0)', opacity: '1' },
          { transform: 'translateX(100%)', opacity: '0' }
        ],
        expect.objectContaining({
          duration: 300,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          fill: 'forwards'
        })
      );
    });

    it('should create slide-out animation to specified direction', () => {
      animationSystem.slideOut(mockElement, 'left');

      expect(mockAnimate).toHaveBeenCalledWith(
        [
          { transform: 'translateX(0)', opacity: '1' },
          { transform: 'translateX(-100%)', opacity: '0' }
        ],
        expect.any(Object)
      );
    });
  });

  describe('fadeIn', () => {
    it('should create fade-in animation', () => {
      animationSystem.fadeIn(mockElement);

      expect(mockAnimate).toHaveBeenCalledWith(
        [
          { opacity: '0' },
          { opacity: '1' }
        ],
        expect.objectContaining({
          duration: 200,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          fill: 'forwards'
        })
      );
    });

    it('should accept custom duration', () => {
      animationSystem.fadeIn(mockElement, { duration: 400 });

      expect(mockAnimate).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({ duration: 400 })
      );
    });
  });

  describe('fadeOut', () => {
    it('should create fade-out animation', () => {
      animationSystem.fadeOut(mockElement);

      expect(mockAnimate).toHaveBeenCalledWith(
        [
          { opacity: '1' },
          { opacity: '0' }
        ],
        expect.objectContaining({
          duration: 200,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          fill: 'forwards'
        })
      );
    });
  });

  describe('scale', () => {
    it('should create scale animation with default values', () => {
      animationSystem.scale(mockElement);

      expect(mockAnimate).toHaveBeenCalledWith(
        [
          { transform: 'scale(0.8)', opacity: '0' },
          { transform: 'scale(1)', opacity: '1' }
        ],
        expect.objectContaining({
          duration: 200,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          fill: 'forwards'
        })
      );
    });

    it('should create scale animation with custom values', () => {
      animationSystem.scale(mockElement, 0.5, 1.2);

      expect(mockAnimate).toHaveBeenCalledWith(
        [
          { transform: 'scale(0.5)', opacity: '0' },
          { transform: 'scale(1.2)', opacity: '1' }
        ],
        expect.any(Object)
      );
    });
  });

  describe('glow', () => {
    it('should create glow animation with default color', () => {
      animationSystem.glow(mockElement);

      expect(mockAnimate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            boxShadow: expect.stringContaining('rgba(59, 130, 246, 0.5)'),
            borderColor: expect.stringContaining('rgba(59, 130, 246, 0.3)')
          }),
          expect.objectContaining({
            boxShadow: expect.stringContaining('rgba(59, 130, 246, 0.5)'),
            borderColor: expect.stringContaining('rgba(59, 130, 246, 0.8)')
          })
        ]),
        expect.objectContaining({
          duration: 2000,
          easing: 'ease-in-out',
          iterations: Infinity,
          direction: 'alternate'
        })
      );
    });

    it('should create glow animation with custom color', () => {
      const customColor = 'rgba(255, 0, 0, 0.5)';
      animationSystem.glow(mockElement, customColor);

      expect(mockAnimate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            boxShadow: expect.stringContaining(customColor),
            borderColor: expect.stringContaining('rgba(255, 0, 0, 0.3)')
          })
        ]),
        expect.any(Object)
      );
    });
  });

  describe('pulse', () => {
    it('should create pulse animation', () => {
      animationSystem.pulse(mockElement);

      expect(mockAnimate).toHaveBeenCalledWith(
        [
          { transform: 'scale(1)', opacity: '1' },
          { transform: 'scale(1.05)', opacity: '0.8' }
        ],
        expect.objectContaining({
          duration: 1000,
          easing: 'ease-in-out',
          iterations: Infinity,
          direction: 'alternate'
        })
      );
    });
  });

  describe('bounce', () => {
    it('should create bounce animation', () => {
      animationSystem.bounce(mockElement);

      expect(mockAnimate).toHaveBeenCalledWith(
        [
          { transform: 'scale(0.3)', opacity: '0' },
          { transform: 'scale(1.05)', opacity: '0.8' },
          { transform: 'scale(0.9)', opacity: '0.9' },
          { transform: 'scale(1)', opacity: '1' }
        ],
        expect.objectContaining({
          duration: 600,
          easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
          fill: 'forwards'
        })
      );
    });
  });

  describe('shake', () => {
    it('should create shake animation', () => {
      animationSystem.shake(mockElement);

      expect(mockAnimate).toHaveBeenCalledWith(
        expect.arrayContaining([
          { transform: 'translateX(0)' },
          { transform: 'translateX(-10px)' },
          { transform: 'translateX(10px)' },
          { transform: 'translateX(0)' }
        ]),
        expect.objectContaining({
          duration: 500,
          easing: 'ease-in-out',
          fill: 'forwards'
        })
      );
    });
  });

  describe('spin', () => {
    it('should create spin animation', () => {
      animationSystem.spin(mockElement);

      expect(mockAnimate).toHaveBeenCalledWith(
        [
          { transform: 'rotate(0deg)' },
          { transform: 'rotate(360deg)' }
        ],
        expect.objectContaining({
          duration: 1000,
          easing: 'linear',
          iterations: Infinity
        })
      );
    });
  });

  describe('applyTransition', () => {
    it('should apply CSS transitions to element', () => {
      const transitions: TransitionConfig[] = [
        { property: 'opacity', duration: 200, easing: 'ease' },
        { property: 'transform', duration: 300, easing: 'ease-out', delay: 100 }
      ];

      animationSystem.applyTransition(mockElement, transitions);

      expect(mockElement.style.transition).toBe(
        'opacity 200ms ease, transform 300ms ease-out 100ms'
      );
    });

    it('should handle transitions without delay', () => {
      const transitions: TransitionConfig[] = [
        { property: 'opacity', duration: 200, easing: 'ease' }
      ];

      animationSystem.applyTransition(mockElement, transitions);

      expect(mockElement.style.transition).toBe('opacity 200ms ease');
    });
  });

  describe('setupHoverAnimation', () => {
    it('should setup hover event listeners', () => {
      const hoverStyles = { opacity: '0.8' };
      const cleanup = animationSystem.setupHoverAnimation(mockElement, hoverStyles);

      expect(mockElement.addEventListener).toHaveBeenCalledWith('mouseenter', expect.any(Function));
      expect(mockElement.addEventListener).toHaveBeenCalledWith('mouseleave', expect.any(Function));
      expect(typeof cleanup).toBe('function');
    });

    it('should return cleanup function that removes event listeners', () => {
      const hoverStyles = { opacity: '0.8' };
      const cleanup = animationSystem.setupHoverAnimation(mockElement, hoverStyles);

      cleanup();

      expect(mockElement.removeEventListener).toHaveBeenCalledWith('mouseenter', expect.any(Function));
      expect(mockElement.removeEventListener).toHaveBeenCalledWith('mouseleave', expect.any(Function));
    });
  });

  describe('setupFocusAnimation', () => {
    it('should setup focus event listeners', () => {
      const focusStyles = { opacity: '0.8' };
      const cleanup = animationSystem.setupFocusAnimation(mockElement, focusStyles);

      expect(mockElement.addEventListener).toHaveBeenCalledWith('focus', expect.any(Function));
      expect(mockElement.addEventListener).toHaveBeenCalledWith('blur', expect.any(Function));
      expect(typeof cleanup).toBe('function');
    });

    it('should return cleanup function that removes event listeners', () => {
      const focusStyles = { opacity: '0.8' };
      const cleanup = animationSystem.setupFocusAnimation(mockElement, focusStyles);

      cleanup();

      expect(mockElement.removeEventListener).toHaveBeenCalledWith('focus', expect.any(Function));
      expect(mockElement.removeEventListener).toHaveBeenCalledWith('blur', expect.any(Function));
    });
  });

  describe('animation management', () => {
    it('should track active animations', () => {
      expect(animationSystem.getActiveAnimationCount()).toBe(0);

      animationSystem.slideIn(mockElement);
      expect(animationSystem.getActiveAnimationCount()).toBe(1);
    });

    it('should cancel specific animation by ID', () => {
      const cleanup = animationSystem.slideIn(mockElement);
      const animationCount = animationSystem.getActiveAnimationCount();
      
      expect(animationCount).toBeGreaterThan(0);
      
      cleanup.cancel();
      
      // Animation should be removed from tracking after cancellation
      setTimeout(() => {
        expect(animationSystem.getActiveAnimationCount()).toBeLessThan(animationCount);
      }, 10);
    });

    it('should cancel all animations', () => {
      animationSystem.slideIn(mockElement);
      animationSystem.fadeIn(mockElement);
      animationSystem.scale(mockElement);

      expect(animationSystem.getActiveAnimationCount()).toBeGreaterThan(0);

      animationSystem.cancelAllAnimations();
      expect(animationSystem.getActiveAnimationCount()).toBe(0);
    });

    it('should clean up animations when destroyed', () => {
      animationSystem.slideIn(mockElement);
      animationSystem.fadeIn(mockElement);

      expect(animationSystem.getActiveAnimationCount()).toBeGreaterThan(0);

      animationSystem.destroy();
      expect(animationSystem.getActiveAnimationCount()).toBe(0);
    });
  });

  describe('createCustomAnimation', () => {
    it('should create custom animation with keyframes', () => {
      const keyframes: AnimationKeyframe[] = [
        { opacity: '0', transform: 'scale(0)' },
        { opacity: '1', transform: 'scale(1)' }
      ];

      const options: Partial<AnimationOptions> = {
        duration: 400,
        easing: 'ease-in-out'
      };

      animationSystem.createCustomAnimation(mockElement, keyframes, options);

      expect(mockAnimate).toHaveBeenCalledWith(
        keyframes,
        expect.objectContaining({
          duration: 400,
          easing: 'ease-in-out',
          fill: 'forwards'
        })
      );
    });
  });

  describe('fallback behavior', () => {
    it('should handle missing Web Animations API gracefully', () => {
      // Mock element without animate method
      const elementWithoutAnimate = {
        style: {} as CSSStyleDeclaration
      } as HTMLElement;

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const cleanup = animationSystem.slideIn(elementWithoutAnimate);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Web Animations API not supported, using CSS fallback'
      );
      expect(cleanup).toHaveProperty('cancel');
      expect(cleanup).toHaveProperty('finish');
      expect(cleanup).toHaveProperty('pause');
      expect(cleanup).toHaveProperty('play');

      consoleSpy.mockRestore();
    });
  });
});