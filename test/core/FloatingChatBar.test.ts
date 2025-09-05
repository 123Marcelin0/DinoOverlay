import { FloatingChatBar } from '../../src/core/FloatingChatBar';
import { ChatBarProps, OverlayState, SelectedImage } from '../../src/types/overlay';

// Mock DOM methods and classes
Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
  configurable: true,
  value: 100,
});

// Mock DOMRect
global.DOMRect = class DOMRect {
  x: number;
  y: number;
  width: number;
  height: number;
  top: number;
  right: number;
  bottom: number;
  left: number;

  constructor(x = 0, y = 0, width = 0, height = 0) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.top = y;
    this.right = x + width;
    this.bottom = y + height;
    this.left = x;
  }

  toJSON() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      top: this.top,
      right: this.right,
      bottom: this.bottom,
      left: this.left,
    };
  }
};

describe('FloatingChatBar', () => {
  let chatBar: FloatingChatBar;
  let mockProps: ChatBarProps;
  let mockSelectedImage: SelectedImage;

  beforeEach(() => {
    // Create mock selected image
    const mockImageElement = document.createElement('img');
    mockImageElement.className = 'editable-room';
    mockSelectedImage = {
      element: mockImageElement,
      rect: new DOMRect(100, 100, 200, 150),
      borderRadius: '8px'
    };

    // Create mock props
    mockProps = {
      visible: true,
      selectedImage: mockSelectedImage,
      onSubmit: jest.fn(),
      onClose: jest.fn(),
      isProcessing: false,
      placeholder: 'Test placeholder'
    };

    chatBar = new FloatingChatBar(mockProps);
  });

  afterEach(() => {
    if (chatBar) {
      chatBar.destroy();
    }
    jest.clearAllMocks();
  });

  describe('Component Lifecycle', () => {
    test('should render chat bar element', () => {
      const element = chatBar.render();
      
      expect(element).toBeInstanceOf(HTMLElement);
      expect(element.className).toContain('fixed');
      expect(element.className).toContain('z-50');
    });

    test('should render only once', () => {
      const element1 = chatBar.render();
      const element2 = chatBar.render();
      
      expect(element1).toBe(element2);
    });

    test('should destroy properly', () => {
      const element = chatBar.render();
      document.body.appendChild(element);
      
      chatBar.destroy();
      
      expect(document.body.contains(element)).toBe(false);
    });
  });

  describe('Chat Bar Structure', () => {
    test('should contain input element', () => {
      const element = chatBar.render();
      const input = element.querySelector('input[type="text"]');
      
      expect(input).toBeInstanceOf(HTMLInputElement);
      expect(input?.className).toContain('glass-input');
    });

    test('should contain send button', () => {
      const element = chatBar.render();
      const button = element.querySelector('button');
      
      expect(button).toBeInstanceOf(HTMLButtonElement);
      expect(button?.innerHTML).toContain('svg');
    });

    test('should contain typing indicator', () => {
      const element = chatBar.render();
      const indicator = element.querySelector('.animate-bounce');
      
      expect(indicator).toBeInstanceOf(HTMLElement);
    });

    test('should have glassmorphic styling', () => {
      const element = chatBar.render();
      const chatBarPanel = element.querySelector('.glass-panel');
      
      expect(chatBarPanel).toBeInstanceOf(HTMLElement);
      expect(chatBarPanel?.className).toContain('glass-panel');
    });
  });

  describe('Positioning', () => {
    test('should position in bottom-right corner', () => {
      const element = chatBar.render();
      
      expect(element.style.cssText).toContain('bottom: 20px');
      expect(element.style.cssText).toContain('right: 20px');
    });

    test('should be fixed positioned', () => {
      const element = chatBar.render();
      
      expect(element.className).toContain('fixed');
    });
  });

  describe('Visibility Management', () => {
    test('should be visible when props.visible is true and image is selected', () => {
      const element = chatBar.render();
      
      expect(element.style.opacity).toBe('1');
      expect(element.style.pointerEvents).toBe('auto');
    });

    test('should be hidden when props.visible is false', () => {
      mockProps.visible = false;
      chatBar = new FloatingChatBar(mockProps);
      const element = chatBar.render();
      
      expect(element.style.opacity).toBe('0');
      expect(element.style.pointerEvents).toBe('none');
    });

    test('should be hidden when no image is selected', () => {
      mockProps.selectedImage = null;
      chatBar = new FloatingChatBar(mockProps);
      const element = chatBar.render();
      
      expect(element.style.opacity).toBe('0');
      expect(element.style.pointerEvents).toBe('none');
    });

    test('should update visibility when state changes', () => {
      const element = chatBar.render();
      
      // Initially visible
      expect(element.style.opacity).toBe('1');
      
      // Update to hidden
      const newState: OverlayState = {
        selectedImage: mockSelectedImage,
        sidebarVisible: false,
        chatBarVisible: false,
        isProcessing: false,
        currentAction: null
      };
      
      chatBar.update(newState);
      expect(element.style.opacity).toBe('0');
    });
  });

  describe('Input Handling', () => {
    test('should set placeholder text', () => {
      const element = chatBar.render();
      const input = element.querySelector('input') as HTMLInputElement;
      
      expect(input.placeholder).toBe('Test placeholder');
    });

    test('should update placeholder when no image selected', () => {
      const element = chatBar.render();
      const input = element.querySelector('input') as HTMLInputElement;
      
      chatBar.updateProps({ selectedImage: null });
      
      expect(input.placeholder).toBe('Select an image first...');
    });

    test('should enable send button when input has text', () => {
      const element = chatBar.render();
      const input = element.querySelector('input') as HTMLInputElement;
      const button = element.querySelector('button') as HTMLButtonElement;
      
      // Initially disabled
      expect(button.disabled).toBe(true);
      
      // Type text
      input.value = 'test message';
      input.dispatchEvent(new Event('input'));
      
      expect(button.disabled).toBe(false);
    });

    test('should disable send button when input is empty', () => {
      const element = chatBar.render();
      const input = element.querySelector('input') as HTMLInputElement;
      const button = element.querySelector('button') as HTMLButtonElement;
      
      // Add text first
      input.value = 'test';
      input.dispatchEvent(new Event('input'));
      expect(button.disabled).toBe(false);
      
      // Clear text
      input.value = '';
      input.dispatchEvent(new Event('input'));
      expect(button.disabled).toBe(true);
    });

    test('should focus input when shown', (done) => {
      const element = chatBar.render();
      const input = element.querySelector('input') as HTMLInputElement;
      
      // Mock focus method
      const focusSpy = jest.spyOn(input, 'focus');
      
      chatBar.focusInput();
      
      setTimeout(() => {
        expect(focusSpy).toHaveBeenCalled();
        done();
      }, 150);
    });

    test('should clear input', () => {
      const element = chatBar.render();
      const input = element.querySelector('input') as HTMLInputElement;
      
      input.value = 'test message';
      chatBar.clearInput();
      
      expect(input.value).toBe('');
    });
  });

  describe('Message Submission', () => {
    test('should call onSubmit when Enter key is pressed', () => {
      const element = chatBar.render();
      const input = element.querySelector('input') as HTMLInputElement;
      
      input.value = 'test message';
      
      const enterEvent = new KeyboardEvent('keypress', { key: 'Enter' });
      input.dispatchEvent(enterEvent);
      
      expect(mockProps.onSubmit).toHaveBeenCalledWith('test message');
    });

    test('should call onSubmit when send button is clicked', () => {
      const element = chatBar.render();
      const input = element.querySelector('input') as HTMLInputElement;
      const button = element.querySelector('button') as HTMLButtonElement;
      
      input.value = 'test message';
      input.dispatchEvent(new Event('input')); // Enable button
      
      button.click();
      
      expect(mockProps.onSubmit).toHaveBeenCalledWith('test message');
    });

    test('should not submit empty messages', () => {
      const element = chatBar.render();
      const input = element.querySelector('input') as HTMLInputElement;
      
      input.value = '   '; // Only whitespace
      
      const enterEvent = new KeyboardEvent('keypress', { key: 'Enter' });
      input.dispatchEvent(enterEvent);
      
      expect(mockProps.onSubmit).not.toHaveBeenCalled();
    });

    test('should not submit when no image is selected', () => {
      mockProps.selectedImage = null;
      chatBar = new FloatingChatBar(mockProps);
      
      const element = chatBar.render();
      const input = element.querySelector('input') as HTMLInputElement;
      
      input.value = 'test message';
      
      const enterEvent = new KeyboardEvent('keypress', { key: 'Enter' });
      input.dispatchEvent(enterEvent);
      
      expect(mockProps.onSubmit).not.toHaveBeenCalled();
    });

    test('should clear input after successful submission', () => {
      const element = chatBar.render();
      const input = element.querySelector('input') as HTMLInputElement;
      
      input.value = 'test message';
      
      const enterEvent = new KeyboardEvent('keypress', { key: 'Enter' });
      input.dispatchEvent(enterEvent);
      
      expect(input.value).toBe('');
    });

    test('should call onClose when Escape key is pressed', () => {
      const element = chatBar.render();
      const input = element.querySelector('input') as HTMLInputElement;
      
      const escapeEvent = new KeyboardEvent('keypress', { key: 'Escape' });
      input.dispatchEvent(escapeEvent);
      
      expect(mockProps.onClose).toHaveBeenCalled();
    });
  });

  describe('Processing State', () => {
    test('should show typing indicator when processing', () => {
      const element = chatBar.render();
      
      chatBar.updateProps({ isProcessing: true });
      
      const indicator = element.querySelector('.animate-bounce')?.parentElement?.parentElement;
      expect(indicator?.classList.contains('hidden')).toBe(false);
      expect(indicator?.classList.contains('flex')).toBe(true);
    });

    test('should hide typing indicator when not processing', () => {
      const element = chatBar.render();
      
      // First set processing to true
      chatBar.updateProps({ isProcessing: true });
      let indicator = element.querySelector('.animate-bounce')?.parentElement?.parentElement;
      expect(indicator?.classList.contains('hidden')).toBe(false);
      expect(indicator?.classList.contains('flex')).toBe(true);
      
      // Then set to false
      chatBar.updateProps({ isProcessing: false });
      indicator = element.querySelector('.animate-bounce')?.parentElement?.parentElement;
      
      expect(indicator?.classList.contains('hidden')).toBe(true);
      expect(indicator?.classList.contains('flex')).toBe(false);
    });

    test('should disable input when processing', () => {
      const element = chatBar.render();
      const input = element.querySelector('input') as HTMLInputElement;
      
      chatBar.updateProps({ isProcessing: true });
      
      expect(input.disabled).toBe(true);
      expect(input.style.opacity).toBe('0.6');
    });

    test('should disable send button when processing', () => {
      const element = chatBar.render();
      const input = element.querySelector('input') as HTMLInputElement;
      const button = element.querySelector('button') as HTMLButtonElement;
      
      // Add text to enable button first
      input.value = 'test';
      input.dispatchEvent(new Event('input'));
      expect(button.disabled).toBe(false);
      
      // Set processing state
      chatBar.updateProps({ isProcessing: true });
      
      expect(button.disabled).toBe(true);
    });

    test('should not submit when processing', () => {
      const element = chatBar.render();
      const input = element.querySelector('input') as HTMLInputElement;
      
      input.value = 'test message';
      chatBar.updateProps({ isProcessing: true });
      
      const enterEvent = new KeyboardEvent('keypress', { key: 'Enter' });
      input.dispatchEvent(enterEvent);
      
      expect(mockProps.onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('State Updates', () => {
    test('should update from overlay state', () => {
      const element = chatBar.render();
      
      const newState: OverlayState = {
        selectedImage: mockSelectedImage,
        sidebarVisible: true,
        chatBarVisible: true,
        isProcessing: true,
        currentAction: 'editing'
      };
      
      chatBar.update(newState);
      
      const input = element.querySelector('input') as HTMLInputElement;
      const indicator = element.querySelector('.animate-bounce')?.parentElement;
      
      expect(input.disabled).toBe(true);
      expect(indicator?.classList.contains('hidden')).toBe(false);
    });

    test('should handle multiple prop updates', () => {
      const element = chatBar.render();
      
      chatBar.updateProps({ 
        visible: false,
        isProcessing: true,
        placeholder: 'New placeholder'
      });
      
      const input = element.querySelector('input') as HTMLInputElement;
      
      expect(element.style.opacity).toBe('0');
      expect(input.disabled).toBe(true);
      expect(input.placeholder).toBe('New placeholder');
    });
  });

  describe('Animation and Transitions', () => {
    test('should have transition classes', () => {
      const element = chatBar.render();
      
      expect(element.className).toContain('transition-all');
      expect(element.className).toContain('duration-300');
      expect(element.className).toContain('ease-out');
    });

    test('should animate show/hide transitions', (done) => {
      const element = chatBar.render();
      document.body.appendChild(element);
      
      // Initially hidden
      chatBar.updateProps({ visible: false });
      expect(element.style.opacity).toBe('0');
      
      // Show with animation
      chatBar.updateProps({ visible: true });
      
      setTimeout(() => {
        expect(element.style.opacity).toBe('1');
        done();
      }, 50);
    });
  });

  describe('Accessibility', () => {
    test('should have proper input attributes', () => {
      const element = chatBar.render();
      const input = element.querySelector('input') as HTMLInputElement;
      
      expect(input.type).toBe('text');
      expect(input.placeholder).toBeTruthy();
    });

    test('should handle keyboard navigation', () => {
      const element = chatBar.render();
      const input = element.querySelector('input') as HTMLInputElement;
      
      // Should handle Enter for submission
      input.value = 'test';
      const enterEvent = new KeyboardEvent('keypress', { key: 'Enter' });
      input.dispatchEvent(enterEvent);
      
      expect(mockProps.onSubmit).toHaveBeenCalled();
      
      // Should handle Escape for closing
      const escapeEvent = new KeyboardEvent('keypress', { key: 'Escape' });
      input.dispatchEvent(escapeEvent);
      
      expect(mockProps.onClose).toHaveBeenCalled();
    });

    test('should prevent form submission on Shift+Enter', () => {
      const element = chatBar.render();
      const input = element.querySelector('input') as HTMLInputElement;
      
      input.value = 'test message';
      
      const shiftEnterEvent = new KeyboardEvent('keypress', { 
        key: 'Enter', 
        shiftKey: true 
      });
      
      const preventDefaultSpy = jest.spyOn(shiftEnterEvent, 'preventDefault');
      input.dispatchEvent(shiftEnterEvent);
      
      expect(preventDefaultSpy).not.toHaveBeenCalled();
      expect(mockProps.onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle missing DOM elements gracefully', () => {
      chatBar.destroy();
      
      // These should not throw errors
      expect(() => {
        chatBar.focusInput();
        chatBar.clearInput();
        chatBar.updateProps({ visible: false });
      }).not.toThrow();
    });

    test('should handle invalid state updates', () => {
      const element = chatBar.render();
      
      expect(() => {
        chatBar.update({} as OverlayState);
      }).not.toThrow();
    });
  });
});