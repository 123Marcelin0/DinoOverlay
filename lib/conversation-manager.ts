interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  imageContext?: string;
  suggestions?: string[];
  timestamp: Date;
}

interface Conversation {
  id: string;
  userId: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

// In-memory conversation store (in production, use database)
const conversationStore = new Map<string, Conversation>();

export const conversationManager = {
  async getOrCreateConversation(
    conversationId: string | undefined,
    userId: string
  ): Promise<Conversation> {
    if (conversationId && conversationStore.has(conversationId)) {
      const conversation = conversationStore.get(conversationId)!;
      
      // Verify ownership
      if (conversation.userId !== userId) {
        throw new Error('Unauthorized access to conversation');
      }
      
      return conversation;
    }

    // Create new conversation
    const newConversation: Conversation = {
      id: generateConversationId(),
      userId,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    conversationStore.set(newConversation.id, newConversation);
    return newConversation;
  },

  async addMessage(conversationId: string, message: ChatMessage): Promise<void> {
    const conversation = conversationStore.get(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    conversation.messages.push(message);
    conversation.updatedAt = new Date();
    
    // Limit conversation history to prevent memory issues
    const maxMessages = 50;
    if (conversation.messages.length > maxMessages) {
      conversation.messages = conversation.messages.slice(-maxMessages);
    }

    conversationStore.set(conversationId, conversation);
  },

  async getConversation(conversationId: string, userId: string): Promise<Conversation | null> {
    const conversation = conversationStore.get(conversationId);
    
    if (!conversation || conversation.userId !== userId) {
      return null;
    }

    return conversation;
  },

  async deleteConversation(conversationId: string, userId: string): Promise<boolean> {
    const conversation = conversationStore.get(conversationId);
    
    if (!conversation || conversation.userId !== userId) {
      return false;
    }

    conversationStore.delete(conversationId);
    return true;
  },

  async getUserConversations(userId: string): Promise<Conversation[]> {
    const userConversations: Conversation[] = [];
    
    for (const conversation of conversationStore.values()) {
      if (conversation.userId === userId) {
        userConversations.push(conversation);
      }
    }

    // Sort by most recent first
    return userConversations.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  },

  async cleanupOldConversations(): Promise<number> {
    const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    let deletedCount = 0;

    for (const [id, conversation] of conversationStore.entries()) {
      if (conversation.updatedAt < cutoffDate) {
        conversationStore.delete(id);
        deletedCount++;
      }
    }

    return deletedCount;
  },
};

function generateConversationId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `conv_${timestamp}_${randomPart}`;
}

// Periodic cleanup of old conversations
if (typeof setInterval !== 'undefined') {
  setInterval(async () => {
    try {
      const deletedCount = await conversationManager.cleanupOldConversations();
      if (deletedCount > 0) {
        console.log(`Cleaned up ${deletedCount} old conversations`);
      }
    } catch (error) {
      console.error('Error during conversation cleanup:', error);
    }
  }, 24 * 60 * 60 * 1000); // Run daily
}

// Conversation statistics and analytics
export const conversationAnalytics = {
  async getStats(): Promise<{
    totalConversations: number;
    activeConversations: number;
    totalMessages: number;
    averageMessagesPerConversation: number;
  }> {
    const conversations = Array.from(conversationStore.values());
    const activeThreshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    
    const activeConversations = conversations.filter(
      conv => conv.updatedAt > activeThreshold
    );
    
    const totalMessages = conversations.reduce(
      (sum, conv) => sum + conv.messages.length, 
      0
    );
    
    return {
      totalConversations: conversations.length,
      activeConversations: activeConversations.length,
      totalMessages,
      averageMessagesPerConversation: conversations.length > 0 
        ? Math.round(totalMessages / conversations.length * 100) / 100 
        : 0,
    };
  },

  async getUserStats(userId: string): Promise<{
    conversationCount: number;
    messageCount: number;
    lastActivity: Date | null;
  }> {
    const userConversations = await conversationManager.getUserConversations(userId);
    
    const messageCount = userConversations.reduce(
      (sum, conv) => sum + conv.messages.length, 
      0
    );
    
    const lastActivity = userConversations.length > 0 
      ? userConversations[0].updatedAt 
      : null;

    return {
      conversationCount: userConversations.length,
      messageCount,
      lastActivity,
    };
  },
};