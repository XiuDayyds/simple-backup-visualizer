import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// 导入路由
import pdfRoutes from './routes/pdf';
import healthRoutes from './routes/health';
import progressRoutes from './routes/progress';
import cleanupRoutes from './routes/cleanup';

// 导入日志系统
import { logger } from './utils/logger';
import { requestLogger, errorLogger } from './middleware/requestLogger';

// 导入文件清理服务
import { getCleanupService } from './services/fileCleanupService';

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 安全中间件
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS配置
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com'] 
    : ['http://localhost:5173', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control'],
  credentials: true,
  exposedHeaders: ['X-Job-ID'], // Expose custom headers
}));

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 每个IP最多100个请求
  message: {
    error: '请求过于频繁，请稍后再试',
    retryAfter: '15分钟'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', limiter);

// 基础中间件
app.use(compression());
app.use(morgan('combined'));
app.use(requestLogger); // 添加请求日志中间件
app.use(express.json({ limit: '50mb' })); // 增加到50MB以支持大文件
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 创建必要的目录
const uploadsDir = path.join(__dirname, '../uploads');
const outputDir = path.join(__dirname, '../output');
const tempDir = path.join(__dirname, '../temp');

[uploadsDir, outputDir, tempDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// 静态文件服务
app.use('/downloads', express.static(outputDir));

// API路由
app.use('/api/status', healthRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/cleanup', cleanupRoutes);
app.use('/api', pdfRoutes);

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    error: '接口不存在',
    message: `路径 ${req.originalUrl} 未找到`,
  });
});

// 全局错误处理
app.use(errorLogger);

// 初始化文件清理服务
const cleanupService = getCleanupService({
  outputDir: outputDir,
  tempDir: tempDir,
  maxAge: parseInt(process.env.CLEANUP_MAX_AGE || '1800000'), // 默认30分钟
  interval: parseInt(process.env.CLEANUP_INTERVAL || '300000'), // 默认5分钟检查一次
  enabled: process.env.CLEANUP_ENABLED !== 'false' // 默认启用
});

// 优雅关闭
process.on('SIGTERM', () => {
  logger.info('收到SIGTERM信号，正在关闭服务器...');
  cleanupService.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('收到SIGINT信号，正在关闭服务器...');
  cleanupService.stop();
  process.exit(0);
});

// 启动服务器
app.listen(PORT, () => {
  logger.info(`🚀 服务器运行在端口 ${PORT}`);
  logger.info(`📁 上传目录: ${uploadsDir}`);
  logger.info(`📄 输出目录: ${outputDir}`);
  logger.info(`🗂️  临时目录: ${tempDir}`);
  logger.info(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`📋 日志文件开启: ${process.env.ENABLE_LOG_FILE === 'true' ? '是' : '否'}`);
  
  // 启动文件清理服务
  cleanupService.start();
});

export default app; 