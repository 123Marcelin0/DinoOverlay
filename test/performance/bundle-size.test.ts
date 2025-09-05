/**
 * Bundle size and performance tests
 * Validates that the bundle meets size and load time requirements
 */

import { readFileSync, statSync } from 'fs';
import { resolve } from 'path';
import { gzipSync } from 'zlib';

describe('Bundle Size Tests', () => {
  const distPath = resolve(__dirname, '../../dist');
  const maxBundleSize = 200 * 1024; // 200KB
  const maxGzipSize = 50 * 1024; // 50KB gzipped

  beforeAll(() => {
    // Ensure dist directory exists
    try {
      statSync(distPath);
    } catch {
      throw new Error('Build artifacts not found. Run "npm run build:widget" first.');
    }
  });

  test('main bundle size should be under 200KB', () => {
    const bundlePath = resolve(distPath, 'dino-overlay.iife.js');
    const stats = statSync(bundlePath);
    
    expect(stats.size).toBeLessThanOrEqual(maxBundleSize);
    
    console.log(`Bundle size: ${(stats.size / 1024).toFixed(2)}KB`);
    console.log(`Size limit: ${(maxBundleSize / 1024).toFixed(2)}KB`);
    console.log(`Remaining: ${((maxBundleSize - stats.size) / 1024).toFixed(2)}KB`);
  });

  test('gzipped bundle size should be under 50KB', () => {
    const bundlePath = resolve(distPath, 'dino-overlay.iife.js');
    const bundleContent = readFileSync(bundlePath);
    const gzippedSize = gzipSync(bundleContent).length;
    
    expect(gzippedSize).toBeLessThanOrEqual(maxGzipSize);
    
    console.log(`Gzipped size: ${(gzippedSize / 1024).toFixed(2)}KB`);
    console.log(`Gzip limit: ${(maxGzipSize / 1024).toFixed(2)}KB`);
    console.log(`Compression ratio: ${((bundleContent.length / gzippedSize) * 100).toFixed(1)}%`);
  });

  test('bundle should not contain development code', () => {
    const bundlePath = resolve(distPath, 'dino-overlay.iife.js');
    const bundleContent = readFileSync(bundlePath, 'utf-8');
    
    // Check that console.log statements are removed
    expect(bundleContent).not.toMatch(/console\.log/);
    expect(bundleContent).not.toMatch(/console\.debug/);
    expect(bundleContent).not.toMatch(/debugger/);
    
    // Check that development-only code is removed
    expect(bundleContent).not.toMatch(/__DEV__.*?true/);
  });

  test('bundle should be properly minified', () => {
    const bundlePath = resolve(distPath, 'dino-overlay.iife.js');
    const bundleContent = readFileSync(bundlePath, 'utf-8');
    
    // Check for minification indicators
    const lines = bundleContent.split('\n');
    const avgLineLength = bundleContent.length / lines.length;
    
    // Minified code should have long lines (average > 100 chars)
    expect(avgLineLength).toBeGreaterThan(100);
    
    // Should not contain unnecessary whitespace
    expect(bundleContent).not.toMatch(/\n\s+\n/);
    
    console.log(`Average line length: ${avgLineLength.toFixed(0)} characters`);
    console.log(`Total lines: ${lines.length}`);
  });

  test('source map should exist and be valid', () => {
    const sourceMapPath = resolve(distPath, 'dino-overlay.iife.js.map');
    
    expect(() => statSync(sourceMapPath)).not.toThrow();
    
    const sourceMapContent = readFileSync(sourceMapPath, 'utf-8');
    const sourceMap = JSON.parse(sourceMapContent);
    
    expect(sourceMap.version).toBe(3);
    expect(sourceMap.sources).toBeDefined();
    expect(sourceMap.mappings).toBeDefined();
    expect(sourceMap.sources.length).toBeGreaterThan(0);
  });

  test('bundle should export required API', () => {
    const bundlePath = resolve(distPath, 'dino-overlay.iife.js');
    const bundleContent = readFileSync(bundlePath, 'utf-8');
    
    // Check that the global DinoOverlay object is created
    expect(bundleContent).toMatch(/DinoOverlay/);
    expect(bundleContent).toMatch(/init/);
    
    // Check that main classes are included
    expect(bundleContent).toMatch(/DinoOverlayLoader/);
    expect(bundleContent).toMatch(/OverlayManager/);
    expect(bundleContent).toMatch(/ImageDetector/);
  });
});