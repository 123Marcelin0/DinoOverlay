import { ImageDetector, DetectionConfig } from '../../src/core/ImageDetector';

// Mock ResizeObserver
class MockResizeObserver {
  private callback: ResizeObserverCallback;
  private observedElements: Set<Element> = new Set();

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe(element: Element): void {
    this.observedElements.add(element);
  }

  unobserve(element: Element): void {
    this.observedElements.delete(element);
  }

  disconnect(): void {
    this.observedElements.clear();
  }

  // Test helper to trigger resize events
  triggerResize(element: Element): void {
    if (this.observedElements.has(element)) {
      const entry = {
        target: element,
        contentRect: element.getBoundingClientRect(),
        borderBoxSize: [],
        contentBoxSize: [],
        devicePixelContentBoxSize: []
      } as ResizeObserverEntry;
      
      this.callback([entry], this);
    }
  }
}

// Mock MutationObserver
class MockMutationObserver {
  private callback: MutationCallback;
  private isObserving: boolean = false;

  constructor(callback: MutationCallback) {
    this.callback = callback;
  }

  observe(): void {
    this.isObserving = true;
  }

  disconnect(): void {
    this.isObserving = false;
  }

  // Test helper to trigger mutations
  triggerMutation(mutations: MutationRecord[]): void {
    if (this.isObserving) {
      this.callback(mutations, this);
    }
  }
}

// Store mock instances for testing
let mockMutationObserverInstance: MockMutationObserver | null = null;
let mockResizeObserverInstance: MockResizeObserver | null = null;

// Setup global mocks with jest.fn()
const MockResizeObserverConstructor = jest.fn().mockImplementation((callback) => {
  mockResizeObserverInstance = new MockResizeObserver(callback);
  return mockResizeObserverInstance;
});

const MockMutationObserverConstructor = jest.fn().mockImplementation((callback) => {
  mockMutationObserverInstance = new MockMutationObserver(callback);
  return mockMutationObserverInstance;
});

(global as any).ResizeObserver = MockResizeObserverConstructor;
(global as any).MutationObserver = MockMutationObserverConstructor;

// Helper function to create mock image element
function createMockImage(options: {
  className?: string;
  width?: number;
  height?: number;
  complete?: boolean;
  naturalWidth?: number;
  borderRadius?: string;
  isConnected?: boolean;
  display?: string;
  visibility?: string;
}): HTMLImageElement {
  const img = document.createElement('img');
  
  if (options.className) {
    img.className = options.className;
  }
  
  // Mock properties
  Object.defineProperty(img, 'offsetWidth', {
    value: options.width ?? 100,
    writable: true
  });
  
  Object.defineProperty(img, 'offsetHeight', {
    value: options.height ?? 100,
    writable: true
  });
  
  Object.defineProperty(img, 'complete', {
    value: options.complete ?? true,
    writable: true
  });
  
  Object.defineProperty(img, 'naturalWidth', {
    value: options.naturalWidth ?? 100,
    writable: true
  });
  
  Object.defineProperty(img, 'isConnected', {
    value: options.isConnected ?? true,
    writable: true
  });

  // Mock getBoundingClientRect
  img.getBoundingClientRect = jest.fn(() => ({
    x: 0,
    y: 0,
    width: options.width ?? 100,
    height: options.height ?? 100,
    top: 0,
    left: 0,
    bottom: options.height ?? 100,
    right: options.width ?? 100,
    toJSON: () => ({})
  }));

  // Mock getComputedStyle
  const originalGetComputedStyle = window.getComputedStyle;
  window.getComputedStyle = jest.fn((element) => {
    if (element === img) {
      return {
        borderRadius: options.borderRadius ?? '0px',
        display: options.display ?? 'block',
        visibility: options.visibility ?? 'visible'
      } as CSSStyleDeclaration;
    }
    return originalGetComputedStyle(element);
  });

  return img;
}

describe('ImageDetector', () => {
  let detector: ImageDetector;
  let defaultConfig: DetectionConfig;

  beforeEach(() => {
    // Clear DOM
    document.body.innerHTML = '';
    
    // Reset default config
    defaultConfig = {
      className: 'editable-room',
      observeChanges: true,
      debounceMs: 150,
      debug: false
    };

    // Clear all timers
    jest.clearAllTimers();
    jest.useFakeTimers();
    
    // Clear mock instances
    MockMutationObserverConstructor.mockClear();
    MockResizeObserverConstructor.mockClear();
    mockMutationObserverInstance = null;
    mockResizeObserverInstance = null;
  });

  afterEach(() => {
    if (detector) {
      detector.destroy();
    }
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should create detector with default config', () => {
      detector = new ImageDetector(defaultConfig);
      expect(detector).toBeInstanceOf(ImageDetector);
    });

    it('should merge provided config with defaults', () => {
      const customConfig = {
        className: 'custom-class',
        debounceMs: 300
      };
      
      detector = new ImageDetector(customConfig);
      expect(detector).toBeInstanceOf(ImageDetector);
    });
  });

  describe('Image Detection', () => {
    beforeEach(() => {
      detector = new ImageDetector(defaultConfig);
    });

    it('should detect images with correct class on initial scan', () => {
      // Create test images
      const validImage = createMockImage({ className: 'editable-room' });
      const invalidImage = createMockImage({ className: 'other-class' });
      
      document.body.appendChild(validImage);
      document.body.appendChild(invalidImage);

      const detectedCallback = jest.fn();
      detector.on('imageDetected', detectedCallback);

      detector.startDetection();

      expect(detectedCallback).toHaveBeenCalledTimes(1);
      expect(detectedCallback).toHaveBeenCalledWith(validImage);
      expect(detector.getDetectedImages()).toContain(validImage);
      expect(detector.getDetectedImages()).not.toContain(invalidImage);
    });

    it('should not detect invalid images', () => {
      // Create invalid images
      const hiddenImage = createMockImage({ 
        className: 'editable-room', 
        width: 0, 
        height: 0 
      });
      const incompleteImage = createMockImage({ 
        className: 'editable-room', 
        complete: false 
      });
      const disconnectedImage = createMockImage({ 
        className: 'editable-room', 
        isConnected: false 
      });
      
      document.body.appendChild(hiddenImage);
      document.body.appendChild(incompleteImage);
      document.body.appendChild(disconnectedImage);

      const detectedCallback = jest.fn();
      detector.on('imageDetected', detectedCallback);

      detector.startDetection();

      expect(detectedCallback).not.toHaveBeenCalled();
      expect(detector.getDetectedImages()).toHaveLength(0);
    });

    it('should detect dynamically added images', () => {
      detector.startDetection();

      const detectedCallback = jest.fn();
      detector.on('imageDetected', detectedCallback);

      // Add image after detection started
      const newImage = createMockImage({ className: 'editable-room' });
      document.body.appendChild(newImage);

      // Simulate mutation observer
      expect(mockMutationObserverInstance).toBeTruthy();
      mockMutationObserverInstance!.triggerMutation([{
        type: 'childList',
        addedNodes: [newImage],
        removedNodes: [],
        target: document.body
      }]);

      expect(detectedCallback).toHaveBeenCalledWith(newImage);
      expect(detector.isImageDetected(newImage)).toBe(true);
    });

    it('should remove detected images when they are removed from DOM', () => {
      const image = createMockImage({ className: 'editable-room' });
      document.body.appendChild(image);

      const removedCallback = jest.fn();
      detector.on('imageRemoved', removedCallback);

      detector.startDetection();
      expect(detector.isImageDetected(image)).toBe(true);

      // Remove image
      document.body.removeChild(image);
      Object.defineProperty(image, 'isConnected', { value: false });

      // Simulate mutation observer
      expect(mockMutationObserverInstance).toBeTruthy();
      mockMutationObserverInstance!.triggerMutation([{
        type: 'childList',
        addedNodes: [],
        removedNodes: [image],
        target: document.body
      }]);

      expect(removedCallback).toHaveBeenCalledWith(image);
      expect(detector.isImageDetected(image)).toBe(false);
    });
  });

  describe('Image Bounds Calculation', () => {
    beforeEach(() => {
      detector = new ImageDetector(defaultConfig);
    });

    it('should calculate image bounds correctly', () => {
      const image = createMockImage({ 
        className: 'editable-room',
        width: 200,
        height: 150
      });

      const bounds = detector.calculateImageBounds(image);
      
      expect(bounds.width).toBe(200);
      expect(bounds.height).toBe(150);
    });

    it('should throw error for disconnected image', () => {
      const image = createMockImage({ 
        className: 'editable-room',
        isConnected: false
      });

      expect(() => {
        detector.calculateImageBounds(image);
      }).toThrow('Image element is not connected to DOM');
    });

    it('should get image border radius', () => {
      const image = createMockImage({ 
        className: 'editable-room',
        borderRadius: '12px'
      });

      const borderRadius = detector.getImageBorderRadius(image);
      expect(borderRadius).toBe('12px');
    });

    it('should return default border radius for disconnected image', () => {
      const image = createMockImage({ 
        className: 'editable-room',
        isConnected: false
      });

      const borderRadius = detector.getImageBorderRadius(image);
      expect(borderRadius).toBe('0px');
    });

    it('should create SelectedImage object correctly', () => {
      const image = createMockImage({ 
        className: 'editable-room',
        width: 200,
        height: 150,
        borderRadius: '8px'
      });

      const selectedImage = detector.createSelectedImage(image);

      expect(selectedImage.element).toBe(image);
      expect(selectedImage.rect.width).toBe(200);
      expect(selectedImage.rect.height).toBe(150);
      expect(selectedImage.borderRadius).toBe('8px');
    });
  });

  describe('Event Handling', () => {
    beforeEach(() => {
      detector = new ImageDetector(defaultConfig);
    });

    it('should handle scroll events with debouncing', () => {
      const image = createMockImage({ className: 'editable-room' });
      document.body.appendChild(image);

      const updatedCallback = jest.fn();
      detector.on('imageUpdated', updatedCallback);

      detector.startDetection();

      // Trigger multiple scroll events
      window.dispatchEvent(new Event('scroll'));
      window.dispatchEvent(new Event('scroll'));
      window.dispatchEvent(new Event('scroll'));

      // Should not be called immediately
      expect(updatedCallback).not.toHaveBeenCalled();

      // Fast-forward debounce timer
      jest.advanceTimersByTime(150);

      // Should be called once after debounce
      expect(updatedCallback).toHaveBeenCalledTimes(1);
      expect(updatedCallback).toHaveBeenCalledWith(image);
    });

    it('should handle resize events with debouncing', () => {
      const image = createMockImage({ className: 'editable-room' });
      document.body.appendChild(image);

      const updatedCallback = jest.fn();
      detector.on('imageUpdated', updatedCallback);

      detector.startDetection();

      // Trigger multiple resize events
      window.dispatchEvent(new Event('resize'));
      window.dispatchEvent(new Event('resize'));
      window.dispatchEvent(new Event('resize'));

      // Should not be called immediately
      expect(updatedCallback).not.toHaveBeenCalled();

      // Fast-forward debounce timer
      jest.advanceTimersByTime(150);

      // Should be called once after debounce
      expect(updatedCallback).toHaveBeenCalledTimes(1);
      expect(updatedCallback).toHaveBeenCalledWith(image);
    });

    it('should handle ResizeObserver events', () => {
      const image = createMockImage({ className: 'editable-room' });
      document.body.appendChild(image);

      const updatedCallback = jest.fn();
      detector.on('imageUpdated', updatedCallback);

      detector.startDetection();

      // Trigger ResizeObserver
      expect(mockResizeObserverInstance).toBeTruthy();
      mockResizeObserverInstance!.triggerResize(image);

      expect(updatedCallback).toHaveBeenCalledWith(image);
    });
  });

  describe('Event Listeners Management', () => {
    beforeEach(() => {
      detector = new ImageDetector(defaultConfig);
    });

    it('should add and remove event listeners', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      detector.on('imageDetected', callback1);
      detector.on('imageDetected', callback2);

      const image = createMockImage({ className: 'editable-room' });
      document.body.appendChild(image);

      detector.startDetection();

      expect(callback1).toHaveBeenCalledWith(image);
      expect(callback2).toHaveBeenCalledWith(image);

      // Remove one listener
      detector.off('imageDetected', callback1);

      // Add another image
      const image2 = createMockImage({ className: 'editable-room' });
      document.body.appendChild(image2);

      expect(mockMutationObserverInstance).toBeTruthy();
      mockMutationObserverInstance!.triggerMutation([{
        type: 'childList',
        addedNodes: [image2],
        removedNodes: [],
        target: document.body
      }]);

      expect(callback1).toHaveBeenCalledTimes(1); // Only called once
      expect(callback2).toHaveBeenCalledTimes(2); // Called twice
    });
  });

  describe('Lifecycle Management', () => {
    beforeEach(() => {
      detector = new ImageDetector(defaultConfig);
    });

    it('should start and stop detection properly', () => {
      expect(detector.getDetectedImages()).toHaveLength(0);

      detector.startDetection();
      
      // Should be safe to stop twice
      detector.stopDetection();
      detector.stopDetection();
    });

    it('should warn when starting detection twice with debug enabled', () => {
      const debugDetector = new ImageDetector({
        ...defaultConfig,
        debug: true
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      debugDetector.startDetection();
      debugDetector.startDetection();
      
      expect(consoleSpy).toHaveBeenCalledWith('[ImageDetector] Detection already active');
      consoleSpy.mockRestore();
      
      debugDetector.destroy();
    });

    it('should clean up properly on destroy', () => {
      const image = createMockImage({ className: 'editable-room' });
      document.body.appendChild(image);

      detector.startDetection();
      expect(detector.getDetectedImages()).toHaveLength(1);

      detector.destroy();
      expect(detector.getDetectedImages()).toHaveLength(0);
    });

    it('should handle errors in event listeners gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const errorCallback = jest.fn(() => {
        throw new Error('Test error');
      });

      detector.on('imageDetected', errorCallback);

      const image = createMockImage({ className: 'editable-room' });
      document.body.appendChild(image);

      detector.startDetection();

      expect(consoleSpy).toHaveBeenCalledWith(
        '[ImageDetector] Error in imageDetected listener:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Configuration Options', () => {
    it('should respect custom className', () => {
      detector = new ImageDetector({
        ...defaultConfig,
        className: 'custom-editable'
      });

      const validImage = createMockImage({ className: 'custom-editable' });
      const invalidImage = createMockImage({ className: 'editable-room' });
      
      document.body.appendChild(validImage);
      document.body.appendChild(invalidImage);

      const detectedCallback = jest.fn();
      detector.on('imageDetected', detectedCallback);

      detector.startDetection();

      expect(detectedCallback).toHaveBeenCalledTimes(1);
      expect(detectedCallback).toHaveBeenCalledWith(validImage);
    });

    it('should respect custom debounce timing', () => {
      detector = new ImageDetector({
        ...defaultConfig,
        debounceMs: 300
      });

      const image = createMockImage({ className: 'editable-room' });
      document.body.appendChild(image);

      const updatedCallback = jest.fn();
      detector.on('imageUpdated', updatedCallback);

      detector.startDetection();

      window.dispatchEvent(new Event('scroll'));

      // Should not be called with shorter timeout
      jest.advanceTimersByTime(150);
      expect(updatedCallback).not.toHaveBeenCalled();

      // Should be called with longer timeout
      jest.advanceTimersByTime(150);
      expect(updatedCallback).toHaveBeenCalledTimes(1);
    });

    it('should disable mutation observer when observeChanges is false', () => {
      detector = new ImageDetector({
        ...defaultConfig,
        observeChanges: false
      });

      detector.startDetection();

      // MutationObserver should not be created
      expect(MockMutationObserverConstructor.mock.instances).toHaveLength(0);
    });
  });
});