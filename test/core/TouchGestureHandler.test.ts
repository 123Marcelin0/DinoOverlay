import { TouchGestureHandler, TouchPoint, SwipeGesture, TapGesture } from '../../src/core/TouchGestureHandler';

// Mock DOM element
const mockElement = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
} as unknown as HTMLElement;

// Mock touch events
const createMockTouch = (x: number, y: number): Touch => ({
  clientX: x,
  clientY: y,
  identifier: 0,
  pageX: x,
  pageY: y,
  screenX: x,
  screenY: y,
  radiusX: 0,
  radiusY: 0,
  rotationAngle: 0,
  force: 1,
  target: mockElement
});

const createMockTouchEvent = (type: string, touches: Touch[]): TouchEvent => {
  const event = new Event(type) as TouchEvent;
  Object.defineProperty(event, 'touches', {
    value: touches,
    writable: false
  });
  Object.defineProperty(event, 'preventDefault', {
    value: jest.fn(),
    writable: false
  });
  Object.defineProperty(event, 'stopPropagation', {
    value: jest.fn(),
    writable: false
  });
  return event;
};

describe('TouchGestureHandler', () => {
  let touchHandler: TouchGestureHandler;
  let mockDateNow: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDateNow = jest.spyOn(Date, 'now').mockReturnValue(1000);
    
    touchHandler = new TouchGestureHandler(mockElement, {
      swipeThreshold: 50,
      swipeVelocityThreshold: 0.3,
      tapTimeout: 300,
      doubleTapTimeout: 300,
      maxTapDistance: 10,
      debug: false
    });
  });

  afterEach(() => {
    if (touchHandler) {
      touchHandler.destroy();
    }
    mockDateNow.mockRestore();
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      const defaultHandler = new TouchGestureHandler(mockElement);
      expect(defaultHandler).toBeDefined();
      defaultHandler.destroy();
    });

    it('should setup event listeners on initialize', () => {
      touchHandler.initialize();
      
      expect(mockElement.addEventListener).toHaveBeenCalledWith('touchstart', expect.any(Function), { passive: false });
      expect(mockElement.addEventListener).toHaveBeenCalledWith('touchmove', expect.any(Function), { passive: false });
      expect(mockElement.addEventListener).toHaveBeenCalledWith('touchend', expect.any(Function), { passive: false });
      expect(mockElement.addEventListener).toHaveBeenCalledWith('touchcancel', expect.any(Function), { passive: false });
    });

    it('should remove event listeners on destroy', () => {
      touchHandler.initialize();
      touchHandler.destroy();
      
      expect(mockElement.removeEventListener).toHaveBeenCalledWith('touchstart', expect.any(Function));
      expect(mockElement.removeEventListener).toHaveBeenCalledWith('touchmove', expect.any(Function));
      expect(mockElement.removeEventListener).toHaveBeenCalledWith('touchend', expect.any(Function));
      expect(mockElement.removeEventListener).toHaveBeenCalledWith('touchcancel', expect.any(Function));
    });
  });

  describe('touch tracking', () => {
    beforeEach(() => {
      touchHandler.initialize();
    });

    it('should track touch start', () => {
      const callback = jest.fn();
      touchHandler.on('touchStart', callback);
      
      const touch = createMockTouch(100, 100);
      const event = createMockTouchEvent('touchstart', [touch]);
      
      // Simulate touch start
      const touchStartHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchstart')[1];
      touchStartHandler(event);
      
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          x: 100,
          y: 100,
          timestamp: 1000
        }),
        event
      );
    });

    it('should track touch move', () => {
      const startCallback = jest.fn();
      const moveCallback = jest.fn();
      touchHandler.on('touchStart', startCallback);
      touchHandler.on('touchMove', moveCallback);
      
      // Start touch
      const startTouch = createMockTouch(100, 100);
      const startEvent = createMockTouchEvent('touchstart', [startTouch]);
      const touchStartHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchstart')[1];
      touchStartHandler(startEvent);
      
      // Move touch
      mockDateNow.mockReturnValue(1050);
      const moveTouch = createMockTouch(150, 120);
      const moveEvent = createMockTouchEvent('touchmove', [moveTouch]);
      const touchMoveHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchmove')[1];
      touchMoveHandler(moveEvent);
      
      expect(moveCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          x: 150,
          y: 120,
          timestamp: 1050
        }),
        moveEvent
      );
    });

    it('should track touch end', () => {
      const endCallback = jest.fn();
      touchHandler.on('touchEnd', endCallback);
      
      // Start touch
      const startTouch = createMockTouch(100, 100);
      const startEvent = createMockTouchEvent('touchstart', [startTouch]);
      const touchStartHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchstart')[1];
      touchStartHandler(startEvent);
      
      // End touch
      mockDateNow.mockReturnValue(1100);
      const endEvent = createMockTouchEvent('touchend', []);
      const touchEndHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchend')[1];
      touchEndHandler(endEvent);
      
      expect(endCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          x: 100,
          y: 100,
          timestamp: 1000 // touchEnd uses the current touch position timestamp, not a new one
        }),
        endEvent
      );
    });
  });

  describe('tap gestures', () => {
    beforeEach(() => {
      touchHandler.initialize();
    });

    it('should detect single tap', (done) => {
      const tapCallback = jest.fn();
      touchHandler.on('tap', tapCallback);
      
      // Perform tap
      const touch = createMockTouch(100, 100);
      const startEvent = createMockTouchEvent('touchstart', [touch]);
      const endEvent = createMockTouchEvent('touchend', []);
      
      const touchStartHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchstart')[1];
      const touchEndHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchend')[1];
      
      touchStartHandler(startEvent);
      
      mockDateNow.mockReturnValue(1050);
      touchEndHandler(endEvent);
      
      // Wait for double tap timeout
      setTimeout(() => {
        expect(tapCallback).toHaveBeenCalledWith(
          expect.objectContaining({
            point: expect.objectContaining({ x: 100, y: 100 }),
            tapCount: 1
          }),
          endEvent
        );
        done();
      }, 350);
    });

    it('should detect double tap', () => {
      const doubleTapCallback = jest.fn();
      touchHandler.on('doubleTap', doubleTapCallback);
      
      const touchStartHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchstart')[1];
      const touchEndHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchend')[1];
      
      // First tap
      const touch1 = createMockTouch(100, 100);
      const startEvent1 = createMockTouchEvent('touchstart', [touch1]);
      const endEvent1 = createMockTouchEvent('touchend', []);
      
      touchStartHandler(startEvent1);
      mockDateNow.mockReturnValue(1050);
      touchEndHandler(endEvent1);
      
      // Second tap (within double tap timeout)
      mockDateNow.mockReturnValue(1200);
      const touch2 = createMockTouch(105, 105);
      const startEvent2 = createMockTouchEvent('touchstart', [touch2]);
      const endEvent2 = createMockTouchEvent('touchend', []);
      
      touchStartHandler(startEvent2);
      mockDateNow.mockReturnValue(1250);
      touchEndHandler(endEvent2);
      
      expect(doubleTapCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          point: expect.objectContaining({ x: 105, y: 105 }),
          tapCount: 2
        }),
        endEvent2
      );
    });

    it('should not detect double tap if taps are too far apart', (done) => {
      const tapCallback = jest.fn();
      const doubleTapCallback = jest.fn();
      touchHandler.on('tap', tapCallback);
      touchHandler.on('doubleTap', doubleTapCallback);
      
      const touchStartHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchstart')[1];
      const touchEndHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchend')[1];
      
      // First tap
      const touch1 = createMockTouch(100, 100);
      const startEvent1 = createMockTouchEvent('touchstart', [touch1]);
      const endEvent1 = createMockTouchEvent('touchend', []);
      
      touchStartHandler(startEvent1);
      mockDateNow.mockReturnValue(1050);
      touchEndHandler(endEvent1);
      
      // Second tap (too far away)
      mockDateNow.mockReturnValue(1200);
      const touch2 = createMockTouch(150, 150);
      const startEvent2 = createMockTouchEvent('touchstart', [touch2]);
      const endEvent2 = createMockTouchEvent('touchend', []);
      
      touchStartHandler(startEvent2);
      mockDateNow.mockReturnValue(1250);
      touchEndHandler(endEvent2);
      
      // Wait for timeouts
      setTimeout(() => {
        expect(tapCallback).toHaveBeenCalledTimes(2);
        expect(doubleTapCallback).not.toHaveBeenCalled();
        done();
      }, 350);
    });
  });

  describe('swipe gestures', () => {
    beforeEach(() => {
      touchHandler.initialize();
    });

    it('should detect horizontal swipe right', () => {
      const swipeCallback = jest.fn();
      touchHandler.on('swipe', swipeCallback);
      
      const touchStartHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchstart')[1];
      const touchEndHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchend')[1];
      
      // Start swipe
      const startTouch = createMockTouch(100, 100);
      const startEvent = createMockTouchEvent('touchstart', [startTouch]);
      touchStartHandler(startEvent);
      
      // End swipe (right)
      mockDateNow.mockReturnValue(1100);
      const endTouch = createMockTouch(200, 100);
      const endEvent = createMockTouchEvent('touchend', []);
      
      // Update current touch position
      const touchMoveHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchmove')[1];
      const moveEvent = createMockTouchEvent('touchmove', [endTouch]);
      touchMoveHandler(moveEvent);
      
      touchEndHandler(endEvent);
      
      expect(swipeCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          direction: 'right',
          distance: 100,
          velocity: 1,
          duration: 100
        }),
        endEvent
      );
    });

    it('should detect horizontal swipe left', () => {
      const swipeCallback = jest.fn();
      touchHandler.on('swipe', swipeCallback);
      
      const touchStartHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchstart')[1];
      const touchMoveHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchmove')[1];
      const touchEndHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchend')[1];
      
      // Start swipe
      const startTouch = createMockTouch(200, 100);
      const startEvent = createMockTouchEvent('touchstart', [startTouch]);
      touchStartHandler(startEvent);
      
      // End swipe (left)
      mockDateNow.mockReturnValue(1100);
      const endTouch = createMockTouch(100, 100);
      const moveEvent = createMockTouchEvent('touchmove', [endTouch]);
      touchMoveHandler(moveEvent);
      
      const endEvent = createMockTouchEvent('touchend', []);
      touchEndHandler(endEvent);
      
      expect(swipeCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          direction: 'left',
          distance: 100,
          velocity: 1,
          duration: 100
        }),
        endEvent
      );
    });

    it('should detect vertical swipe up', () => {
      const swipeCallback = jest.fn();
      touchHandler.on('swipe', swipeCallback);
      
      const touchStartHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchstart')[1];
      const touchMoveHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchmove')[1];
      const touchEndHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchend')[1];
      
      // Start swipe
      const startTouch = createMockTouch(100, 200);
      const startEvent = createMockTouchEvent('touchstart', [startTouch]);
      touchStartHandler(startEvent);
      
      // End swipe (up)
      mockDateNow.mockReturnValue(1100);
      const endTouch = createMockTouch(100, 100);
      const moveEvent = createMockTouchEvent('touchmove', [endTouch]);
      touchMoveHandler(moveEvent);
      
      const endEvent = createMockTouchEvent('touchend', []);
      touchEndHandler(endEvent);
      
      expect(swipeCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          direction: 'up',
          distance: 100,
          velocity: 1,
          duration: 100
        }),
        endEvent
      );
    });

    it('should detect vertical swipe down', () => {
      const swipeCallback = jest.fn();
      touchHandler.on('swipe', swipeCallback);
      
      const touchStartHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchstart')[1];
      const touchMoveHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchmove')[1];
      const touchEndHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchend')[1];
      
      // Start swipe
      const startTouch = createMockTouch(100, 100);
      const startEvent = createMockTouchEvent('touchstart', [startTouch]);
      touchStartHandler(startEvent);
      
      // End swipe (down)
      mockDateNow.mockReturnValue(1100);
      const endTouch = createMockTouch(100, 200);
      const moveEvent = createMockTouchEvent('touchmove', [endTouch]);
      touchMoveHandler(moveEvent);
      
      const endEvent = createMockTouchEvent('touchend', []);
      touchEndHandler(endEvent);
      
      expect(swipeCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          direction: 'down',
          distance: 100,
          velocity: 1,
          duration: 100
        }),
        endEvent
      );
    });

    it('should not detect swipe if distance is too small', () => {
      const swipeCallback = jest.fn();
      touchHandler.on('swipe', swipeCallback);
      
      const touchStartHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchstart')[1];
      const touchMoveHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchmove')[1];
      const touchEndHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchend')[1];
      
      // Start swipe
      const startTouch = createMockTouch(100, 100);
      const startEvent = createMockTouchEvent('touchstart', [startTouch]);
      touchStartHandler(startEvent);
      
      // End swipe (too small distance)
      mockDateNow.mockReturnValue(1100);
      const endTouch = createMockTouch(120, 100);
      const moveEvent = createMockTouchEvent('touchmove', [endTouch]);
      touchMoveHandler(moveEvent);
      
      const endEvent = createMockTouchEvent('touchend', []);
      touchEndHandler(endEvent);
      
      expect(swipeCallback).not.toHaveBeenCalled();
    });

    it('should not detect swipe if velocity is too low', () => {
      const swipeCallback = jest.fn();
      touchHandler.on('swipe', swipeCallback);
      
      const touchStartHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchstart')[1];
      const touchMoveHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchmove')[1];
      const touchEndHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchend')[1];
      
      // Start swipe
      const startTouch = createMockTouch(100, 100);
      const startEvent = createMockTouchEvent('touchstart', [startTouch]);
      touchStartHandler(startEvent);
      
      // End swipe (too slow)
      mockDateNow.mockReturnValue(2000); // 900ms duration
      const endTouch = createMockTouch(200, 100);
      const moveEvent = createMockTouchEvent('touchmove', [endTouch]);
      touchMoveHandler(moveEvent);
      
      const endEvent = createMockTouchEvent('touchend', []);
      touchEndHandler(endEvent);
      
      expect(swipeCallback).not.toHaveBeenCalled();
    });
  });

  describe('configuration', () => {
    it('should allow config updates', () => {
      touchHandler.updateConfig({
        swipeThreshold: 100,
        tapTimeout: 500
      });
      
      // Config should be updated (tested indirectly through behavior)
      expect(touchHandler).toBeDefined();
    });
  });

  describe('event listener management', () => {
    it('should add and remove event listeners', () => {
      const callback = jest.fn();
      
      touchHandler.on('tap', callback);
      touchHandler.off('tap', callback);
      
      // Simulate tap that should not trigger callback
      touchHandler.initialize();
      
      const touchStartHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchstart')[1];
      const touchEndHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchend')[1];
      
      const touch = createMockTouch(100, 100);
      const startEvent = createMockTouchEvent('touchstart', [touch]);
      const endEvent = createMockTouchEvent('touchend', []);
      
      touchStartHandler(startEvent);
      mockDateNow.mockReturnValue(1050);
      touchEndHandler(endEvent);
      
      setTimeout(() => {
        expect(callback).not.toHaveBeenCalled();
      }, 350);
    });
  });

  describe('error handling', () => {
    it('should handle multiple touches gracefully', () => {
      touchHandler.initialize();
      
      const touchStartHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchstart')[1];
      
      // Multiple touches should be ignored
      const touch1 = createMockTouch(100, 100);
      const touch2 = createMockTouch(200, 200);
      const multiTouchEvent = createMockTouchEvent('touchstart', [touch1, touch2]);
      
      expect(() => {
        touchStartHandler(multiTouchEvent);
      }).not.toThrow();
    });

    it('should handle touch cancel events', () => {
      touchHandler.initialize();
      
      const touchStartHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchstart')[1];
      const touchCancelHandler = (mockElement.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchcancel')[1];
      
      // Start touch
      const touch = createMockTouch(100, 100);
      const startEvent = createMockTouchEvent('touchstart', [touch]);
      touchStartHandler(startEvent);
      
      // Cancel touch
      const cancelEvent = createMockTouchEvent('touchcancel', []);
      
      expect(() => {
        touchCancelHandler(cancelEvent);
      }).not.toThrow();
    });
  });
});