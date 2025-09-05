import { DinoOverlayConfig, DEFAULT_CONFIG, LoaderError } from '../types/config';

export class DinoOverlayLoader {
  private config: Required<DinoOverlayConfig>;
  private shadowRoot: ShadowRoot | null = null;
  private container: HTMLElement | null = null;
  private isInitialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  constructor(config: DinoOverlayConfig) {
    this.config = this.validateAndMergeConfig(config);
  }

  public async initialize(): Promise<void> {
    // Prevent multiple initializations
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    if (this.isInitialized) {
      // Return the cached promise if already initialized
      if (!this.initializationPromise) {
        this.initializationPromise = Promise.resolve();
      }
      return this.initializationPromise;
    }

    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  public destroy(): void {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.shadowRoot = null;
    this.container = null;
    this.isInitialized = false;
    this.initializationPromise = null;
  }

  public getShadowRoot(): ShadowRoot | null {
    return this.shadowRoot;
  }

  public getConfig(): Required<DinoOverlayConfig> {
    return { ...this.config };
  }

  public isReady(): boolean {
    return this.isInitialized && this.shadowRoot !== null;
  }

  private async performInitialization(): Promise<void> {
    try {
      this.validateEnvironment();
      await this.createShadowDOM();
      await this.loadStyles();
      await this.mountOverlay();
      this.isInitialized = true;
      
      if (this.config.debug) {
        console.log('[DinoOverlay] Successfully initialized', this.config);
      }
    } catch (error) {
      const loaderError = this.createLoaderError('INITIALIZATION_FAILED', error);
      if (this.config.debug) {
        console.error('[DinoOverlay] Initialization failed:', loaderError);
      }
      throw loaderError;
    }
  }

  private validateAndMergeConfig(config: DinoOverlayConfig): Required<DinoOverlayConfig> {
    if (!config || typeof config !== 'object') {
      throw this.createLoaderError('INVALID_CONFIG', 'Configuration must be an object');
    }

    // Validate API key if provided
    if (config.apiKey !== undefined && (typeof config.apiKey !== 'string' || config.apiKey.trim().length === 0)) {
      throw this.createLoaderError('INVALID_API_KEY', 'API key must be a non-empty string');
    }

    // Validate API endpoint if provided
    if (config.apiEndpoint) {
      try {
        new URL(config.apiEndpoint);
      } catch {
        throw this.createLoaderError('INVALID_API_ENDPOINT', 'API endpoint must be a valid URL');
      }
    }

    // Validate theme
    if (config.theme && !['light', 'dark', 'auto'].includes(config.theme)) {
      throw this.createLoaderError('INVALID_THEME', 'Theme must be "light", "dark", or "auto"');
    }

    // Validate custom actions
    if (config.customActions) {
      if (!Array.isArray(config.customActions)) {
        throw this.createLoaderError('INVALID_CUSTOM_ACTIONS', 'Custom actions must be an array');
      }
      
      config.customActions.forEach((action, index) => {
        if (!action.id || typeof action.id !== 'string') {
          throw this.createLoaderError('INVALID_CUSTOM_ACTION', `Custom action at index ${index} must have a valid id`);
        }
        if (!action.label || typeof action.label !== 'string') {
          throw this.createLoaderError('INVALID_CUSTOM_ACTION', `Custom action at index ${index} must have a valid label`);
        }
        if (!action.prompt || typeof action.prompt !== 'string') {
          throw this.createLoaderError('INVALID_CUSTOM_ACTION', `Custom action at index ${index} must have a valid prompt`);
        }
      });
    }

    return {
      ...DEFAULT_CONFIG,
      ...config,
      customActions: config.customActions || [],
    } as Required<DinoOverlayConfig>;
  }

  private validateEnvironment(): void {
    if (typeof window === 'undefined') {
      throw this.createLoaderError('NO_WINDOW', 'DinoOverlay requires a browser environment');
    }

    if (typeof document === 'undefined') {
      throw this.createLoaderError('NO_DOCUMENT', 'DinoOverlay requires DOM access');
    }

    if (!document.body) {
      throw this.createLoaderError('NO_BODY', 'DinoOverlay requires document.body to be available');
    }

    // Check Shadow DOM support
    if (!HTMLElement.prototype.attachShadow) {
      throw this.createLoaderError('NO_SHADOW_DOM', 'DinoOverlay requires Shadow DOM support');
    }
  }

  private async createShadowDOM(): Promise<void> {
    try {
      // Create container element
      this.container = document.createElement('div');
      this.container.id = 'dino-overlay-container';
      this.container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 2147483647;
      `;

      // Attach shadow root with closed mode for complete isolation
      this.shadowRoot = this.container.attachShadow({ mode: 'closed' });

      // Add container to DOM
      document.body.appendChild(this.container);

      if (this.config.debug) {
        console.log('[DinoOverlay] Shadow DOM container created');
      }
    } catch (error) {
      throw this.createLoaderError('SHADOW_DOM_CREATION_FAILED', error);
    }
  }

  private async loadStyles(): Promise<void> {
    if (!this.shadowRoot) {
      throw this.createLoaderError('NO_SHADOW_ROOT', 'Shadow root not available for style loading');
    }

    try {
      // Create style element with CSS reset and glassmorphic utilities
      const styleElement = document.createElement('style');
      styleElement.textContent = this.getBaseStyles();
      
      this.shadowRoot.appendChild(styleElement);

      if (this.config.debug) {
        console.log('[DinoOverlay] Base styles loaded');
      }
    } catch (error) {
      throw this.createLoaderError('STYLE_LOADING_FAILED', error);
    }
  }

  private async mountOverlay(): Promise<void> {
    if (!this.shadowRoot) {
      throw this.createLoaderError('NO_SHADOW_ROOT', 'Shadow root not available for overlay mounting');
    }

    try {
      // Create root overlay container
      const overlayRoot = document.createElement('div');
      overlayRoot.id = 'overlay-root';
      overlayRoot.className = 'dino-overlay-root';
      
      this.shadowRoot.appendChild(overlayRoot);

      if (this.config.debug) {
        console.log('[DinoOverlay] Overlay root mounted');
      }
    } catch (error) {
      throw this.createLoaderError('OVERLAY_MOUNTING_FAILED', error);
    }
  }

  private getBaseStyles(): string {
    return `
      /* CSS Reset for Shadow DOM */
      *, *::before, *::after {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      /* Base overlay styles */
      .dino-overlay-root {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        line-height: 1.5;
        color: #333;
        pointer-events: none;
        position: relative;
        width: 100%;
        height: 100%;
      }

      /* Glassmorphic utilities */
      .glass {
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 12px;
      }

      .glass-dark {
        background: rgba(0, 0, 0, 0.1);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
      }

      /* Interactive elements */
      .interactive {
        pointer-events: auto;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .interactive:hover {
        transform: scale(1.02);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      }

      /* Animation utilities */
      .fade-in {
        animation: fadeIn 0.3s ease-out;
      }

      .slide-in-right {
        animation: slideInRight 0.3s ease-out;
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes slideInRight {
        from { 
          opacity: 0;
          transform: translateX(100%);
        }
        to { 
          opacity: 1;
          transform: translateX(0);
        }
      }

      /* Responsive utilities */
      @media (max-width: 768px) {
        .dino-overlay-root {
          font-size: 12px;
        }
      }
    `;
  }

  private createLoaderError(code: string, error: any): LoaderError {
    const message = error instanceof Error ? error.message : String(error);
    const loaderError = new Error(`[DinoOverlay] ${message}`) as LoaderError;
    loaderError.code = code;
    loaderError.details = error;
    return loaderError;
  }
}