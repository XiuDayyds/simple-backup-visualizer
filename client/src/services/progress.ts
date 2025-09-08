interface ProgressData {
  jobId: string;
  progress: number;
  message: string;
  stage?: string;
  type?: string;
  success?: boolean;
  result?: any;
  timestamp: string;
}

interface ProgressCallback {
  (data: ProgressData): void;
}

export class ProgressTracker {
  private eventSource: EventSource | null = null;
  private callbacks: ProgressCallback[] = [];
  
  constructor(private jobId: string) {}
  
  connect(): void {
    if (this.eventSource) {
      return; // Already connected
    }
    
    const baseUrl = import.meta.env.DEV 
      ? 'http://localhost:3000' 
      : '';
    
    this.eventSource = new EventSource(`${baseUrl}/api/progress/progress/${this.jobId}`);
    
    this.eventSource.onmessage = (event) => {
      try {
        const data: ProgressData = JSON.parse(event.data);
        this.notifyCallbacks(data);
        
        // Auto-close on completion
        if (data.type === 'complete') {
          setTimeout(() => this.disconnect(), 1000);
        }
      } catch (error) {
        console.error('Failed to parse progress data:', error);
      }
    };
    
    this.eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      this.disconnect();
    };
  }
  
  onProgress(callback: ProgressCallback): void {
    this.callbacks.push(callback);
  }
  
  private notifyCallbacks(data: ProgressData): void {
    this.callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Progress callback error:', error);
      }
    });
  }
  
  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.callbacks = [];
  }
}

export function trackProgress(jobId: string, onProgress: ProgressCallback): ProgressTracker {
  const tracker = new ProgressTracker(jobId);
  tracker.onProgress(onProgress);
  tracker.connect();
  return tracker;
}