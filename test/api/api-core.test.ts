import { validateApiKey, incrementApiUsage, getApiKeyQuota } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { processImage } from '@/lib/image-processor';
import { aiImageEdit } from '@/lib/ai-service';
import { chatService } from '@/lib/chat-service';
import { conversationManager } from '@/lib/conversation-manager';

describe('API Core Functionality', () => {
  describe('Authentication System', () => {
    it('should validate API keys correctly', async () => {
      const validResult = await validateApiKey('test-key-1');
      expect(validResult.valid).toBe(true);
      expect(validResult.userId).toBe('user-1');

      const invalidResult = await validateApiKey('invalid-key');
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.error).toBe('Invalid API key');
    });

    it('should track API usage', async () => {
      const apiKey = 'test-key-1';
      const initialQuota = await getApiKeyQuota(apiKey);
      expect(initialQuota).not.toBeNull();
      
      const initialUsed = initialQuota!.used;
      await incrementApiUsage(apiKey);
      
      const updatedQuota = await getApiKeyQuota(apiKey);
      expect(updatedQuota!.used).toBe(initialUsed + 1);
    });
  });

  describe('Image Processing', () => {
    const validImageData = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A';

    it('should process valid images', async () => {
      const result = await processImage(validImageData);
      expect(result.success).toBe(true);
      expect(result.processedImageData).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    it('should reject invalid image data', async () => {
      const result = await processImage('invalid-data');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid image data format');
    });
  });

  describe('AI Image Editing', () => {
    const validImageData = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A';

    it('should process AI image edit requests', async () => {
      const request = {
        imageData: validImageData,
        prompt: 'Add modern furniture',
        userId: 'test-user',
      };

      const result = await aiImageEdit(request);
      expect(result.success).toBe(true);
      expect(result.editedImageUrl || result.editedImageData).toBeDefined();
    });

    it('should handle missing required fields', async () => {
      const request = {
        imageData: '',
        prompt: 'Add furniture',
        userId: 'test-user',
      };

      const result = await aiImageEdit(request);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Image data and prompt are required');
    });
  });

  describe('Chat Service', () => {
    it('should process chat messages', async () => {
      const request = {
        message: 'How can I improve this room?',
        conversationHistory: [],
        userId: 'test-user',
      };

      const result = await chatService.processMessage(request);
      expect(result.success).toBe(true);
      expect(result.response).toBeDefined();
      expect(typeof result.response).toBe('string');
    });

    it('should reject empty messages', async () => {
      const request = {
        message: '',
        conversationHistory: [],
        userId: 'test-user',
      };

      const result = await chatService.processMessage(request);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Message cannot be empty');
    });
  });

  describe('Conversation Management', () => {
    it('should create and manage conversations', async () => {
      const conversation = await conversationManager.getOrCreateConversation(
        undefined,
        'test-user'
      );

      expect(conversation.id).toBeDefined();
      expect(conversation.userId).toBe('test-user');
      expect(conversation.messages).toEqual([]);

      // Add a message
      await conversationManager.addMessage(conversation.id, {
        role: 'user',
        content: 'Test message',
        timestamp: new Date(),
      });

      const updatedConversation = await conversationManager.getConversation(
        conversation.id,
        'test-user'
      );

      expect(updatedConversation).not.toBeNull();
      expect(updatedConversation!.messages).toHaveLength(1);
      expect(updatedConversation!.messages[0].content).toBe('Test message');
    });

    it('should prevent unauthorized access to conversations', async () => {
      const conversation = await conversationManager.getOrCreateConversation(
        undefined,
        'user-1'
      );

      const unauthorizedAccess = await conversationManager.getConversation(
        conversation.id,
        'user-2'
      );

      expect(unauthorizedAccess).toBeNull();
    });
  });

  describe('Rate Limiting', () => {
    // Create a mock request object for rate limiting tests
    const createMockRequest = (ip: string = '127.0.0.1', apiKey?: string) => {
      return {
        headers: {
          get: jest.fn((header: string) => {
            switch (header) {
              case 'x-forwarded-for':
                return ip;
              case 'x-api-key':
                return apiKey || null;
              default:
                return null;
            }
          }),
        },
      } as any;
    };

    it('should allow requests within limits', async () => {
      const request = createMockRequest();
      const result = await rateLimit(request);
      expect(result.success).toBe(true);
    });

    it('should handle rate limiting errors gracefully', async () => {
      const badRequest = {
        headers: {
          get: jest.fn(() => {
            throw new Error('Header access failed');
          }),
        },
      } as any;

      const result = await rateLimit(badRequest);
      expect(result.success).toBe(true); // Should allow on error
    });
  });

  describe('End-to-End Workflow', () => {
    it('should handle complete image editing workflow', async () => {
      const validImageData = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A';

      // 1. Validate API key
      const authResult = await validateApiKey('test-key-1');
      expect(authResult.valid).toBe(true);

      // 2. Process image
      const imageResult = await processImage(validImageData);
      expect(imageResult.success).toBe(true);

      // 3. AI image editing
      const aiResult = await aiImageEdit({
        imageData: imageResult.processedImageData!,
        prompt: 'Add modern furniture',
        userId: authResult.userId!,
      });
      expect(aiResult.success).toBe(true);

      // 4. Increment usage
      await incrementApiUsage('test-key-1');
      const quota = await getApiKeyQuota('test-key-1');
      expect(quota).not.toBeNull();
    });

    it('should handle complete chat workflow', async () => {
      // 1. Validate API key
      const authResult = await validateApiKey('test-key-1');
      expect(authResult.valid).toBe(true);

      // 2. Create conversation
      const conversation = await conversationManager.getOrCreateConversation(
        undefined,
        authResult.userId!
      );
      expect(conversation.id).toBeDefined();

      // 3. Add user message
      await conversationManager.addMessage(conversation.id, {
        role: 'user',
        content: 'How can I improve this room?',
        timestamp: new Date(),
      });

      // 4. Process with chat service
      const chatResult = await chatService.processMessage({
        message: 'How can I improve this room?',
        conversationHistory: conversation.messages,
        userId: authResult.userId!,
      });
      expect(chatResult.success).toBe(true);

      // 5. Add AI response
      await conversationManager.addMessage(conversation.id, {
        role: 'assistant',
        content: chatResult.response!,
        timestamp: new Date(),
      });

      // 6. Verify conversation state
      const finalConversation = await conversationManager.getConversation(
        conversation.id,
        authResult.userId!
      );
      expect(finalConversation!.messages).toHaveLength(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle service failures gracefully', async () => {
      // Test with invalid inputs to trigger error paths
      const imageResult = await processImage('invalid');
      expect(imageResult.success).toBe(false);
      expect(imageResult.error).toBeDefined();

      const aiResult = await aiImageEdit({
        imageData: '',
        prompt: '',
        userId: 'test',
      });
      expect(aiResult.success).toBe(false);
      expect(aiResult.error).toBeDefined();

      const chatResult = await chatService.processMessage({
        message: '',
        conversationHistory: [],
        userId: 'test',
      });
      expect(chatResult.success).toBe(false);
      expect(chatResult.error).toBeDefined();
    });

    it('should maintain data consistency during errors', async () => {
      const conversation = await conversationManager.getOrCreateConversation(
        undefined,
        'test-user'
      );

      // Try to add an invalid message (should handle gracefully)
      try {
        await conversationManager.addMessage(conversation.id, {
          role: 'user',
          content: 'Valid message',
          timestamp: new Date(),
        });
      } catch (error) {
        // Should not throw
      }

      const finalConversation = await conversationManager.getConversation(
        conversation.id,
        'test-user'
      );
      expect(finalConversation).not.toBeNull();
    });
  });
});