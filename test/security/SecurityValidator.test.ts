import { SecurityValidator } from '../../src/core/SecurityValidator';
import type { ValidationRules, XSSPattern } from '../../src/types/security';

describe('SecurityValidator', () => {
  let validator: SecurityValidator;

  beforeEach(() => {
    validator = new SecurityValidator();
  });

  describe('Input Validation', () => {
    it('should validate required fields', () => {
      const rules: ValidationRules = { required: true };
      
      const emptyResult = validator.validateInput('', rules);
      expect(emptyResult.isValid).toBe(false);
      expect(emptyResult.errors).toContain('Input is required');
      
      const validResult = validator.validateInput('valid input', rules);
      expect(validResult.isValid).toBe(true);
    });

    it('should validate minimum length', () => {
      const rules: ValidationRules = { minLength: 5 };
      
      const shortResult = validator.validateInput('abc', rules);
      expect(shortResult.isValid).toBe(false);
      expect(shortResult.errors).toContain('Input must be at least 5 characters');
      
      const validResult = validator.validateInput('abcdef', rules);
      expect(validResult.isValid).toBe(true);
    });

    it('should validate maximum length', () => {
      const rules: ValidationRules = { maxLength: 10 };
      
      const longResult = validator.validateInput('this is too long', rules);
      expect(longResult.isValid).toBe(false);
      expect(longResult.errors).toContain('Input must not exceed 10 characters');
      
      const validResult = validator.validateInput('short', rules);
      expect(validResult.isValid).toBe(true);
    });

    it('should validate patterns', () => {
      const rules: ValidationRules = { pattern: /^[a-zA-Z0-9]+$/ };
      
      const invalidResult = validator.validateInput('invalid-chars!', rules);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toContain('Input format is invalid');
      
      const validResult = validator.validateInput('validChars123', rules);
      expect(validResult.isValid).toBe(true);
    });

    it('should validate allowed characters', () => {
      const rules: ValidationRules = { allowedCharacters: 'a-zA-Z0-9 ' };
      
      const invalidResult = validator.validateInput('invalid@chars', rules);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toContain('Input contains invalid characters');
      
      const validResult = validator.validateInput('valid chars 123', rules);
      expect(validResult.isValid).toBe(true);
    });

    it('should validate blocked patterns', () => {
      const rules: ValidationRules = { 
        blockedPatterns: [/<script/gi, /javascript:/gi] 
      };
      
      const blockedResult = validator.validateInput('<script>alert(1)</script>', rules);
      expect(blockedResult.isValid).toBe(false);
      expect(blockedResult.errors).toContain('Input contains blocked content');
      
      const validResult = validator.validateInput('safe content', rules);
      expect(validResult.isValid).toBe(true);
    });
  });

  describe('XSS Detection', () => {
    const xssPayloads = [
      '<script>alert("xss")</script>',
      '<img src=x onerror=alert(1)>',
      '<svg onload=alert(1)>',
      'javascript:alert(1)',
      'vbscript:alert(1)',
      '<object data="javascript:alert(1)">',
      '<embed src="javascript:alert(1)">',
      '<form action="javascript:alert(1)">',
      '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">',
      '<base href="javascript:alert(1)//">',
      '<link rel="stylesheet" href="javascript:alert(1)">',
      'data:text/html,<script>alert(1)</script>',
      'expression(alert(1))',
      '@import "javascript:alert(1)";'
    ];

    xssPayloads.forEach((payload, index) => {
      it(`should detect XSS pattern #${index + 1}: ${payload.substring(0, 30)}...`, () => {
        const patterns = validator.detectXSS(payload);
        expect(patterns.length).toBeGreaterThan(0);
        
        const validation = validator.validateInput(payload);
        expect(validation.isValid).toBe(false);
        expect(validation.errors).toContain('Input contains potential XSS attacks');
      });
    });

    it('should not flag safe content as XSS', () => {
      const safeInputs = [
        'Hello world',
        'This is a normal message with numbers 123',
        'Email: user@example.com',
        'URL: https://example.com/path?param=value',
        '<p>Safe HTML content</p>',
        'Math: 2 + 2 = 4'
      ];

      safeInputs.forEach(input => {
        const patterns = validator.detectXSS(input);
        expect(patterns.length).toBe(0);
      });
    });

    it('should allow adding custom XSS patterns', () => {
      const customPattern: XSSPattern = {
        name: 'Custom Attack',
        pattern: /customattack/gi,
        severity: 'high',
        description: 'Custom attack pattern'
      };

      validator.addXSSPattern(customPattern);
      
      const patterns = validator.detectXSS('This contains customattack');
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0].name).toBe('Custom Attack');
    });
  });

  describe('URL Validation', () => {
    it('should validate safe URLs', () => {
      const safeUrls = [
        'https://example.com',
        'http://localhost:3000',
        'https://api.example.com/endpoint?param=value',
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
      ];

      safeUrls.forEach(url => {
        const result = validator.validateURL(url);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject dangerous URLs', () => {
      const dangerousUrls = [
        'javascript:alert(1)',
        'vbscript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'data:application/javascript,alert(1)',
        'ftp://malicious.com',
        'file:///etc/passwd'
      ];

      dangerousUrls.forEach(url => {
        const result = validator.validateURL(url);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    it('should warn about HTTP URLs in HTTPS context', () => {
      // Mock HTTPS context
      Object.defineProperty(window, 'location', {
        value: { protocol: 'https:' },
        writable: true
      });

      const result = validator.validateURL('http://example.com');
      expect(result.warnings).toContain('HTTP URL detected in HTTPS context');
    });

    it('should reject malformed URLs', () => {
      const malformedUrls = [
        'not-a-url',
        'http://',
        'https://',
        '://example.com',
        'http://[invalid'
      ];

      malformedUrls.forEach(url => {
        const result = validator.validateURL(url);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Invalid URL format');
      });
    });
  });

  describe('Base64 Validation', () => {
    it('should validate correct base64 data', () => {
      const validBase64 = [
        'SGVsbG8gV29ybGQ=', // "Hello World"
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
        'VGVzdCBkYXRh' // "Test data"
      ];

      validBase64.forEach(data => {
        const result = validator.validateBase64(data);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject invalid base64 format', () => {
      const invalidBase64 = [
        'not-base64!',
        'SGVsbG8gV29ybGQ', // Missing padding
        'SGVsbG8@V29ybGQ=', // Invalid character
        ''
      ];

      invalidBase64.forEach(data => {
        const result = validator.validateBase64(data);
        expect(result.isValid).toBe(false);
      });
    });

    it('should detect suspicious content in base64', () => {
      // Base64 encoded "<script>alert(1)</script>"
      const maliciousBase64 = btoa('<script>alert(1)</script>');
      
      const result = validator.validateBase64(maliciousBase64);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Base64 data contains suspicious content');
    });

    it('should warn about large base64 data', () => {
      const largeData = 'A'.repeat(15 * 1024 * 1024); // 15MB
      const largeBase64 = btoa(largeData);
      
      const result = validator.validateBase64(largeBase64);
      expect(result.warnings).toContain('Base64 data is very large');
    });
  });

  describe('JSON Validation', () => {
    it('should validate safe JSON', () => {
      const safeJSON = JSON.stringify({
        message: 'Hello world',
        data: { count: 42, items: ['a', 'b', 'c'] }
      });

      const result = validator.validateJSON(safeJSON);
      expect(result.isValid).toBe(true);
    });

    it('should reject malformed JSON', () => {
      const malformedJSON = '{ "key": "value" '; // Missing closing brace

      const result = validator.validateJSON(malformedJSON);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid JSON format');
    });

    it('should detect prototype pollution attempts', () => {
      const pollutionAttempts = [
        '{"__proto__": {"polluted": true}}',
        '{"constructor": {"prototype": {"polluted": true}}}',
        '{"prototype": {"polluted": true}}'
      ];

      pollutionAttempts.forEach(json => {
        const result = validator.validateJSON(json);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('JSON contains prototype pollution attempt');
      });
    });

    it('should warn about function-like strings', () => {
      const suspiciousJSON = JSON.stringify({
        code: 'function() { return "suspicious"; }',
        arrow: '() => { alert(1); }',
        eval: 'eval("malicious code")'
      });

      const result = validator.validateJSON(suspiciousJSON);
      expect(result.warnings).toContain('JSON contains function-like strings');
    });
  });

  describe('HTML Validation', () => {
    it('should validate safe HTML', () => {
      const safeHTML = '<p>Safe content</p><div class="container">More content</div>';
      const allowedTags = ['p', 'div'];

      const result = validator.validateHTML(safeHTML, allowedTags);
      expect(result.isValid).toBe(true);
    });

    it('should detect XSS in HTML', () => {
      const maliciousHTML = '<p>Safe content</p><script>alert(1)</script>';
      const allowedTags = ['p'];

      const result = validator.validateHTML(maliciousHTML, allowedTags);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('HTML contains XSS patterns');
    });

    it('should warn about disallowed tags', () => {
      const htmlWithDisallowedTags = '<p>Safe</p><script>alert(1)</script><div>Also safe</div>';
      const allowedTags = ['p', 'div'];

      const result = validator.validateHTML(htmlWithDisallowedTags, allowedTags);
      expect(result.warnings.some(w => w.includes('Disallowed HTML tag: script'))).toBe(true);
    });

    it('should detect dangerous attributes', () => {
      const htmlWithDangerousAttrs = '<div onclick="alert(1)" onload="malicious()">Content</div>';
      const allowedTags = ['div'];

      const result = validator.validateHTML(htmlWithDangerousAttrs, allowedTags);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Dangerous attribute detected'))).toBe(true);
    });
  });

  describe('Security Events', () => {
    it('should emit security events for XSS attempts', (done) => {
      validator.addEventListener('xss_attempt', (event) => {
        expect(event.type).toBe('xss_attempt');
        expect(event.severity).toBeDefined();
        expect(event.blocked).toBe(true);
        done();
      });

      validator.validateInput('<script>alert(1)</script>');
    });

    it('should emit security events for invalid input', (done) => {
      const rules: ValidationRules = { 
        blockedPatterns: [/blocked/gi] 
      };

      validator.addEventListener('invalid_input', (event) => {
        expect(event.type).toBe('invalid_input');
        expect(event.description).toContain('blocked pattern');
        done();
      });

      validator.validateInput('this contains blocked content', rules);
    });

    it('should allow removing event listeners', () => {
      const listener = jest.fn();
      
      validator.addEventListener('xss_attempt', listener);
      validator.removeEventListener('xss_attempt', listener);
      
      validator.validateInput('<script>alert(1)</script>');
      
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle very long inputs efficiently', () => {
      const longInput = 'a'.repeat(100000);
      const start = performance.now();
      
      const result = validator.validateInput(longInput, { maxLength: 50000 });
      
      const end = performance.now();
      expect(end - start).toBeLessThan(1000); // Should complete within 1 second
      expect(result.isValid).toBe(false);
    });

    it('should handle null and undefined inputs gracefully', () => {
      expect(() => validator.validateInput(null as any)).not.toThrow();
      expect(() => validator.validateInput(undefined as any)).not.toThrow();
      expect(() => validator.validateURL(null as any)).not.toThrow();
      expect(() => validator.validateBase64(null as any)).not.toThrow();
    });

    it('should handle empty inputs', () => {
      const result = validator.validateInput('');
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should handle special characters correctly', () => {
      const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const result = validator.validateInput(specialChars);
      expect(result.isValid).toBe(true);
    });
  });
});