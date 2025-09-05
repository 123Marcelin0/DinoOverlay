import type { APIError } from '../types/api';

// Error category types
export type ErrorCategory = 'network' | 'image' | 'dom' | 'config' | 'api' | 'rate_limit';

export interface ErrorDetails {
  category: ErrorCategory;
  code: string;
  message: string;
  userMessage: string;
  retryable: boolean;
  retryAfter?: number;
  context?: Record<string, any>;
}

export interface RetryAttempt {
  timestamp: number;
  error: ErrorDetails;
  attempt: number;
}

export interface ErrorManagerConfig {
  maxRetryAttempts: number;
  retryBaseDelay: number;
  retryMaxDelay: number;
  rateLimitWindow: number;
  maxErrorsPerWindow: number;
  enableUserNotifications: boolean;
  enableErrorReporting: boolean;
  debug: boolean;
}

export interface NetworkStatus {
  isOnline: boolean;
  lastChecked: number;
  connectionType?: string;
}

export interface RateLimitInfo {
  remaining: number;
  resetTime: number;
  limit: number;
}

/**
 * Centralized error handling and user feedback system
 */
export class ErrorManager {
  private config: ErrorManagerConfig;
  private errorQueue: ErrorDetails[] = [];
  private retryAttempts: Map<string, RetryAttempt[]> = new Map();
  private networkStatus: NetworkStatus = {
    isOnline: navigator.onLine,
    lastChecked: Date.now()
  };
  private rateLimitInfo: RateLimitInfo | null = null;
  private errorCounts: Map<string, number> = new Map();
  private windowStartTime: number = Date.now();

  constructor(config: Partial<ErrorManagerConfig> = {}) {
    this.config = {
      maxRetryAttempts: 3,
      retryBaseDelay: 1000,
      retryMaxDelay: 30000,
      rateLimitWindow: 60000, // 1 minute
      maxErrorsPerWindow: 10,
      enableUserNotifications: true,
      enableErrorReporting: true,
      debug: false,
      ...config
    };

    this.setupNetworkMonitoring();
    this.setupErrorReporting();
  }

  /**
   * Handle network-related errors
   */
  public handleNetworkError(error: Error | APIError): ErrorDetails {
    const errorDetails: ErrorDetails = {
      category: 'network',
      code: this.getNetworkErrorCode(error),
      message: error.message,
      userMessage: this.getNetworkErrorMessage(error),
      retryable: true,
      context: {
        isOnline: this.networkStatus.isOnline,
        timestamp: Date.now(),
        originalError: error
      }
    };

    this.processError(errorDetails);
    return errorDetails;
  }

  /**
   * Handle image processing errors
   */
  public handleImageError(error: Error, imageContext?: any): ErrorDetails {
    const errorDetails: ErrorDetails = {
      category: 'image',
      code: this.getImageErrorCode(error),
      message: error.message,
      userMessage: this.getImageErrorMessage(error),
      retryable: this.isImageErrorRetryable(error),
      context: {
        imageContext,
        timestamp: Date.now(),
        originalError: error
      }
    };

    this.processError(errorDetails);
    return errorDetails;
  }

  /**
   * Handle DOM-related errors
   */
  public handleDOMError(error: Error, domContext?: any): ErrorDetails {
    const errorDetails: ErrorDetails = {
      category: 'dom',
      code: this.getDOMErrorCode(error),
      message: error.message,
      userMessage: this.getDOMErrorMessage(error),
      retryable: false, // DOM errors are typically not retryable
      context: {
        domContext,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
        originalError: error
      }
    };

    this.processError(errorDetails);
    return errorDetails;
  }

  /**
   * Handle configuration errors
   */
  public handleConfigError(error: Error, configContext?: any): ErrorDetails {
    const errorDetails: ErrorDetails = {
      category: 'config',
      code: this.getConfigErrorCode(error),
      message: error.message,
      userMessage: this.getConfigErrorMessage(error),
      retryable: false, // Config errors require manual intervention
      context: {
        configContext,
        timestamp: Date.now(),
        originalError: error
      }
    };

    this.processError(errorDetails);
    return errorDetails;
  }

  /**
   * Handle API errors with rate limiting support
   */
  public handleAPIError(error: APIError): ErrorDetails {
    const isRateLimit = this.isRateLimitError(error);
    
    const errorDetails: ErrorDetails = {
      category: isRateLimit ? 'rate_limit' : 'api',
      code: this.getAPIErrorCode(error),
      message: error.message,
      userMessage: this.getAPIErrorMessage(error),
      retryable: error.retryable || isRateLimit,
      retryAfter: isRateLimit ? this.extractRetryAfter(error) : undefined,
      context: {
        status: error.status,
        apiCode: error.code,
        timestamp: Date.now(),
        originalError: error
      }
    };

    if (isRateLimit) {
      this.updateRateLimitInfo(error);
    }

    this.processError(errorDetails);
    return errorDetails;
  }

  /**
   * Check if an error should be retried
   */
  public shouldRetry(errorDetails: ErrorDetails): boolean {
    if (!errorDetails.retryable) {
      return false;
    }

    const errorKey = `${errorDetails.category}:${errorDetails.code}`;
    const attempts = this.retryAttempts.get(errorKey) || [];
    
    if (attempts.length >= this.config.maxRetryAttempts) {
      return false;
    }

    // Check rate limiting
    if (errorDetails.category === 'rate_limit' && this.rateLimitInfo) {
      return Date.now() >= this.rateLimitInfo.resetTime;
    }

    // Check network status for network errors
    if (errorDetails.category === 'network' && !this.networkStatus.isOnline) {
      return false;
    }

    return true;
  }

  /**
   * Calculate retry delay
   */
  public calculateRetryDelay(errorDetails: ErrorDetails): number {
    if (errorDetails.retryAfter) {
      return errorDetails.retryAfter * 1000; // Convert to milliseconds
    }

    const errorKey = `${errorDetails.category}:${errorDetails.code}`;
    const attempts = this.retryAttempts.get(errorKey) || [];
    const attemptNumber = attempts.length;

    // Exponential backoff with jitter
    const baseDelay = this.config.retryBaseDelay;
    const exponentialDelay = baseDelay * Math.pow(2, attemptNumber);
    const jitter = Math.random() * 0.1 * exponentialDelay;
    const delay = Math.min(exponentialDelay + jitter, this.config.retryMaxDelay);

    return Math.floor(delay);
  }

  /**
   * Record a retry attempt
   */
  public recordRetryAttempt(errorDetails: ErrorDetails): void {
    const errorKey = `${errorDetails.category}:${errorDetails.code}`;
    const attempts = this.retryAttempts.get(errorKey) || [];
    
    attempts.push({
      timestamp: Date.now(),
      error: errorDetails,
      attempt: attempts.length + 1
    });

    this.retryAttempts.set(errorKey, attempts);
  }

  /**
   * Clear retry attempts for a specific error
   */
  public clearRetryAttempts(errorDetails: ErrorDetails): void {
    const errorKey = `${errorDetails.category}:${errorDetails.code}`;
    this.retryAttempts.delete(errorKey);
  }

  /**
   * Get current network status
   */
  public getNetworkStatus(): NetworkStatus {
    return { ...this.networkStatus };
  }

  /**
   * Get current rate limit information
   */
  public getRateLimitInfo(): RateLimitInfo | null {
    return this.rateLimitInfo ? { ...this.rateLimitInfo } : null;
  }

  /**
   * Show user-friendly error notification
   */
  public showUserError(errorDetails: ErrorDetails): void {
    if (!this.config.enableUserNotifications) {
      return;
    }

    // Create error notification element
    const notification = this.createErrorNotification(errorDetails);
    this.displayNotification(notification);
  }

  /**
   * Process and categorize error
   */
  private processError(errorDetails: ErrorDetails): void {
    // Add to error queue
    this.errorQueue.push(errorDetails);
    
    // Limit queue size
    if (this.errorQueue.length > 100) {
      this.errorQueue.shift();
    }

    // Update error counts for rate limiting
    this.updateErrorCounts(errorDetails);

    // Log error if debug enabled
    if (this.config.debug) {
      console.error('[ErrorManager]', errorDetails);
    }

    // Report error if enabled
    if (this.config.enableErrorReporting) {
      this.reportError(errorDetails);
    }

    // Show user notification
    this.showUserError(errorDetails);
  }

  /**
   * Update error counts for internal rate limiting
   */
  private updateErrorCounts(errorDetails: ErrorDetails): void {
    const now = Date.now();
    
    // Reset window if needed
    if (now - this.windowStartTime > this.config.rateLimitWindow) {
      this.errorCounts.clear();
      this.windowStartTime = now;
    }

    const errorKey = `${errorDetails.category}:${errorDetails.code}`;
    const currentCount = this.errorCounts.get(errorKey) || 0;
    this.errorCounts.set(errorKey, currentCount + 1);
  }

  /**
   * Setup network status monitoring
   */
  private setupNetworkMonitoring(): void {
    window.addEventListener('online', () => {
      this.networkStatus.isOnline = true;
      this.networkStatus.lastChecked = Date.now();
    });

    window.addEventListener('offline', () => {
      this.networkStatus.isOnline = false;
      this.networkStatus.lastChecked = Date.now();
    });

    // Detect connection type if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      this.networkStatus.connectionType = connection.effectiveType;
      
      connection.addEventListener('change', () => {
        this.networkStatus.connectionType = connection.effectiveType;
        this.networkStatus.lastChecked = Date.now();
      });
    }
  }

  /**
   * Setup error reporting
   */
  private setupErrorReporting(): void {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.handleDOMError(event.error, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.handleDOMError(new Error(event.reason), {
        type: 'unhandledrejection',
        reason: event.reason
      });
    });
  }

  // Error code determination methods
  private getNetworkErrorCode(error: Error | APIError): string {
    const message = error.message.toLowerCase();
    
    if (message.includes('timeout')) return 'NETWORK_TIMEOUT';
    if (message.includes('fetch')) return 'FETCH_ERROR';
    if (message.includes('cors')) return 'CORS_ERROR';
    if (message.includes('econnreset')) return 'CONNECTION_RESET';
    if (message.includes('enotfound')) return 'DNS_ERROR';
    if ('status' in error && error.status) return `HTTP_${error.status}`;
    
    return 'NETWORK_UNKNOWN';
  }

  private getImageErrorCode(error: Error): string {
    const message = error.message.toLowerCase();
    
    if (message.includes('format')) return 'INVALID_FORMAT';
    if (message.includes('size')) return 'SIZE_ERROR';
    if (message.includes('corrupt')) return 'CORRUPTED_IMAGE';
    if (message.includes('base64')) return 'INVALID_BASE64';
    if (message.includes('processing')) return 'PROCESSING_FAILED';
    
    return 'IMAGE_UNKNOWN';
  }

  private getDOMErrorCode(error: Error): string {
    const message = error.message.toLowerCase();
    
    if (message.includes('permission')) return 'PERMISSION_DENIED';
    if (message.includes('not found')) return 'ELEMENT_NOT_FOUND';
    if (message.includes('shadow')) return 'SHADOW_DOM_ERROR';
    if (message.includes('mutation')) return 'MUTATION_ERROR';
    
    return 'DOM_UNKNOWN';
  }

  private getConfigErrorCode(error: Error): string {
    const message = error.message.toLowerCase();
    
    if (message.includes('api key')) return 'INVALID_API_KEY';
    if (message.includes('endpoint')) return 'INVALID_ENDPOINT';
    if (message.includes('required')) return 'MISSING_CONFIG';
    if (message.includes('format')) return 'INVALID_FORMAT';
    
    return 'CONFIG_UNKNOWN';
  }

  private getAPIErrorCode(error: APIError): string {
    if (error.code) return error.code;
    if (error.status) return `HTTP_${error.status}`;
    return 'API_UNKNOWN';
  }

  // User message generation methods
  private getNetworkErrorMessage(error: Error | APIError): string {
    const code = this.getNetworkErrorCode(error);
    
    switch (code) {
      case 'NETWORK_TIMEOUT':
        return 'Request timed out. Please check your connection and try again.';
      case 'CORS_ERROR':
        return 'Unable to connect to the service. Please contact support.';
      case 'DNS_ERROR':
        return 'Unable to reach the server. Please check your internet connection.';
      case 'HTTP_429':
        return 'Too many requests. Please wait a moment before trying again.';
      case 'HTTP_500':
      case 'HTTP_502':
      case 'HTTP_503':
      case 'HTTP_504':
        return 'Service temporarily unavailable. Please try again in a few moments.';
      default:
        return 'Unable to connect to AI service. Please check your connection.';
    }
  }

  private getImageErrorMessage(error: Error): string {
    const code = this.getImageErrorCode(error);
    
    switch (code) {
      case 'INVALID_FORMAT':
        return 'Image format not supported. Please use JPG, PNG, or WebP images.';
      case 'SIZE_ERROR':
        return 'Image is too large. Please use an image smaller than 10MB.';
      case 'CORRUPTED_IMAGE':
        return 'Image appears to be corrupted. Please try a different image.';
      case 'INVALID_BASE64':
        return 'Image data is invalid. Please try uploading the image again.';
      case 'PROCESSING_FAILED':
        return 'Image processing failed. Please try a different image or prompt.';
      default:
        return 'Image processing failed. Please try a different image.';
    }
  }

  private getDOMErrorMessage(error: Error): string {
    const code = this.getDOMErrorCode(error);
    
    switch (code) {
      case 'PERMISSION_DENIED':
        return 'Browser permissions required. Please allow the requested permissions.';
      case 'ELEMENT_NOT_FOUND':
        return 'Page element not found. Please refresh the page and try again.';
      case 'SHADOW_DOM_ERROR':
        return 'Browser compatibility issue. Please try a different browser.';
      default:
        return 'Browser compatibility issue. Please update or try a different browser.';
    }
  }

  private getConfigErrorMessage(error: Error): string {
    const code = this.getConfigErrorCode(error);
    
    switch (code) {
      case 'INVALID_API_KEY':
        return 'Invalid API configuration. Please contact the website administrator.';
      case 'INVALID_ENDPOINT':
        return 'Service configuration error. Please contact support.';
      case 'MISSING_CONFIG':
        return 'Missing configuration. Please contact the website administrator.';
      default:
        return 'Configuration error. Please contact the website administrator.';
    }
  }

  private getAPIErrorMessage(error: APIError): string {
    if (error.status === 429) {
      return 'Too many requests. Please wait a moment before trying again.';
    }
    if (error.status === 401) {
      return 'Authentication failed. Please contact the website administrator.';
    }
    if (error.status === 403) {
      return 'Access denied. Please contact the website administrator.';
    }
    if (error.status && error.status >= 500) {
      return 'Service temporarily unavailable. Please try again in a few moments.';
    }
    
    return 'Request failed. Please try again or contact support if the problem persists.';
  }

  // Helper methods
  private isImageErrorRetryable(error: Error): boolean {
    const code = this.getImageErrorCode(error);
    return code === 'PROCESSING_FAILED';
  }

  private isRateLimitError(error: APIError): boolean {
    return error.status === 429 || error.code === 'RATE_LIMIT_EXCEEDED';
  }

  private extractRetryAfter(error: APIError): number | undefined {
    if (error.details && error.details.retryAfter) {
      return parseInt(error.details.retryAfter, 10);
    }
    return undefined;
  }

  private updateRateLimitInfo(error: APIError): void {
    if (error.details) {
      this.rateLimitInfo = {
        remaining: parseInt(error.details.remaining || '0', 10),
        resetTime: Date.now() + (parseInt(error.details.retryAfter || '60', 10) * 1000),
        limit: parseInt(error.details.limit || '100', 10)
      };
    }
  }

  private createErrorNotification(errorDetails: ErrorDetails): HTMLElement {
    const notification = document.createElement('div');
    notification.className = 'dino-error-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(239, 68, 68, 0.95);
      backdrop-filter: blur(10px);
      color: white;
      padding: 16px 20px;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      max-width: 400px;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.4;
      animation: slideIn 0.3s ease-out;
    `;

    const message = document.createElement('div');
    message.textContent = errorDetails.userMessage;
    notification.appendChild(message);

    if (errorDetails.retryable) {
      const retryInfo = document.createElement('div');
      retryInfo.style.cssText = `
        margin-top: 8px;
        font-size: 12px;
        opacity: 0.8;
      `;
      retryInfo.textContent = 'Retrying automatically...';
      notification.appendChild(retryInfo);
    }

    // Add close button
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '×';
    closeButton.style.cssText = `
      position: absolute;
      top: 8px;
      right: 12px;
      background: none;
      border: none;
      color: white;
      font-size: 18px;
      cursor: pointer;
      opacity: 0.7;
    `;
    closeButton.onclick = () => notification.remove();
    notification.appendChild(closeButton);

    return notification;
  }

  private displayNotification(notification: HTMLElement): void {
    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => notification.remove(), 300);
      }
    }, 5000);
  }

  private reportError(errorDetails: ErrorDetails): void {
    // This would typically send error data to an analytics service
    // For now, we'll just log it
    if (this.config.debug) {
      console.log('[ErrorManager] Reporting error:', {
        category: errorDetails.category,
        code: errorDetails.code,
        message: errorDetails.message,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href
      });
    }
  }
}