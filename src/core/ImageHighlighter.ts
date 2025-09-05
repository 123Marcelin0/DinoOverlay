import { Component } from './OverlayManager';
import { SelectedImage, OverlayState, AnimationConfig } from '../types/overlay';
import { OverlayAnimations, OverlayAnimationConfig } from './OverlayAnimations';
import { AnimationCleanup } from './AnimationSystem';

export interface HighlighterProps {
  selectedImage: SelectedImage | null;
  onClose: () => void;
  onImageClick?: (image: HTMLImageElement) => void;
}

export class ImageHighlighter implements Component {
  private element: HTMLElement | null = null;
  private glowAnimation: Animation | null = null;
  private props: HighlighterProps;
  private isDestroyed: boolean = false;
  private resizeObserver: ResizeObserver | null = null;
  private overlayAnimations: OverlayAnimations;
  private animationCleanups: Map<string, AnimationCleanup> = new Map();
  private hoverCleanups: Map<string, () => void> = new Map();

  constructor(props: HighlighterProps, overlayAnimations?: OverlayAnimations) {
    this.props = props;
    this.overlayAnimations = overlayAnimations || new OverlayAnimations(new (require('./AnimationSystem').AnimationSystem)());
    this.handleCloseClick = this.handleCloseClick.bind(this);
    this.handleImageClick = this.handleImageClick.bind(this);
  }

  public render(): HTMLElement {
    if (this.isDestroyed) {
      throw new Error('ImageHighlighter has been destroyed');
    }

    // Create or update the highlighter element
    if (!this.element) {
      this.element = this.createElement();
    }

    this.updateElement();
    return this.element;
  }

  public update(state: OverlayState): void {
    if (this.isDestroyed) {
      return;
    }

    const newProps: HighlighterProps = {
      ...this.props,
      selectedImage: state.selectedImage
    };

    this.props = newProps;

    if (this.element) {
      this.updateElement();
    }
  }

  public destroy(): void {
    if (this.isDestroyed) {
      return;
    }

    this.isDestroyed = true;

    // Stop glow animation
    this.stopGlowAnimation();

    // Clean up animations
    this.animationCleanups.forEach(cleanup => cleanup.cancel());
    this.animationCleanups.clear();

    // Clean up hover animations
    this.hoverCleanups.forEach(cleanup => cleanup());
    this.hoverCleanups.clear();

    // Clean up overlay animations
    this.overlayAnimations.cleanup();

    // Disconnect resize observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    // Remove element from DOM
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }

    this.element = null;
  }

  private createElement(): HTMLElement {
    const highlighter = document.createElement('div');
    highlighter.className = 'dino-image-highlighter';
    
    // Apply base styles
    this.applyBaseStyles(highlighter);

    // Create close button
    const closeButton = this.createCloseButton();
    highlighter.appendChild(closeButton);

    // Setup resize observer to track image changes
    this.setupResizeObserver();

    return highlighter;
  }

  private updateElement(): void {
    if (!this.element || this.isDestroyed) {
      return;
    }

    const { selectedImage } = this.props;

    if (!selectedImage) {
      // Animate highlighter out when no image is selected
      const cleanup = this.overlayAnimations.animateHighlighterOut(this.element, {
        duration: 200,
        respectsReducedMotion: true
      });
      this.animationCleanups.set('hide', cleanup);
      this.stopGlowAnimation();
      return;
    }

    // Show and position highlighter with animation
    this.positionHighlighter(selectedImage);
    this.updateBorderRadius(selectedImage);
    
    // Animate highlighter in
    const cleanup = this.overlayAnimations.animateHighlighterIn(this.element, selectedImage, {
      duration: 400,
      respectsReducedMotion: true
    });
    this.animationCleanups.set('show', cleanup);
  }

  private applyBaseStyles(element: HTMLElement): void {
    // Apply glassmorphic styling with CSS-in-JS
    Object.assign(element.style, {
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: '999999',
      display: 'none',
      
      // Glassmorphic border styling
      border: '2px solid rgba(255, 255, 255, 0.3)',
      borderRadius: '8px',
      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      
      // Shadow and glow effects
      boxShadow: `
        0 8px 32px rgba(0, 0, 0, 0.1),
        0 0 0 1px rgba(255, 255, 255, 0.1),
        inset 0 1px 0 rgba(255, 255, 255, 0.2)
      `,
      
      // Smooth transitions
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      
      // Ensure proper rendering
      willChange: 'transform, opacity',
      transform: 'translateZ(0)'
    });
  }

  private createCloseButton(): HTMLElement {
    const button = document.createElement('button');
    button.className = 'dino-highlighter-close';
    button.innerHTML = '×';
    button.setAttribute('aria-label', 'Close image highlighter');
    
    // Style the close button
    Object.assign(button.style, {
      position: 'absolute',
      top: '-12px',
      right: '-12px',
      width: '24px',
      height: '24px',
      borderRadius: '50%',
      border: 'none',
      
      // Glassmorphic button styling
      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.1))',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      
      // Typography
      color: 'rgba(255, 255, 255, 0.9)',
      fontSize: '16px',
      fontWeight: 'bold',
      lineHeight: '1',
      
      // Interactive styles
      cursor: 'pointer',
      pointerEvents: 'auto',
      
      // Shadow and effects
      boxShadow: `
        0 4px 16px rgba(0, 0, 0, 0.1),
        0 0 0 1px rgba(255, 255, 255, 0.2),
        inset 0 1px 0 rgba(255, 255, 255, 0.3)
      `,
      
      // Smooth transitions
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      transform: 'scale(1)',
      
      // Ensure proper rendering
      willChange: 'transform, box-shadow'
    });

    // Add hover and active states
    button.addEventListener('mouseenter', () => {
      if (!this.isDestroyed) {
        Object.assign(button.style, {
          transform: 'scale(1.1)',
          boxShadow: `
            0 6px 20px rgba(0, 0, 0, 0.15),
            0 0 0 1px rgba(255, 255, 255, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.4),
            0 0 20px rgba(255, 255, 255, 0.2)
          `
        });
      }
    });

    button.addEventListener('mouseleave', () => {
      if (!this.isDestroyed) {
        Object.assign(button.style, {
          transform: 'scale(1)',
          boxShadow: `
            0 4px 16px rgba(0, 0, 0, 0.1),
            0 0 0 1px rgba(255, 255, 255, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.3)
          `
        });
      }
    });

    button.addEventListener('mousedown', () => {
      if (!this.isDestroyed) {
        button.style.transform = 'scale(0.95)';
      }
    });

    button.addEventListener('mouseup', () => {
      if (!this.isDestroyed) {
        button.style.transform = 'scale(1.1)';
      }
    });

    button.addEventListener('click', this.handleCloseClick);

    // Setup hover and focus animations for close button
    const hoverCleanup = this.overlayAnimations.setupButtonHoverAnimation(button, {
      duration: 200,
      respectsReducedMotion: true
    });
    
    const focusCleanup = this.overlayAnimations.setupButtonFocusAnimation(button, {
      duration: 200,
      respectsReducedMotion: true
    });

    this.hoverCleanups.set('close-hover', hoverCleanup);
    this.hoverCleanups.set('close-focus', focusCleanup);

    return button;
  }

  private positionHighlighter(selectedImage: SelectedImage): void {
    if (!this.element || this.isDestroyed) {
      return;
    }

    const { rect } = selectedImage;
    
    // Position the highlighter to match the image exactly
    Object.assign(this.element.style, {
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`
    });
  }

  private updateBorderRadius(selectedImage: SelectedImage): void {
    if (!this.element || this.isDestroyed) {
      return;
    }

    // Match the image's border radius exactly
    this.element.style.borderRadius = selectedImage.borderRadius || '8px';
  }

  private startGlowAnimation(): void {
    if (!this.element || this.isDestroyed || this.glowAnimation) {
      return;
    }

    // Create pulsing glow animation
    const keyframes = [
      {
        boxShadow: `
          0 8px 32px rgba(0, 0, 0, 0.1),
          0 0 0 1px rgba(255, 255, 255, 0.1),
          inset 0 1px 0 rgba(255, 255, 255, 0.2),
          0 0 20px rgba(59, 130, 246, 0.3)
        `,
        borderColor: 'rgba(59, 130, 246, 0.4)'
      },
      {
        boxShadow: `
          0 8px 32px rgba(0, 0, 0, 0.1),
          0 0 0 1px rgba(255, 255, 255, 0.1),
          inset 0 1px 0 rgba(255, 255, 255, 0.2),
          0 0 40px rgba(59, 130, 246, 0.5)
        `,
        borderColor: 'rgba(59, 130, 246, 0.6)'
      },
      {
        boxShadow: `
          0 8px 32px rgba(0, 0, 0, 0.1),
          0 0 0 1px rgba(255, 255, 255, 0.1),
          inset 0 1px 0 rgba(255, 255, 255, 0.2),
          0 0 20px rgba(59, 130, 246, 0.3)
        `,
        borderColor: 'rgba(59, 130, 246, 0.4)'
      }
    ];

    const animationConfig: KeyframeAnimationOptions = {
      duration: 2000,
      iterations: Infinity,
      easing: 'cubic-bezier(0.4, 0, 0.6, 1)'
    };

    try {
      this.glowAnimation = this.element.animate(keyframes, animationConfig);
    } catch (error) {
      console.warn('[ImageHighlighter] Failed to start glow animation:', error);
    }
  }

  private stopGlowAnimation(): void {
    if (this.glowAnimation) {
      this.glowAnimation.cancel();
      this.glowAnimation = null;
    }
  }

  private setupResizeObserver(): void {
    if (!this.props.selectedImage?.element || this.resizeObserver) {
      return;
    }

    try {
      this.resizeObserver = new ResizeObserver((entries) => {
        if (this.isDestroyed || !this.props.selectedImage) {
          return;
        }

        // Update highlighter position when image resizes
        for (const entry of entries) {
          if (entry.target === this.props.selectedImage.element) {
            const rect = entry.target.getBoundingClientRect();
            const updatedSelectedImage: SelectedImage = {
              ...this.props.selectedImage,
              rect
            };
            
            this.props = {
              ...this.props,
              selectedImage: updatedSelectedImage
            };
            
            this.positionHighlighter(updatedSelectedImage);
            break;
          }
        }
      });

      this.resizeObserver.observe(this.props.selectedImage.element);
    } catch (error) {
      console.warn('[ImageHighlighter] ResizeObserver not supported:', error);
    }
  }

  private handleCloseClick(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    
    if (!this.isDestroyed) {
      this.props.onClose();
    }
  }

  private handleImageClick(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    
    if (!this.isDestroyed && this.props.selectedImage && this.props.onImageClick) {
      this.props.onImageClick(this.props.selectedImage.element);
    }
  }

  // Static utility methods for border radius calculation
  public static calculateBorderRadius(element: HTMLImageElement): string {
    if (!element) {
      return '8px';
    }

    try {
      const computedStyle = window.getComputedStyle(element);
      const borderRadius = computedStyle.borderRadius;
      
      // If border radius is set, use it
      if (borderRadius && borderRadius !== '0px') {
        return borderRadius;
      }

      // Check individual corner properties
      const topLeft = computedStyle.borderTopLeftRadius;
      const topRight = computedStyle.borderTopRightRadius;
      const bottomRight = computedStyle.borderBottomRightRadius;
      const bottomLeft = computedStyle.borderBottomLeftRadius;

      // If all corners are the same, return single value
      if (topLeft === topRight && topRight === bottomRight && bottomRight === bottomLeft) {
        return topLeft || '8px';
      }

      // Return individual corner values
      return `${topLeft || '0px'} ${topRight || '0px'} ${bottomRight || '0px'} ${bottomLeft || '0px'}`;
    } catch (error) {
      console.warn('[ImageHighlighter] Failed to calculate border radius:', error);
      return '8px';
    }
  }

  public static createGlowKeyframes(color: string = 'rgba(59, 130, 246, 0.5)'): Keyframe[] {
    return [
      {
        boxShadow: `
          0 8px 32px rgba(0, 0, 0, 0.1),
          0 0 0 1px rgba(255, 255, 255, 0.1),
          inset 0 1px 0 rgba(255, 255, 255, 0.2),
          0 0 20px ${color}
        `
      },
      {
        boxShadow: `
          0 8px 32px rgba(0, 0, 0, 0.1),
          0 0 0 1px rgba(255, 255, 255, 0.1),
          inset 0 1px 0 rgba(255, 255, 255, 0.2),
          0 0 40px ${color}
        `
      },
      {
        boxShadow: `
          0 8px 32px rgba(0, 0, 0, 0.1),
          0 0 0 1px rgba(255, 255, 255, 0.1),
          inset 0 1px 0 rgba(255, 255, 255, 0.2),
          0 0 20px ${color}
        `
      }
    ];
  }
}