/**
 * Security configuration interface
 */
export interface SecurityConfig {
  enableCSP?: boolean;
  enableInputSanitization?: boolean;
  enableXSSProtection?: boolean;
  enableAPIKeyEncryption?: boolean;
  strictMode?: boolean;
  allowedDomains?: string[];
  trustedScriptSources?: string[];
}

/**
 * Content Security Policy configuration
 */
export interface CSPConfig {
  directives: Record<string, string[]>;
  nonce?: string;
  reportUri?: string;
  reportOnly?: boolean;
}

/**
 * Input sanitization options
 */
export interface SanitizationOptions {
  allowHTML?: boolean;
  maxLength?: number;
  allowedTags?: string[];
  allowedAttributes?: string[];
}

/**
 * Security validation result
 */
export interface SecurityValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * XSS attack patterns
 */
export interface XSSPattern {
  name: string;
  pattern: RegExp;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

/**
 * Security audit result
 */
export interface SecurityAuditResult {
  passed: boolean;
  vulnerabilities: SecurityVulnerability[];
  recommendations: string[];
  score: number; // 0-100
}

/**
 * Security vulnerability
 */
export interface SecurityVulnerability {
  type: 'xss' | 'injection' | 'csp' | 'encryption' | 'validation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location?: string;
  recommendation: string;
}

/**
 * Encryption configuration
 */
export interface EncryptionConfig {
  algorithm: 'AES-GCM' | 'RSA-OAEP';
  keyLength: 128 | 192 | 256;
  publicKey?: string;
  privateKey?: string;
}

/**
 * Security headers configuration
 */
export interface SecurityHeaders {
  'Content-Security-Policy'?: string;
  'X-Content-Type-Options'?: string;
  'X-Frame-Options'?: string;
  'X-XSS-Protection'?: string;
  'Strict-Transport-Security'?: string;
  'Referrer-Policy'?: string;
  'Permissions-Policy'?: string;
}

/**
 * Input validation rules
 */
export interface ValidationRules {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  allowedCharacters?: string;
  blockedPatterns?: RegExp[];
}

/**
 * Security event types
 */
export type SecurityEventType = 
  | 'xss_attempt'
  | 'injection_attempt'
  | 'csp_violation'
  | 'invalid_input'
  | 'encryption_failure'
  | 'unauthorized_access';

/**
 * Security event data
 */
export interface SecurityEvent {
  type: SecurityEventType;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  source?: string;
  userAgent?: string;
  ip?: string;
  blocked: boolean;
}