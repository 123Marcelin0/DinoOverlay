interface ProcessingJob {
  id: string;
  userId: string;
  type: 'image-edit' | 'chat';
  status: 'queued' | 'processing' | 'completed' | 'failed';
  priority: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  data: any;
  result?: any;
  error?: string;
  retryCount: number;
  maxRetries: number;
}

interface QueueStats {
  totalJobs: number;
  queuedJobs: number;
  processingJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageProcessingTime: number;
}

class AIProcessingQueue {
  private jobs: Map<string, ProcessingJob> = new Map();
  private processingQueue: ProcessingJob[] = [];
  private maxConcurrentJobs: number = 3;
  private currentlyProcessing: Set<string> = new Set();
  private jobCallbacks: Map<string, (job: ProcessingJob) => void> = new Map();

  constructor(maxConcurrentJobs: number = 3) {
    this.maxConcurrentJobs = maxConcurrentJobs;
    this.startProcessing();
  }

  public async addJob(
    userId: string,
    type: 'image-edit' | 'chat',
    data: any,
    priority: number = 0
  ): Promise<string> {
    const jobId = this.generateJobId();
    const job: ProcessingJob = {
      id: jobId,
      userId,
      type,
      status: 'queued',
      priority,
      createdAt: new Date(),
      data,
      retryCount: 0,
      maxRetries: 3,
    };

    this.jobs.set(jobId, job);
    this.processingQueue.push(job);
    
    // Sort queue by priority (higher priority first)
    this.processingQueue.sort((a, b) => b.priority - a.priority);

    console.log(`Job ${jobId} added to queue. Queue size: ${this.processingQueue.length}`);
    return jobId;
  }

  public getJobStatus(jobId: string): ProcessingJob | null {
    return this.jobs.get(jobId) || null;
  }

  public async waitForJob(jobId: string): Promise<ProcessingJob> {
    return new Promise((resolve, reject) => {
      const job = this.jobs.get(jobId);
      if (!job) {
        reject(new Error(`Job ${jobId} not found`));
        return;
      }

      if (job.status === 'completed' || job.status === 'failed') {
        resolve(job);
        return;
      }

      // Set up callback for when job completes
      this.jobCallbacks.set(jobId, (completedJob: ProcessingJob) => {
        this.jobCallbacks.delete(jobId);
        resolve(completedJob);
      });

      // Set timeout for job completion
      setTimeout(() => {
        if (this.jobCallbacks.has(jobId)) {
          this.jobCallbacks.delete(jobId);
          reject(new Error(`Job ${jobId} timed out`));
        }
      }, 300000); // 5 minute timeout
    });
  }

  public cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job || job.status === 'completed' || job.status === 'failed') {
      return false;
    }

    if (job.status === 'queued') {
      // Remove from queue
      const index = this.processingQueue.findIndex(j => j.id === jobId);
      if (index !== -1) {
        this.processingQueue.splice(index, 1);
      }
    }

    job.status = 'failed';
    job.error = 'Job cancelled by user';
    job.completedAt = new Date();

    this.notifyJobCompletion(job);
    return true;
  }

  public getQueueStats(): QueueStats {
    const allJobs = Array.from(this.jobs.values());
    const now = Date.now();
    
    const completedJobs = allJobs.filter(j => j.status === 'completed');
    const averageProcessingTime = completedJobs.length > 0
      ? completedJobs.reduce((sum, job) => {
          if (job.startedAt && job.completedAt) {
            return sum + (job.completedAt.getTime() - job.startedAt.getTime());
          }
          return sum;
        }, 0) / completedJobs.length
      : 0;

    return {
      totalJobs: allJobs.length,
      queuedJobs: allJobs.filter(j => j.status === 'queued').length,
      processingJobs: allJobs.filter(j => j.status === 'processing').length,
      completedJobs: completedJobs.length,
      failedJobs: allJobs.filter(j => j.status === 'failed').length,
      averageProcessingTime,
    };
  }

  public getUserJobs(userId: string): ProcessingJob[] {
    return Array.from(this.jobs.values())
      .filter(job => job.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  private async startProcessing(): Promise<void> {
    setInterval(() => {
      this.processNextJobs();
    }, 1000); // Check every second

    // Clean up old jobs every 5 minutes
    setInterval(() => {
      this.cleanupOldJobs();
    }, 5 * 60 * 1000);
  }

  private async processNextJobs(): Promise<void> {
    while (
      this.currentlyProcessing.size < this.maxConcurrentJobs &&
      this.processingQueue.length > 0
    ) {
      const job = this.processingQueue.shift();
      if (!job) break;

      this.currentlyProcessing.add(job.id);
      job.status = 'processing';
      job.startedAt = new Date();

      // Process job asynchronously
      this.processJob(job).finally(() => {
        this.currentlyProcessing.delete(job.id);
      });
    }
  }

  private async processJob(job: ProcessingJob): Promise<void> {
    try {
      console.log(`Processing job ${job.id} of type ${job.type}`);

      let result: any;
      
      if (job.type === 'image-edit') {
        const { aiImageEdit } = await import('./ai-service');
        result = await aiImageEdit(job.data);
      } else if (job.type === 'chat') {
        const { chatService } = await import('./chat-service');
        result = await chatService.processMessage(job.data);
      } else {
        throw new Error(`Unknown job type: ${job.type}`);
      }

      job.status = 'completed';
      job.result = result;
      job.completedAt = new Date();

      console.log(`Job ${job.id} completed successfully`);

    } catch (error) {
      console.error(`Job ${job.id} failed:`, error);
      
      job.retryCount++;
      
      if (job.retryCount < job.maxRetries) {
        // Retry the job
        job.status = 'queued';
        job.startedAt = undefined;
        this.processingQueue.push(job);
        
        // Sort queue by priority again
        this.processingQueue.sort((a, b) => b.priority - a.priority);
        
        console.log(`Job ${job.id} queued for retry (attempt ${job.retryCount + 1}/${job.maxRetries})`);
      } else {
        // Max retries reached
        job.status = 'failed';
        job.error = error instanceof Error ? error.message : 'Unknown error';
        job.completedAt = new Date();
        
        console.log(`Job ${job.id} failed permanently after ${job.retryCount} retries`);
      }
    }

    this.notifyJobCompletion(job);
  }

  private notifyJobCompletion(job: ProcessingJob): void {
    const callback = this.jobCallbacks.get(job.id);
    if (callback) {
      callback(job);
    }
  }

  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private cleanupOldJobs(): void {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    for (const [jobId, job] of this.jobs.entries()) {
      if (job.createdAt < cutoffTime && 
          (job.status === 'completed' || job.status === 'failed')) {
        this.jobs.delete(jobId);
      }
    }
  }
}

// Singleton instance
export const aiProcessingQueue = new AIProcessingQueue();

// Export types for use in other modules
export type { ProcessingJob, QueueStats };