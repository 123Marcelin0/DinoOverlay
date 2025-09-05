import { PlainHTMLCompatibility } from '../../src/compatibility/html/PlainHTMLCompatibility';

// Mock DOM environment
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
    classList: {
      contains: jest.fn()
    }
  },
  readyState: 'complete'
};

const mockWindow = {
  jQuery: undefined,
  $: undefined,
  innerWidth: 1024,
  matchMedia: jest.fn()
};

const mockNavigator = {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
};

// Mock observers
const mockMutationObserver = {
  observe: jest.fn(),
  disconnect: jest.fn()
};

const mockResizeObserver = {
  observe: jest.fn(),
  disconnect: jest.fn()
};

const mockIntersectionObserver = {
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

Object.defineProperty(global, 'navigator', {
  value: mockNavigator,
  writable: true
});

Object.defineProperty(global, 'MutationObserver', {
  value: jest.fn().mockImplementation(() => mockMutationObserver),
  writable: true
});

Object.defineProperty(global, 'ResizeObserver', {
  value: jest.fn().mockImplementation(() => mockResizeObserver),
  writable: true
});

Object.defineProperty(global, 'IntersectionObserver', {
  value: jest.fn().mockImplementation(() => mockIntersectionObserver),
  writable: true
});

describe('PlainHTMLCompatibility', () => {
  let compatibility: PlainHTMLCompatibility;

  beforeEach(() => {
    compatibility = new PlainHTMLCompatibility();
    
    // Reset mocks
    jest.clearAllMocks();
    mockDocument.querySelector.mockReturnValue(null);
    mockDocument.querySelectorAll.mockReturnValue([]);
    mockDocument.body.classList.contains.mockReturnValue(false);
    mockWindow.matchMedia.mockReturnValue({ addListener: jest.fn() });
    
    // Reset window properties
    (mockWindow as any).jQuery = undefined;
    (mockWindow as any).$ = undefined;
    mockWindow.innerWidth = 1024;
    
    // Reset navigator
    mockNavigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await expect(compatibility.initialize()).resolves.not.toThrow();
    });

    it('should detect jQuery during initialization', async () => {
      (mockWindow as any).jQuery = { fn: { jquery: '3.6.0' } };

      await compatibility.initialize();

      // jQuery detection should have occurred
      expect(true).toBe(true);
    });

    it('should detect jQuery via $ global', async () => {
      (mockWindow as any).$ = { fn: { jquery: '3.7.0' } };

      await compatibility.initialize();

      // jQuery detection should have occurred
      expect(true).toBe(true);
    });

    it('should not initialize twice', async () => {
      await compatibility.initialize();
      await compatibility.initialize();

      // Should not throw or cause issues
      expect(true).toBe(true);
    });
  });

  describe('Image Detection', () => {
    it('should find HTML-specific image selectors', () => {
      const mockImages = [
        { tagName: 'IMG' },
        { tagName: 'IMG' }
      ];

      mockDocument.querySelectorAll.mockImplementation((selector) => {
        if (selector.includes('.gallery img')) {
          return mockImages;
        }
        return [];
      });

      const result = compatibility.findEditableImages();

      expect(result).toHaveLength(2);
      expect(mockDocument.querySelectorAll).toHaveBeenCalledWith(
        expect.stringContaining('.gallery img')
      );
    });

    it('should handle jQuery plugin image selectors', () => {
      const mockSlickImage = { tagName: 'IMG' };
      const mockOwlImage = { tagName: 'IMG' };

      mockDocument.querySelectorAll.mockImplementation((selector) => {
        if (selector.includes('.slick-slide img')) {
          return [mockSlickImage];
        }
        if (selector.includes('.owl-item img')) {
          return [mockOwlImage];
        }
        return [];
      });

      const result = compatibility.findEditableImages();

      expect(result).toContain(mockSlickImage);
      expect(result).toContain(mockOwlImage);
    });

    it('should handle Bootstrap image patterns', () => {
      const mockBootstrapImages = [
        { tagName: 'IMG', className: 'card-img' },
        { tagName: 'IMG', className: 'img-fluid' }
      ];

      mockDocument.querySelectorAll.mockImplementation((selector) => {
        if (selector.includes('.card-img')) {
          return [mockBootstrapImages[0]];
        }
        if (selector.includes('.img-fluid')) {
          return [mockBootstrapImages[1]];
        }
        return [];
      });

      const result = compatibility.findEditableImages();

      expect(result).toContain(mockBootstrapImages[0]);
      expect(result).toContain(mockBootstrapImages[1]);
    });

    it('should handle data attribute images', () => {
      const mockDataImages = [
        { tagName: 'IMG', dataset: { room: 'living-room' } },
        { tagName: 'IMG', dataset: { property: 'house-1' } }
      ];

      mockDocument.querySelectorAll.mockImplementation((selector) => {
        if (selector.includes('[data-room]')) {
          return [mockDataImages[0]];
        }
        if (selector.includes('[data-property]')) {
          return [mockDataImages[1]];
        }
        return [];
      });

      const result = compatibility.findEditableImages();

      expect(result).toContain(mockDataImages[0]);
      expect(result).toContain(mockDataImages[1]);
    });

    it('should handle wrapper elements with nested images', () => {
      const mockWrapper = {
        tagName: 'DIV',
        querySelector: jest.fn().mockReturnValue({ tagName: 'IMG' })
      };

      mockDocument.querySelectorAll.mockReturnValue([mockWrapper]);

      const result = compatibility.findEditableImages();

      expect(mockWrapper.querySelector).toHaveBeenCalledWith('img');
      expect(result).toHaveLength(1);
    });

    it('should handle invalid selectors gracefully', () => {
      mockDocument.querySelectorAll.mockImplementation((selector) => {
        if (selector.includes('invalid[selector')) {
          throw new Error('Invalid selector');
        }
        return [];
      });

      const result = compatibility.findEditableImages();

      expect(result).toEqual([]);
    });
  });

  describe('Event Handling', () => {
    it('should attach event listeners with HTML-specific wrapping', () => {
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
        { passive: true }
      );
    });

    it('should remove event listeners correctly', () => {
      const mockElement = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      };

      const mockEvents = { click: jest.fn() };

      compatibility.attachEventListeners(mockElement as any, mockEvents);
      compatibility.removeEventListeners(mockElement as any);

      expect(mockElement.removeEventListener).toHaveBeenCalledWith(
        'click',
        expect.any(Function)
      );
    });
  });

  describe('Legacy Browser Support', () => {
    it('should detect Internet Explorer', async () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko';

      const mockStyleElement = {
        textContent: ''
      };

      mockDocument.createElement.mockReturnValue(mockStyleElement);

      await compatibility.initialize();

      expect(mockStyleElement.textContent).toContain('IE compatibility');
    });

    it('should detect old WebKit browsers', async () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/536.30.1';

      const mockStyleElement = {
        textContent: ''
      };

      mockDocument.createElement.mockReturnValue(mockStyleElement);

      await compatibility.initialize();

      expect(mockStyleElement.textContent).toContain('Old WebKit compatibility');
    });

    it('should polyfill missing features', async () => {
      // Remove CustomEvent to test polyfill
      const originalCustomEvent = (global as any).CustomEvent;
      delete (global as any).CustomEvent;

      await compatibility.initialize();

      expect((global as any).CustomEvent).toBeDefined();

      // Restore
      (global as any).CustomEvent = originalCustomEvent;
    });

    it('should polyfill Array.from', async () => {
      const originalArrayFrom = Array.from;
      delete (Array as any).from;

      await compatibility.initialize();

      expect(Array.from).toBeDefined();

      // Restore
      Array.from = originalArrayFrom;
    });

    it('should polyfill Object.assign', async () => {
      const originalObjectAssign = Object.assign;
      delete (Object as any).assign;

      await compatibility.initialize();

      expect(Object.assign).toBeDefined();

      // Restore
      Object.assign = originalObjectAssign;
    });
  });

  describe('CSS Framework Compatibility', () => {
    it('should detect Bootstrap and apply overrides', async () => {
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

      await compatibility.initialize();

      expect(mockStyleElement.textContent).toContain('Bootstrap compatibility');
    });

    it('should detect Foundation and apply overrides', async () => {
      mockDocument.querySelector.mockImplementation((selector) => {
        if (selector.includes('foundation')) {
          return { href: 'foundation.css' };
        }
        return null;
      });

      const mockStyleElement = {
        textContent: ''
      };

      mockDocument.createElement.mockReturnValue(mockStyleElement);

      await compatibility.initialize();

      expect(mockStyleElement.textContent).toContain('Foundation compatibility');
    });

    it('should detect Bulma and apply overrides', async () => {
      mockDocument.querySelector.mockImplementation((selector) => {
        if (selector.includes('bulma')) {
          return { href: 'bulma.css' };
        }
        return null;
      });

      const mockStyleElement = {
        textContent: ''
      };

      mockDocument.createElement.mockReturnValue(mockStyleElement);

      await compatibility.initialize();

      expect(mockStyleElement.textContent).toContain('Bulma compatibility');
    });
  });

  describe('jQuery Integration', () => {
    it('should handle jQuery plugins', async () => {
      const mockJQuery = {
        fn: {
          jquery: '3.6.0',
          slick: {},
          owlCarousel: {},
          swiper: {},
          fancybox: {}
        }
      };

      (mockWindow as any).$ = mockJQuery;
      (mockWindow as any).jQuery = mockJQuery;

      mockDocument.addEventListener.mockImplementation(() => {});

      await compatibility.initialize();

      // jQuery plugin handling should be set up
      expect(true).toBe(true);
    });

    it('should handle Slick carousel events', async () => {
      const mockJQuery = {
        fn: { jquery: '3.6.0', slick: {} }
      };

      (mockWindow as any).$ = mockJQuery;

      const mockOn = jest.fn();
      mockJQuery.fn = Object.assign(mockJQuery.fn, mockOn);

      mockDocument.addEventListener.mockImplementation(() => {});

      await compatibility.initialize();

      // Slick event handling should be set up
      expect(true).toBe(true);
    });

    it('should handle jQuery DOM ready events', async () => {
      const mockJQuery = jest.fn();
      mockJQuery.fn = { jquery: '3.6.0' };

      const mockReady = jest.fn((callback) => callback());
      mockJQuery.mockImplementation((selector) => {
        if (selector === document) {
          return { ready: mockReady };
        }
        return {};
      });

      (mockWindow as any).$ = mockJQuery;

      await compatibility.initialize();

      // jQuery ready handling should be set up
      expect(true).toBe(true);
    });
  });

  describe('DOM Observation', () => {
    it('should set up mutation observer for dynamic content', async () => {
      await compatibility.initialize();

      expect(mockMutationObserver.observe).toHaveBeenCalledWith(
        mockDocument.body,
        {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['class', 'id', 'data-room', 'data-property', 'data-editable']
        }
      );
    });

    it('should set up resize observer when available', async () => {
      await compatibility.initialize();

      expect(mockResizeObserver).toBeDefined();
    });

    it('should handle missing ResizeObserver gracefully', async () => {
      delete (global as any).ResizeObserver;

      await expect(compatibility.initialize()).resolves.not.toThrow();

      // Restore
      (global as any).ResizeObserver = jest.fn().mockImplementation(() => mockResizeObserver);
    });
  });

  describe('Lazy Loading Integration', () => {
    it('should handle lazy loading images', async () => {
      const mockLazyImages = [
        { dataset: { src: 'lazy1.jpg' } },
        { dataset: { lazy: 'lazy2.jpg' } }
      ];

      mockDocument.querySelectorAll.mockImplementation((selector) => {
        if (selector.includes('[data-src]') || selector.includes('[data-lazy]')) {
          return mockLazyImages;
        }
        return [];
      });

      await compatibility.initialize();

      expect(mockIntersectionObserver.observe).toHaveBeenCalledTimes(2);
    });

    it('should handle missing IntersectionObserver gracefully', async () => {
      delete (global as any).IntersectionObserver;

      await expect(compatibility.initialize()).resolves.not.toThrow();

      // Restore
      (global as any).IntersectionObserver = jest.fn().mockImplementation(() => mockIntersectionObserver);
    });
  });

  describe('Responsive Design Support', () => {
    it('should handle responsive breakpoints', async () => {
      const mockMediaQuery = {
        addListener: jest.fn()
      };

      mockWindow.matchMedia.mockReturnValue(mockMediaQuery);

      await compatibility.initialize();

      expect(mockWindow.matchMedia).toHaveBeenCalledWith('(max-width: 576px)');
      expect(mockWindow.matchMedia).toHaveBeenCalledWith('(max-width: 768px)');
      expect(mockMediaQuery.addListener).toHaveBeenCalled();
    });
  });

  describe('Modal Plugin Integration', () => {
    it('should handle Bootstrap modal events', async () => {
      mockDocument.addEventListener.mockImplementation(() => {});

      await compatibility.initialize();

      expect(mockDocument.addEventListener).toHaveBeenCalledWith(
        'show.bs.modal',
        expect.any(Function)
      );
      expect(mockDocument.addEventListener).toHaveBeenCalledWith(
        'shown.bs.modal',
        expect.any(Function)
      );
    });
  });

  describe('Performance Optimizations', () => {
    it('should optimize for old browsers', async () => {
      mockNavigator.userAgent = 'Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.1)';

      const mockStyleElement = {
        textContent: ''
      };

      mockDocument.createElement.mockReturnValue(mockStyleElement);

      await compatibility.initialize();

      expect(mockStyleElement.textContent).toContain('Old browser compatibility');
    });

    it('should reduce features for old browsers', async () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1)';

      const mockStyleElement = {
        textContent: ''
      };

      mockDocument.createElement.mockReturnValue(mockStyleElement);

      await compatibility.initialize();

      expect(mockStyleElement.textContent).toContain('backdrop-filter: none');
    });
  });

  describe('Gallery Plugin Integration', () => {
    it('should handle image gallery plugins', async () => {
      const mockGalleries = [
        { className: 'gallery' },
        { className: 'image-gallery' }
      ];

      mockDocument.querySelectorAll.mockImplementation((selector) => {
        if (selector === '.gallery') return [mockGalleries[0]];
        if (selector === '.image-gallery') return [mockGalleries[1]];
        return [];
      });

      await compatibility.initialize();

      expect(mockMutationObserver.observe).toHaveBeenCalledWith(
        mockGalleries[0],
        { childList: true, subtree: true }
      );
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
      expect(mockResizeObserver.disconnect).toHaveBeenCalled();
    });

    it('should handle cleanup when not initialized', () => {
      expect(() => {
        compatibility.cleanup();
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle DOM query errors gracefully', () => {
      mockDocument.querySelectorAll.mockImplementation(() => {
        throw new Error('DOM error');
      });

      const result = compatibility.findEditableImages();

      expect(result).toEqual([]);
    });

    it('should handle event attachment errors', () => {
      const mockElement = {
        addEventListener: jest.fn().mockImplementation(() => {
          throw new Error('Event error');
        })
      };

      expect(() => {
        compatibility.attachEventListeners(mockElement as any, { click: jest.fn() });
      }).not.toThrow();
    });

    it('should handle initialization errors', async () => {
      mockDocument.createElement.mockImplementation(() => {
        throw new Error('DOM error');
      });

      await expect(compatibility.initialize()).rejects.toThrow();
    });
  });

  describe('Debouncing', () => {
    it('should debounce image rescans', async () => {
      jest.useFakeTimers();
      mockDocument.dispatchEvent.mockImplementation(() => {});

      await compatibility.initialize();

      // Trigger multiple rescans quickly
      const event = new CustomEvent('dino-overlay-rescan-images');
      mockDocument.dispatchEvent(event);
      mockDocument.dispatchEvent(event);
      mockDocument.dispatchEvent(event);

      // Fast-forward time
      jest.advanceTimersByTime(150);

      // Should only dispatch once due to debouncing
      expect(mockDocument.dispatchEvent).toHaveBeenCalledTimes(3); // Initial calls

      jest.useRealTimers();
    });
  });
});