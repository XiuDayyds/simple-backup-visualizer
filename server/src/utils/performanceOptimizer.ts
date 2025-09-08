/**
 * 性能优化工具模块
 * 用于处理大数据量时的性能优化
 */

/**
 * 分批处理数据
 * @param data 原始数据数组
 * @param batchSize 每批处理的数量
 * @param processor 处理函数
 */
export async function processBatch<T, R>(
  data: T[],
  batchSize: number,
  processor: (batch: T[]) => Promise<R[]>
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, Math.min(i + batchSize, data.length));
    const batchResults = await processor(batch);
    results.push(...batchResults);
    
    // 让出事件循环，避免阻塞
    await new Promise(resolve => setImmediate(resolve));
  }
  
  return results;
}

/**
 * 并发控制器
 * 限制同时执行的异步操作数量
 */
export class ConcurrencyController {
  private running = 0;
  private queue: Array<() => void> = [];
  
  constructor(private maxConcurrency: number) {}
  
  async run<T>(fn: () => Promise<T>): Promise<T> {
    while (this.running >= this.maxConcurrency) {
      await new Promise<void>(resolve => {
        this.queue.push(resolve);
      });
    }
    
    this.running++;
    
    try {
      return await fn();
    } finally {
      this.running--;
      const next = this.queue.shift();
      if (next) {
        next();
      }
    }
  }
}

/**
 * 内存使用监控
 */
export function getMemoryUsage() {
  const usage = process.memoryUsage();
  return {
    rss: Math.round(usage.rss / 1024 / 1024), // MB
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
    external: Math.round(usage.external / 1024 / 1024), // MB
  };
}

/**
 * 日志内存使用情况
 */
export function logMemoryUsage(label: string) {
  const usage = getMemoryUsage();
  console.log(`[内存使用 - ${label}]`, {
    RSS: `${usage.rss} MB`,
    堆总量: `${usage.heapTotal} MB`,
    堆使用: `${usage.heapUsed} MB`,
    外部: `${usage.external} MB`,
  });
}

/**
 * 字符串构建器（避免频繁的字符串拼接）
 */
export class StringBuilder {
  private chunks: string[] = [];
  private length = 0;
  
  append(str: string): this {
    this.chunks.push(str);
    this.length += str.length;
    return this;
  }
  
  toString(): string {
    return this.chunks.join('');
  }
  
  clear(): void {
    this.chunks = [];
    this.length = 0;
  }
  
  getLength(): number {
    return this.length;
  }
}

/**
 * 超时控制包装器
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = '操作超时'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
    })
  ]);
}

/**
 * 重试机制
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000,
  backoff = 2
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (i < maxRetries - 1) {
        const waitTime = delay * Math.pow(backoff, i);
        console.log(`重试 ${i + 1}/${maxRetries}，等待 ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  throw lastError || new Error('重试失败');
}

/**
 * 检查系统资源是否充足
 */
export function checkSystemResources(): { canProceed: boolean; warnings: string[] } {
  const warnings: string[] = [];
  const usage = getMemoryUsage();
  
  // 检查可用内存
  const availableMemory = usage.heapTotal - usage.heapUsed;
  if (availableMemory < 100) {
    warnings.push(`可用内存不足: ${availableMemory} MB`);
  }
  
  // 检查堆使用率
  const heapUsagePercent = (usage.heapUsed / usage.heapTotal) * 100;
  if (heapUsagePercent > 90) {
    warnings.push(`堆内存使用率过高: ${heapUsagePercent.toFixed(1)}%`);
  }
  
  return {
    canProceed: warnings.length === 0,
    warnings
  };
}