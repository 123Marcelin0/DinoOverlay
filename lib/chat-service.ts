interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  imageContext?: string;
  suggestions?: string[];
  timestamp: Date;
}

interface ChatProcessRequest {
  message: string;
  imageContext?: string;
  conversationHistory: ChatMessage[];
  userId: string;
}

interface ChatProcessResult {
  success: boolean;
  response?: string;
  suggestions?: string[];
  error?: string;
}

// Chat service configuration
const CHAT_CONFIG = {
  apiEndpoint: process.env.GEMINI_API_ENDPOINT || 'https://api.gemini.google.com/v1',
  apiKey: process.env.GEMINI_API_KEY || 'mock-api-key',
  model: 'gemini-flash-2.5',
  maxRetries: 3,
  timeout: 15000, // 15 seconds
  maxHistoryLength: 10, // Keep last 10 messages for context
};

export const chatService = {
  async processMessage(request: ChatProcessRequest): Promise<ChatProcessResult> {
    try {
      // Validate request
      if (!request.message.trim()) {
        return {
          success: false,
          error: 'Message cannot be empty',
        };
      }

      // Prepare chat context
      const context = prepareChatContext(request);
      
      // Process with AI service
      const aiRequest = {
        model: CHAT_CONFIG.model,
        messages: context.messages,
        systemPrompt: context.systemPrompt,
        parameters: {
          temperature: 0.7,
          maxTokens: 500,
          topP: 0.9,
        },
        metadata: {
          userId: request.userId,
          hasImageContext: !!request.imageContext,
          timestamp: new Date().toISOString(),
        },
      };

      // Call AI service with retries
      let lastError: Error | null = null;
      for (let attempt = 1; attempt <= CHAT_CONFIG.maxRetries; attempt++) {
        try {
          const result = await callChatAI(aiRequest);
          if (result.success) {
            return result;
          }
          lastError = new Error(result.error);
        } catch (error) {
          lastError = error as Error;
          console.warn(`Chat AI attempt ${attempt} failed:`, error);
          
          if (attempt < CHAT_CONFIG.maxRetries) {
            // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          }
        }
      }

      return {
        success: false,
        error: `Chat service failed after ${CHAT_CONFIG.maxRetries} attempts: ${lastError?.message}`,
      };

    } catch (error) {
      console.error('Chat processing error:', error);
      return {
        success: false,
        error: 'Chat service error',
      };
    }
  },
};

function prepareChatContext(request: ChatProcessRequest): {
  messages: any[];
  systemPrompt: string;
} {
  // System prompt for real estate image editing context
  const systemPrompt = `You are an AI assistant specialized in real estate image editing and interior design. 
Your role is to help users enhance room images for property listings. You can:

1. Suggest specific edits to improve room appearance
2. Recommend furniture placement and styling
3. Provide interior design advice for different room types
4. Help with lighting, color schemes, and decor suggestions

Guidelines:
- Keep responses concise and actionable
- Focus on changes that enhance property appeal
- Consider real estate marketing best practices
- Suggest realistic and achievable modifications
- Provide specific, implementable advice

${request.imageContext ? 'The user has selected an image for editing context.' : 'No image is currently selected.'}`;

  // Prepare conversation history (limit to recent messages)
  const recentHistory = request.conversationHistory
    .slice(-CHAT_CONFIG.maxHistoryLength)
    .map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

  // Add current message
  const messages = [
    ...recentHistory,
    {
      role: 'user',
      content: request.message,
    },
  ];

  return { messages, systemPrompt };
}

async function callChatAI(request: any): Promise<ChatProcessResult> {
  // Mock implementation - in production, this would call the actual Gemini API
  if (CHAT_CONFIG.apiKey === 'mock-api-key') {
    return mockChatResponse(request);
  }

  try {
    const response = await fetch(`${CHAT_CONFIG.apiEndpoint}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CHAT_CONFIG.apiKey}`,
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(CHAT_CONFIG.timeout),
    });

    if (!response.ok) {
      throw new Error(`Chat API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.error) {
      return {
        success: false,
        error: result.error,
      };
    }

    return {
      success: true,
      response: result.response,
      suggestions: result.suggestions || [],
    };

  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Chat service timeout');
    }
    throw error;
  }
}

// Mock chat response for development/testing
async function mockChatResponse(request: any): Promise<ChatProcessResult> {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

  // Simulate occasional failures for testing
  if (Math.random() < 0.05) {
    return {
      success: false,
      error: 'Mock chat service temporarily unavailable',
    };
  }

  const userMessage = request.messages[request.messages.length - 1]?.content || '';
  const response = generateMockChatResponse(userMessage, request.metadata?.hasImageContext);

  return {
    success: true,
    response: response.message,
    suggestions: response.suggestions,
  };
}

function generateMockChatResponse(userMessage: string, hasImageContext: boolean): {
  message: string;
  suggestions: string[];
} {
  const message = userMessage.toLowerCase();
  
  // Generate contextual responses based on user input
  if (message.includes('furniture') || message.includes('sofa') || message.includes('chair')) {
    return {
      message: "I can help you add furniture to enhance the room's appeal. Consider adding a modern sofa in neutral tones, or a stylish accent chair to create a cozy seating area. The key is to choose pieces that complement the room's existing style and color palette.",
      suggestions: ['Add modern sofa', 'Place accent chair', 'Add coffee table', 'Include throw pillows'],
    };
  }
  
  if (message.includes('lighting') || message.includes('bright') || message.includes('dark')) {
    return {
      message: "Lighting can dramatically improve a room's appearance in photos. I recommend brightening the overall exposure, adding warm ambient lighting, or including table lamps to create a welcoming atmosphere. Natural light should be maximized when possible.",
      suggestions: ['Brighten room', 'Add table lamp', 'Enhance natural light', 'Warm lighting'],
    };
  }
  
  if (message.includes('color') || message.includes('paint') || message.includes('wall')) {
    return {
      message: "Color choices significantly impact buyer appeal. Neutral colors like soft grays, warm whites, or beiges work well for most spaces. These colors make rooms feel larger and allow potential buyers to envision their own belongings in the space.",
      suggestions: ['Neutral wall colors', 'Soft gray paint', 'Warm white walls', 'Beige accents'],
    };
  }
  
  if (message.includes('style') || message.includes('modern') || message.includes('minimalist')) {
    return {
      message: "For modern styling, focus on clean lines, minimal clutter, and contemporary furnishings. A minimalist approach with carefully selected pieces can make the space feel larger and more sophisticated, which appeals to many buyers.",
      suggestions: ['Minimalist style', 'Modern furniture', 'Clean lines', 'Declutter space'],
    };
  }

  // Default response
  return {
    message: hasImageContext 
      ? "I can see you have an image selected. What specific changes would you like to make to enhance this room for your property listing? I can help with furniture placement, lighting, colors, or overall styling."
      : "I'm here to help you enhance room images for real estate listings. Please select an image first, then let me know what improvements you'd like to make. I can assist with furniture, lighting, colors, and styling suggestions.",
    suggestions: ['Select an image', 'Add furniture', 'Improve lighting', 'Modern styling'],
  };
}