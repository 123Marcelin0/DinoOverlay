import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/auth';
import { aiProcessingQueue } from '@/lib/ai-processing-queue';

export async function GET(request: NextRequest) {
  try {
    // API key validation
    const apiKey = request.headers.get('x-api-key');
    const authResult = await validateApiKey(apiKey);
    if (!authResult.valid) {
      return NextResponse.json(
        { success: false, error: 'Invalid API key' },
        { status: 401 }
      );
    }

    const stats = aiProcessingQueue.getQueueStats();
    const userJobs = aiProcessingQueue.getUserJobs(authResult.userId);

    return NextResponse.json({
      success: true,
      globalStats: stats,
      userJobs: userJobs.map(job => ({
        id: job.id,
        type: job.type,
        status: job.status,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        error: job.error,
      })),
    });

  } catch (error) {
    console.error('Queue stats API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}