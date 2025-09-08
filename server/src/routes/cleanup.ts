import { Router } from 'express';
import { getCleanupService } from '../services/fileCleanupService';

const router = Router();

/**
 * 获取清理服务状态
 */
router.get('/status', (req, res) => {
  try {
    const cleanupService = getCleanupService();
    const stats = cleanupService.getStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || '获取清理服务状态失败'
    });
  }
});

/**
 * 手动触发清理
 */
router.post('/trigger', async (req, res) => {
  try {
    const cleanupService = getCleanupService();
    
    // 异步执行清理，立即返回响应
    cleanupService.cleanNow().catch(err => {
      console.error('手动清理失败:', err);
    });
    
    res.json({
      success: true,
      message: '清理任务已触发，正在后台执行'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || '触发清理失败'
    });
  }
});

/**
 * 更新清理配置
 */
router.put('/config', (req, res) => {
  try {
    const { maxAge, interval, enabled } = req.body;
    const cleanupService = getCleanupService();
    
    const config: any = {};
    if (typeof maxAge === 'number') config.maxAge = maxAge;
    if (typeof interval === 'number') config.interval = interval;
    if (typeof enabled === 'boolean') config.enabled = enabled;
    
    cleanupService.updateConfig(config);
    const stats = cleanupService.getStats();
    
    res.json({
      success: true,
      message: '配置已更新',
      data: stats
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || '更新配置失败'
    });
  }
});

export default router;