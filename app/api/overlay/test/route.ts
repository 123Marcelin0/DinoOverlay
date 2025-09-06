import { NextRequest, NextResponse } from 'next/server';
import { handleCors, withCors } from '@/lib/cors';

// Handle preflight OPTIONS request
export async function OPTIONS(request: NextRequest) {
  return handleCors(request);
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  
  try {
    const body = await request.json();
    
    // Simple test endpoint that doesn't require authentication
    return withCors(NextResponse.json({
      success: true,
      message: 'DinoOverlay API is working!',
      timestamp: new Date().toISOString(),
      receivedData: {
        hasMessage: !!body.message,
        hasImageUrl: !!body.imageUrl,
        messageLength: body.message?.length || 0
      }
    }), origin);
  } catch (error) {
    return withCors(NextResponse.json(
      { 
        success: false, 
        error: 'Invalid JSON data' 
      },
      { status: 400 }
    ), origin);
  }
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  
  return withCors(NextResponse.json({
    success: true,
    message: 'DinoOverlay Test API is running',
    timestamp: new Date().toISOString(),
    endpoints: {
      test: '/api/overlay/test',
      chat: '/api/overlay/chat',
      editImage: '/api/overlay/edit-image'
    }
  }), origin);
}