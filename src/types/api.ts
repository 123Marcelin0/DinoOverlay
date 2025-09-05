// API Request and Response Interfaces

export interface EditImageRequest {
  imageData: string; // base64 encoded image
  prompt: string;
  imageUrl?: string;
  context?: {
    propertyId?: string;
    roomType?: string;
    userId?: string;
  };
}

export interface EditImageResponse {
  success: boolean;
  editedImageUrl?: string;
  editedImageData?: string; // base64 encoded result
  error?: string;
  processingTime?: number;
  requestId?: string;
}

export interface ChatRequest {
  message: string;
  imageContext?: string; // base64 encoded image for context
  conversationId?: string;
  metadata?: {
    selectedImageUrl?: string;
    propertyId?: string;
    roomType?: string;
  };
}

export interface ChatResponse {
  success: boolean;
  response?: string;
  suggestions?: string[];
  conversationId?: string;
  error?: string;
  requestId?: string;
}

export interface APIError extends Error {
  code: string;
  status?: number;
  details?: any;
  retryable?: boolean;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableStatuses: number[];
}

export interface APIClientConfig {
  baseUrl: string;
  apiKey: string;
  timeout?: number;
  retryConfig?: Partial<RetryConfig>;
  debug?: boolean;
}

export interface RequestOptions {
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
}

// Internal request/response types
export interface APIRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  data?: any;
  options?: RequestOptions;
}

export interface APIResponse<T = any> {
  data: T;
  status: number;
  headers: Record<string, string>;
  requestId?: string;
}