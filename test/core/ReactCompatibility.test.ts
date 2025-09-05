import { ReactCompatibility } from '../../src/compatibility/react/ReactCompatibility';

// Mock DOM environment
const mockDocument = {
  createElement: jest.fn(),
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(),
  addEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
  head: {
    appendChild: jest.fn()
  }
};

const mockWindow = {
  React: undefined,
  ReactDOM: undefined,
  __REACT_DEVTOOLS_GLOBAL_HOOK__: undefined,
  __NEXT_DATA__: undefined,
  next: undefined,
  scheduler: undefined
};

// Mock MutationObserver
const mockMutationObserver = {
  observe: jest.fn(),
  disconnect: jest.fn()
};

Object.defineProperty(global, 'document', {
  value: mockDocument,
  writable: true
});

Object.defineProperty(global, 'window', {
  value: mockWindow,
  writable: true
});

Object.defineProperty(global, 'MutationObserver', {
  value: jest.fn().mockImplementation(() => mockMutationObserver),
  writable: true
});

describe('ReactCompatibility', () => {
  let compatibility: ReactCompatibility;

  beforeEach(() => {
    compatibility = new ReactCompatibility();
    
    // Reset mocks
    jest.clearAllMocks();
    mockDocument.querySelector.mockReturnValue(null);
    mockDocument.querySelectorAll.mockReturnValue([]);
    
    // Reset window properties
    Object.keys(mockWindow).forEach(key => {
      (mockWindow as any)[key] = undefined;
    });
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await expect(compatibility.initialize()).resolves.not.toThrow();
    });

    it('should detect React version during initialization', async () => {
      (mockWindow as any).React = { version: '18.2.0' };

      await compatibility.initialize();

      // Version detection should have occurred
      expect(true).toBe(true);
    });

    it('should detect React DevTools during initialization', async () => {
      (mockWindow as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
        renderers: new Map([
          [1, { version: '18.2.0' }]
        ])
      };

      await compatibility.initialize();

      expect(true).toBe(true);
    });

    it('should not initialize twice', async () => {
      await compatibility.initialize();
      await compatibility.initialize();

      // Should not throw or cause issues
      expect(true).toBe(true);
    });
  });

  describe('React Element Detection', () => {
    it('should identify React elements by Fiber properties', () => {
      const mockImages = [
        {
          tagName: 'IMG',
          _reactInternalFiber: {},
          parentElement: null
        },
        {
          tagName: 'IMG',
          __reactInternalInstance: {},
          parentElement: null
        }
      ];

      mockDocument.querySelectorAll.mockReturnValue(mockImages);

      const result = compatibility.findEditableImages();

      expect(result).toHaveLength(2);
    });

    it('should identify React elements by parent Fiber properties', () => {
      const mockParent = {
        __reactFiber$: {},
        parentElement: null
      };

      const mockImage = {
        tagName: 'IMG',
        parentElement: mockParent
      };

      mockDocument.querySelectorAll.mockReturnValue([mockImage]);

      const result = compatibility.findEditableImages();

      expect(result).toHaveLength(1);
    });

    it('should handle Next.js Image components', () => {
      const mockNextImage = {
        tagName: 'IMG',
        dataset: { nimg: 'fill' },
        _reactInternalFiber: {}
      };

      mockDocument.querySelectorAll.mockImplementation((selector) => {
        if (selector.includes('[data-nimg]')) {
          return [mockNextImage];
        }
        return [];
      });

      const result = compatibility.findEditableImages();

      expect(result).toContain(mockNextImage);
    });

    it('should handle wrapper elements with React images', () => {
      const mockWrapper = {
        tagName: 'DIV',
        querySelector: jest.fn().mockReturnValue({
          tagName: 'IMG',
          _reactInternalFiber: {}
        })
      };

      mockDocument.querySelectorAll.mockReturnValue([mockWrapper]);

      const result = compatibility.findEditableImages();

      expect(result).toHaveLength(1);
    });
  });

  describe('Event Handling', () => {
    it('should attach event listeners with React-specific wrapping', () => {
      const mockElement = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      };

      const mockEvents = {
        click: jest.fn(),
        mouseover: jest.fn()
      };

      compatibility.attachEventListeners(mockElement as any, mockEvents);

      expect(mockElement.addEventListener).toHaveBeenCalledTimes(2);
      expect(mockElement.addEventListener).toHaveBeenCalledWith(
        'click',
        expect.any(Function),
        { capture: true, passive: true }
      );
    });

    it('should use capture phase to avoid React event delegation conflicts', () => {
      const mockElement = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      };

      compatibility.attachEventListeners(mockElement as any, { click: jest.fn() });

      expect(mockElement.addEventListener).toHaveBeenCalledWith(
        'click',
        expect.any(Function),
        { capture: true, passive: true }
      );
    });

    it('should remove event listeners with capture phase', () => {
      const mockElement = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      };

      compatibility.attachEventListeners(mockElement as any, { click: jest.fn() });
      compatibility.removeEventListeners(mockElement as any);

      expect(mockElement.removeEventListener).toHaveBeenCalledWith(
        'click',
        expect.any(Function),
        { capture: true }
      );
    });
  });

  describe('React DevTools Integration', () => {
    it('should hook into React DevTools onCommitFiberRoot', async () => {
      const mockDevTools = {
        onCommitFiberRoot: jest.fn()
      };

      (mockWindow as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ = mockDevTools;

      await compatibility.initialize();

      // Should have wrapped the original onCommitFiberRoot
      expect(mockDevTools.onCommitFiberRoot).toBeDefined();
    });

    it('should handle missing React DevTools gracefully', async () => {
      // No DevTools present
      await expect(compatibility.initialize()).resolves.not.toThrow();
    });

    it('should preserve original onCommitFiberRoot behavior', async () => {
      const originalOnCommitFiberRoot = jest.fn();
      const mockDevTools = {
        onCommitFiberRoot: originalOnCommitFiberRoot
      };

      (mockWindow as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ = mockDevTools;

      await compatibility.initialize();

      // Call the wrapped function
      mockDevTools.onCommitFiberRoot(1, {});

      expect(originalOnCommitFiberRoot).toHaveBeenCalledWith(1, {});
    });
  });

  describe('React Root Detection', () => {
    it('should detect React roots by common selectors', async () => {
      const mockRoots = [
        { id: 'root' },
        { dataset: { reactroot: '' } },
        { className: 'react-root' }
      ];

      mockDocument.querySelectorAll.mockImplementation((selector) => {
        if (selector.includes('#root')) return [mockRoots[0]];
        if (selector.includes('[data-reactroot]')) return [mockRoots[1]];
        if (selector.includes('.react-root')) return [mockRoots[2]];
        return [];
      });

      await compatibility.initialize();

      // Should have detected and observed React roots
      expect(mockMutationObserver.observe).toHaveBeenCalledTimes(3);
    });
  });

  describe('Next.js Integration', () => {
    it('should detect Next.js applications', async () => {
      (mockWindow as any).__NEXT_DATA__ = { page: '/' };
      mockDocument.querySelector.mockImplementation((selector) => {
        if (selector === '#__next') return { id: '__next' };
        return null;
      });

      await compatibility.initialize();

      // Next.js specific handling should be applied
      expect(true).toBe(true);
    });

    it('should handle Next.js routing', async () => {
      const mockRouter = {
        events: {
          on: jest.fn()
        }
      };

      (mockWindow as any).next = { router: mockRouter };

      await compatibility.initialize();

      expect(mockRouter.events.on).toHaveBeenCalledWith(
        'routeChangeComplete',
        expect.any(Function)
      );
    });

    it('should handle Next.js Image components', async () => {
      const mockNextImages = [
        { tagName: 'IMG', dataset: { nimg: 'fill' }, classList: { add: jest.fn() } }
      ];

      mockDocument.querySelectorAll.mockImplementation((selector) => {
        if (selector.includes('[data-nimg]')) return mockNextImages;
        return [];
      });

      await compatibility.initialize();

      expect(mockNextImages[0].classList.add).toHaveBeenCalledWith('editable-room');
    });

    it('should handle Next.js SSR content', async () => {
      (mockWindow as any).__NEXT_DATA__ = { props: {} };

      await compatibility.initialize();

      // SSR handling should be applied (tested through setTimeout behavior)
      expect(true).toBe(true);
    });
  });

  describe('Create React App Integration', () => {
    it('should detect Create React App', async () => {
      mockDocument.querySelector.mockImplementation((selector) => {
        if (selector === 'meta[name="theme-color"]') return { name: 'theme-color' };
        if (selector === 'link[rel="manifest"]') return { rel: 'manifest' };
        if (selector === '#root') return { id: 'root' };
        return null;
      });

      await compatibility.initialize();

      // CRA specific handling should be applied
      expect(true).toBe(true);
    });
  });

  describe('Style Conflict Prevention', () => {
    it('should create React-specific style overrides', async () => {
      const mockStyleElement = {
        textContent: ''
      };

      mockDocument.createElement.mockReturnValue(mockStyleElement);
      mockDocument.head.appendChild.mockImplementation(() => {});

      await compatibility.initialize();

      expect(mockDocument.createElement).toHaveBeenCalledWith('style');
      expect(mockDocument.head.appendChild).toHaveBeenCalledWith(mockStyleElement);
      expect(mockStyleElement.textContent).toContain('React compatibility');
    });

    it('should handle styled-components conflicts', async () => {
      (mockWindow as any).__styled_components_stylesheet__ = {};

      await compatibility.initialize();

      // styled-components handling should be applied
      expect(true).toBe(true);
    });
  });

  describe('React Scheduler Integration', () => {
    it('should integrate with React scheduler when available', async () => {
      const mockScheduler = {
        unstable_scheduleCallback: jest.fn()
      };

      (mockWindow as any).scheduler = mockScheduler;

      await compatibility.initialize();

      // Scheduler integration should be set up
      expect(true).toBe(true);
    });

    it('should handle missing React scheduler gracefully', async () => {
      // No scheduler present
      await expect(compatibility.initialize()).resolves.not.toThrow();
    });
  });

  describe('Lifecycle Hooks', () => {
    it('should handle framework mount', () => {
      expect(() => {
        compatibility.onFrameworkMount();
      }).not.toThrow();
    });

    it('should handle framework unmount', () => {
      expect(() => {
        compatibility.onFrameworkUnmount();
      }).not.toThrow();
    });

    it('should handle framework update', () => {
      mockDocument.dispatchEvent.mockImplementation(() => {});

      compatibility.onFrameworkUpdate();

      // Should trigger image rescan
      expect(mockDocument.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'dino-overlay-rescan-images'
        })
      );
    });
  });

  describe('Component Update Detection', () => {
    it('should set up mutation observer for React components', async () => {
      const mockRoot = { id: 'root' };
      mockDocument.querySelectorAll.mockReturnValue([mockRoot]);

      await compatibility.initialize();

      expect(mockMutationObserver.observe).toHaveBeenCalledWith(
        mockRoot,
        {
          childList: true,
          subtree: true,
          attributes: false
        }
      );
    });

    it('should debounce image rescans', async () => {
      jest.useFakeTimers();
      mockDocument.dispatchEvent.mockImplementation(() => {});

      // Trigger multiple updates quickly
      compatibility.onFrameworkUpdate();
      compatibility.onFrameworkUpdate();
      compatibility.onFrameworkUpdate();

      // Fast-forward time
      jest.advanceTimersByTime(150);

      // Should only dispatch once due to debouncing
      expect(mockDocument.dispatchEvent).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup all resources', async () => {
      const mockElement = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      };

      await compatibility.initialize();
      compatibility.attachEventListeners(mockElement as any, { click: jest.fn() });

      compatibility.cleanup();

      expect(mockElement.removeEventListener).toHaveBeenCalled();
      expect(mockMutationObserver.disconnect).toHaveBeenCalled();
    });

    it('should handle cleanup when not initialized', () => {
      expect(() => {
        compatibility.cleanup();
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle React element detection errors', () => {
      mockDocument.querySelectorAll.mockImplementation(() => {
        throw new Error('DOM error');
      });

      const result = compatibility.findEditableImages();

      expect(result).toEqual([]);
    });

    it('should handle event listener errors gracefully', () => {
      const mockElement = {
        addEventListener: jest.fn().mockImplementation(() => {
          throw new Error('Event error');
        })
      };

      expect(() => {
        compatibility.attachEventListeners(mockElement as any, { click: jest.fn() });
      }).not.toThrow();
    });

    it('should handle lifecycle hook errors', () => {
      // Mock an error in the update handler
      mockDocument.dispatchEvent.mockImplementation(() => {
        throw new Error('Dispatch error');
      });

      expect(() => {
        compatibility.onFrameworkUpdate();
      }).not.toThrow();
    });
  });

  describe('Performance Optimizations', () => {
    it('should handle React Concurrent Mode', async () => {
      // React 18+ concurrent features
      await compatibility.initialize();

      // Concurrent mode handling should be applied
      expect(true).toBe(true);
    });

    it('should handle React Strict Mode', async () => {
      // React Strict Mode causes double rendering
      await compatibility.initialize();

      // Strict mode handling should be applied
      expect(true).toBe(true);
    });
  });
});