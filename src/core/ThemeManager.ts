import { 
  ThemeConfig, 
  ThemeMode, 
  ThemeDetectionResult, 
  ThemeManagerEvents,
  LIGHT_THEME,
  DARK_THEME,
  DEFAULT_THEME
} from '../types/theme';
import { DinoOverlayConfig } from '../types/config';

export class ThemeManager {
  private currentTheme: ThemeConfig;
  private previousTheme: ThemeConfig;
  private mode: ThemeMode;
  private shadowRoot: ShadowRoot;
  private config: Required<DinoOverlayConfig>;
  private eventListeners: Map<string, Function[]> = new Map();
  private mediaQueryList: MediaQueryList | null = null;
  private hostObserver: MutationObserver | null = null;
  private isDestroyed: boolean = false;
  private cssVariablesStyleElement: HTMLStyleElement | null = null;

  constructor(shadowRoot: ShadowRoot, config: Required<DinoOverlayConfig>) {
    this.shadowRoot = shadowRoot;
    this.config = config;
    this.mode = config.theme;
    this.currentTheme = DEFAULT_THEME;
    this.previousTheme = DEFAULT_THEME;

    // Bind methods to preserve context
    this.handleMediaQueryChange = this.handleMediaQueryChange.bind(this);
    this.handleHostStyleChange = this.handleHostStyleChange.bind(this);
  }

  public initialize(): void {
    if (this.isDestroyed) {
      throw new Error('ThemeManager has been destroyed');
    }

    // Detect and apply initial theme
    this.detectAndApplyTheme();

    // Setup theme detection listeners
    this.setupThemeDetection();

    // Apply CSS custom properties
    this.applyCSSCustomProperties();

    if (this.config.debug) {
      console.log('[ThemeManager] Initialized with theme:', this.currentTheme.mode);
    }
  }

  public destroy(): void {
    if (this.isDestroyed) {
      return;
    }

    this.isDestroyed = true;

    // Remove media query listener
    if (this.mediaQueryList) {
      this.mediaQueryList.removeEventListener('change', this.handleMediaQueryChange);
      this.mediaQueryList = null;
    }

    // Disconnect host observer
    if (this.hostObserver) {
      this.hostObserver.disconnect();
      this.hostObserver = null;
    }

    // Remove CSS variables style element
    if (this.cssVariablesStyleElement && this.cssVariablesStyleElement.parentNode) {
      this.cssVariablesStyleElement.parentNode.removeChild(this.cssVariablesStyleElement);
      this.cssVariablesStyleElement = null;
    }

    // Clear event listeners
    this.eventListeners.clear();

    if (this.config.debug) {
      console.log('[ThemeManager] Destroyed');
    }
  }

  public getCurrentTheme(): ThemeConfig {
    return { ...this.currentTheme };
  }

  public getMode(): ThemeMode {
    return this.mode;
  }

  public setMode(mode: ThemeMode): void {
    if (this.isDestroyed) {
      return;
    }

    const previousMode = this.mode;
    this.mode = mode;

    this.detectAndApplyTheme();
    this.emit('modeChanged', mode, previousMode);

    if (this.config.debug) {
      console.log('[ThemeManager] Mode changed:', { previousMode, newMode: mode });
    }
  }

  public detectHostTheme(): ThemeDetectionResult {
    // Method 1: Check prefers-color-scheme
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return {
        detectedTheme: 'dark',
        confidence: 0.9,
        method: 'prefers-color-scheme'
      };
    }

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return {
        detectedTheme: 'light',
        confidence: 0.9,
        method: 'prefers-color-scheme'
      };
    }

    // Method 2: Analyze host page background color
    const hostBackgroundResult = this.analyzeHostBackground();
    if (hostBackgroundResult) {
      return hostBackgroundResult;
    }

    // Method 3: Analyze computed styles of common elements
    const computedStyleResult = this.analyzeComputedStyles();
    if (computedStyleResult) {
      return computedStyleResult;
    }

    // Fallback to light theme
    return {
      detectedTheme: 'light',
      confidence: 0.1,
      method: 'fallback'
    };
  }

  public applyTheme(theme: ThemeConfig): void {
    if (this.isDestroyed) {
      return;
    }

    this.previousTheme = { ...this.currentTheme };
    this.currentTheme = { ...theme };

    // Update CSS custom properties
    this.applyCSSCustomProperties();

    // Emit theme change event
    this.emit('themeChanged', this.currentTheme, this.previousTheme);

    if (this.config.debug) {
      console.log('[ThemeManager] Theme applied:', theme.mode);
    }
  }

  public getCSSCustomProperties(): Record<string, string> {
    const theme = this.currentTheme;
    
    return {
      // Glassmorphic properties
      '--dino-glass-bg': theme.glassmorphism.background,
      '--dino-glass-backdrop': theme.glassmorphism.backdropBlur,
      '--dino-glass-border': theme.glassmorphism.border,
      '--dino-glass-shadow': theme.glassmorphism.shadow,
      '--dino-glass-text': theme.glassmorphism.text,
      '--dino-glass-text-secondary': theme.glassmorphism.textSecondary,
      '--dino-glass-accent': theme.glassmorphism.accent,
      '--dino-glass-accent-hover': theme.glassmorphism.accentHover,
      '--dino-glass-success': theme.glassmorphism.success,
      '--dino-glass-warning': theme.glassmorphism.warning,
      '--dino-glass-error': theme.glassmorphism.error,

      // Color properties
      '--dino-color-primary': theme.colors.primary,
      '--dino-color-secondary': theme.colors.secondary,
      '--dino-color-accent': theme.colors.accent,
      '--dino-color-text': theme.colors.text,
      '--dino-color-text-secondary': theme.colors.textSecondary,
      '--dino-color-background': theme.colors.background,
      '--dino-color-surface': theme.colors.surface,
      '--dino-color-border': theme.colors.border,

      // Animation properties
      '--dino-duration-fast': theme.animations.duration.fast,
      '--dino-duration-normal': theme.animations.duration.normal,
      '--dino-duration-slow': theme.animations.duration.slow,
      '--dino-easing-ease': theme.animations.easing.ease,
      '--dino-easing-ease-in': theme.animations.easing.easeIn,
      '--dino-easing-ease-out': theme.animations.easing.easeOut,
      '--dino-easing-ease-in-out': theme.animations.easing.easeInOut,
    };
  }

  public on<K extends keyof ThemeManagerEvents>(
    event: K,
    callback: ThemeManagerEvents[K]
  ): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  public off<K extends keyof ThemeManagerEvents>(
    event: K,
    callback: ThemeManagerEvents[K]
  ): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private detectAndApplyTheme(): void {
    let themeToApply: ThemeConfig;

    if (this.mode === 'auto') {
      const detectionResult = this.detectHostTheme();
      themeToApply = detectionResult.detectedTheme === 'dark' ? DARK_THEME : LIGHT_THEME;
      
      this.emit('detectionCompleted', detectionResult);
      
      if (this.config.debug) {
        console.log('[ThemeManager] Auto-detected theme:', detectionResult);
      }
    } else {
      themeToApply = this.mode === 'dark' ? DARK_THEME : LIGHT_THEME;
    }

    this.applyTheme(themeToApply);
  }

  private setupThemeDetection(): void {
    if (this.mode === 'auto') {
      // Listen for system theme changes
      if (window.matchMedia) {
        this.mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');
        this.mediaQueryList.addEventListener('change', this.handleMediaQueryChange);
      }

      // Observe host page style changes
      this.setupHostStyleObserver();
    }
  }

  private setupHostStyleObserver(): void {
    if (!document.body) {
      // Wait for body to be available
      setTimeout(() => this.setupHostStyleObserver(), 100);
      return;
    }

    this.hostObserver = new MutationObserver(this.handleHostStyleChange);
    
    // Observe changes to style attributes and class names
    this.hostObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style', 'class', 'data-theme', 'data-color-scheme']
    });

    this.hostObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ['style', 'class', 'data-theme', 'data-color-scheme']
    });
  }

  private handleMediaQueryChange(event: MediaQueryListEvent): void {
    if (this.mode === 'auto') {
      this.detectAndApplyTheme();
    }
  }

  private handleHostStyleChange(): void {
    if (this.mode === 'auto') {
      // Debounce style change detection
      setTimeout(() => {
        this.detectAndApplyTheme();
      }, 100);
    }
  }

  private analyzeHostBackground(): ThemeDetectionResult | null {
    try {
      const bodyStyles = window.getComputedStyle(document.body);
      const htmlStyles = window.getComputedStyle(document.documentElement);
      
      const backgroundColor = bodyStyles.backgroundColor || htmlStyles.backgroundColor;
      
      if (backgroundColor && backgroundColor !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'transparent') {
        const brightness = this.calculateColorBrightness(backgroundColor);
        
        return {
          detectedTheme: brightness > 128 ? 'light' : 'dark',
          confidence: 0.7,
          method: 'background-color',
          details: {
            backgroundColor,
            computedBrightness: brightness
          }
        };
      }
    } catch (error) {
      if (this.config.debug) {
        console.warn('[ThemeManager] Failed to analyze host background:', error);
      }
    }

    return null;
  }

  private analyzeComputedStyles(): ThemeDetectionResult | null {
    try {
      // Check common elements for theme indicators
      const selectors = ['body', 'main', '.content', '#content', '.container'];
      
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          const styles = window.getComputedStyle(element);
          const textColor = styles.color;
          const backgroundColor = styles.backgroundColor;
          
          if (textColor && textColor !== 'rgba(0, 0, 0, 0)') {
            const textBrightness = this.calculateColorBrightness(textColor);
            
            return {
              detectedTheme: textBrightness > 128 ? 'dark' : 'light',
              confidence: 0.6,
              method: 'computed-style',
              details: {
                textColor,
                backgroundColor,
                computedBrightness: textBrightness
              }
            };
          }
        }
      }
    } catch (error) {
      if (this.config.debug) {
        console.warn('[ThemeManager] Failed to analyze computed styles:', error);
      }
    }

    return null;
  }

  private calculateColorBrightness(color: string): number {
    // Convert color to RGB values
    const rgb = this.parseColor(color);
    if (!rgb) return 128; // Default to medium brightness
    
    // Calculate perceived brightness using luminance formula
    return (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  }

  private parseColor(color: string): { r: number; g: number; b: number } | null {
    // Handle rgb() and rgba() formats
    const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbMatch) {
      return {
        r: parseInt(rgbMatch[1], 10),
        g: parseInt(rgbMatch[2], 10),
        b: parseInt(rgbMatch[3], 10)
      };
    }

    // Handle hex formats
    const hexMatch = color.match(/^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    if (hexMatch) {
      return {
        r: parseInt(hexMatch[1], 16),
        g: parseInt(hexMatch[2], 16),
        b: parseInt(hexMatch[3], 16)
      };
    }

    // Handle short hex format
    const shortHexMatch = color.match(/^#([a-f\d])([a-f\d])([a-f\d])$/i);
    if (shortHexMatch) {
      return {
        r: parseInt(shortHexMatch[1] + shortHexMatch[1], 16),
        g: parseInt(shortHexMatch[2] + shortHexMatch[2], 16),
        b: parseInt(shortHexMatch[3] + shortHexMatch[3], 16)
      };
    }

    return null;
  }

  private applyCSSCustomProperties(): void {
    const properties = this.getCSSCustomProperties();
    
    // Remove existing style element
    if (this.cssVariablesStyleElement && this.cssVariablesStyleElement.parentNode) {
      this.cssVariablesStyleElement.parentNode.removeChild(this.cssVariablesStyleElement);
    }

    // Create new style element with CSS custom properties
    this.cssVariablesStyleElement = document.createElement('style');
    this.cssVariablesStyleElement.textContent = `
      :host {
        ${Object.entries(properties)
          .map(([key, value]) => `${key}: ${value};`)
          .join('\n        ')}
      }
    `;

    // Append to shadow root
    this.shadowRoot.appendChild(this.cssVariablesStyleElement);
  }

  private emit<K extends keyof ThemeManagerEvents>(
    event: K,
    ...args: Parameters<ThemeManagerEvents[K]>
  ): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        try {
          (listener as any)(...args);
        } catch (error) {
          console.error(`[ThemeManager] Error in ${event} listener:`, error);
        }
      }
    }
  }
}