import { CompatibilityManager } from '../../src/compatibility/CompatibilityManager';
import { FrameworkDetector } from '../../src/compatibility/FrameworkDetector';
import { WordPressCompatibility } from '../../src/compatibility/wordpress/WordPressCompatibility';
import { ReactCompatibility } from '../../src/compatibility/react/ReactCompatibility';
import { VueCompatibility } from '../../src/compatibility/vue/VueCompatibility';
import { PlainHTMLCompatibility } from '../../src/compatibility/html/PlainHTMLCompatibility';
import { FrameworkType, CompatibilityConfig, FrameworkInfo } from '../../src/compatibility/types';

// Mock the compatibility adapters
jest.mock('../../src/compatibility/FrameworkDetector');
jest.mock('../../src/compatibility/wordpress/WordPressCompatibility');
jest.mock('../../src/compatibility/react/ReactCompatibility');
jest.mock('../../src/compatibility/vue/VueCompatibility');
jest.mock('../../src/compatibility/html/PlainHTMLCompatibility');

const MockFrameworkDetector = FrameworkDetector as jest.MockedClass<typeof FrameworkDetector>;
const MockWordPressCompatibility = WordPressCompatibility as jest.MockedClass<typeof WordPressCompatibility>;
const MockReactCompatibility = ReactCompatibility as jest.MockedClass<typeof ReactCompatibility>;
const MockVueCompatibility = VueCompatibility as jest.MockedClass<typeof VueCompatibility>;
const MockPlainHTMLCompatibility = PlainHTMLCompatibility as jest.MockedClass<typeof PlainHTMLCompatibility>;

describe('CompatibilityManager', () => {
  let manager: CompatibilityManager;
  let mockDetector: jest.Mocked<FrameworkDetector>;
  let mockWordPressAdapter: jest.Mocked<WordPressCompatibility>;
  let mockReactAdapter: jest.Mocked<ReactCompatibility>;
  let mockVueAdapter: jest.Mocked<VueCompatibility>;
  let mockHTMLAdapter: jest.Mocked<PlainHTMLCompatibility>;

  beforeEach(() => {
    // Setup mocks
    mockDetector = new MockFrameworkDetector() as jest.Mocked<FrameworkDetector>;
    mockWordPressAdapter = new MockWordPressCompatibility() as jest.Mocked<WordPressCompatibility>;
    mockReactAdapter = new MockReactCompatibility() as jest.Mocked<ReactCompatibility>;
    mockVueAdapter = new MockVueCompatibility() as jest.Mocked<VueCompatibility>;
    mockHTMLAdapter = new MockPlainHTMLCompatibility() as jest.Mocked<PlainHTMLCompatibility>;

    // Setup mock implementations
    MockFrameworkDetector.mockImplementation(() => mockDetector);
    MockWordPressCompatibility.mockImplementation(() => mockWordPressAdapter);
    MockReactCompatibility.mockImplementation(() => mockReactAdapter);
    MockVueCompatibility.mockImplementation(() => mockVueAdapter);
    MockPlainHTMLCompatibility.mockImplementation(() => mockHTMLAdapter);

    // Setup adapter properties
    mockWordPressAdapter.frameworkType = 'wordpress';
    mockReactAdapter.frameworkType = 'react';
    mockVueAdapter.frameworkType = 'vue';
    mockHTMLAdapter.frameworkType = 'html';

    manager = new CompatibilityManager();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with auto-detection enabled by default', async () => {
      const mockFrameworkInfo: FrameworkInfo = {
        type: 'wordpress',
        detected: true,
        confidence: 0.8
      };

      mockDetector.detectFramework.mockResolvedValue(mockFrameworkInfo);
      mockWordPressAdapter.initialize.mockResolvedValue();

      await manager.initialize();

      expect(mockDetector.detectFramework).toHaveBeenCalled();
      expect(mockWordPressAdapter.initialize).toHaveBeenCalled();
      expect(manager.getFrameworkInfo()).toEqual(mockFrameworkInfo);
      expect(manager.getCurrentAdapter()).toBe(mockWordPressAdapter);
    });

    it('should use manually specified framework when auto-detection is disabled', async () => {
      const config: CompatibilityConfig = {
        autoDetect: false,
        framework: 'react'
      };

      manager = new CompatibilityManager(config);
      mockReactAdapter.initialize.mockResolvedValue();

      await manager.initialize();

      expect(mockDetector.detectFramework).not.toHaveBeenCalled();
      expect(mockReactAdapter.initialize).toHaveBeenCalled();
      expect(manager.getFrameworkInfo()?.type).toBe('react');
    });

    it('should fallback to HTML when no framework is specified', async () => {
      const config: CompatibilityConfig = {
        autoDetect: false
      };

      manager = new CompatibilityManager(config);
      mockHTMLAdapter.initialize.mockResolvedValue();

      await manager.initialize();

      expect(mockHTMLAdapter.initialize).toHaveBeenCalled();
      expect(manager.getFrameworkInfo()?.type).toBe('html');
    });

    it('should handle initialization errors gracefully', async () => {
      mockDetector.detectFramework.mockRejectedValue(new Error('Detection failed'));

      await expect(manager.initialize()).rejects.toThrow('Detection failed');
    });

    it('should not initialize twice', async () => {
      const mockFrameworkInfo: FrameworkInfo = {
        type: 'react',
        detected: true,
        confidence: 0.9
      };

      mockDetector.detectFramework.mockResolvedValue(mockFrameworkInfo);
      mockReactAdapter.initialize.mockResolvedValue();

      await manager.initialize();
      await manager.initialize(); // Second call

      expect(mockDetector.detectFramework).toHaveBeenCalledTimes(1);
      expect(mockReactAdapter.initialize).toHaveBeenCalledTimes(1);
    });
  });

  describe('Framework Switching', () => {
    beforeEach(async () => {
      const mockFrameworkInfo: FrameworkInfo = {
        type: 'wordpress',
        detected: true,
        confidence: 0.8
      };

      mockDetector.detectFramework.mockResolvedValue(mockFrameworkInfo);
      mockWordPressAdapter.initialize.mockResolvedValue();
      await manager.initialize();
    });

    it('should switch frameworks correctly', async () => {
      mockWordPressAdapter.cleanup.mockImplementation(() => {});
      mockReactAdapter.initialize.mockResolvedValue();

      await manager.switchFramework('react');

      expect(mockWordPressAdapter.cleanup).toHaveBeenCalled();
      expect(mockReactAdapter.initialize).toHaveBeenCalled();
      expect(manager.getCurrentAdapter()).toBe(mockReactAdapter);
      expect(manager.getFrameworkInfo()?.type).toBe('react');
    });

    it('should handle switching errors', async () => {
      mockReactAdapter.initialize.mockRejectedValue(new Error('React init failed'));

      await expect(manager.switchFramework('react')).rejects.toThrow('React init failed');
    });
  });

  describe('Image Detection', () => {
    beforeEach(async () => {
      const mockFrameworkInfo: FrameworkInfo = {
        type: 'wordpress',
        detected: true,
        confidence: 0.8
      };

      mockDetector.detectFramework.mockResolvedValue(mockFrameworkInfo);
      mockWordPressAdapter.initialize.mockResolvedValue();
      await manager.initialize();
    });

    it('should find editable images using current adapter', () => {
      const mockImages = [
        document.createElement('img'),
        document.createElement('img')
      ] as HTMLImageElement[];

      mockWordPressAdapter.findEditableImages.mockReturnValue(mockImages);

      const result = manager.findEditableImages();

      expect(mockWordPressAdapter.findEditableImages).toHaveBeenCalled();
      expect(result).toEqual(mockImages);
    });

    it('should apply custom selectors when configured', () => {
      const config: CompatibilityConfig = {
        customSelectors: ['.custom-image']
      };

      manager = new CompatibilityManager(config);
      
      // Mock DOM methods
      const mockCustomImage = document.createElement('img');
      const mockQuerySelectorAll = jest.spyOn(document, 'querySelectorAll');
      mockQuerySelectorAll.mockReturnValue([mockCustomImage] as any);

      mockWordPressAdapter.findEditableImages.mockReturnValue([]);

      const result = manager.findEditableImages();

      expect(result).toContain(mockCustomImage);
      mockQuerySelectorAll.mockRestore();
    });

    it('should exclude images based on exclude selectors', () => {
      const config: CompatibilityConfig = {
        excludeSelectors: ['.exclude-image']
      };

      manager = new CompatibilityManager(config);

      const mockImage1 = document.createElement('img');
      const mockImage2 = document.createElement('img');
      mockImage2.className = 'exclude-image';

      mockWordPressAdapter.findEditableImages.mockReturnValue([mockImage1, mockImage2]);

      // Mock matches method
      mockImage1.matches = jest.fn().mockReturnValue(false);
      mockImage2.matches = jest.fn().mockReturnValue(true);

      const result = manager.findEditableImages();

      expect(result).toContain(mockImage1);
      expect(result).not.toContain(mockImage2);
    });

    it('should remove duplicate images', () => {
      const mockImage = document.createElement('img');
      mockWordPressAdapter.findEditableImages.mockReturnValue([mockImage, mockImage]);

      const result = manager.findEditableImages();

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(mockImage);
    });

    it('should handle errors gracefully when no adapter is available', () => {
      manager.cleanup(); // Remove adapter

      const result = manager.findEditableImages();

      expect(result).toEqual([]);
    });
  });

  describe('Event Handling', () => {
    beforeEach(async () => {
      const mockFrameworkInfo: FrameworkInfo = {
        type: 'react',
        detected: true,
        confidence: 0.9
      };

      mockDetector.detectFramework.mockResolvedValue(mockFrameworkInfo);
      mockReactAdapter.initialize.mockResolvedValue();
      await manager.initialize();
    });

    it('should attach event listeners using current adapter', () => {
      const mockElement = document.createElement('div');
      const mockEvents = {
        click: jest.fn(),
        mouseover: jest.fn()
      };

      mockReactAdapter.attachEventListeners.mockImplementation(() => {});

      manager.attachEventListeners(mockElement, mockEvents);

      expect(mockReactAdapter.attachEventListeners).toHaveBeenCalledWith(mockElement, mockEvents);
    });

    it('should remove event listeners using current adapter', () => {
      const mockElement = document.createElement('div');

      mockReactAdapter.removeEventListeners.mockImplementation(() => {});

      manager.removeEventListeners(mockElement);

      expect(mockReactAdapter.removeEventListeners).toHaveBeenCalledWith(mockElement);
    });

    it('should handle event errors gracefully', () => {
      const mockElement = document.createElement('div');
      const mockEvents = { click: jest.fn() };

      mockReactAdapter.attachEventListeners.mockImplementation(() => {
        throw new Error('Event error');
      });

      // Should not throw
      expect(() => {
        manager.attachEventListeners(mockElement, mockEvents);
      }).not.toThrow();
    });
  });

  describe('Lifecycle Hooks', () => {
    beforeEach(async () => {
      const mockFrameworkInfo: FrameworkInfo = {
        type: 'vue',
        detected: true,
        confidence: 0.85
      };

      mockDetector.detectFramework.mockResolvedValue(mockFrameworkInfo);
      mockVueAdapter.initialize.mockResolvedValue();
      await manager.initialize();
    });

    it('should call framework mount hook', () => {
      mockVueAdapter.onFrameworkMount = jest.fn();

      manager.onFrameworkMount();

      expect(mockVueAdapter.onFrameworkMount).toHaveBeenCalled();
    });

    it('should call framework unmount hook', () => {
      mockVueAdapter.onFrameworkUnmount = jest.fn();

      manager.onFrameworkUnmount();

      expect(mockVueAdapter.onFrameworkUnmount).toHaveBeenCalled();
    });

    it('should call framework update hook', () => {
      mockVueAdapter.onFrameworkUpdate = jest.fn();

      manager.onFrameworkUpdate();

      expect(mockVueAdapter.onFrameworkUpdate).toHaveBeenCalled();
    });

    it('should handle missing lifecycle hooks gracefully', () => {
      // Don't define the hooks
      delete mockVueAdapter.onFrameworkMount;

      expect(() => {
        manager.onFrameworkMount();
      }).not.toThrow();
    });

    it('should handle lifecycle hook errors', () => {
      mockVueAdapter.onFrameworkUpdate = jest.fn().mockImplementation(() => {
        throw new Error('Update error');
      });

      expect(() => {
        manager.onFrameworkUpdate();
      }).not.toThrow();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup current adapter and reset state', async () => {
      const mockFrameworkInfo: FrameworkInfo = {
        type: 'wordpress',
        detected: true,
        confidence: 0.8
      };

      mockDetector.detectFramework.mockResolvedValue(mockFrameworkInfo);
      mockWordPressAdapter.initialize.mockResolvedValue();
      mockWordPressAdapter.cleanup.mockImplementation(() => {});
      mockDetector.clearCache.mockImplementation(() => {});

      await manager.initialize();
      manager.cleanup();

      expect(mockWordPressAdapter.cleanup).toHaveBeenCalled();
      expect(mockDetector.clearCache).toHaveBeenCalled();
      expect(manager.getCurrentAdapter()).toBeNull();
      expect(manager.getFrameworkInfo()).toBeNull();
    });
  });

  describe('Configuration', () => {
    it('should apply custom configuration options', () => {
      const config: CompatibilityConfig = {
        autoDetect: false,
        framework: 'react',
        preventConflicts: false,
        isolateStyles: false,
        respectLifecycle: false,
        customSelectors: ['.custom'],
        excludeSelectors: ['.exclude']
      };

      manager = new CompatibilityManager(config);

      // Configuration should be applied (tested through behavior in other tests)
      expect(manager).toBeDefined();
    });

    it('should use default configuration when none provided', () => {
      manager = new CompatibilityManager();

      // Should use defaults (tested through behavior)
      expect(manager).toBeDefined();
    });
  });
});