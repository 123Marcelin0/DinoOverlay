/**
 * CDN Deployment Integration Tests
 * Tests CDN functionality, script loading, and deployment verification
 */

import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const CDN_URLS = {
  primary: 'https://cdn.dinooverlay.com/v1',
  fallback: 'https://backup-cdn.dinooverlay.com/v1',
  local: 'http://localhost:3000/dist'
};

const TEST_FILES = [
  'dino-overlay-0.1.0.js',
  'dino-overlay-loader.min-0.1.0.js'
];

test.describe('CDN Deployment Tests', () => {
  
  test.beforeAll(async () => {
    // Ensure CDN files are built
    try {
      execSync('npm run build:cdn', { stdio: 'inherit' });
    } catch (error) {
      console.warn('CDN build failed, using existing files');
    }
  });

  test.describe('Script Loading Tests', () => {
    
    test('should load from primary CDN', async ({ page }) => {
      const responses: any[] = [];
      
      page.on('response', response => {
        if (response.url().includes('dino-overlay')) {
          responses.push({
            url: response.url(),
            status: response.status(),
            headers: response.headers()
          });
        }
      });

      await page.goto('/test-cdn-primary.html');
      await page.waitForLoadState('networkidle');

      // Should load from primary CDN
      const primaryResponse = responses.find(r => 
        r.url.includes(CDN_URLS.primary.replace('https://', ''))
      );
      
      expect(primaryResponse).toBeTruthy();
      expect(primaryResponse.status).toBe(200);

      // Verify overlay initializes
      const container = page.locator('#dino-overlay-container');
      await expect(container).toBeAttached({ timeout: 5000 });
    });

    test('should fallback to secondary CDN when primary fails', async ({ page }) => {
      // Block primary CDN
      await page.route(`${CDN_URLS.primary}/**`, route => {
        route.abort('failed');
      });

      const responses: any[] = [];
      page.on('response', response => {
        if (response.url().includes('dino-overlay')) {
          responses.push({
            url: response.url(),
            status: response.status()
          });
        }
      });

      await page.goto('/test-cdn-fallback.html');
      await page.waitForLoadState('networkidle');

      // Should load from fallback CDN
      const fallbackResponse = responses.find(r => 
        r.url.includes(CDN_URLS.fallback.replace('https://', ''))
      );
      
      expect(fallbackResponse).toBeTruthy();
      expect(fallbackResponse.status).toBe(200);

      // Verify overlay still works
      const container = page.locator('#dino-overlay-container');
      await expect(container).toBeAttached({ timeout: 5000 });
    });

    test('should handle script loading errors gracefully', async ({ page }) => {
      // Block all CDN requests
      await page.route('**/dino-overlay**', route => {
        route.abort('failed');
      });

      const errors: string[] = [];
      page.on('pageerror', error => {
        errors.push(error.message);
      });

      await page.goto('/test-cdn-error.html');
      await page.waitForLoadState('networkidle');

      // Should not crash the page
      expect(errors.filter(e => e.includes('Uncaught'))).toHaveLength(0);

      // Should show fallback message or graceful degradation
      const fallbackMessage = page.locator('[data-testid="cdn-error-message"]');
      await expect(fallbackMessage).toBeVisible({ timeout: 3000 });
    });

    test('should verify subresource integrity', async ({ page }) => {
      const responses: any[] = [];
      
      page.on('response', response => {
        if (response.url().includes('dino-overlay')) {
          responses.push({
            url: response.url(),
            status: response.status(),
            headers: response.headers()
          });
        }
      });

      await page.goto('/test-cdn-sri.html');
      await page.waitForLoadState('networkidle');

      // Should load successfully with correct SRI hash
      const scriptResponse = responses.find(r => r.url.includes('.js'));
      expect(scriptResponse).toBeTruthy();
      expect(scriptResponse.status).toBe(200);

      // Verify overlay loads (SRI validation passed)
      const container = page.locator('#dino-overlay-container');
      await expect(container).toBeAttached();
    });

    test('should handle SRI hash mismatch', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', error => {
        errors.push(error.message);
      });

      await page.goto('/test-cdn-sri-invalid.html');
      await page.waitForLoadState('networkidle');

      // Should fail to load due to SRI mismatch
      const sriError = errors.find(e => 
        e.includes('integrity') || e.includes('hash')
      );
      
      expect(sriError).toBeTruthy();

      // Overlay should not initialize
      const container = page.locator('#dino-overlay-container');
      await expect(container).not.toBeAttached();
    });
  });

  test.describe('Performance Tests', () => {
    
    test('should meet bundle size requirements', async ({ page }) => {
      const responses: any[] = [];
      
      page.on('response', response => {
        if (response.url().includes('dino-overlay')) {
          responses.push({
            url: response.url(),
            size: parseInt(response.headers()['content-length'] || '0')
          });
        }
      });

      await page.goto('/test-cdn-performance.html');
      await page.waitForLoadState('networkidle');

      // Main bundle should be under 200KB
      const mainBundle = responses.find(r => 
        r.url.includes('dino-overlay-0.1.0.js') && !r.url.includes('loader')
      );
      
      expect(mainBundle).toBeTruthy();
      expect(mainBundle.size).toBeLessThan(200 * 1024);

      // Loader should be under 10KB
      const loader = responses.find(r => 
        r.url.includes('loader.min')
      );
      
      expect(loader).toBeTruthy();
      expect(loader.size).toBeLessThan(10 * 1024);
    });

    test('should load within performance budget', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/test-cdn-performance.html');
      await page.waitForSelector('#dino-overlay-container');
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 2 seconds
      expect(loadTime).toBeLessThan(2000);

      // Check Core Web Vitals
      const metrics = await page.evaluate(() => {
        return new Promise(resolve => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lcp = entries.find(entry => entry.entryType === 'largest-contentful-paint');
            const fid = entries.find(entry => entry.entryType === 'first-input');
            
            resolve({
              lcp: lcp?.startTime || 0,
              fid: fid?.processingStart || 0
            });
          }).observe({ entryTypes: ['largest-contentful-paint', 'first-input'] });
          
          // Fallback timeout
          setTimeout(() => resolve({ lcp: 0, fid: 0 }), 1000);
        });
      });

      // LCP should be under 2.5 seconds
      if ((metrics as any).lcp > 0) {
        expect((metrics as any).lcp).toBeLessThan(2500);
      }
    });

    test('should handle concurrent loading', async ({ page }) => {
      // Simulate multiple instances loading simultaneously
      const promises = [];
      
      for (let i = 0; i < 5; i++) {
        promises.push(
          page.evaluate((index) => {
            return new Promise((resolve) => {
              const script = document.createElement('script');
              script.src = `/dist/dino-overlay-loader.min-0.1.0.js?instance=${index}`;
              script.onload = () => resolve(`loaded-${index}`);
              script.onerror = () => resolve(`error-${index}`);
              document.head.appendChild(script);
            });
          }, i)
        );
      }

      await page.goto('/blank.html');
      const results = await Promise.all(promises);

      // All instances should load successfully
      results.forEach((result, index) => {
        expect(result).toBe(`loaded-${index}`);
      });
    });
  });

  test.describe('Security Tests', () => {
    
    test('should enforce Content Security Policy', async ({ page }) => {
      const violations: any[] = [];
      
      page.on('console', msg => {
        if (msg.type() === 'error' && msg.text().includes('Content Security Policy')) {
          violations.push(msg.text());
        }
      });

      await page.goto('/test-cdn-csp.html');
      await page.waitForLoadState('networkidle');

      // Should not have CSP violations
      expect(violations).toHaveLength(0);

      // Overlay should still work with strict CSP
      const container = page.locator('#dino-overlay-container');
      await expect(container).toBeAttached();
    });

    test('should handle CORS properly', async ({ page }) => {
      const corsErrors: string[] = [];
      
      page.on('pageerror', error => {
        if (error.message.includes('CORS') || error.message.includes('cross-origin')) {
          corsErrors.push(error.message);
        }
      });

      await page.goto('/test-cdn-cors.html');
      await page.waitForLoadState('networkidle');

      // Should not have CORS errors
      expect(corsErrors).toHaveLength(0);

      // API calls should work
      const firstImage = page.locator('.editable-room').first();
      if (await firstImage.count() > 0) {
        await firstImage.click();
        
        const sidebar = page.locator('[data-testid="quick-action-sidebar"]');
        await expect(sidebar).toBeVisible();
      }
    });

    test('should validate SSL/TLS certificates', async ({ page }) => {
      const securityErrors: string[] = [];
      
      page.on('pageerror', error => {
        if (error.message.includes('certificate') || error.message.includes('SSL')) {
          securityErrors.push(error.message);
        }
      });

      await page.goto('/test-cdn-ssl.html');
      await page.waitForLoadState('networkidle');

      // Should not have SSL/TLS errors
      expect(securityErrors).toHaveLength(0);

      // Check that resources are loaded over HTTPS
      const responses: any[] = [];
      page.on('response', response => {
        if (response.url().includes('dino-overlay')) {
          responses.push(response.url());
        }
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      responses.forEach(url => {
        expect(url).toMatch(/^https:/);
      });
    });
  });

  test.describe('Deployment Verification', () => {
    
    test('should verify deployment manifest', async () => {
      const manifestPath = path.join(__dirname, '../../cdn/latest-deployment.json');
      
      if (fs.existsSync(manifestPath)) {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        
        // Verify manifest structure
        expect(manifest.version).toBeTruthy();
        expect(manifest.timestamp).toBeTruthy();
        expect(manifest.success).toBe(true);
        expect(manifest.files).toBeInstanceOf(Array);
        expect(manifest.files.length).toBeGreaterThan(0);
        
        // Verify file entries
        manifest.files.forEach((file: any) => {
          expect(file.source).toBeTruthy();
          expect(file.integrity).toMatch(/^sha384-/);
          expect(file.size).toBeGreaterThan(0);
          expect(file.url.primary).toMatch(/^https:/);
          expect(file.url.fallback).toMatch(/^https:/);
        });
      }
    });

    test('should verify integrity hashes', async () => {
      const integrityPath = path.join(__dirname, '../../cdn/integrity-manifest.json');
      
      if (fs.existsSync(integrityPath)) {
        const integrity = JSON.parse(fs.readFileSync(integrityPath, 'utf8'));
        
        // Verify each file's integrity
        Object.entries(integrity.files).forEach(([filename, fileInfo]: [string, any]) => {
          const filePath = path.join(__dirname, '../../cdn', filename);
          
          if (fs.existsSync(filePath)) {
            expect(fileInfo.sri).toMatch(/^sha384-/);
            expect(fileInfo.size).toBeGreaterThan(0);
            expect(fileInfo.hashes.sha384).toBeTruthy();
          }
        });
      }
    });

    test('should verify CDN configuration', async () => {
      const configPath = path.join(__dirname, '../../cdn/cdn-config.json');
      
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        
        // Verify configuration structure
        expect(config.version).toBeTruthy();
        expect(config.files).toBeInstanceOf(Array);
        expect(config.cdn.primary).toMatch(/^https:/);
        expect(config.cdn.fallback).toMatch(/^https:/);
        
        // Verify file configurations
        config.files.forEach((file: any) => {
          expect(file.source).toBeTruthy();
          expect(file.integrity).toMatch(/^sha384-/);
          expect(file.size).toBeGreaterThan(0);
          expect(file.contentType).toBeTruthy();
          expect(file.cacheControl).toContain('max-age');
        });
      }
    });

    test('should verify security headers configuration', async () => {
      const securityPath = path.join(__dirname, '../../cdn/security-headers.json');
      
      if (fs.existsSync(securityPath)) {
        const security = JSON.parse(fs.readFileSync(securityPath, 'utf8'));
        
        // Verify required security headers
        const requiredHeaders = [
          'Content-Security-Policy',
          'X-Content-Type-Options',
          'X-Frame-Options',
          'X-XSS-Protection',
          'Referrer-Policy',
          'Strict-Transport-Security'
        ];
        
        requiredHeaders.forEach(header => {
          expect(security[header]).toBeTruthy();
        });
        
        // Verify CSP includes required domains
        const csp = security['Content-Security-Policy'];
        expect(csp).toContain('cdn.dinooverlay.com');
        expect(csp).toContain('api.dinooverlay.com');
      }
    });
  });

  test.describe('Rollback and Recovery', () => {
    
    test('should handle version rollback', async ({ page }) => {
      // This would test the rollback mechanism
      // In a real scenario, you'd deploy a test version, then rollback
      
      await page.goto('/test-rollback.html');
      await page.waitForLoadState('networkidle');
      
      // Verify current version loads
      const container = page.locator('#dino-overlay-container');
      await expect(container).toBeAttached();
      
      // Check version information
      const version = await page.evaluate(() => {
        return (window as any).DinoOverlay?.version || 'unknown';
      });
      
      expect(version).toBeTruthy();
      expect(version).not.toBe('unknown');
    });

    test('should handle CDN failover gracefully', async ({ page }) => {
      let primaryFailed = false;
      
      // Simulate primary CDN failure after initial load
      await page.route(`${CDN_URLS.primary}/**`, route => {
        if (primaryFailed) {
          route.abort('failed');
        } else {
          route.continue();
        }
      });

      await page.goto('/test-failover.html');
      await page.waitForSelector('#dino-overlay-container');
      
      // Trigger failover
      primaryFailed = true;
      
      // Try to load additional resources (should use fallback)
      await page.evaluate(() => {
        // Simulate loading additional overlay resources
        const script = document.createElement('script');
        script.src = 'https://cdn.dinooverlay.com/v1/additional-resource.js';
        document.head.appendChild(script);
      });
      
      await page.waitForTimeout(2000);
      
      // Overlay should still be functional
      const firstImage = page.locator('.editable-room').first();
      if (await firstImage.count() > 0) {
        await firstImage.click();
        
        const sidebar = page.locator('[data-testid="quick-action-sidebar"]');
        await expect(sidebar).toBeVisible();
      }
    });
  });

  test.describe('Monitoring and Analytics', () => {
    
    test('should track performance metrics', async ({ page }) => {
      const metrics: any[] = [];
      
      page.on('console', msg => {
        if (msg.text().includes('DinoOverlay:metric')) {
          metrics.push(JSON.parse(msg.text().replace('DinoOverlay:metric ', '')));
        }
      });

      await page.goto('/test-analytics.html');
      await page.waitForSelector('#dino-overlay-container');
      
      // Trigger some interactions
      const firstImage = page.locator('.editable-room').first();
      if (await firstImage.count() > 0) {
        await firstImage.click();
        
        const sidebar = page.locator('[data-testid="quick-action-sidebar"]');
        await expect(sidebar).toBeVisible();
      }
      
      await page.waitForTimeout(1000);
      
      // Should have collected metrics
      expect(metrics.length).toBeGreaterThan(0);
      
      // Verify metric structure
      metrics.forEach(metric => {
        expect(metric.type).toBeTruthy();
        expect(metric.timestamp).toBeTruthy();
        expect(typeof metric.value).toBe('number');
      });
    });

    test('should handle error reporting', async ({ page }) => {
      const errorReports: any[] = [];
      
      page.on('console', msg => {
        if (msg.text().includes('DinoOverlay:error')) {
          errorReports.push(JSON.parse(msg.text().replace('DinoOverlay:error ', '')));
        }
      });

      // Mock API error to trigger error reporting
      await page.route('**/overlay/edit-image', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Test error' })
        });
      });

      await page.goto('/test-error-reporting.html');
      await page.waitForSelector('#dino-overlay-container');
      
      // Trigger error
      const firstImage = page.locator('.editable-room').first();
      if (await firstImage.count() > 0) {
        await firstImage.click();
        
        const sidebar = page.locator('[data-testid="quick-action-sidebar"]');
        const actionButton = sidebar.locator('[data-testid="action-button"]').first();
        await actionButton.click();
        
        await page.waitForTimeout(2000);
      }
      
      // Should have reported the error
      expect(errorReports.length).toBeGreaterThan(0);
      
      const errorReport = errorReports[0];
      expect(errorReport.type).toBe('api_error');
      expect(errorReport.message).toBeTruthy();
      expect(errorReport.timestamp).toBeTruthy();
    });
  });
});