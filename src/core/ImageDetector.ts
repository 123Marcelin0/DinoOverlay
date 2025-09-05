import { SelectedImage } from '../types/overlay';

export interface DetectionConfig {
  className: string;
  observeChanges: boolean;
  debounceMs: number;
  debug?: boolean;
}

export interface ImageDetectorEvents {
  imageDetected: (image: HTMLImageElement) => void;
  imageRemoved: (image: HTMLImageElement) => void;
  imageUpdated: (image: HTMLImageElement) => void;
}

export class ImageDetector {
  private config: DetectionConfig;
  private observer: MutationObserver | null = null;
  private detectedImages: Set<HTMLImageElement> = new Set();
  private eventListeners: Map<string, Function[]> = new Map();
  private resizeObserver: ResizeObserver | null = null;
  private scrollDebounceTimer: number | null = null;
  private resizeDebounceTimer: number | null = null;
  private isActive: boolean = false;

  constructor(config: DetectionConfig) {
    this.config = {
      className: 'editable-room',
      observeChanges: true,
      debounceMs: 150,
      debug: false,
      ...config
    };

    // Bind methods to preserve context
    this.handleScroll = this.handleScroll.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.handleMutation = this.handleMutation.bind(this);
  }

  public startDetection(): void {
    if (this.isActive) {
      if (this.config.debug) {
        console.warn('[ImageDetector] Detection already active');
      }
      return;
    }

    try {
      this.isActive = true;
      this.setupMutationObserver();
      this.setupEventListeners();
      this.performInitialScan();

      if (this.config.debug) {
        console.log('[ImageDetector] Detection started');
      }
    } catch (error) {
      this.isActive = false;
      throw new Error(`Failed to start image detection: ${error}`);
    }
  }

  public stopDetection(): void {
    if (!this.isActive) {
      return;
    }

    this.isActive = false;
    this.cleanup();

    if (this.config.debug) {
      console.log('[ImageDetector] Detection stopped');
    }
  }

  public getDetectedImages(): HTMLImageElement[] {
    return Array.from(this.detectedImages);
  }

  public isImageDetected(image: HTMLImageElement): boolean {
    return this.detectedImages.has(image);
  }

  public calculateImageBounds(image: HTMLImageElement): DOMRect {
    if (!image || !image.isConnected) {
      throw new Error('Image element is not connected to DOM');
    }

    return image.getBoundingClientRect();
  }

  public getImageBorderRadius(image: HTMLImageElement): string {
    if (!image || !image.isConnected) {
      return '0px';
    }

    const computedStyle = window.getComputedStyle(image);
    return computedStyle.borderRadius || '0px';
  }

  public createSelectedImage(image: HTMLImageElement): SelectedImage {
    const rect = this.calculateImageBounds(image);
    const borderRadius = this.getImageBorderRadius(image);

    return {
      element: image,
      rect,
      borderRadius
    };
  }

  public on<K extends keyof ImageDetectorEvents>(
    event: K,
    callback: ImageDetectorEvents[K]
  ): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  public off<K extends keyof ImageDetectorEvents>(
    event: K,
    callback: ImageDetectorEvents[K]
  ): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private setupMutationObserver(): void {
    if (!this.config.observeChanges) {
      return;
    }

    this.observer = new MutationObserver(this.handleMutation);
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'src']
    });
  }

  private setupEventListeners(): void {
    // Add scroll listener with debouncing
    window.addEventListener('scroll', this.handleScroll, { passive: true });
    
    // Add resize listener with debouncing
    window.addEventListener('resize', this.handleResize, { passive: true });

    // Setup ResizeObserver for individual image size changes
    if ('ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const image = entry.target as HTMLImageElement;
          if (this.detectedImages.has(image)) {
            this.emit('imageUpdated', image);
          }
        }
      });
    }
  }

  private performInitialScan(): void {
    const images = this.scanForImages();
    
    for (const image of images) {
      this.addDetectedImage(image);
    }

    if (this.config.debug) {
      console.log(`[ImageDetector] Initial scan found ${images.length} images`);
    }
  }

  private scanForImages(): HTMLImageElement[] {
    const selector = `img.${this.config.className}`;
    const elements = document.querySelectorAll(selector);
    
    return Array.from(elements).filter((element): element is HTMLImageElement => {
      return element instanceof HTMLImageElement && this.isValidImage(element);
    });
  }

  private isValidImage(image: HTMLImageElement): boolean {
    // Check if image is visible and has dimensions
    if (!image.isConnected || image.offsetWidth === 0 || image.offsetHeight === 0) {
      return false;
    }

    // Check if image has loaded
    if (!image.complete || image.naturalWidth === 0) {
      return false;
    }

    // Check if image is not hidden
    const computedStyle = window.getComputedStyle(image);
    if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
      return false;
    }

    return true;
  }

  private addDetectedImage(image: HTMLImageElement): void {
    if (this.detectedImages.has(image)) {
      return;
    }

    this.detectedImages.add(image);
    this.attachImageListeners(image);
    
    // Observe image for size changes
    if (this.resizeObserver) {
      this.resizeObserver.observe(image);
    }

    this.emit('imageDetected', image);

    if (this.config.debug) {
      console.log('[ImageDetector] Image detected:', image);
    }
  }

  private removeDetectedImage(image: HTMLImageElement): void {
    if (!this.detectedImages.has(image)) {
      return;
    }

    this.detectedImages.delete(image);
    this.detachImageListeners(image);
    
    // Stop observing image
    if (this.resizeObserver) {
      this.resizeObserver.unobserve(image);
    }

    this.emit('imageRemoved', image);

    if (this.config.debug) {
      console.log('[ImageDetector] Image removed:', image);
    }
  }

  private attachImageListeners(image: HTMLImageElement): void {
    // Add load listener for images that might still be loading
    const handleLoad = () => {
      if (this.isValidImage(image)) {
        this.emit('imageUpdated', image);
      }
    };

    const handleError = () => {
      this.removeDetectedImage(image);
    };

    image.addEventListener('load', handleLoad);
    image.addEventListener('error', handleError);

    // Store listeners for cleanup
    (image as any).__dinoListeners = { handleLoad, handleError };
  }

  private detachImageListeners(image: HTMLImageElement): void {
    const listeners = (image as any).__dinoListeners;
    if (listeners) {
      image.removeEventListener('load', listeners.handleLoad);
      image.removeEventListener('error', listeners.handleError);
      delete (image as any).__dinoListeners;
    }
  }

  private handleMutation(mutations: MutationRecord[]): void {
    let hasChanges = false;

    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        // Handle added nodes
        for (const node of Array.from(mutation.addedNodes)) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            
            // Check if the added node is an image
            if (element instanceof HTMLImageElement && element.classList.contains(this.config.className)) {
              if (this.isValidImage(element)) {
                this.addDetectedImage(element);
                hasChanges = true;
              }
            }
            
            // Check for images within the added node
            const images = element.querySelectorAll(`img.${this.config.className}`);
            for (const img of Array.from(images)) {
              if (img instanceof HTMLImageElement && this.isValidImage(img)) {
                this.addDetectedImage(img);
                hasChanges = true;
              }
            }
          }
        }

        // Handle removed nodes
        for (const node of Array.from(mutation.removedNodes)) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            
            // Check if the removed node is a detected image
            if (element instanceof HTMLImageElement && this.detectedImages.has(element)) {
              this.removeDetectedImage(element);
              hasChanges = true;
            }
            
            // Check for detected images within the removed node
            for (const image of Array.from(this.detectedImages)) {
              if (!image.isConnected || element.contains(image)) {
                this.removeDetectedImage(image);
                hasChanges = true;
              }
            }
          }
        }
      } else if (mutation.type === 'attributes') {
        const target = mutation.target as Element;
        
        if (target instanceof HTMLImageElement) {
          const hadClass = this.detectedImages.has(target);
          const hasClass = target.classList.contains(this.config.className);
          
          if (hasClass && !hadClass && this.isValidImage(target)) {
            this.addDetectedImage(target);
            hasChanges = true;
          } else if (!hasClass && hadClass) {
            this.removeDetectedImage(target);
            hasChanges = true;
          } else if (hasClass && hadClass) {
            // Image attributes changed, emit update
            this.emit('imageUpdated', target);
          }
        }
      }
    }

    if (hasChanges && this.config.debug) {
      console.log(`[ImageDetector] Mutation detected, ${this.detectedImages.size} images tracked`);
    }
  }

  private handleScroll(): void {
    if (this.scrollDebounceTimer) {
      clearTimeout(this.scrollDebounceTimer);
    }

    this.scrollDebounceTimer = window.setTimeout(() => {
      // Update all detected images as their positions may have changed
      for (const image of this.detectedImages) {
        this.emit('imageUpdated', image);
      }
      
      if (this.config.debug) {
        console.log('[ImageDetector] Scroll update processed');
      }
    }, this.config.debounceMs);
  }

  private handleResize(): void {
    if (this.resizeDebounceTimer) {
      clearTimeout(this.resizeDebounceTimer);
    }

    this.resizeDebounceTimer = window.setTimeout(() => {
      // Update all detected images as their positions may have changed
      for (const image of this.detectedImages) {
        this.emit('imageUpdated', image);
      }
      
      if (this.config.debug) {
        console.log('[ImageDetector] Resize update processed');
      }
    }, this.config.debounceMs);
  }

  private emit<K extends keyof ImageDetectorEvents>(
    event: K,
    ...args: Parameters<ImageDetectorEvents[K]>
  ): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        try {
          (listener as any)(...args);
        } catch (error) {
          console.error(`[ImageDetector] Error in ${event} listener:`, error);
        }
      }
    }
  }

  private cleanup(): void {
    // Clear timers
    if (this.scrollDebounceTimer) {
      clearTimeout(this.scrollDebounceTimer);
      this.scrollDebounceTimer = null;
    }

    if (this.resizeDebounceTimer) {
      clearTimeout(this.resizeDebounceTimer);
      this.resizeDebounceTimer = null;
    }

    // Disconnect observers
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    // Remove event listeners
    window.removeEventListener('scroll', this.handleScroll);
    window.removeEventListener('resize', this.handleResize);

    // Clean up image listeners
    for (const image of this.detectedImages) {
      this.detachImageListeners(image);
    }

    // Clear detected images
    this.detectedImages.clear();

    // Clear event listeners
    this.eventListeners.clear();
  }

  public destroy(): void {
    this.stopDetection();
  }
}