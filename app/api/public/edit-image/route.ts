import { NextRequest, NextResponse } from 'next/server';

// Simple public endpoint for testing - no auth middleware
export async function POST(request: NextRequest) {
  try {
    console.log('Public edit-image endpoint called');
    
    const body = await request.json();
    console.log('Request body:', body);
    
    // Mock response for testing
    return NextResponse.json({
      success: true,
      message: 'Public API working!',
      editedImageUrl: 'https://example.com/edited-image.jpg',
      editedImageData: 'data:image/jpeg;base64,mock-edited-image-data',
      processingTime: 1500,
      jobId: 'test-job-123'
    });
    
  } catch (error) {
    console.error('Public API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Public API error: ' + (error as Error).message
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Public edit-image endpoint is working',
    timestamp: new Date().toISOString()
  });
}