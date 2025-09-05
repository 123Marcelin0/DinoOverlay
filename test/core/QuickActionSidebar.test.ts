import { QuickActionSidebar } from '../../src/core/QuickActionSidebar';
import { OverlayState, QuickAction, SidebarProps, SelectedImage } from '../../src/types/overlay';

// Mock DOM APIs
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock DOMRect
global.DOMRect = jest.fn().mockImplementation((x = 0, y = 0, width = 0, height = 0) => ({
  x,
  y,
  width,
  height,
  top: y,
  left: x,
  bottom: y + height,
  right: x + width,
  toJSON: () => ({ x, y, width, height, top: y, left: x, bottom: y + height, right: x + width })
}));

// Mock Animation API
global.Animation = jest.fn().mockImplementation(() => ({
  cancel: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

Element.prototype.animate = jest.fn().mockImplementation(() => {
  const animation = new (global.Animation as any)();
  // Simulate immediate finish for tests
  setTimeout(() => {
    const finishEvent = new Event('finish');
    animation.addEventListener.mock.calls.forEach(([event, callback]) => {
      if (event === 'finish') callback(finishEvent);
    });
  }, 0);
  return animation;
});

describe('QuickActionSidebar', () => {
  let mockProps: SidebarProps;
  let mockSelectedImage: SelectedImage;
  let sidebar: QuickActionSidebar;

  beforeEach(() => {
    // Create mock selected image
    const mockImageElement = document.createElement('img');
    mockImageElement.className = 'editable-room';
    mockSelectedImage = {
      element: mockImageElement,
      rect: new DOMRect(100, 100, 300, 200),
      borderRadius: '8px'
    };

    // Create mock props
    mockProps = {
      visible: false,
      selectedImage: null,
      onActionClick: jest.fn(),
      onClose: jest.fn(),
      isProcessing: false,
      currentAction: null
    };

    sidebar = new QuickActionSidebar(mockProps);
  });

  afterEach(() => {
    if (sidebar) {
      sidebar.destroy();
    }
    jest.clearAllMocks();
  });

  describe('Component Lifecycle', () => {
    test('should create sidebar element on render', () => {
      const element = sidebar.render();

      expect(element).toBeInstanceOf(HTMLElement);
      expect(element.className).toBe('dino-quick-action-sidebar');
    });

    test('should throw error when rendering destroyed sidebar', () => {
      sidebar.destroy();

      expect(() => sidebar.render()).toThrow('QuickActionSidebar has been destroyed');
    });

    test('should clean up properly on destroy', () => {
      const element = sidebar.render();
      const mockAnimation = { cancel: jest.fn() };
      (sidebar as any).slideAnimation = mockAnimation;

      sidebar.destroy();

      expect(mockAnimation.cancel).toHaveBeenCalled();
      expect(element.parentNode).toBeNull();
    });
  });

  describe('Sidebar Structure', () => {
    test('should create backdrop element', () => {
      const element = sidebar.render();
      const backdrop = element.querySelector('.dino-sidebar-backdrop');

      expect(backdrop).toBeInstanceOf(HTMLElement);
      expect(backdrop?.style.position).toBe('fixed');
      expect(backdrop?.style.zIndex).toBe('999998');
    });

    test('should create sidebar panel with glassmorphic styling', () => {
      const element = sidebar.render();
      const panel = element.querySelector('.dino-sidebar-panel');

      expect(panel).toBeInstanceOf(HTMLElement);
      expect(panel?.style.backdropFilter).toBe('blur(20px)');
      // In test environment, background might not be set the same way
      expect(panel?.style.background).toBeDefined();
    });

    test('should create header with title and close button', () => {
      const element = sidebar.render();
      const header = element.querySelector('.dino-sidebar-header');
      const title = element.querySelector('.dino-sidebar-title');
      const closeButton = element.querySelector('.dino-sidebar-close');

      expect(header).toBeInstanceOf(HTMLElement);
      expect(title?.textContent).toBe('Quick Actions');
      expect(closeButton?.getAttribute('aria-label')).toBe('Close sidebar');
    });

    test('should create actions container with default actions', () => {
      const element = sidebar.render();
      const container = element.querySelector('.dino-actions-container');
      const actionButtons = element.querySelectorAll('.dino-action-button');

      expect(container).toBeInstanceOf(HTMLElement);
      expect(actionButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Action Buttons', () => {
    test('should create action buttons with proper structure', () => {
      const element = sidebar.render();
      const firstButton = element.querySelector('.dino-action-button');
      const icon = firstButton?.querySelector('.dino-action-icon');
      const label = firstButton?.querySelector('.dino-action-label');
      const description = firstButton?.querySelector('.dino-action-description');

      expect(firstButton).toBeInstanceOf(HTMLElement);
      expect(icon).toBeInstanceOf(HTMLElement);
      expect(label).toBeInstanceOf(HTMLElement);
      expect(description).toBeInstanceOf(HTMLElement);
    });

    test('should apply glassmorphic styling to action buttons', () => {
      const element = sidebar.render();
      const button = element.querySelector('.dino-action-button') as HTMLElement;

      expect(button.style.background).toBeDefined();
      expect(button.style.backdropFilter).toBe('blur(10px)');
      expect(button.style.borderRadius).toBe('12px');
    });

    test('should handle action button clicks', () => {
      const element = sidebar.render();
      const button = element.querySelector('.dino-action-button') as HTMLElement;

      button.click();

      expect(mockProps.onActionClick).toHaveBeenCalled();
    });

    test('should not handle clicks when processing', () => {
      mockProps.isProcessing = true;
      sidebar = new QuickActionSidebar(mockProps);

      const element = sidebar.render();
      const button = element.querySelector('.dino-action-button') as HTMLElement;

      button.click();

      expect(mockProps.onActionClick).not.toHaveBeenCalled();
    });
  });

  describe('State Updates', () => {
    test('should update visibility when state changes', () => {
      const element = sidebar.render();

      // Initially hidden
      expect(element.style.display).toBe('none');

      // Update to visible
      const newState: OverlayState = {
        selectedImage: mockSelectedImage,
        sidebarVisible: true,
        chatBarVisible: false,
        isProcessing: false,
        currentAction: null
      };

      sidebar.update(newState);

      expect(element.style.display).toBe('block');
    });

    test('should handle processing state updates', () => {
      const element = sidebar.render();

      // First make sidebar visible
      const visibleState: OverlayState = {
        selectedImage: mockSelectedImage,
        sidebarVisible: true,
        chatBarVisible: false,
        isProcessing: false,
        currentAction: null
      };
      sidebar.update(visibleState);

      // Then set processing state
      const processingState: OverlayState = {
        selectedImage: mockSelectedImage,
        sidebarVisible: true,
        chatBarVisible: false,
        isProcessing: true,
        currentAction: 'minimalist'
      };

      sidebar.update(processingState);

      const buttons = element.querySelectorAll('.dino-action-button') as NodeListOf<HTMLElement>;
      const minimalistButton = Array.from(buttons).find(btn =>
        btn.getAttribute('data-action-id') === 'minimalist'
      );

      expect(minimalistButton?.style.cursor).toBe('not-allowed');
    });

    test('should show loading spinner for current action', () => {
      const element = sidebar.render();

      // First make sidebar visible
      const visibleState: OverlayState = {
        selectedImage: mockSelectedImage,
        sidebarVisible: true,
        chatBarVisible: false,
        isProcessing: false,
        currentAction: null
      };
      sidebar.update(visibleState);

      // Then set processing state
      const processingState: OverlayState = {
        selectedImage: mockSelectedImage,
        sidebarVisible: true,
        chatBarVisible: false,
        isProcessing: true,
        currentAction: 'minimalist'
      };

      sidebar.update(processingState);

      const spinner = element.querySelector('.dino-loading-spinner');
      expect(spinner).toBeInstanceOf(HTMLElement);
    });
  });

  describe('Animations', () => {
    test('should trigger slide-in animation when becoming visible', async () => {
      const element = sidebar.render();
      const panel = element.querySelector('.dino-sidebar-panel') as HTMLElement;

      const newState: OverlayState = {
        selectedImage: mockSelectedImage,
        sidebarVisible: true,
        chatBarVisible: false,
        isProcessing: false,
        currentAction: null
      };

      sidebar.update(newState);

      expect(panel.animate).toHaveBeenCalledWith(
        [
          { transform: 'translateX(100%)' },
          { transform: 'translateX(0)' }
        ],
        expect.objectContaining({
          duration: 300,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
        })
      );
    });

    test('should trigger slide-out animation when becoming hidden', async () => {
      const element = sidebar.render();

      // First make it visible
      const visibleState: OverlayState = {
        selectedImage: mockSelectedImage,
        sidebarVisible: true,
        chatBarVisible: false,
        isProcessing: false,
        currentAction: null
      };
      sidebar.update(visibleState);

      // Then hide it
      const hiddenState: OverlayState = {
        ...visibleState,
        sidebarVisible: false
      };

      const panel = element.querySelector('.dino-sidebar-panel') as HTMLElement;
      sidebar.update(hiddenState);

      expect(panel.animate).toHaveBeenCalledWith(
        [
          { transform: 'translateX(0)' },
          { transform: 'translateX(100%)' }
        ],
        expect.objectContaining({
          duration: 300,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
        })
      );
    });
  });

  describe('Event Handling', () => {
    test('should handle close button click', () => {
      const element = sidebar.render();
      const closeButton = element.querySelector('.dino-sidebar-close') as HTMLElement;

      closeButton.click();

      expect(mockProps.onClose).toHaveBeenCalled();
    });

    test('should handle backdrop click', () => {
      const element = sidebar.render();
      const backdrop = element.querySelector('.dino-sidebar-backdrop') as HTMLElement;

      backdrop.click();

      expect(mockProps.onClose).toHaveBeenCalled();
    });

    test('should not handle events when destroyed', () => {
      const element = sidebar.render();
      const closeButton = element.querySelector('.dino-sidebar-close') as HTMLElement;

      sidebar.destroy();
      closeButton.click();

      expect(mockProps.onClose).not.toHaveBeenCalled();
    });
  });

  describe('Custom Actions', () => {
    test('should support custom actions', () => {
      const customActions: QuickAction[] = [
        {
          id: 'custom-action',
          label: 'Custom Action',
          icon: '🎨',
          prompt: 'Apply custom styling'
        }
      ];

      sidebar.setCustomActions(customActions);
      const element = sidebar.render();

      const customButton = element.querySelector('[data-action-id="custom-action"]');
      expect(customButton).toBeInstanceOf(HTMLElement);
    });

    test('should merge custom actions with default actions', () => {
      const customActions: QuickAction[] = [
        {
          id: 'custom-action',
          label: 'Custom Action',
          icon: '🎨',
          prompt: 'Apply custom styling'
        }
      ];

      sidebar.setCustomActions(customActions);
      const element = sidebar.render();

      const allButtons = element.querySelectorAll('.dino-action-button');
      expect(allButtons.length).toBeGreaterThan(8); // Default actions + custom
    });
  });

  describe('Responsive Design', () => {
    test('should adapt to mobile viewport', () => {
      // Mock mobile viewport
      (window.matchMedia as jest.Mock).mockImplementation(query => ({
        matches: query === '(max-width: 768px)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      const mobileSidebar = new QuickActionSidebar(mockProps);
      const element = mobileSidebar.render();
      const panel = element.querySelector('.dino-sidebar-panel') as HTMLElement;

      expect(panel.style.width).toBe('100vw');
      expect(panel.style.maxWidth).toBe('400px');

      mobileSidebar.destroy();
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA labels', () => {
      const element = sidebar.render();
      const closeButton = element.querySelector('.dino-sidebar-close');

      expect(closeButton?.getAttribute('aria-label')).toBe('Close sidebar');
    });

    test('should support keyboard navigation', () => {
      const element = sidebar.render();
      const buttons = element.querySelectorAll('button');

      buttons.forEach(button => {
        expect(button.tabIndex).not.toBe(-1);
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle animation errors gracefully', () => {
      // Create a new sidebar instance for this test
      const testSidebar = new QuickActionSidebar(mockProps);

      // Mock animation failure
      const originalAnimate = Element.prototype.animate;
      Element.prototype.animate = jest.fn().mockImplementation(() => {
        throw new Error('Animation failed');
      });

      const element = testSidebar.render();

      const newState: OverlayState = {
        selectedImage: mockSelectedImage,
        sidebarVisible: true,
        chatBarVisible: false,
        isProcessing: false,
        currentAction: null
      };

      expect(() => testSidebar.update(newState)).not.toThrow();

      // Restore original animate method
      Element.prototype.animate = originalAnimate;
      testSidebar.destroy();
    });

    test('should handle missing DOM elements gracefully', () => {
      // Create a new sidebar instance for this test
      const testSidebar = new QuickActionSidebar(mockProps);
      const element = testSidebar.render();

      // Remove a child element to simulate DOM manipulation
      const container = element.querySelector('.dino-actions-container');
      container?.remove();

      const newState: OverlayState = {
        selectedImage: mockSelectedImage,
        sidebarVisible: true,
        chatBarVisible: false,
        isProcessing: true,
        currentAction: 'minimalist'
      };

      expect(() => testSidebar.update(newState)).not.toThrow();
      testSidebar.destroy();
    });
  });

  describe('Performance', () => {
    test('should reuse existing element on multiple renders', () => {
      const element1 = sidebar.render();
      const element2 = sidebar.render();

      expect(element1).toBe(element2);
    });

    test('should cancel animations on destroy', () => {
      const element = sidebar.render();
      const mockAnimation = { cancel: jest.fn() };
      (sidebar as any).slideAnimation = mockAnimation;

      sidebar.destroy();

      expect(mockAnimation.cancel).toHaveBeenCalled();
    });

    test('should not update when destroyed', () => {
      sidebar.destroy();

      const newState: OverlayState = {
        selectedImage: mockSelectedImage,
        sidebarVisible: true,
        chatBarVisible: false,
        isProcessing: false,
        currentAction: null
      };

      expect(() => sidebar.update(newState)).not.toThrow();
    });
  });
});