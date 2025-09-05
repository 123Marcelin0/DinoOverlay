import type {
  APIClientConfig,
  APIError,
  APIRequest,
  APIResponse,
  EditImageRequest,
  EditImageResponse,
  ChatRequest,
  ChatResponse,
  RetryConfig,
  RequestOptions
} from '../types/api';
import { ErrorManager } from './ErrorManager';
import { SecurityManager } from './SecurityManager';
import { SecurityValidator } from './SecurityValidator';

export class APIClient {
  private config: Required<APIClientConfig>;
  private errorManager: ErrorManager;
  private securityManager: SecurityManager;
  private securityValidator: SecurityValidator;
  private defaultRetryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    retryableStatuses: [408, 429, 500, 502, 503, 504]
  };

  constructor(config: APIClientConfig, errorManager?: ErrorManager, securityManager?: SecurityManager) {
    this.config = {
      timeout: 30000,
      retryConfig: { ...this.defaultRetryConfig, ...config.retryConfig },
      debug: false,
      ...config
    };

    this.errorManager = errorManager || new ErrorManager({
      debug: this.config.debug,
      enableUserNotifications: true,
      enableErrorReporting: true
    });

    this.securityManager = securityManager || new SecurityManager({
      enableCSP: true,
      enableInputSanitization: true,
      enableXSSProtection: true,
      enableAPIKeyEncryption: true,
      allowedDomains: [config.baseUrl]
    });

    this.securityValidator = new SecurityValidator();

    if (!this.config.baseUrl) {
      throw new Error('APIClient: baseUrl is required');
    }
    if (!this.config.apiKey) {
      throw new Error('APIClient: apiKey is required');
    }

    // Validate base URL
    if (!this.securityManager.validateURL(this.config.baseUrl)) {
      throw new Error('APIClient: Invalid or unsafe baseUrl');
    }
  }

  /**
   * Edit an image using AI processing
   */
  public async editImage(request: EditImageRequest): Promise<EditImageResponse> {
    // Security validation
    this.validateEditImageRequest(request);
    const sanitizedRequest = this.sanitizeEditImageRequest(request);

    try {
      const response = await this.makeRequest<EditImageResponse>({
        method: 'POST',
        endpoint: '/overlay/edit-image',
        data: sanitizedRequest,
        options: {
          timeout: 60000, // Longer timeout for image processing
          retries: 2 // Fewer retries for expensive operations
        }
      });

      // Sanitize response
      const sanitizedResponse = this.securityManager.sanitizeAPIResponse(response.data);
      return sanitizedResponse;
    } catch (error) {
      this.logError('editImage', error);
      const apiError = this.createAPIError(error, 'Failed to edit image');
      this.errorManager.handleAPIError(apiError);
      throw apiError;
    }
  }

  /**
   * Send a chat message with optional image context
   */
  public async sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
    // Security validation
    this.validateChatRequest(request);
    const sanitizedRequest = this.sanitizeChatRequest(request);

    try {
      const response = await this.makeRequest<ChatResponse>({
        method: 'POST',
        endpoint: '/overlay/chat',
        data: sanitizedRequest
      });

      // Sanitize response
      const sanitizedResponse = this.securityManager.sanitizeAPIResponse(response.data);
      return sanitizedResponse;
    } catch (error) {
      this.logError('sendChatMessage', error);
      const apiError = this.createAPIError(error, 'Failed to send chat message');
      this.errorManager.handleAPIError(apiError);
      throw apiError;
    }
  }

  /**
   * Make an HTTP request with retry logic and error handling
   */
  private async makeRequest<T>(request: APIRequest): Promise<APIResponse<T>> {
    const { method, endpoint, data, options = {} } = request;
    const url = `${this.config.baseUrl}${endpoint}`;
    const timeout = options.timeout || this.config.timeout;
    const maxRetries = options.retries !== undefined ? options.retries : this.config.retryConfig.maxRetries;

    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = this.calculateBackoffDelay(attempt);
          await this.sleep(delay);
          this.log(`Retrying request (attempt ${attempt + 1}/${maxRetries + 1}): ${method} ${url}`);
        }

        const response = await this.executeRequest<T>(method, url, data, timeout, options.headers);
        
        if (this.isSuccessStatus(response.status)) {
          return response;
        }

        // Handle non-success status codes
        const error = new Error(`HTTP ${response.status}: Request failed`);
        (error as any).status = response.status;
        (error as any).response = response;
        
        if (!this.isRetryableStatus(response.status) || attempt === maxRetries) {
          throw error;
        }
        
        lastError = error;
        continue;

      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on non-retryable errors
        if (!this.isRetryableError(error as Error) || attempt === maxRetries) {
          throw error;
        }
      }
    }

    throw lastError!;
  }

  /**
   * Execute the actual HTTP request
   */
  private async executeRequest<T>(
    method: string,
    url: string,
    data?: any,
    timeout?: number,
    customHeaders?: Record<string, string>
  ): Promise<APIResponse<T>> {
    const controller = new AbortController();
    const timeoutId = timeout ? setTimeout(() => controller.abort(), timeout) : null;

    try {
      // Use security manager to create secure headers
      const headers = this.securityManager.createSecureHeaders(this.config.apiKey, {
        'User-Agent': 'DinoOverlay/1.0',
        ...customHeaders
      });

      const requestOptions: RequestInit = {
        method,
        headers,
        signal: controller.signal
      };

      if (data && (method === 'POST' || method === 'PUT')) {
        requestOptions.body = JSON.stringify(data);
      }

      this.log(`Making request: ${method} ${url}`);
      
      const response = await fetch(url, requestOptions);
      
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      let responseData: T;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text() as unknown as T;
      }

      return {
        data: responseData,
        status: response.status,
        headers: responseHeaders,
        requestId: responseHeaders['x-request-id']
      };

    } catch (error) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (controller.signal.aborted) {
        throw new Error('Request timeout');
      }

      throw error;
    }
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoffDelay(attempt: number): number {
    const { baseDelay, maxDelay, backoffMultiplier } = this.config.retryConfig;
    const delay = baseDelay * Math.pow(backoffMultiplier, attempt - 1);
    return Math.min(delay, maxDelay);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if status code indicates success
   */
  private isSuccessStatus(status: number): boolean {
    return status >= 200 && status < 300;
  }

  /**
   * Check if status code is retryable
   */
  private isRetryableStatus(status: number): boolean {
    return this.config.retryConfig.retryableStatuses.includes(status);
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    
    // Network errors are generally retryable
    if (message.includes('fetch') || 
        message.includes('network') ||
        message.includes('timeout') ||
        message.includes('econnreset') ||
        message.includes('enotfound')) {
      return true;
    }

    // Check if it's an HTTP error with retryable status
    const status = (error as any).status;
    if (status && this.isRetryableStatus(status)) {
      return true;
    }

    return false;
  }

  /**
   * Create a standardized API error
   */
  private createAPIError(originalError: any, message: string): APIError {
    const error = new Error(message) as APIError;
    error.name = 'APIError';
    
    if (originalError.status) {
      error.status = originalError.status;
      error.code = `HTTP_${originalError.status}`;
    } else if (originalError.message.includes('timeout')) {
      error.code = 'TIMEOUT';
      error.retryable = true;
    } else if (originalError.message.includes('network')) {
      error.code = 'NETWORK_ERROR';
      error.retryable = true;
    } else {
      error.code = 'UNKNOWN_ERROR';
    }

    error.details = originalError;
    return error;
  }

  /**
   * Validate edit image request
   */
  private validateEditImageRequest(request: EditImageRequest): void {
    if (!request.prompt || request.prompt.trim().length === 0) {
      throw new Error('EditImageRequest: prompt is required');
    }

    if (!request.imageData && !request.imageUrl) {
      throw new Error('EditImageRequest: either imageData or imageUrl is required');
    }

    // Security validation for prompt
    const promptValidation = this.securityValidator.validateInput(request.prompt, {
      maxLength: 1000,
      blockedPatterns: [
        /<script/gi,
        /javascript:/gi,
        /on\w+\s*=/gi
      ]
    });

    if (!promptValidation.isValid) {
      throw new Error(`EditImageRequest: Invalid prompt - ${promptValidation.errors.join(', ')}`);
    }

    // Validate base64 data if provided
    if (request.imageData) {
      const base64Validation = this.securityValidator.validateBase64(request.imageData);
      if (!base64Validation.isValid) {
        throw new Error(`EditImageRequest: Invalid imageData - ${base64Validation.errors.join(', ')}`);
      }
    }

    // Validate URL if provided
    if (request.imageUrl) {
      const urlValidation = this.securityValidator.validateURL(request.imageUrl);
      if (!urlValidation.isValid) {
        throw new Error(`EditImageRequest: Invalid imageUrl - ${urlValidation.errors.join(', ')}`);
      }
    }
  }

  /**
   * Validate chat request
   */
  private validateChatRequest(request: ChatRequest): void {
    if (!request.message || request.message.trim().length === 0) {
      throw new Error('ChatRequest: message is required');
    }

    // Security validation for message
    const messageValidation = this.securityValidator.validateInput(request.message, {
      maxLength: 2000,
      blockedPatterns: [
        /<script/gi,
        /javascript:/gi,
        /on\w+\s*=/gi
      ]
    });

    if (!messageValidation.isValid) {
      throw new Error(`ChatRequest: Invalid message - ${messageValidation.errors.join(', ')}`);
    }

    // Validate image context if provided
    if (request.imageContext) {
      const base64Validation = this.securityValidator.validateBase64(request.imageContext);
      if (!base64Validation.isValid) {
        throw new Error(`ChatRequest: Invalid imageContext - ${base64Validation.errors.join(', ')}`);
      }
    }

    // Validate conversation ID if provided
    if (request.conversationId) {
      const idValidation = this.securityValidator.validateInput(request.conversationId, {
        maxLength: 100,
        pattern: /^[a-zA-Z0-9_-]+$/
      });

      if (!idValidation.isValid) {
        throw new Error(`ChatRequest: Invalid conversationId - ${idValidation.errors.join(', ')}`);
      }
    }
  }

  /**
   * Sanitize edit image request
   */
  private sanitizeEditImageRequest(request: EditImageRequest): EditImageRequest {
    const sanitized: EditImageRequest = {
      prompt: this.securityManager.sanitizeInput(request.prompt, { maxLength: 1000 }),
      imageData: request.imageData, // Already validated
      imageUrl: request.imageUrl // Already validated
    };

    if (request.context) {
      sanitized.context = {
        propertyId: request.context.propertyId ? 
          this.securityManager.sanitizeInput(request.context.propertyId, { maxLength: 100 }) : 
          undefined,
        roomType: request.context.roomType ? 
          this.securityManager.sanitizeInput(request.context.roomType, { maxLength: 50 }) : 
          undefined,
        userId: request.context.userId ? 
          this.securityManager.sanitizeInput(request.context.userId, { maxLength: 100 }) : 
          undefined
      };
    }

    return sanitized;
  }

  /**
   * Sanitize chat request
   */
  private sanitizeChatRequest(request: ChatRequest): ChatRequest {
    const sanitized: ChatRequest = {
      message: this.securityManager.sanitizeInput(request.message, { maxLength: 2000 }),
      imageContext: request.imageContext, // Already validated
      conversationId: request.conversationId ? 
        this.securityManager.sanitizeInput(request.conversationId, { maxLength: 100 }) : 
        undefined
    };

    if (request.metadata) {
      sanitized.metadata = {
        selectedImageUrl: request.metadata.selectedImageUrl ? 
          this.securityManager.sanitizeInput(request.metadata.selectedImageUrl, { maxLength: 500 }) : 
          undefined,
        propertyId: request.metadata.propertyId ? 
          this.securityManager.sanitizeInput(request.metadata.propertyId, { maxLength: 100 }) : 
          undefined,
        roomType: request.metadata.roomType ? 
          this.securityManager.sanitizeInput(request.metadata.roomType, { maxLength: 50 }) : 
          undefined
      };
    }

    return sanitized;
  }

  /**
   * Check if string is valid base64
   */
  private isValidBase64(str: string): boolean {
    try {
      // Remove data URL prefix if present
      const base64Data = str.replace(/^data:image\/[a-z]+;base64,/, '');
      
      // Check if it's a valid base64 string
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64Data)) {
        return false;
      }
      
      // Try to decode and re-encode
      return btoa(atob(base64Data)) === base64Data;
    } catch {
      return false;
    }
  }

  /**
   * Log debug messages
   */
  private log(message: string): void {
    if (this.config.debug) {
      console.log(`[APIClient] ${message}`);
    }
  }

  /**
   * Log errors
   */
  private logError(operation: string, error: any): void {
    if (this.config.debug) {
      console.error(`[APIClient] ${operation} error:`, error);
    }
  }
}