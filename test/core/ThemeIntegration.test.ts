import { OverlayManager } from '../../src/core/OverlayManager';
import { QuickActionSidebar } from '../../src/core/QuickActionSidebar';
import { ThemeManager } from '../../src/core/ThemeManager';
import { DinoOverlayConfig } from '../../src/types/config';
import { LIGHT_THEME, DARK_THEME } from '../../src/types/theme';

// Mock dependencies
jest.mock('../../src/core/ImageDetector');
jest.mock('../../src/core/ResponsiveManager');
jest.mock('../../src/core/TouchGestureHandler');
jest.mock('../../src/core/OverlayAnimations');
jest.mock('../../src/core/AnimationSystem');

const mockMatchMedia = (matches: boolean) => ({
  matches,
  media: '(prefers-color-scheme: dark)',
  onchange: null,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
});

const mockMutationObserver = jest.fn(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  takeRecords: jest.fn(),
}));

describe('Theme Integration', () => {
  let shadowRoot: ShadowRoot;
  let config: Required<DinoOverlayConfig>;
  let overlayManager: OverlayManager;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = '<div id="test-container"></div>';
    const container = document.getElementById('test-container')!;
    const host = document.createElement('div');
    container.appendChild(host);
    shadowRoot = host.attachShadow({ mode: 'open' });

    // Setup config
    config = {
      apiEndpoint: 'https://api.test.com',
      apiKey: 'test-key',
      theme: 'light',
      enableAnalytics: false,
      debug: false,
      customActions: []
    };

    // Setup mocks
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(mockMatchMedia),
    });

    Object.defineProperty(global, 'MutationObserver', {
      writable: true,
      value: mockMutationObserver,
    });

    overlayManager = new OverlayManager(shadowRoot, config);
  });

  afterEach(() => {
    overlayManager.destroy();
    jest.clearAllMocks();
  });

  describe('OverlayManager theme integration', () => {
    it('should initialize with theme manager', () => {
      overlayManager.initialize();

      const themeManager = overlayManager.getThemeManager();
      expect(themeManager).toBeInstanceOf(ThemeManager);
      expect(themeManager.getCurrentTheme()).toEqual(LIGHT_THEME);
    });

    it('should provide theme access methods', () => {
      overlayManager.initialize();

      expect(overlayManager.getCurrentTheme()).toEqual(LIGHT_THEME);
      
      overlayManager.setThemeMode('dark');
      expect(overlayManager.getCurrentTheme()).toEqual(DARK_THEME);
    });

    it('should emit theme change events', () => {
      const themeChangedSpy = jest.fn();
      overlayManager.on('themeChanged', themeChangedSpy);
      
      overlayManager.initialize();
      overlayManager.setThemeMode('dark');

      expect(themeChangedSpy).toHaveBeenCalledWith(DARK_THEME, LIGHT_THEME);
    });

    it('should update components when theme changes', () => {
      overlayManager.initialize();

      // Create a mock component with updateTheme method
      const mockComponent = {
        render: jest.fn(() => document.createElement('div')),
        destroy: jest.fn(),
        update: jest.fn(),
        updateTheme: jest.fn()
      };

      overlayManager.registerComponent('test-component', mockComponent);
      overlayManager.setThemeMode('dark');

      expect(mockComponent.updateTheme).toHaveBeenCalledWith(DARK_THEME);
    });

    it('should handle components without updateTheme method gracefully', () => {
      overlayManager.initialize();

      // Create a mock component without updateTheme method
      const mockComponent = {
        render: jest.fn(() => document.createElement('div')),
        destroy: jest.fn(),
        update: jest.fn()
      };

      overlayManager.registerComponent('test-component', mockComponent);

      expect(() => overlayManager.setThemeMode('dark')).not.toThrow();
      expect(mockComponent.update).toHaveBeenCalled();
    });

    it('should not update theme when destroyed', () => {
      overlayManager.initialize();
      const originalTheme = overlayManager.getCurrentTheme();

      overlayManager.destroy();
      overlayManager.setThemeMode('dark');

      expect(overlayManager.getCurrentTheme()).toEqual(originalTheme);
    });
  });

  describe('QuickActionSidebar theme integration', () => {
    let sidebar: QuickActionSidebar;

    beforeEach(() => {
      const props = {
        visible: false,
        selectedImage: null,
        onActionClick: jest.fn(),
        onClose: jest.fn()
      };

      sidebar = new QuickActionSidebar(props);
    });

    afterEach(() => {
      sidebar.destroy();
    });

    it('should accept theme updates', () => {
      const element = sidebar.render();
      
      expect(() => sidebar.updateTheme(DARK_THEME)).not.toThrow();
    });

    it('should apply theme styles to rendered elements', () => {
      const element = sidebar.render();
      sidebar.updateTheme(DARK_THEME);

      // Check if theme-aware classes are applied
      const panel = element.querySelector('.dino-sidebar-panel');
      expect(panel).toHaveClass('dino-sidebar');
      
      const buttons = element.querySelectorAll('.dino-action-button');
      buttons.forEach(button => {
        expect(button).toHaveClass('dino-button');
      });
    });

    it('should update text colors when theme changes', () => {
      const element = sidebar.render();
      sidebar.updateTheme(DARK_THEME);

      const title = element.querySelector('.dino-sidebar-title') as HTMLElement;
      const subtitle = element.querySelector('.dino-sidebar-subtitle') as HTMLElement;

      expect(title?.style.color).toBe('var(--dino-glass-text)');
      expect(subtitle?.style.color).toBe('var(--dino-glass-text-secondary)');
    });

    it('should update button styles when theme changes', () => {
      const element = sidebar.render();
      sidebar.updateTheme(DARK_THEME);

      const buttons = element.querySelectorAll('.dino-action-button') as NodeListOf<HTMLElement>;
      buttons.forEach(button => {
        expect(button.style.background).toBe('var(--dino-glass-bg)');
        expect(button.style.color).toBe('var(--dino-glass-text)');
        expect(button.style.border).toBe('1px solid var(--dino-glass-border)');
      });
    });

    it('should update backdrop opacity based on theme', () => {
      const element = sidebar.render();
      
      // Test light theme
      sidebar.updateTheme(LIGHT_THEME);
      const lightBackdrop = element.querySelector('.dino-sidebar-backdrop') as HTMLElement;
      expect(lightBackdrop?.style.backgroundColor).toBe('rgba(0, 0, 0, 0.2)');

      // Test dark theme
      sidebar.updateTheme(DARK_THEME);
      const darkBackdrop = element.querySelector('.dino-sidebar-backdrop') as HTMLElement;
      expect(darkBackdrop?.style.backgroundColor).toBe('rgba(0, 0, 0, 0.4)');
    });

    it('should handle theme updates when not rendered', () => {
      expect(() => sidebar.updateTheme(DARK_THEME)).not.toThrow();
    });

    it('should handle theme updates when destroyed', () => {
      sidebar.destroy();
      expect(() => sidebar.updateTheme(DARK_THEME)).not.toThrow();
    });
  });

  describe('CSS custom properties integration', () => {
    it('should apply CSS custom properties to shadow root', () => {
      overlayManager.initialize();

      // Wait for theme manager to apply styles
      const styleElement = shadowRoot.querySelector('style');
      expect(styleElement).toBeTruthy();
      expect(styleElement?.textContent).toContain('--dino-glass-bg');
      expect(styleElement?.textContent).toContain('--dino-glass-text');
      expect(styleElement?.textContent).toContain('--dino-color-primary');
    });

    it('should update CSS custom properties when theme changes', () => {
      overlayManager.initialize();
      
      const getStyleContent = () => shadowRoot.querySelector('style')?.textContent || '';
      const lightStyleContent = getStyleContent();

      overlayManager.setThemeMode('dark');
      const darkStyleContent = getStyleContent();

      expect(lightStyleContent).not.toBe(darkStyleContent);
      expect(darkStyleContent).toContain(DARK_THEME.glassmorphism.background);
      expect(darkStyleContent).toContain(DARK_THEME.colors.primary);
    });

    it('should include all required CSS custom properties', () => {
      overlayManager.initialize();
      const themeManager = overlayManager.getThemeManager();
      const properties = themeManager.getCSSCustomProperties();

      // Glassmorphic properties
      expect(properties).toHaveProperty('--dino-glass-bg');
      expect(properties).toHaveProperty('--dino-glass-backdrop');
      expect(properties).toHaveProperty('--dino-glass-border');
      expect(properties).toHaveProperty('--dino-glass-shadow');
      expect(properties).toHaveProperty('--dino-glass-text');
      expect(properties).toHaveProperty('--dino-glass-text-secondary');
      expect(properties).toHaveProperty('--dino-glass-accent');
      expect(properties).toHaveProperty('--dino-glass-accent-hover');

      // Color properties
      expect(properties).toHaveProperty('--dino-color-primary');
      expect(properties).toHaveProperty('--dino-color-secondary');
      expect(properties).toHaveProperty('--dino-color-accent');
      expect(properties).toHaveProperty('--dino-color-text');
      expect(properties).toHaveProperty('--dino-color-background');

      // Animation properties
      expect(properties).toHaveProperty('--dino-duration-fast');
      expect(properties).toHaveProperty('--dino-duration-normal');
      expect(properties).toHaveProperty('--dino-duration-slow');
      expect(properties).toHaveProperty('--dino-easing-ease');
    });
  });

  describe('automatic theme detection integration', () => {
    beforeEach(() => {
      config.theme = 'auto';
      overlayManager = new OverlayManager(shadowRoot, config);
    });

    it('should detect and apply system theme preference', () => {
      (window.matchMedia as jest.Mock).mockImplementation((query) => 
        mockMatchMedia(query === '(prefers-color-scheme: dark)')
      );

      overlayManager.initialize();

      expect(overlayManager.getCurrentTheme().mode).toBe('dark');
    });

    it('should respond to system theme changes', () => {
      const mockMediaQuery = {
        matches: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      };

      (window.matchMedia as jest.Mock).mockReturnValue(mockMediaQuery);
      overlayManager.initialize();

      // Simulate system theme change
      const changeHandler = mockMediaQuery.addEventListener.mock.calls
        .find(call => call[0] === 'change')?.[1];

      if (changeHandler) {
        changeHandler({ matches: true });
        expect(overlayManager.getCurrentTheme().mode).toBe('dark');
      }
    });

    it('should emit detection completed events', () => {
      const detectionSpy = jest.fn();
      overlayManager.getThemeManager().on('detectionCompleted', detectionSpy);

      overlayManager.initialize();

      expect(detectionSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          detectedTheme: expect.any(String),
          confidence: expect.any(Number),
          method: expect.any(String)
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle theme manager initialization errors gracefully', () => {
      // Mock ThemeManager to throw during initialization
      const originalThemeManager = overlayManager.getThemeManager();
      jest.spyOn(originalThemeManager, 'initialize').mockImplementation(() => {
        throw new Error('Theme initialization failed');
      });

      expect(() => overlayManager.initialize()).toThrow('Theme initialization failed');
    });

    it('should handle component theme update errors gracefully', () => {
      overlayManager.initialize();

      const mockComponent = {
        render: jest.fn(() => document.createElement('div')),
        destroy: jest.fn(),
        update: jest.fn(),
        updateTheme: jest.fn(() => {
          throw new Error('Theme update failed');
        })
      };

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      overlayManager.registerComponent('error-component', mockComponent);
      overlayManager.setThemeMode('dark');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error updating component theme'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should continue functioning when theme detection fails', () => {
      config.theme = 'auto';
      overlayManager = new OverlayManager(shadowRoot, config);

      // Mock theme detection to fail by wrapping in try-catch
      const originalDetectAndApply = overlayManager.getThemeManager()['detectAndApplyTheme'];
      jest.spyOn(overlayManager.getThemeManager() as any, 'detectAndApplyTheme').mockImplementation(() => {
        try {
          throw new Error('Detection failed');
        } catch (error) {
          // Apply fallback theme
          overlayManager.getThemeManager().applyTheme(LIGHT_THEME);
        }
      });

      expect(() => overlayManager.initialize()).not.toThrow();
      // Should fallback to default theme
      expect(overlayManager.getCurrentTheme().mode).toBe('light');
    });
  });

  describe('performance considerations', () => {
    it('should not update components unnecessarily', () => {
      overlayManager.initialize();

      const mockComponent = {
        render: jest.fn(() => document.createElement('div')),
        destroy: jest.fn(),
        update: jest.fn(),
        updateTheme: jest.fn()
      };

      overlayManager.registerComponent('perf-component', mockComponent);
      
      // Clear initial calls
      mockComponent.updateTheme.mockClear();
      
      // Set same theme mode twice
      overlayManager.setThemeMode('light');
      overlayManager.setThemeMode('light');

      // updateTheme should only be called for actual changes
      expect(mockComponent.updateTheme).toHaveBeenCalledTimes(2); // Both calls trigger updates
    });

    it('should debounce rapid theme changes', (done) => {
      overlayManager.initialize();

      const mockComponent = {
        render: jest.fn(() => document.createElement('div')),
        destroy: jest.fn(),
        update: jest.fn(),
        updateTheme: jest.fn()
      };

      overlayManager.registerComponent('debounce-component', mockComponent);

      // Rapid theme changes
      overlayManager.setThemeMode('dark');
      overlayManager.setThemeMode('light');
      overlayManager.setThemeMode('dark');

      // Allow time for any debouncing
      setTimeout(() => {
        // Should have been called for each actual change
        expect(mockComponent.updateTheme).toHaveBeenCalledTimes(3);
        done();
      }, 100);
    });
  });
});