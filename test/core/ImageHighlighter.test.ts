import { ImageHighlighter, HighlighterProps } from '../../src/core/ImageHighlighter';
import { SelectedImage, OverlayState } from '../../src/types/overlay';

// Mock Web APIs
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock Element.animate
Element.prototype.animate = jest.fn().mockReturnValue({
  cancel: jest.fn(),
  finish: jest.fn(),
  pause: jest.fn(),
  play: jest.fn(),
});

// Mock window.getComputedStyle
Object.defineProperty(window, 'getComputedStyle', {
  value: jest.fn().mockImplementation(() => ({
    borderRadius: '8px',
    borderTopLeftRadius: '8px',
    borderTopRightRadius: '8px',
    borderBottomRightRadius: '8px',
    borderBottomLeftRadius: '8px',
  })),
});

describe('ImageHighlighter', () => {
  let mockImage: HTMLImageElement;
  let mockSelectedImage: SelectedImage;
  let mockProps: HighlighterProps;
  let highlighter: ImageHighlighter;

  beforeEach(() => {
    // Create mock image element
    mockImage = document.createElement('img');
    mockImage.src = 'test-image.jpg';
    mockImage.className = 'editable-room';
    Object.defineProperty(mockImage, 'getBoundingClientRect', {
      value: jest.fn().mockReturnValue({
        left: 100,
        top: 200,
        width: 300,
        height: 200,
        right: 400,
        bottom: 400,
      }),
    });

    // Create mock selected image
    mockSelectedImage = {
      element: mockImage,
      rect: {
        left: 100,
        top: 200,
        width: 300,
        height: 200,
        right: 400,
        bottom: 400,
      } as DOMRect,
      borderRadius: '8px',
    };

    // Create mock props
    mockProps = {
      selectedImage: mockSelectedImage,
      onClose: jest.fn(),
      onImageClick: jest.fn(),
    };

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (highlighter) {
      highlighter.destroy();
    }
  });

  describe('Constructor', () => {
    it('should create highlighter with provided props', () => {
      highlighter = new ImageHighlighter(mockProps);
      expect(highlighter).toBeInstanceOf(ImageHighlighter);
    });

    it('should bind event handlers correctly', () => {
      highlighter = new ImageHighlighter(mockProps);
      const element = highlighter.render();
      
      // Check that close button exists and has click handler
      const closeButton = element.querySelector('.dino-highlighter-close');
      expect(closeButton).toBeTruthy();
    });
  });

  describe('render()', () => {
    beforeEach(() => {
      highlighter = new ImageHighlighter(mockProps);
    });

    it('should create highlighter element with correct class', () => {
      const element = highlighter.render();
      expect(element.className).toBe('dino-image-highlighter');
    });

    it('should apply glassmorphic base styles', () => {
      const element = highlighter.render();
      expect(element.style.position).toBe('fixed');
      expect(element.style.zIndex).toBe('999999');
      expect(element.style.border).toContain('rgba(255, 255, 255, 0.3)');
      expect(element.style.backdropFilter).toBe('blur(10px)');
    });

    it('should create close button with correct styling', () => {
      const element = highlighter.render();
      const closeButton = element.querySelector('.dino-highlighter-close') as HTMLElement;
      
      expect(closeButton).toBeTruthy();
      expect(closeButton.innerHTML).toBe('×');
      expect(closeButton.style.position).toBe('absolute');
      expect(closeButton.style.top).toBe('-12px');
      expect(closeButton.style.right).toBe('-12px');
      expect(closeButton.style.borderRadius).toBe('50%');
    });

    it('should position highlighter correctly when image is selected', () => {
      const element = highlighter.render();
      expect(element.style.left).toBe('100px');
      expect(element.style.top).toBe('200px');
      expect(element.style.width).toBe('300px');
      expect(element.style.height).toBe('200px');
    });

    it('should match image border radius', () => {
      const element = highlighter.render();
      expect(element.style.borderRadius).toBe('8px');
    });

    it('should be visible when image is selected', () => {
      const element = highlighter.render();
      expect(element.style.display).toBe('block');
    });

    it('should throw error if called after destruction', () => {
      highlighter.destroy();
      expect(() => highlighter.render()).toThrow('ImageHighlighter has been destroyed');
    });
  });

  describe('update()', () => {
    beforeEach(() => {
      highlighter = new ImageHighlighter(mockProps);
      highlighter.render(); // Initialize element
    });

    it('should update props and element when state changes', () => {
      const newSelectedImage: SelectedImage = {
        element: mockImage,
        rect: {
          left: 150,
          top: 250,
          width: 400,
          height: 300,
          right: 550,
          bottom: 550,
        } as DOMRect,
        borderRadius: '12px',
      };

      const newState: OverlayState = {
        selectedImage: newSelectedImage,
        sidebarVisible: true,
        chatBarVisible: true,
        isProcessing: false,
        currentAction: null,
      };

      highlighter.update(newState);

      const element = highlighter.render();
      expect(element.style.left).toBe('150px');
      expect(element.style.top).toBe('250px');
      expect(element.style.width).toBe('400px');
      expect(element.style.height).toBe('300px');
      expect(element.style.borderRadius).toBe('12px');
    });

    it('should hide highlighter when no image is selected', () => {
      const newState: OverlayState = {
        selectedImage: null,
        sidebarVisible: false,
        chatBarVisible: false,
        isProcessing: false,
        currentAction: null,
      };

      highlighter.update(newState);

      const element = highlighter.render();
      expect(element.style.display).toBe('none');
    });

    it('should not throw error if called after destruction', () => {
      highlighter.destroy();
      const newState: OverlayState = {
        selectedImage: null,
        sidebarVisible: false,
        chatBarVisible: false,
        isProcessing: false,
        currentAction: null,
      };

      expect(() => highlighter.update(newState)).not.toThrow();
    });
  });

  describe('destroy()', () => {
    beforeEach(() => {
      highlighter = new ImageHighlighter(mockProps);
      highlighter.render(); // Initialize element
    });

    it('should mark highlighter as destroyed', () => {
      highlighter.destroy();
      expect(() => highlighter.render()).toThrow('ImageHighlighter has been destroyed');
    });

    it('should cancel glow animation', () => {
      const mockAnimation = {
        cancel: jest.fn(),
        finish: jest.fn(),
        pause: jest.fn(),
        play: jest.fn(),
      };
      
      // Mock animate before creating highlighter
      (Element.prototype.animate as jest.Mock).mockReturnValue(mockAnimation);
      
      // Create new highlighter with animation mock
      highlighter.destroy(); // Clean up existing
      highlighter = new ImageHighlighter(mockProps);
      highlighter.render(); // This should trigger animation
      
      highlighter.destroy();
      expect(mockAnimation.cancel).toHaveBeenCalled();
    });

    it('should disconnect resize observer', () => {
      const mockDisconnect = jest.fn();
      (global.ResizeObserver as jest.Mock).mockImplementation(() => ({
        observe: jest.fn(),
        unobserve: jest.fn(),
        disconnect: mockDisconnect,
      }));

      highlighter = new ImageHighlighter(mockProps);
      highlighter.render();
      highlighter.destroy();

      expect(mockDisconnect).toHaveBeenCalled();
    });

    it('should remove element from DOM if it has a parent', () => {
      const element = highlighter.render();
      const mockParent = document.createElement('div');
      const mockRemoveChild = jest.fn();
      mockParent.removeChild = mockRemoveChild;
      
      Object.defineProperty(element, 'parentNode', {
        value: mockParent,
        configurable: true,
      });

      highlighter.destroy();
      expect(mockRemoveChild).toHaveBeenCalledWith(element);
    });

    it('should be safe to call multiple times', () => {
      expect(() => {
        highlighter.destroy();
        highlighter.destroy();
      }).not.toThrow();
    });
  });

  describe('Close button interactions', () => {
    beforeEach(() => {
      highlighter = new ImageHighlighter(mockProps);
    });

    it('should call onClose when close button is clicked', () => {
      const element = highlighter.render();
      const closeButton = element.querySelector('.dino-highlighter-close') as HTMLElement;
      
      closeButton.click();
      expect(mockProps.onClose).toHaveBeenCalled();
    });

    it('should prevent event propagation on close button click', () => {
      const element = highlighter.render();
      const closeButton = element.querySelector('.dino-highlighter-close') as HTMLElement;
      
      const mockEvent = new Event('click');
      const preventDefaultSpy = jest.spyOn(mockEvent, 'preventDefault');
      const stopPropagationSpy = jest.spyOn(mockEvent, 'stopPropagation');
      
      closeButton.dispatchEvent(mockEvent);
      
      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(stopPropagationSpy).toHaveBeenCalled();
    });

    it('should handle hover effects on close button', () => {
      const element = highlighter.render();
      const closeButton = element.querySelector('.dino-highlighter-close') as HTMLElement;
      
      // Trigger mouseenter
      const mouseEnterEvent = new Event('mouseenter');
      closeButton.dispatchEvent(mouseEnterEvent);
      
      expect(closeButton.style.transform).toBe('scale(1.1)');
      
      // Trigger mouseleave
      const mouseLeaveEvent = new Event('mouseleave');
      closeButton.dispatchEvent(mouseLeaveEvent);
      
      expect(closeButton.style.transform).toBe('scale(1)');
    });

    it('should handle mouse down/up effects on close button', () => {
      const element = highlighter.render();
      const closeButton = element.querySelector('.dino-highlighter-close') as HTMLElement;
      
      // Trigger mousedown
      const mouseDownEvent = new Event('mousedown');
      closeButton.dispatchEvent(mouseDownEvent);
      
      expect(closeButton.style.transform).toBe('scale(0.95)');
      
      // Trigger mouseup
      const mouseUpEvent = new Event('mouseup');
      closeButton.dispatchEvent(mouseUpEvent);
      
      expect(closeButton.style.transform).toBe('scale(1.1)');
    });
  });

  describe('Animation system', () => {
    beforeEach(() => {
      highlighter = new ImageHighlighter(mockProps);
    });

    it('should start glow animation when image is selected', () => {
      const mockAnimate = jest.fn().mockReturnValue({
        cancel: jest.fn(),
      });
      Element.prototype.animate = mockAnimate;

      highlighter.render();

      expect(mockAnimate).toHaveBeenCalled();
      const [keyframes, options] = mockAnimate.mock.calls[0];
      
      expect(keyframes).toHaveLength(3);
      expect(options.duration).toBe(2000);
      expect(options.iterations).toBe(Infinity);
      expect(options.easing).toBe('cubic-bezier(0.4, 0, 0.6, 1)');
    });

    it('should not start animation if element is destroyed', () => {
      const mockAnimate = jest.fn();
      Element.prototype.animate = mockAnimate;

      highlighter.destroy();
      
      expect(mockAnimate).not.toHaveBeenCalled();
    });

    it('should handle animation errors gracefully', () => {
      const mockAnimate = jest.fn().mockImplementation(() => {
        throw new Error('Animation failed');
      });
      Element.prototype.animate = mockAnimate;

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      expect(() => highlighter.render()).not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith(
        '[ImageHighlighter] Failed to start glow animation:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Static utility methods', () => {
    describe('calculateBorderRadius()', () => {
      it('should return computed border radius', () => {
        const result = ImageHighlighter.calculateBorderRadius(mockImage);
        expect(result).toBe('8px');
      });

      it('should return individual corner values when different', () => {
        (window.getComputedStyle as jest.Mock).mockReturnValue({
          borderRadius: '',
          borderTopLeftRadius: '4px',
          borderTopRightRadius: '8px',
          borderBottomRightRadius: '12px',
          borderBottomLeftRadius: '16px',
        });

        const result = ImageHighlighter.calculateBorderRadius(mockImage);
        expect(result).toBe('4px 8px 12px 16px');
      });

      it('should return default value for invalid element', () => {
        const result = ImageHighlighter.calculateBorderRadius(null as any);
        expect(result).toBe('8px');
      });

      it('should handle getComputedStyle errors', () => {
        (window.getComputedStyle as jest.Mock).mockImplementation(() => {
          throw new Error('Style calculation failed');
        });

        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
        const result = ImageHighlighter.calculateBorderRadius(mockImage);
        
        expect(result).toBe('8px');
        expect(consoleSpy).toHaveBeenCalled();
        
        consoleSpy.mockRestore();
      });
    });

    describe('createGlowKeyframes()', () => {
      it('should create keyframes with default color', () => {
        const keyframes = ImageHighlighter.createGlowKeyframes();
        
        expect(keyframes).toHaveLength(3);
        expect(keyframes[0].boxShadow).toContain('rgba(59, 130, 246, 0.5)');
        expect(keyframes[1].boxShadow).toContain('rgba(59, 130, 246, 0.5)');
        expect(keyframes[2].boxShadow).toContain('rgba(59, 130, 246, 0.5)');
      });

      it('should create keyframes with custom color', () => {
        const customColor = 'rgba(255, 0, 0, 0.5)';
        const keyframes = ImageHighlighter.createGlowKeyframes(customColor);
        
        expect(keyframes).toHaveLength(3);
        expect(keyframes[0].boxShadow).toContain(customColor);
        expect(keyframes[1].boxShadow).toContain(customColor);
        expect(keyframes[2].boxShadow).toContain(customColor);
      });

      it('should create different glow intensities across keyframes', () => {
        const keyframes = ImageHighlighter.createGlowKeyframes();
        
        // First and last keyframes should have 20px glow
        expect(keyframes[0].boxShadow).toContain('0 0 20px');
        expect(keyframes[2].boxShadow).toContain('0 0 20px');
        
        // Middle keyframe should have 40px glow (more intense)
        expect(keyframes[1].boxShadow).toContain('0 0 40px');
      });
    });
  });

  describe('ResizeObserver integration', () => {
    it('should setup ResizeObserver when image is available', () => {
      const mockObserve = jest.fn();
      (global.ResizeObserver as jest.Mock).mockImplementation(() => ({
        observe: mockObserve,
        unobserve: jest.fn(),
        disconnect: jest.fn(),
      }));

      highlighter = new ImageHighlighter(mockProps);
      highlighter.render();

      expect(mockObserve).toHaveBeenCalledWith(mockImage);
    });

    it('should not setup ResizeObserver when no image is selected', () => {
      const mockObserve = jest.fn();
      (global.ResizeObserver as jest.Mock).mockImplementation(() => ({
        observe: mockObserve,
        unobserve: jest.fn(),
        disconnect: jest.fn(),
      }));

      const propsWithoutImage: HighlighterProps = {
        selectedImage: null,
        onClose: jest.fn(),
      };

      highlighter = new ImageHighlighter(propsWithoutImage);
      highlighter.render();

      expect(mockObserve).not.toHaveBeenCalled();
    });

    it('should handle ResizeObserver callback correctly', () => {
      let resizeCallback: (entries: any[]) => void;
      
      (global.ResizeObserver as jest.Mock).mockImplementation((callback) => {
        resizeCallback = callback;
        return {
          observe: jest.fn(),
          unobserve: jest.fn(),
          disconnect: jest.fn(),
        };
      });

      highlighter = new ImageHighlighter(mockProps);
      const element = highlighter.render();

      // Update the mock image's getBoundingClientRect to return new values
      (mockImage.getBoundingClientRect as jest.Mock).mockReturnValue({
        left: 150,
        top: 250,
        width: 400,
        height: 300,
        right: 550,
        bottom: 550,
      });

      // Simulate resize observer callback
      const mockEntry = {
        target: mockImage,
      };

      resizeCallback!([mockEntry]);

      // Element should be repositioned
      expect(element.style.left).toBe('150px');
      expect(element.style.top).toBe('250px');
      expect(element.style.width).toBe('400px');
      expect(element.style.height).toBe('300px');
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle missing selectedImage gracefully', () => {
      const propsWithoutImage: HighlighterProps = {
        selectedImage: null,
        onClose: jest.fn(),
      };

      highlighter = new ImageHighlighter(propsWithoutImage);
      const element = highlighter.render();

      expect(element.style.display).toBe('none');
    });

    it('should not call onClose after destruction', () => {
      highlighter = new ImageHighlighter(mockProps);
      const element = highlighter.render();
      const closeButton = element.querySelector('.dino-highlighter-close') as HTMLElement;
      
      highlighter.destroy();
      closeButton.click();
      
      // onClose should not be called since component is destroyed
      expect(mockProps.onClose).not.toHaveBeenCalled();
    });

    it('should handle update calls when element is not initialized', () => {
      highlighter = new ImageHighlighter(mockProps);
      // Don't call render() to initialize element
      
      const newState: OverlayState = {
        selectedImage: mockSelectedImage,
        sidebarVisible: true,
        chatBarVisible: true,
        isProcessing: false,
        currentAction: null,
      };

      expect(() => highlighter.update(newState)).not.toThrow();
    });
  });
});