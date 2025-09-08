/**
 * Smooth progress updater to prevent jarring jumps
 */
export class SmoothProgress {
  private currentProgress: number = 0;
  private targetProgress: number = 0;
  private animationId: number | null = null;
  private lastUpdateTime: number = Date.now();
  private onUpdate: (progress: number) => void;
  private smoothingFactor: number = 0.15; // How quickly to catch up (0.1 = slow, 1 = instant)

  constructor(onUpdate: (progress: number) => void) {
    this.onUpdate = onUpdate;
  }

  /**
   * Set the target progress value
   */
  setProgress(target: number) {
    this.targetProgress = Math.min(100, Math.max(0, target));
    
    // Start animation if not already running
    if (!this.animationId) {
      this.animate();
    }
  }

  /**
   * Animation loop for smooth transitions
   */
  private animate = () => {
    const now = Date.now();
    const deltaTime = Math.min((now - this.lastUpdateTime) / 1000, 0.1); // Cap at 100ms
    this.lastUpdateTime = now;
    
    // Calculate distance to target
    const distance = this.targetProgress - this.currentProgress;
    
    // If very close to target, snap to it
    if (Math.abs(distance) < 0.1) {
      this.currentProgress = this.targetProgress;
      this.onUpdate(Math.round(this.currentProgress * 10) / 10);
      
      // Stop animation if we've reached the target
      if (this.currentProgress >= 100 || this.currentProgress === this.targetProgress) {
        this.stop();
      } else {
        this.animationId = requestAnimationFrame(this.animate);
      }
      return;
    }
    
    // Smooth interpolation with acceleration for large jumps
    const speed = Math.abs(distance) > 20 ? 0.3 : this.smoothingFactor;
    this.currentProgress += distance * speed;
    
    // Ensure we never go backwards or exceed bounds
    this.currentProgress = Math.min(100, Math.max(0, this.currentProgress));
    
    // Update with rounded value for cleaner display
    this.onUpdate(Math.round(this.currentProgress * 10) / 10);
    
    // Continue animation
    this.animationId = requestAnimationFrame(this.animate);
  };

  /**
   * Stop the animation
   */
  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * Force complete to 100%
   */
  complete() {
    this.targetProgress = 100;
    this.currentProgress = 100;
    this.onUpdate(100);
    this.stop();
  }

  /**
   * Reset progress
   */
  reset() {
    this.stop();
    this.currentProgress = 0;
    this.targetProgress = 0;
    this.onUpdate(0);
  }
}

/**
 * Hook for using smooth progress in React components
 */
import { useEffect, useRef, useState } from 'react';

export function useSmoothProgress() {
  const [displayProgress, setDisplayProgress] = useState(0);
  const smootherRef = useRef<SmoothProgress | null>(null);

  useEffect(() => {
    smootherRef.current = new SmoothProgress(setDisplayProgress);
    
    return () => {
      smootherRef.current?.stop();
    };
  }, []);

  const setProgress = (progress: number) => {
    smootherRef.current?.setProgress(progress);
  };

  const complete = () => {
    smootherRef.current?.complete();
  };

  const reset = () => {
    smootherRef.current?.reset();
  };

  return { displayProgress, setProgress, complete, reset };
}