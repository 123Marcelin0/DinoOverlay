import { CompatibilityManager } from '../../src/compatibility/CompatibilityManager';
import { FrameworkDetector } from '../../src/compatibility/FrameworkDetector';

// Simple test to verify framework compatibility is working
describe('Framework Compatibility - Simple Test', () => {
  it('should create CompatibilityManager without errors', () => {
    expect(() => {
      const manager = new CompatibilityManager();
    }).not.toThrow();
  });

  it('should create FrameworkDetector without errors', () => {
    expect(() => {
      const detector = new FrameworkDetector();
    }).not.toThrow();
  });

  it('should have correct framework types', () => {
    const manager = new CompatibilityManager();
    expect(manager).toBeDefined();
    expect(typeof manager.initialize).toBe('function');
    expect(typeof manager.cleanup).toBe('function');
    expect(typeof manager.findEditableImages).toBe('function');
  });
});