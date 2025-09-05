import { AnimationConfig } from '../types/overlay';

export interface AnimationOptions extends AnimationConfig {
  fill?: FillMode;
  iterations?: number;
  direction?: PlaybackDirection;
}

export interface AnimationKeyframe {
  [property: string]: string | number;
}

export interface TransitionConfig {
  property: string;
  duration: number;
  easing: string;
  delay?: number;
}

export interface AnimationCleanup {
  cancel: () => void;
  finish: () => void;
  pause: () => void;
  play: () => void;
}

export class AnimationSystem {
  private activeAnimations: Map<string, Animation> = new Map();
  private animationCounter: number = 0;
  private defaultEasing: string = 'cubic-bezier(0.4, 0, 0.2, 1)';

  /**
   * Create a slide-in animation from the specified direction
   */
  public slideIn(
    element: HTMLElement,
    direction: 'left' | 'right' | 'up' | 'down' = 'right',
    options: Partial<AnimationOptions> = {}
  ): AnimationCleanup {
    const animationId = this.generateAnimationId('slide-in');
    
    const config: AnimationOptions = {
      duration: 300,
      easing: this.defaultEasing,
      fill: 'forwards',
      ...options
    };

    const transforms = this.getSlideTransforms(direction);
    
    const keyframes: AnimationKeyframe[] = [
      { 
        transform: transforms.from,
        opacity: '0'
      },
      { 
        transform: transforms.to,
        opacity: '1'
      }
    ];

    return this.createAnimation(element, keyframes, config, animationId);
  }

  /**
   * Create a slide-out animation to the specified direction
   */
  public slideOut(
    element: HTMLElement,
    direction: 'left' | 'right' | 'up' | 'down' = 'right',
    options: Partial<AnimationOptions> = {}
  ): AnimationCleanup {
    const animationId = this.generateAnimationId('slide-out');
    
    const config: AnimationOptions = {
      duration: 300,
      easing: this.defaultEasing,
      fill: 'forwards',
      ...options
    };

    const transforms = this.getSlideTransforms(direction);
    
    const keyframes: AnimationKeyframe[] = [
      { 
        transform: transforms.to,
        opacity: '1'
      },
      { 
        transform: transforms.from,
        opacity: '0'
      }
    ];

    return this.createAnimation(element, keyframes, config, animationId);
  }

  /**
   * Create a fade-in animation
   */
  public fadeIn(
    element: HTMLElement,
    options: Partial<AnimationOptions> = {}
  ): AnimationCleanup {
    const animationId = this.generateAnimationId('fade-in');
    
    const config: AnimationOptions = {
      duration: 200,
      easing: this.defaultEasing,
      fill: 'forwards',
      ...options
    };

    const keyframes: AnimationKeyframe[] = [
      { opacity: '0' },
      { opacity: '1' }
    ];

    return this.createAnimation(element, keyframes, config, animationId);
  }

  /**
   * Create a fade-out animation
   */
  public fadeOut(
    element: HTMLElement,
    options: Partial<AnimationOptions> = {}
  ): AnimationCleanup {
    const animationId = this.generateAnimationId('fade-out');
    
    const config: AnimationOptions = {
      duration: 200,
      easing: this.defaultEasing,
      fill: 'forwards',
      ...options
    };

    const keyframes: AnimationKeyframe[] = [
      { opacity: '1' },
      { opacity: '0' }
    ];

    return this.createAnimation(element, keyframes, config, animationId);
  }

  /**
   * Create a scale animation
   */
  public scale(
    element: HTMLElement,
    fromScale: number = 0.8,
    toScale: number = 1,
    options: Partial<AnimationOptions> = {}
  ): AnimationCleanup {
    const animationId = this.generateAnimationId('scale');
    
    const config: AnimationOptions = {
      duration: 200,
      easing: this.defaultEasing,
      fill: 'forwards',
      ...options
    };

    const keyframes: AnimationKeyframe[] = [
      { 
        transform: `scale(${fromScale})`,
        opacity: '0'
      },
      { 
        transform: `scale(${toScale})`,
        opacity: '1'
      }
    ];

    return this.createAnimation(element, keyframes, config, animationId);
  }

  /**
   * Create a glow animation for highlighting elements
   */
  public glow(
    element: HTMLElement,
    color: string = 'rgba(59, 130, 246, 0.5)',
    options: Partial<AnimationOptions> = {}
  ): AnimationCleanup {
    const animationId = this.generateAnimationId('glow');
    
    const config: AnimationOptions = {
      duration: 2000,
      easing: 'ease-in-out',
      iterations: Infinity,
      direction: 'alternate',
      ...options
    };

    const keyframes: AnimationKeyframe[] = [
      { 
        boxShadow: `0 0 5px ${color}`,
        borderColor: color.replace('0.5', '0.3')
      },
      { 
        boxShadow: `0 0 20px ${color}, 0 0 30px ${color}`,
        borderColor: color.replace('0.5', '0.8')
      }
    ];

    return this.createAnimation(element, keyframes, config, animationId);
  }

  /**
   * Create a pulse animation
   */
  public pulse(
    element: HTMLElement,
    options: Partial<AnimationOptions> = {}
  ): AnimationCleanup {
    const animationId = this.generateAnimationId('pulse');
    
    const config: AnimationOptions = {
      duration: 1000,
      easing: 'ease-in-out',
      iterations: Infinity,
      direction: 'alternate',
      ...options
    };

    const keyframes: AnimationKeyframe[] = [
      { transform: 'scale(1)', opacity: '1' },
      { transform: 'scale(1.05)', opacity: '0.8' }
    ];

    return this.createAnimation(element, keyframes, config, animationId);
  }

  /**
   * Create a bounce animation
   */
  public bounce(
    element: HTMLElement,
    options: Partial<AnimationOptions> = {}
  ): AnimationCleanup {
    const animationId = this.generateAnimationId('bounce');
    
    const config: AnimationOptions = {
      duration: 600,
      easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      fill: 'forwards',
      ...options
    };

    const keyframes: AnimationKeyframe[] = [
      { transform: 'scale(0.3)', opacity: '0' },
      { transform: 'scale(1.05)', opacity: '0.8' },
      { transform: 'scale(0.9)', opacity: '0.9' },
      { transform: 'scale(1)', opacity: '1' }
    ];

    return this.createAnimation(element, keyframes, config, animationId);
  }

  /**
   * Create a shake animation for error states
   */
  public shake(
    element: HTMLElement,
    options: Partial<AnimationOptions> = {}
  ): AnimationCleanup {
    const animationId = this.generateAnimationId('shake');
    
    const config: AnimationOptions = {
      duration: 500,
      easing: 'ease-in-out',
      fill: 'forwards',
      ...options
    };

    const keyframes: AnimationKeyframe[] = [
      { transform: 'translateX(0)' },
      { transform: 'translateX(-10px)' },
      { transform: 'translateX(10px)' },
      { transform: 'translateX(-10px)' },
      { transform: 'translateX(10px)' },
      { transform: 'translateX(-5px)' },
      { transform: 'translateX(5px)' },
      { transform: 'translateX(0)' }
    ];

    return this.createAnimation(element, keyframes, config, animationId);
  }

  /**
   * Create a loading spinner animation
   */
  public spin(
    element: HTMLElement,
    options: Partial<AnimationOptions> = {}
  ): AnimationCleanup {
    const animationId = this.generateAnimationId('spin');
    
    const config: AnimationOptions = {
      duration: 1000,
      easing: 'linear',
      iterations: Infinity,
      ...options
    };

    const keyframes: AnimationKeyframe[] = [
      { transform: 'rotate(0deg)' },
      { transform: 'rotate(360deg)' }
    ];

    return this.createAnimation(element, keyframes, config, animationId);
  }

  /**
   * Apply CSS transitions to an element
   */
  public applyTransition(
    element: HTMLElement,
    transitions: TransitionConfig[]
  ): void {
    const transitionStrings = transitions.map(config => {
      const delay = config.delay ? ` ${config.delay}ms` : '';
      return `${config.property} ${config.duration}ms ${config.easing}${delay}`;
    });

    element.style.transition = transitionStrings.join(', ');
  }

  /**
   * Create hover animations for interactive elements
   */
  public setupHoverAnimation(
    element: HTMLElement,
    hoverStyles: Partial<CSSStyleDeclaration>,
    options: {
      duration?: number;
      easing?: string;
      scaleOnHover?: boolean;
      glowOnHover?: boolean;
      glowColor?: string;
    } = {}
  ): () => void {
    const {
      duration = 200,
      easing = this.defaultEasing,
      scaleOnHover = false,
      glowOnHover = false,
      glowColor = 'rgba(59, 130, 246, 0.3)'
    } = options;

    // Store original styles
    const originalStyles: Partial<CSSStyleDeclaration> = {};
    Object.keys(hoverStyles).forEach(key => {
      const styleKey = key as keyof CSSStyleDeclaration;
      originalStyles[styleKey] = element.style[styleKey] as any;
    });

    // Setup transitions
    const transitionProperties = Object.keys(hoverStyles);
    if (scaleOnHover) transitionProperties.push('transform');
    if (glowOnHover) transitionProperties.push('box-shadow', 'border-color');

    const transitions: TransitionConfig[] = transitionProperties.map(property => ({
      property,
      duration,
      easing
    }));

    this.applyTransition(element, transitions);

    // Mouse enter handler
    const handleMouseEnter = () => {
      Object.assign(element.style, hoverStyles);
      
      if (scaleOnHover) {
        element.style.transform = (element.style.transform || '') + ' scale(1.05)';
      }
      
      if (glowOnHover) {
        element.style.boxShadow = `0 0 15px ${glowColor}`;
        element.style.borderColor = glowColor;
      }
    };

    // Mouse leave handler
    const handleMouseLeave = () => {
      Object.assign(element.style, originalStyles);
      
      if (scaleOnHover) {
        element.style.transform = (element.style.transform || '').replace(' scale(1.05)', '');
      }
      
      if (glowOnHover) {
        element.style.boxShadow = originalStyles.boxShadow || '';
        element.style.borderColor = originalStyles.borderColor || '';
      }
    };

    element.addEventListener('mouseenter', handleMouseEnter);
    element.addEventListener('mouseleave', handleMouseLeave);

    // Return cleanup function
    return () => {
      element.removeEventListener('mouseenter', handleMouseEnter);
      element.removeEventListener('mouseleave', handleMouseLeave);
    };
  }

  /**
   * Create focus animations for interactive elements
   */
  public setupFocusAnimation(
    element: HTMLElement,
    focusStyles: Partial<CSSStyleDeclaration>,
    options: {
      duration?: number;
      easing?: string;
      glowOnFocus?: boolean;
      glowColor?: string;
    } = {}
  ): () => void {
    const {
      duration = 200,
      easing = this.defaultEasing,
      glowOnFocus = true,
      glowColor = 'rgba(59, 130, 246, 0.5)'
    } = options;

    // Store original styles
    const originalStyles: Partial<CSSStyleDeclaration> = {};
    Object.keys(focusStyles).forEach(key => {
      const styleKey = key as keyof CSSStyleDeclaration;
      originalStyles[styleKey] = element.style[styleKey] as any;
    });

    // Setup transitions
    const transitionProperties = Object.keys(focusStyles);
    if (glowOnFocus) transitionProperties.push('box-shadow', 'border-color');

    const transitions: TransitionConfig[] = transitionProperties.map(property => ({
      property,
      duration,
      easing
    }));

    this.applyTransition(element, transitions);

    // Focus handler
    const handleFocus = () => {
      Object.assign(element.style, focusStyles);
      
      if (glowOnFocus) {
        element.style.boxShadow = `0 0 0 3px ${glowColor}`;
        element.style.borderColor = glowColor.replace('0.5', '0.8');
      }
    };

    // Blur handler
    const handleBlur = () => {
      Object.assign(element.style, originalStyles);
      
      if (glowOnFocus) {
        element.style.boxShadow = originalStyles.boxShadow || '';
        element.style.borderColor = originalStyles.borderColor || '';
      }
    };

    element.addEventListener('focus', handleFocus);
    element.addEventListener('blur', handleBlur);

    // Return cleanup function
    return () => {
      element.removeEventListener('focus', handleFocus);
      element.removeEventListener('blur', handleBlur);
    };
  }

  /**
   * Cancel a specific animation by ID
   */
  public cancelAnimation(animationId: string): void {
    const animation = this.activeAnimations.get(animationId);
    if (animation) {
      animation.cancel();
      this.activeAnimations.delete(animationId);
    }
  }

  /**
   * Cancel all active animations
   */
  public cancelAllAnimations(): void {
    this.activeAnimations.forEach(animation => {
      animation.cancel();
    });
    this.activeAnimations.clear();
  }

  /**
   * Get the number of active animations
   */
  public getActiveAnimationCount(): number {
    return this.activeAnimations.size;
  }

  /**
   * Check if an animation is currently running
   */
  public isAnimationActive(animationId: string): boolean {
    return this.activeAnimations.has(animationId);
  }

  /**
   * Create a custom animation with keyframes
   */
  public createCustomAnimation(
    element: HTMLElement,
    keyframes: AnimationKeyframe[],
    options: Partial<AnimationOptions> = {}
  ): AnimationCleanup {
    const animationId = this.generateAnimationId('custom');
    
    const config: AnimationOptions = {
      duration: 300,
      easing: this.defaultEasing,
      fill: 'forwards',
      ...options
    };

    return this.createAnimation(element, keyframes, config, animationId);
  }

  /**
   * Destroy the animation system and clean up all resources
   */
  public destroy(): void {
    this.cancelAllAnimations();
    this.animationCounter = 0;
  }

  // Private methods

  private createAnimation(
    element: HTMLElement,
    keyframes: AnimationKeyframe[],
    config: AnimationOptions,
    animationId: string
  ): AnimationCleanup {
    try {
      const animation = element.animate(keyframes, {
        duration: config.duration,
        easing: config.easing,
        delay: config.delay || 0,
        fill: config.fill || 'forwards',
        iterations: config.iterations || 1,
        direction: config.direction || 'normal'
      });

      this.activeAnimations.set(animationId, animation);

      // Clean up when animation finishes
      animation.addEventListener('finish', () => {
        this.activeAnimations.delete(animationId);
      });

      animation.addEventListener('cancel', () => {
        this.activeAnimations.delete(animationId);
      });

      return {
        cancel: () => {
          animation.cancel();
          this.activeAnimations.delete(animationId);
        },
        finish: () => {
          animation.finish();
        },
        pause: () => {
          animation.pause();
        },
        play: () => {
          animation.play();
        }
      };
    } catch (error) {
      // Fallback for environments without Web Animations API
      console.warn('Web Animations API not supported, using CSS fallback');
      return this.createCSSFallbackAnimation(element, keyframes, config);
    }
  }

  private createCSSFallbackAnimation(
    element: HTMLElement,
    keyframes: AnimationKeyframe[],
    config: AnimationOptions
  ): AnimationCleanup {
    // Apply final state immediately as fallback
    const finalKeyframe = keyframes[keyframes.length - 1];
    Object.assign(element.style, finalKeyframe);

    // Return dummy cleanup object
    return {
      cancel: () => {},
      finish: () => {},
      pause: () => {},
      play: () => {}
    };
  }

  private getSlideTransforms(direction: 'left' | 'right' | 'up' | 'down') {
    const transforms = {
      left: { from: 'translateX(-100%)', to: 'translateX(0)' },
      right: { from: 'translateX(100%)', to: 'translateX(0)' },
      up: { from: 'translateY(-100%)', to: 'translateY(0)' },
      down: { from: 'translateY(100%)', to: 'translateY(0)' }
    };

    return transforms[direction];
  }

  private generateAnimationId(prefix: string): string {
    return `${prefix}-${++this.animationCounter}-${Date.now()}`;
  }
}

// Export a singleton instance
export const animationSystem = new AnimationSystem();