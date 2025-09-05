import { NextRequest } from 'next/server';
import { POST } from '@/app/api/overlay/chat/route';

// Mock the dependencies
jest.mock('@/lib/rate-limit');
jest.mock('@/lib/auth');
jest.mock('@/lib/chat-service');
jest.mock('@/lib/conversation-manager');

import { rateLimit } from '@/lib/rate-limit';
import { validateApiKey } from '@/lib/auth';
import { chatService } from '@/lib/chat-service';
import { conversationManager } from '@/lib/conversation-manager';

const mockRateLimit = rateLimit as jest.MockedFunction<typeof rateLimit>;
const mockValidateApiKey = validateApiKey as jest.MockedFunction<typeof validateApiKey>;
const mockChatService = chatService as jest.Mocked<typeof chatService>;
const mockConversationManager = conversationManager as jest.Mocked<typeof conversationManager>;

describe('/api/overlay/chat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default successful mocks
    mockRateLimit.mockResolvedValue({ success: true });
    mockValidateApiKey.mockResolvedValue({ valid: true, userId: 'test-user' });
    
    mockConversationManager.getOrCreateConversation.mockResolvedValue({
      id: 'conv-123',
      userId: 'test-user',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    mockConversationManager.addMessage.mockResolvedValue();
    
    mockChatService.processMessage.mockResolvedValue({
      success: true,
      response: 'I can help you enhance this room. What specific changes would you like to make?',
      suggestions: ['Add furniture', 'Improve lighting', 'Modern styling'],
    });
  });

  const createRequest = (body: any, headers: Record<string, string> = {}) => {
    return new NextRequest('http://localhost:3000/api/overlay/chat', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': 'test-key',
        ...headers,
      },
      body: JSON.stringify(body),
    });
  };

  describe('Successful requests', () => {
    it('should successfully process chat message', async () => {
      const requestBody = {
        message: 'How can I make this living room look more modern?',
        imageContext: 'data:image/jpeg;base64,room-image-data',
      };

      const request = createRequest(requestBody);
      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.response).toBe('I can help you enhance this room. What specific changes would you like to make?');
      expect(result.suggestions).toEqual(['Add furniture', 'Improve lighting', 'Modern styling']);
      expect(result.conversationId).toBe('conv-123');
    });

    it('should handle message without image context', async () => {
      const requestBody = {
        message: 'What are some general tips for staging a room?',
      };

      const request = createRequest(requestBody);
      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.conversationId).toBe('conv-123');
    });

    it('should handle existing conversation', async () => {
      const existingConversation = {
        id: 'existing-conv-456',
        userId: 'test-user',
        messages: [
          {
            role: 'user' as const,
            content: 'Previous message',
            timestamp: new Date(),
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockConversationManager.getOrCreateConversation.mockResolvedValue(existingConversation);

      const requestBody = {
        message: 'Follow-up question',
        conversationId: 'existing-conv-456',
      };

      const request = createRequest(requestBody);
      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.conversationId).toBe('existing-conv-456');
      expect(mockConversationManager.getOrCreateConversation).toHaveBeenCalledWith(
        'existing-conv-456',
        'test-user'
      );
    });
  });

  describe('Rate limiting', () => {
    it('should return 429 when rate limit exceeded', async () => {
      mockRateLimit.mockResolvedValue({
        success: false,
        retryAfter: 30,
      });

      const requestBody = {
        message: 'Test message',
      };

      const request = createRequest(requestBody);
      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(429);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Rate limit exceeded');
      expect(result.retryAfter).toBe(30);
    });
  });

  describe('Authentication', () => {
    it('should return 401 when API key is missing', async () => {
      const requestBody = {
        message: 'Test message',
      };

      const request = createRequest(requestBody, { 'x-api-key': '' });
      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(401);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid API key');
    });

    it('should return 401 when API key is invalid', async () => {
      mockValidateApiKey.mockResolvedValue({
        valid: false,
        error: 'API key expired',
      });

      const requestBody = {
        message: 'Test message',
      };

      const request = createRequest(requestBody);
      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(401);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid API key');
    });
  });

  describe('Request validation', () => {
    it('should return 400 when message is missing', async () => {
      const requestBody = {
        imageContext: 'data:image/jpeg;base64,test-data',
      };

      const request = createRequest(requestBody);
      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid request data');
      expect(result.details).toBeDefined();
    });

    it('should return 400 when message is empty', async () => {
      const requestBody = {
        message: '',
      };

      const request = createRequest(requestBody);
      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid request data');
    });

    it('should return 400 when message is too long', async () => {
      const requestBody = {
        message: 'a'.repeat(1001), // Exceeds 1000 character limit
      };

      const request = createRequest(requestBody);
      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid request data');
    });
  });

  describe('Conversation management errors', () => {
    it('should return 500 when conversation creation fails', async () => {
      mockConversationManager.getOrCreateConversation.mockRejectedValue(
        new Error('Database connection failed')
      );

      const requestBody = {
        message: 'Test message',
      };

      const request = createRequest(requestBody);
      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Internal server error');
    });

    it('should return 500 when adding message fails', async () => {
      mockConversationManager.addMessage.mockRejectedValue(
        new Error('Failed to save message')
      );

      const requestBody = {
        message: 'Test message',
      };

      const request = createRequest(requestBody);
      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Internal server error');
    });
  });

  describe('Chat service errors', () => {
    it('should return 500 when chat service fails', async () => {
      mockChatService.processMessage.mockResolvedValue({
        success: false,
        error: 'Chat AI service unavailable',
      });

      const requestBody = {
        message: 'Test message',
      };

      const request = createRequest(requestBody);
      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Chat AI service unavailable');
    });

    it('should return 500 when chat service throws exception', async () => {
      mockChatService.processMessage.mockRejectedValue(new Error('Network timeout'));

      const requestBody = {
        message: 'Test message',
      };

      const request = createRequest(requestBody);
      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Internal server error');
    });
  });

  describe('Message persistence', () => {
    it('should add user message to conversation', async () => {
      const requestBody = {
        message: 'How can I improve this room?',
        imageContext: 'data:image/jpeg;base64,room-data',
      };

      const request = createRequest(requestBody);
      await POST(request);

      expect(mockConversationManager.addMessage).toHaveBeenCalledWith(
        'conv-123',
        expect.objectContaining({
          role: 'user',
          content: 'How can I improve this room?',
          imageContext: 'data:image/jpeg;base64,room-data',
          timestamp: expect.any(Date),
        })
      );
    });

    it('should add AI response to conversation', async () => {
      const requestBody = {
        message: 'Test message',
      };

      const request = createRequest(requestBody);
      await POST(request);

      expect(mockConversationManager.addMessage).toHaveBeenCalledWith(
        'conv-123',
        expect.objectContaining({
          role: 'assistant',
          content: 'I can help you enhance this room. What specific changes would you like to make?',
          suggestions: ['Add furniture', 'Improve lighting', 'Modern styling'],
          timestamp: expect.any(Date),
        })
      );
    });
  });

  describe('Malformed requests', () => {
    it('should handle invalid JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/overlay/chat', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': 'test-key',
        },
        body: 'invalid-json',
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Internal server error');
    });
  });
});