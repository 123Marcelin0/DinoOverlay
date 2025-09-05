import { SecurityManager } from '../../src/core/SecurityManager';
import type { SecurityConfig } from '../../src/types/security';

describe('SecurityManager', () => {
  let securityManager: SecurityManager;

  beforeEach(() => {
    securityManager = new SecurityManager({
      enableCSP: true,
      enableInputSanitization: true,
      enableXSSProtection: true,
      enableAPIKeyEncryption: true,
      allowedDomains: ['https://api.example.com', 'https://cdn.example.com']
    });
  });

  describe('CSP (Content Security Policy)', () => {
    it('should generate valid CSP header', () => {
      const cspHeader = securityManager.generateCSPHeader();
      
      expect(cspHeader).toContain("default-src 'self'");
      expect(cspHeader).toContain("script-src 'self'");
      expect(cspHeader).toContain("nonce-");
      expect(cspHeader).toContain("img-src 'self' data: blob:");
      expect(cspHeader).toContain("object-src 'none'");
    });

    it('should include allowed domains in CSP', () => {
      const cspHeader = securityManager.generateCSPHeader();
      
      expect(cspHeader).toContain('https://api.example.com');
      expect(cspHeader).toContain('https://cdn.example.com');
    });

    it('should generate unique nonce values', () => {
      const nonce1 = securityManager.getNonce();
      const securityManager2 = new SecurityManager();
      const nonce2 = securityManager2.getNonce();
      
      expect(nonce1).not.toBe(nonce2);
      expect(nonce1).toMatch(/^[A-Za-z0-9]+$/);
    });

    it('should add allowed domains dynamically', () => {
      securityManager.addAllowedDomain('https://new-domain.com');
      const cspHeader = securityManager.generateCSPHeader();
      
      expect(cspHeader).toContain('https://new-domain.com');
    });

    it('should reject invalid domains', () => {
      expect(() => {
        securityManager.addAllowedDomain('invalid-domain');
      }).toThrow('Invalid domain');
    });
  });

  describe('Input Sanitization', () => {
    it('should escape HTML entities by default', () => {
      const input = '<script>alert("xss")</script>';
      const sanitized = securityManager.sanitizeInput(input);
      
      expect(sanitized).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });

    it('should enforce maximum length', () => {
      const longInput = 'a'.repeat(1000);
      
      expect(() => {
        securityManager.sanitizeInput(longInput, { maxLength: 100 });
      }).toThrow('Input exceeds maximum length');
    });

    it('should allow specific HTML tags when configured', () => {
      const input = '<p>Safe content</p><script>alert("xss")</script>';
      const sanitized = securityManager.sanitizeInput(input, {
        allowHTML: true,
        allowedTags: ['p'],
        allowedAttributes: []
      });
      
      expect(sanitized).toContain('<p>Safe content</p>');
      expect(sanitized).not.toContain('<script>');
    });

    it('should remove dangerous attributes', () => {
      const input = '<div onclick="alert(1)" class="safe">Content</div>';
      const sanitized = securityManager.sanitizeInput(input, {
        allowHTML: true,
        allowedTags: ['div'],
        allowedAttributes: ['class']
      });
      
      expect(sanitized).toContain('class="safe"');
      expect(sanitized).not.toContain('onclick');
    });

    it('should sanitize nested objects in API responses', () => {
      const response = {
        message: '<script>alert("xss")</script>',
        data: {
          title: '<img src=x onerror=alert(1)>',
          items: ['<script>evil</script>', 'safe content']
        }
      };
      
      const sanitized = securityManager.sanitizeAPIResponse(response);
      
      expect(sanitized.message).not.toContain('<script>');
      expect(sanitized.data.title).not.toContain('onerror');
      expect(sanitized.data.items[0]).not.toContain('<script>');
      expect(sanitized.data.items[1]).toBe('safe content');
    });
  });

  describe('XSS Prevention', () => {
    const xssPayloads = [
      '<script>alert("xss")</script>',
      'javascript:alert(1)',
      '<img src=x onerror=alert(1)>',
      '<svg onload=alert(1)>',
      '<iframe src="javascript:alert(1)"></iframe>',
      '<object data="javascript:alert(1)">',
      '<embed src="javascript:alert(1)">',
      '<link rel="stylesheet" href="javascript:alert(1)">',
      '<style>@import "javascript:alert(1)";</style>',
      '<div style="background:url(javascript:alert(1))">',
      '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">',
      '<base href="javascript:alert(1)//">',
      '<form action="javascript:alert(1)">',
      'vbscript:alert(1)',
      'data:text/html,<script>alert(1)</script>'
    ];

    xssPayloads.forEach((payload, index) => {
      it(`should prevent XSS attack #${index + 1}: ${payload.substring(0, 50)}...`, () => {
        const sanitized = securityManager.sanitizeInput(payload);
        
        // Should not contain dangerous patterns
        expect(sanitized).not.toMatch(/<script/i);
        expect(sanitized).not.toMatch(/javascript:/i);
        expect(sanitized).not.toMatch(/vbscript:/i);
        expect(sanitized).not.toMatch(/on\w+\s*=/i);
        expect(sanitized).not.toMatch(/@import/i);
        expect(sanitized).not.toMatch(/expression\s*\(/i);
      });
    });
  });

  describe('URL Validation', () => {
    it('should validate safe URLs', () => {
      const safeUrls = [
        'https://api.example.com/endpoint',
        'https://cdn.example.com/image.jpg',
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
      ];

      safeUrls.forEach(url => {
        expect(securityManager.validateURL(url)).toBe(true);
      });
    });

    it('should reject unsafe URLs', () => {
      const unsafeUrls = [
        'javascript:alert(1)',
        'vbscript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'ftp://malicious.com/file',
        'file:///etc/passwd'
      ];

      unsafeUrls.forEach(url => {
        expect(securityManager.validateURL(url)).toBe(false);
      });
    });

    it('should enforce HTTPS in strict mode', () => {
      const strictManager = new SecurityManager({ strictMode: true });
      
      expect(strictManager.validateURL('http://example.com')).toBe(false);
      expect(strictManager.validateURL('https://example.com')).toBe(true);
    });
  });

  describe('API Key Encryption', () => {
    it('should encrypt API keys when enabled', async () => {
      const apiKey = 'test-api-key-12345';
      const encrypted = await securityManager.encryptAPIKey(apiKey);
      
      expect(encrypted).not.toBe(apiKey);
      expect(encrypted.length).toBeGreaterThan(apiKey.length);
    });

    it('should return original key when encryption is disabled', async () => {
      const noEncryptionManager = new SecurityManager({ enableAPIKeyEncryption: false });
      const apiKey = 'test-api-key-12345';
      const result = await noEncryptionManager.encryptAPIKey(apiKey);
      
      expect(result).toBe(apiKey);
    });
  });

  describe('Secure Headers', () => {
    it('should create secure headers for API requests', () => {
      const apiKey = 'test-key';
      const headers = securityManager.createSecureHeaders(apiKey);
      
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['Authorization']).toBe(`Bearer ${apiKey}`);
      expect(headers['X-Requested-With']).toBe('XMLHttpRequest');
      expect(headers['X-DinoOverlay-Version']).toBe('1.0.0');
      expect(headers['X-CSP-Nonce']).toBeDefined();
    });

    it('should include additional headers', () => {
      const apiKey = 'test-key';
      const additionalHeaders = { 'Custom-Header': 'custom-value' };
      const headers = securityManager.createSecureHeaders(apiKey, additionalHeaders);
      
      expect(headers['Custom-Header']).toBe('custom-value');
    });
  });

  describe('Configuration Management', () => {
    it('should return current security configuration', () => {
      const config = securityManager.getSecurityConfig();
      
      expect(config.enableCSP).toBe(true);
      expect(config.enableInputSanitization).toBe(true);
      expect(config.allowedDomains).toContain('https://api.example.com');
    });

    it('should update configuration', () => {
      securityManager.updateConfig({ strictMode: true });
      const config = securityManager.getSecurityConfig();
      
      expect(config.strictMode).toBe(true);
    });

    it('should regenerate nonce when CSP settings change', () => {
      const originalNonce = securityManager.getNonce();
      securityManager.updateConfig({ enableCSP: false });
      const newNonce = securityManager.getNonce();
      
      expect(newNonce).not.toBe(originalNonce);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null and undefined inputs', () => {
      expect(() => securityManager.sanitizeInput(null as any)).not.toThrow();
      expect(() => securityManager.sanitizeInput(undefined as any)).not.toThrow();
    });

    it('should handle empty strings', () => {
      const result = securityManager.sanitizeInput('');
      expect(result).toBe('');
    });

    it('should handle very long inputs gracefully', () => {
      const veryLongInput = 'a'.repeat(100000);
      
      expect(() => {
        securityManager.sanitizeInput(veryLongInput, { maxLength: 50000 });
      }).toThrow();
    });

    it('should handle malformed HTML', () => {
      const malformedHTML = '<div><p>Unclosed tags<span>';
      const sanitized = securityManager.sanitizeInput(malformedHTML);
      
      expect(sanitized).not.toContain('<');
    });
  });
});