import { ImageDetector, DetectionConfig } from '../../src/core/ImageDetector';

describe('ImageDetector Integration Tests', () => {
  let detector: ImageDetector;

  beforeEach(() => {
    // Clear DOM
    document.body.innerHTML = '';
    jest.useFakeTimers();
  });

  afterEach(() => {
    if (detector) {
      detector.destroy();
    }
    jest.useRealTimers();
  });

  it('should work with real DOM elements', () => {
    // Create a real DOM structure
    const container = document.createElement('div');
    container.innerHTML = `
      <div class="room-gallery">
        <img src="room1.jpg" class="editable-room" alt="Living Room" style="width: 300px; height: 200px;" />
        <img src="room2.jpg" class="editable-room" alt="Bedroom" style="width: 250px; height: 180px;" />
        <img src="other.jpg" class="regular-image" alt="Other" style="width: 100px; height: 100px;" />
      </div>
    `;
    
    document.body.appendChild(container);

    // Mock image loading
    const images = container.querySelectorAll('img');
    images.forEach(img => {
      Object.defineProperty(img, 'complete', { value: true });
      Object.defineProperty(img, 'naturalWidth', { value: 300 });
      Object.defineProperty(img, 'offsetWidth', { value: parseInt(img.style.width) });
      Object.defineProperty(img, 'offsetHeight', { value: parseInt(img.style.height) });
      
      // Mock getBoundingClientRect
      img.getBoundingClientRect = jest.fn(() => ({
        x: 0,
        y: 0,
        width: parseInt(img.style.width),
        height: parseInt(img.style.height),
        top: 0,
        left: 0,
        bottom: parseInt(img.style.height),
        right: parseInt(img.style.width),
        toJSON: () => ({})
      }));
    });

    const config: DetectionConfig = {
      className: 'editable-room',
      observeChanges: true,
      debounceMs: 100,
      debug: true
    };

    detector = new ImageDetector(config);

    const detectedImages: HTMLImageElement[] = [];
    detector.on('imageDetected', (image) => {
      detectedImages.push(image);
    });

    detector.startDetection();

    // Should detect 2 editable room images
    expect(detectedImages).toHaveLength(2);
    expect(detector.getDetectedImages()).toHaveLength(2);

    // Verify the correct images were detected
    const editableImages = Array.from(container.querySelectorAll('.editable-room'));
    expect(detector.getDetectedImages()).toEqual(expect.arrayContaining(editableImages));

    // Test image bounds calculation
    const firstImage = detector.getDetectedImages()[0];
    const bounds = detector.calculateImageBounds(firstImage);
    expect(bounds.width).toBeGreaterThan(0);
    expect(bounds.height).toBeGreaterThan(0);

    // Test SelectedImage creation
    const selectedImage = detector.createSelectedImage(firstImage);
    expect(selectedImage.element).toBe(firstImage);
    expect(selectedImage.rect).toBeDefined();
    expect(selectedImage.borderRadius).toBeDefined();
  });

  it('should handle dynamic content changes', () => {
    const config: DetectionConfig = {
      className: 'editable-room',
      observeChanges: true,
      debounceMs: 50,
      debug: false
    };

    detector = new ImageDetector(config);

    const detectedImages: HTMLImageElement[] = [];
    const removedImages: HTMLImageElement[] = [];

    detector.on('imageDetected', (image) => {
      detectedImages.push(image);
    });

    detector.on('imageRemoved', (image) => {
      removedImages.push(image);
    });

    detector.startDetection();

    // Initially no images
    expect(detectedImages).toHaveLength(0);

    // Add an image dynamically
    const newImage = document.createElement('img');
    newImage.src = 'dynamic-room.jpg';
    newImage.className = 'editable-room';
    newImage.style.width = '200px';
    newImage.style.height = '150px';

    // Mock image properties
    Object.defineProperty(newImage, 'complete', { value: true });
    Object.defineProperty(newImage, 'naturalWidth', { value: 200 });
    Object.defineProperty(newImage, 'offsetWidth', { value: 200 });
    Object.defineProperty(newImage, 'offsetHeight', { value: 150 });
    
    // Mock getBoundingClientRect
    newImage.getBoundingClientRect = jest.fn(() => ({
      x: 0,
      y: 0,
      width: 200,
      height: 150,
      top: 0,
      left: 0,
      bottom: 150,
      right: 200,
      toJSON: () => ({})
    }));

    document.body.appendChild(newImage);

    // Stop and restart detection to trigger a new scan
    detector.stopDetection();
    detector.startDetection();

    // Should detect the new image
    expect(detector.getDetectedImages()).toContain(newImage);

    // Remove the image
    document.body.removeChild(newImage);
    Object.defineProperty(newImage, 'isConnected', { value: false });

    // Manually trigger cleanup
    detector.stopDetection();
    detector.startDetection();

    // Should no longer detect the removed image
    expect(detector.getDetectedImages()).not.toContain(newImage);
  });

  it('should handle scroll and resize events with debouncing', () => {
    // Create test image
    const image = document.createElement('img');
    image.src = 'test-room.jpg';
    image.className = 'editable-room';
    image.style.width = '300px';
    image.style.height = '200px';

    // Mock image properties
    Object.defineProperty(image, 'complete', { value: true });
    Object.defineProperty(image, 'naturalWidth', { value: 300 });
    Object.defineProperty(image, 'offsetWidth', { value: 300 });
    Object.defineProperty(image, 'offsetHeight', { value: 200 });
    
    // Mock getBoundingClientRect
    image.getBoundingClientRect = jest.fn(() => ({
      x: 0,
      y: 0,
      width: 300,
      height: 200,
      top: 0,
      left: 0,
      bottom: 200,
      right: 300,
      toJSON: () => ({})
    }));

    document.body.appendChild(image);

    const config: DetectionConfig = {
      className: 'editable-room',
      observeChanges: true,
      debounceMs: 100,
      debug: false
    };

    detector = new ImageDetector(config);

    const updateEvents: HTMLImageElement[] = [];
    detector.on('imageUpdated', (img) => {
      updateEvents.push(img);
    });

    detector.startDetection();

    // Trigger multiple scroll events
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('scroll'));

    // Should not trigger immediately
    expect(updateEvents).toHaveLength(0);

    // Fast-forward past debounce time
    jest.advanceTimersByTime(100);

    // Should trigger once after debounce
    expect(updateEvents).toHaveLength(1);
    expect(updateEvents[0]).toBe(image);

    // Reset and test resize events
    updateEvents.length = 0;

    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new Event('resize'));

    jest.advanceTimersByTime(100);

    expect(updateEvents).toHaveLength(1);
    expect(updateEvents[0]).toBe(image);
  });

  it('should validate image requirements correctly', () => {
    const config: DetectionConfig = {
      className: 'editable-room',
      observeChanges: false,
      debounceMs: 100,
      debug: false
    };

    detector = new ImageDetector(config);

    // Test various invalid image scenarios
    const testCases = [
      {
        name: 'zero dimensions',
        props: { width: 0, height: 0, complete: true, naturalWidth: 100 }
      },
      {
        name: 'incomplete loading',
        props: { width: 100, height: 100, complete: false, naturalWidth: 100 }
      },
      {
        name: 'zero natural width',
        props: { width: 100, height: 100, complete: true, naturalWidth: 0 }
      },
      {
        name: 'disconnected from DOM',
        props: { width: 100, height: 100, complete: true, naturalWidth: 100, isConnected: false }
      }
    ];

    testCases.forEach(({ name, props }) => {
      const image = document.createElement('img');
      image.className = 'editable-room';
      image.src = `test-${name}.jpg`;

      // Set properties
      Object.defineProperty(image, 'offsetWidth', { value: props.width });
      Object.defineProperty(image, 'offsetHeight', { value: props.height });
      Object.defineProperty(image, 'complete', { value: props.complete });
      Object.defineProperty(image, 'naturalWidth', { value: props.naturalWidth });
      Object.defineProperty(image, 'isConnected', { value: props.isConnected ?? true });

      if (props.isConnected !== false) {
        document.body.appendChild(image);
      }

      detector.startDetection();

      expect(detector.getDetectedImages()).not.toContain(image);
      
      if (props.isConnected !== false) {
        document.body.removeChild(image);
      }
      
      detector.stopDetection();
    });
  });

  it('should handle configuration options correctly', () => {
    // Test custom class name
    const customConfig: DetectionConfig = {
      className: 'custom-room-image',
      observeChanges: true,
      debounceMs: 200,
      debug: true
    };

    detector = new ImageDetector(customConfig);

    // Create images with different class names
    const customImage = document.createElement('img');
    customImage.className = 'custom-room-image';
    customImage.src = 'custom.jpg';
    
    const standardImage = document.createElement('img');
    standardImage.className = 'editable-room';
    standardImage.src = 'standard.jpg';

    // Mock both images
    [customImage, standardImage].forEach(img => {
      Object.defineProperty(img, 'complete', { value: true });
      Object.defineProperty(img, 'naturalWidth', { value: 100 });
      Object.defineProperty(img, 'offsetWidth', { value: 100 });
      Object.defineProperty(img, 'offsetHeight', { value: 100 });
      
      // Mock getBoundingClientRect
      img.getBoundingClientRect = jest.fn(() => ({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        top: 0,
        left: 0,
        bottom: 100,
        right: 100,
        toJSON: () => ({})
      }));
      
      document.body.appendChild(img);
    });

    detector.startDetection();

    // Should only detect the custom class image
    expect(detector.getDetectedImages()).toContain(customImage);
    expect(detector.getDetectedImages()).not.toContain(standardImage);
    expect(detector.getDetectedImages()).toHaveLength(1);
  });
});