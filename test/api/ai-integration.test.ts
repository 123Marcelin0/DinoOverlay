import { NextRequest } from 'next/server';
import { POST as editImageHandler } from '@/app/api/overlay/edit-image/route';
import { GET as jobStatusHandler, DELETE as cancelJobHandler } from '@/app/api/overlay/job-status/route';
import { GET as queueStatsHandler } from '@/app/api/overlay/queue-stats/route';

// Mock the dependencies
jest.mock('@/lib/rate-limit', () => ({
  rateLimit: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('@/lib/auth', () => ({
  validateApiKey: jest.fn().mockResolvedValue({ 
    valid: true, 
    userId: 'test-user-123' 
  }),
}));

jest.mock('@/lib/image-processor', () => ({
  processImage: jest.fn().mockResolvedValue({
    success: true,
    processedImageData: 'data:image/jpeg;base64,processed-image-data',
  }),
}));

// Mock the AI processing queue
const mockQueue = {
  addJob: jest.fn().mockResolvedValue('job_123'),
  waitForJob: jest.fn().mockResolvedValue({
    id: 'job_123',
    status: 'completed',
    result: {
      success: true,
      editedImageUrl: 'https://cdn.example.com/edited.jpg',
      editedImageData: 'data:image/jpeg;base64,edited-image-data',
    },
  }),
  getJobStatus: jest.fn().mockReturnValue({
    id: 'job_123',
    userId: 'test-user-123',
    type: 'image-edit',
    status: 'completed',
    createdAt: new Date(),
    result: {
      success: true,
      editedImageUrl: 'https://cdn.example.com/edited.jpg',
    },
  }),
  cancelJob: jest.fn().mockReturnValue(true),
  getQueueStats: jest.fn().mockReturnValue({
    totalJobs: 10,
    queuedJobs: 2,
    processingJobs: 1,
    completedJobs: 6,
    failedJobs: 1,
    averageProcessingTime: 5000,
  }),
  getUserJobs: jest.fn().mockReturnValue([
    {
      id: 'job_123',
      type: 'image-edit',
      status: 'completed',
      createdAt: new Date(),
    },
  ]),
};

jest.mock('@/lib/ai-processing-queue', () => ({
  aiProcessingQueue: mockQueue,
}));

describe('AI Integration API Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/overlay/edit-image', () => {
    const validRequestBody = {
      imageData: 'data:image/jpeg;base64,valid-image-data',
      prompt: 'Add modern furniture to this room',
      context: {
        propertyId: 'prop_123',
        roomType: 'living_room',
      },
    };

    it('should queue image processing job successfully', async () => {
      const request = new NextRequest('http://localhost/api/overlay/edit-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'valid-api-key',
        },
        body: JSON.stringify(validRequestBody),
      });

      const response = await editImageHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.jobId).toBe('job_123');
      expect(data.status).toBe('queued');
      expect(mockQueue.addJob).toHaveBeenCalledWith(
        'test-user-123',
        'image-edit',
        expect.objectContaining({
          imageData: 'data:image/jpeg;base64,processed-image-data',
          prompt: 'Add modern furniture to this room',
          context: validRequestBody.context,
          userId: 'test-user-123',
        }),
        1
      );
    });

    it('should wait for job completion when requested', async () => {
      const request = new NextRequest('http://localhost/api/overlay/edit-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'valid-api-key',
          'x-wait-for-result': 'true',
        },
        body: JSON.stringify(validRequestBody),
      });

      const response = await editImageHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.editedImageUrl).toBe('https://cdn.example.com/edited.jpg');
      expect(data.editedImageData).toBe('data:image/jpeg;base64,edited-image-data');
      expect(data.jobId).toBe('job_123');
      expect(mockQueue.waitForJob).toHaveBeenCalledWith('job_123');
    });

    it('should handle failed job completion', async () => {
      mockQueue.waitForJob.mockResolvedValueOnce({
        id: 'job_123',
        status: 'failed',
        error: 'AI processing failed',
      });

      const request = new NextRequest('http://localhost/api/overlay/edit-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'valid-api-key',
          'x-wait-for-result': 'true',
        },
        body: JSON.stringify(validRequestBody),
      });

      const response = await editImageHandler(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('AI processing failed');
      expect(data.jobId).toBe('job_123');
    });

    it('should handle job timeout', async () => {
      mockQueue.waitForJob.mockRejectedValueOnce(new Error('Job timeout'));

      const request = new NextRequest('http://localhost/api/overlay/edit-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'valid-api-key',
          'x-wait-for-result': 'true',
        },
        body: JSON.stringify(validRequestBody),
      });

      const response = await editImageHandler(request);
      const data = await response.json();

      expect(response.status).toBe(408);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Processing timeout or error');
      expect(data.jobId).toBe('job_123');
    });

    it('should validate request body', async () => {
      const invalidRequestBody = {
        imageData: '', // Missing image data
        prompt: 'Add furniture',
      };

      const request = new NextRequest('http://localhost/api/overlay/edit-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'valid-api-key',
        },
        body: JSON.stringify(invalidRequestBody),
      });

      const response = await editImageHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid request data');
    });
  });

  describe('GET /api/overlay/job-status', () => {
    it('should return job status for valid job ID', async () => {
      const request = new NextRequest('http://localhost/api/overlay/job-status?jobId=job_123', {
        method: 'GET',
        headers: {
          'x-api-key': 'valid-api-key',
        },
      });

      const response = await jobStatusHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.job.id).toBe('job_123');
      expect(data.job.status).toBe('completed');
      expect(mockQueue.getJobStatus).toHaveBeenCalledWith('job_123');
    });

    it('should return 404 for non-existent job', async () => {
      mockQueue.getJobStatus.mockReturnValueOnce(null);

      const request = new NextRequest('http://localhost/api/overlay/job-status?jobId=nonexistent', {
        method: 'GET',
        headers: {
          'x-api-key': 'valid-api-key',
        },
      });

      const response = await jobStatusHandler(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Job not found');
    });

    it('should return 400 for missing job ID', async () => {
      const request = new NextRequest('http://localhost/api/overlay/job-status', {
        method: 'GET',
        headers: {
          'x-api-key': 'valid-api-key',
        },
      });

      const response = await jobStatusHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Job ID is required');
    });

    it('should return 403 for unauthorized access to job', async () => {
      mockQueue.getJobStatus.mockReturnValueOnce({
        id: 'job_123',
        userId: 'different-user',
        status: 'completed',
      });

      const request = new NextRequest('http://localhost/api/overlay/job-status?jobId=job_123', {
        method: 'GET',
        headers: {
          'x-api-key': 'valid-api-key',
        },
      });

      const response = await jobStatusHandler(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Access denied');
    });
  });

  describe('DELETE /api/overlay/job-status', () => {
    it('should cancel job successfully', async () => {
      const request = new NextRequest('http://localhost/api/overlay/job-status?jobId=job_123', {
        method: 'DELETE',
        headers: {
          'x-api-key': 'valid-api-key',
        },
      });

      const response = await cancelJobHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.cancelled).toBe(true);
      expect(mockQueue.cancelJob).toHaveBeenCalledWith('job_123');
    });

    it('should handle job that cannot be cancelled', async () => {
      mockQueue.cancelJob.mockReturnValueOnce(false);

      const request = new NextRequest('http://localhost/api/overlay/job-status?jobId=job_123', {
        method: 'DELETE',
        headers: {
          'x-api-key': 'valid-api-key',
        },
      });

      const response = await cancelJobHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.cancelled).toBe(false);
      expect(data.message).toContain('could not be cancelled');
    });
  });

  describe('GET /api/overlay/queue-stats', () => {
    it('should return queue statistics and user jobs', async () => {
      const request = new NextRequest('http://localhost/api/overlay/queue-stats', {
        method: 'GET',
        headers: {
          'x-api-key': 'valid-api-key',
        },
      });

      const response = await queueStatsHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.globalStats).toEqual({
        totalJobs: 10,
        queuedJobs: 2,
        processingJobs: 1,
        completedJobs: 6,
        failedJobs: 1,
        averageProcessingTime: 5000,
      });
      expect(data.userJobs).toHaveLength(1);
      expect(data.userJobs[0].id).toBe('job_123');
      expect(mockQueue.getQueueStats).toHaveBeenCalled();
      expect(mockQueue.getUserJobs).toHaveBeenCalledWith('test-user-123');
    });
  });

  describe('Authentication and Rate Limiting', () => {
    it('should handle invalid API key', async () => {
      const { validateApiKey } = require('@/lib/auth');
      validateApiKey.mockResolvedValueOnce({ valid: false });

      const request = new NextRequest('http://localhost/api/overlay/edit-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'invalid-api-key',
        },
        body: JSON.stringify({
          imageData: 'data:image/jpeg;base64,test',
          prompt: 'test prompt',
        }),
      });

      const response = await editImageHandler(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid API key');
    });

    it('should handle rate limiting', async () => {
      const { rateLimit } = require('@/lib/rate-limit');
      rateLimit.mockResolvedValueOnce({ 
        success: false, 
        retryAfter: 60 
      });

      const request = new NextRequest('http://localhost/api/overlay/edit-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'valid-api-key',
        },
        body: JSON.stringify({
          imageData: 'data:image/jpeg;base64,test',
          prompt: 'test prompt',
        }),
      });

      const response = await editImageHandler(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Rate limit exceeded. Please try again later.');
      expect(data.retryAfter).toBe(60);
    });
  });
});