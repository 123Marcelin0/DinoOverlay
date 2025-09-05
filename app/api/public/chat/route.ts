import { NextRequest, NextResponse } from 'next/server';

// Simple public endpoint for testing - no auth middleware
export async function POST(request: NextRequest) {
  try {
    console.log('Public chat endpoint called');
    
    const body = await request.json();
    console.log('Request body:', body);
    
    // Mock response for testing
    return NextResponse.json({
      success: true,
      response: `I understand you want to "${body.message}". Here are some suggestions for improving your room!`,
      suggestions: [
        'Add modern furniture',
        'Improve lighting',
        'Change color scheme',
        'Add decorative elements'
      ],
      conversationId: 'test-conversation-123'
    });
    
  } catch (error) {
    console.error('Public chat API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Public chat API error: ' + (error as Error).message
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Public chat endpoint is working',
    timestamp: new Date().toISOString()
  });
}