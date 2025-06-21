import { Router } from 'express';
import os from 'os';
import { performance } from 'perf_hooks';

const router = Router();

// 基础健康检查
router.get('/status', (req, res) => {
  const uptime = process.uptime();
  const timestamp = new Date().toISOString();
  
  res.json({
    status: 'healthy',
    timestamp,
    uptime: `${Math.floor(uptime / 60)}分${Math.floor(uptime % 60)}秒`,
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
  });
});

// 详细系统信息
router.get('/health', (req, res) => {
  const startTime = performance.now();
  
  const healthInfo = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    system: {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      totalMemory: `${Math.round(os.totalmem() / 1024 / 1024)}MB`,
      freeMemory: `${Math.round(os.freemem() / 1024 / 1024)}MB`,
      cpuCount: os.cpus().length,
      loadAverage: os.loadavg(),
    },
    process: {
      pid: process.pid,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
    },
    environment: process.env.NODE_ENV || 'development',
  };
  
  const endTime = performance.now();
  
  res.json({
    ...healthInfo,
    responseTime: `${(endTime - startTime).toFixed(2)}ms`,
  });
});

export default router; 