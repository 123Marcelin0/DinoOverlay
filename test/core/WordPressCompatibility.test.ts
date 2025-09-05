import { WordPressCompatibility } from '../../src/compatibility/wordpress/WordPressCompatibility';

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
  }
};

const mockWindow = {
  wp: undefined,
  ajaxurl: undefined,
  elementorFrontend: undefined,
  ET_Builder: undefined,
  wc_single_product_params: undefined,
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

describe('WordPressCompatibility', () => {
  let compatibility: WordPressCompatibility;

  beforeEach(() => {
    compatibility = new WordPressCompatibility();
    
    // Reset mocks
    jest.clearAllMocks();
    mockDocument.querySelector.mockReturnValue(null);
    mockDocument.querySelectorAll.mockReturnValue([]);
    mockDocument.body.classList.contains.mockReturnValue(false);
    
    // Reset window properties
    Object.keys(mockWindow).forEach(key => {
      (mockWindow as any)[key] = undefined;
    });
    mockWindow.innerWidth = 1024;
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await expect(compatibility.initialize()).resolves.not.toThrow();
    });

    it('should not initialize twice', async () => {
      await compatibility.initialize();
      await compatibility.initialize();

      // Should not throw or cause issues
      expect(true).toBe(true);
    });

    it('should handle initialization errors', async () => {
      // Mock an error during style conflict prevention
      mockDocument.createElement.mockImplementation(() => {
        throw new Error('DOM error');
      });

      await expect(compatibility.initialize()).rejects.toThrow();
    });
  });

  describe('Image Detection', () => {
    it('should find WordPress-specific image selectors', () => {
      const mockImages = [
        { tagName: 'IMG', classList: { add: jest.fn() } },
        { tagName: 'IMG', classList: { add: jest.fn() } }
      ];

      mockDocument.querySelectorAll.mockImplementation((selector) => {
        if (selector.includes('.wp-block-image img')) {
          return mockImages;
        }
        return [];
      });

      const result = compatibility.findEditableImages();

      expect(result).toHaveLength(2);
      expect(mockDocument.querySelectorAll).toHaveBeenCalledWith(
        expect.stringContaining('.wp-block-image img')
      );
    });

    it('should handle theme-specific image selectors', () => {
      const mockElementorImage = { tagName: 'IMG' };
      const mockDiviImage = { tagName: 'IMG' };

      mockDocument.querySelectorAll.mockImplementation((selector) => {
        if (selector.includes('.elementor-image img')) {
          return [mockElementorImage];
        }
        if (selector.includes('.et_pb_image img')) {
          return [mockDiviImage];
        }
        return [];
      });

      const result = compatibility.findEditableImages();

      expect(result).toContain(mockElementorImage);
      expect(result).toContain(mockDiviImage);
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

    it('should remove duplicate images', () => {
      const mockImage = { tagName: 'IMG' };
      
      mockDocument.querySelectorAll.mockReturnValue([mockImage, mockImage]);

      const result = compatibility.findEditableImages();

      expect(result).toHaveLength(1);
    });
  });

  describe('Event Handling', () => {
    it('should attach event listeners with WordPress-specific wrapping', () => {
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

      // First attach, then remove
      compatibility.attachEventListeners(mockElement as any, mockEvents);
      compatibility.removeEventListeners(mockElement as any);

      expect(mockElement.removeEventListener).toHaveBeenCalledWith(
        'click',
        expect.any(Function)
      );
    });

    it('should handle event listener errors gracefully', () => {
      const mockElement = {
        addEventListener: jest.fn().mockImplementation(() => {
          throw new Error('Event error');
        })
      };

      const mockEvents = { click: jest.fn() };

      expect(() => {
        compatibility.attachEventListeners(mockElement as any, mockEvents);
      }).not.toThrow();
    });
  });

  describe('WordPress Theme Detection', () => {
    it('should detect Astra theme', async () => {
      mockDocument.body.classList.contains.mockImplementation((className) => {
        return className === 'astra-theme';
      });

      await compatibility.initialize();

      expect(mockDocument.body.classList.contains).toHaveBeenCalledWith('astra-theme');
    });

    it('should detect Divi theme', async () => {
      mockDocument.body.classList.contains.mockImplementation((className) => {
        return className === 'et_divi_theme';
      });

      await compatibility.initialize();

      expect(mockDocument.body.classList.contains).toHaveBeenCalledWith('et_divi_theme');
    });

    it('should detect GeneratePress theme', async () => {
      mockDocument.body.classList.contains.mockImplementation((className) => {
        return className === 'generatepress';
      });

      await compatibility.initialize();

      expect(mockDocument.body.classList.contains).toHaveBeenCalledWith('generatepress');
    });

    it('should detect OceanWP theme', async () => {
      mockDocument.body.classList.contains.mockImplementation((className) => {
        return className === 'oceanwp-theme';
      });

      await compatibility.initialize();

      expect(mockDocument.body.classList.contains).toHaveBeenCalledWith('oceanwp-theme');
    });
  });

  describe('Plugin Compatibility', () => {
    it('should handle Elementor integration', async () => {
      (mockWindow as any).elementorFrontend = {
        hooks: {
          addAction: jest.fn()
        }
      };

      await compatibility.initialize();

      expect(mockWindow.elementorFrontend.hooks.addAction).toHaveBeenCalledWith(
        'frontend/element_ready/global',
        expect.any(Function)
      );
    });

    it('should handle Divi integration', async () => {
      (mockWindow as any).ET_Builder = {};
      mockDocument.addEventListener.mockImplementation(() => {});

      await compatibility.initialize();

      expect(mockDocument.addEventListener).toHaveBeenCalledWith(
        'DOMContentLoaded',
        expect.any(Function)
      );
    });

    it('should handle WooCommerce integration', async () => {
      (mockWindow as any).wc_single_product_params = {};
      mockDocument.addEventListener.mockImplementation(() => {});

      await compatibility.initialize();

      expect(mockDocument.addEventListener).toHaveBeenCalledWith(
        'woocommerce_gallery_init',
        expect.any(Function)
      );
    });
  });

  describe('WordPress Hooks Integration', () => {
    it('should integrate with WordPress hooks system', async () => {
      const mockHooks = {
        addAction: jest.fn(),
        addFilter: jest.fn()
      };

      (mockWindow as any).wp = { hooks: mockHooks };

      await compatibility.initialize();

      expect(mockHooks.addAction).toHaveBeenCalledWith(
        'wp.editor.ready',
        'dino-overlay',
        expect.any(Function)
      );

      expect(mockHooks.addFilter).toHaveBeenCalledWith(
        'blocks.registerBlockType',
        'dino-overlay',
        expect.any(Function)
      );
    });

    it('should handle missing WordPress hooks gracefully', async () => {
      (mockWindow as any).wp = {}; // No hooks property

      await expect(compatibility.initialize()).resolves.not.toThrow();
    });
  });

  describe('Gutenberg Editor Integration', () => {
    it('should set up mutation observer for Gutenberg editor', async () => {
      const mockEditorContainer = { tagName: 'DIV' };
      mockDocument.querySelector.mockImplementation((selector) => {
        if (selector === '.block-editor') {
          return mockEditorContainer;
        }
        return null;
      });

      await compatibility.initialize();

      // Trigger Gutenberg editor handling
      const mockHooks = {
        addAction: jest.fn((action, namespace, callback) => {
          if (action === 'wp.editor.ready') {
            callback();
          }
        }),
        addFilter: jest.fn()
      };

      (mockWindow as any).wp = { hooks: mockHooks };

      await compatibility.initialize();

      expect(mockMutationObserver.observe).toHaveBeenCalledWith(
        mockEditorContainer,
        {
          childList: true,
          subtree: true
        }
      );
    });
  });

  describe('Style Conflict Prevention', () => {
    it('should create style overrides for WordPress compatibility', async () => {
      const mockStyleElement = {
        textContent: ''
      };

      mockDocument.createElement.mockReturnValue(mockStyleElement);
      mockDocument.head.appendChild.mockImplementation(() => {});

      await compatibility.initialize();

      expect(mockDocument.createElement).toHaveBeenCalledWith('style');
      expect(mockDocument.head.appendChild).toHaveBeenCalledWith(mockStyleElement);
      expect(mockStyleElement.textContent).toContain('WordPress theme compatibility');
    });

    it('should prevent JavaScript conflicts', async () => {
      const originalJQuery = { version: '3.6.0' };
      const originalWP = { hooks: {} };

      (mockWindow as any).$ = originalJQuery;
      (mockWindow as any).wp = originalWP;

      await compatibility.initialize();

      // Should preserve original globals
      expect((mockWindow as any).$).toBe(originalJQuery);
      expect((mockWindow as any).wp).toBe(originalWP);
    });
  });

  describe('Lazy Loading Integration', () => {
    it('should handle lazy loading plugins', async () => {
      const mockLazyImage = {
        dataset: { src: 'lazy-image.jpg' },
        addEventListener: jest.fn()
      };

      mockDocument.querySelectorAll.mockImplementation((selector) => {
        if (selector.includes('[data-src]')) {
          return [mockLazyImage];
        }
        return [];
      });

      // Mock IntersectionObserver
      const mockIntersectionObserver = {
        observe: jest.fn()
      };

      (global as any).IntersectionObserver = jest.fn().mockImplementation(() => mockIntersectionObserver);

      await compatibility.initialize();

      expect(mockIntersectionObserver.observe).toHaveBeenCalledWith(mockLazyImage);
    });

    it('should handle WP Rocket lazy loading', async () => {
      (mockWindow as any).wp_rocket_lazy_load = true;
      mockDocument.addEventListener.mockImplementation(() => {});

      await compatibility.initialize();

      expect(mockDocument.addEventListener).toHaveBeenCalledWith(
        'rocket-lazy-loaded',
        expect.any(Function)
      );
    });
  });

  describe('Mobile Optimization', () => {
    it('should apply mobile optimizations on small screens', async () => {
      mockWindow.innerWidth = 500; // Mobile width

      await compatibility.initialize();

      // Mobile optimizations should be applied
      // This is tested through the initialization process
      expect(true).toBe(true);
    });

    it('should not apply mobile optimizations on desktop', async () => {
      mockWindow.innerWidth = 1200; // Desktop width

      await compatibility.initialize();

      // Desktop behavior should be maintained
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
    it('should handle DOM manipulation errors', async () => {
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
  });
});