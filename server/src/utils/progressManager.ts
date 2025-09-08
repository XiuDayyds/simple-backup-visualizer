import { emitProgress, PROGRESS_STAGES } from '../routes/progress';

export class ProgressManager {
  private jobId: string;
  private currentStage: keyof typeof PROGRESS_STAGES;
  private stageStartTime: number;
  private currentProgress: number;
  private updateInterval: NodeJS.Timeout | null = null;
  private isStalled: boolean = false;
  private totalEntries: number = 0;
  private processedEntries: number = 0;
  private minDuration: number = 1500; // Minimum 1.5 seconds for small files
  private startTime: number;
  
  constructor(jobId: string, totalEntries: number = 0) {
    this.jobId = jobId;
    this.currentStage = 'upload';
    this.currentProgress = 0;
    this.stageStartTime = Date.now();
    this.startTime = Date.now();
    this.totalEntries = totalEntries;
    
    // Start time-based progress updates (every 500ms)
    this.startProgressTimer();
  }
  
  private startProgressTimer() {
    this.updateInterval = setInterval(() => {
      this.updateTimeBasedProgress();
    }, 500);
  }
  
  private updateTimeBasedProgress() {
    if (this.isStalled) return;
    
    const now = Date.now();
    const elapsedInStage = now - this.stageStartTime;
    const stage = PROGRESS_STAGES[this.currentStage];
    
    // Calculate expected progress based on time (uniform distribution)
    const stageRange = stage.end - stage.start;
    const expectedDuration = this.getExpectedStageDuration();
    
    // Smooth progress increase within the stage
    let stageProgress = Math.min((elapsedInStage / expectedDuration) * 100, 90); // Cap at 90% of stage
    
    // Anti-stall: slowly increment if stuck
    if (stageProgress < 10 && elapsedInStage > 2000) {
      stageProgress = Math.min(elapsedInStage / 100, 50); // Very slow increase
    }
    
    const newProgress = stage.start + (stageRange * stageProgress / 100);
    
    // Only update if progress increased
    if (newProgress > this.currentProgress) {
      this.currentProgress = Math.min(newProgress, stage.end - 0.1); // Never reach stage end automatically
      
      // Add entry count for large files
      let message = stage.label;
      if (this.totalEntries > 5000 && this.processedEntries > 0) {
        const percentage = Math.round((this.processedEntries / this.totalEntries) * 100);
        message += ` (${percentage}% 完成)`;
      }
      
      // Debug log to verify timer is working
      console.log(`[Progress Timer] ${this.jobId}: Stage=${this.currentStage}, Progress=${Math.round(this.currentProgress)}%, ElapsedInStage=${elapsedInStage}ms`);
      
      emitProgress(this.jobId, Math.round(this.currentProgress), message, this.currentStage);
    }
  }
  
  private getExpectedStageDuration(): number {
    // More realistic duration estimates based on actual processing needs
    let baseTime: number;
    
    if (this.totalEntries < 100) {
      baseTime = 2000; // 2 seconds for small files
    } else if (this.totalEntries < 500) {
      baseTime = 5000; // 5 seconds for medium files
    } else if (this.totalEntries < 1000) {
      baseTime = 10000; // 10 seconds for large files
    } else if (this.totalEntries < 2000) {
      baseTime = 20000; // 20 seconds for very large files
    } else {
      baseTime = 30000; // 30 seconds for huge files
    }
    
    // Adjusted stage weights for more realistic progress
    const stageDurations: Record<string, number> = {
      upload: baseTime * 0.1,     // 10% - Quick file upload
      validate: baseTime * 0.1,    // 10% - Quick validation
      process: baseTime * 0.2,     // 20% - Media processing if needed
      generate: baseTime * 0.5,    // 50% - Main generation work
      finalize: baseTime * 0.1,    // 10% - Final cleanup
    };
    
    // Ensure minimum duration for small files for better UX
    if (this.totalEntries < 100) {
      const totalElapsed = Date.now() - this.startTime;
      const remainingMin = Math.max(0, this.minDuration - totalElapsed);
      return Math.max(stageDurations[this.currentStage] || baseTime, remainingMin / 5);
    }
    
    return stageDurations[this.currentStage] || baseTime;
  }
  
  // Move to next stage
  public nextStage(stageName: keyof typeof PROGRESS_STAGES) {
    const stage = PROGRESS_STAGES[stageName];
    this.currentStage = stageName;
    this.stageStartTime = Date.now();
    this.currentProgress = stage.start;
    this.isStalled = false;
    
    emitProgress(this.jobId, this.currentProgress, stage.label, stageName);
  }
  
  // Update processed entries (for large files)
  public updateProcessed(processed: number) {
    this.processedEntries = processed;
  }
  
  // Complete current stage
  public completeStage() {
    const stage = PROGRESS_STAGES[this.currentStage];
    this.currentProgress = stage.end;
    emitProgress(this.jobId, this.currentProgress, `${stage.label}完成`, this.currentStage);
  }
  
  // Mark as stalled (for long operations)
  public setStalled(stalled: boolean) {
    this.isStalled = stalled;
  }
  
  // Complete the entire process
  public complete(success: boolean = true) {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    // Ensure minimum duration for small files
    const totalElapsed = Date.now() - this.startTime;
    if (this.totalEntries < 100 && totalElapsed < this.minDuration) {
      setTimeout(() => {
        emitProgress(this.jobId, 100, success ? '生成完成！' : '生成失败', 'finalize');
      }, this.minDuration - totalElapsed);
    } else {
      emitProgress(this.jobId, 100, success ? '生成完成！' : '生成失败', 'finalize');
    }
  }
  
  // Cleanup
  public destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
}