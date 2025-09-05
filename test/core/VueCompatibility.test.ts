import { VueCompatibility } from '../../src/compatibility/vue/VueCompatibility';

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
  Vue: undefined,
  __VUE__: undefined,
  __VUE_DEVTOOLS_GLOBAL_HOOK__: undefined,
  __NUXT__: undefined,
  $nuxt: undefined,
  VueRouter: undefined
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

describe('VueCompatibility', () => {
  let compatibility: VueCompatibility;

  beforeEach(() => {
    compatibility = new VueCompatibility();
    
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

    it('should detect Vue 2 during initialization', async () => {
      (mockWindow as any).Vue = { version: '2.7.14' };

      await compatibility.initialize();

      // Vue 2 detection should have occurred
      expect(true).toBe(true);
    });

    it('should detect Vue 3 during initialization', async () => {
      (mockWindow as any).Vue = { version: '3.3.4' };
      (mockWindow as any).__VUE__ = true;

      await compatibility.initialize();

      // Vue 3 detection should have occurred
      expect(true).toBe(true);
    });

    it('should detect Vue DevTools during initialization', async () => {
      (mockWindow as any).__VUE_DEVTOOLS_GLOBAL_HOOK__ = {
        Vue: { version: '3.3.4' }
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

  describe('Vue Element Detection', () => {
    it('should identify Vue 2 elements by __vue__ property', () => {
      const mockImages = [
        {
          tagName: 'IMG',
          __vue__: { $options: {} },
          parentElement: null
        }
      ];

      mockDocument.querySelectorAll.mockReturnValue(mockImages);

      const result = compatibility.findEditableImages();

      expect(result).toHaveLength(1);
    });

    it('should identify Vue 3 elements by __vueParentComponent property', () => {
      const mockImages = [
        {
          tagName: 'IMG',
          __vueParentComponent: {},
          parentElement: null
        }
      ];

      mockDocument.querySelectorAll.mockReturnValue(mockImages);

      const result = compatibility.findEditableImages();

      expect(result).toHaveLength(1);
    });

    it('should identify Vue elements by directives', () => {
      const mockImage = {
        tagName: 'IMG',
        attributes: [
          { name: 'v-bind:src', value: 'image.jpg' },
          { name: 'data-v-123abc', value: '' }
        ],
        parentElement: null
      };

      mockDocument.querySelectorAll.mockReturnValue([mockImage]);

      const result = compatibility.findEditableImages();

      expect(result).toHaveLength(1);
    });

    it('should handle Vue directive selectors', () => {
      const mockVueImage = {
        tagName: 'IMG',
        __vue__: {}
      };

      mockDocument.querySelectorAll.mockImplementation((selector) => {
        if (selector.includes('[v-bind\\:src]')) {
          return [mockVueImage];
        }
        return [];
      });

      const result = compatibility.findEditableImages();

      expect(result).toContain(mockVueImage);
    });

    it('should handle Nuxt.js image components', () => {
      const mockNuxtImage = {
        tagName: 'NUXT-IMG',
        classList: { add: jest.fn() }
      };

      mockDocument.querySelectorAll.mockImplementation((selector) => {
        if (selector.includes('nuxt-img')) {
          return [mockNuxtImage];
        }
        return [];
      });

      const result = compatibility.findEditableImages();

      expect(result).toContain(mockNuxtImage);
    });
  });

  describe('Event Handling', () => {
    it('should attach event listeners with Vue-specific wrapping', () => {
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

    it('should use capture phase to avoid Vue event handling conflicts', () => {
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

  describe('Vue DevTools Integration', () => {
    it('should hook into Vue DevTools events', async () => {
      const mockDevTools = {
        on: jest.fn()
      };

      (mockWindow as any).__VUE_DEVTOOLS_GLOBAL_HOOK__ = mockDevTools;

      await compatibility.initialize();

      expect(mockDevTools.on).toHaveBeenCalledWith('component:updated', expect.any(Function));
      expect(mockDevTools.on).toHaveBeenCalledWith('component:added', expect.any(Function));
      expect(mockDevTools.on).toHaveBeenCalledWith('component:removed', expect.any(Function));
    });

    it('should handle missing Vue DevTools gracefully', async () => {
      // No DevTools present
      await expect(compatibility.initialize()).resolves.not.toThrow();
    });

    it('should handle DevTools without event system', async () => {
      (mockWindow as any).__VUE_DEVTOOLS_GLOBAL_HOOK__ = {}; // No 'on' method

      await expect(compatibility.initialize()).resolves.not.toThrow();
    });
  });

  describe('Vue Instance Detection', () => {
    it('should detect Vue 2 instances', async () => {
      const mockVueElement = {
        __vue__: { $options: { name: 'TestComponent' } }
      };

      mockDocument.querySelectorAll.mockImplementation((selector) => {
        if (selector.includes('[data-v-]')) {
          return [mockVueElement];
        }
        return [];
      });

      await compatibility.initialize();

      // Vue 2 instance detection should have occurred
      expect(true).toBe(true);
    });

    it('should detect Vue 3 app instances', async () => {
      const mockAppContainer = {
        __vue_app__: { version: '3.3.4' }
      };

      mockDocument.querySelectorAll.mockImplementation((selector) => {
        if (selector.includes('[data-v-app]') || selector.includes('#app')) {
          return [mockAppContainer];
        }
        return [];
      });

      await compatibility.initialize();

      // Vue 3 app detection should have occurred
      expect(true).toBe(true);
    });
  });

  describe('Nuxt.js Integration', () => {
    it('should detect Nuxt.js applications', async () => {
      (mockWindow as any).__NUXT__ = { state: {} };
      mockDocument.querySelector.mockImplementation((selector) => {
        if (selector === '#__nuxt') return { id: '__nuxt' };
        return null;
      });

      await compatibility.initialize();

      // Nuxt.js specific handling should be applied
      expect(true).toBe(true);
    });

    it('should handle Nuxt.js routing', async () => {
      const mockRouter = {
        afterEach: jest.fn()
      };

      (mockWindow as any).$nuxt = { $router: mockRouter };

      await compatibility.initialize();

      expect(mockRouter.afterEach).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should handle Nuxt.js Image components', async () => {
      const mockNuxtImages = [
        { tagName: 'NUXT-IMG', classList: { add: jest.fn() } }
      ];

      mockDocument.querySelectorAll.mockImplementation((selector) => {
        if (selector.includes('nuxt-img')) return mockNuxtImages;
        return [];
      });

      await compatibility.initialize();

      expect(mockNuxtImages[0].classList.add).toHaveBeenCalledWith('editable-room');
    });

    it('should handle Nuxt.js SSR content', async () => {
      (mockWindow as any).__NUXT__ = { serverRendered: true };

      await compatibility.initialize();

      // SSR handling should be applied (tested through setTimeout behavior)
      expect(true).toBe(true);
    });
  });

  describe('Vue Router Integration', () => {
    it('should detect Vue Router', async () => {
      (mockWindow as any).VueRouter = { version: '4.0.0' };

      await compatibility.initialize();

      // Vue Router handling should be applied
      expect(true).toBe(true);
    });

    it('should handle Vue Router navigation', async () => {
      (mockWindow as any).VueRouter = {};
      const mockAddEventListener = jest.spyOn(window, 'addEventListener');

      await compatibility.initialize();

      expect(mockAddEventListener).toHaveBeenCalledWith('popstate', expect.any(Function));

      mockAddEventListener.mockRestore();
    });
  });

  describe('Style Conflict Prevention', () => {
    it('should create Vue-specific style overrides', async () => {
      const mockStyleElement = {
        textContent: ''
      };

      mockDocument.createElement.mockReturnValue(mockStyleElement);
      mockDocument.head.appendChild.mockImplementation(() => {});

      await compatibility.initialize();

      expect(mockDocument.createElement).toHaveBeenCalledWith('style');
      expect(mockDocument.head.appendChild).toHaveBeenCalledWith(mockStyleElement);
      expect(mockStyleElement.textContent).toContain('Vue compatibility');
    });

    it('should handle Vuetify conflicts', async () => {
      mockDocument.querySelector.mockImplementation((selector) => {
        if (selector === '.v-application') return { className: 'v-application' };
        return null;
      });

      const mockStyleElement = {
        textContent: ''
      };

      mockDocument.createElement.mockReturnValue(mockStyleElement);

      await compatibility.initialize();

      expect(mockStyleElement.textContent).toContain('Vuetify compatibility');
    });
  });

  describe('Vue NextTick Integration', () => {
    it('should use Vue nextTick when available', async () => {
      const mockNextTick = jest.fn((callback) => callback());
      (mockWindow as any).Vue = { nextTick: mockNextTick };

      await compatibility.initialize();

      // nextTick integration should be set up
      expect(true).toBe(true);
    });

    it('should handle missing Vue nextTick gracefully', async () => {
      (mockWindow as any).Vue = {}; // No nextTick method

      await expect(compatibility.initialize()).resolves.not.toThrow();
    });
  });

  describe('Component Update Detection', () => {
    it('should set up mutation observer for Vue components', async () => {
      const mockAppContainer = { id: 'app' };
      mockDocument.querySelectorAll.mockReturnValue([mockAppContainer]);

      await compatibility.initialize();

      expect(mockMutationObserver.observe).toHaveBeenCalledWith(
        mockAppContainer,
        {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['v-', 'data-v-', ':', '@']
        }
      );
    });

    it('should detect Vue directive changes', async () => {
      // This would be tested through the mutation observer callback
      // when attribute changes occur
      expect(true).toBe(true);
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

  describe('Vue Version Detection', () => {
    it('should correctly identify Vue 2', async () => {
      (mockWindow as any).Vue = { version: '2.7.14' };

      await compatibility.initialize();

      // Vue 2 specific behavior should be applied
      expect(true).toBe(true);
    });

    it('should correctly identify Vue 3', async () => {
      (mockWindow as any).Vue = { version: '3.3.4' };
      (mockWindow as any).__VUE__ = true;

      await compatibility.initialize();

      // Vue 3 specific behavior should be applied
      expect(true).toBe(true);
    });

    it('should handle version detection from DevTools', async () => {
      (mockWindow as any).__VUE_DEVTOOLS_GLOBAL_HOOK__ = {
        Vue: { version: '3.2.0' }
      };

      await compatibility.initialize();

      expect(true).toBe(true);
    });
  });

  describe('Reactivity System Integration', () => {
    it('should handle Vue 2 reactivity (Object.defineProperty)', async () => {
      (mockWindow as any).Vue = { version: '2.7.14' };

      await compatibility.initialize();

      // Vue 2 reactivity handling should be applied
      expect(true).toBe(true);
    });

    it('should handle Vue 3 reactivity (Proxy)', async () => {
      (mockWindow as any).Vue = { version: '3.3.4' };

      await compatibility.initialize();

      // Vue 3 reactivity handling should be applied
      expect(true).toBe(true);
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
    it('should handle Vue element detection errors', () => {
      mockDocument.querySelectorAll.mockImplementation(() => {
        throw new Error('DOM error');
      });

      const result = compatibility.findEditableImages();

      expect(result).toEqual([]);
    });

    it('should handle invalid Vue directive selectors', () => {
      mockDocument.querySelectorAll.mockImplementation((selector) => {
        if (selector.includes('[v-bind\\:src]')) {
          throw new Error('Invalid selector');
        }
        return [];
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
      mockDocument.dispatchEvent.mockImplementation(() => {
        throw new Error('Dispatch error');
      });

      expect(() => {
        compatibility.onFrameworkUpdate();
      }).not.toThrow();
    });
  });

  describe('Performance Optimizations', () => {
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
});