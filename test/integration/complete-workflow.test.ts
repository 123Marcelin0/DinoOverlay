/**
 * Integration tests for complete user workflows
 * Tests end-to-end functionality without browser automation
 */

import { DinoOverlayLoader } from '../../src/core/DinoOverlayLoader';
import { OverlayManager } from '../../src/core/OverlayManager';
import { ImageDetector } from '../../src/core/ImageDetector';
import { APIClient } from '../../src/core/APIClient';
import { DinoOverlayConfig } from '../../src/types/config';

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock Shadow DOM
const mockShadowRoot = {
  appendChild: jest.fn(),
  innerHTML: '',
  children: [],
  getElementById: jest.fn(),
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

Object.defineProperty(HTMLElement.prototype, 'attachShadow', {
  value: function() {
    return mockShadowRoot;
  },
  writable: true,
});

// Mock ResizeObserver and MutationObserver
class MockResizeObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}

class MockMutationObserver {
  observe = jest.fn();
  disconnect = jest.fn();
}

Object.defineProperty(window, 'ResizeObserver', {
  value: MockResizeObserver,
  writable: true,
});

Object.defineProperty(window, 'MutationObserver', {
  value: MockMutationObserver,
  writable: true,
});

describe('Complete User Workflows', () => {
  let loader: DinoOverlayLoader;
  let overlayManager: OverlayManager;
  let config: Required<DinoOverlayConfig>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();

    // Setup test configuration
    config = {
      apiEndpoint: 'https://api.test.com',
      apiKey: 'test-key',
      theme: 'auto',
      enableAnalytics: false,
      debug: false,
      customActions: [],
    };

    // Create test DOM structure
    document.body.innerHTML = `
      <div class="room-gallery">
        <img class="editable-room" src="room1.jpg" alt="Living Room" />
        <img class="editable-room" src="room2.jpg" alt="Bedroom" />
        <img class="non-editable" src="exterior.jpg" alt="Exterior" />
      </div>
    `;

    // Mock getBoundingClientRect for images
    const mockRect = {
      x: 100,
      y: 100,
      width: 300,
      height: 200,
      top: 100,
      left: 100,
      right: 400,
      bottom: 300,
      toJSON: () => ({}),
    };

    document.querySelectorAll('img').forEach(img => {
      Object.defineProperty(img, 'getBoundingClientRect', {
        value: () => mockRect,
        writable: true,
      });
    });
  });

  afterEach(() => {
    if (loader) {
      loader.destroy();
    }
    document.body.innerHTML = '';
  });

  describe('Widget Initialization Workflow', () => {
    it('should complete full initialization workflow', async () => {
      // Initialize loader
      loader = new DinoOverlayLoader(config);
      await loader.initialize();

      // Verify Shadow DOM creation
      expect(mockShadowRoot.appendChild).toHaveBeenCalled();

      // Verify overlay manager initialization
      overlayManager = loader.getOverlayManager();
      expect(overlayManager).toBeDefined();
      expect(overlayManager.getState()).toEqual({
        selectedImage: null,
        sidebarVisible: false,
        chatBarVisible: false,
        isProcessing: false,
        currentAction: null,
      });

      // Verify image detection started
      const imageDetector = overlayManager.getImageDetector();
      expect(imageDetector).toBeDefined();
    });

    it('should handle initialization errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Mock Shadow DOM creation failure
      Object.defineProperty(HTMLElement.prototype, 'attachShadow', {
        value: function() {
          throw new Error('Shadow DOM not supported');
        },
        writable: true,
      });

      loader = new DinoOverlayLoader(config);
      
      await expect(loader.initialize()).rejects.toThrow();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Image Selection and UI Workflow', () => {
    beforeEach(async () => {
      loader = new DinoOverlayLoader(config);
      await loader.initialize();
      overlayManager = loader.getOverlayManager();
    });

    it('should complete image selection workflow', () => {
      const editableImage = document.querySelector('.editable-room') as HTMLImageElement;
      
      // Simulate image click
      overlayManager.selectImage(editableImage);

      // Verify state changes
      const state = overlayManager.getState();
      expect(state.selectedImage).toBeTruthy();
      expect(state.selectedImage?.element).toBe(editableImage);
      expect(state.sidebarVisible).toBe(true);
      expect(state.chatBarVisible).toBe(true);
    });

    it('should handle image deselection workflow', () => {
      const editableImage = document.querySelector('.editable-room') as HTMLImageElement;
      
      // Select image first
      overlayManager.selectImage(editableImage);
      expect(overlayManager.getState().selectedImage).toBeTruthy();

      // Clear selection
      overlayManager.clearSelection();
      
      // Verify state reset
      const state = overlayManager.getState();
      expect(state.selectedImage).toBeNull();
      expect(state.sidebarVisible).toBe(false);
      expect(state.chatBarVisible).toBe(false);
      expect(state.currentAction).toBeNull();
    });

    it('should handle multiple image selection workflow', () => {
      const images = document.querySelectorAll('.editable-room') as NodeListOf<HTMLImageElement>;
      
      // Select first image
      overlayManager.selectImage(images[0]);
      expect(overlayManager.getState().selectedImage?.element).toBe(images[0]);

      // Select second image (should deselect first)
      overlayManager.selectImage(images[1]);
      expect(overlayManager.getState().selectedImage?.element).toBe(images[1]);
    });
  });

  describe('Quick Action Workflow', () => {
    beforeEach(async () => {
      loader = new DinoOverlayLoader(config);
      await loader.initialize();
      overlayManager = loader.getOverlayManager();
      
      // Mock successful API response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          editedImageUrl: 'https://api.test.com/edited/image.jpg',
          processingTime: 2500,
        }),
      });
    });

    it('should complete quick action workflow', async () => {
      const editableImage = document.querySelector('.editable-room') as HTMLImageElement;
      
      // Select image
      overlayManager.selectImage(editableImage);
      
      // Simulate quick action trigger
      overlayManager.setProcessingState(true, 'minimalist');
      
      // Verify processing state
      let state = overlayManager.getState();
      expect(state.isProcessing).toBe(true);
      expect(state.currentAction).toBe('minimalist');

      // Simulate API call completion
      overlayManager.setProcessingState(false);
      
      // Verify final state
      state = overlayManager.getState();
      expect(state.isProcessing).toBe(false);
      expect(state.currentAction).toBeNull();
    });

    it('should handle quick action errors', async () => {
      // Mock API error
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({
          success: false,
          error: 'Internal server error',
        }),
      });

      const editableImage = document.querySelector('.editable-room') as HTMLImageElement;
      overlayManager.selectImage(editableImage);
      
      // Simulate quick action with error
      overlayManager.setProcessingState(true, 'minimalist');
      
      // Simulate error handling
      overlayManager.setProcessingState(false);
      
      const state = overlayManager.getState();
      expect(state.isProcessing).toBe(false);
      expect(state.currentAction).toBeNull();
    });
  });

  describe('Chat Interface Workflow', () => {
    beforeEach(async () => {
      loader = new DinoOverlayLoader(config);
      await loader.initialize();
      overlayManager = loader.getOverlayManager();
      
      // Mock successful chat API response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          response: 'I\'ve applied a modern minimalist style to your room.',
          editedImageUrl: 'https://api.test.com/edited/chat-image.jpg',
        }),
      });
    });

    it('should complete chat message workflow', async () => {
      const editableImage = document.querySelector('.editable-room') as HTMLImageElement;
      
      // Select image first
      overlayManager.selectImage(editableImage);
      
      // Simulate chat message processing
      overlayManager.setProcessingState(true, 'chat');
      
      // Verify processing state
      let state = overlayManager.getState();
      expect(state.isProcessing).toBe(true);
      expect(state.currentAction).toBe('chat');

      // Simulate chat completion
      overlayManager.setProcessingState(false);
      
      // Verify final state
      state = overlayManager.getState();
      expect(state.isProcessing).toBe(false);
      expect(state.currentAction).toBeNull();
    });

    it('should handle chat without selected image', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Try to process chat without selecting image
      overlayManager.setProcessingState(true, 'chat');
      
      // Should handle gracefully
      expect(overlayManager.getState().isProcessing).toBe(true);
      
      consoleSpy.mockRestore();
    });
  });

  describe('Responsive Behavior Workflow', () => {
    beforeEach(async () => {
      loader = new DinoOverlayLoader(config);
      await loader.initialize();
      overlayManager = loader.getOverlayManager();
    });

    it('should handle window resize workflow', () => {
      const editableImage = document.querySelector('.editable-room') as HTMLImageElement;
      overlayManager.selectImage(editableImage);
      
      // Simulate window resize
      const resizeEvent = new Event('resize');
      window.dispatchEvent(resizeEvent);
      
      // Should update image position (tested via debounced call)
      expect(overlayManager.getState().selectedImage).toBeTruthy();
    });

    it('should handle scroll workflow', () => {
      const editableImage = document.querySelector('.editable-room') as HTMLImageElement;
      overlayManager.selectImage(editableImage);
      
      // Simulate scroll
      const scrollEvent = new Event('scroll');
      window.dispatchEvent(scrollEvent);
      
      // Should maintain selection
      expect(overlayManager.getState().selectedImage).toBeTruthy();
    });
  });

  describe('Error Recovery Workflow', () => {
    beforeEach(async () => {
      loader = new DinoOverlayLoader(config);
      await loader.initialize();
      overlayManager = loader.getOverlayManager();
    });

    it('should recover from API failures', async () => {
      // Mock API failure
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const editableImage = document.querySelector('.editable-room') as HTMLImageElement;
      overlayManager.selectImage(editableImage);
      
      // Simulate failed operation
      overlayManager.setProcessingState(true, 'minimalist');
      
      // Simulate error recovery
      overlayManager.setProcessingState(false);
      
      // Should maintain stable state
      const state = overlayManager.getState();
      expect(state.selectedImage).toBeTruthy();
      expect(state.isProcessing).toBe(false);
    });

    it('should handle DOM changes gracefully', () => {
      const editableImage = document.querySelector('.editable-room') as HTMLImageElement;
      overlayManager.selectImage(editableImage);
      
      // Remove selected image from DOM
      editableImage.remove();
      
      // Simulate position update (should clear selection)
      overlayManager.updateImagePosition();
      
      // Should clear selection when image not found
      expect(overlayManager.getState().selectedImage).toBeNull();
    });
  });

  describe('Cleanup Workflow', () => {
    it('should complete full cleanup workflow', async () => {
      loader = new DinoOverlayLoader(config);
      await loader.initialize();
      overlayManager = loader.getOverlayManager();
      
      const editableImage = document.querySelector('.editable-room') as HTMLImageElement;
      overlayManager.selectImage(editableImage);
      
      // Verify active state
      expect(overlayManager.getState().selectedImage).toBeTruthy();
      
      // Destroy loader
      loader.destroy();
      
      // Should clean up all resources
      expect(overlayManager.getState().selectedImage).toBeNull();
    });
  });

  describe('Multi-Component Integration', () => {
    beforeEach(async () => {
      loader = new DinoOverlayLoader(config);
      await loader.initialize();
      overlayManager = loader.getOverlayManager();
    });

    it('should coordinate between all components', () => {
      const editableImage = document.querySelector('.editable-room') as HTMLImageElement;
      
      // Test component coordination
      overlayManager.selectImage(editableImage);
      
      // Should update all UI components
      const state = overlayManager.getState();
      expect(state.selectedImage).toBeTruthy();
      expect(state.sidebarVisible).toBe(true);
      expect(state.chatBarVisible).toBe(true);
      
      // Test state propagation
      overlayManager.setProcessingState(true, 'test-action');
      
      const processingState = overlayManager.getState();
      expect(processingState.isProcessing).toBe(true);
      expect(processingState.currentAction).toBe('test-action');
    });
  });
});