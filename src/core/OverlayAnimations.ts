import { AnimationSystem, AnimationCleanup, AnimationOptions } from './AnimationSystem';
import { SelectedImage } from '../types/overlay';

export interface OverlayAnimationConfig {
  duration?: number;
  easing?: string;
  stagger?: number;
  respectsReducedMotion?: boolean;
}

export class OverlayAnimations {
  private animationSystem: AnimationSystem;
  private activeCleanups: Map<string, AnimationCleanup> = new Map();
  private prefersReducedMotion: boolean = false;

  constructor(animationSystem: AnimationSystem) {
    this.animationSystem = animationSystem;
    this.detectReducedMotionPreference();
  }

  /**
   * Animate sidebar slide-in with glassmorphic reveal
   */
  public animateSidebarIn(
    sidebarElement: HTMLElement,
    isMobile: boolean = false,
    config: OverlayAnimationConfig = {}
  ): AnimationCleanup {
    const cleanupId = 'sidebar-in';
    this.cleanupPrevious(cleanupId);

    if (this.shouldSkipAnimation(config)) {
      return this.createNoOpCleanup();
    }

    const direction = isMobile ? 'down' : 'right';
    const duration = config.duration || (isMobile ? 400 : 300);

    // Show the element first
    sidebarElement.style.display = 'block';
    sidebarElement.style.pointerEvents = 'auto';

    // Animate backdrop
    const backdrop = sidebarElement.querySelector('.dino-sidebar-backdrop') as HTMLElement;
    if (backdrop) {
      this.animationSystem.fadeIn(backdrop, { duration: duration * 0.8 });
    }

    // Animate panel with slide and scale
    const panel = sidebarElement.querySelector('.dino-sidebar-panel') as HTMLElement;
    if (panel) {
      const cleanup = this.animationSystem.createCustomAnimation(panel, [
        {
          transform: isMobile ? 'translateY(100%) scale(0.95)' : 'translateX(100%) scale(0.95)',
          opacity: '0'
        },
        {
          transform: isMobile ? 'translateY(0) scale(1)' : 'translateX(0) scale(1)',
          opacity: '1'
        }
      ], {
        duration,
        easing: config.easing || 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        delay: config.stagger || 0
      });

      this.activeCleanups.set(cleanupId, cleanup);
      return cleanup;
    }

    return this.createNoOpCleanup();
  }

  /**
   * Animate sidebar slide-out with glassmorphic fade
   */
  public animateSidebarOut(
    sidebarElement: HTMLElement,
    isMobile: boolean = false,
    config: OverlayAnimationConfig = {}
  ): AnimationCleanup {
    const cleanupId = 'sidebar-out';
    this.cleanupPrevious(cleanupId);

    if (this.shouldSkipAnimation(config)) {
      sidebarElement.style.display = 'none';
      return this.createNoOpCleanup();
    }

    const duration = config.duration || (isMobile ? 350 : 250);

    // Animate backdrop fade
    const backdrop = sidebarElement.querySelector('.dino-sidebar-backdrop') as HTMLElement;
    if (backdrop) {
      this.animationSystem.fadeOut(backdrop, { duration: duration * 0.6 });
    }

    // Animate panel slide out
    const panel = sidebarElement.querySelector('.dino-sidebar-panel') as HTMLElement;
    if (panel) {
      const cleanup = this.animationSystem.createCustomAnimation(panel, [
        {
          transform: isMobile ? 'translateY(0) scale(1)' : 'translateX(0) scale(1)',
          opacity: '1'
        },
        {
          transform: isMobile ? 'translateY(100%) scale(0.95)' : 'translateX(100%) scale(0.95)',
          opacity: '0'
        }
      ], {
        duration,
        easing: config.easing || 'cubic-bezier(0.4, 0, 1, 1)',
        delay: config.stagger || 0
      });

      // Hide element after animation
      cleanup.cancel = () => {
        sidebarElement.style.display = 'none';
        sidebarElement.style.pointerEvents = 'none';
      };

      this.activeCleanups.set(cleanupId, cleanup);
      return cleanup;
    }

    return this.createNoOpCleanup();
  }

  /**
   * Animate chat bar slide-in from bottom
   */
  public animateChatBarIn(
    chatBarElement: HTMLElement,
    config: OverlayAnimationConfig = {}
  ): AnimationCleanup {
    const cleanupId = 'chatbar-in';
    this.cleanupPrevious(cleanupId);

    if (this.shouldSkipAnimation(config)) {
      return this.createNoOpCleanup();
    }

    const duration = config.duration || 300;

    chatBarElement.style.display = 'block';
    chatBarElement.style.pointerEvents = 'auto';

    const cleanup = this.animationSystem.createCustomAnimation(chatBarElement, [
      {
        transform: 'translateY(100%) scale(0.9)',
        opacity: '0'
      },
      {
        transform: 'translateY(0) scale(1)',
        opacity: '1'
      }
    ], {
      duration,
      easing: config.easing || 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      delay: config.stagger || 0
    });

    this.activeCleanups.set(cleanupId, cleanup);
    return cleanup;
  }

  /**
   * Animate chat bar slide-out to bottom
   */
  public animateChatBarOut(
    chatBarElement: HTMLElement,
    config: OverlayAnimationConfig = {}
  ): AnimationCleanup {
    const cleanupId = 'chatbar-out';
    this.cleanupPrevious(cleanupId);

    if (this.shouldSkipAnimation(config)) {
      chatBarElement.style.display = 'none';
      return this.createNoOpCleanup();
    }

    const duration = config.duration || 250;

    const cleanup = this.animationSystem.createCustomAnimation(chatBarElement, [
      {
        transform: 'translateY(0) scale(1)',
        opacity: '1'
      },
      {
        transform: 'translateY(100%) scale(0.9)',
        opacity: '0'
      }
    ], {
      duration,
      easing: config.easing || 'cubic-bezier(0.4, 0, 1, 1)',
      delay: config.stagger || 0
    });

    // Hide element after animation
    cleanup.cancel = () => {
      chatBarElement.style.display = 'none';
      chatBarElement.style.pointerEvents = 'none';
    };

    this.activeCleanups.set(cleanupId, cleanup);
    return cleanup;
  }

  /**
   * Animate image highlighter appearance with glow effect
   */
  public animateHighlighterIn(
    highlighterElement: HTMLElement,
    selectedImage: SelectedImage,
    config: OverlayAnimationConfig = {}
  ): AnimationCleanup {
    const cleanupId = 'highlighter-in';
    this.cleanupPrevious(cleanupId);

    if (this.shouldSkipAnimation(config)) {
      return this.createNoOpCleanup();
    }

    const duration = config.duration || 400;

    // Position the highlighter to match the image
    this.positionHighlighter(highlighterElement, selectedImage);

    // Animate the highlighter appearance
    const cleanup = this.animationSystem.createCustomAnimation(highlighterElement, [
      {
        opacity: '0',
        transform: 'scale(0.8)',
        borderWidth: '0px'
      },
      {
        opacity: '1',
        transform: 'scale(1)',
        borderWidth: '2px'
      }
    ], {
      duration,
      easing: config.easing || 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      delay: config.stagger || 0
    });

    // Start glow animation
    this.startHighlighterGlow(highlighterElement);

    this.activeCleanups.set(cleanupId, cleanup);
    return cleanup;
  }

  /**
   * Animate image highlighter removal
   */
  public animateHighlighterOut(
    highlighterElement: HTMLElement,
    config: OverlayAnimationConfig = {}
  ): AnimationCleanup {
    const cleanupId = 'highlighter-out';
    this.cleanupPrevious(cleanupId);

    if (this.shouldSkipAnimation(config)) {
      highlighterElement.style.display = 'none';
      return this.createNoOpCleanup();
    }

    const duration = config.duration || 200;

    const cleanup = this.animationSystem.createCustomAnimation(highlighterElement, [
      {
        opacity: '1',
        transform: 'scale(1)'
      },
      {
        opacity: '0',
        transform: 'scale(0.8)'
      }
    ], {
      duration,
      easing: config.easing || 'cubic-bezier(0.4, 0, 1, 1)',
      delay: config.stagger || 0
    });

    // Stop glow animation
    this.stopHighlighterGlow(highlighterElement);

    // Hide element after animation
    cleanup.cancel = () => {
      highlighterElement.style.display = 'none';
    };

    this.activeCleanups.set(cleanupId, cleanup);
    return cleanup;
  }

  /**
   * Animate button hover state with scale and glow
   */
  public setupButtonHoverAnimation(
    buttonElement: HTMLElement,
    config: OverlayAnimationConfig = {}
  ): () => void {
    if (this.shouldSkipAnimation(config)) {
      return () => {};
    }

    return this.animationSystem.setupHoverAnimation(buttonElement, {
      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.08))',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.2)'
    }, {
      duration: config.duration || 200,
      easing: config.easing || 'cubic-bezier(0.4, 0, 0.2, 1)',
      scaleOnHover: true,
      glowOnHover: true,
      glowColor: 'rgba(59, 130, 246, 0.3)'
    });
  }

  /**
   * Animate button focus state
   */
  public setupButtonFocusAnimation(
    buttonElement: HTMLElement,
    config: OverlayAnimationConfig = {}
  ): () => void {
    if (this.shouldSkipAnimation(config)) {
      return () => {};
    }

    return this.animationSystem.setupFocusAnimation(buttonElement, {
      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.08))'
    }, {
      duration: config.duration || 200,
      easing: config.easing || 'cubic-bezier(0.4, 0, 0.2, 1)',
      glowOnFocus: true,
      glowColor: 'rgba(59, 130, 246, 0.5)'
    });
  }

  /**
   * Animate loading state with pulse and spinner
   */
  public animateLoadingState(
    element: HTMLElement,
    isLoading: boolean,
    config: OverlayAnimationConfig = {}
  ): AnimationCleanup {
    const cleanupId = `loading-${element.className}`;
    this.cleanupPrevious(cleanupId);

    if (this.shouldSkipAnimation(config)) {
      return this.createNoOpCleanup();
    }

    if (isLoading) {
      // Add loading spinner if not present
      const existingSpinner = element.querySelector('.dino-loading-spinner');
      if (!existingSpinner) {
        const spinner = this.createLoadingSpinner();
        const iconElement = element.querySelector('.dino-action-icon, .dino-chat-icon');
        if (iconElement) {
          iconElement.innerHTML = '';
          iconElement.appendChild(spinner);
        }
      }

      // Start pulse animation
      const cleanup = this.animationSystem.pulse(element, {
        duration: config.duration || 1000,
        iterations: Infinity
      });

      this.activeCleanups.set(cleanupId, cleanup);
      return cleanup;
    } else {
      // Remove loading spinner
      const spinner = element.querySelector('.dino-loading-spinner');
      if (spinner) {
        spinner.remove();
      }

      return this.createNoOpCleanup();
    }
  }

  /**
   * Animate error state with shake effect
   */
  public animateErrorState(
    element: HTMLElement,
    config: OverlayAnimationConfig = {}
  ): AnimationCleanup {
    const cleanupId = `error-${element.className}`;
    this.cleanupPrevious(cleanupId);

    if (this.shouldSkipAnimation(config)) {
      return this.createNoOpCleanup();
    }

    // Add error styling
    const originalBackground = element.style.background;
    const originalBorder = element.style.border;

    element.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.1))';
    element.style.border = '1px solid rgba(239, 68, 68, 0.3)';

    const cleanup = this.animationSystem.shake(element, {
      duration: config.duration || 500,
      easing: config.easing || 'ease-in-out'
    });

    // Restore original styling after animation
    setTimeout(() => {
      element.style.background = originalBackground;
      element.style.border = originalBorder;
    }, config.duration || 500);

    this.activeCleanups.set(cleanupId, cleanup);
    return cleanup;
  }

  /**
   * Animate staggered list items (for action buttons)
   */
  public animateStaggeredList(
    listElement: HTMLElement,
    config: OverlayAnimationConfig = {}
  ): AnimationCleanup[] {
    if (this.shouldSkipAnimation(config)) {
      return [];
    }

    const items = Array.from(listElement.children) as HTMLElement[];
    const staggerDelay = config.stagger || 50;
    const cleanups: AnimationCleanup[] = [];

    items.forEach((item, index) => {
      const cleanup = this.animationSystem.createCustomAnimation(item, [
        {
          opacity: '0',
          transform: 'translateX(20px)'
        },
        {
          opacity: '1',
          transform: 'translateX(0)'
        }
      ], {
        duration: config.duration || 300,
        easing: config.easing || 'cubic-bezier(0.4, 0, 0.2, 1)',
        delay: index * staggerDelay
      });

      cleanups.push(cleanup);
    });

    return cleanups;
  }

  /**
   * Clean up all active animations
   */
  public cleanup(): void {
    this.activeCleanups.forEach(cleanup => {
      cleanup.cancel();
    });
    this.activeCleanups.clear();
  }

  /**
   * Clean up specific animation
   */
  public cleanupAnimation(cleanupId: string): void {
    const cleanup = this.activeCleanups.get(cleanupId);
    if (cleanup) {
      cleanup.cancel();
      this.activeCleanups.delete(cleanupId);
    }
  }

  // Private methods

  private cleanupPrevious(cleanupId: string): void {
    const existingCleanup = this.activeCleanups.get(cleanupId);
    if (existingCleanup) {
      existingCleanup.cancel();
      this.activeCleanups.delete(cleanupId);
    }
  }

  private shouldSkipAnimation(config: OverlayAnimationConfig): boolean {
    return (config.respectsReducedMotion !== false && this.prefersReducedMotion);
  }

  private createNoOpCleanup(): AnimationCleanup {
    return {
      cancel: () => {},
      finish: () => {},
      pause: () => {},
      play: () => {}
    };
  }

  private detectReducedMotionPreference(): void {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.prefersReducedMotion = mediaQuery.matches;

      // Listen for changes
      mediaQuery.addEventListener('change', (e) => {
        this.prefersReducedMotion = e.matches;
      });
    }
  }

  private positionHighlighter(highlighterElement: HTMLElement, selectedImage: SelectedImage): void {
    const { rect, borderRadius } = selectedImage;

    Object.assign(highlighterElement.style, {
      position: 'absolute',
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      borderRadius: borderRadius,
      pointerEvents: 'none',
      zIndex: '999997'
    });
  }

  private startHighlighterGlow(highlighterElement: HTMLElement): void {
    const glowCleanup = this.animationSystem.glow(highlighterElement, 'rgba(59, 130, 246, 0.6)', {
      duration: 2000,
      iterations: Infinity
    });

    this.activeCleanups.set('highlighter-glow', glowCleanup);
  }

  private stopHighlighterGlow(highlighterElement: HTMLElement): void {
    this.cleanupAnimation('highlighter-glow');
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
      display: 'inline-block'
    });

    // Start spin animation
    const spinCleanup = this.animationSystem.spin(spinner);
    
    // Store cleanup for later removal
    spinner.addEventListener('remove', () => {
      spinCleanup.cancel();
    });

    return spinner;
  }
}

// Export singleton instance
export const overlayAnimations = new OverlayAnimations(new AnimationSystem());