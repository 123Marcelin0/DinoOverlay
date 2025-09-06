import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limit';
import { validateApiKey } from '@/lib/auth';
import { processImage } from '@/lib/image-processor';
import { aiImageEdit } from '@/lib/ai-service';
import { handleCors, withCors } from '@/lib/cors';

// Request validation schema
const editImageSchema = z.object({
  imageData: z.string().min(1, 'Image data is required'),
  prompt: z.string().min(1, 'Prompt is required').max(500, 'Prompt too long'),
  imageUrl: z.string().url().optional(),
  context: z.object({
    propertyId: z.string().optional(),
    roomType: z.string().optional(),
  }).optional(),
});

// Handle preflight OPTIONS request
export async function OPTIONS(request: NextRequest) {
  return handleCors(request);
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(request);
    if (!rateLimitResult.success) {
      return withCors(NextResponse.json(
        { 
          success: false, 
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: rateLimitResult.retryAfter 
        },
        { status: 429 }
      ), origin);
    }

    // API key validation
    const apiKey = request.headers.get('x-api-key');
    const authResult = await validateApiKey(apiKey);
    if (!authResult.valid) {
      return withCors(NextResponse.json(
        { success: false, error: 'Invalid API key' },
        { status: 401 }
      ), origin);
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = editImageSchema.safeParse(body);
    
    if (!validationResult.success) {
      return withCors(NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request data',
          details: validationResult.error.errors 
        },
        { status: 400 }
      ), origin);
    }

    const { imageData, prompt, imageUrl, context } = validationResult.data;

    // Process and validate image
    const imageProcessingResult = await processImage(imageData, imageUrl);
    if (!imageProcessingResult.success) {
      return withCors(NextResponse.json(
        { 
          success: false, 
          error: imageProcessingResult.error 
        },
        { status: 400 }
      ), origin);
    }

    // Add job to processing queue
    const { aiProcessingQueue } = await import('@/lib/ai-processing-queue');
    
    const jobId = await aiProcessingQueue.addJob(
      authResult.userId,
      'image-edit',
      {
        imageData: imageProcessingResult.processedImageData,
        prompt,
        context,
        userId: authResult.userId,
      },
      1 // Normal priority
    );

    // Check if client wants to wait for result or just get job ID
    const waitForResult = request.headers.get('x-wait-for-result') === 'true';
    
    if (!waitForResult) {
      return withCors(NextResponse.json({
        success: true,
        jobId,
        status: 'queued',
        message: 'Image processing job queued successfully',
      }), origin);
    }

    // Wait for job completion
    try {
      const startTime = Date.now();
      const completedJob = await aiProcessingQueue.waitForJob(jobId);
      const processingTime = Date.now() - startTime;

      if (completedJob.status === 'failed') {
        return withCors(NextResponse.json(
          { 
            success: false, 
            error: completedJob.error || 'AI processing failed',
            jobId 
          },
          { status: 500 }
        ), origin);
      }

      const aiResult = completedJob.result;
      return withCors(NextResponse.json({
        success: true,
        editedImageUrl: aiResult.editedImageUrl,
        editedImageData: aiResult.editedImageData,
        processingTime,
        jobId,
      }), origin);

    } catch (error) {
      return withCors(NextResponse.json(
        { 
          success: false, 
          error: 'Processing timeout or error',
          jobId 
        },
        { status: 408 }
      ), origin);
    }

  } catch (error) {
    console.error('Edit image API error:', error);
    return withCors(NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    ), origin);
  }
}