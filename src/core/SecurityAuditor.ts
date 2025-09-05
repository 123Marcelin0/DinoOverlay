import type { 
  SecurityAuditResult, 
  SecurityVulnerability, 
  SecurityConfig 
} from '../types/security';
import { SecurityManager } from './SecurityManager';
import { SecurityValidator } from './SecurityValidator';

/**
 * SecurityAuditor performs comprehensive security audits of the DinoOverlay system
 */
export class SecurityAuditor {
  private securityManager: SecurityManager;
  private securityValidator: SecurityValidator;

  constructor(securityManager?: SecurityManager) {
    this.securityManager = securityManager || new SecurityManager();
    this.securityValidator = new SecurityValidator();
  }

  /**
   * Perform a comprehensive security audit
   */
  public async performAudit(): Promise<SecurityAuditResult> {
    const vulnerabilities: SecurityVulnerability[] = [];
    const recommendations: string[] = [];

    try {
      // Audit CSP configuration
      const cspVulns = this.auditCSP();
      vulnerabilities.push(...cspVulns);
    } catch (error) {
      console.error('CSP audit failed:', error);
      vulnerabilities.push({
        type: 'csp',
        severity: 'medium',
        description: 'CSP audit failed to complete',
        recommendation: 'Review CSP configuration manually'
      });
    }

    try {
      // Audit input sanitization
      const inputVulns = this.auditInputSanitization();
      vulnerabilities.push(...inputVulns);
    } catch (error) {
      console.error('Input sanitization audit failed:', error);
      vulnerabilities.push({
        type: 'validation',
        severity: 'medium',
        description: 'Input sanitization audit failed to complete',
        recommendation: 'Review input validation manually'
      });
    }

    try {
      // Audit XSS protection
      const xssVulns = this.auditXSSProtection();
      vulnerabilities.push(...xssVulns);
    } catch (error) {
      console.error('XSS protection audit failed:', error);
      vulnerabilities.push({
        type: 'xss',
        severity: 'medium',
        description: 'XSS protection audit failed to complete',
        recommendation: 'Review XSS protection manually'
      });
    }

    try {
      // Audit encryption settings
      const encryptionVulns = this.auditEncryption();
      vulnerabilities.push(...encryptionVulns);
    } catch (error) {
      console.error('Encryption audit failed:', error);
      vulnerabilities.push({
        type: 'encryption',
        severity: 'medium',
        description: 'Encryption audit failed to complete',
        recommendation: 'Review encryption settings manually'
      });
    }

    try {
      // Audit DOM security
      const domVulns = await this.auditDOMSecurity();
      vulnerabilities.push(...domVulns);
    } catch (error) {
      console.error('DOM security audit failed:', error);
      vulnerabilities.push({
        type: 'validation',
        severity: 'low',
        description: 'DOM security audit failed to complete',
        recommendation: 'Review DOM security manually'
      });
    }

    // Generate recommendations
    recommendations.push(...this.generateRecommendations(vulnerabilities));

    // Calculate security score
    const score = this.calculateSecurityScore(vulnerabilities);

    return {
      passed: vulnerabilities.filter(v => v.severity === 'critical' || v.severity === 'high').length === 0,
      vulnerabilities,
      recommendations,
      score
    };
  }

  /**
   * Audit Content Security Policy configuration
   */
  private auditCSP(): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];
    const config = this.securityManager.getSecurityConfig();

    if (!config.enableCSP) {
      vulnerabilities.push({
        type: 'csp',
        severity: 'high',
        description: 'Content Security Policy is disabled',
        recommendation: 'Enable CSP to prevent XSS attacks and unauthorized resource loading'
      });
    }

    const cspHeader = this.securityManager.generateCSPHeader();

    // Check for unsafe CSP directives
    if (cspHeader.includes("'unsafe-eval'")) {
      vulnerabilities.push({
        type: 'csp',
        severity: 'high',
        description: "CSP allows 'unsafe-eval' which can enable code injection",
        recommendation: "Remove 'unsafe-eval' from CSP directives"
      });
    }

    if (cspHeader.includes("'unsafe-inline'") && !cspHeader.includes('nonce-')) {
      vulnerabilities.push({
        type: 'csp',
        severity: 'medium',
        description: "CSP allows 'unsafe-inline' without nonce protection",
        recommendation: "Use nonce-based CSP instead of 'unsafe-inline'"
      });
    }

    if (!cspHeader.includes("object-src 'none'")) {
      vulnerabilities.push({
        type: 'csp',
        severity: 'medium',
        description: 'CSP does not restrict object-src',
        recommendation: "Add object-src 'none' to prevent plugin-based attacks"
      });
    }

    if (!cspHeader.includes('base-uri')) {
      vulnerabilities.push({
        type: 'csp',
        severity: 'medium',
        description: 'CSP does not restrict base-uri',
        recommendation: "Add base-uri 'self' to prevent base tag injection"
      });
    }

    return vulnerabilities;
  }

  /**
   * Audit input sanitization configuration
   */
  private auditInputSanitization(): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];
    const config = this.securityManager.getSecurityConfig();

    if (!config.enableInputSanitization) {
      vulnerabilities.push({
        type: 'validation',
        severity: 'critical',
        description: 'Input sanitization is disabled',
        recommendation: 'Enable input sanitization to prevent injection attacks'
      });
    }

    // Test sanitization with known attack vectors
    const testPayloads = [
      '<script>alert("xss")</script>',
      'javascript:alert(1)',
      '<img src=x onerror=alert(1)>',
      '<svg onload=alert(1)>'
    ];

    for (const payload of testPayloads) {
      try {
        const sanitized = this.securityManager.sanitizeInput(payload);
        if (sanitized.includes('<script>') || sanitized.includes('javascript:') || sanitized.includes('onerror')) {
          vulnerabilities.push({
            type: 'xss',
            severity: 'high',
            description: `Input sanitization failed to neutralize: ${payload.substring(0, 50)}...`,
            recommendation: 'Improve input sanitization rules to handle this attack vector'
          });
        }
      } catch (error) {
        // Sanitization throwing errors is acceptable
      }
    }

    return vulnerabilities;
  }

  /**
   * Audit XSS protection mechanisms
   */
  private auditXSSProtection(): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];
    const config = this.securityManager.getSecurityConfig();

    if (!config.enableXSSProtection) {
      vulnerabilities.push({
        type: 'xss',
        severity: 'high',
        description: 'XSS protection is disabled',
        recommendation: 'Enable XSS protection to detect and prevent cross-site scripting attacks'
      });
    }

    // Test XSS detection capabilities
    const xssPatterns = this.securityValidator.getXSSPatterns();
    
    if (xssPatterns.length < 10) {
      vulnerabilities.push({
        type: 'xss',
        severity: 'medium',
        description: 'Limited XSS pattern detection coverage',
        recommendation: 'Expand XSS pattern database to cover more attack vectors'
      });
    }

    // Test detection of advanced XSS techniques
    const advancedXSS = [
      'data:text/html,<script>alert(1)</script>',
      '<svg><script>alert(1)</script></svg>',
      '<math><mi//xlink:href="data:x,<script>alert(1)</script>">',
      '<iframe srcdoc="<script>alert(1)</script>"></iframe>'
    ];

    for (const payload of advancedXSS) {
      const detected = this.securityValidator.detectXSS(payload);
      if (detected.length === 0) {
        vulnerabilities.push({
          type: 'xss',
          severity: 'medium',
          description: `Advanced XSS technique not detected: ${payload.substring(0, 50)}...`,
          recommendation: 'Add detection patterns for advanced XSS techniques'
        });
      }
    }

    return vulnerabilities;
  }

  /**
   * Audit encryption configuration
   */
  private auditEncryption(): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];
    const config = this.securityManager.getSecurityConfig();

    if (!config.enableAPIKeyEncryption) {
      vulnerabilities.push({
        type: 'encryption',
        severity: 'medium',
        description: 'API key encryption is disabled',
        recommendation: 'Enable API key encryption for secure transmission'
      });
    }

    // Check if Web Crypto API is available
    if (typeof crypto === 'undefined' || !crypto.subtle) {
      vulnerabilities.push({
        type: 'encryption',
        severity: 'high',
        description: 'Web Crypto API is not available',
        recommendation: 'Ensure the application runs in a secure context (HTTPS) to access Web Crypto API'
      });
    }

    return vulnerabilities;
  }

  /**
   * Audit DOM security
   */
  private async auditDOMSecurity(): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];

    // Check if running in secure context
    if (typeof window !== 'undefined') {
      if (!window.isSecureContext) {
        vulnerabilities.push({
          type: 'encryption',
          severity: 'high',
          description: 'Application is not running in a secure context',
          recommendation: 'Serve the application over HTTPS to enable secure context features'
        });
      }

      // Check for dangerous global variables
      const dangerousGlobals = ['eval', 'Function', 'setTimeout', 'setInterval'];
      for (const globalVar of dangerousGlobals) {
        if (typeof (window as any)[globalVar] === 'function') {
          // This is expected, but we should warn about potential misuse
          vulnerabilities.push({
            type: 'validation',
            severity: 'low',
            description: `Global ${globalVar} function is available`,
            recommendation: `Avoid using ${globalVar} with user-controlled input`
          });
        }
      }

      // Check for existing CSP violations
      if (document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
        const existingCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.getAttribute('content');
        if (existingCSP && existingCSP.includes("'unsafe-eval'")) {
          vulnerabilities.push({
            type: 'csp',
            severity: 'high',
            description: 'Existing CSP allows unsafe-eval',
            recommendation: 'Remove unsafe-eval from existing CSP or override with stricter policy'
          });
        }
      }
    }

    return vulnerabilities;
  }

  /**
   * Generate security recommendations based on vulnerabilities
   */
  private generateRecommendations(vulnerabilities: SecurityVulnerability[]): string[] {
    const recommendations: string[] = [];
    const severityCounts = {
      critical: vulnerabilities.filter(v => v.severity === 'critical').length,
      high: vulnerabilities.filter(v => v.severity === 'high').length,
      medium: vulnerabilities.filter(v => v.severity === 'medium').length,
      low: vulnerabilities.filter(v => v.severity === 'low').length
    };

    if (severityCounts.critical > 0) {
      recommendations.push('🚨 CRITICAL: Address all critical vulnerabilities immediately before deployment');
    }

    if (severityCounts.high > 0) {
      recommendations.push('⚠️ HIGH: Resolve high-severity vulnerabilities as soon as possible');
    }

    if (severityCounts.medium > 0) {
      recommendations.push('📋 MEDIUM: Plan to address medium-severity vulnerabilities in the next release');
    }

    // Specific recommendations based on vulnerability types
    const types = new Set(vulnerabilities.map(v => v.type));

    if (types.has('csp')) {
      recommendations.push('🛡️ Implement a strict Content Security Policy to prevent XSS attacks');
    }

    if (types.has('xss')) {
      recommendations.push('🔒 Strengthen XSS protection with comprehensive input validation and output encoding');
    }

    if (types.has('encryption')) {
      recommendations.push('🔐 Enable encryption features and ensure secure context (HTTPS)');
    }

    if (types.has('validation')) {
      recommendations.push('✅ Implement comprehensive input validation for all user inputs');
    }

    // General security recommendations
    recommendations.push('📊 Regularly perform security audits and penetration testing');
    recommendations.push('📚 Keep security dependencies up to date');
    recommendations.push('🔍 Monitor for security events and implement logging');

    return recommendations;
  }

  /**
   * Calculate security score based on vulnerabilities
   */
  private calculateSecurityScore(vulnerabilities: SecurityVulnerability[]): number {
    let score = 100;

    for (const vuln of vulnerabilities) {
      switch (vuln.severity) {
        case 'critical':
          score -= 25;
          break;
        case 'high':
          score -= 15;
          break;
        case 'medium':
          score -= 8;
          break;
        case 'low':
          score -= 3;
          break;
      }
    }

    return Math.max(0, score);
  }

  /**
   * Test specific attack vectors
   */
  public async testAttackVectors(): Promise<{ [key: string]: boolean }> {
    const results: { [key: string]: boolean } = {};

    // Test XSS vectors
    const xssVectors = [
      '<script>alert("xss")</script>',
      'javascript:alert(1)',
      '<img src=x onerror=alert(1)>',
      '<svg onload=alert(1)>',
      '<iframe src="javascript:alert(1)"></iframe>',
      'data:text/html,<script>alert(1)</script>'
    ];

    for (let i = 0; i < xssVectors.length; i++) {
      const vector = xssVectors[i];
      try {
        const sanitized = this.securityManager.sanitizeInput(vector);
        const detected = this.securityValidator.detectXSS(vector);
        
        // Attack is blocked if it's sanitized AND detected
        results[`xss_vector_${i + 1}`] = !sanitized.includes('<script>') && 
                                        !sanitized.includes('javascript:') && 
                                        !sanitized.includes('onerror') && 
                                        detected.length > 0;
      } catch (error) {
        // If sanitization throws an error, consider it blocked
        results[`xss_vector_${i + 1}`] = true;
      }
    }

    // Test injection vectors
    const injectionVectors = [
      '"; DROP TABLE users; --',
      "'; DELETE FROM users WHERE '1'='1",
      '<script>fetch("/admin/delete-all")</script>',
      '{{7*7}}', // Template injection
      '${7*7}', // Expression injection
      '__proto__.polluted = true' // Prototype pollution
    ];

    for (let i = 0; i < injectionVectors.length; i++) {
      const vector = injectionVectors[i];
      try {
        const validation = this.securityValidator.validateInput(vector, {
          blockedPatterns: [/script/gi, /drop\s+table/gi, /delete\s+from/gi, /__proto__/gi]
        });
        
        results[`injection_vector_${i + 1}`] = !validation.isValid;
      } catch (error) {
        results[`injection_vector_${i + 1}`] = true;
      }
    }

    return results;
  }

  /**
   * Generate security report
   */
  public async generateSecurityReport(): Promise<string> {
    const audit = await this.performAudit();
    const attackTests = await this.testAttackVectors();

    let report = '# DinoOverlay Security Audit Report\n\n';
    report += `**Overall Score:** ${audit.score}/100\n`;
    report += `**Status:** ${audit.passed ? '✅ PASSED' : '❌ FAILED'}\n\n`;

    // Vulnerabilities section
    if (audit.vulnerabilities.length > 0) {
      report += '## 🚨 Vulnerabilities Found\n\n';
      
      const groupedVulns = audit.vulnerabilities.reduce((acc, vuln) => {
        if (!acc[vuln.severity]) acc[vuln.severity] = [];
        acc[vuln.severity].push(vuln);
        return acc;
      }, {} as { [key: string]: SecurityVulnerability[] });

      for (const severity of ['critical', 'high', 'medium', 'low']) {
        const vulns = groupedVulns[severity];
        if (vulns && vulns.length > 0) {
          report += `### ${severity.toUpperCase()} (${vulns.length})\n\n`;
          
          for (const vuln of vulns) {
            report += `- **${vuln.type.toUpperCase()}**: ${vuln.description}\n`;
            report += `  - *Recommendation*: ${vuln.recommendation}\n\n`;
          }
        }
      }
    } else {
      report += '## ✅ No Vulnerabilities Found\n\n';
    }

    // Attack vector tests
    report += '## 🛡️ Attack Vector Test Results\n\n';
    const passedTests = Object.values(attackTests).filter(Boolean).length;
    const totalTests = Object.keys(attackTests).length;
    
    report += `**Tests Passed:** ${passedTests}/${totalTests}\n\n`;
    
    for (const [test, passed] of Object.entries(attackTests)) {
      const status = passed ? '✅' : '❌';
      report += `- ${status} ${test.replace(/_/g, ' ').toUpperCase()}\n`;
    }

    // Recommendations
    if (audit.recommendations.length > 0) {
      report += '\n## 📋 Recommendations\n\n';
      for (const recommendation of audit.recommendations) {
        report += `- ${recommendation}\n`;
      }
    }

    report += '\n---\n';
    report += `*Report generated on ${new Date().toISOString()}*\n`;

    return report;
  }
}

// Export singleton instance
export const securityAuditor = new SecurityAuditor();