import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Demo endpoint that simulates image editing without authentication
    const { imageUrl, prompt, userId } = body;
    
    if (!imageUrl || !prompt) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'imageUrl and prompt are required' 
        },
        { status: 400 }
      );
    }
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Return mock success response
    return NextResponse.json({
      success: true,
      message: 'Image edit completed successfully!',
      editedImageUrl: imageUrl, // In real implementation, this would be the edited image
      originalPrompt: prompt,
      processingTime: 2000,
      timestamp: new Date().toISOString(),
      demo: true,
      note: 'This is a demo response. In production, the image would be actually edited using AI.'
    });
    
  } catch (error) {
    console.error('Demo edit API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}