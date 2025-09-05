import { LazyComponentLoader } from '../../src/core/LazyComponentLoader';

// Mock dynamic imports
const mockComponents = {
  'QuickActionSidebar': {
    default: class MockQuickActionSidebar {
      render() { return document.createElement('div'); }
      destroy() {}
      update() {}
    }
  },
  'FloatingChatBar': {
    default: class MockFloatingChatBar {
      render() { return document.createElement('div'); }
      destroy() {}
      update() {}
    }
  },
  'ImageHighlighter': {
    default: class MockImageHighlighter {
      render() { return document.createElement('div'); }
      destroy() {}
      update() {}
    }
  }
};

// Mock dynamic import function
const mockImport = jest.fn();
global.import = mockImport as any;

describe('LazyComponentLoader', () => {
  let loader: LazyComponentLoader;

  beforeEach(() => {
    loader = new LazyComponentLoader();
    mockImport.mockClear();
  });

  describe('Component Loading', () => {
    it('should load component on first request', async () => {
      mockImport.mockResolvedValue(mockComponents.QuickActionSidebar);

      const ComponentClass = await loader.loadComponent('QuickActionSidebar');
      
      expect(mockImport).toHaveBeenCalledWith('../core/QuickActionSidebar');
      expect(ComponentClass).toBe(mockComponents.QuickActionSidebar.default);
    });

    it('should cache loaded components', async () => {
      mockImport.mockResolvedValue(mockComponents.QuickActionSidebar);

      // Load component twice
      const ComponentClass1 = await loader.loadComponent('QuickActionSidebar');
      const ComponentClass2 = await loader.loadComponent('QuickActionSidebar');
      
      // Import should only be called once
      expect(mockImport).toHaveBeenCalledTimes(1);
      expect(ComponentClass1).toBe(ComponentClass2);
    });

    it('should handle loading errors gracefully', async () => {
      const loadError = new Error('Failed to load component');
      mockImport.mockRejectedValue(loadError);

      await expect(loader.loadComponent('NonExistentComponent'))
        .rejects.toThrow('Failed to load component NonExistentComponent: Failed to load component');
    });

    it('should load multiple components concurrently', async () => {
      mockImport
        .mockResolvedValueOnce(mockComponents.QuickActionSidebar)
        .mockResolvedValueOnce(mockComponents.FloatingChatBar)
        .mockResolvedValueOnce(mockComponents.ImageHighlighter);

      const loadPromises = [
        loader.loadComponent('QuickActionSidebar'),
        loader.loadComponent('FloatingChatBar'),
        loader.loadComponent('ImageHighlighter')
      ];

      const components = await Promise.all(loadPromises);
      
      expect(components).toHaveLength(3);
      expect(mockImport).toHaveBeenCalledTimes(3);
    });
  });

  describe('Component Instantiation', () => {
    it('should create component instance with props', async () => {
      mockImport.mockResolvedValue(mockComponents.QuickActionSidebar);

      const props = { visible: true, actions: [] };
      const instance = await loader.createComponent('QuickActionSidebar', props);
      
      expect(instance).toBeInstanceOf(mockComponents.QuickActionSidebar.default);
    });

    it('should handle instantiation errors', async () => {
      const FailingComponent = {
        default: class {
          constructor() {
            throw new Error('Constructor failed');
          }
        }
      };
      
      mockImport.mockResolvedValue(FailingComponent);

      await expect(loader.createComponent('FailingComponent', {}))
        .rejects.toThrow('Failed to create component FailingComponent: Constructor failed');
    });
  });

  describe('Preloading', () => {
    it('should preload specified components', async () => {
      mockImport
        .mockResolvedValueOnce(mockComponents.QuickActionSidebar)
        .mockResolvedValueOnce(mockComponents.FloatingChatBar);

      await loader.preloadComponents(['QuickActionSidebar', 'FloatingChatBar']);
      
      expect(mockImport).toHaveBeenCalledTimes(2);
      expect(mockImport).toHaveBeenCalledWith('../core/QuickActionSidebar');
      expect(mockImport).toHaveBeenCalledWith('../core/FloatingChatBar');
    });

    it('should not preload already loaded components', async () => {
      mockImport.mockResolvedValue(mockComponents.QuickActionSidebar);

      // Load component first
      await loader.loadComponent('QuickActionSidebar');
      mockImport.mockClear();

      // Preload should not call import again
      await loader.preloadComponents(['QuickActionSidebar']);
      
      expect(mockImport).not.toHaveBeenCalled();
    });

    it('should handle preload errors gracefully', async () => {
      mockImport
        .mockResolvedValueOnce(mockComponents.QuickActionSidebar)
        .mockRejectedValueOnce(new Error('Load failed'));

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await loader.preloadComponents(['QuickActionSidebar', 'FailingComponent']);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to preload component FailingComponent:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Component Registry', () => {
    it('should return list of loaded components', async () => {
      mockImport
        .mockResolvedValueOnce(mockComponents.QuickActionSidebar)
        .mockResolvedValueOnce(mockComponents.FloatingChatBar);

      await loader.loadComponent('QuickActionSidebar');
      await loader.loadComponent('FloatingChatBar');
      
      const loadedComponents = loader.getLoadedComponents();
      expect(loadedComponents).toEqual(['QuickActionSidebar', 'FloatingChatBar']);
    });

    it('should check if component is loaded', async () => {
      mockImport.mockResolvedValue(mockComponents.QuickActionSidebar);

      expect(loader.isComponentLoaded('QuickActionSidebar')).toBe(false);
      
      await loader.loadComponent('QuickActionSidebar');
      
      expect(loader.isComponentLoaded('QuickActionSidebar')).toBe(true);
    });
  });

  describe('Memory Management', () => {
    it('should clear component cache', async () => {
      mockImport.mockResolvedValue(mockComponents.QuickActionSidebar);

      await loader.loadComponent('QuickActionSidebar');
      expect(loader.isComponentLoaded('QuickActionSidebar')).toBe(true);
      
      loader.clearCache();
      
      expect(loader.isComponentLoaded('QuickActionSidebar')).toBe(false);
      expect(loader.getLoadedComponents()).toEqual([]);
    });

    it('should clear specific component from cache', async () => {
      mockImport
        .mockResolvedValueOnce(mockComponents.QuickActionSidebar)
        .mockResolvedValueOnce(mockComponents.FloatingChatBar);

      await loader.loadComponent('QuickActionSidebar');
      await loader.loadComponent('FloatingChatBar');
      
      loader.clearComponent('QuickActionSidebar');
      
      expect(loader.isComponentLoaded('QuickActionSidebar')).toBe(false);
      expect(loader.isComponentLoaded('FloatingChatBar')).toBe(true);
    });
  });

  describe('Loading States', () => {
    it('should track loading state', async () => {
      let resolveImport: (value: any) => void;
      const importPromise = new Promise(resolve => {
        resolveImport = resolve;
      });
      mockImport.mockReturnValue(importPromise);

      const loadPromise = loader.loadComponent('QuickActionSidebar');
      
      expect(loader.isComponentLoading('QuickActionSidebar')).toBe(true);
      
      resolveImport!(mockComponents.QuickActionSidebar);
      await loadPromise;
      
      expect(loader.isComponentLoading('QuickActionSidebar')).toBe(false);
    });

    it('should handle concurrent loading requests', async () => {
      let resolveImport: (value: any) => void;
      const importPromise = new Promise(resolve => {
        resolveImport = resolve;
      });
      mockImport.mockReturnValue(importPromise);

      const loadPromise1 = loader.loadComponent('QuickActionSidebar');
      const loadPromise2 = loader.loadComponent('QuickActionSidebar');
      
      resolveImport!(mockComponents.QuickActionSidebar);
      
      const [component1, component2] = await Promise.all([loadPromise1, loadPromise2]);
      
      expect(component1).toBe(component2);
      expect(mockImport).toHaveBeenCalledTimes(1);
    });
  });
});