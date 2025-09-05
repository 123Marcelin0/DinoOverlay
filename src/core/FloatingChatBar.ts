import { Component } from './OverlayManager';
import { OverlayState, ChatBarProps, Position } from '../types/overlay';
import { ResponsiveManager, ViewportInfo } from './ResponsiveManager';
import { OverlayAnimations, OverlayAnimationConfig } from './OverlayAnimations';
import { AnimationCleanup } from './AnimationSystem';

export class FloatingChatBar implements Component {
  private element: HTMLElement | null = null;
  private inputElement: HTMLInputElement | null = null;
  private sendButton: HTMLButtonElement | null = null;
  private typingIndicator: HTMLElement | null = null;
  private props: ChatBarProps;
  private isVisible: boolean = false;
  private isAnimating: boolean = false;
  private responsiveManager: ResponsiveManager | null = null;
  private currentViewport: ViewportInfo | null = null;
  private overlayAnimations: OverlayAnimations;
  private animationCleanups: Map<string, AnimationCleanup> = new Map();
  private hoverCleanups: Map<string, () => void> = new Map();

  constructor(props: ChatBarProps, responsiveManager?: ResponsiveManager, overlayAnimations?: OverlayAnimations) {
    this.props = { ...props };
    this.responsiveManager = responsiveManager || null;
    this.overlayAnimations = overlayAnimations || new OverlayAnimations(new (require('./AnimationSystem').AnimationSystem)());
    
    if (this.responsiveManager) {
      this.currentViewport = this.responsiveManager.getViewportInfo();
    }
    
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleKeyPress = this.handleKeyPress.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleSendClick = this.handleSendClick.bind(this);
    this.handleViewportChange = this.handleViewportChange.bind(this);
  }

  public render(): HTMLElement {
    if (this.element) {
      return this.element;
    }

    this.element = this.createElement();
    this.setupResponsiveHandling();
    this.updateVisibility();
    return this.element;
  }

  public update(state: OverlayState): void {
    const newProps: ChatBarProps = {
      visible: state.chatBarVisible,
      selectedImage: state.selectedImage,
      onSubmit: this.props.onSubmit,
      onClose: this.props.onClose,
      isProcessing: state.isProcessing,
      placeholder: this.props.placeholder
    };

    this.updateProps(newProps);
  }

  public destroy(): void {
    // Clean up animations
    this.animationCleanups.forEach(cleanup => cleanup.cancel());
    this.animationCleanups.clear();

    // Clean up hover animations
    this.hoverCleanups.forEach(cleanup => cleanup());
    this.hoverCleanups.clear();

    // Clean up overlay animations
    this.overlayAnimations.cleanup();

    // Remove responsive manager listeners
    if (this.responsiveManager) {
      this.responsiveManager.off('viewportResized', this.handleViewportChange);
      this.responsiveManager.off('breakpointChanged', this.handleViewportChange);
    }

    if (this.element) {
      this.element.remove();
      this.element = null;
      this.inputElement = null;
      this.sendButton = null;
      this.typingIndicator = null;
    }

    this.currentViewport = null;
  }

  public updateProps(newProps: Partial<ChatBarProps>): void {
    const prevVisible = this.props.visible;
    this.props = { ...this.props, ...newProps };

    if (this.element) {
      this.updateVisibility();
      this.updateProcessingState();
      this.updatePlaceholder();
      
      // Handle visibility changes
      if (prevVisible !== this.props.visible) {
        if (this.props.visible) {
          this.show();
        } else {
          this.hide();
        }
      }
    }
  }

  public focusInput(): void {
    if (this.inputElement && this.props.visible) {
      setTimeout(() => {
        this.inputElement?.focus();
      }, 100); // Small delay to ensure element is visible
    }
  }

  public clearInput(): void {
    if (this.inputElement) {
      this.inputElement.value = '';
      this.updateSendButtonState();
    }
  }

  private createElement(): HTMLElement {
    const container = document.createElement('div');
    container.className = this.getContainerClasses();
    container.style.cssText = this.getContainerStyles();

    // Create main chat bar
    const chatBar = document.createElement('div');
    chatBar.className = 'glass-panel flex items-center gap-2 p-3 min-w-80 max-w-md';
    
    // Create input container
    const inputContainer = document.createElement('div');
    inputContainer.className = 'flex-1 relative';
    
    // Create text input
    this.inputElement = document.createElement('input');
    this.inputElement.type = 'text';
    this.inputElement.className = 'glass-input w-full pr-10 text-sm';
    this.inputElement.placeholder = this.props.placeholder || 'Describe your room edit...';
    this.inputElement.addEventListener('keypress', this.handleKeyPress);
    this.inputElement.addEventListener('input', this.handleInputChange);
    
    // Create send button
    this.sendButton = document.createElement('button');
    this.sendButton.className = 'absolute right-2 top-1/2 transform -translate-y-1/2 p-1 rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
    this.sendButton.innerHTML = this.getSendButtonIcon();
    this.sendButton.addEventListener('click', this.handleSendClick);
    this.sendButton.disabled = true;

    // Setup hover and focus animations for send button
    const hoverCleanup = this.overlayAnimations.setupButtonHoverAnimation(this.sendButton, {
      duration: 200,
      respectsReducedMotion: true
    });
    
    const focusCleanup = this.overlayAnimations.setupButtonFocusAnimation(this.sendButton, {
      duration: 200,
      respectsReducedMotion: true
    });

    this.hoverCleanups.set('send-hover', hoverCleanup);
    this.hoverCleanups.set('send-focus', focusCleanup);
    
    // Create typing indicator
    this.typingIndicator = document.createElement('div');
    this.typingIndicator.className = 'hidden items-center gap-1 text-xs text-gray-400 ml-2';
    this.typingIndicator.innerHTML = `
      <div class="flex gap-1">
        <div class="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
        <div class="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
        <div class="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
      </div>
      <span>Processing...</span>
    `;
    
    // Ensure initial state is properly set
    this.typingIndicator.classList.add('hidden');
    this.typingIndicator.classList.remove('flex');

    // Assemble components
    inputContainer.appendChild(this.inputElement);
    inputContainer.appendChild(this.sendButton);
    
    chatBar.appendChild(inputContainer);
    chatBar.appendChild(this.typingIndicator);
    
    container.appendChild(chatBar);

    return container;
  }

  private getContainerClasses(): string {
    return [
      'fixed',
      'z-50',
      'transition-all',
      'duration-300',
      'ease-out',
      'pointer-events-auto'
    ].join(' ');
  }

  private getContainerStyles(): string {
    const position = this.calculatePosition();
    const isMobile = this.currentViewport?.isMobile || false;
    
    const styles = [
      `bottom: ${position.bottom}px`,
      `right: ${position.right}px`,
      'transform: translateY(0)',
      this.isVisible ? 'opacity: 1' : 'opacity: 0',
      this.isVisible ? 'pointer-events: auto' : 'pointer-events: none'
    ];

    // Add left positioning for mobile full-width
    if (position.left !== undefined) {
      styles.push(`left: ${position.left}px`);
    }

    // Mobile-specific styles
    if (isMobile) {
      styles.push('width: calc(100vw - 24px)');
      styles.push('max-width: none');
    }

    return styles.join('; ');
  }

  private calculatePosition(): { bottom: number; right: number; left?: number } {
    // Use responsive manager for optimal positioning
    if (this.responsiveManager) {
      return this.responsiveManager.getOptimalChatBarPosition();
    }

    // Fallback positioning
    const isMobile = this.currentViewport?.isMobile || false;
    
    if (isMobile) {
      return {
        bottom: 12,
        right: 12,
        left: 12
      };
    } else {
      return {
        bottom: 20,
        right: 20
      };
    }
  }

  private updateVisibility(): void {
    if (!this.element) return;

    const shouldBeVisible = this.props.visible && this.props.selectedImage !== null;
    
    if (shouldBeVisible !== this.isVisible) {
      this.isVisible = shouldBeVisible;
      this.element.style.opacity = this.isVisible ? '1' : '0';
      this.element.style.pointerEvents = this.isVisible ? 'auto' : 'none';
      
      if (this.isVisible) {
        this.focusInput();
      }
    }
  }

  private updateProcessingState(): void {
    if (!this.inputElement || !this.sendButton || !this.typingIndicator) return;

    const isProcessing = this.props.isProcessing || false;
    
    // Update input and button states
    this.inputElement.disabled = isProcessing;
    this.sendButton.disabled = isProcessing || this.inputElement.value.trim() === '';
    
    // Use animation system for loading state
    const loadingCleanup = this.overlayAnimations.animateLoadingState(this.typingIndicator, isProcessing, {
      duration: 1000,
      respectsReducedMotion: true
    });

    if (isProcessing) {
      this.animationCleanups.set('processing', loadingCleanup);
      this.typingIndicator.classList.remove('hidden');
      this.typingIndicator.classList.add('flex');
    } else {
      this.animationCleanups.delete('processing');
      this.typingIndicator.classList.remove('flex');
      this.typingIndicator.classList.add('hidden');
    }
    
    // Update input opacity with smooth transition
    this.inputElement.style.transition = 'opacity 0.2s ease';
    this.inputElement.style.opacity = isProcessing ? '0.6' : '1';
  }

  private updatePlaceholder(): void {
    if (!this.inputElement) return;
    
    if (!this.props.selectedImage) {
      this.inputElement.placeholder = 'Select an image first...';
    } else if (this.props.placeholder) {
      this.inputElement.placeholder = this.props.placeholder;
    } else {
      this.inputElement.placeholder = 'Describe your room edit...';
    }
  }

  private updateSendButtonState(): void {
    if (!this.sendButton || !this.inputElement) return;
    
    const hasText = this.inputElement.value.trim().length > 0;
    const isProcessing = this.props.isProcessing || false;
    
    this.sendButton.disabled = !hasText || isProcessing;
    
    // Update button styling based on state
    if (hasText && !isProcessing) {
      this.sendButton.className = this.sendButton.className.replace(
        'text-gray-400',
        'text-blue-400 hover:text-blue-300 hover:bg-blue-400/10'
      );
    } else {
      this.sendButton.className = this.sendButton.className.replace(
        'text-blue-400 hover:text-blue-300 hover:bg-blue-400/10',
        'text-gray-400'
      );
    }
  }

  private getSendButtonIcon(): string {
    return `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="22" y1="2" x2="11" y2="13"></line>
        <polygon points="22,2 15,22 11,13 2,9 22,2"></polygon>
      </svg>
    `;
  }

  private show(): void {
    if (!this.element || this.isAnimating) return;
    
    this.isAnimating = true;
    
    // Use the new animation system
    const cleanup = this.overlayAnimations.animateChatBarIn(this.element, {
      duration: 300,
      easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      respectsReducedMotion: true
    });

    this.animationCleanups.set('show', cleanup);
    
    setTimeout(() => {
      this.isAnimating = false;
      this.focusInput();
    }, 300);
  }

  private hide(): void {
    if (!this.element || this.isAnimating) return;
    
    this.isAnimating = true;
    
    // Use the new animation system
    const cleanup = this.overlayAnimations.animateChatBarOut(this.element, {
      duration: 250,
      easing: 'cubic-bezier(0.4, 0, 1, 1)',
      respectsReducedMotion: true
    });

    this.animationCleanups.set('hide', cleanup);
    
    setTimeout(() => {
      this.isAnimating = false;
    }, 250);
  }

  private handleSubmit(message: string): void {
    if (!message.trim() || this.props.isProcessing) return;
    
    if (!this.props.selectedImage) {
      // Could show a toast or error message here
      console.warn('[FloatingChatBar] No image selected for chat message');
      return;
    }
    
    this.props.onSubmit(message.trim());
    this.clearInput();
  }

  private handleKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      const message = (event.target as HTMLInputElement).value;
      this.handleSubmit(message);
    } else if (event.key === 'Escape') {
      this.props.onClose();
    }
  }

  private handleInputChange(): void {
    this.updateSendButtonState();
  }

  private handleSendClick(): void {
    if (this.inputElement) {
      const message = this.inputElement.value;
      this.handleSubmit(message);
    }
  }

  private setupResponsiveHandling(): void {
    if (!this.responsiveManager) {
      return;
    }

    // Listen for viewport changes
    this.responsiveManager.on('viewportResized', this.handleViewportChange);
    this.responsiveManager.on('breakpointChanged', this.handleViewportChange);
  }

  private handleViewportChange(viewport: ViewportInfo): void {
    const previousViewport = this.currentViewport;
    this.currentViewport = viewport;

    // Update styles if breakpoint changed
    if (!previousViewport || 
        previousViewport.isMobile !== viewport.isMobile ||
        previousViewport.isTablet !== viewport.isTablet) {
      this.updateResponsiveStyles();
    }
  }

  private updateResponsiveStyles(): void {
    if (!this.element || !this.currentViewport) {
      return;
    }

    // Update container styles
    this.element.style.cssText = this.getContainerStyles();

    // Update input and button styles for touch devices
    if (this.inputElement) {
      this.updateInputForTouch();
    }

    if (this.sendButton) {
      this.updateSendButtonForTouch();
    }
  }

  private updateInputForTouch(): void {
    if (!this.inputElement || !this.currentViewport) {
      return;
    }

    const isTouchDevice = this.currentViewport.isTouchDevice;
    const touchTargetSize = this.responsiveManager?.getTouchTargetSize() || 44;

    if (isTouchDevice) {
      Object.assign(this.inputElement.style, {
        minHeight: `${touchTargetSize}px`,
        fontSize: '16px', // Prevent zoom on iOS
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation'
      });
    }
  }

  private updateSendButtonForTouch(): void {
    if (!this.sendButton || !this.currentViewport) {
      return;
    }

    const isTouchDevice = this.currentViewport.isTouchDevice;
    const touchTargetSize = this.responsiveManager?.getTouchTargetSize() || 44;

    if (isTouchDevice) {
      Object.assign(this.sendButton.style, {
        width: `${touchTargetSize}px`,
        height: `${touchTargetSize}px`,
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation'
      });
    }
  }
}