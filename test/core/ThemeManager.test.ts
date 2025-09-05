import { ThemeManager } from '../../src/core/ThemeManager';
import { DinoOverlayConfig } from '../../src/types/config';
import { LIGHT_THEME, DARK_THEME, ThemeDetectionResult } from '../../src/types/theme';

// Mock window.matchMedia
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

// Mock MutationObserver
const mockMutationObserver = jest.fn(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  takeRecords: jest.fn(),
}));

// Mock getComputedStyle
const mockGetComputedStyle = jest.fn(() => ({
  backgroundColor: 'rgb(255, 255, 255)',
  color: 'rgb(0, 0, 0)',
}));

describe('ThemeManager', () => {
  let shadowRoot: ShadowRoot;
  let config: Required<DinoOverlayConfig>;
  let themeManager: ThemeManager;

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
      theme: 'auto',
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

    Object.defineProperty(window, 'getComputedStyle', {
      writable: true,
      value: mockGetComputedStyle,
    });

    themeManager = new ThemeManager(shadowRoot, config);
  });

  afterEach(() => {
    themeManager.destroy();
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default theme', () => {
      expect(themeManager.getCurrentTheme()).toEqual(LIGHT_THEME);
      expect(themeManager.getMode()).toBe('auto');
    });

    it('should initialize with specified theme mode', () => {
      const darkConfig = { ...config, theme: 'dark' as const };
      const darkThemeManager = new ThemeManager(shadowRoot, darkConfig);
      
      darkThemeManager.initialize();
      
      expect(darkThemeManager.getCurrentTheme()).toEqual(DARK_THEME);
      expect(darkThemeManager.getMode()).toBe('dark');
      
      darkThemeManager.destroy();
    });

    it('should throw error when initializing destroyed manager', () => {
      themeManager.destroy();
      
      expect(() => themeManager.initialize()).toThrow('ThemeManager has been destroyed');
    });
  });

  describe('theme detection', () => {
    it('should detect dark theme from prefers-color-scheme', () => {
      (window.matchMedia as jest.Mock).mockImplementation((query) => 
        mockMatchMedia(query === '(prefers-color-scheme: dark)')
      );

      const result = themeManager.detectHostTheme();

      expect(result).toEqual({
        detectedTheme: 'dark',
        confidence: 0.9,
        method: 'prefers-color-scheme'
      });
    });

    it('should detect light theme from prefers-color-scheme', () => {
      (window.matchMedia as jest.Mock).mockImplementation((query) => 
        mockMatchMedia(query === '(prefers-color-scheme: light)')
      );

      const result = themeManager.detectHostTheme();

      expect(result).toEqual({
        detectedTheme: 'light',
        confidence: 0.9,
        method: 'prefers-color-scheme'
      });
    });

    it('should detect theme from background color', () => {
      (window.matchMedia as jest.Mock).mockImplementation(() => mockMatchMedia(false));
      mockGetComputedStyle.mockReturnValue({
        backgroundColor: 'rgb(30, 30, 30)', // Dark background
        color: 'rgb(255, 255, 255)',
      });

      const result = themeManager.detectHostTheme();

      expect(result.detectedTheme).toBe('dark');
      expect(result.method).toBe('background-color');
      expect(result.confidence).toBe(0.7);
      expect(result.details?.backgroundColor).toBe('rgb(30, 30, 30)');
    });

    it('should detect theme from text color', () => {
      (window.matchMedia as jest.Mock).mockImplementation(() => mockMatchMedia(false));
      mockGetComputedStyle.mockReturnValue({
        backgroundColor: 'transparent',
        color: 'rgb(255, 255, 255)', // Light text (indicates dark theme)
      });

      // Mock document.querySelector to return a body element
      const mockBody = document.createElement('body');
      jest.spyOn(document, 'querySelector').mockReturnValue(mockBody);

      const result = themeManager.detectHostTheme();

      expect(result.detectedTheme).toBe('dark'); // Light text indicates dark theme
      expect(result.method).toBe('computed-style');
    });

    it('should fallback to light theme when detection fails', () => {
      (window.matchMedia as jest.Mock).mockImplementation(() => mockMatchMedia(false));
      mockGetComputedStyle.mockReturnValue({
        backgroundColor: 'transparent',
        color: 'rgba(0, 0, 0, 0)',
      });

      const result = themeManager.detectHostTheme();

      expect(result).toEqual({
        detectedTheme: 'light',
        confidence: 0.1,
        method: 'fallback'
      });
    });
  });

  describe('theme switching', () => {
    beforeEach(() => {
      themeManager.initialize();
    });

    it('should switch to dark mode', () => {
      const themeChangedSpy = jest.fn();
      const modeChangedSpy = jest.fn();
      
      themeManager.on('themeChanged', themeChangedSpy);
      themeManager.on('modeChanged', modeChangedSpy);

      themeManager.setMode('dark');

      expect(themeManager.getMode()).toBe('dark');
      expect(themeManager.getCurrentTheme()).toEqual(DARK_THEME);
      expect(modeChangedSpy).toHaveBeenCalledWith('dark', 'auto');
      expect(themeChangedSpy).toHaveBeenCalled();
    });

    it('should switch to light mode', () => {
      themeManager.setMode('dark');
      const themeChangedSpy = jest.fn();
      const modeChangedSpy = jest.fn();
      
      themeManager.on('themeChanged', themeChangedSpy);
      themeManager.on('modeChanged', modeChangedSpy);

      themeManager.setMode('light');

      expect(themeManager.getMode()).toBe('light');
      expect(themeManager.getCurrentTheme()).toEqual(LIGHT_THEME);
      expect(modeChangedSpy).toHaveBeenCalledWith('light', 'dark');
      expect(themeChangedSpy).toHaveBeenCalled();
    });

    it('should switch to auto mode and detect theme', () => {
      themeManager.setMode('dark');
      
      (window.matchMedia as jest.Mock).mockImplementation((query) => 
        mockMatchMedia(query === '(prefers-color-scheme: light)')
      );

      const detectionSpy = jest.fn();
      themeManager.on('detectionCompleted', detectionSpy);

      themeManager.setMode('auto');

      expect(themeManager.getMode()).toBe('auto');
      expect(themeManager.getCurrentTheme()).toEqual(LIGHT_THEME);
      expect(detectionSpy).toHaveBeenCalled();
    });

    it('should not switch theme when destroyed', () => {
      themeManager.destroy();
      const originalTheme = themeManager.getCurrentTheme();

      themeManager.setMode('dark');

      expect(themeManager.getCurrentTheme()).toEqual(originalTheme);
    });
  });

  describe('CSS custom properties', () => {
    beforeEach(() => {
      themeManager.initialize();
    });

    it('should generate correct CSS custom properties for light theme', () => {
      themeManager.setMode('light');
      const properties = themeManager.getCSSCustomProperties();

      expect(properties['--dino-glass-bg']).toBe(LIGHT_THEME.glassmorphism.background);
      expect(properties['--dino-glass-text']).toBe(LIGHT_THEME.glassmorphism.text);
      expect(properties['--dino-color-primary']).toBe(LIGHT_THEME.colors.primary);
      expect(properties['--dino-duration-fast']).toBe(LIGHT_THEME.animations.duration.fast);
    });

    it('should generate correct CSS custom properties for dark theme', () => {
      themeManager.setMode('dark');
      const properties = themeManager.getCSSCustomProperties();

      expect(properties['--dino-glass-bg']).toBe(DARK_THEME.glassmorphism.background);
      expect(properties['--dino-glass-text']).toBe(DARK_THEME.glassmorphism.text);
      expect(properties['--dino-color-primary']).toBe(DARK_THEME.colors.primary);
      expect(properties['--dino-duration-fast']).toBe(DARK_THEME.animations.duration.fast);
    });

    it('should apply CSS custom properties to shadow root', () => {
      themeManager.initialize();
      themeManager.setMode('light');

      const styleElement = shadowRoot.querySelector('style');
      expect(styleElement).toBeTruthy();
      expect(styleElement?.textContent).toContain('--dino-glass-bg');
      expect(styleElement?.textContent).toContain(LIGHT_THEME.glassmorphism.background);
    });

    it('should update CSS custom properties when theme changes', () => {
      themeManager.initialize();
      themeManager.setMode('light');
      const lightStyleContent = shadowRoot.querySelector('style')?.textContent;

      themeManager.setMode('dark');
      const darkStyleContent = shadowRoot.querySelector('style')?.textContent;

      expect(lightStyleContent).not.toBe(darkStyleContent);
      expect(darkStyleContent).toContain(DARK_THEME.glassmorphism.background);
    });
  });

  describe('color brightness calculation', () => {
    it('should calculate brightness for RGB colors', () => {
      // Access private method through type assertion
      const calculateBrightness = (themeManager as any).calculateColorBrightness.bind(themeManager);

      expect(calculateBrightness('rgb(255, 255, 255)')).toBe(255); // White
      expect(calculateBrightness('rgb(0, 0, 0)')).toBe(0); // Black
      expect(calculateBrightness('rgb(128, 128, 128)')).toBe(128); // Gray
    });

    it('should calculate brightness for hex colors', () => {
      const calculateBrightness = (themeManager as any).calculateColorBrightness.bind(themeManager);

      expect(calculateBrightness('#ffffff')).toBe(255); // White
      expect(calculateBrightness('#000000')).toBe(0); // Black
      expect(calculateBrightness('#808080')).toBe(128); // Gray
    });

    it('should calculate brightness for short hex colors', () => {
      const calculateBrightness = (themeManager as any).calculateColorBrightness.bind(themeManager);

      expect(calculateBrightness('#fff')).toBe(255); // White
      expect(calculateBrightness('#000')).toBe(0); // Black
      expect(calculateBrightness('#888')).toBe(136); // Gray
    });

    it('should return default brightness for invalid colors', () => {
      const calculateBrightness = (themeManager as any).calculateColorBrightness.bind(themeManager);

      expect(calculateBrightness('invalid-color')).toBe(128);
      expect(calculateBrightness('')).toBe(128);
    });
  });

  describe('event handling', () => {
    beforeEach(() => {
      themeManager.initialize();
    });

    it('should emit theme changed event', () => {
      const callback = jest.fn();
      themeManager.on('themeChanged', callback);

      themeManager.setMode('dark');

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ mode: 'dark' }),
        expect.objectContaining({ mode: 'light' })
      );
    });

    it('should emit mode changed event', () => {
      const callback = jest.fn();
      themeManager.on('modeChanged', callback);

      themeManager.setMode('dark');

      expect(callback).toHaveBeenCalledWith('dark', 'auto');
    });

    it('should emit detection completed event', () => {
      const callback = jest.fn();
      themeManager.on('detectionCompleted', callback);

      themeManager.setMode('auto');

      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        detectedTheme: expect.any(String),
        confidence: expect.any(Number),
        method: expect.any(String)
      }));
    });

    it('should remove event listeners', () => {
      const callback = jest.fn();
      themeManager.on('themeChanged', callback);
      themeManager.off('themeChanged', callback);

      themeManager.setMode('dark');

      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle errors in event listeners gracefully', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Test error');
      });
      const normalCallback = jest.fn();

      themeManager.on('themeChanged', errorCallback);
      themeManager.on('themeChanged', normalCallback);

      // Should not throw
      expect(() => themeManager.setMode('dark')).not.toThrow();
      expect(normalCallback).toHaveBeenCalled();
    });
  });

  describe('media query handling', () => {
    beforeEach(() => {
      themeManager.initialize();
    });

    it('should listen for media query changes in auto mode', () => {
      const mockMediaQuery = {
        matches: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      };

      (window.matchMedia as jest.Mock).mockReturnValue(mockMediaQuery);
      
      themeManager.initialize();
      themeManager.setMode('auto');

      expect(mockMediaQuery.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should not listen for media query changes in manual modes', () => {
      const mockMediaQuery = {
        matches: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      };

      (window.matchMedia as jest.Mock).mockReturnValue(mockMediaQuery);
      
      themeManager.setMode('light');

      expect(mockMediaQuery.addEventListener).not.toHaveBeenCalled();
    });

    it('should remove media query listeners on destroy', () => {
      const mockMediaQuery = {
        matches: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      };

      (window.matchMedia as jest.Mock).mockReturnValue(mockMediaQuery);
      
      themeManager.initialize();
      themeManager.setMode('auto');
      themeManager.destroy();

      expect(mockMediaQuery.removeEventListener).toHaveBeenCalled();
    });
  });

  describe('host style observation', () => {
    beforeEach(() => {
      themeManager.initialize();
    });

    it('should observe host style changes in auto mode', () => {
      themeManager.setMode('auto');

      expect(mockMutationObserver).toHaveBeenCalled();
      const observerInstance = mockMutationObserver.mock.results[0].value;
      expect(observerInstance.observe).toHaveBeenCalled();
    });

    it('should disconnect observer on destroy', () => {
      themeManager.setMode('auto');
      const observerInstance = mockMutationObserver.mock.results[0].value;

      themeManager.destroy();

      expect(observerInstance.disconnect).toHaveBeenCalled();
    });
  });

  describe('destruction', () => {
    beforeEach(() => {
      themeManager.initialize();
    });

    it('should clean up resources on destroy', () => {
      themeManager.initialize();
      const styleElement = shadowRoot.querySelector('style');
      expect(styleElement).toBeTruthy();

      themeManager.destroy();

      expect(shadowRoot.querySelector('style')).toBeFalsy();
    });

    it('should not throw when destroying multiple times', () => {
      expect(() => {
        themeManager.destroy();
        themeManager.destroy();
      }).not.toThrow();
    });

    it('should clear event listeners on destroy', () => {
      const callback = jest.fn();
      themeManager.on('themeChanged', callback);

      themeManager.destroy();
      
      // Create new instance to test that old listeners are gone
      const newThemeManager = new ThemeManager(shadowRoot, config);
      newThemeManager.initialize();
      newThemeManager.setMode('dark');

      expect(callback).not.toHaveBeenCalled();
      
      newThemeManager.destroy();
    });
  });

  describe('debug mode', () => {
    it('should log debug messages when debug is enabled', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const debugConfig = { ...config, debug: true };
      const debugThemeManager = new ThemeManager(shadowRoot, debugConfig);

      debugThemeManager.initialize();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ThemeManager] Initialized with theme:')
      );

      debugThemeManager.destroy();
      consoleSpy.mockRestore();
    });

    it('should not log debug messages when debug is disabled', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      themeManager.initialize();

      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('[ThemeManager]')
      );

      consoleSpy.mockRestore();
    });
  });
});