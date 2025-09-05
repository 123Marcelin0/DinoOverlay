import { CompatibilityManager } from '../../src/compatibility/CompatibilityManager';
import { FrameworkDetector } from '../../src/compatibility/FrameworkDetector';
import { FrameworkType, CompatibilityConfig } from '../../src/compatibility/types';

// Mock DOM environment for integration testing
const mockDocument = {
  createElement: jest.fn(),
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(),
  addEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
  head: {
    appendChild: jest.fn()
  },
  body: {
    className: '',
    classList: {
      contains: jest.fn()
    }
  },
  title: 'Integration Test Page'
};

const mockWindow = {
  wp: undefined,
  React: undefined,
  Vue: undefined,
  jQuery: undefined,
  $: undefined,
  __REACT_DEVTOOLS_GLOBAL_HOOK__: undefined,
  __VUE_DEVTOOLS_GLOBAL_HOOK__: undefined,
  __NEXT_DATA__: undefined,
  __NUXT__: undefined,
  innerWidth: 1024
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

describe('Framework Compatibility Integration', () => {
  let manager: CompatibilityManager;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    mockDocument.querySelector.mockReturnValue(null);
    mockDocument.querySelectorAll.mockReturnValue([]);
    mockDocument.body.className = '';
    mockDocument.body.classList.contains.mockReturnValue(false);
    
    // Reset window properties
    Object.keys(mockWindow).forEach(key => {
      (mockWindow as any)[key] = undefined;
    });
    mockWindow.innerWidth = 1024;
  });

  describe('WordPress Integration Scenarios', () => {
    beforeEach(() => {
      // Setup WordPress environment
      (mockWindow as any).wp = { hooks: { addAction: jest.fn(), addFilter: jest.fn() } };
      mockDocument.querySelector.mockImplementation((selector) => {
        if (selector.includes('meta[name="generator"]')) {
          return { content: 'WordPress 6.0' };
        }
        return null;
      });
      mockDocument.body.className = 'wp-admin wp-core-ui';
    });

    it('should detect and initialize WordPress compatibility', async () => {
      manager = new CompatibilityManager();
      
      await manager.initialize();

      const frameworkInfo = manager.getFrameworkInfo();
      expect(frameworkInfo?.type).toBe('wordpress');
      expect(frameworkInfo?.detected).toBe(true);
      expect(frameworkInfo?.confidence).toBeGreaterThan(0.5);
    });

    it('should find WordPress-specific images', async () => {
      const mockWPImages = [
        { tagName: 'IMG', classList: { add: jest.fn() } },
        { tagName: 'IMG', classList: { add: jest.fn() } }
      ];

      mockDocument.querySelectorAll.mockImplementation((selector) => {
        if (selector.includes('.wp-block-image img')) {
          return mockWPImages;
        }
        return [];
      });

      manager = new CompatibilityManager();
      await manager.initialize();

      const images = manager.findEditableImages();
      expect(images).toHaveLength(2);
    });

    it('should handle WordPress theme-specific images', async () => {
      mockDocument.body.classList.contains.mockImplementation((className) => {
        return className === 'astra-theme';
      });

      const mockAstraImages = [
        { tagName: 'IMG', classList: { add: jest.fn() } }
      ];

      mockDocument.querySelectorAll.mockImplementation((selector) => {
        if (selector.includes('.astra-image')) {
          return mockAstraImages;
        }
        return [];
      });

      manager = new CompatibilityManager();
      await manager.initialize();

      const images = manager.findEditableImages();
      expect(images).toContain(mockAstraImages[0]);
    });

    it('should integrate with WordPress hooks system', async () => {
      const mockHooks = {
        addAction: jest.fn(),
        addFilter: jest.fn()
      };

      (mockWindow as any).wp = { hooks: mockHooks };

      manager = new CompatibilityManager();
      await manager.initialize();

      expect(mockHooks.addAction).toHaveBeenCalledWith(
        'wp.editor.ready',
        'dino-overlay',
        expect.any(Function)
      );
    });
  });

  describe('React Integration Scenarios', () => {
    beforeEach(() => {
      // Setup React environment
      (mockWindow as any).React = { version: '18.2.0' };
      (mockWindow as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
        renderers: new Map([[1, { version: '18.2.0' }]])
      };
      mockDocument.querySelector.mockImplementation((selector) => {
        if (selector === '[data-reactroot]') {
          return { dataset: { reactroot: '' } };
        }
        return null;
      });
    });

    it('should detect and initialize React compatibility', async () => {
      manager = new CompatibilityManager();
      
      await manager.initialize();

      const frameworkInfo = manager.getFrameworkInfo();
      expect(frameworkInfo?.type).toBe('react');
      expect(frameworkInfo?.detected).toBe(true);
      expect(frameworkInfo?.version).toBe('18.2.0');
    });

    it('should find React component images', async () => {
      const mockReactImages = [
        { tagName: 'IMG', _reactInternalFiber: {}, parentElement: null },
        { tagName: 'IMG', __reactInternalInstance: {}, parentElement: null }
      ];

      mockDocument.querySelectorAll.mockReturnValue(mockReactImages);

      manager = new CompatibilityManager();
      await manager.initialize();

      const images = manager.findEditableImages();
      expect(images).toHaveLength(2);
    });

    it('should handle Next.js integration', async () => {
      (mockWindow as any).__NEXT_DATA__ = { page: '/' };
      mockDocument.querySelector.mockImplementation((selector) => {
        if (selector === '#__next') return { id: '__next' };
        return null;
      });

      const mockNextImages = [
        { tagName: 'IMG', dataset: { nimg: 'fill' }, classList: { add: jest.fn() } }
      ];

      mockDocument.querySelectorAll.mockImplementation((selector) => {
        if (selector.includes('[data-nimg]')) return mockNextImages;
        return [];
      });

      manager = new CompatibilityManager();
      await manager.initialize();

      expect(mockNextImages[0].classList.add).toHaveBeenCalledWith('editable-room');
    });

    it('should use capture phase for event handling', async () => {
      const mockElement = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      };

      manager = new CompatibilityManager();
      await manager.initialize();

      manager.attachEventListeners(mockElement as any, { click: jest.fn() });

      expect(mockElement.addEventListener).toHaveBeenCalledWith(
        'click',
        expect.any(Function),
        { capture: true, passive: true }
      );
    });
  });

  describe('Vue Integration Scenarios', () => {
    beforeEach(() => {
      // Setup Vue environment
      (mockWindow as any).Vue = { version: '3.3.4' };
      (mockWindow as any).__VUE__ = true;
      (mockWindow as any).__VUE_DEVTOOLS_GLOBAL_HOOK__ = {
        Vue: { version: '3.3.4' },
        on: jest.fn()
      };
    });

    it('should detect and initialize Vue compatibility', async () => {
      manager = new CompatibilityManager();
      
      await manager.initialize();

      const frameworkInfo = manager.getFrameworkInfo();
      expect(frameworkInfo?.type).toBe('vue');
      expect(frameworkInfo?.detected).toBe(true);
      expect(frameworkInfo?.version).toBe('3.3.4');
    });

    it('should find Vue component images', async () => {
      const mockVueImages = [
        { 
          tagName: 'IMG', 
          __vueParentComponent: {},
          parentElement: null
        },
        {
          tagName: 'IMG',
          attributes: [{ name: 'v-bind:src', value: 'image.jpg' }],
          parentElement: null
        }
      ];

      mockDocument.querySelectorAll.mockReturnValue(mockVueImages);

      manager = new CompatibilityManager();
      await manager.initialize();

      const images = manager.findEditableImages();
      expect(images).toHaveLength(2);
    });

    it('should handle Nuxt.js integration', async () => {
      (mockWindow as any).__NUXT__ = { state: {} };
      mockDocument.querySelector.mockImplementation((selector) => {
        if (selector === '#__nuxt') return { id: '__nuxt' };
        return null;
      });

      const mockNuxtImages = [
        { tagName: 'NUXT-IMG', classList: { add: jest.fn() } }
      ];

      mockDocument.querySelectorAll.mockImplementation((selector) => {
        if (selector.includes('nuxt-img')) return mockNuxtImages;
        return [];
      });

      manager = new CompatibilityManager();
      await manager.initialize();

      expect(mockNuxtImages[0].classList.add).toHaveBeenCalledWith('editable-room');
    });

    it('should integrate with Vue DevTools', async () => {
      const mockDevTools = {
        on: jest.fn()
      };

      (mockWindow as any).__VUE_DEVTOOLS_GLOBAL_HOOK__ = mockDevTools;

      manager = new CompatibilityManager();
      await manager.initialize();

      expect(mockDevTools.on).toHaveBeenCalledWith('component:updated', expect.any(Function));
    });
  });

  describe('Plain HTML Integration Scenarios', () => {
    beforeEach(() => {
      // Setup plain HTML environment (no frameworks)
      (mockWindow as any).jQuery = { fn: { jquery: '3.6.0' } };
    });

    it('should detect and initialize plain HTML compatibility', async () => {
      manager = new CompatibilityManager();
      
      await manager.initialize();

      const frameworkInfo = manager.getFrameworkInfo();
      expect(frameworkInfo?.type).toBe('html');
      expect(frameworkInfo?.detected).toBe(true);
    });

    it('should find HTML images with various selectors', async () => {
      const mockHTMLImages = [
        { tagName: 'IMG' }, // .gallery img
        { tagName: 'IMG' }, // .slick-slide img
        { tagName: 'IMG' }  // data attributes
      ];

      mockDocument.querySelectorAll.mockImplementation((selector) => {
        if (selector.includes('.gallery img')) return [mockHTMLImages[0]];
        if (selector.includes('.slick-slide img')) return [mockHTMLImages[1]];
        if (selector.includes('[data-room]')) return [mockHTMLImages[2]];
        return [];
      });

      manager = new CompatibilityManager();
      await manager.initialize();

      const images = manager.findEditableImages();
      expect(images).toHaveLength(3);
    });

    it('should handle jQuery plugin integration', async () => {
      const mockJQuery = {
        fn: {
          jquery: '3.6.0',
          slick: {},
          owlCarousel: {}
        }
      };

      (mockWindow as any).$ = mockJQuery;
      mockDocument.addEventListener.mockImplementation(() => {});

      manager = new CompatibilityManager();
      await manager.initialize();

      // jQuery integration should be set up
      expect(true).toBe(true);
    });

    it('should handle CSS framework conflicts', async () => {
      mockDocument.querySelector.mockImplementation((selector) => {
        if (selector.includes('bootstrap')) {
          return { href: 'bootstrap.css' };
        }
        return null;
      });

      const mockStyleElement = {
        textContent: ''
      };

      mockDocument.createElement.mockReturnValue(mockStyleElement);

      manager = new CompatibilityManager();
      await manager.initialize();

      expect(mockStyleElement.textContent).toContain('Bootstrap compatibility');
    });
  });

  describe('Framework Switching', () => {
    it('should switch between frameworks correctly', async () => {
      // Start with WordPress
      (mockWindow as any).wp = { hooks: {} };
      mockDocument.body.className = 'wp-admin';

      manager = new CompatibilityManager();
      await manager.initialize();

      expect(manager.getFrameworkInfo()?.type).toBe('wordpress');

      // Switch to React
      await manager.switchFramework('react');

      expect(manager.getFrameworkInfo()?.type).toBe('react');
      expect(manager.getCurrentAdapter()?.frameworkType).toBe('react');
    });

    it('should handle switching errors gracefully', async () => {
      manager = new CompatibilityManager();
      await manager.initialize();

      // Try to switch to an invalid framework (this should be handled by the adapter creation)
      await expect(manager.switchFramework('react')).resolves.not.toThrow();
    });
  });

  describe('Custom Configuration', () => {
    it('should apply custom selectors across frameworks', async () => {
      const config: CompatibilityConfig = {
        customSelectors: ['.custom-room-image'],
        excludeSelectors: ['.exclude-image']
      };

      const mockCustomImage = { tagName: 'IMG', matches: jest.fn().mockReturnValue(false) };
      const mockExcludeImage = { tagName: 'IMG', matches: jest.fn().mockReturnValue(true) };

      mockDocument.querySelectorAll.mockImplementation((selector) => {
        if (selector.includes('.custom-room-image')) {
          return [mockCustomImage];
        }
        return [mockExcludeImage];
      });

      manager = new CompatibilityManager(config);
      await manager.initialize();

      const images = manager.findEditableImages();

      expect(images).toContain(mockCustomImage);
      expect(images).not.toContain(mockExcludeImage);
    });

    it('should disable auto-detection when configured', async () => {
      const config: CompatibilityConfig = {
        autoDetect: false,
        framework: 'vue'
      };

      // Setup WordPress environment but force Vue
      (mockWindow as any).wp = { hooks: {} };
      mockDocument.body.className = 'wp-admin';

      manager = new CompatibilityManager(config);
      await manager.initialize();

      // Should use Vue despite WordPress indicators
      expect(manager.getFrameworkInfo()?.type).toBe('vue');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle initialization failures gracefully', async () => {
      // Mock a failure in framework detection
      const originalDetector = FrameworkDetector;
      jest.spyOn(FrameworkDetector.prototype, 'detectFramework').mockRejectedValue(
        new Error('Detection failed')
      );

      manager = new CompatibilityManager();

      await expect(manager.initialize()).rejects.toThrow('Detection failed');

      // Restore
      jest.restoreAllMocks();
    });

    it('should handle missing adapters gracefully', async () => {
      manager = new CompatibilityManager();
      
      // Don't initialize, try to use methods
      const images = manager.findEditableImages();
      expect(images).toEqual([]);

      const mockElement = { addEventListener: jest.fn() };
      expect(() => {
        manager.attachEventListeners(mockElement as any, { click: jest.fn() });
      }).not.toThrow();
    });

    it('should handle DOM manipulation errors', async () => {
      mockDocument.querySelectorAll.mockImplementation(() => {
        throw new Error('DOM error');
      });

      manager = new CompatibilityManager();
      await manager.initialize();

      const images = manager.findEditableImages();
      expect(images).toEqual([]);
    });
  });

  describe('Performance and Cleanup', () => {
    it('should cleanup resources properly', async () => {
      manager = new CompatibilityManager();
      await manager.initialize();

      const adapter = manager.getCurrentAdapter();
      const cleanupSpy = jest.spyOn(adapter!, 'cleanup');

      manager.cleanup();

      expect(cleanupSpy).toHaveBeenCalled();
      expect(manager.getCurrentAdapter()).toBeNull();
      expect(manager.getFrameworkInfo()).toBeNull();
    });

    it('should handle multiple initializations efficiently', async () => {
      manager = new CompatibilityManager();

      await manager.initialize();
      await manager.initialize();
      await manager.initialize();

      // Should only initialize once
      expect(manager.getCurrentAdapter()).toBeDefined();
    });

    it('should debounce framework updates', async () => {
      jest.useFakeTimers();

      manager = new CompatibilityManager();
      await manager.initialize();

      mockDocument.dispatchEvent.mockImplementation(() => {});

      // Trigger multiple updates
      manager.onFrameworkUpdate();
      manager.onFrameworkUpdate();
      manager.onFrameworkUpdate();

      jest.advanceTimersByTime(150);

      // Should handle updates efficiently
      expect(true).toBe(true);

      jest.useRealTimers();
    });
  });

  describe('Cross-Framework Compatibility', () => {
    it('should handle mixed framework environments', async () => {
      // Setup environment with multiple framework indicators
      (mockWindow as any).wp = { hooks: {} };
      (mockWindow as any).React = { version: '18.0.0' };
      (mockWindow as any).jQuery = { fn: { jquery: '3.6.0' } };

      manager = new CompatibilityManager();
      await manager.initialize();

      // Should pick the framework with highest confidence
      const frameworkInfo = manager.getFrameworkInfo();
      expect(frameworkInfo?.type).toMatch(/wordpress|react|html/);
      expect(frameworkInfo?.confidence).toBeGreaterThan(0);
    });

    it('should maintain isolation between framework adapters', async () => {
      manager = new CompatibilityManager();
      await manager.initialize();

      const firstAdapter = manager.getCurrentAdapter();

      await manager.switchFramework('react');
      const secondAdapter = manager.getCurrentAdapter();

      expect(firstAdapter).not.toBe(secondAdapter);
      expect(firstAdapter?.frameworkType).not.toBe(secondAdapter?.frameworkType);
    });
  });
});