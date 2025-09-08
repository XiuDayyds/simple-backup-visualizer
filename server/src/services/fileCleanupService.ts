import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const stat = promisify(fs.stat);
const readdir = promisify(fs.readdir);
const unlink = promisify(fs.unlink);
const rmdir = promisify(fs.rmdir);

interface CleanupConfig {
  outputDir: string;
  tempDir: string;
  maxAge: number; // 最大保留时间（毫秒）
  interval: number; // 清理间隔（毫秒）
  enabled: boolean; // 是否启用自动清理
}

class FileCleanupService {
  private config: CleanupConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private lastCleanupTime: Date | null = null;
  private cleanupStats = {
    totalFilesDeleted: 0,
    totalSizeFreed: 0,
    lastRunFiles: 0,
    lastRunSize: 0
  };

  constructor(config: Partial<CleanupConfig> = {}) {
    this.config = {
      outputDir: path.join(process.cwd(), 'output'),
      tempDir: path.join(process.cwd(), 'temp'),
      maxAge: 30 * 60 * 1000, // 默认30分钟
      interval: 5 * 60 * 1000, // 默认每5分钟检查一次
      enabled: true,
      ...config
    };
  }

  /**
   * 启动自动清理服务
   */
  start(): void {
    if (!this.config.enabled) {
      console.log('[FileCleanupService] 自动清理服务已禁用');
      return;
    }

    if (this.cleanupTimer) {
      console.log('[FileCleanupService] 清理服务已在运行');
      return;
    }

    console.log(`[FileCleanupService] 启动自动清理服务:`);
    console.log(`  - 清理目录: ${this.config.outputDir}, ${this.config.tempDir}`);
    console.log(`  - 文件保留时间: ${this.config.maxAge / 1000 / 60} 分钟`);
    console.log(`  - 检查间隔: ${this.config.interval / 1000 / 60} 分钟`);

    // 立即执行一次清理
    this.performCleanup().catch(err => {
      console.error('[FileCleanupService] 初始清理失败:', err);
    });

    // 设置定时器
    this.cleanupTimer = setInterval(() => {
      this.performCleanup().catch(err => {
        console.error('[FileCleanupService] 定期清理失败:', err);
      });
    }, this.config.interval);

    // 确保进程退出时清理定时器
    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());
  }

  /**
   * 停止自动清理服务
   */
  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
      console.log('[FileCleanupService] 自动清理服务已停止');
    }
  }

  /**
   * 执行清理操作
   */
  async performCleanup(): Promise<void> {
    if (this.isRunning) {
      console.log('[FileCleanupService] 清理任务正在执行，跳过本次');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();
    let filesDeleted = 0;
    let totalSize = 0;

    try {
      console.log(`[FileCleanupService] 开始清理过期文件...`);

      // 清理 output 目录
      if (fs.existsSync(this.config.outputDir)) {
        const outputResult = await this.cleanDirectory(this.config.outputDir);
        filesDeleted += outputResult.filesDeleted;
        totalSize += outputResult.sizeFreed;
      }

      // 清理 temp 目录
      if (fs.existsSync(this.config.tempDir)) {
        const tempResult = await this.cleanDirectory(this.config.tempDir);
        filesDeleted += tempResult.filesDeleted;
        totalSize += tempResult.sizeFreed;
      }

      // 更新统计信息
      this.cleanupStats.totalFilesDeleted += filesDeleted;
      this.cleanupStats.totalSizeFreed += totalSize;
      this.cleanupStats.lastRunFiles = filesDeleted;
      this.cleanupStats.lastRunSize = totalSize;
      this.lastCleanupTime = new Date();

      const duration = Date.now() - startTime;
      if (filesDeleted > 0) {
        console.log(`[FileCleanupService] 清理完成: 删除 ${filesDeleted} 个文件，释放 ${this.formatFileSize(totalSize)}，耗时 ${duration}ms`);
      } else {
        console.log(`[FileCleanupService] 清理完成: 没有需要删除的文件，耗时 ${duration}ms`);
      }
    } catch (error) {
      console.error('[FileCleanupService] 清理过程中发生错误:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 清理指定目录中的过期文件
   */
  private async cleanDirectory(dirPath: string): Promise<{ filesDeleted: number; sizeFreed: number }> {
    let filesDeleted = 0;
    let sizeFreed = 0;
    const now = Date.now();

    try {
      const files = await readdir(dirPath);

      for (const file of files) {
        const filePath = path.join(dirPath, file);

        try {
          const stats = await stat(filePath);

          // 检查文件是否过期
          const fileAge = now - stats.mtimeMs;
          if (fileAge > this.config.maxAge) {
            // 如果是目录，递归清理
            if (stats.isDirectory()) {
              const subResult = await this.cleanDirectory(filePath);
              filesDeleted += subResult.filesDeleted;
              sizeFreed += subResult.sizeFreed;

              // 尝试删除空目录
              try {
                await rmdir(filePath);
                console.log(`[FileCleanupService] 删除空目录: ${file}`);
              } catch (err) {
                // 目录不为空，忽略错误
              }
            } else {
              // 删除文件
              await unlink(filePath);
              filesDeleted++;
              sizeFreed += stats.size;
              console.log(`[FileCleanupService] 删除过期文件: ${file} (年龄: ${Math.round(fileAge / 1000 / 60)}分钟, 大小: ${this.formatFileSize(stats.size)})`);
            }
          }
        } catch (err) {
          console.error(`[FileCleanupService] 处理文件失败 ${filePath}:`, err);
        }
      }
    } catch (err) {
      console.error(`[FileCleanupService] 读取目录失败 ${dirPath}:`, err);
    }

    return { filesDeleted, sizeFreed };
  }

  /**
   * 手动清理指定文件
   */
  async cleanFile(filePath: string): Promise<boolean> {
    try {
      const stats = await stat(filePath);
      await unlink(filePath);
      this.cleanupStats.totalFilesDeleted++;
      this.cleanupStats.totalSizeFreed += stats.size;
      console.log(`[FileCleanupService] 手动删除文件: ${path.basename(filePath)}`);
      return true;
    } catch (err) {
      console.error(`[FileCleanupService] 删除文件失败 ${filePath}:`, err);
      return false;
    }
  }

  /**
   * 获取清理统计信息
   */
  getStats(): {
    enabled: boolean;
    isRunning: boolean;
    lastCleanupTime: Date | null;
    totalFilesDeleted: number;
    totalSizeFreed: string;
    lastRunFiles: number;
    lastRunSize: string;
    config: {
      maxAge: string;
      interval: string;
    };
  } {
    return {
      enabled: this.config.enabled,
      isRunning: this.isRunning,
      lastCleanupTime: this.lastCleanupTime,
      totalFilesDeleted: this.cleanupStats.totalFilesDeleted,
      totalSizeFreed: this.formatFileSize(this.cleanupStats.totalSizeFreed),
      lastRunFiles: this.cleanupStats.lastRunFiles,
      lastRunSize: this.formatFileSize(this.cleanupStats.lastRunSize),
      config: {
        maxAge: `${this.config.maxAge / 1000 / 60} 分钟`,
        interval: `${this.config.interval / 1000 / 60} 分钟`
      }
    };
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<CleanupConfig>): void {
    const wasEnabled = this.config.enabled;
    this.config = { ...this.config, ...config };

    // 如果启用状态改变，重启服务
    if (wasEnabled !== this.config.enabled) {
      this.stop();
      if (this.config.enabled) {
        this.start();
      }
    } else if (this.config.enabled && this.cleanupTimer) {
      // 如果间隔改变，重启定时器
      this.stop();
      this.start();
    }

    console.log('[FileCleanupService] 配置已更新:', this.config);
  }

  /**
   * 格式化文件大小
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }

  /**
   * 立即执行一次清理（用于测试）
   */
  async cleanNow(): Promise<void> {
    console.log('[FileCleanupService] 手动触发清理...');
    await this.performCleanup();
  }
}

// 导出单例实例
let cleanupServiceInstance: FileCleanupService | null = null;

export function getCleanupService(config?: Partial<CleanupConfig>): FileCleanupService {
  if (!cleanupServiceInstance) {
    cleanupServiceInstance = new FileCleanupService(config);
  } else if (config) {
    cleanupServiceInstance.updateConfig(config);
  }
  return cleanupServiceInstance;
}

export { FileCleanupService, CleanupConfig };