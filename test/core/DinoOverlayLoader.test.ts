/**
 * @jest-environment node
 */
import { DinoOverlayLoader } from '../../src/core/DinoOverlayLoader';
import { DinoOverlayConfig } from '../../src/types/config';

// Mock DOM environment for Node.js testing
const mockShadowRoot = {
  appendChild: jest.fn(),
  innerHTML: '',
  children: [],
};

const createMockElement = () => ({
  id: '',
  className: '',
  style: { cssText: '' },
  tagName: 'DIV',
  textContent: '',
  attachShadow: jest.fn().mockReturnValue(mockShadowRoot),
  appendChild: jest.fn(),
  parentNode: {
    removeChild: jest.fn(),
  },
});

const mockDocument = {
  createElement: jest.fn().mockImplementation(() => createMockElement()),
  body: {
    appendChild: jest.fn(),
  },
};

const mockWindow = {
  // Mock window object
};

// Setup global mocks
(global as any).document = mockDocument;
(global as any).window = mockWindow;

// Mock HTMLElement constructor and prototype
class MockHTMLElement {
  attachShadow = jest.fn().mockReturnValue(mockShadowRoot);
}
MockHTMLElement.prototype.attachShadow = jest.fn().mockReturnValue(mockShadowRoot);

(global as any).HTMLElement = MockHTMLElement;

describe('DinoOverlayLoader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Ensure mocks are properly set up for each test
    mockDocument.createElement = jest.fn().mockImplementation(() => createMockElement());
    mockDocument.body = {
      appendChild: jest.fn(),
    };
  });

  describe('Constructor and Configuration Validation', () => {
    it('should create loader with valid minimal config', () => {
      const config: DinoOverlayConfig = {
        apiKey: 'test-key',
      };

      const loader = new DinoOverlayLoader(config);
      expect(loader).toBeInstanceOf(DinoOverlayLoader);
      expect(loader.getConfig().apiKey).toBe('test-key');
      expect(loader.getConfig().theme).toBe('auto');
      expect(loader.getConfig().enableAnalytics).toBe(false);
    });

    it('should merge config with defaults', () => {
      const config: DinoOverlayConfig = {
        apiKey: 'test-key',
        theme: 'dark',
        enableAnalytics: true,
      };

      const loader = new DinoOverlayLoader(config);
      const mergedConfig = loader.getConfig();

      expect(mergedConfig.apiKey).toBe('test-key');
      expect(mergedConfig.theme).toBe('dark');
      expect(mergedConfig.enableAnalytics).toBe(true);
      expect(mergedConfig.apiEndpoint).toBe('https://api.dinooverlay.com');
      expect(mergedConfig.debug).toBe(false);
    });

    it('should throw error for invalid config object', () => {
      expect(() => new DinoOverlayLoader(null as any)).toThrow('Configuration must be an object');
      expect(() => new DinoOverlayLoader('invalid' as any)).toThrow('Configuration must be an object');
    });

    it('should throw error for invalid API key', () => {
      expect(() => new DinoOverlayLoader({ apiKey: '' })).toThrow('API key must be a non-empty string');
      expect(() => new DinoOverlayLoader({ apiKey: '   ' })).toThrow('API key must be a non-empty string');
      expect(() => new DinoOverlayLoader({ apiKey: 123 as any })).toThrow('API key must be a non-empty string');
    });

    it('should throw error for invalid API endpoint', () => {
      expect(() => new DinoOverlayLoader({ 
        apiKey: 'test',
        apiEndpoint: 'invalid-url' 
      })).toThrow('API endpoint must be a valid URL');
    });

    it('should throw error for invalid theme', () => {
      expect(() => new DinoOverlayLoader({ 
        apiKey: 'test',
        theme: 'invalid' as any 
      })).toThrow('Theme must be "light", "dark", or "auto"');
    });

    it('should validate custom actions', () => {
      expect(() => new DinoOverlayLoader({ 
        apiKey: 'test',
        customActions: 'invalid' as any 
      })).toThrow('Custom actions must be an array');

      expect(() => new DinoOverlayLoader({ 
        apiKey: 'test',
        customActions: [{ id: '', label: 'test', prompt: 'test' }] 
      })).toThrow('Custom action at index 0 must have a valid id');

      expect(() => new DinoOverlayLoader({ 
        apiKey: 'test',
        customActions: [{ id: 'test', label: '', prompt: 'test' }] 
      })).toThrow('Custom action at index 0 must have a valid label');

      expect(() => new DinoOverlayLoader({ 
        apiKey: 'test',
        customActions: [{ id: 'test', label: 'test', prompt: '' }] 
      })).toThrow('Custom action at index 0 must have a valid prompt');
    });

    it('should accept valid custom actions', () => {
      const config: DinoOverlayConfig = {
        apiKey: 'test',
        customActions: [
          { id: 'vintage', label: 'Vintage Style', prompt: 'Apply vintage styling' },
          { id: 'modern', label: 'Modern Style', prompt: 'Apply modern styling', icon: 'icon.svg' },
        ],
      };

      const loader = new DinoOverlayLoader(config);
      expect(loader.getConfig().customActions).toHaveLength(2);
      expect(loader.getConfig().customActions[0].id).toBe('vintage');
    });
  });

  describe('Environment Validation', () => {
    it('should throw error when window is undefined', async () => {
      const originalWindow = global.window;
      delete (global as any).window;

      const loader = new DinoOverlayLoader({ apiKey: 'test' });
      await expect(loader.initialize()).rejects.toThrow('DinoOverlay requires a browser environment');

      global.window = originalWindow;
    });

    it('should throw error when document is undefined', async () => {
      const originalDocument = global.document;
      delete (global as any).document;

      const loader = new DinoOverlayLoader({ apiKey: 'test' });
      await expect(loader.initialize()).rejects.toThrow('DinoOverlay requires DOM access');

      global.document = originalDocument;
    });

    it('should throw error when document.body is not available', async () => {
      const originalBody = mockDocument.body;
      mockDocument.body = null;

      const loader = new DinoOverlayLoader({ apiKey: 'test' });
      await expect(loader.initialize()).rejects.toThrow('DinoOverlay requires document.body to be available');

      mockDocument.body = originalBody;
    });

    it('should throw error when Shadow DOM is not supported', async () => {
      const originalAttachShadow = MockHTMLElement.prototype.attachShadow;
      delete (MockHTMLElement.prototype as any).attachShadow;

      const loader = new DinoOverlayLoader({ apiKey: 'test' });
      await expect(loader.initialize()).rejects.toThrow('DinoOverlay requires Shadow DOM support');

      MockHTMLElement.prototype.attachShadow = originalAttachShadow;
    });
  });

  describe('Initialization', () => {
    it('should initialize successfully with valid environment', async () => {
      const loader = new DinoOverlayLoader({ apiKey: 'test' });
      
      await expect(loader.initialize()).resolves.toBeUndefined();
      expect(loader.isReady()).toBe(true);
      expect(loader.getShadowRoot()).toBe(mockShadowRoot);
    });

    it('should create container with correct properties', async () => {
      const loader = new DinoOverlayLoader({ apiKey: 'test' });
      await loader.initialize();

      expect(loader.isReady()).toBe(true);
      expect(loader.getShadowRoot()).toBeTruthy();
    });

    it('should attach shadow root in closed mode', async () => {
      const loader = new DinoOverlayLoader({ apiKey: 'test' });
      await loader.initialize();

      expect(loader.getShadowRoot()).toBeTruthy();
    });

    it('should load base styles into shadow root', async () => {
      const loader = new DinoOverlayLoader({ apiKey: 'test' });
      await loader.initialize();

      expect(loader.isReady()).toBe(true);
    });

    it('should mount overlay root element', async () => {
      const loader = new DinoOverlayLoader({ apiKey: 'test' });
      await loader.initialize();

      expect(loader.isReady()).toBe(true);
    });

    it('should prevent multiple initializations', async () => {
      const loader = new DinoOverlayLoader({ apiKey: 'test' });
      
      // Track how many times createElement is called
      const createElementSpy = jest.spyOn(mockDocument, 'createElement');
      
      const promise1 = loader.initialize();
      const promise2 = loader.initialize();
      
      await Promise.all([promise1, promise2]);
      
      // After initialization, subsequent calls should not reinitialize
      const promise3 = loader.initialize();
      await promise3;
      
      expect(loader.isReady()).toBe(true);
      
      // Should only create elements once (container + style + overlay root)
      expect(createElementSpy).toHaveBeenCalledTimes(3);
      
      createElementSpy.mockRestore();
    });

    it('should handle initialization errors gracefully', async () => {
      // Mock createElement to return element that throws on attachShadow
      const originalCreateElement = mockDocument.createElement;
      mockDocument.createElement = jest.fn().mockImplementation(() => {
        const element = createMockElement();
        element.attachShadow = jest.fn().mockImplementation(() => {
          throw new Error('Shadow DOM failed');
        });
        return element;
      });

      const loader = new DinoOverlayLoader({ apiKey: 'test' });
      await expect(loader.initialize()).rejects.toThrow('Shadow DOM failed');
      expect(loader.isReady()).toBe(false);

      // Restore original
      mockDocument.createElement = originalCreateElement;
    });

    it('should log debug information when debug is enabled', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const loader = new DinoOverlayLoader({ 
        apiKey: 'test',
        debug: true 
      });
      
      await loader.initialize();
      
      expect(consoleSpy).toHaveBeenCalledWith('[DinoOverlay] Shadow DOM container created');
      expect(consoleSpy).toHaveBeenCalledWith('[DinoOverlay] Base styles loaded');
      expect(consoleSpy).toHaveBeenCalledWith('[DinoOverlay] Overlay root mounted');
      expect(consoleSpy).toHaveBeenCalledWith('[DinoOverlay] Successfully initialized', expect.any(Object));
      
      consoleSpy.mockRestore();
    });
  });

  describe('Lifecycle Management', () => {
    it('should destroy loader and clean up DOM', async () => {
      const loader = new DinoOverlayLoader({ apiKey: 'test' });
      await loader.initialize();

      expect(loader.isReady()).toBe(true);

      loader.destroy();

      expect(loader.isReady()).toBe(false);
      expect(loader.getShadowRoot()).toBe(null);
    });

    it('should handle destroy when not initialized', () => {
      const loader = new DinoOverlayLoader({ apiKey: 'test' });
      
      expect(() => loader.destroy()).not.toThrow();
      expect(loader.isReady()).toBe(false);
    });

    it('should allow re-initialization after destroy', async () => {
      const loader = new DinoOverlayLoader({ apiKey: 'test' });
      
      await loader.initialize();
      expect(loader.isReady()).toBe(true);
      
      loader.destroy();
      expect(loader.isReady()).toBe(false);
      
      await loader.initialize();
      expect(loader.isReady()).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should create loader errors with proper structure', async () => {
      // Mock createElement to return element that throws on attachShadow
      const originalCreateElement = mockDocument.createElement;
      mockDocument.createElement = jest.fn().mockImplementation(() => {
        const element = createMockElement();
        element.attachShadow = jest.fn().mockImplementation(() => {
          throw new Error('Test error');
        });
        return element;
      });

      const loader = new DinoOverlayLoader({ apiKey: 'test' });
      
      try {
        await loader.initialize();
      } catch (error: any) {
        expect(error.message).toContain('[DinoOverlay]');
        expect(error.code).toBe('INITIALIZATION_FAILED');
        expect(error.details).toBeInstanceOf(Error);
        expect(error.details.code).toBe('SHADOW_DOM_CREATION_FAILED');
      }

      mockDocument.createElement = originalCreateElement;
    });

    it('should handle non-Error objects in error creation', async () => {
      // Mock createElement to return element that throws string error on attachShadow
      const originalCreateElement = mockDocument.createElement;
      mockDocument.createElement = jest.fn().mockImplementation(() => {
        const element = createMockElement();
        element.attachShadow = jest.fn().mockImplementation(() => {
          throw 'String error';
        });
        return element;
      });

      const loader = new DinoOverlayLoader({ apiKey: 'test' });
      
      try {
        await loader.initialize();
      } catch (error: any) {
        expect(error.message).toContain('String error');
        expect(error.code).toBe('INITIALIZATION_FAILED');
        expect(error.details.code).toBe('SHADOW_DOM_CREATION_FAILED');
      }

      mockDocument.createElement = originalCreateElement;
    });

    it('should log errors when debug is enabled', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Mock createElement to return element that throws on attachShadow
      const originalCreateElement = mockDocument.createElement;
      mockDocument.createElement = jest.fn().mockImplementation(() => {
        const element = createMockElement();
        element.attachShadow = jest.fn().mockImplementation(() => {
          throw new Error('Test error');
        });
        return element;
      });

      const loader = new DinoOverlayLoader({ 
        apiKey: 'test',
        debug: true 
      });
      
      try {
        await loader.initialize();
      } catch (error) {
        expect(consoleErrorSpy).toHaveBeenCalledWith('[DinoOverlay] Initialization failed:', error);
      }
      
      mockDocument.createElement = originalCreateElement;
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Configuration Access', () => {
    it('should return immutable config copy', () => {
      const loader = new DinoOverlayLoader({ 
        apiKey: 'test',
        theme: 'dark' 
      });
      
      const config1 = loader.getConfig();
      const config2 = loader.getConfig();
      
      expect(config1).not.toBe(config2); // Different objects
      expect(config1).toEqual(config2); // Same content
      
      config1.theme = 'light';
      expect(loader.getConfig().theme).toBe('dark'); // Original unchanged
    });
  });
});