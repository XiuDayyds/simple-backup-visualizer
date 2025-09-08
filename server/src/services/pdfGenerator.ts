import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { validatePDFOptions } from '../utils/dataValidator';

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

export async function generatePDF(
  diaryData: DiaryEntry[],
  options: any,
  jobId: string
): Promise<string> {
  console.log(`开始生成PDF任务: ${jobId}`);
  
  // 验证输入数据
  if (!Array.isArray(diaryData) || diaryData.length === 0) {
    throw new Error('输入数据无效或为空');
  }
  
  // 验证选项
  const validatedOptions = validatePDFOptions(options);
  
  // 处理数据
  const processedData = processDiaryData(diaryData);
  if (processedData.length === 0) {
    throw new Error('处理后的有效数据为空');
  }
  const groupedData = groupByMonth(processedData);
  
  // 生成HTML内容
  console.log(`${jobId}: 开始生成HTML内容...`);
  console.log(`${jobId}: 处理数据条数: ${processedData.length}, 月份分组数: ${Object.keys(groupedData).length}`);
  
  let htmlContent;
  try {
    htmlContent = generateHTML(processedData, groupedData, validatedOptions);
    console.log(`${jobId}: HTML内容生成完成，长度: ${htmlContent.length} 字符`);
    
    // 验证HTML基本结构
    if (!htmlContent.includes('<html') || !htmlContent.includes('</html>')) {
      throw new Error('HTML结构不完整');
    }
  } catch (error) {
    console.error(`${jobId}: HTML生成失败`, error);
    // 生成简化版HTML作为后备
    htmlContent = generateSimpleHTML(processedData, validatedOptions);
    console.log(`${jobId}: 使用简化HTML，长度: ${htmlContent.length} 字符`);
  }
  
  // 使用Puppeteer生成PDF
  console.log(`${jobId}: 启动Puppeteer浏览器...`);
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
    ],
  });

  try {
    console.log(`${jobId}: 创建新页面...`);
    const page = await browser.newPage();
    
    // 设置页面尺寸
    await page.setViewport({ width: 1200, height: 800 });
    
    console.log(`${jobId}: 设置页面内容，HTML长度: ${htmlContent.length} 字符`);
    
    // 设置页面内容
    try {
      await page.setContent(htmlContent, { 
        waitUntil: 'domcontentloaded',
        timeout: 60000 
      });
      console.log(`${jobId}: HTML内容设置成功`);
    } catch (error) {
      console.error(`${jobId}: 设置HTML内容失败`, error);
      throw error;
    }
    
    // 设置页面格式
    const format = getPageFormat(validatedOptions.pageSize);
    console.log(`${jobId}: 使用页面格式: ${format}`);
    
    // 生成PDF
    const outputPath = path.join(__dirname, '../../temp', `diary-${jobId}.pdf`);
    console.log(`${jobId}: 开始生成PDF到: ${outputPath}`);
    
    try {
      await page.pdf({
        path: outputPath,
        format: format as any,
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm',
        },
        displayHeaderFooter: false, // 暂时禁用页眉页脚，避免潜在问题
      });
      
      // 检查文件是否成功生成
      if (fs.existsSync(outputPath)) {
        const stats = fs.statSync(outputPath);
        console.log(`${jobId}: PDF生成成功，文件大小: ${stats.size} 字节`);
        
        if (stats.size === 0) {
          throw new Error('PDF文件生成成功但内容为空');
        }
      } else {
        throw new Error('PDF文件生成失败，文件不存在');
      }
      
    } catch (error) {
      console.error(`${jobId}: PDF生成过程中出错`, error);
      throw error;
    }
    
    console.log(`${jobId}: PDF生成完成: ${outputPath}`);
    return outputPath;
    
  } catch (error) {
    console.error(`${jobId}: Puppeteer处理过程中出错`, error);
    throw error;
  } finally {
    console.log(`${jobId}: 关闭浏览器`);
    await browser.close();
  }
}

function processDiaryData(data: DiaryEntry[]): DiaryEntry[] {
  return data
    .filter(entry => entry && entry.date) // 过滤无效数据
    .map(entry => ({
      ...entry,
      formattedDate: formatDate(entry.date),
      yearMonth: getYearMonth(entry.date),
      // 确保album和tags字段为数组
      album: Array.isArray(entry.album) ? entry.album : [],
      tags: Array.isArray(entry.tags) ? entry.tags : [],
    }))
    .sort((a, b) => {
      try {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      } catch (error) {
        return 0;
      }
    });
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

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      return dateString || '日期无效';
    }
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch (error) {
    console.warn('PDF日期格式化失败:', dateString, error);
    return dateString || '日期无效';
  }
}

function getYearMonth(dateString: string): string {
  try {
    const date = new Date(dateString);
    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      return 'unknown';
    }
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
  } catch (error) {
    console.warn('PDF获取年月失败:', dateString, error);
    return 'unknown';
  }
}

function getYearMonthTitle(yearMonth: string): string {
  try {
    const [year, month] = yearMonth.split('-');
    return `${year}年${parseInt(month)}月`;
  } catch (error) {
    return yearMonth;
  }
}

function getPageFormat(pageSize: string) {
  const formats: Record<string, string> = {
    'A4': 'A4',
    'A5': 'A5',
    'Letter': 'Letter',
  };
  return formats[pageSize] || 'A4';
}

function generateSimpleHTML(data: DiaryEntry[], options: any): string {
  // PDF生成器只支持浅色主题
  
  // 安全地转义HTML内容
  const escapeHtml = (unsafe: string) => {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const entries = data.map(entry => {
    let content = '';
    if (entry.content) {
      content = escapeHtml(entry.content);
    } else {
      content = `<em style="color: #666;">此条记录包含多媒体内容</em>`;
    }

    // 添加媒体信息
    let mediaInfo = '';
    if (entry.album && Array.isArray(entry.album) && entry.album.length > 0) {
      const images = entry.album.filter(item => item && item.type === 'image');
      const videos = entry.album.filter(item => item && item.type === 'video');
      
      if (images.length > 0) {
        mediaInfo += `<p style="color: #0066cc; font-size: 0.8rem; margin-top: 0.5rem;">📷 包含 ${images.length} 张图片</p>`;
      }
      if (videos.length > 0) {
        mediaInfo += `<p style="color: #0066cc; font-size: 0.8rem; margin-top: 0.25rem;">🎬 包含 ${videos.length} 个视频</p>`;
      }
    }
    if (entry.audioInfo) {
      mediaInfo += `<p style="color: #0066cc; font-size: 0.8rem; margin-top: 0.25rem;">🎵 音频: ${escapeHtml(entry.audioInfo.filename)} (${escapeHtml(entry.audioInfo.size)})</p>`;
    } else if (entry.audio) {
      mediaInfo += `<p style="color: #0066cc; font-size: 0.8rem; margin-top: 0.25rem;">🎵 包含音频文件</p>`;
    }

    return `
      <div style="margin-bottom: 2rem; padding: 1rem; border: 1px solid #ddd; border-radius: 8px; background: #ffffff;">
        <h3 style="color: #333; margin-bottom: 0.5rem;">${entry.formattedDate || formatDate(entry.date)}</h3>
        ${entry.collection ? `<p style="color: #666; font-size: 0.9rem; margin-bottom: 0.5rem;">分类: ${escapeHtml(entry.collection)}</p>` : ''}
        <div style="line-height: 1.6; color: #374151;">${content}</div>
        ${mediaInfo}
        ${entry.tags && entry.tags.length > 0 ? `<p style="color: #888; font-size: 0.8rem; margin-top: 0.5rem;">标签: ${entry.tags.map(tag => escapeHtml(tag)).join(', ')}</p>` : ''}
      </div>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>${options.title || '我的日记'}</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
      max-width: 800px; 
      margin: 0 auto; 
      padding: 2rem; 
      background: #ffffff;
      color: #374151;
    }
    h1 { 
      text-align: center; 
      color: #333; 
      margin-bottom: 2rem; 
    }
    h2 { 
      color: #555; 
      border-bottom: 2px solid #eee; 
      padding-bottom: 0.5rem; 
    }
  </style>
</head>
<body>
  <h1>${options.title || '我的日记'}</h1>
  <p style="text-align: center; color: #666; margin-bottom: 3rem;">生成于 ${new Date().toLocaleDateString('zh-CN')} | 共 ${data.length} 条记录</p>
  ${entries}
</body>
</html>`;
}

function generateHTML(
  data: DiaryEntry[],
  groupedData: Record<string, DiaryEntry[]>,
  options: any
): string {
  // PDF生成器只支持浅色主题
  
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options.title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    /* CSS变量定义 - 浅色主题 */
    :root {
      --text-color: #374151;
      --bg-color: #ffffff;
      --border-color: #e5e7eb;
      --card-bg: #ffffff;
      --secondary-bg: #f9fafb;
      --accent-color: #3b82f6;
      --muted-color: #6b7280;
      --heading-color: #111827;
      --subtle-border: #f3f4f6;
      --hover-color: #3b82f6;
      --info-bg: #f9fafb;
      --info-text: #4b5563;
      --tag-bg: #e5e7eb;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: var(--text-color);
      background: var(--bg-color);
    }
    
    .cover-page {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      min-height: 80vh;
      text-align: center;
      border-bottom: 1px solid var(--border-color);
      page-break-after: always;
    }
    
    .cover-title {
      font-size: 3rem;
      font-weight: bold;
      margin-bottom: 2rem;
      color: var(--heading-color);
    }
    
    .cover-subtitle {
      font-size: 1.2rem;
      color: var(--muted-color);
      margin-bottom: 1rem;
    }
    
    .cover-stats {
      margin-top: 3rem;
      font-size: 0.9rem;
      color: var(--muted-color);
    }
    
    .toc {
      page-break-after: always;
      padding: 2rem 0;
    }
    
    .toc-title {
      font-size: 2rem;
      font-weight: bold;
      margin-bottom: 2rem;
      text-align: center;
      color: var(--heading-color);
    }
    
    .toc-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0;
      border-bottom: 1px dotted var(--border-color);
      text-decoration: none;
      color: inherit;
    }
    
    .toc-item:hover {
      color: var(--hover-color);
    }
    
    .toc-month {
      font-weight: 500;
    }
    
    .toc-count {
      color: var(--muted-color);
      font-size: 0.9rem;
    }
    
    .month-section {
      page-break-before: always;
      margin-bottom: 3rem;
    }
    
    .month-title {
      font-size: 1.8rem;
      font-weight: bold;
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 2px solid var(--border-color);
      color: var(--heading-color);
    }
    
    .diary-entry {
      margin-bottom: 2.5rem;
      padding: 1.5rem;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      background: var(--card-bg);
      break-inside: avoid;
    }
    
    .entry-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--subtle-border);
    }
    
    .entry-date {
      font-weight: 600;
      font-size: 1.1rem;
      color: var(--accent-color);
    }
    
    .entry-collection {
      background: var(--secondary-bg);
      color: var(--muted-color);
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
    }
    
    .entry-content {
      margin-bottom: 1rem;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    
    .entry-images {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin: 1rem 0;
    }
    
    .entry-image {
      max-width: 100%;
      border-radius: 4px;
      border: 1px solid var(--border-color);
    }
    
    .entry-audio {
      background: var(--info-bg);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 1rem;
      margin: 1rem 0;
      font-size: 0.9rem;
    }
    
    .audio-header {
      font-weight: 600;
      color: var(--accent-color);
      margin-bottom: 0.5rem;
      font-size: 1rem;
    }
    
    .audio-info {
      color: var(--info-text);
    }
    
    .audio-filename {
      font-weight: 500;
      margin-bottom: 0.25rem;
      color: var(--heading-color);
    }
    
    .audio-details {
      display: flex;
      gap: 1rem;
      margin-bottom: 0.25rem;
      font-size: 0.8rem;
    }
    
    .audio-size, .audio-format {
      background: var(--tag-bg);
      padding: 0.125rem 0.375rem;
      border-radius: 3px;
      font-size: 0.75rem;
    }
    
    .audio-url {
      font-size: 0.75rem;
      color: var(--muted-color);
      word-break: break-all;
      margin-top: 0.25rem;
    }
    
    .entry-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 1rem;
    }
    
    .tag {
      background: var(--secondary-bg);
      color: var(--muted-color);
      padding: 0.25rem 0.5rem;
      border-radius: 12px;
      font-size: 0.8rem;
      border: 1px solid var(--border-color);
    }
    
    .tag::before {
      content: "#";
    }
    
    @media print {
      .cover-page, .month-section {
        page-break-before: always;
      }
      .diary-entry {
        break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  ${generateCoverPage(data, options)}
  ${generateTableOfContents(groupedData)}
  ${generateContent(groupedData, options)}
</body>
</html>
  `;
}

function generateCoverPage(data: DiaryEntry[], options: any): string {
  const totalEntries = data.length;
  const withImages = data.filter(e => e.album && e.album.length > 0).length;
  const withAudio = data.filter(e => e.audio || e.audioInfo).length;
  const withContent = data.filter(e => e.content && e.content.trim()).length;
  
  // 安全地获取日期范围
  let dateRange = null;
  if (data.length > 0) {
    const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    dateRange = {
      earliest: sortedData[0].formattedDate || formatDate(sortedData[0].date),
      latest: sortedData[sortedData.length - 1].formattedDate || formatDate(sortedData[sortedData.length - 1].date),
    };
  }

  return `
    <div class="cover-page">
      <h1 class="cover-title">${options.title || '我的日记'}</h1>
      ${options.author ? `<p class="cover-subtitle">作者：${options.author}</p>` : ''}
      <p class="cover-subtitle">生成于 ${new Date().toLocaleDateString('zh-CN')}</p>
      
      <div class="cover-stats">
        <p>总计 ${totalEntries} 条记录</p>
        ${withContent > 0 ? `<p>文字记录 ${withContent} 条</p>` : ''}
        ${withImages > 0 ? `<p>包含图片 ${withImages} 条</p>` : ''}
        ${withAudio > 0 ? `<p>包含音频 ${withAudio} 条</p>` : ''}
        ${dateRange ? `<p>时间跨度：${dateRange.earliest} 至 ${dateRange.latest}</p>` : ''}
      </div>
    </div>
  `;
}

function generateTableOfContents(groupedData: Record<string, DiaryEntry[]>): string {
  const months = Object.keys(groupedData).sort().reverse();
  
  const tocItems = months.map(month => {
    const count = groupedData[month].length;
    const title = getYearMonthTitle(month);
    return `
      <div class="toc-item">
        <span class="toc-month">${title}</span>
        <span class="toc-count">${count} 条记录</span>
      </div>
    `;
  }).join('');

  return `
    <div class="toc">
      <h2 class="toc-title">目录</h2>
      ${tocItems}
    </div>
  `;
}

function generateContent(groupedData: Record<string, DiaryEntry[]>, options: any): string {
  const months = Object.keys(groupedData).sort().reverse();
  
  return months.map(month => {
    const entries = groupedData[month];
    const title = getYearMonthTitle(month);
    
    const entryHTML = entries.map(entry => generateEntryHTML(entry, options)).join('');
    
    return `
      <div class="month-section">
        <h2 class="month-title">${title}</h2>
        ${entryHTML}
      </div>
    `;
  }).join('');
}

function generateEntryHTML(entry: DiaryEntry, options: any): string {
  // 安全地转义HTML内容
  const escapeHtml = (unsafe: string) => {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  let html = `
    <article class="diary-entry">
      <header class="entry-header">
        <div class="entry-date">${entry.formattedDate || '日期未知'}</div>
        ${entry.collection && options.includeCollections ? 
          `<div class="entry-collection">${escapeHtml(entry.collection)}</div>` : 
          ''
        }
      </header>`;

  // 添加内容
  if (entry.content) {
    html += `<div class="entry-content">${escapeHtml(entry.content)}</div>`;
  } else if ((entry.album && entry.album.length > 0) || entry.audio) {
    let mediaDescription = '此条记录仅包含';
    if (entry.album && entry.album.length > 0) {
      mediaDescription += '图片';
    }
    if (entry.album && entry.album.length > 0 && entry.audio) {
      mediaDescription += '和';
    }
    if (entry.audio) {
      mediaDescription += '音频';
    }
    mediaDescription += '内容';
    
    html += `<div class="entry-content" style="color: var(--muted-color); font-style: italic;">${mediaDescription}</div>`;
  }

  // 添加图片
  if (entry.album && entry.album.length > 0 && options.includeImages) {
    const images = entry.album
      .filter(item => item.type === 'image')
      .map(item => `<img src="${escapeHtml(item.url)}" alt="日记图片" class="entry-image">`)
      .join('');
    
    if (images) {
      html += `<div class="entry-images">${images}</div>`;
    }

    // 添加视频链接（PDF中视频无法播放，显示为链接）
    const videos = entry.album.filter(item => item.type === 'video');
    if (videos.length > 0) {
      const videoLinks = videos.map((item, index) => 
        `<p style="margin: 0.5rem 0;"><a href="${escapeHtml(item.url)}" target="_blank" style="color: var(--accent-color); text-decoration: underline;">🎬 视频文件 ${index + 1}</a></p>`
      ).join('');
      
      html += `<div style="background: var(--info-bg); border: 1px solid var(--border-color); border-radius: 6px; padding: 1rem; margin: 1rem 0;">
        <div style="font-weight: 600; color: var(--heading-color); margin-bottom: 0.5rem;">📹 视频内容 (${videos.length}个)</div>
        ${videoLinks}
        <p style="font-size: 0.8rem; color: var(--muted-color); margin-top: 0.5rem;">💡 点击链接在浏览器中播放视频</p>
      </div>`;
    }
  }

  // 添加音频
  if (entry.audio && options.includeAudio) {
    if (entry.audioInfo) {
      // 显示详细的音频信息
      html += `
        <div class="entry-audio">
          <div class="audio-header">🎵 音频文件</div>
          <div class="audio-info">
            <div class="audio-filename">文件名：${escapeHtml(entry.audioInfo.filename)}</div>
            <div class="audio-details">
              <span class="audio-size">大小：${escapeHtml(entry.audioInfo.size)}</span>
              <span class="audio-format">格式：${escapeHtml(entry.audioInfo.format || '未知')}</span>
            </div>
            <div class="audio-url">
          <a href="${escapeHtml(entry.audioInfo.originalUrl)}" target="_blank" style="color: var(--accent-color); text-decoration: underline;">
            🔗 点击播放音频
          </a>
        </div>
          </div>
        </div>
      `;
    } else {
      // 显示基本音频信息
      html += `<div class="entry-audio">
        🎵 音频文件：<a href="${escapeHtml(entry.audio)}" target="_blank" style="color: var(--accent-color); text-decoration: underline;">🔗 点击播放</a>
      </div>`;
    }
  }

  // 添加标签
  if (entry.tags && entry.tags.length > 0 && options.includeTags) {
    const tags = entry.tags
      .map(tag => `<span class="tag">${escapeHtml(tag)}</span>`)
      .join('');
    html += `<div class="entry-tags">${tags}</div>`;
  }

  html += `</article>`;
  return html;
} 