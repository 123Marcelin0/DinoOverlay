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

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { success: false, error: 'Job ID is required' },
        { status: 400 }
      );
    }

    const job = aiProcessingQueue.getJobStatus(jobId);
    
    if (!job) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this job
    if (job.userId !== authResult.userId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        type: job.type,
        status: job.status,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        error: job.error,
        result: job.status === 'completed' ? job.result : undefined,
      },
    });

  } catch (error) {
    console.error('Job status API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { success: false, error: 'Job ID is required' },
        { status: 400 }
      );
    }

    const job = aiProcessingQueue.getJobStatus(jobId);
    
    if (!job) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this job
    if (job.userId !== authResult.userId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    const cancelled = aiProcessingQueue.cancelJob(jobId);
    
    return NextResponse.json({
      success: true,
      cancelled,
      message: cancelled ? 'Job cancelled successfully' : 'Job could not be cancelled (already completed or failed)',
    });

  } catch (error) {
    console.error('Job cancellation API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}