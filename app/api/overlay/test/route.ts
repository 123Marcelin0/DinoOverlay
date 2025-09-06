import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Simple test endpoint that doesn't require authentication
    return NextResponse.json({
      success: true,
      message: 'DinoOverlay API is working!',
      timestamp: new Date().toISOString(),
      receivedData: {
        hasMessage: !!body.message,
        hasImageUrl: !!body.imageUrl,
        messageLength: body.message?.length || 0
      }
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Invalid JSON data' 
      },
      { status: 400 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'DinoOverlay Test API is running',
    timestamp: new Date().toISOString(),
    endpoints: {
      test: '/api/overlay/test',
      chat: '/api/overlay/chat',
      editImage: '/api/overlay/edit-image'
    }
  });
}