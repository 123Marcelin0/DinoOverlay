/**
 * Image optimization utility with WebP support and compression
 * Handles format conversion, quality optimization, and lazy loading
 */

export interface ImageOptimizationOptions {
  quality: number; // 0.1 to 1.0
  maxWidth?: number;
  maxHeight?: number;
  format?: 'webp' | 'jpeg' | 'png' | 'auto';
  enableLazyLoading?: boolean;
  compressionLevel?: number; // 0-9 for PNG
}

export interface OptimizedImage {
  data: string; // base64 or blob URL
  format: string;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  width: number;
  height: number;
}

export class ImageOptimizer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private supportsWebP: boolean = false;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    this.detectWebPSupport();
  }

  private async detectWebPSupport(): Promise<void> {
    return new Promise((resolve) => {
      const webP = new Image();
      webP.onload = webP.onerror = () => {
        this.supportsWebP = webP.height === 2;
        resolve();
      };
      webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
    });
  }

  public async optimizeImage(
    imageElement: HTMLImageElement,
    options: ImageOptimizationOptions = { quality: 0.8 }
  ): Promise<OptimizedImage> {
    const originalSize = await this.getImageSize(imageElement.src);
    
    // Load image into canvas
    await this.loadImageToCanvas(imageElement, options);
    
    // Determine optimal format
    const format = this.determineOptimalFormat(options.format);
    
    // Convert and compress
    const optimizedData = this.compressImage(format, options.quality);
    const optimizedSize = this.calculateDataSize(optimizedData);
    
    return {
      data: optimizedData,
      format,
      originalSize,
      optimizedSize,
      compressionRatio: originalSize / optimizedSize,
      width: this.canvas.width,
      height: this.canvas.height
    };
  }

  private async loadImageToCanvas(
    imageElement: HTMLImageElement,
    options: ImageOptimizationOptions
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        const { width, height } = this.calculateOptimalDimensions(
          img.naturalWidth,
          img.naturalHeight,
          options
        );
        
        this.canvas.width = width;
        this.canvas.height = height;
        
        // Clear canvas and draw image
        this.ctx.clearRect(0, 0, width, height);
        this.ctx.drawImage(img, 0, 0, width, height);
        
        resolve();
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageElement.src;
    });
  }

  private calculateOptimalDimensions(
    originalWidth: number,
    originalHeight: number,
    options: ImageOptimizationOptions
  ): { width: number; height: number } {
    let { width, height } = { width: originalWidth, height: originalHeight };
    
    // Apply max width constraint
    if (options.maxWidth && width > options.maxWidth) {
      height = (height * options.maxWidth) / width;
      width = options.maxWidth;
    }
    
    // Apply max height constraint
    if (options.maxHeight && height > options.maxHeight) {
      width = (width * options.maxHeight) / height;
      height = options.maxHeight;
    }
    
    return { width: Math.round(width), height: Math.round(height) };
  }

  private determineOptimalFormat(requestedFormat?: string): string {
    if (requestedFormat && requestedFormat !== 'auto') {
      return requestedFormat;
    }
    
    // Use WebP if supported, otherwise fall back to JPEG
    return this.supportsWebP ? 'webp' : 'jpeg';
  }

  private compressImage(format: string, quality: number): string {
    const mimeType = `image/${format}`;
    return this.canvas.toDataURL(mimeType, quality);
  }

  private async getImageSize(src: string): Promise<number> {
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      return blob.size;
    } catch {
      // Fallback: estimate size from data URL if it's base64
      if (src.startsWith('data:')) {
        const base64 = src.split(',')[1];
        return Math.round((base64.length * 3) / 4);
      }
      return 0;
    }
  }

  private calculateDataSize(dataUrl: string): number {
    if (dataUrl.startsWith('data:')) {
      const base64 = dataUrl.split(',')[1];
      return Math.round((base64.length * 3) / 4);
    }
    return 0;
  }

  public createLazyLoadObserver(
    callback: (entries: IntersectionObserverEntry[]) => void,
    options: IntersectionObserverInit = {}
  ): IntersectionObserver {
    const defaultOptions = {
      root: null,
      rootMargin: '50px',
      threshold: 0.1,
      ...options
    };

    return new IntersectionObserver(callback, defaultOptions);
  }

  public async preloadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to preload image: ${src}`));
      img.src = src;
    });
  }

  public generateSrcSet(
    baseSrc: string,
    sizes: number[] = [320, 640, 1024, 1920]
  ): string {
    return sizes
      .map(size => `${baseSrc}?w=${size} ${size}w`)
      .join(', ');
  }

  public generateSizes(breakpoints: { [key: string]: string } = {}): string {
    const defaultBreakpoints = {
      '(max-width: 320px)': '280px',
      '(max-width: 640px)': '600px',
      '(max-width: 1024px)': '960px',
      ...breakpoints
    };

    const sizeEntries = Object.entries(defaultBreakpoints);
    const mediaQueries = sizeEntries.slice(0, -1)
      .map(([query, size]) => `${query} ${size}`)
      .join(', ');
    
    const fallbackSize = sizeEntries[sizeEntries.length - 1][1];
    
    return mediaQueries ? `${mediaQueries}, ${fallbackSize}` : fallbackSize;
  }

  public destroy(): void {
    // Clean up canvas
    this.canvas.width = 0;
    this.canvas.height = 0;
  }
}

// Utility functions for lazy loading
export class LazyImageLoader {
  private observer: IntersectionObserver;
  private optimizer: ImageOptimizer;
  private loadedImages: Set<HTMLImageElement> = new Set();

  constructor(optimizer: ImageOptimizer) {
    this.optimizer = optimizer;
    this.observer = this.optimizer.createLazyLoadObserver(
      this.handleIntersection.bind(this)
    );
  }

  private handleIntersection(entries: IntersectionObserverEntry[]): void {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        this.loadImage(img);
        this.observer.unobserve(img);
      }
    });
  }

  private async loadImage(img: HTMLImageElement): Promise<void> {
    if (this.loadedImages.has(img)) return;

    const dataSrc = img.dataset.src;
    if (!dataSrc) return;

    try {
      // Show loading placeholder
      img.style.filter = 'blur(5px)';
      
      // Preload the image
      await this.optimizer.preloadImage(dataSrc);
      
      // Update src and remove blur
      img.src = dataSrc;
      img.style.filter = '';
      img.classList.add('loaded');
      
      this.loadedImages.add(img);
    } catch (error) {
      console.error('Failed to lazy load image:', error);
      img.classList.add('error');
    }
  }

  public observe(img: HTMLImageElement): void {
    this.observer.observe(img);
  }

  public unobserve(img: HTMLImageElement): void {
    this.observer.unobserve(img);
  }

  public destroy(): void {
    this.observer.disconnect();
    this.loadedImages.clear();
  }
}

// Global image optimizer instance
export const imageOptimizer = new ImageOptimizer();