import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { validatePDFOptions } from '../utils/dataValidator';
import { 
  processBatch, 
  StringBuilder, 
  logMemoryUsage,
  checkSystemResources,
  withTimeout
} from '../utils/performanceOptimizer';
import { ProgressManager } from '../utils/progressManager';
import { emitProgress } from '../routes/progress';

interface DiaryEntry {
  date: string;
  content?: string;
  collection?: string;
  album?: Array<{ type: string; url: string }>;
  audio?: string;
  audioInfo?: {
    originalUrl: string;
    filename: string;
    size: string;
    duration?: string;
    format?: string;
  };
  tags?: string[];
  formattedDate?: string;
  yearMonth?: string;
}

// 配置常量
const CONFIG = {
  BATCH_SIZE: 100, // 每批处理的记录数
  MAX_HTML_LENGTH: 50 * 1024 * 1024, // 最大HTML长度 50MB
  PAGE_TIMEOUT: 120000, // 页面加载超时 2分钟
  PDF_TIMEOUT: 300000, // PDF生成超时 5分钟
  MAX_ENTRIES_PER_PDF: 1000, // 每个PDF最多包含的记录数
};

export async function generatePDF(
  diaryData: DiaryEntry[],
  options: any,
  jobId: string,
  progressManager?: ProgressManager
): Promise<string> {
  console.log(`[${jobId}] 开始优化版PDF生成，数据条数: ${diaryData.length}`);
  logMemoryUsage(`${jobId} - 开始`);
  
  // Create progress manager if not provided
  const shouldDestroyProgress = !progressManager;
  if (!progressManager) {
    progressManager = new ProgressManager(jobId, diaryData.length);
    progressManager.nextStage('validate');
  }
  
  // 检查系统资源
  const resourceCheck = checkSystemResources();
  if (!resourceCheck.canProceed) {
    console.warn(`[${jobId}] 系统资源警告:`, resourceCheck.warnings);
  }
  
  // 验证选项
  const validatedOptions = validatePDFOptions(options);
  
  if (progressManager) {
    progressManager.completeStage();
    progressManager.nextStage('process');
  }
  
  // 如果数据量过大，进行分页处理
  if (diaryData.length > CONFIG.MAX_ENTRIES_PER_PDF) {
    console.log(`[${jobId}] 数据量过大，将分批生成多个PDF`);
    return await generateMultiplePDFs(diaryData, validatedOptions, jobId);
  }
  
  // 处理数据
  const processedData = await processDiaryDataOptimized(diaryData, jobId);
  const groupedData = groupByMonth(processedData);
  
  // 生成HTML内容（使用优化的方法）
  console.log(`[${jobId}] 开始生成优化的HTML内容...`);
  const htmlContent = await generateHTMLOptimized(processedData, groupedData, validatedOptions, jobId);
  
  logMemoryUsage(`${jobId} - HTML生成完成`);
  
  // 使用Puppeteer生成PDF
  console.log(`[${jobId}] 启动Puppeteer浏览器...`);
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--max-old-space-size=4096', // 增加内存限制
    ],
  });

  try {
    console.log(`[${jobId}] 创建新页面...`);
    const page = await browser.newPage();
    
    // 设置更大的视口尺寸
    await page.setViewport({ width: 1200, height: 800 });
    
    // 禁用不必要的资源加载（提高性能）
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const resourceType = request.resourceType();
      // 跳过外部资源加载（如果HTML中有外部图片等）
      if (['image', 'stylesheet', 'font'].includes(resourceType) && 
          request.url().startsWith('http')) {
        request.abort();
      } else {
        request.continue();
      }
    });
    
    console.log(`[${jobId}] 设置页面内容...`);
    
    // 设置页面内容（增加超时时间）
    await withTimeout(
      page.setContent(htmlContent, { 
        waitUntil: 'networkidle0',
        timeout: CONFIG.PAGE_TIMEOUT 
      }),
      CONFIG.PAGE_TIMEOUT,
      `页面加载超时（${CONFIG.PAGE_TIMEOUT}ms）`
    );
    
    console.log(`[${jobId}] HTML内容设置成功`);
    
    // 设置页面格式
    const format = getPageFormat(validatedOptions.pageSize);
    
    // 生成PDF
    const outputPath = path.join(__dirname, '../../temp', `diary-${jobId}.pdf`);
    console.log(`[${jobId}] 开始生成PDF...`);
    
    await withTimeout(
      page.pdf({
        path: outputPath,
        format: format as any,
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm',
        },
        displayHeaderFooter: false,
        preferCSSPageSize: true,
      }),
      CONFIG.PDF_TIMEOUT,
      `PDF生成超时（${CONFIG.PDF_TIMEOUT}ms）`
    );
    
    // 验证文件
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      console.log(`[${jobId}] PDF生成成功，文件大小: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
      
      if (stats.size === 0) {
        throw new Error('PDF文件为空');
      }
    } else {
      throw new Error('PDF文件未生成');
    }
    
    logMemoryUsage(`${jobId} - 完成`);
    return outputPath;
    
  } catch (error) {
    console.error(`[${jobId}] PDF生成失败:`, error);
    throw error;
  } finally {
    console.log(`[${jobId}] 关闭浏览器`);
    await browser.close();
  }
}

/**
 * 生成多个PDF（用于处理大量数据）
 */
async function generateMultiplePDFs(
  diaryData: DiaryEntry[],
  options: any,
  jobId: string
): Promise<string> {
  const pdfPaths: string[] = [];
  const totalBatches = Math.ceil(diaryData.length / CONFIG.MAX_ENTRIES_PER_PDF);
  
  console.log(`[${jobId}] 将生成 ${totalBatches} 个PDF文件`);
  
  for (let i = 0; i < totalBatches; i++) {
    const start = i * CONFIG.MAX_ENTRIES_PER_PDF;
    const end = Math.min(start + CONFIG.MAX_ENTRIES_PER_PDF, diaryData.length);
    const batch = diaryData.slice(start, end);
    
    console.log(`[${jobId}] 处理批次 ${i + 1}/${totalBatches}，记录 ${start + 1}-${end}`);
    
    const batchJobId = `${jobId}-batch-${i + 1}`;
    const pdfPath = await generatePDFOptimized(batch, options, batchJobId);
    pdfPaths.push(pdfPath);
  }
  
  // 返回第一个PDF路径（或者可以考虑合并PDF）
  console.log(`[${jobId}] 所有批次完成，生成了 ${pdfPaths.length} 个PDF文件`);
  return pdfPaths[0];
}

/**
 * 优化的数据处理
 */
async function processDiaryDataOptimized(
  data: DiaryEntry[],
  jobId: string
): Promise<DiaryEntry[]> {
  console.log(`[${jobId}] 开始批量处理数据...`);
  
  // 分批处理数据，避免一次性处理过多数据
  const processed = await processBatch(
    data,
    CONFIG.BATCH_SIZE,
    async (batch) => {
      return batch.map(entry => ({
        ...entry,
        formattedDate: formatDate(entry.date),
        yearMonth: getYearMonth(entry.date),
      }));
    }
  );
  
  // 排序
  processed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  return processed;
}

/**
 * 优化的HTML生成
 */
async function generateHTMLOptimized(
  data: DiaryEntry[],
  groupedData: Record<string, DiaryEntry[]>,
  options: any,
  jobId: string
): Promise<string> {
  const builder = new StringBuilder();
  
  // HTML头部
  builder.append(generateHTMLHeader(options));
  
  // 分批生成内容
  const months = Object.keys(groupedData).sort().reverse();
  let entryCount = 0;
  
  for (const month of months) {
    const entries = groupedData[month];
    
    // 月份标题
    builder.append(`<div class="month-section" id="${month}">`);
    builder.append(`<h2 class="month-title">${formatMonthTitle(month)}</h2>`);
    builder.append('<div class="entries-container">');
    
    // 分批处理条目
    const entryBatches = [];
    for (let i = 0; i < entries.length; i += 10) {
      entryBatches.push(entries.slice(i, i + 10));
    }
    
    for (const batch of entryBatches) {
      for (const entry of batch) {
        builder.append(generateSimpleEntryHTML(entry, options));
        entryCount++;
        
        // 定期检查HTML大小
        if (entryCount % 100 === 0) {
          const currentLength = builder.getLength();
          if (currentLength > CONFIG.MAX_HTML_LENGTH) {
            console.warn(`[${jobId}] HTML超过最大长度限制，截断处理`);
            break;
          }
        }
      }
    }
    
    builder.append('</div></div>');
  }
  
  // HTML尾部
  builder.append(generateHTMLFooter());
  
  return builder.toString();
}

/**
 * 生成简化的条目HTML（减少复杂度）
 */
function generateSimpleEntryHTML(entry: DiaryEntry, options: any): string {
  const html = new StringBuilder();
  
  html.append('<div class="entry">');
  html.append(`<div class="entry-date">${entry.formattedDate || entry.date}</div>`);
  
  if (entry.tags && entry.tags.length > 0) {
    html.append('<div class="entry-tags">');
    entry.tags.forEach(tag => {
      html.append(`<span class="tag">${escapeHtml(tag)}</span>`);
    });
    html.append('</div>');
  }
  
  if (entry.collection) {
    html.append(`<div class="entry-collection">📁 ${escapeHtml(entry.collection)}</div>`);
  }
  
  if (entry.content) {
    html.append(`<div class="entry-content">${escapeHtml(entry.content).replace(/\n/g, '<br>')}</div>`);
  }
  
  // 简化的媒体处理
  if (entry.album && entry.album.length > 0 && options.includeImages !== false) {
    html.append('<div class="entry-album">');
    entry.album.slice(0, 6).forEach(item => { // 限制最多显示6个
      if (item.type === 'image') {
        html.append(`<div class="album-item">[图片]</div>`);
      } else if (item.type === 'video') {
        html.append(`<div class="album-item">[视频]</div>`);
      }
    });
    html.append('</div>');
  }
  
  if (entry.audio) {
    html.append('<div class="entry-audio">[音频]</div>');
  }
  
  html.append('</div>');
  
  return html.toString();
}

// 辅助函数
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return dateString;
  }
}

function getYearMonth(dateString: string): string {
  try {
    const date = new Date(dateString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  } catch {
    return 'unknown';
  }
}

function groupByMonth(data: DiaryEntry[]): Record<string, DiaryEntry[]> {
  const grouped: Record<string, DiaryEntry[]> = {};
  
  data.forEach(entry => {
    const yearMonth = entry.yearMonth || 'unknown';
    if (!grouped[yearMonth]) {
      grouped[yearMonth] = [];
    }
    grouped[yearMonth].push(entry);
  });
  
  return grouped;
}

function formatMonthTitle(yearMonth: string): string {
  if (yearMonth === 'unknown') return '未知日期';
  
  const [year, month] = yearMonth.split('-');
  return `${year}年${parseInt(month)}月`;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

function getPageFormat(pageSize: string): string {
  const formats: Record<string, string> = {
    'A4': 'A4',
    'A3': 'A3',
    'Letter': 'Letter',
    'Legal': 'Legal',
  };
  return formats[pageSize] || 'A4';
}

function generateHTMLHeader(options: any): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options.title || '我的日记'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.6;
      color: #333;
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
    }
    .month-section { margin-bottom: 40px; }
    .month-title { 
      font-size: 24px; 
      color: #2c3e50;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #3498db;
    }
    .entry { 
      background: #f8f9fa;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 15px;
      page-break-inside: avoid;
    }
    .entry-date { 
      font-size: 14px;
      color: #7f8c8d;
      margin-bottom: 10px;
    }
    .entry-tags { margin-bottom: 10px; }
    .tag {
      display: inline-block;
      background: #3498db;
      color: white;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      margin-right: 5px;
    }
    .entry-collection {
      color: #9b59b6;
      font-size: 14px;
      margin-bottom: 10px;
    }
    .entry-content {
      color: #2c3e50;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .entry-album {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 10px;
    }
    .album-item {
      background: #ecf0f1;
      padding: 5px 10px;
      border-radius: 4px;
      font-size: 12px;
      color: #7f8c8d;
    }
    .entry-audio {
      margin-top: 10px;
      color: #e74c3c;
      font-size: 14px;
    }
    @media print {
      body { padding: 0; }
      .entry { page-break-inside: avoid; }
    }
  </style>
</head>
<body>`;
}

function generateHTMLFooter(): string {
  return `
  <div style="text-align: center; margin-top: 50px; color: #7f8c8d; font-size: 14px;">
    <p>Generated by Simple备份文件可视化工具</p>
    <p>${new Date().toLocaleString('zh-CN')}</p>
  </div>
</body>
</html>`;
}

// 导出优化版本
export { generatePDFOptimized as generatePDF };