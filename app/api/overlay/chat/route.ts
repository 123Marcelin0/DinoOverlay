import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limit';
import { validateApiKey } from '@/lib/auth';
import { chatService } from '@/lib/chat-service';
import { conversationManager } from '@/lib/conversation-manager';

// Request validation schema
const chatRequestSchema = z.object({
  message: z.string().min(1, 'Message is required').max(1000, 'Message too long'),
  imageContext: z.string().optional(),
  conversationId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(request);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: rateLimitResult.retryAfter 
        },
        { status: 429 }
      );
    }

    // API key validation
    const apiKey = request.headers.get('x-api-key');
    const authResult = await validateApiKey(apiKey);
    if (!authResult.valid) {
      return NextResponse.json(
        { success: false, error: 'Invalid API key' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = chatRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request data',
          details: validationResult.error.errors 
        },
        { status: 400 }
      );
    }

    const { message, imageContext, conversationId } = validationResult.data;

    // Get or create conversation
    const conversation = await conversationManager.getOrCreateConversation(
      conversationId,
      authResult.userId
    );

    // Add user message to conversation
    await conversationManager.addMessage(conversation.id, {
      role: 'user',
      content: message,
      imageContext,
      timestamp: new Date(),
    });

    // Process chat message with AI
    const chatResult = await chatService.processMessage({
      message,
      imageContext,
      conversationHistory: conversation.messages,
      userId: authResult.userId,
    });

    if (!chatResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: chatResult.error || 'Chat processing failed' 
        },
        { status: 500 }
      );
    }

    // Add AI response to conversation
    await conversationManager.addMessage(conversation.id, {
      role: 'assistant',
      content: chatResult.response,
      suggestions: chatResult.suggestions,
      timestamp: new Date(),
    });

    return NextResponse.json({
      success: true,
      response: chatResult.response,
      suggestions: chatResult.suggestions,
      conversationId: conversation.id,
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}