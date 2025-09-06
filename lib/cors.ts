import { NextResponse } from 'next/server';

// CORS configuration
const CORS_ORIGINS = [
  'https://dino-overlay.vercel.app',
  'https://dino-overlay-system.vercel.app',
  'https://dino-overlay-hzdzk7o4h-marces-projects-3950c474.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
];

export function corsHeaders(origin?: string | null) {
  const allowedOrigin = origin && CORS_ORIGINS.includes(origin) ? origin : CORS_ORIGINS[0];
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
    'Access-Control-Max-Age': '86400',
  };
}

export function handleCors(request: Request) {
  const origin = request.headers.get('origin');
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders(origin),
  });
}

export function withCors(response: NextResponse, origin?: string | null) {
  const headers = corsHeaders(origin);
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}