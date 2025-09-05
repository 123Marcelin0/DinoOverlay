import { NextRequest } from 'next/server';

interface RateLimitResult {
  success: boolean;
  retryAfter?: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory rate limiting (in production, use Redis or similar)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Rate limit configuration
const RATE_LIMITS = {
  'edit-image': {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
  },
  'chat': {
    maxRequests: 30,
    windowMs: 60 * 1000, // 1 minute
  },
  default: {
    maxRequests: 50,
    windowMs: 60 * 1000, // 1 minute
  },
};

export async function rateLimit(
  request: NextRequest,
  endpoint?: string
): Promise<RateLimitResult> {
  try {
    // Get client identifier (IP address or API key)
    const clientId = getClientId(request);
    const rateLimitKey = `${clientId}:${endpoint || 'default'}`;
    
    // Get rate limit configuration
    const config = endpoint && RATE_LIMITS[endpoint as keyof typeof RATE_LIMITS] 
      ? RATE_LIMITS[endpoint as keyof typeof RATE_LIMITS]
      : RATE_LIMITS.default;

    const now = Date.now();
    const entry = rateLimitStore.get(rateLimitKey);

    // Clean up expired entries
    if (entry && now > entry.resetTime) {
      rateLimitStore.delete(rateLimitKey);
    }

    const currentEntry = rateLimitStore.get(rateLimitKey);

    if (!currentEntry) {
      // First request in window
      rateLimitStore.set(rateLimitKey, {
        count: 1,
        resetTime: now + config.windowMs,
      });
      return { success: true };
    }

    if (currentEntry.count >= config.maxRequests) {
      // Rate limit exceeded
      const retryAfter = Math.ceil((currentEntry.resetTime - now) / 1000);
      return { 
        success: false, 
        retryAfter 
      };
    }

    // Increment counter
    currentEntry.count++;
    rateLimitStore.set(rateLimitKey, currentEntry);

    return { success: true };

  } catch (error) {
    console.error('Rate limiting error:', error);
    // Allow request on error to avoid blocking legitimate traffic
    return { success: true };
  }
}

function getClientId(request: NextRequest): string {
  // Try to get API key first (more specific identifier)
  const apiKey = request.headers.get('x-api-key');
  if (apiKey) {
    return `api:${apiKey}`;
  }

  // Fall back to IP address
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 
    request.headers.get('x-real-ip') || 
    'unknown';
  
  return `ip:${ip}`;
}

// Cleanup function to remove expired entries (call periodically)
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// Set up periodic cleanup
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000); // Clean up every 5 minutes
}