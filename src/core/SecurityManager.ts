import type { SecurityConfig, CSPConfig, SanitizationOptions } from '../types/security';

/**
 * SecurityManager handles all security-related functionality including
 * CSP compliance, input sanitization, XSS prevention, and secure API communication
 */
export class SecurityManager {
  private config: Required<SecurityConfig>;
  private nonce: string;
  private cspDirectives: Map<string, string[]>;

  constructor(config: SecurityConfig = {}) {
    this.config = {
      enableCSP: true,
      enableInputSanitization: true,
      enableXSSProtection: true,
      enableAPIKeyEncryption: true,
      strictMode: false,
      allowedDomains: [],
      trustedScriptSources: [],
      ...config
    };

    this.nonce = this.generateNonce();
    this.cspDirectives = new Map();
    this.initializeCSP();
  }

  /**
   * Generate a cryptographically secure nonce for CSP
   */
  private generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array)).replace(/[+/=]/g, '');
  }

  /**
   * Get the current nonce value
   */
  public getNonce(): string {
    return this.nonce;
  }

  /**
   * Initialize Content Security Policy directives
   */
  private initializeCSP(): void {
    // Default CSP directives for DinoOverlay
    this.cspDirectives.set('default-src', ["'self'"]);
    this.cspDirectives.set('script-src', [
      "'self'",
      `'nonce-${this.nonce}'`,
      "'strict-dynamic'",
      ...this.config.trustedScriptSources
    ]);
    this.cspDirectives.set('style-src', [
      "'self'",
      "'unsafe-inline'", // Required for dynamic glassmorphic styles
      `'nonce-${this.nonce}'`
    ]);
    this.cspDirectives.set('img-src', [
      "'self'",
      'data:', // For base64 images
      'blob:', // For processed images
      ...this.config.allowedDomains
    ]);
    this.cspDirectives.set('connect-src', [
      "'self'",
      ...this.config.allowedDomains
    ]);
    this.cspDirectives.set('font-src', ["'self'", 'data:']);
    this.cspDirectives.set('object-src', ["'none'"]);
    this.cspDirectives.set('base-uri', ["'self'"]);
    this.cspDirectives.set('form-action', ["'self'"]);
    this.cspDirectives.set('frame-ancestors', ["'none'"]);
    
    if (this.config.strictMode) {
      this.cspDirectives.set('upgrade-insecure-requests', []);
      this.cspDirectives.set('block-all-mixed-content', []);
    }
  }

  /**
   * Generate CSP header value
   */
  public generateCSPHeader(): string {
    const directives: string[] = [];
    
    for (const [directive, sources] of this.cspDirectives) {
      if (sources.length === 0) {
        directives.push(directive);
      } else {
        directives.push(`${directive} ${sources.join(' ')}`);
      }
    }
    
    return directives.join('; ');
  }

  /**
   * Add allowed domain for CSP
   */
  public addAllowedDomain(domain: string): void {
    if (!this.isValidDomain(domain)) {
      throw new Error(`Invalid domain: ${domain}`);
    }
    
    this.config.allowedDomains.push(domain);
    
    // Update CSP directives
    const imgSrc = this.cspDirectives.get('img-src') || [];
    const connectSrc = this.cspDirectives.get('connect-src') || [];
    
    if (!imgSrc.includes(domain)) {
      imgSrc.push(domain);
      this.cspDirectives.set('img-src', imgSrc);
    }
    
    if (!connectSrc.includes(domain)) {
      connectSrc.push(domain);
      this.cspDirectives.set('connect-src', connectSrc);
    }
  }

  /**
   * Sanitize user input to prevent XSS attacks
   */
  public sanitizeInput(input: string, options: SanitizationOptions = {}): string {
    if (!this.config.enableInputSanitization) {
      return input;
    }

    // Handle null/undefined inputs
    if (input == null) {
      return '';
    }

    // Convert to string if not already
    input = String(input);

    const {
      allowHTML = false,
      maxLength = 10000,
      allowedTags = [],
      allowedAttributes = []
    } = options;

    // Basic length validation
    if (input.length > maxLength) {
      throw new Error(`Input exceeds maximum length of ${maxLength} characters`);
    }

    let sanitized = input;

    if (!allowHTML) {
      // Escape HTML entities
      sanitized = this.escapeHTML(sanitized);
    } else {
      // Allow specific HTML tags and attributes
      sanitized = this.sanitizeHTML(sanitized, allowedTags, allowedAttributes);
    }

    // Remove potentially dangerous patterns
    sanitized = this.removeDangerousPatterns(sanitized);

    return sanitized;
  }

  /**
   * Escape HTML entities to prevent XSS
   */
  private escapeHTML(input: string): string {
    const entityMap: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;',
      '`': '&#x60;',
      '=': '&#x3D;'
    };

    return input.replace(/[&<>"'`=/]/g, (char) => entityMap[char]);
  }

  /**
   * Sanitize HTML while preserving allowed tags and attributes
   */
  private sanitizeHTML(input: string, allowedTags: string[], allowedAttributes: string[]): string {
    // Create a temporary DOM element to parse HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = input;

    // Recursively clean the DOM tree
    this.cleanDOMNode(tempDiv, allowedTags, allowedAttributes);

    return tempDiv.innerHTML;
  }

  /**
   * Recursively clean DOM nodes
   */
  private cleanDOMNode(node: Element, allowedTags: string[], allowedAttributes: string[]): void {
    const children = Array.from(node.children);
    
    for (const child of children) {
      const tagName = child.tagName.toLowerCase();
      
      if (!allowedTags.includes(tagName)) {
        // Remove disallowed tags but keep text content
        const textContent = child.textContent || '';
        const textNode = document.createTextNode(textContent);
        child.parentNode?.replaceChild(textNode, child);
        continue;
      }

      // Clean attributes
      const attributes = Array.from(child.attributes);
      for (const attr of attributes) {
        if (!allowedAttributes.includes(attr.name.toLowerCase())) {
          child.removeAttribute(attr.name);
        } else {
          // Sanitize attribute values
          const sanitizedValue = this.sanitizeAttributeValue(attr.value);
          child.setAttribute(attr.name, sanitizedValue);
        }
      }

      // Recursively clean child nodes
      this.cleanDOMNode(child, allowedTags, allowedAttributes);
    }
  }

  /**
   * Sanitize attribute values
   */
  private sanitizeAttributeValue(value: string): string {
    // Remove javascript: and data: URLs (except for images)
    if (/^(javascript|vbscript|data):/i.test(value)) {
      return '';
    }

    // Remove event handlers
    if (/^on\w+/i.test(value)) {
      return '';
    }

    return value;
  }

  /**
   * Remove dangerous patterns that could lead to XSS
   */
  private removeDangerousPatterns(input: string): string {
    const dangerousPatterns = [
      // Script tags
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      // Event handlers
      /on\w+\s*=\s*["'][^"']*["']/gi,
      // JavaScript URLs
      /javascript\s*:/gi,
      // VBScript URLs
      /vbscript\s*:/gi,
      // Data URLs with scripts
      /data\s*:\s*text\/html/gi,
      /data\s*:\s*application\/javascript/gi,
      // Style with expressions
      /expression\s*\(/gi,
      // Import statements
      /@import/gi,
      // Object/embed tags
      /<(object|embed|applet)\b[^>]*>/gi,
      // Form tags
      /<form\b[^>]*>/gi,
      // Meta refresh
      /<meta\s+http-equiv\s*=\s*["']?refresh["']?/gi,
      // Base tag
      /<base\b[^>]*>/gi,
      // Link with javascript
      /<link\b[^>]*href\s*=\s*["']?javascript:/gi
    ];

    let sanitized = input;
    for (const pattern of dangerousPatterns) {
      sanitized = sanitized.replace(pattern, '');
    }

    return sanitized;
  }

  /**
   * Sanitize API response data
   */
  public sanitizeAPIResponse(response: any): any {
    if (typeof response === 'string') {
      return this.sanitizeInput(response, { allowHTML: false });
    }

    if (Array.isArray(response)) {
      return response.map(item => this.sanitizeAPIResponse(item));
    }

    if (response && typeof response === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(response)) {
        const sanitizedKey = this.sanitizeInput(key, { allowHTML: false });
        sanitized[sanitizedKey] = this.sanitizeAPIResponse(value);
      }
      return sanitized;
    }

    return response;
  }

  /**
   * Encrypt API key for secure transmission
   */
  public async encryptAPIKey(apiKey: string, publicKey?: string): Promise<string> {
    if (!this.config.enableAPIKeyEncryption) {
      return apiKey;
    }

    // Check if Web Crypto API is available
    if (typeof crypto === 'undefined' || !crypto.subtle) {
      console.warn('Web Crypto API not available, returning original API key');
      return apiKey;
    }

    try {
      // Use Web Crypto API for encryption
      const encoder = new TextEncoder();
      const data = encoder.encode(apiKey);

      // Generate a random key for AES-GCM encryption
      const key = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );

      // Generate random IV
      const iv = crypto.getRandomValues(new Uint8Array(12));

      // Encrypt the API key
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        data
      );

      // Export the key for transmission
      const exportedKey = await crypto.subtle.exportKey('raw', key);

      // Combine IV, key, and encrypted data
      const combined = new Uint8Array(
        iv.length + exportedKey.byteLength + encrypted.byteLength
      );
      combined.set(iv, 0);
      combined.set(new Uint8Array(exportedKey), iv.length);
      combined.set(new Uint8Array(encrypted), iv.length + exportedKey.byteLength);

      // Return base64 encoded result
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error('API key encryption failed:', error);
      // Fallback to original key if encryption fails
      return apiKey;
    }
  }

  /**
   * Validate domain format
   */
  private isValidDomain(domain: string): boolean {
    // Allow wildcard
    if (domain === '*') return true;
    
    // Allow full URLs
    if (domain.startsWith('https://') || domain.startsWith('http://')) {
      try {
        new URL(domain);
        return true;
      } catch {
        return false;
      }
    }
    
    // Validate domain name format
    const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
    return domainRegex.test(domain);
  }

  /**
   * Validate that a URL is safe for use
   */
  public validateURL(url: string): boolean {
    try {
      const parsedURL = new URL(url);
      
      // Block dangerous protocols
      const dangerousProtocols = ['javascript:', 'vbscript:', 'file:', 'ftp:'];
      if (dangerousProtocols.includes(parsedURL.protocol)) {
        return false;
      }

      // Block data URLs with dangerous content
      if (parsedURL.protocol === 'data:') {
        const dataContent = url.toLowerCase();
        if (dataContent.includes('text/html') || 
            dataContent.includes('application/javascript') ||
            dataContent.includes('text/javascript')) {
          return false;
        }
      }
      
      // Only allow HTTPS in strict mode (except localhost)
      if (this.config.strictMode && 
          parsedURL.protocol !== 'https:' && 
          !parsedURL.hostname.includes('localhost') &&
          parsedURL.hostname !== '127.0.0.1') {
        return false;
      }

      // Check against allowed domains
      if (this.config.allowedDomains.length > 0) {
        const isAllowed = this.config.allowedDomains.some(domain => {
          if (domain === '*') return true;
          if (domain.startsWith('https://') || domain.startsWith('http://')) {
            return url.startsWith(domain);
          }
          return parsedURL.hostname === domain || parsedURL.hostname.endsWith(`.${domain}`);
        });
        
        if (!isAllowed) {
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create secure headers for API requests
   */
  public createSecureHeaders(apiKey: string, additionalHeaders: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'X-DinoOverlay-Version': '1.0.0',
      'X-CSP-Nonce': this.nonce,
      ...additionalHeaders
    };

    // Add encrypted API key
    if (this.config.enableAPIKeyEncryption) {
      // In a real implementation, this would use the encrypted key
      headers['Authorization'] = `Bearer ${apiKey}`;
      headers['X-API-Key-Encrypted'] = 'true';
    } else {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    return headers;
  }

  /**
   * Apply CSP to the current document (if possible)
   */
  public applyCSP(): void {
    if (!this.config.enableCSP) {
      return;
    }

    try {
      // Try to set CSP via meta tag (limited effectiveness)
      const existingMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      if (!existingMeta) {
        const meta = document.createElement('meta');
        meta.httpEquiv = 'Content-Security-Policy';
        meta.content = this.generateCSPHeader();
        document.head.appendChild(meta);
      }
    } catch (error) {
      console.warn('Could not apply CSP via meta tag:', error);
    }
  }

  /**
   * Get security configuration for debugging
   */
  public getSecurityConfig(): SecurityConfig {
    return { ...this.config };
  }

  /**
   * Update security configuration
   */
  public updateConfig(updates: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...updates };
    
    // Regenerate nonce if CSP settings changed
    if (updates.enableCSP !== undefined || updates.trustedScriptSources) {
      this.nonce = this.generateNonce();
      this.initializeCSP();
    }
  }
}

// Export singleton instance
export const securityManager = new SecurityManager();