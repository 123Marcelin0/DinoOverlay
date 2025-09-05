import { OverlayManager, Component, OverlayManagerEvents } from '../../src/core/OverlayManager';
import { ImageDetector } from '../../src/core/ImageDetector';
import { OverlayState, SelectedImage } from '../../src/types/overlay';
import { DinoOverlayConfig } from '../../src/types/config';

// Mock ResizeObserver
class MockResizeObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}

// Mock MutationObserver
class MockMutationObserver {
  observe = jest.fn();
  disconnect = jest.fn();
}

// Setup global mocks
Object.defineProperty(window, 'ResizeObserver', {
  value: MockResizeObserver,
  writable: true,
});

Object.defineProperty(window, 'MutationObserver', {
  value: MockMutationObserver,
  writable: true,
});

// Mock setTimeout and clearTimeout
jest.useFakeTimers();

describe('OverlayManager', () => {
  let overlayManager: OverlayManager;
  let mockShadowRoot: ShadowRoot;
  let mockConfig: Required<DinoOverlayConfig>;
  let mockImageDetector: jest.Mocked<ImageDetector>;
  let mockImage: HTMLImageElement;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    jest.clearAllTimers();

    // Create mock shadow root
    mockShadowRoot = {
      contains: jest.fn().mockReturnValue(false),
    } as any;

    // Create mock config
    mockConfig = {
      apiEndpoint: 'https://api.test.com',
      apiKey: 'test-key',
      theme: 'auto',
      enableAnalytics: false,
      debug: false,
      customActions: [],
    };

    // Create mock image element
    mockImage = {
      getBoundingClientRect: jest.fn().mockReturnValue({
        x: 100,
        y: 100,
        width: 200,
        height: 150,
        top: 100,
        left: 100,
        right: 300,
        bottom: 250,
      }),
      classList: {
        contains: jest.fn().mockReturnValue(true),
      },
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    } as any;

    // Create mock ImageDetector
    mockImageDetector = {
      startDetection: jest.fn(),
      destroy: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      createSelectedImage: jest.fn().mockReturnValue({
        element: mockImage,
        rect: mockImage.getBoundingClientRect(),
        borderRadius: '8px',
      }),
      calculateImageBounds: jest.fn().mockReturnValue(
        mockImage.getBoundingClientRect()
      ),
      getDetectedImages: jest.fn().mockReturnValue([]),
      isImageDetected: jest.fn().mockReturnValue(false),
      getImageBorderRadius: jest.fn().mockReturnValue('8px'),
      stopDetection: jest.fn(),
    } as any;

    // Mock the ImageDetector constructor
    jest.spyOn(ImageDetector.prototype, 'startDetection').mockImplementation(mockImageDetector.startDetection);
    jest.spyOn(ImageDetector.prototype, 'destroy').mockImplementation(mockImageDetector.destroy);
    jest.spyOn(ImageDetector.prototype, 'on').mockImplementation(mockImageDetector.on);
    jest.spyOn(ImageDetector.prototype, 'off').mockImplementation(mockImageDetector.off);
    jest.spyOn(ImageDetector.prototype, 'createSelectedImage').mockImplementation(mockImageDetector.createSelectedImage);
    jest.spyOn(ImageDetector.prototype, 'calculateImageBounds').mockImplementation(mockImageDetector.calculateImageBounds);

    // Create overlay manager instance
    overlayManager = new OverlayManager(mockShadowRoot, mockConfig);
  });

  afterEach(() => {
    if (overlayManager) {
      overlayManager.destroy();
    }
    jest.restoreAllMocks();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.useFakeTimers();
  });

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const state = overlayManager.getState();
      
      expect(state).toEqual({
        selectedImage: null,
        sidebarVisible: false,
        chatBarVisible: false,
        isProcessing: false,
        currentAction: null,
      });
    });

    it('should start image detection on initialize', () => {
      overlayManager.initialize();
      
      expect(mockImageDetector.startDetection).toHaveBeenCalled();
    });

    it('should setup event listeners on initialize', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      const documentAddEventListenerSpy = jest.spyOn(document, 'addEventListener');
      
      overlayManager.initialize();
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function), { passive: true });
      expect(addEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function), { passive: true });
      expect(documentAddEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function));
    });

    it('should throw error when initializing destroyed manager', () => {
      overlayManager.destroy();
      
      expect(() => overlayManager.initialize()).toThrow('OverlayManager has been destroyed');
    });
  });

  describe('State Management', () => {
    beforeEach(() => {
      overlayManager.initialize();
    });

    it('should update state correctly', () => {
      const stateChangedCallback = jest.fn();
      overlayManager.on('stateChanged', stateChangedCallback);

      const updates = { sidebarVisible: true, isProcessing: true };
      overlayManager.setState(updates);

      const newState = overlayManager.getState();
      expect(newState.sidebarVisible).toBe(true);
      expect(newState.isProcessing).toBe(true);
      expect(stateChangedCallback).toHaveBeenCalledWith(
        newState,
        expect.objectContaining({ sidebarVisible: false, isProcessing: false })
      );
    });

    it('should not update state when destroyed', () => {
      overlayManager.destroy();
      
      const initialState = overlayManager.getState();
      overlayManager.setState({ sidebarVisible: true });
      
      expect(overlayManager.getState()).toEqual(initialState);
    });

    it('should emit state change events', () => {
      const stateChangedCallback = jest.fn();
      overlayManager.on('stateChanged', stateChangedCallback);

      overlayManager.setState({ currentAction: 'test-action' });

      expect(stateChangedCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('Image Selection', () => {
    beforeEach(() => {
      overlayManager.initialize();
    });

    it('should select image correctly', () => {
      const imageSelectedCallback = jest.fn();
      overlayManager.on('imageSelected', imageSelectedCallback);

      overlayManager.selectImage(mockImage);

      const state = overlayManager.getState();
      expect(state.selectedImage).toBeTruthy();
      expect(state.selectedImage?.element).toBe(mockImage);
      expect(state.sidebarVisible).toBe(true);
      expect(state.chatBarVisible).toBe(true);
      expect(imageSelectedCallback).toHaveBeenCalledWith(expect.objectContaining({
        element: mockImage,
      }));
    });

    it('should emit imageDeselected when selecting new image', () => {
      const imageDeselectedCallback = jest.fn();
      overlayManager.on('imageDeselected', imageDeselectedCallback);

      // Select first image
      overlayManager.selectImage(mockImage);
      
      // Select second image
      const mockImage2 = { ...mockImage } as HTMLImageElement;
      mockImageDetector.createSelectedImage.mockReturnValueOnce({
        element: mockImage2,
        rect: mockImage2.getBoundingClientRect(),
        borderRadius: '4px',
      });
      
      overlayManager.selectImage(mockImage2);

      expect(imageDeselectedCallback).toHaveBeenCalledWith(expect.objectContaining({
        element: mockImage,
      }));
    });

    it('should clear selection correctly', () => {
      const imageDeselectedCallback = jest.fn();
      overlayManager.on('imageDeselected', imageDeselectedCallback);

      // First select an image
      overlayManager.selectImage(mockImage);
      expect(overlayManager.getState().selectedImage).toBeTruthy();

      // Then clear selection
      overlayManager.clearSelection();

      const state = overlayManager.getState();
      expect(state.selectedImage).toBeNull();
      expect(state.sidebarVisible).toBe(false);
      expect(state.chatBarVisible).toBe(false);
      expect(state.currentAction).toBeNull();
      expect(imageDeselectedCallback).toHaveBeenCalled();
    });

    it('should handle selection errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockImageDetector.createSelectedImage.mockImplementation(() => {
        throw new Error('Test error');
      });

      overlayManager.selectImage(mockImage);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[OverlayManager] Failed to select image:',
        expect.any(Error)
      );
      expect(overlayManager.getState().selectedImage).toBeNull();

      consoleSpy.mockRestore();
    });
  });

  describe('Image Position Tracking', () => {
    beforeEach(() => {
      overlayManager.initialize();
      overlayManager.selectImage(mockImage);
    });

    it('should update image position', () => {
      const imagePositionUpdatedCallback = jest.fn();
      overlayManager.on('imagePositionUpdated', imagePositionUpdatedCallback);

      const newRect = {
        x: 150,
        y: 150,
        width: 200,
        height: 150,
        top: 150,
        left: 150,
        right: 350,
        bottom: 300,
      };
      mockImageDetector.calculateImageBounds.mockReturnValue(newRect);

      overlayManager.updateImagePosition();

      const state = overlayManager.getState();
      expect(state.selectedImage?.rect).toEqual(newRect);
      expect(imagePositionUpdatedCallback).toHaveBeenCalledWith(
        expect.objectContaining({ rect: newRect })
      );
    });

    it('should clear selection when position update fails', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockImageDetector.calculateImageBounds.mockImplementation(() => {
        throw new Error('Image not found');
      });

      overlayManager.updateImagePosition();

      expect(overlayManager.getState().selectedImage).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should not update position when no image selected', () => {
      overlayManager.clearSelection();
      
      const imagePositionUpdatedCallback = jest.fn();
      overlayManager.on('imagePositionUpdated', imagePositionUpdatedCallback);

      overlayManager.updateImagePosition();

      expect(imagePositionUpdatedCallback).not.toHaveBeenCalled();
    });
  });

  describe('UI State Management', () => {
    beforeEach(() => {
      overlayManager.initialize();
    });

    it('should toggle sidebar visibility', () => {
      const sidebarToggledCallback = jest.fn();
      overlayManager.on('sidebarToggled', sidebarToggledCallback);

      overlayManager.setSidebarVisible(true);
      expect(overlayManager.getState().sidebarVisible).toBe(true);
      expect(sidebarToggledCallback).toHaveBeenCalledWith(true);

      overlayManager.setSidebarVisible(false);
      expect(overlayManager.getState().sidebarVisible).toBe(false);
      expect(sidebarToggledCallback).toHaveBeenCalledWith(false);
    });

    it('should not emit event when sidebar visibility unchanged', () => {
      const sidebarToggledCallback = jest.fn();
      overlayManager.on('sidebarToggled', sidebarToggledCallback);

      overlayManager.setSidebarVisible(false); // Already false
      expect(sidebarToggledCallback).not.toHaveBeenCalled();
    });

    it('should toggle chat bar visibility', () => {
      const chatBarToggledCallback = jest.fn();
      overlayManager.on('chatBarToggled', chatBarToggledCallback);

      overlayManager.setChatBarVisible(true);
      expect(overlayManager.getState().chatBarVisible).toBe(true);
      expect(chatBarToggledCallback).toHaveBeenCalledWith(true);
    });

    it('should set processing state', () => {
      const processingStateChangedCallback = jest.fn();
      overlayManager.on('processingStateChanged', processingStateChangedCallback);

      overlayManager.setProcessingState(true, 'test-action');
      
      const state = overlayManager.getState();
      expect(state.isProcessing).toBe(true);
      expect(state.currentAction).toBe('test-action');
      expect(processingStateChangedCallback).toHaveBeenCalledWith(true, 'test-action');

      overlayManager.setProcessingState(false);
      
      const newState = overlayManager.getState();
      expect(newState.isProcessing).toBe(false);
      expect(newState.currentAction).toBeNull();
    });
  });

  describe('Component Management', () => {
    let mockComponent: jest.Mocked<Component>;

    beforeEach(() => {
      overlayManager.initialize();
      
      mockComponent = {
        render: jest.fn().mockReturnValue(document.createElement('div')),
        destroy: jest.fn(),
        update: jest.fn(),
      };
    });

    it('should register component', () => {
      overlayManager.registerComponent('test-component', mockComponent);
      
      expect(overlayManager.getComponent('test-component')).toBe(mockComponent);
      expect(mockComponent.update).toHaveBeenCalledWith(overlayManager.getState());
    });

    it('should replace existing component', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const oldComponent = { ...mockComponent };
      
      overlayManager.registerComponent('test-component', oldComponent);
      overlayManager.registerComponent('test-component', mockComponent);
      
      expect(oldComponent.destroy).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        "[OverlayManager] Component 'test-component' already registered, replacing"
      );

      consoleSpy.mockRestore();
    });

    it('should unregister component', () => {
      overlayManager.registerComponent('test-component', mockComponent);
      overlayManager.unregisterComponent('test-component');
      
      expect(mockComponent.destroy).toHaveBeenCalled();
      expect(overlayManager.getComponent('test-component')).toBeUndefined();
    });

    it('should update all components when state changes', () => {
      overlayManager.registerComponent('test-component', mockComponent);
      
      overlayManager.setState({ sidebarVisible: true });
      
      expect(mockComponent.update).toHaveBeenCalledWith(
        expect.objectContaining({ sidebarVisible: true })
      );
    });

    it('should handle component update errors', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Register component first with working update
      overlayManager.registerComponent('test-component', mockComponent);
      
      // Then make update throw error
      mockComponent.update = jest.fn().mockImplementation(() => {
        throw new Error('Update error');
      });
      
      overlayManager.setState({ sidebarVisible: true });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[OverlayManager] Error updating component:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should throw error when registering component on destroyed manager', () => {
      overlayManager.destroy();
      
      expect(() => overlayManager.registerComponent('test', mockComponent))
        .toThrow('Cannot register component on destroyed OverlayManager');
    });
  });

  describe('Event System', () => {
    beforeEach(() => {
      overlayManager.initialize();
    });

    it('should add and remove event listeners', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      overlayManager.on('stateChanged', callback1);
      overlayManager.on('stateChanged', callback2);

      overlayManager.setState({ sidebarVisible: true });
      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();

      overlayManager.off('stateChanged', callback1);
      callback1.mockClear();
      callback2.mockClear();

      overlayManager.setState({ sidebarVisible: false });
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it('should handle event listener errors', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const errorCallback = jest.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });

      overlayManager.on('stateChanged', errorCallback);
      overlayManager.setState({ sidebarVisible: true });

      expect(consoleSpy).toHaveBeenCalledWith(
        '[OverlayManager] Error in stateChanged listener:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Global Event Handling', () => {
    beforeEach(() => {
      overlayManager.initialize();
      overlayManager.selectImage(mockImage);
    });

    it('should handle window resize', () => {
      const resizeEvent = new Event('resize');
      window.dispatchEvent(resizeEvent);
      
      jest.advanceTimersByTime(20);
      
      expect(mockImageDetector.calculateImageBounds).toHaveBeenCalled();
    });

    it('should handle window scroll', () => {
      const scrollEvent = new Event('scroll');
      window.dispatchEvent(scrollEvent);
      
      jest.advanceTimersByTime(20);
      
      expect(mockImageDetector.calculateImageBounds).toHaveBeenCalled();
    });

    it('should handle document click outside overlay', () => {
      overlayManager.setState({ sidebarVisible: true, chatBarVisible: true });
      
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        target: document.body,
      } as any);
      
      Object.defineProperty(clickEvent, 'target', {
        value: document.body,
        writable: false,
      });
      
      document.dispatchEvent(clickEvent);
      
      const state = overlayManager.getState();
      expect(state.sidebarVisible).toBe(false);
      expect(state.chatBarVisible).toBe(false);
    });

    it('should not close overlay when clicking on editable image', () => {
      overlayManager.setState({ sidebarVisible: true, chatBarVisible: true });
      
      const editableImage = document.createElement('img');
      editableImage.classList.add('editable-room');
      
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
      } as any);
      
      Object.defineProperty(clickEvent, 'target', {
        value: editableImage,
        writable: false,
      });
      
      document.dispatchEvent(clickEvent);
      
      const state = overlayManager.getState();
      expect(state.sidebarVisible).toBe(true);
      expect(state.chatBarVisible).toBe(true);
    });
  });

  describe('Destruction', () => {
    beforeEach(() => {
      overlayManager.initialize();
    });

    it('should clean up resources on destroy', () => {
      const mockComponent = {
        render: jest.fn().mockReturnValue(document.createElement('div')),
        destroy: jest.fn(),
        update: jest.fn(),
      };
      
      overlayManager.registerComponent('test-component', mockComponent);
      overlayManager.destroy();
      
      expect(mockImageDetector.destroy).toHaveBeenCalled();
      expect(mockComponent.destroy).toHaveBeenCalled();
    });

    it('should remove event listeners on destroy', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
      const documentRemoveEventListenerSpy = jest.spyOn(document, 'removeEventListener');
      
      overlayManager.destroy();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
      expect(documentRemoveEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function));
    });

    it('should be safe to call destroy multiple times', () => {
      overlayManager.destroy();
      overlayManager.destroy(); // Should not throw
      
      expect(mockImageDetector.destroy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Getters', () => {
    beforeEach(() => {
      overlayManager.initialize();
    });

    it('should return image detector', () => {
      const imageDetector = overlayManager.getImageDetector();
      expect(imageDetector).toBeInstanceOf(ImageDetector);
    });

    it('should return shadow root', () => {
      expect(overlayManager.getShadowRoot()).toBe(mockShadowRoot);
    });

    it('should return config copy', () => {
      const config = overlayManager.getConfig();
      expect(config).toEqual(mockConfig);
      expect(config).not.toBe(mockConfig); // Should be a copy
    });
  });
});