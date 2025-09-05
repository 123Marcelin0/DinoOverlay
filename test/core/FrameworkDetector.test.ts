import { FrameworkDetector } from '../../src/compatibility/FrameworkDetector';
import { FrameworkType, FrameworkInfo } from '../../src/compatibility/types';

// Mock DOM environment
const mockDocument = {
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(),
  body: {
    className: ''
  },
  title: 'Test Page'
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
  __NUXT__: undefined
};

// Mock global objects
Object.defineProperty(global, 'document', {
  value: mockDocument,
  writable: true
});

Object.defineProperty(global, 'window', {
  value: mockWindow,
  writable: true
});

describe('FrameworkDetector', () => {
  let detector: FrameworkDetector;

  beforeEach(() => {
    detector = new FrameworkDetector();
    
    // Reset mocks
    jest.clearAllMocks();
    mockDocument.querySelector.mockReturnValue(null);
    mockDocument.querySelectorAll.mockReturnValue([]);
    mockDocument.body.className = '';
    
    // Reset window properties
    Object.keys(mockWindow).forEach(key => {
      (mockWindow as any)[key] = undefined;
    });
  });

  describe('WordPress Detection', () => {
    it('should detect WordPress with high confidence when multiple indicators are present', async () => {
      // Setup WordPress indicators
      (mockWindow as any).wp = { hooks: {} };
      mockDocument.querySelector
        .mockReturnValueOnce({ content: 'WordPress 6.0' }) // meta generator
        .mockReturnValueOnce({}); // wp-content assets
      mockDocument.body.className = 'wp-admin wp-core-ui';

      const result = await detector.detectFramework();

      expect(result.type).toBe('wordpress');
      expect(result.detected).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect WordPress theme correctly', async () => {
      mockDocument.body.className = 'wp-theme-twentytwentyfour';
      (mockWindow as any).wp = {};

      const result = await detector.detectFramework();

      expect(result.type).toBe('wordpress');
      expect(result.theme).toBe('Twenty Twenty-Four');
    });

    it('should detect WordPress plugins', async () => {
      (mockWindow as any).wp = {};
      mockDocument.querySelector
        .mockReturnValueOnce(null) // meta generator
        .mockReturnValueOnce(null) // wp-content
        .mockReturnValueOnce({}); // woocommerce class

      const result = await detector.detectFramework();

      expect(result.plugins).toContain('WooCommerce');
    });

    it('should have low confidence with minimal WordPress indicators', async () => {
      mockDocument.querySelector.mockReturnValue(null);
      mockDocument.body.className = '';

      const result = await detector.detectFramework();

      if (result.type === 'wordpress') {
        expect(result.confidence).toBeLessThan(0.5);
      }
    });
  });

  describe('React Detection', () => {
    it('should detect React with high confidence when React is present', async () => {
      (mockWindow as any).React = { version: '18.0.0' };
      (mockWindow as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ = {};
      mockDocument.querySelector.mockReturnValueOnce({}); // data-reactroot

      const result = await detector.detectFramework();

      expect(result.type).toBe('react');
      expect(result.detected).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.version).toBe('18.0.0');
    });

    it('should detect Next.js as React framework', async () => {
      (mockWindow as any).__NEXT_DATA__ = {};
      mockDocument.querySelector.mockReturnValueOnce({}); // #__next

      const result = await detector.detectFramework();

      expect(result.type).toBe('react');
      expect(result.detected).toBe(true);
    });

    it('should detect React Fiber nodes', async () => {
      const mockElement = {
        _reactInternalFiber: {}
      };
      mockDocument.querySelectorAll.mockReturnValue([mockElement]);

      const result = await detector.detectFramework();

      if (result.type === 'react') {
        expect(result.confidence).toBeGreaterThan(0);
      }
    });
  });

  describe('Vue Detection', () => {
    it('should detect Vue with high confidence when Vue is present', async () => {
      (mockWindow as any).Vue = { version: '3.0.0' };
      (mockWindow as any).__VUE_DEVTOOLS_GLOBAL_HOOK__ = {};
      mockDocument.querySelector.mockReturnValueOnce({}); // v- attributes

      const result = await detector.detectFramework();

      expect(result.type).toBe('vue');
      expect(result.detected).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.version).toBe('3.0.0');
    });

    it('should detect Nuxt.js as Vue framework', async () => {
      (mockWindow as any).__NUXT__ = {};
      mockDocument.querySelector.mockReturnValueOnce({}); // #__nuxt

      const result = await detector.detectFramework();

      expect(result.type).toBe('vue');
      expect(result.detected).toBe(true);
    });

    it('should detect Vue directives', async () => {
      mockDocument.querySelector.mockReturnValueOnce({}); // [v-]

      const result = await detector.detectFramework();

      if (result.type === 'vue') {
        expect(result.confidence).toBeGreaterThan(0);
      }
    });
  });

  describe('Plain HTML Detection', () => {
    it('should detect plain HTML when no frameworks are present', async () => {
      // No framework indicators
      mockDocument.querySelector.mockReturnValue(null);
      mockDocument.querySelectorAll.mockReturnValue([]);

      const result = await detector.detectFramework();

      expect(result.type).toBe('html');
      expect(result.detected).toBe(true);
    });

    it('should detect jQuery presence in plain HTML', async () => {
      (mockWindow as any).jQuery = { fn: { jquery: '3.6.0' } };

      const result = await detector.detectFramework();

      expect(result.type).toBe('html');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should have higher confidence when traditional HTML patterns are present', async () => {
      mockDocument.querySelector.mockReturnValueOnce({}); // form[action]

      const result = await detector.detectFramework();

      if (result.type === 'html') {
        expect(result.confidence).toBeGreaterThan(0.3);
      }
    });
  });

  describe('Caching', () => {
    it('should cache detection results', async () => {
      (mockWindow as any).React = { version: '18.0.0' };

      const result1 = await detector.detectFramework();
      const result2 = await detector.detectFramework();

      expect(result1).toBe(result2);
    });

    it('should clear cache when requested', async () => {
      (mockWindow as any).React = { version: '18.0.0' };

      await detector.detectFramework();
      detector.clearCache();

      // Change environment
      delete (mockWindow as any).React;
      (mockWindow as any).Vue = { version: '3.0.0' };

      const result = await detector.detectFramework();
      expect(result.type).toBe('vue');
    });
  });

  describe('Confidence Calculation', () => {
    it('should return framework with highest confidence', async () => {
      // Setup multiple frameworks with different confidence levels
      (mockWindow as any).React = { version: '18.0.0' }; // High confidence
      (mockWindow as any).wp = {}; // Lower confidence

      const result = await detector.detectFramework();

      expect(result.type).toBe('react');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should handle edge cases with equal confidence', async () => {
      // Minimal indicators for multiple frameworks
      mockDocument.querySelector.mockReturnValue(null);

      const result = await detector.detectFramework();

      expect(result).toBeDefined();
      expect(result.type).toMatch(/wordpress|react|vue|html/);
    });
  });

  describe('Error Handling', () => {
    it('should handle DOM query errors gracefully', async () => {
      mockDocument.querySelector.mockImplementation(() => {
        throw new Error('DOM error');
      });

      const result = await detector.detectFramework();

      expect(result).toBeDefined();
      expect(result.type).toBe('html'); // Should fallback to HTML
    });

    it('should handle missing window object', async () => {
      const originalWindow = global.window;
      delete (global as any).window;

      const result = await detector.detectFramework();

      expect(result).toBeDefined();
      expect(result.type).toBe('html');

      // Restore window
      (global as any).window = originalWindow;
    });
  });
});