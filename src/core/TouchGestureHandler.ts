export interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
}

export interface SwipeGesture {
  direction: 'left' | 'right' | 'up' | 'down';
  distance: number;
  velocity: number;
  duration: number;
  startPoint: TouchPoint;
  endPoint: TouchPoint;
}

export interface TapGesture {
  point: TouchPoint;
  tapCount: number;
}

export interface TouchGestureEvents {
  tap: (gesture: TapGesture, event: TouchEvent) => void;
  doubleTap: (gesture: TapGesture, event: TouchEvent) => void;
  swipe: (gesture: SwipeGesture, event: TouchEvent) => void;
  touchStart: (point: TouchPoint, event: TouchEvent) => void;
  touchMove: (point: TouchPoint, event: TouchEvent) => void;
  touchEnd: (point: TouchPoint, event: TouchEvent) => void;
}

export interface TouchGestureConfig {
  swipeThreshold: number;
  swipeVelocityThreshold: number;
  tapTimeout: number;
  doubleTapTimeout: number;
  maxTapDistance: number;
  debug: boolean;
}

export class TouchGestureHandler {
  private element: HTMLElement;
  private config: TouchGestureConfig;
  private eventListeners: Map<string, Function[]> = new Map();
  private isDestroyed: boolean = false;

  // Touch tracking
  private touchStart: TouchPoint | null = null;
  private touchCurrent: TouchPoint | null = null;
  private lastTap: TouchPoint | null = null;
  private tapCount: number = 0;
  private tapTimeout: number | null = null;
  private doubleTapTimeout: number | null = null;

  constructor(element: HTMLElement, config: Partial<TouchGestureConfig> = {}) {
    this.element = element;
    this.config = {
      swipeThreshold: 50,
      swipeVelocityThreshold: 0.3,
      tapTimeout: 300,
      doubleTapTimeout: 300,
      maxTapDistance: 10,
      debug: false,
      ...config
    };

    // Bind methods
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
    this.handleTouchCancel = this.handleTouchCancel.bind(this);
  }

  public initialize(): void {
    if (this.isDestroyed) {
      throw new Error('TouchGestureHandler has been destroyed');
    }

    this.setupEventListeners();

    if (this.config.debug) {
      console.log('[TouchGestureHandler] Initialized on element:', this.element);
    }
  }

  public destroy(): void {
    if (this.isDestroyed) {
      return;
    }

    this.isDestroyed = true;

    // Clear timeouts
    if (this.tapTimeout) {
      clearTimeout(this.tapTimeout);
      this.tapTimeout = null;
    }

    if (this.doubleTapTimeout) {
      clearTimeout(this.doubleTapTimeout);
      this.doubleTapTimeout = null;
    }

    // Remove event listeners
    this.removeEventListeners();

    // Clear event listeners
    this.eventListeners.clear();

    // Reset state
    this.touchStart = null;
    this.touchCurrent = null;
    this.lastTap = null;
    this.tapCount = 0;

    if (this.config.debug) {
      console.log('[TouchGestureHandler] Destroyed');
    }
  }

  public on<K extends keyof TouchGestureEvents>(
    event: K,
    callback: TouchGestureEvents[K]
  ): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  public off<K extends keyof TouchGestureEvents>(
    event: K,
    callback: TouchGestureEvents[K]
  ): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  public updateConfig(config: Partial<TouchGestureConfig>): void {
    this.config = { ...this.config, ...config };
  }

  private setupEventListeners(): void {
    const options = { passive: false };
    
    this.element.addEventListener('touchstart', this.handleTouchStart, options);
    this.element.addEventListener('touchmove', this.handleTouchMove, options);
    this.element.addEventListener('touchend', this.handleTouchEnd, options);
    this.element.addEventListener('touchcancel', this.handleTouchCancel, options);
  }

  private removeEventListeners(): void {
    this.element.removeEventListener('touchstart', this.handleTouchStart);
    this.element.removeEventListener('touchmove', this.handleTouchMove);
    this.element.removeEventListener('touchend', this.handleTouchEnd);
    this.element.removeEventListener('touchcancel', this.handleTouchCancel);
  }

  private handleTouchStart(event: TouchEvent): void {
    if (this.isDestroyed || event.touches.length !== 1) {
      return;
    }

    const touch = event.touches[0];
    this.touchStart = this.createTouchPoint(touch);
    this.touchCurrent = { ...this.touchStart };

    this.emit('touchStart', this.touchStart, event);

    if (this.config.debug) {
      console.log('[TouchGestureHandler] Touch start:', this.touchStart);
    }
  }

  private handleTouchMove(event: TouchEvent): void {
    if (this.isDestroyed || !this.touchStart || event.touches.length !== 1) {
      return;
    }

    const touch = event.touches[0];
    this.touchCurrent = this.createTouchPoint(touch);

    this.emit('touchMove', this.touchCurrent, event);

    // Prevent scrolling if we're potentially swiping
    const distance = this.calculateDistance(this.touchStart, this.touchCurrent);
    if (distance > this.config.maxTapDistance) {
      event.preventDefault();
    }
  }

  private handleTouchEnd(event: TouchEvent): void {
    if (this.isDestroyed || !this.touchStart || !this.touchCurrent) {
      return;
    }

    const touchEnd = this.touchCurrent;
    this.emit('touchEnd', touchEnd, event);

    // Calculate gesture metrics
    const distance = this.calculateDistance(this.touchStart, touchEnd);
    const duration = touchEnd.timestamp - this.touchStart.timestamp;
    const velocity = distance / duration;

    if (this.config.debug) {
      console.log('[TouchGestureHandler] Touch end:', {
        distance,
        duration,
        velocity,
        swipeThreshold: this.config.swipeThreshold,
        velocityThreshold: this.config.swipeVelocityThreshold
      });
    }

    // Determine gesture type
    if (distance >= this.config.swipeThreshold && velocity >= this.config.swipeVelocityThreshold) {
      this.handleSwipeGesture(this.touchStart, touchEnd, distance, velocity, duration, event);
    } else if (distance <= this.config.maxTapDistance) {
      this.handleTapGesture(touchEnd, event);
    }

    // Reset touch state
    this.touchStart = null;
    this.touchCurrent = null;
  }

  private handleTouchCancel(event: TouchEvent): void {
    if (this.isDestroyed) {
      return;
    }

    // Reset touch state
    this.touchStart = null;
    this.touchCurrent = null;

    if (this.config.debug) {
      console.log('[TouchGestureHandler] Touch cancelled');
    }
  }

  private handleSwipeGesture(
    start: TouchPoint,
    end: TouchPoint,
    distance: number,
    velocity: number,
    duration: number,
    event: TouchEvent
  ): void {
    const deltaX = end.x - start.x;
    const deltaY = end.y - start.y;
    
    let direction: SwipeGesture['direction'];
    
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      direction = deltaX > 0 ? 'right' : 'left';
    } else {
      direction = deltaY > 0 ? 'down' : 'up';
    }

    const swipeGesture: SwipeGesture = {
      direction,
      distance,
      velocity,
      duration,
      startPoint: start,
      endPoint: end
    };

    this.emit('swipe', swipeGesture, event);

    if (this.config.debug) {
      console.log('[TouchGestureHandler] Swipe detected:', swipeGesture);
    }
  }

  private handleTapGesture(point: TouchPoint, event: TouchEvent): void {
    // Clear existing tap timeout
    if (this.tapTimeout) {
      clearTimeout(this.tapTimeout);
      this.tapTimeout = null;
    }

    // Check for double tap
    if (this.lastTap && this.isDoubleTap(this.lastTap, point)) {
      this.tapCount = 2;
      
      // Clear double tap timeout
      if (this.doubleTapTimeout) {
        clearTimeout(this.doubleTapTimeout);
        this.doubleTapTimeout = null;
      }

      const doubleTapGesture: TapGesture = {
        point,
        tapCount: this.tapCount
      };

      this.emit('doubleTap', doubleTapGesture, event);

      if (this.config.debug) {
        console.log('[TouchGestureHandler] Double tap detected:', doubleTapGesture);
      }

      // Reset tap state
      this.lastTap = null;
      this.tapCount = 0;
    } else {
      // Single tap (potentially)
      this.tapCount = 1;
      this.lastTap = point;

      // Set timeout to emit single tap if no second tap occurs
      this.doubleTapTimeout = window.setTimeout(() => {
        const tapGesture: TapGesture = {
          point,
          tapCount: 1
        };

        this.emit('tap', tapGesture, event);

        if (this.config.debug) {
          console.log('[TouchGestureHandler] Single tap detected:', tapGesture);
        }

        // Reset tap state
        this.lastTap = null;
        this.tapCount = 0;
        this.doubleTapTimeout = null;
      }, this.config.doubleTapTimeout);
    }
  }

  private isDoubleTap(firstTap: TouchPoint, secondTap: TouchPoint): boolean {
    const distance = this.calculateDistance(firstTap, secondTap);
    const timeDiff = secondTap.timestamp - firstTap.timestamp;
    
    return distance <= this.config.maxTapDistance && 
           timeDiff <= this.config.doubleTapTimeout;
  }

  private createTouchPoint(touch: Touch): TouchPoint {
    return {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now()
    };
  }

  private calculateDistance(point1: TouchPoint, point2: TouchPoint): number {
    const deltaX = point2.x - point1.x;
    const deltaY = point2.y - point1.y;
    return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  }

  private emit<K extends keyof TouchGestureEvents>(
    event: K,
    ...args: Parameters<TouchGestureEvents[K]>
  ): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        try {
          (listener as any)(...args);
        } catch (error) {
          console.error(`[TouchGestureHandler] Error in ${event} listener:`, error);
        }
      }
    }
  }
}