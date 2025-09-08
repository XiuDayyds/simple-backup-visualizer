import { Router, Request, Response } from 'express';
import { EventEmitter } from 'events';

const router = Router();

// Progress event emitter for tracking generation progress
export const progressEmitter = new EventEmitter();

// Store active SSE connections
const activeConnections = new Map<string, Response>();

// Lightweight progress cache - only stores latest progress per job
const progressCache = new Map<string, any>();

// Cache TTL - 5 minutes
const CACHE_TTL = 5 * 60 * 1000;

// Progress stages with time-based weights (for uniform distribution)
export const PROGRESS_STAGES = {
  upload: { start: 0, end: 10, label: '上传文件' },
  validate: { start: 10, end: 20, label: '验证数据' },
  process: { start: 20, end: 40, label: '处理数据' },
  generate: { start: 40, end: 80, label: '生成文档' },
  finalize: { start: 80, end: 100, label: '完成处理' }
};

// Track job start times for time estimation
const jobStartTimes = new Map<string, number>();

// Anti-stall progress tracking
const lastProgressUpdate = new Map<string, { time: number, progress: number }>();

// SSE endpoint for progress updates
router.get('/progress/:jobId', (req: Request, res: Response) => {
  const { jobId } = req.params;
  
  // Set headers for SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });
  
  // Store connection
  activeConnections.set(jobId, res);
  
  // Send initial message
  res.write(`data: ${JSON.stringify({ type: 'connected', jobId })}\n\n`);
  
  // Send cached progress if exists (for reconnection scenarios)
  const cachedProgress = progressCache.get(jobId);
  if (cachedProgress) {
    res.write(`data: ${JSON.stringify({ ...cachedProgress, cached: true })}\n\n`);
  }
  
  // Listen for progress updates
  const progressListener = (data: any) => {
    if (data.jobId === jobId) {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
  };
  
  progressEmitter.on('progress', progressListener);
  
  // Handle client disconnect
  req.on('close', () => {
    progressEmitter.off('progress', progressListener);
    activeConnections.delete(jobId);
  });
});

// Function to emit progress updates with caching
export function emitProgress(jobId: string, progress: number, message: string, stage?: string) {
  const now = Date.now();
  
  // Debug log to verify function is being called
  console.log(`[emitProgress] ${jobId}: Progress=${progress}%, Message="${message}", Stage=${stage}`);
  
  // Initialize job start time if not exists
  if (!jobStartTimes.has(jobId)) {
    jobStartTimes.set(jobId, now);
  }
  
  // Calculate elapsed time and estimate remaining (for large files)
  const startTime = jobStartTimes.get(jobId)!;
  const elapsedTime = now - startTime;
  const estimatedTotal = progress > 0 ? (elapsedTime / progress) * 100 : 0;
  const estimatedRemaining = Math.max(0, estimatedTotal - elapsedTime);
  
  const progressData = {
    jobId,
    progress,
    message,
    stage,
    timestamp: new Date().toISOString(),
    elapsedTime,
    estimatedRemaining: progress > 30 ? estimatedRemaining : undefined, // Only show after 30%
  };
  
  // Cache the latest progress
  progressCache.set(jobId, progressData);
  
  // Track for anti-stall
  lastProgressUpdate.set(jobId, { time: now, progress });
  
  // Auto-cleanup cache after TTL
  setTimeout(() => {
    progressCache.delete(jobId);
    jobStartTimes.delete(jobId);
    lastProgressUpdate.delete(jobId);
  }, CACHE_TTL);
  
  progressEmitter.emit('progress', progressData);
}

// Function to emit completion
export function emitComplete(jobId: string, success: boolean, result?: any) {
  progressEmitter.emit('progress', {
    jobId,
    type: 'complete',
    success,
    result,
    timestamp: new Date().toISOString(),
  });
  
  // Close connection after completion
  setTimeout(() => {
    const connection = activeConnections.get(jobId);
    if (connection) {
      connection.end();
      activeConnections.delete(jobId);
    }
  }, 1000);
}

export default router;