/**
 * HTTP请求日志中间件
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * 请求日志中间件
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  
  // 记录请求开始
  logger.debug(`Incoming request: ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
    body: req.body,
    query: req.query,
    params: req.params,
  });
  
  // 保存原始的end方法
  const originalEnd = res.end;
  
  // 重写end方法以记录响应
  res.end = function(...args: any[]): Response {
    // 恢复原始方法
    res.end = originalEnd;
    
    // 调用原始方法
    const result = res.end.apply(res, args as any);
    
    // 计算响应时间
    const responseTime = Date.now() - startTime;
    
    // 记录请求完成
    logger.logRequest(req, res, responseTime);
    
    return result;
  } as any;
  
  next();
}

/**
 * 错误日志中间件
 */
export function errorLogger(err: Error, req: Request, res: Response, next: NextFunction) {
  // 生成错误ID
  const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // 记录详细错误信息
  logger.error(`Request error [${errorId}]: ${err.message}`, {
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name,
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      body: req.body,
      query: req.query,
      params: req.params,
    },
  });
  
  // 在开发环境返回错误详情
  if (process.env.NODE_ENV === 'development') {
    res.status(500).json({
      success: false,
      error: '服务器内部错误',
      errorId,
      message: err.message,
      stack: err.stack,
    });
  } else {
    // 生产环境只返回错误ID
    res.status(500).json({
      success: false,
      error: '服务器内部错误',
      errorId,
      message: '请联系管理员并提供错误ID',
    });
  }
}