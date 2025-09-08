/**
 * 日志记录系统
 * 提供统一的日志记录功能，支持文件输出和错误追踪
 */

import fs from 'fs';
import path from 'path';
import { format } from 'util';

// 日志级别
export enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG',
}

// 日志配置
interface LogConfig {
  logDir: string;
  maxFileSize: number; // 最大文件大小（字节）
  maxFiles: number; // 最多保留文件数
  enableConsole: boolean; // 是否输出到控制台
  enableFile: boolean; // 是否输出到文件
}

class Logger {
  private config: LogConfig;
  private currentLogFile: string = '';
  private logStream: fs.WriteStream | null = null;

  constructor(config?: Partial<LogConfig>) {
    this.config = {
      logDir: path.join(__dirname, '../../../logs'),
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
      enableConsole: true,
      enableFile: true,
      ...config,
    };

    // 确保日志目录存在
    if (this.config.enableFile) {
      this.ensureLogDir();
      this.currentLogFile = this.getLogFileName();
      this.initLogStream();
    }
  }

  /**
   * 确保日志目录存在
   */
  private ensureLogDir() {
    if (!fs.existsSync(this.config.logDir)) {
      fs.mkdirSync(this.config.logDir, { recursive: true });
    }
  }

  /**
   * 获取日志文件名
   */
  private getLogFileName(): string {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    return path.join(this.config.logDir, `app-${dateStr}.log`);
  }

  /**
   * 初始化日志流
   */
  private initLogStream() {
    if (!this.config.enableFile) return;

    const logFile = this.currentLogFile;
    
    // 检查是否需要轮转日志文件
    if (fs.existsSync(logFile)) {
      const stats = fs.statSync(logFile);
      if (stats.size >= this.config.maxFileSize) {
        this.rotateLog();
      }
    }

    // 创建写入流
    this.logStream = fs.createWriteStream(logFile, { flags: 'a' });
  }

  /**
   * 轮转日志文件
   */
  private rotateLog() {
    if (this.logStream) {
      this.logStream.end();
    }

    const date = new Date();
    const timestamp = date.getTime();
    const oldFile = this.currentLogFile;
    const newFile = oldFile.replace('.log', `-${timestamp}.log`);
    
    if (fs.existsSync(oldFile)) {
      fs.renameSync(oldFile, newFile);
    }

    // 清理旧文件
    this.cleanOldLogs();
    
    // 重新初始化流
    this.initLogStream();
  }

  /**
   * 清理旧的日志文件
   */
  private cleanOldLogs() {
    const files = fs.readdirSync(this.config.logDir)
      .filter(file => file.startsWith('app-') && file.endsWith('.log'))
      .map(file => ({
        name: file,
        path: path.join(this.config.logDir, file),
        time: fs.statSync(path.join(this.config.logDir, file)).mtime.getTime(),
      }))
      .sort((a, b) => b.time - a.time);

    // 删除超过限制的文件
    if (files.length > this.config.maxFiles) {
      files.slice(this.config.maxFiles).forEach(file => {
        fs.unlinkSync(file.path);
      });
    }
  }

  /**
   * 格式化日志消息
   */
  private formatMessage(level: LogLevel, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const pid = process.pid;
    
    let formattedMessage = `[${timestamp}] [${level}] [PID:${pid}] ${message}`;
    
    if (meta) {
      if (meta instanceof Error) {
        formattedMessage += `\n  Error: ${meta.message}`;
        if (meta.stack) {
          formattedMessage += `\n  Stack: ${meta.stack}`;
        }
      } else {
        formattedMessage += `\n  Meta: ${JSON.stringify(meta, null, 2)}`;
      }
    }
    
    return formattedMessage;
  }

  /**
   * 写入日志
   */
  private write(level: LogLevel, message: string, meta?: any) {
    const formattedMessage = this.formatMessage(level, message, meta);
    
    // 输出到控制台
    if (this.config.enableConsole) {
      switch (level) {
        case LogLevel.ERROR:
          console.error(formattedMessage);
          break;
        case LogLevel.WARN:
          console.warn(formattedMessage);
          break;
        case LogLevel.INFO:
          console.log(formattedMessage);
          break;
        case LogLevel.DEBUG:
          console.debug(formattedMessage);
          break;
      }
    }
    
    // 写入文件
    if (this.config.enableFile && this.logStream) {
      // 检查是否需要切换到新的日志文件（日期变化）
      const newLogFile = this.getLogFileName();
      if (newLogFile !== this.currentLogFile) {
        this.currentLogFile = newLogFile;
        this.logStream.end();
        this.initLogStream();
      }
      
      // 检查文件大小
      if (fs.existsSync(this.currentLogFile)) {
        const stats = fs.statSync(this.currentLogFile);
        if (stats.size >= this.config.maxFileSize) {
          this.rotateLog();
        }
      }
      
      this.logStream.write(formattedMessage + '\n');
    }
  }

  /**
   * 记录错误日志
   */
  error(message: string, error?: Error | any) {
    this.write(LogLevel.ERROR, message, error);
  }

  /**
   * 记录警告日志
   */
  warn(message: string, meta?: any) {
    this.write(LogLevel.WARN, message, meta);
  }

  /**
   * 记录信息日志
   */
  info(message: string, meta?: any) {
    this.write(LogLevel.INFO, message, meta);
  }

  /**
   * 记录调试日志
   */
  debug(message: string, meta?: any) {
    if (process.env.NODE_ENV === 'development') {
      this.write(LogLevel.DEBUG, message, meta);
    }
  }

  /**
   * 记录HTTP请求日志
   */
  logRequest(req: any, res: any, responseTime: number) {
    const message = `${req.method} ${req.originalUrl} - ${res.statusCode} - ${responseTime}ms`;
    const meta = {
      ip: req.ip,
      userAgent: req.get('user-agent'),
      body: req.body,
      query: req.query,
      params: req.params,
    };
    
    if (res.statusCode >= 400) {
      this.error(message, meta);
    } else {
      this.info(message, meta);
    }
  }

  /**
   * 记录任务日志（用于PDF/HTML生成等任务）
   */
  logTask(jobId: string, status: 'start' | 'progress' | 'complete' | 'error', message: string, meta?: any) {
    const taskMessage = `[Task:${jobId}] [${status.toUpperCase()}] ${message}`;
    
    switch (status) {
      case 'error':
        this.error(taskMessage, meta);
        break;
      case 'complete':
        this.info(taskMessage, meta);
        break;
      default:
        this.debug(taskMessage, meta);
    }
  }

  /**
   * 关闭日志流
   */
  close() {
    if (this.logStream) {
      this.logStream.end();
      this.logStream = null;
    }
  }
}

// 创建默认logger实例
const logger = new Logger({
  enableFile: process.env.NODE_ENV === 'production' || process.env.ENABLE_LOG_FILE === 'true',
  enableConsole: process.env.NODE_ENV !== 'test',
});

// 导出logger实例和类
export { logger, Logger };

// 全局错误处理
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception', error);
  // 给日志一些时间写入
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Rejection', { reason, promise });
});

// 优雅关闭
process.on('SIGINT', () => {
  logger.info('Received SIGINT, closing logger...');
  logger.close();
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, closing logger...');
  logger.close();
});