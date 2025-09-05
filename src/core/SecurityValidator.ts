import type { 
  SecurityValidationResult, 
  XSSPattern, 
  ValidationRules,
  SecurityEvent,
  SecurityEventType
} from '../types/security';

/**
 * SecurityValidator provides comprehensive input validation and XSS detection
 */
export class SecurityValidator {
  private xssPatterns: XSSPattern[];
  private eventListeners: Map<SecurityEventType, ((event: SecurityEvent) => void)[]>;

  constructor() {
    this.xssPatterns = this.initializeXSSPatterns();
    this.eventListeners = new Map();
  }

  /**
   * Initialize known XSS attack patterns
   */
  private initializeXSSPatterns(): XSSPattern[] {
    return [
      {
        name: 'Script Tag Injection',
        pattern: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        severity: 'critical',
        description: 'Attempts to inject script tags'
      },
      {
        name: 'Event Handler Injection',
        pattern: /on\w+\s*=\s*["'][^"']*["']/gi,
        severity: 'high',
        description: 'Attempts to inject event handlers'
      },
      {
        name: 'Event Handler Injection (unquoted)',
        pattern: /on\w+\s*=\s*[^"'\s>]+/gi,
        severity: 'high',
        description: 'Attempts to inject unquoted event handlers'
      },
      {
        name: 'JavaScript URL',
        pattern: /javascript\s*:/gi,
        severity: 'high',
        description: 'Attempts to use javascript: URLs'
      },
      {
        name: 'Data URL with HTML',
        pattern: /data\s*:\s*text\/html/gi,
        severity: 'medium',
        description: 'Attempts to use data URLs with HTML content'
      },
      {
        name: 'Data URL with JavaScript',
        pattern: /data\s*:\s*application\/javascript/gi,
        severity: 'high',
        description: 'Attempts to use data URLs with JavaScript content'
      },
      {
        name: 'CSS Expression',
        pattern: /expression\s*\(/gi,
        severity: 'medium',
        description: 'Attempts to use CSS expressions'
      },
      {
        name: 'Import Statement',
        pattern: /@import\s+/gi,
        severity: 'medium',
        description: 'Attempts to use CSS @import'
      },
      {
        name: 'VBScript',
        pattern: /vbscript\s*:/gi,
        severity: 'high',
        description: 'Attempts to use VBScript'
      },
      {
        name: 'Object/Embed Tag',
        pattern: /<(object|embed|applet)\b[^>]*>/gi,
        severity: 'high',
        description: 'Attempts to inject object/embed tags'
      },
      {
        name: 'Form Tag',
        pattern: /<form\b[^>]*>/gi,
        severity: 'medium',
        description: 'Attempts to inject form tags'
      },
      {
        name: 'Meta Refresh',
        pattern: /<meta\s+http-equiv\s*=\s*["']?refresh["']?/gi,
        severity: 'medium',
        description: 'Attempts to inject meta refresh'
      },
      {
        name: 'Base Tag',
        pattern: /<base\b[^>]*>/gi,
        severity: 'high',
        description: 'Attempts to inject base tag'
      },
      {
        name: 'Link Tag with JavaScript',
        pattern: /<link\b[^>]*href\s*=\s*["']?javascript:/gi,
        severity: 'high',
        description: 'Attempts to inject malicious link tags'
      },
      {
        name: 'Image with Error Handler',
        pattern: /<img\b[^>]*onerror\s*=/gi,
        severity: 'high',
        description: 'Attempts to inject image with error handler'
      },
      {
        name: 'SVG with Script',
        pattern: /<svg\b[^>]*onload\s*=/gi,
        severity: 'high',
        description: 'Attempts to inject SVG with onload handler'
      },
      {
        name: 'Iframe with JavaScript',
        pattern: /<iframe\b[^>]*src\s*=\s*["']?javascript:/gi,
        severity: 'critical',
        description: 'Attempts to inject iframe with JavaScript source'
      },
      {
        name: 'Body with Event Handler',
        pattern: /<body\b[^>]*on\w+\s*=/gi,
        severity: 'high',
        description: 'Attempts to inject body tag with event handlers'
      },
      {
        name: 'Input with Focus Handler',
        pattern: /<input\b[^>]*onfocus\s*=/gi,
        severity: 'medium',
        description: 'Attempts to inject input with focus handler'
      },
      {
        name: 'Style with JavaScript',
        pattern: /<style\b[^>]*>.*javascript:/gi,
        severity: 'high',
        description: 'Attempts to inject style with JavaScript'
      }
    ];
  }

  /**
   * Validate input against security rules
   */
  public validateInput(input: string, rules: ValidationRules = {}): SecurityValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Handle null/undefined inputs
    if (input == null) {
      if (rules.required) {
        errors.push('Input is required');
      }
      return { isValid: errors.length === 0, errors, warnings };
    }

    // Convert to string
    input = String(input);

    // Basic validation
    if (rules.required && (!input || input.trim().length === 0)) {
      errors.push('Input is required');
    }

    if (rules.minLength && input.length < rules.minLength) {
      errors.push(`Input must be at least ${rules.minLength} characters`);
    }

    if (rules.maxLength && input.length > rules.maxLength) {
      errors.push(`Input must not exceed ${rules.maxLength} characters`);
    }

    if (rules.pattern && !rules.pattern.test(input)) {
      errors.push('Input format is invalid');
    }

    // Character validation
    if (rules.allowedCharacters) {
      const allowedRegex = new RegExp(`^[${rules.allowedCharacters}]*$`);
      if (!allowedRegex.test(input)) {
        errors.push('Input contains invalid characters');
      }
    }

    // Blocked patterns
    if (rules.blockedPatterns) {
      for (const pattern of rules.blockedPatterns) {
        if (pattern.test(input)) {
          errors.push('Input contains blocked content');
          this.emitSecurityEvent({
            type: 'invalid_input',
            timestamp: Date.now(),
            severity: 'medium',
            description: 'Input matched blocked pattern',
            source: 'SecurityValidator',
            blocked: true
          });
          break;
        }
      }
    }

    // XSS detection
    const xssResult = this.detectXSS(input);
    if (xssResult.length > 0) {
      errors.push('Input contains potential XSS attacks');
      
      for (const attack of xssResult) {
        this.emitSecurityEvent({
          type: 'xss_attempt',
          timestamp: Date.now(),
          severity: attack.severity,
          description: `XSS attempt detected: ${attack.name}`,
          source: 'SecurityValidator',
          blocked: true
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Detect XSS attack patterns in input
   */
  public detectXSS(input: string): XSSPattern[] {
    const detectedPatterns: XSSPattern[] = [];

    for (const pattern of this.xssPatterns) {
      if (pattern.pattern.test(input)) {
        detectedPatterns.push(pattern);
      }
    }

    return detectedPatterns;
  }

  /**
   * Validate URL for security
   */
  public validateURL(url: string): SecurityValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const parsedURL = new URL(url);

      // Check protocol
      if (!['http:', 'https:', 'data:'].includes(parsedURL.protocol)) {
        errors.push('Invalid URL protocol');
      }

      // Warn about HTTP in production
      if (parsedURL.protocol === 'http:' && location.protocol === 'https:') {
        warnings.push('HTTP URL detected in HTTPS context');
      }

      // Check for suspicious patterns
      const suspiciousPatterns = [
        /javascript:/i,
        /vbscript:/i,
        /data:text\/html/i,
        /data:application\/javascript/i
      ];

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(url)) {
          errors.push('URL contains suspicious content');
          this.emitSecurityEvent({
            type: 'xss_attempt',
            timestamp: Date.now(),
            severity: 'high',
            description: 'Suspicious URL pattern detected',
            source: 'SecurityValidator',
            blocked: true
          });
          break;
        }
      }

    } catch (error) {
      errors.push('Invalid URL format');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate base64 data
   */
  public validateBase64(data: string): SecurityValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Handle null/undefined
    if (data == null) {
      errors.push('Base64 data is required');
      return { isValid: false, errors, warnings };
    }

    data = String(data);

    try {
      // Remove data URL prefix if present
      const base64Data = data.replace(/^data:[^;]+;base64,/, '');
      
      // Check if empty
      if (!base64Data) {
        errors.push('Invalid base64 format');
        return { isValid: false, errors, warnings };
      }
      
      // Check format - more lenient for missing padding
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64Data)) {
        errors.push('Invalid base64 format');
      }

      // Try to decode
      let decoded: string;
      try {
        decoded = atob(base64Data);
      } catch (decodeError) {
        errors.push('Invalid base64 encoding');
        return { isValid: false, errors, warnings };
      }
      
      // Check for suspicious content in decoded data
      const suspiciousPatterns = [
        /<script/i,
        /javascript:/i,
        /vbscript:/i,
        /on\w+\s*=/i
      ];

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(decoded)) {
          errors.push('Base64 data contains suspicious content');
          this.emitSecurityEvent({
            type: 'xss_attempt',
            timestamp: Date.now(),
            severity: 'high',
            description: 'Suspicious content in base64 data',
            source: 'SecurityValidator',
            blocked: true
          });
          break;
        }
      }

      // Check size (prevent DoS)
      if (decoded.length > 10 * 1024 * 1024) { // 10MB limit
        warnings.push('Base64 data is very large');
      }

    } catch (error) {
      errors.push('Invalid base64 encoding');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate JSON data
   */
  public validateJSON(jsonString: string): SecurityValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const parsed = JSON.parse(jsonString);
      
      // Check for prototype pollution attempts
      if (this.hasPrototypePollution(parsed)) {
        errors.push('JSON contains prototype pollution attempt');
        this.emitSecurityEvent({
          type: 'injection_attempt',
          timestamp: Date.now(),
          severity: 'critical',
          description: 'Prototype pollution attempt detected',
          source: 'SecurityValidator',
          blocked: true
        });
      }

      // Check for suspicious function strings
      const jsonStr = JSON.stringify(parsed);
      if (/function\s*\(|=>\s*{|eval\s*\(|setTimeout\s*\(|setInterval\s*\(/i.test(jsonStr)) {
        warnings.push('JSON contains function-like strings');
      }

    } catch (error) {
      errors.push('Invalid JSON format');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Check for prototype pollution in object
   */
  private hasPrototypePollution(obj: any): boolean {
    if (typeof obj !== 'object' || obj === null) {
      return false;
    }

    const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
    
    for (const key of Object.keys(obj)) {
      if (dangerousKeys.includes(key)) {
        return true;
      }
      
      if (typeof obj[key] === 'object' && this.hasPrototypePollution(obj[key])) {
        return true;
      }
    }

    return false;
  }

  /**
   * Validate HTML content
   */
  public validateHTML(html: string, allowedTags: string[] = []): SecurityValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for XSS patterns
    const xssPatterns = this.detectXSS(html);
    if (xssPatterns.length > 0) {
      errors.push('HTML contains XSS patterns');
    }

    // Parse HTML and check tags
    try {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      
      const allElements = tempDiv.querySelectorAll('*');
      for (const element of allElements) {
        const tagName = element.tagName.toLowerCase();
        
        if (allowedTags.length > 0 && !allowedTags.includes(tagName)) {
          warnings.push(`Disallowed HTML tag: ${tagName}`);
        }

        // Check for dangerous attributes
        const dangerousAttrs = ['onclick', 'onload', 'onerror', 'onmouseover', 'onfocus'];
        for (const attr of dangerousAttrs) {
          if (element.hasAttribute(attr)) {
            errors.push(`Dangerous attribute detected: ${attr}`);
          }
        }
      }
    } catch (error) {
      errors.push('Invalid HTML structure');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Add security event listener
   */
  public addEventListener(type: SecurityEventType, listener: (event: SecurityEvent) => void): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, []);
    }
    this.eventListeners.get(type)!.push(listener);
  }

  /**
   * Remove security event listener
   */
  public removeEventListener(type: SecurityEventType, listener: (event: SecurityEvent) => void): void {
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit security event
   */
  private emitSecurityEvent(event: SecurityEvent): void {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(event);
        } catch (error) {
          console.error('Security event listener error:', error);
        }
      }
    }
  }

  /**
   * Get all XSS patterns for testing
   */
  public getXSSPatterns(): XSSPattern[] {
    return [...this.xssPatterns];
  }

  /**
   * Add custom XSS pattern
   */
  public addXSSPattern(pattern: XSSPattern): void {
    this.xssPatterns.push(pattern);
  }
}

// Export singleton instance
export const securityValidator = new SecurityValidator();