import { SecurityAuditor } from '../../src/core/SecurityAuditor';
import { SecurityManager } from '../../src/core/SecurityManager';
import type { SecurityConfig } from '../../src/types/security';

describe('SecurityAuditor', () => {
  let auditor: SecurityAuditor;
  let securityManager: SecurityManager;

  beforeEach(() => {
    securityManager = new SecurityManager({
      enableCSP: true,
      enableInputSanitization: true,
      enableXSSProtection: true,
      enableAPIKeyEncryption: true,
      allowedDomains: ['https://api.example.com']
    });
    auditor = new SecurityAuditor(securityManager);
  });

  describe('Security Audit', () => {
    it('should perform comprehensive security audit', async () => {
      const result = await auditor.performAudit();

      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('vulnerabilities');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('score');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should detect CSP vulnerabilities', async () => {
      const insecureManager = new SecurityManager({ enableCSP: false });
      const insecureAuditor = new SecurityAuditor(insecureManager);

      const result = await insecureAuditor.performAudit();
      
      const cspVulns = result.vulnerabilities.filter(v => v.type === 'csp');
      expect(cspVulns.length).toBeGreaterThan(0);
      expect(cspVulns.some(v => v.description.includes('disabled'))).toBe(true);
    });

    it('should detect input sanitization vulnerabilities', async () => {
      const insecureManager = new SecurityManager({ enableInputSanitization: false });
      const insecureAuditor = new SecurityAuditor(insecureManager);

      const result = await insecureAuditor.performAudit();
      
      const inputVulns = result.vulnerabilities.filter(v => v.type === 'validation');
      expect(inputVulns.length).toBeGreaterThan(0);
      expect(inputVulns.some(v => v.description.includes('sanitization'))).toBe(true);
    });

    it('should detect XSS protection vulnerabilities', async () => {
      const insecureManager = new SecurityManager({ enableXSSProtection: false });
      const insecureAuditor = new SecurityAuditor(insecureManager);

      const result = await insecureAuditor.performAudit();
      
      const xssVulns = result.vulnerabilities.filter(v => v.type === 'xss');
      expect(xssVulns.length).toBeGreaterThan(0);
      expect(xssVulns.some(v => v.description.includes('XSS protection'))).toBe(true);
    });

    it('should calculate security score correctly', async () => {
      // Test with secure configuration
      const secureResult = await auditor.performAudit();
      
      // Test with insecure configuration
      const insecureManager = new SecurityManager({
        enableCSP: false,
        enableInputSanitization: false,
        enableXSSProtection: false,
        enableAPIKeyEncryption: false
      });
      const insecureAuditor = new SecurityAuditor(insecureManager);
      const insecureResult = await insecureAuditor.performAudit();

      expect(secureResult.score).toBeGreaterThan(insecureResult.score);
      expect(insecureResult.score).toBeLessThan(100);
    });

    it('should provide relevant recommendations', async () => {
      const insecureManager = new SecurityManager({
        enableCSP: false,
        enableInputSanitization: false
      });
      const insecureAuditor = new SecurityAuditor(insecureManager);

      const result = await insecureAuditor.performAudit();
      
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.some(r => r.includes('CSP') || r.includes('Content Security Policy'))).toBe(true);
      expect(result.recommendations.some(r => r.includes('input validation') || r.includes('sanitization'))).toBe(true);
    });
  });

  describe('Attack Vector Testing', () => {
    it('should test XSS attack vectors', async () => {
      const results = await auditor.testAttackVectors();
      
      // Should have XSS vector tests
      const xssTests = Object.keys(results).filter(key => key.startsWith('xss_vector_'));
      expect(xssTests.length).toBeGreaterThan(0);
      
      // Most XSS vectors should be blocked
      const blockedXSS = xssTests.filter(test => results[test]).length;
      expect(blockedXSS).toBeGreaterThan(xssTests.length * 0.8); // At least 80% blocked
    });

    it('should test injection attack vectors', async () => {
      const results = await auditor.testAttackVectors();
      
      // Should have injection vector tests
      const injectionTests = Object.keys(results).filter(key => key.startsWith('injection_vector_'));
      expect(injectionTests.length).toBeGreaterThan(0);
      
      // Most injection vectors should be blocked
      const blockedInjections = injectionTests.filter(test => results[test]).length;
      expect(blockedInjections).toBeGreaterThan(injectionTests.length * 0.8); // At least 80% blocked
    });

    it('should handle attack vectors with insecure configuration', async () => {
      const insecureManager = new SecurityManager({
        enableInputSanitization: false,
        enableXSSProtection: false
      });
      const insecureAuditor = new SecurityAuditor(insecureManager);

      const results = await insecureAuditor.testAttackVectors();
      
      // With insecure configuration, fewer attacks should be blocked
      const allTests = Object.keys(results);
      const blockedTests = allTests.filter(test => results[test]).length;
      
      expect(blockedTests).toBeLessThan(allTests.length * 0.5); // Less than 50% blocked
    });
  });

  describe('Security Report Generation', () => {
    it('should generate comprehensive security report', async () => {
      const report = await auditor.generateSecurityReport();
      
      expect(report).toContain('DinoOverlay Security Audit Report');
      expect(report).toContain('Overall Score:');
      expect(report).toContain('Status:');
      expect(report).toContain('Attack Vector Test Results');
      expect(report).toContain('Tests Passed:');
    });

    it('should include vulnerabilities in report', async () => {
      const insecureManager = new SecurityManager({ enableCSP: false });
      const insecureAuditor = new SecurityAuditor(insecureManager);

      const report = await insecureAuditor.generateSecurityReport();
      
      expect(report).toContain('Vulnerabilities Found');
      expect(report).toContain('CSP');
      expect(report).toContain('Recommendation');
    });

    it('should include recommendations in report', async () => {
      const report = await auditor.generateSecurityReport();
      
      expect(report).toContain('Recommendations');
      expect(report).toContain('security audits');
      expect(report).toContain('dependencies up to date');
    });

    it('should show passed status for secure configuration', async () => {
      const report = await auditor.generateSecurityReport();
      
      // With secure configuration, should have high score
      expect(report).toMatch(/Overall Score:\s*[8-9]\d|100/); // Score 80-100
    });

    it('should show failed status for insecure configuration', async () => {
      const insecureManager = new SecurityManager({
        enableCSP: false,
        enableInputSanitization: false,
        enableXSSProtection: false
      });
      const insecureAuditor = new SecurityAuditor(insecureManager);

      const report = await insecureAuditor.generateSecurityReport();
      
      expect(report).toContain('❌ FAILED');
    });
  });

  describe('CSP Audit', () => {
    it('should detect unsafe CSP directives', async () => {
      // Mock a security manager with unsafe CSP
      const unsafeManager = new SecurityManager();
      // Simulate unsafe CSP by modifying the generated header
      const originalGenerateCSP = unsafeManager.generateCSPHeader;
      unsafeManager.generateCSPHeader = () => "default-src 'self'; script-src 'self' 'unsafe-eval'";
      
      const unsafeAuditor = new SecurityAuditor(unsafeManager);
      const result = await unsafeAuditor.performAudit();
      
      const cspVulns = result.vulnerabilities.filter(v => 
        v.type === 'csp' && v.description.includes('unsafe-eval')
      );
      expect(cspVulns.length).toBeGreaterThan(0);
    });

    it('should detect missing security directives', async () => {
      const minimalManager = new SecurityManager();
      const originalGenerateCSP = minimalManager.generateCSPHeader;
      minimalManager.generateCSPHeader = () => "default-src 'self'"; // Minimal CSP
      
      const minimalAuditor = new SecurityAuditor(minimalManager);
      const result = await minimalAuditor.performAudit();
      
      const cspVulns = result.vulnerabilities.filter(v => v.type === 'csp');
      expect(cspVulns.some(v => v.description.includes('object-src'))).toBe(true);
      expect(cspVulns.some(v => v.description.includes('base-uri'))).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should complete audit within reasonable time', async () => {
      const start = performance.now();
      await auditor.performAudit();
      const end = performance.now();
      
      expect(end - start).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should complete attack vector testing within reasonable time', async () => {
      const start = performance.now();
      await auditor.testAttackVectors();
      const end = performance.now();
      
      expect(end - start).toBeLessThan(2000); // Should complete within 2 seconds
    });

    it('should generate report within reasonable time', async () => {
      const start = performance.now();
      await auditor.generateSecurityReport();
      const end = performance.now();
      
      expect(end - start).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing security manager gracefully', () => {
      const auditorWithoutManager = new SecurityAuditor();
      
      expect(async () => {
        await auditorWithoutManager.performAudit();
      }).not.toThrow();
    });

    it('should handle empty configuration', async () => {
      const emptyManager = new SecurityManager({});
      const emptyAuditor = new SecurityAuditor(emptyManager);
      
      const result = await emptyAuditor.performAudit();
      
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('vulnerabilities');
      expect(result).toHaveProperty('recommendations');
    });

    it('should handle errors in individual audit components', async () => {
      // Mock an error in one of the audit methods
      const errorAuditor = new SecurityAuditor(securityManager);
      const originalAuditCSP = (errorAuditor as any).auditCSP;
      (errorAuditor as any).auditCSP = () => {
        throw new Error('Test error');
      };
      
      // Should still complete audit despite error in one component
      const result = await errorAuditor.performAudit();
      expect(result).toHaveProperty('score');
    });
  });
});