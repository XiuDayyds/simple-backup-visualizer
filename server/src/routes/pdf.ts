import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { generatePDF } from '../services/pdfGeneratorOptimized';
import { generateHTML } from '../services/htmlGenerator';
import { generateHTMLOptimized } from '../services/htmlGeneratorOptimized';
import { processMedia, cleanupMedia } from '../services/mediaProcessor';
import { processMediaOptimized, cleanupMediaOptimized } from '../services/mediaProcessorOptimized';
import { validateDiaryData } from '../utils/dataValidator';
import { emitComplete } from './progress';
import { ProgressManager } from '../utils/progressManager';

const router = Router();

// 配置multer用于文件上传
const upload = multer({
  dest: path.join(__dirname, '../../temp'),
  limits: {
    fileSize: 50 * 1024 * 1024, // 增加到50MB以支持大文件
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/json') {
      cb(null, true);
    } else {
      cb(new Error('只支持JSON文件'));
    }
  },
});

// 验证JSON文件
router.post('/validate', upload.single('diaryFile'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '未找到上传的文件',
      });
    }

    // 读取并解析JSON文件
    const fileContent = fs.readFileSync(req.file.path, 'utf-8');
    const jsonData = JSON.parse(fileContent);

    // 验证数据结构
    const validationResult = validateDiaryData(jsonData);
    
    // 清理临时文件
    fs.unlinkSync(req.file.path);

    if (validationResult.isValid) {
      res.json({
        success: true,
        message: '数据验证成功',
        data: validationResult.statistics,
      });
    } else {
      res.status(400).json({
        success: false,
        message: validationResult.error,
        details: validationResult.details,
      });
    }
  } catch (error) {
    // 清理临时文件
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    console.error('验证文件时出错:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '文件验证失败',
    });
  }
});

// 预览日记数据
router.post('/preview', upload.single('diaryFile'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '未找到上传的文件',
      });
    }

    // 读取并解析JSON文件
    const fileContent = fs.readFileSync(req.file.path, 'utf-8');
    const jsonData = JSON.parse(fileContent);

    // 验证数据结构
    const validationResult = validateDiaryData(jsonData);
    
    // 清理临时文件
    fs.unlinkSync(req.file.path);

    if (!validationResult.isValid) {
      return res.status(400).json({
        success: false,
        message: validationResult.error,
        details: validationResult.details,
      });
    }

    // 返回处理后的数据预览（限制条目数量）
    const previewData = jsonData.slice(0, 10); // 只返回前10条作为预览
    
    res.json({
      success: true,
      message: '数据预览成功',
      data: {
        preview: previewData,
        total: jsonData.length,
        statistics: validationResult.statistics,
      },
    });
  } catch (error) {
    // 清理临时文件
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    console.error('预览文件时出错:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '文件预览失败',
    });
  }
});

// 生成PDF
router.post('/generate-pdf', upload.single('diaryFile'), async (req: Request, res: Response) => {
  // Use client-provided jobId if available, otherwise generate one
  const jobId = req.body.jobId || uuidv4();
  
  // Send jobId immediately so client can subscribe to progress
  res.setHeader('X-Job-ID', jobId);
  
  // Initialize progress manager at the beginning
  let progressManager: ProgressManager | null = null;
  
  try {
    console.log(`开始处理PDF生成请求: ${jobId}`);
    
    if (!req.file) {
      console.error(`${jobId}: 未找到上传的文件`);
      return res.status(400).json({
        success: false,
        message: '未找到上传的文件',
      });
    }

    console.log(`${jobId}: 文件已上传到 ${req.file.path}`);

    // 解析选项
    let options: { includeImages?: boolean; [key: string]: any } = {};
    try {
      options = req.body.options ? JSON.parse(req.body.options) : {};
      console.log(`${jobId}: 解析选项成功`, options);
    } catch (error) {
      console.error(`${jobId}: 解析选项失败`, error);
      // 继续使用默认选项
    }
    
    // 读取并解析JSON文件
    console.log(`${jobId}: 读取JSON文件内容`);
    let fileContent, jsonData;
    try {
      fileContent = fs.readFileSync(req.file.path, 'utf-8');
      jsonData = JSON.parse(fileContent);
      console.log(`${jobId}: JSON解析成功，包含${jsonData.length}条记录`);
    } catch (error) {
      console.error(`${jobId}: JSON解析失败`, error);
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: '无效的JSON文件',
        error: error instanceof Error ? error.message : '未知错误',
      });
    }

    // Create progress manager after we know the data size
    progressManager = new ProgressManager(jobId, jsonData.length);
    
    // Start with validation stage
    progressManager.nextStage('validate');
    
    // 验证数据结构
    console.log(`${jobId}: 验证数据结构`);
    const validationResult = validateDiaryData(jsonData);
    
    if (!validationResult.isValid) {
      console.error(`${jobId}: 数据验证失败`, validationResult.error);
      // 清理临时文件
      fs.unlinkSync(req.file.path);
      if (progressManager) {
        progressManager.complete(false);
        progressManager.destroy();
      }
      return res.status(400).json({
        success: false,
        message: validationResult.error,
        details: validationResult.details,
      });
    }
    
    progressManager.completeStage();
    console.log(`${jobId}: 数据验证成功，开始处理PDF生成任务`);
    
    // Process stage for media
    progressManager.nextStage('process');

    // 处理媒体文件（图片和音频）- 使用优化版本
    let processedData = jsonData;
    if (options.includeImages !== false || options.includeAudio !== false) {
      console.log(`${jobId}: 开始处理媒体文件...`);
      try {
        processedData = await processMediaOptimized(jsonData, jobId, progressManager);
        console.log(`${jobId}: 媒体文件处理成功`);
      } catch (error) {
        console.error(`${jobId}: 媒体文件处理失败`, error);
        // 继续使用原始数据
        processedData = jsonData;
      }
    }
    
    progressManager.completeStage();

    // 生成PDF
    console.log(`${jobId}: 开始生成PDF...`);
    let pdfPath;
    try {
      // The generatePDF will handle generate and finalize stages
      pdfPath = await generatePDF(processedData, options, jobId, progressManager);
      console.log(`${jobId}: PDF生成成功: ${pdfPath}`);
    } catch (error) {
      console.error(`${jobId}: PDF生成失败`, error);
      // 清理临时文件
      fs.unlinkSync(req.file.path);
      if (progressManager) {
        progressManager.complete(false);
        progressManager.destroy();
      }
      return res.status(500).json({
        success: false,
        message: '生成PDF时出错',
        error: error instanceof Error ? error.message : '未知错误',
      });
    }
    
    // 生成下载文件名
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `diary-${timestamp}-${jobId.slice(0, 8)}.pdf`;
    const outputPath = path.join(__dirname, '../../output', filename);
    
    console.log(`${jobId}: 移动PDF文件到输出目录: ${outputPath}`);
    
    // 移动PDF文件到输出目录
    try {
      fs.renameSync(pdfPath, outputPath);
      console.log(`${jobId}: 文件移动成功`);
    } catch (error) {
      console.error(`${jobId}: 文件移动失败`, error);
      // 清理临时文件
      fs.unlinkSync(req.file.path);
      return res.status(500).json({
        success: false,
        message: '移动PDF文件时出错',
        error: error instanceof Error ? error.message : '未知错误',
      });
    }
    
    // 清理临时文件
    fs.unlinkSync(req.file.path);
    
    // 清理媒体文件 - 使用优化版本
    try {
      await cleanupMediaOptimized(jobId);
    } catch (cleanupError) {
      console.warn(`${jobId}: 清理媒体文件失败`, cleanupError);
      // 不影响主流程
    }
    
    console.log(`${jobId}: PDF生成完成: ${filename}`);
    
    // Complete the progress manager
    if (progressManager) {
      progressManager.complete(true);
      progressManager.destroy();
    }
    
    // Emit completion event
    const result = {
      success: true,
      message: 'PDF生成成功',
      downloadUrl: `/downloads/${filename}`,
      filename: filename,
      outputFormat: 'pdf',
      jobId: jobId,
    };
    
    emitComplete(jobId, true, result);
    
    res.json(result);

  } catch (error) {
    // Clean up progress manager on error
    if (progressManager) {
      progressManager.complete(false);
      progressManager.destroy();
    }
    
    // 清理临时文件
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    console.error(`PDF生成失败 (${jobId}):`, error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'PDF生成失败',
      stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined,
    });
  }
});

// 下载PDF文件
router.get('/download/:filename', (req: Request, res: Response) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, '../../output', filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      success: false,
      message: '文件不存在或已过期',
    });
  }
  
  // 设置下载头
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  
  // 发送文件
  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
  
  fileStream.on('end', () => {
    console.log(`文件下载完成: ${filename}`);
  });
  
  fileStream.on('error', (error) => {
    console.error(`文件下载失败: ${filename}`, error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: '文件下载失败',
      });
    }
  });
});

// 清理临时文件
router.post('/cleanup', (req: Request, res: Response) => {
  try {
    const tempDir = path.join(__dirname, '../../temp');
    const outputDir = path.join(__dirname, '../../output');
    
    // 清理超过24小时的临时文件
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24小时
    
    [tempDir, outputDir].forEach(dir => {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
          const filePath = path.join(dir, file);
          const stats = fs.statSync(filePath);
          if (now - stats.mtime.getTime() > maxAge) {
            fs.unlinkSync(filePath);
            console.log(`清理过期文件: ${filePath}`);
          }
        });
      }
    });
    
    res.json({
      success: true,
      message: '清理完成',
    });
  } catch (error) {
    console.error('清理文件时出错:', error);
    res.status(500).json({
      success: false,
      message: '清理失败',
    });
  }
});

// 生成HTML
router.post('/generate-html', upload.single('diaryFile'), async (req: Request, res: Response) => {
  // Use client-provided jobId if available, otherwise generate one
  const jobId = req.body.jobId || uuidv4();
  
  // Send jobId immediately so client can subscribe to progress
  res.setHeader('X-Job-ID', jobId);
  
  // Initialize progress manager at the beginning
  let progressManager: ProgressManager | null = null;
  
  try {
    console.log(`开始处理HTML生成请求: ${jobId}`);
    
    if (!req.file) {
      console.error(`${jobId}: 未找到上传的文件`);
      return res.status(400).json({
        success: false,
        message: '未找到上传的文件',
      });
    }

    console.log(`${jobId}: 文件已上传到 ${req.file.path}`);

    // 解析选项
    let options: { includeImages?: boolean; [key: string]: any } = {};
    try {
      options = req.body.options ? JSON.parse(req.body.options) : {};
      console.log(`${jobId}: 解析选项成功`, options);
    } catch (error) {
      console.error(`${jobId}: 解析选项失败`, error);
      // 继续使用默认选项
    }
    
    // 读取并解析JSON文件
    console.log(`${jobId}: 读取JSON文件内容`);
    let fileContent, jsonData;
    try {
      fileContent = fs.readFileSync(req.file.path, 'utf-8');
      jsonData = JSON.parse(fileContent);
      console.log(`${jobId}: JSON解析成功，包含${jsonData.length}条记录`);
    } catch (error) {
      console.error(`${jobId}: JSON解析失败`, error);
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: '无效的JSON文件',
        error: error instanceof Error ? error.message : '未知错误',
      });
    }

    // Create progress manager after we know the data size
    progressManager = new ProgressManager(jobId, jsonData.length);
    
    // Start with validation stage
    progressManager.nextStage('validate');
    
    // 验证数据结构
    console.log(`${jobId}: 验证数据结构`);
    const validationResult = validateDiaryData(jsonData);
    
    if (!validationResult.isValid) {
      console.error(`${jobId}: 数据验证失败`, validationResult.error);
      fs.unlinkSync(req.file.path);
      if (progressManager) {
        progressManager.complete(false);
        progressManager.destroy();
      }
      return res.status(400).json({
        success: false,
        message: validationResult.error,
        details: validationResult.details,
      });
    }

    progressManager.completeStage();
    console.log(`${jobId}: 数据验证成功，开始处理HTML生成任务`);

    // Process stage for media
    progressManager.nextStage('process');
    
    // 处理媒体文件（图片和音频）- 使用优化版本
    let processedData = jsonData;
    if (options.includeImages !== false || options.includeAudio !== false) {
      console.log(`${jobId}: 开始处理媒体文件...`);
      try {
        processedData = await processMediaOptimized(jsonData, jobId, progressManager);
        console.log(`${jobId}: 媒体文件处理成功`);
      } catch (error) {
        console.error(`${jobId}: 媒体文件处理失败`, error);
        // 继续使用原始数据
        processedData = jsonData;
      }
    }
    
    progressManager.completeStage();

    // 生成HTML - 使用优化版本
    console.log(`${jobId}: 开始生成HTML...`);
    let htmlPath;
    try {
      // The generateHTMLOptimized will handle generate and finalize stages
      htmlPath = await generateHTMLOptimized(processedData, options, jobId, progressManager);
      console.log(`${jobId}: HTML生成成功: ${htmlPath}`);
    } catch (error) {
      console.error(`${jobId}: HTML生成失败`, error);
      fs.unlinkSync(req.file.path);
      if (progressManager) {
        progressManager.complete(false);
        progressManager.destroy();
      }
      return res.status(500).json({
        success: false,
        message: '生成HTML时出错',
        error: error instanceof Error ? error.message : '未知错误',
      });
    }
    
    // 生成下载文件名
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `diary-${timestamp}-${jobId.slice(0, 8)}.html`;
    const outputPath = path.join(__dirname, '../../output', filename);
    
    console.log(`${jobId}: 移动HTML文件到输出目录: ${outputPath}`);
    
    // 移动HTML文件到输出目录
    try {
      fs.renameSync(htmlPath, outputPath);
      console.log(`${jobId}: 文件移动成功`);
    } catch (error) {
      console.error(`${jobId}: 文件移动失败`, error);
      fs.unlinkSync(req.file.path);
      return res.status(500).json({
        success: false,
        message: '移动HTML文件时出错',
        error: error instanceof Error ? error.message : '未知错误',
      });
    }
    
    // 清理临时文件
    fs.unlinkSync(req.file.path);
    
    // 清理媒体文件 - 使用优化版本
    try {
      await cleanupMediaOptimized(jobId);
    } catch (cleanupError) {
      console.warn(`${jobId}: 清理媒体文件失败`, cleanupError);
      // 不影响主流程
    }
    
    console.log(`${jobId}: HTML生成完成: ${filename}`);
    
    // Complete the progress manager
    if (progressManager) {
      progressManager.complete(true);
      progressManager.destroy();
    }
    
    // Emit completion event
    const result = {
      success: true,
      message: 'HTML生成成功',
      downloadUrl: `/downloads/${filename}`,
      filename: filename,
      outputFormat: 'html',
      jobId: jobId,
    };
    
    emitComplete(jobId, true, result);
    
    res.json(result);

  } catch (error) {
    // Clean up progress manager on error
    if (progressManager) {
      progressManager.complete(false);
      progressManager.destroy();
    }
    
    // 清理临时文件
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    console.error(`HTML生成失败 (${jobId}):`, error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'HTML生成失败',
      stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined,
    });
  }
});

export default router; 