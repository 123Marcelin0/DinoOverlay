/**
 * @jest-environment jsdom
 */
import { DinoOverlayLoader } from '../../src/core/DinoOverlayLoader';
import { DinoOverlayConfig } from '../../src/types/config';

describe('DinoOverlayLoader Integration Tests', () => {
  beforeEach(() => {
    // Clean up any existing containers
    const existingContainers = document.querySelectorAll('#dino-overlay-container');
    existingContainers.forEach(container => container.remove());
  });

  afterEach(() => {
    // Clean up after each test
    const containers = document.querySelectorAll('#dino-overlay-container');
    containers.forEach(container => container.remove());
  });

  it('should integrate with real DOM environment', async () => {
    const config: DinoOverlayConfig = {
      apiKey: 'test-integration-key',
      theme: 'light',
      debug: true,
    };

    const loader = new DinoOverlayLoader(config);
    
    expect(loader.isReady()).toBe(false);
    expect(loader.getShadowRoot()).toBe(null);

    await loader.initialize();

    expect(loader.isReady()).toBe(true);
    expect(loader.getShadowRoot()).toBeTruthy();

    // Verify container was added to DOM
    const container = document.getElementById('dino-overlay-container');
    expect(container).toBeTruthy();
    expect(container?.style.position).toBe('fixed');
    expect(container?.style.zIndex).toBe('2147483647');

    // Verify shadow root exists
    const shadowRoot = loader.getShadowRoot();
    expect(shadowRoot).toBeTruthy();

    // Clean up
    loader.destroy();
    expect(loader.isReady()).toBe(false);
    expect(document.getElementById('dino-overlay-container')).toBe(null);
  });

  it('should handle multiple loaders gracefully', async () => {
    const config1: DinoOverlayConfig = { apiKey: 'key1' };
    const config2: DinoOverlayConfig = { apiKey: 'key2' };

    const loader1 = new DinoOverlayLoader(config1);
    const loader2 = new DinoOverlayLoader(config2);

    await Promise.all([
      loader1.initialize(),
      loader2.initialize(),
    ]);

    expect(loader1.isReady()).toBe(true);
    expect(loader2.isReady()).toBe(true);

    // Both should have their own containers (though in practice only one would be used)
    const containers = document.querySelectorAll('#dino-overlay-container');
    expect(containers.length).toBeGreaterThanOrEqual(1);

    loader1.destroy();
    loader2.destroy();
  });

  it('should work with custom configuration', async () => {
    const config: DinoOverlayConfig = {
      apiKey: 'custom-key',
      apiEndpoint: 'https://custom-api.example.com',
      theme: 'dark',
      enableAnalytics: true,
      debug: false,
      customActions: [
        { id: 'test-action', label: 'Test Action', prompt: 'Test prompt' },
      ],
    };

    const loader = new DinoOverlayLoader(config);
    await loader.initialize();

    const retrievedConfig = loader.getConfig();
    expect(retrievedConfig.apiKey).toBe('custom-key');
    expect(retrievedConfig.apiEndpoint).toBe('https://custom-api.example.com');
    expect(retrievedConfig.theme).toBe('dark');
    expect(retrievedConfig.enableAnalytics).toBe(true);
    expect(retrievedConfig.debug).toBe(false);
    expect(retrievedConfig.customActions).toHaveLength(1);
    expect(retrievedConfig.customActions[0].id).toBe('test-action');

    loader.destroy();
  });

  it('should handle rapid initialization and destruction cycles', async () => {
    const config: DinoOverlayConfig = { apiKey: 'cycle-test' };

    for (let i = 0; i < 5; i++) {
      const loader = new DinoOverlayLoader(config);
      
      await loader.initialize();
      expect(loader.isReady()).toBe(true);
      
      loader.destroy();
      expect(loader.isReady()).toBe(false);
    }

    // Should not leave any containers behind
    const containers = document.querySelectorAll('#dino-overlay-container');
    expect(containers.length).toBe(0);
  });
});