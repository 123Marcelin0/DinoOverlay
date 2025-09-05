import { Component } from './OverlayManager';
import { OverlayState, QuickAction, SidebarProps } from '../types/overlay';
import { ThemeConfig } from '../types/theme';
import { ResponsiveManager, ViewportInfo } from './ResponsiveManager';
import { TouchGestureHandler, SwipeGesture } from './TouchGestureHandler';
import { OverlayAnimations, OverlayAnimationConfig } from './OverlayAnimations';
import { AnimationCleanup } from './AnimationSystem';

export class QuickActionSidebar implements Component {
  private element: HTMLElement | null = null;
  private props: SidebarProps;
  private isDestroyed: boolean = false;
  private slideAnimation: Animation | null = null;
  private actions: QuickAction[];
  private responsiveManager: ResponsiveManager | null = null;
  private touchGestureHandler: TouchGestureHandler | null = null;
  private currentViewport: ViewportInfo | null = null;
  private overlayAnimations: OverlayAnimations;
  private animationCleanups: Map<string, AnimationCleanup> = new Map();
  private hoverCleanups: Map<string, () => void> = new Map();
  private currentTheme: ThemeConfig | null = null;

  constructor(props: SidebarProps, responsiveManager?: ResponsiveManager, overlayAnimations?: OverlayAnimations) {
    this.props = props;
    this.actions = this.getDefaultActions();
    this.responsiveManager = responsiveManager || null;
    this.overlayAnimations = overlayAnimations || new OverlayAnimations(new (require('./AnimationSystem').AnimationSystem)());
    
    if (this.responsiveManager) {
      this.currentViewport = this.responsiveManager.getViewportInfo();
    }
    
    // Bind methods to preserve context
    this.handleActionClick = this.handleActionClick.bind(this);
    this.handleCloseClick = this.handleCloseClick.bind(this);
    this.handleBackdropClick = this.handleBackdropClick.bind(this);
    this.handleSwipeGesture = this.handleSwipeGesture.bind(this);
    this.handleViewportChange = this.handleViewportChange.bind(this);
  }

  public render(): HTMLElement {
    if (this.isDestroyed) {
      throw new Error('QuickActionSidebar has been destroyed');
    }

    // Create or update the sidebar element
    if (!this.element) {
      this.element = this.createElement();
      this.setupResponsiveHandling();
      this.setupTouchGestures();
    }

    this.updateElement();
    return this.element;
  }

  public update(state: OverlayState): void {
    if (this.isDestroyed) {
      return;
    }

    const newProps: SidebarProps = {
      ...this.props,
      visible: state.sidebarVisible,
      selectedImage: state.selectedImage,
      isProcessing: state.isProcessing,
      currentAction: state.currentAction
    };

    const wasVisible = this.props.visible;
    const isVisible = newProps.visible;

    this.props = newProps;

    if (this.element) {
      // Handle visibility changes with animations
      if (!wasVisible && isVisible) {
        this.slideIn();
      } else if (wasVisible && !isVisible) {
        this.slideOut();
      } else if (isVisible) {
        this.updateElement();
      }
    }
  }

  public destroy(): void {
    if (this.isDestroyed) {
      return;
    }

    this.isDestroyed = true;

    // Cancel any running animations
    if (this.slideAnimation) {
      this.slideAnimation.cancel();
      this.slideAnimation = null;
    }

    // Clean up animation system
    this.animationCleanups.forEach(cleanup => cleanup.cancel());
    this.animationCleanups.clear();

    // Clean up hover animations
    this.hoverCleanups.forEach(cleanup => cleanup());
    this.hoverCleanups.clear();

    // Clean up overlay animations
    this.overlayAnimations.cleanup();

    // Destroy touch gesture handler
    if (this.touchGestureHandler) {
      this.touchGestureHandler.destroy();
      this.touchGestureHandler = null;
    }

    // Remove responsive manager listeners
    if (this.responsiveManager) {
      this.responsiveManager.off('viewportResized', this.handleViewportChange);
      this.responsiveManager.off('breakpointChanged', this.handleViewportChange);
    }

    // Remove element from DOM
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }

    this.element = null;
    this.currentViewport = null;
  }

  public updateTheme(theme: ThemeConfig): void {
    if (this.isDestroyed) {
      return;
    }

    this.currentTheme = theme;

    if (this.element) {
      this.applyThemeStyles();
    }
  }

  public setCustomActions(actions: QuickAction[]): void {
    this.actions = [...this.getDefaultActions(), ...actions];
    
    if (this.element && this.props.visible) {
      this.updateActionButtons();
    }
  }

  private createElement(): HTMLElement {
    const sidebar = document.createElement('div');
    sidebar.className = 'dino-quick-action-sidebar';
    
    // Apply base styles
    this.applyBaseStyles(sidebar);

    // Create backdrop
    const backdrop = this.createBackdrop();
    sidebar.appendChild(backdrop);

    // Create sidebar panel
    const panel = this.createSidebarPanel();
    sidebar.appendChild(panel);

    return sidebar;
  }

  private createBackdrop(): HTMLElement {
    const backdrop = document.createElement('div');
    backdrop.className = 'dino-sidebar-backdrop';
    
    Object.assign(backdrop.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      backgroundColor: 'rgba(0, 0, 0, 0.2)',
      backdropFilter: 'blur(2px)',
      WebkitBackdropFilter: 'blur(2px)',
      zIndex: '999998',
      opacity: '0',
      transition: 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'pointer'
    });

    backdrop.addEventListener('click', this.handleBackdropClick);

    return backdrop;
  }

  private createSidebarPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'dino-sidebar-panel';
    
    // Apply glassmorphic panel styles
    this.applySidebarPanelStyles(panel);

    // Create header
    const header = this.createSidebarHeader();
    panel.appendChild(header);

    // Create actions container
    const actionsContainer = this.createActionsContainer();
    panel.appendChild(actionsContainer);

    return panel;
  }

  private createSidebarHeader(): HTMLElement {
    const header = document.createElement('div');
    header.className = 'dino-sidebar-header';
    
    Object.assign(header.style, {
      padding: '20px 24px 16px',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      marginBottom: '16px'
    });

    // Create title
    const title = document.createElement('h3');
    title.textContent = 'Quick Actions';
    title.className = 'dino-sidebar-title';
    
    Object.assign(title.style, {
      margin: '0',
      fontSize: '18px',
      fontWeight: '600',
      color: 'var(--dino-glass-text)',
      lineHeight: '1.2'
    });

    // Create subtitle
    const subtitle = document.createElement('p');
    subtitle.textContent = 'Transform your room with AI';
    subtitle.className = 'dino-sidebar-subtitle';
    
    Object.assign(subtitle.style, {
      margin: '4px 0 0',
      fontSize: '14px',
      color: 'var(--dino-glass-text-secondary)',
      lineHeight: '1.3'
    });

    // Create close button
    const closeButton = this.createCloseButton();

    header.appendChild(title);
    header.appendChild(subtitle);
    header.appendChild(closeButton);

    return header;
  }

  private createCloseButton(): HTMLElement {
    const button = document.createElement('button');
    button.className = 'dino-sidebar-close';
    button.innerHTML = '×';
    button.setAttribute('aria-label', 'Close sidebar');
    
    Object.assign(button.style, {
      position: 'absolute',
      top: '16px',
      right: '16px',
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      border: 'none',
      
      // Glassmorphic button styling
      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      
      // Typography
      color: 'var(--dino-glass-text)',
      fontSize: '20px',
      fontWeight: 'normal',
      lineHeight: '1',
      
      // Interactive styles
      cursor: 'pointer',
      
      // Shadow and effects
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      
      // Smooth transitions
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      transform: 'scale(1)'
    });

    // Add hover and active states
    button.addEventListener('mouseenter', () => {
      if (!this.isDestroyed) {
        Object.assign(button.style, {
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.08))',
          transform: 'scale(1.05)',
          color: 'rgba(255, 255, 255, 1)'
        });
      }
    });

    button.addEventListener('mouseleave', () => {
      if (!this.isDestroyed) {
        Object.assign(button.style, {
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
          transform: 'scale(1)',
          color: 'rgba(255, 255, 255, 0.8)'
        });
      }
    });

    button.addEventListener('click', this.handleCloseClick);

    return button;
  }

  private createActionsContainer(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'dino-actions-container';
    
    Object.assign(container.style, {
      padding: '0 24px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      maxHeight: 'calc(100vh - 200px)',
      overflowY: 'auto'
    });

    // Add custom scrollbar styles
    container.style.scrollbarWidth = 'thin';
    container.style.scrollbarColor = 'rgba(255, 255, 255, 0.3) transparent';

    this.updateActionButtons(container);

    return container;
  }

  private updateActionButtons(container?: HTMLElement): void {
    if (!container) {
      const existingContainer = this.element?.querySelector('.dino-actions-container') as HTMLElement;
      if (!existingContainer) return;
      container = existingContainer;
    }

    // Clear existing buttons
    container.innerHTML = '';

    // Create action buttons
    this.actions.forEach(action => {
      const button = this.createActionButton(action);
      container.appendChild(button);
    });

    // Animate staggered appearance of buttons
    if (this.props.visible) {
      const staggerCleanups = this.overlayAnimations.animateStaggeredList(container, {
        duration: 300,
        stagger: 50,
        respectsReducedMotion: true
      });
      
      staggerCleanups.forEach((cleanup, index) => {
        this.animationCleanups.set(`stagger-${index}`, cleanup);
      });
    }
  }

  private createActionButton(action: QuickAction): HTMLElement {
    const button = document.createElement('button');
    button.className = 'dino-action-button';
    button.setAttribute('data-action-id', action.id);
    
    // Apply glassmorphic button styles
    this.applyActionButtonStyles(button);

    // Create button content
    const content = this.createButtonContent(action);
    button.appendChild(content);

    // Add click handler
    button.addEventListener('click', () => this.handleActionClick(action));

    // Setup hover and focus animations
    const hoverCleanup = this.overlayAnimations.setupButtonHoverAnimation(button, {
      duration: 200,
      respectsReducedMotion: true
    });
    
    const focusCleanup = this.overlayAnimations.setupButtonFocusAnimation(button, {
      duration: 200,
      respectsReducedMotion: true
    });

    // Store cleanup functions (ensure they are functions)
    if (typeof hoverCleanup === 'function') {
      this.hoverCleanups.set(`hover-${action.id}`, hoverCleanup);
    }
    if (typeof focusCleanup === 'function') {
      this.hoverCleanups.set(`focus-${action.id}`, focusCleanup);
    }

    return button;
  }

  private createButtonContent(action: QuickAction): HTMLElement {
    const content = document.createElement('div');
    content.className = 'dino-button-content';
    
    Object.assign(content.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      width: '100%'
    });

    // Create icon
    const icon = document.createElement('div');
    icon.className = 'dino-action-icon';
    icon.innerHTML = action.icon;
    
    Object.assign(icon.style, {
      fontSize: '20px',
      lineHeight: '1',
      flexShrink: '0',
      width: '24px',
      height: '24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    });

    // Create text content
    const textContent = document.createElement('div');
    textContent.className = 'dino-action-text';
    
    Object.assign(textContent.style, {
      flex: '1',
      textAlign: 'left'
    });

    // Create label
    const label = document.createElement('div');
    label.className = 'dino-action-label';
    label.textContent = action.label;
    
    Object.assign(label.style, {
      fontSize: '16px',
      fontWeight: '500',
      color: 'var(--dino-glass-text)',
      lineHeight: '1.2',
      marginBottom: '2px'
    });

    // Create description (derived from prompt)
    const description = document.createElement('div');
    description.className = 'dino-action-description';
    description.textContent = this.getActionDescription(action);
    
    Object.assign(description.style, {
      fontSize: '13px',
      color: 'var(--dino-glass-text-secondary)',
      lineHeight: '1.3'
    });

    textContent.appendChild(label);
    textContent.appendChild(description);

    content.appendChild(icon);
    content.appendChild(textContent);

    return content;
  }

  private applyBaseStyles(element: HTMLElement): void {
    Object.assign(element.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      zIndex: '999999',
      display: 'none',
      pointerEvents: 'none'
    });
  }

  private applySidebarPanelStyles(element: HTMLElement): void {
    const isMobile = this.currentViewport?.isMobile || false;
    const isTablet = this.currentViewport?.isTablet || false;
    const isTouchDevice = this.currentViewport?.isTouchDevice || false;
    
    // Get optimal width from responsive manager
    const width = this.responsiveManager?.getOptimalSidebarWidth() || 320;
    
    // Add theme-aware class
    element.className = 'dino-sidebar-panel dino-sidebar';
    
    Object.assign(element.style, {
      position: 'fixed',
      top: '0',
      right: '0',
      width: isMobile ? '100vw' : `${width}px`,
      maxWidth: isMobile ? 'none' : '90vw',
      height: '100vh',
      
      // Use CSS custom properties for theme-aware styling
      background: 'var(--dino-glass-bg)',
      backdropFilter: 'var(--dino-glass-backdrop)',
      WebkitBackdropFilter: 'var(--dino-glass-backdrop)',
      border: '1px solid var(--dino-glass-border)',
      borderRight: isMobile ? '1px solid var(--dino-glass-border)' : 'none',
      
      // Shadow effects using theme variables
      boxShadow: isMobile 
        ? '0 -8px 32px var(--dino-glass-shadow)'
        : '-8px 0 32px var(--dino-glass-shadow), inset 1px 0 0 var(--dino-glass-border)',
      
      // Transform for animation
      transform: isMobile ? 'translateY(100%)' : 'translateX(100%)',
      transition: 'transform var(--dino-duration-normal) var(--dino-easing-ease)',
      
      // Ensure proper rendering
      willChange: 'transform',
      pointerEvents: 'auto',
      
      // Mobile-specific positioning
      ...(isMobile && {
        bottom: '0',
        top: 'auto',
        height: 'auto',
        maxHeight: '80vh',
        borderRadius: '16px 16px 0 0',
        borderBottom: 'none'
      }),
      
      // Touch-friendly scrolling
      ...(isTouchDevice && {
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain'
      })
    });
  }

  private applyActionButtonStyles(element: HTMLElement): void {
    const isTouchDevice = this.currentViewport?.isTouchDevice || false;
    const touchTargetSize = this.responsiveManager?.getTouchTargetSize() || 44;
    
    // Add theme-aware class
    element.className = 'dino-action-button dino-button';
    
    Object.assign(element.style, {
      width: '100%',
      padding: isTouchDevice ? '18px 16px' : '16px',
      minHeight: isTouchDevice ? `${touchTargetSize}px` : 'auto',
      border: 'none',
      borderRadius: '12px',
      
      // Use CSS custom properties for theme-aware styling
      background: 'var(--dino-glass-bg)',
      backdropFilter: 'var(--dino-glass-backdrop)',
      WebkitBackdropFilter: 'var(--dino-glass-backdrop)',
      border: '1px solid var(--dino-glass-border)',
      color: 'var(--dino-glass-text)',
      
      // Interactive styles
      cursor: 'pointer',
      
      // Shadow and effects
      boxShadow: '0 2px 8px var(--dino-glass-shadow)',
      
      // Smooth transitions using theme variables
      transition: 'all var(--dino-duration-fast) var(--dino-easing-ease)',
      transform: 'scale(1)',
      
      // Typography
      textAlign: 'left',
      
      // Touch-friendly styles
      ...(isTouchDevice && {
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
        userSelect: 'none',
        WebkitUserSelect: 'none'
      }),
      
      // Ensure proper rendering
      willChange: 'transform, background, box-shadow'
    });

    // Add hover and active states using theme variables
    element.addEventListener('mouseenter', () => {
      if (!this.isDestroyed && !this.isButtonDisabled(element)) {
        Object.assign(element.style, {
          background: 'var(--dino-glass-accent)',
          transform: 'scale(1.02)',
          boxShadow: '0 4px 16px var(--dino-glass-shadow), 0 0 0 1px var(--dino-glass-border)'
        });
      }
    });

    element.addEventListener('mouseleave', () => {
      if (!this.isDestroyed && !this.isButtonDisabled(element)) {
        Object.assign(element.style, {
          background: 'var(--dino-glass-bg)',
          transform: 'scale(1)',
          boxShadow: '0 2px 8px var(--dino-glass-shadow)'
        });
      }
    });

    element.addEventListener('mousedown', () => {
      if (!this.isDestroyed && !this.isButtonDisabled(element)) {
        element.style.transform = 'scale(0.98)';
      }
    });

    element.addEventListener('mouseup', () => {
      if (!this.isDestroyed && !this.isButtonDisabled(element)) {
        element.style.transform = 'scale(1.02)';
      }
    });
  }

  private updateElement(): void {
    if (!this.element || this.isDestroyed) {
      return;
    }

    const { visible, isProcessing, currentAction } = this.props;

    if (!visible) {
      this.element.style.display = 'none';
      return;
    }

    this.element.style.display = 'block';

    // Update processing states
    this.updateProcessingStates(isProcessing, currentAction);
  }

  private updateProcessingStates(isProcessing?: boolean, currentAction?: string | null): void {
    if (!this.element) return;

    const buttons = this.element.querySelectorAll('.dino-action-button') as NodeListOf<HTMLElement>;
    
    buttons.forEach(button => {
      const actionId = button.getAttribute('data-action-id');
      const isCurrentAction = actionId === currentAction;
      
      if (isProcessing && isCurrentAction) {
        this.setButtonLoading(button, true);
      } else {
        this.setButtonLoading(button, false);
        this.setButtonDisabled(button, isProcessing || false);
      }
    });
  }

  private setButtonLoading(button: HTMLElement, loading: boolean): void {
    const actionId = button.getAttribute('data-action-id') || 'unknown';
    
    // Use the new animation system for loading states
    const loadingCleanup = this.overlayAnimations.animateLoadingState(button, loading, {
      duration: 1000,
      respectsReducedMotion: true
    });

    if (loading) {
      this.animationCleanups.set(`loading-${actionId}`, loadingCleanup);
      
      // Update button styles for loading state
      Object.assign(button.style, {
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(59, 130, 246, 0.1))',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        cursor: 'not-allowed'
      });
    } else {
      // Clean up loading animation
      this.animationCleanups.delete(`loading-${actionId}`);
      
      // Restore original icon
      const icon = button.querySelector('.dino-action-icon') as HTMLElement;
      const action = this.actions.find(a => a.id === actionId);
      if (action && icon) {
        icon.innerHTML = action.icon;
      }
      
      // Restore normal button styles
      this.applyActionButtonStyles(button);
    }
  }

  private setButtonDisabled(button: HTMLElement, disabled: boolean): void {
    if (disabled) {
      Object.assign(button.style, {
        opacity: '0.5',
        cursor: 'not-allowed',
        pointerEvents: 'none'
      });
    } else {
      Object.assign(button.style, {
        opacity: '1',
        cursor: 'pointer',
        pointerEvents: 'auto'
      });
    }
  }

  private isButtonDisabled(button: HTMLElement): boolean {
    return button.style.cursor === 'not-allowed';
  }

  private createLoadingSpinner(): HTMLElement {
    const spinner = document.createElement('div');
    spinner.className = 'dino-loading-spinner';
    
    Object.assign(spinner.style, {
      width: '20px',
      height: '20px',
      border: '2px solid rgba(255, 255, 255, 0.3)',
      borderTop: '2px solid rgba(255, 255, 255, 0.8)',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    });

    // Add spin animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    
    if (!document.head.querySelector('style[data-dino-spinner]')) {
      style.setAttribute('data-dino-spinner', 'true');
      document.head.appendChild(style);
    }

    return spinner;
  }

  private slideIn(): void {
    if (!this.element || this.isDestroyed) {
      return;
    }

    // Cancel any existing animation
    if (this.slideAnimation) {
      this.slideAnimation.cancel();
    }

    const isMobile = this.currentViewport?.isMobile || false;
    
    // Use the new animation system
    const cleanup = this.overlayAnimations.animateSidebarIn(this.element, isMobile, {
      duration: isMobile ? 400 : 300,
      easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      respectsReducedMotion: true
    });

    this.animationCleanups.set('slide-in', cleanup);
  }

  private slideOut(): void {
    if (!this.element || this.isDestroyed) {
      return;
    }

    // Cancel any existing animation
    if (this.slideAnimation) {
      this.slideAnimation.cancel();
    }

    const isMobile = this.currentViewport?.isMobile || false;
    
    // Use the new animation system
    const cleanup = this.overlayAnimations.animateSidebarOut(this.element, isMobile, {
      duration: isMobile ? 350 : 250,
      easing: 'cubic-bezier(0.4, 0, 1, 1)',
      respectsReducedMotion: true
    });

    this.animationCleanups.set('slide-out', cleanup);

    // Hide element after animation completes
    setTimeout(() => {
      if (!this.isDestroyed && this.element) {
        this.element.style.display = 'none';
        this.element.style.pointerEvents = 'none';
      }
    }, isMobile ? 350 : 250);
  }

  private getDefaultActions(): QuickAction[] {
    return [
      {
        id: 'minimalist',
        label: 'Minimalist Style',
        icon: '✨',
        prompt: 'Transform this room into a minimalist style with clean lines, neutral colors, and uncluttered space',
        category: 'style'
      },
      {
        id: 'scandi',
        label: 'Scandinavian Style',
        icon: '🏔️',
        prompt: 'Apply Scandinavian design with light woods, cozy textures, and hygge elements',
        category: 'style'
      },
      {
        id: 'modern',
        label: 'Modern Contemporary',
        icon: '🏢',
        prompt: 'Create a modern contemporary look with sleek furniture and bold accents',
        category: 'style'
      },
      {
        id: 'add-sofa',
        label: 'Add Sofa',
        icon: '🛋️',
        prompt: 'Add a stylish sofa that complements the room\'s existing design and color scheme',
        category: 'furniture'
      },
      {
        id: 'add-furniture',
        label: 'Add Furniture',
        icon: '🪑',
        prompt: 'Add appropriate furniture pieces to make this room more functional and inviting',
        category: 'furniture'
      },
      {
        id: 'lighting',
        label: 'Improve Lighting',
        icon: '💡',
        prompt: 'Enhance the room\'s lighting with modern fixtures and ambient lighting solutions',
        category: 'lighting'
      },
      {
        id: 'plants',
        label: 'Add Plants',
        icon: '🌿',
        prompt: 'Add indoor plants and greenery to bring life and freshness to the space',
        category: 'decor'
      },
      {
        id: 'artwork',
        label: 'Add Artwork',
        icon: '🖼️',
        prompt: 'Add tasteful artwork and wall decorations that complement the room\'s style',
        category: 'decor'
      }
    ];
  }

  private getActionDescription(action: QuickAction): string {
    const descriptions: Record<string, string> = {
      'minimalist': 'Clean, uncluttered aesthetic',
      'scandi': 'Cozy Nordic design elements',
      'modern': 'Sleek contemporary styling',
      'add-sofa': 'Perfect seating solution',
      'add-furniture': 'Complete the room setup',
      'lighting': 'Brighten and enhance mood',
      'plants': 'Natural greenery and life',
      'artwork': 'Personalize with wall art'
    };

    return descriptions[action.id] || 'Transform your space';
  }

  private handleActionClick(action: QuickAction): void {
    if (this.isDestroyed || this.props.isProcessing) {
      return;
    }

    this.props.onActionClick(action);
  }

  private handleCloseClick(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    
    if (!this.isDestroyed) {
      this.props.onClose();
    }
  }

  private handleBackdropClick(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    
    if (!this.isDestroyed) {
      this.props.onClose();
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

  private setupTouchGestures(): void {
    if (!this.element || !this.currentViewport?.isTouchDevice) {
      return;
    }

    this.touchGestureHandler = new TouchGestureHandler(this.element, {
      swipeThreshold: 50,
      swipeVelocityThreshold: 0.3,
      debug: false
    });

    this.touchGestureHandler.on('swipe', this.handleSwipeGesture);
    this.touchGestureHandler.initialize();
  }

  private handleViewportChange(viewport: ViewportInfo): void {
    if (this.isDestroyed) {
      return;
    }

    const previousViewport = this.currentViewport;
    this.currentViewport = viewport;

    // Update styles if breakpoint changed
    if (!previousViewport || 
        previousViewport.isMobile !== viewport.isMobile ||
        previousViewport.isTablet !== viewport.isTablet) {
      this.updateResponsiveStyles();
    }
  }

  private handleSwipeGesture(gesture: SwipeGesture): void {
    if (this.isDestroyed || !this.props.visible) {
      return;
    }

    const isMobile = this.currentViewport?.isMobile || false;
    
    // Close sidebar on swipe gestures
    if (isMobile && gesture.direction === 'down') {
      // Swipe down to close on mobile (bottom sheet style)
      this.props.onClose();
    } else if (!isMobile && gesture.direction === 'right') {
      // Swipe right to close on desktop/tablet
      this.props.onClose();
    }
  }

  private updateResponsiveStyles(): void {
    if (!this.element || !this.currentViewport) {
      return;
    }

    const panel = this.element.querySelector('.dino-sidebar-panel') as HTMLElement;
    if (panel) {
      this.applySidebarPanelStyles(panel);
    }

    // Update button styles for touch devices
    const buttons = this.element.querySelectorAll('.dino-action-button') as NodeListOf<HTMLElement>;
    buttons.forEach(button => {
      this.applyActionButtonStyles(button);
    });

    // Update close button for touch devices
    const closeButton = this.element.querySelector('.dino-sidebar-close') as HTMLElement;
    if (closeButton) {
      this.updateCloseButtonForTouch(closeButton);
    }
  }

  private updateCloseButtonForTouch(button: HTMLElement): void {
    const isTouchDevice = this.currentViewport?.isTouchDevice || false;
    const touchTargetSize = this.responsiveManager?.getTouchTargetSize() || 44;

    if (isTouchDevice) {
      Object.assign(button.style, {
        width: `${touchTargetSize}px`,
        height: `${touchTargetSize}px`,
        fontSize: '24px',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation'
      });
    }
  }

  private applyThemeStyles(): void {
    if (!this.element || !this.currentTheme) {
      return;
    }

    // Update panel styles
    const panel = this.element.querySelector('.dino-sidebar-panel') as HTMLElement;
    if (panel) {
      this.applySidebarPanelStyles(panel);
    }

    // Update backdrop styles
    const backdrop = this.element.querySelector('.dino-sidebar-backdrop') as HTMLElement;
    if (backdrop) {
      Object.assign(backdrop.style, {
        backgroundColor: this.currentTheme.mode === 'dark' 
          ? 'rgba(0, 0, 0, 0.4)' 
          : 'rgba(0, 0, 0, 0.2)'
      });
    }

    // Update header text colors
    const title = this.element.querySelector('.dino-sidebar-title') as HTMLElement;
    if (title) {
      title.style.color = 'var(--dino-glass-text)';
    }

    const subtitle = this.element.querySelector('.dino-sidebar-subtitle') as HTMLElement;
    if (subtitle) {
      subtitle.style.color = 'var(--dino-glass-text-secondary)';
    }

    // Update close button
    const closeButton = this.element.querySelector('.dino-sidebar-close') as HTMLElement;
    if (closeButton) {
      Object.assign(closeButton.style, {
        background: 'var(--dino-glass-bg)',
        color: 'var(--dino-glass-text)',
        border: '1px solid var(--dino-glass-border)'
      });
    }

    // Update action buttons
    const buttons = this.element.querySelectorAll('.dino-action-button') as NodeListOf<HTMLElement>;
    buttons.forEach(button => {
      this.applyActionButtonStyles(button);
      
      // Update text colors
      const label = button.querySelector('.dino-action-label') as HTMLElement;
      if (label) {
        label.style.color = 'var(--dino-glass-text)';
      }
      
      const description = button.querySelector('.dino-action-description') as HTMLElement;
      if (description) {
        description.style.color = 'var(--dino-glass-text-secondary)';
      }
    });
  }
}