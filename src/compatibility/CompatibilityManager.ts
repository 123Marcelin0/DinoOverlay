import { FrameworkDetector } from './FrameworkDetector';
import { WordPressCompatibility } from './wordpress/WordPressCompatibility';
import { ReactCompatibility } from './react/ReactCompatibility';
import { VueCompatibility } from './vue/VueCompatibility';
import { PlainHTMLCompatibility } from './html/PlainHTMLCompatibility';
import { 
  FrameworkType, 
  FrameworkInfo, 
  CompatibilityConfig, 
  CompatibilityAdapter 
} from './types';

export class CompatibilityManager {
  private detector: FrameworkDetector;
  private currentAdapter: CompatibilityAdapter | null = null;
  private config: CompatibilityConfig;
  private frameworkInfo: FrameworkInfo | null = null;
  private isInitialized = false;

  constructor(config: CompatibilityConfig = {}) {
    this.detector = new FrameworkDetector();
    this.config = {
      autoDetect: true,
      preventConflicts: true,
      isolateStyles: true,
      respectLifecycle: true,
      customSelectors: [],
      excludeSelectors: [],
      ...config
    };
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Detect framework if auto-detection is enabled
      if (this.config.autoDetect) {
        this.frameworkInfo = await this.detector.detectFramework();
      } else if (this.config.framework) {
        // Use manually specified framework
        this.frameworkInfo = {
          type: this.config.framework,
          detected: true,
          confidence: 1.0
        };
      } else {
        // Default to plain HTML
        this.frameworkInfo = {
          type: 'html',
          detected: true,
          confidence: 0.5
        };
      }

      // Create appropriate adapter
      this.currentAdapter = this.createAdapter(this.frameworkInfo.type);

      // Initialize the adapter
      if (this.currentAdapter) {
        await this.currentAdapter.initialize();
      }

      this.isInitialized = true;
      
      console.log('[DinoOverlay] Compatibility manager initialized', {
        framework: this.frameworkInfo.type,
        confidence: this.frameworkInfo.confidence,
        adapter: this.currentAdapter?.constructor.name
      });
    } catch (error) {
      console.error('[DinoOverlay] Compatibility manager initialization failed:', error);
      throw error;
    }
  }

  public cleanup(): void {
    if (this.currentAdapter) {
      this.currentAdapter.cleanup();
      this.currentAdapter = null;
    }

    this.detector.clearCache();
    this.frameworkInfo = null;
    this.isInitialized = false;
  }

  public getFrameworkInfo(): FrameworkInfo | null {
    return this.frameworkInfo;
  }

  public getCurrentAdapter(): CompatibilityAdapter | null {
    return this.currentAdapter;
  }

  public async switchFramework(frameworkType: FrameworkType): Promise<void> {
    // Cleanup current adapter
    if (this.currentAdapter) {
      this.currentAdapter.cleanup();
    }

    // Create new adapter
    this.currentAdapter = this.createAdapter(frameworkType);
    
    // Update framework info
    this.frameworkInfo = {
      type: frameworkType,
      detected: false, // Manually switched
      confidence: 1.0
    };

    // Initialize new adapter
    if (this.currentAdapter) {
      await this.currentAdapter.initialize();
    }

    console.log('[DinoOverlay] Switched to framework:', frameworkType);
  }

  public findEditableImages(): HTMLImageElement[] {
    if (!this.currentAdapter) {
      console.warn('[DinoOverlay] No compatibility adapter available');
      return [];
    }

    try {
      let images = this.currentAdapter.findEditableImages();

      // Apply custom selectors if configured
      if (this.config.customSelectors && this.config.customSelectors.length > 0) {
        const customImages = this.findImagesBySelectors(this.config.customSelectors);
        images = [...images, ...customImages];
      }

      // Remove excluded images
      if (this.config.excludeSelectors && this.config.excludeSelectors.length > 0) {
        images = this.excludeImagesBySelectors(images, this.config.excludeSelectors);
      }

      // Remove duplicates
      return Array.from(new Set(images));
    } catch (error) {
      console.error('[DinoOverlay] Error finding editable images:', error);
      return [];
    }
  }

  public attachEventListeners(element: HTMLElement, events: Record<string, EventListener>): void {
    if (!this.currentAdapter) {
      console.warn('[DinoOverlay] No compatibility adapter available for event attachment');
      return;
    }

    try {
      this.currentAdapter.attachEventListeners(element, events);
    } catch (error) {
      console.error('[DinoOverlay] Error attaching event listeners:', error);
    }
  }

  public removeEventListeners(element: HTMLElement): void {
    if (!this.currentAdapter) {
      return;
    }

    try {
      this.currentAdapter.removeEventListeners(element);
    } catch (error) {
      console.error('[DinoOverlay] Error removing event listeners:', error);
    }
  }

  public onFrameworkMount(): void {
    if (this.currentAdapter && this.currentAdapter.onFrameworkMount) {
      try {
        this.currentAdapter.onFrameworkMount();
      } catch (error) {
        console.error('[DinoOverlay] Error in framework mount handler:', error);
      }
    }
  }

  public onFrameworkUnmount(): void {
    if (this.currentAdapter && this.currentAdapter.onFrameworkUnmount) {
      try {
        this.currentAdapter.onFrameworkUnmount();
      } catch (error) {
        console.error('[DinoOverlay] Error in framework unmount handler:', error);
      }
    }
  }

  public onFrameworkUpdate(): void {
    if (this.currentAdapter && this.currentAdapter.onFrameworkUpdate) {
      try {
        this.currentAdapter.onFrameworkUpdate();
      } catch (error) {
        console.error('[DinoOverlay] Error in framework update handler:', error);
      }
    }
  }

  private createAdapter(frameworkType: FrameworkType): CompatibilityAdapter {
    switch (frameworkType) {
      case 'wordpress':
        return new WordPressCompatibility();
      case 'react':
        return new ReactCompatibility();
      case 'vue':
        return new VueCompatibility();
      case 'html':
        return new PlainHTMLCompatibility();
      default:
        console.warn('[DinoOverlay] Unknown framework type, defaulting to HTML:', frameworkType);
        return new PlainHTMLCompatibility();
    }
  }

  private findImagesBySelectors(selectors: string[]): HTMLImageElement[] {
    const images: HTMLImageElement[] = [];
    
    selectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          if (element instanceof HTMLImageElement) {
            images.push(element);
          } else if (element && typeof element.querySelector === 'function') {
            const img = element.querySelector('img');
            if (img) images.push(img);
          }
        });
      } catch (error) {
        console.warn('[DinoOverlay] Invalid custom selector:', selector);
      }
    });

    return images;
  }

  private excludeImagesBySelectors(images: HTMLImageElement[], excludeSelectors: string[]): HTMLImageElement[] {
    return images.filter(image => {
      return !excludeSelectors.some(selector => {
        try {
          return image.matches && image.matches(selector);
        } catch (error) {
          console.warn('[DinoOverlay] Invalid exclude selector:', selector);
          return false;
        }
      });
    });
  }
}