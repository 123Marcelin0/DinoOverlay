// Jest setup file
import '@testing-library/jest-dom';

// Mock Next.js environment variables
process.env.NODE_ENV = 'test';

// Mock fetch for API tests
if (typeof global.fetch === 'undefined') {
  global.fetch = jest.fn();
}

// Only setup DOM mocks if we're in jsdom environment
if (typeof window !== 'undefined' && typeof HTMLElement !== 'undefined') {
  // Mock Shadow DOM for testing
  const mockShadowRoot = {
    appendChild: jest.fn(),
    innerHTML: '',
    children: [],
    getElementById: jest.fn(),
    querySelector: jest.fn(),
    querySelectorAll: jest.fn(),
  };

  Object.defineProperty(HTMLElement.prototype, 'attachShadow', {
    value: function() {
      return mockShadowRoot;
    },
    writable: true,
  });

  // Mock window.DinoOverlay
  Object.defineProperty(window, 'DinoOverlay', {
    value: {
      init: jest.fn()
    },
    writable: true,
  });
}