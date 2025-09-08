import path from 'path';
import fs from 'fs';
import { validatePDFOptions } from '../utils/dataValidator';
import { emitProgress } from '../routes/progress';
import { ProgressManager } from '../utils/progressManager';
import { DateCache } from '../utils/dateCache';
import { HtmlBuilder, escapeHtml } from '../utils/htmlBuilder';

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
  music?: string;
  tags?: string[];
  formattedDate?: string;
  yearMonth?: string;
}

// Global date cache instance
const dateCache = new DateCache();

export async function generateHTMLOptimized(
  diaryData: DiaryEntry[],
  options: any,
  jobId: string,
  progressManager?: ProgressManager
): Promise<string> {
  console.log(`${jobId}: 开始生成HTML文档（优化版）...`);
  
  // Use provided progress manager or create a new one
  const shouldDestroyProgress = !progressManager;
  if (!progressManager) {
    progressManager = new ProgressManager(jobId, diaryData.length);
    progressManager.nextStage('validate');
  }
  
  try {
    // Validation stage
    if (shouldDestroyProgress) {
      if (!Array.isArray(diaryData) || diaryData.length === 0) {
        throw new Error('输入数据无效或为空');
      }
      
      const validatedOptions = validatePDFOptions(options);
      progressManager.completeStage();
      progressManager.nextStage('process');
    } else {
      var validatedOptions = validatePDFOptions(options);
    }
    
    // Generation stage
    progressManager.nextStage('generate');
    console.log(`${jobId}: 处理和生成HTML内容（优化版）...`);
    
    // Process data with optimizations
    const processedData = processDiaryDataOptimized(diaryData);
    if (processedData.length === 0) {
      throw new Error('处理后的有效数据为空');
    }
    
    progressManager.updateProcessed(processedData.length);
    
    const groupedData = groupByMonthOptimized(processedData);
    
    // Generate HTML content with streaming approach
    const htmlContent = await generateHTMLContentOptimized(
      processedData, 
      groupedData, 
      validatedOptions || options, 
      jobId, 
      progressManager
    );
    
    progressManager.completeStage();
    
    // Finalize stage
    progressManager.nextStage('finalize');
    
    // Save HTML file
    const outputPath = path.join(__dirname, '../../temp', `diary-${jobId}.html`);
    fs.writeFileSync(outputPath, htmlContent, 'utf-8');
    
    if (shouldDestroyProgress) {
      progressManager.complete(true);
    }
    
    console.log(`${jobId}: HTML生成完成（优化版）: ${outputPath}`);
    
    // Clear date cache to free memory
    dateCache.clear();
    
    return outputPath;
    
  } catch (error) {
    if (shouldDestroyProgress && progressManager) {
      progressManager.complete(false);
      progressManager.destroy();
    }
    dateCache.clear();
    throw error;
  }
}

function processDiaryDataOptimized(data: DiaryEntry[]): DiaryEntry[] {
  // Process entries with cached date formatting
  const processed = data
    .filter(entry => entry && entry.date)
    .map(entry => ({
      ...entry,
      formattedDate: dateCache.formatDate(entry.date),
      yearMonth: dateCache.getYearMonth(entry.date),
      album: Array.isArray(entry.album) ? entry.album : [],
      tags: Array.isArray(entry.tags) ? entry.tags : [],
    }));
  
  // Sort using cached timestamps for better performance
  processed.sort((a, b) => {
    const timeA = dateCache.getTimestamp(a.date);
    const timeB = dateCache.getTimestamp(b.date);
    return timeB - timeA;
  });
  
  return processed;
}

function groupByMonthOptimized(data: DiaryEntry[]): Record<string, DiaryEntry[]> {
  const grouped: Record<string, DiaryEntry[]> = {};
  
  for (const entry of data) {
    const yearMonth = entry.yearMonth || 'unknown';
    if (!grouped[yearMonth]) {
      grouped[yearMonth] = [];
    }
    grouped[yearMonth].push(entry);
  }
  
  return grouped;
}

async function generateHTMLContentOptimized(
  data: DiaryEntry[],
  groupedData: Record<string, DiaryEntry[]>,
  options: any,
  jobId: string,
  progressManager?: ProgressManager
): Promise<string> {
  const isDark = options.theme === 'dark';
  const builder = new HtmlBuilder();
  
  // Build HTML header
  builder.appendLine('<!DOCTYPE html>')
    .appendLine('<html lang="zh-CN">')
    .appendLine('<head>')
    .appendLine('  <meta charset="UTF-8">')
    .appendLine('  <meta name="viewport" content="width=device-width, initial-scale=1.0">')
    .appendLine(`  <title>${escapeHtml(options.title || '我的日记')}</title>`)
    .appendLine('  <style>')
    .append(getHTMLStyles(isDark))
    .appendLine('  </style>')
    .appendLine('</head>')
    .appendLine('<body>')
    .appendLine('  <div class="app-container">');
  
  // Add sidebar
  builder.append(generateSidebarOptimized(groupedData));
  
  builder.appendLine('    <div class="main-wrapper">')
    .append(generateTopBarOptimized(options))
    .appendLine('      <div class="content-container">')
    .append(generateCoverPageOptimized(data, options));
  
  // Generate content with progress updates
  const months = Object.keys(groupedData).sort().reverse();
  const totalEntries = data.length;
  let processedEntries = 0;
  
  for (const month of months) {
    const entries = groupedData[month];
    const title = dateCache.getYearMonthTitle(month);
    
    builder.appendLine(`      <section class="month-section" id="month-${month}">`)
      .appendLine(`        <h2 class="month-title">${title}</h2>`);
    
    // Process entries in batches
    const batchSize = 10;
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, Math.min(i + batchSize, entries.length));
      
      for (const entry of batch) {
        builder.append(generateEntryHTMLOptimized(entry, options));
        processedEntries++;
      }
      
      // Update progress less frequently
      if (progressManager && (processedEntries % 20 === 0 || processedEntries === totalEntries)) {
        const progress = 40 + Math.round((processedEntries / totalEntries) * 40);
        progressManager.updateProcessed(processedEntries);
        emitProgress(
          jobId, 
          progress, 
          `生成HTML内容 (${processedEntries}/${totalEntries})`, 
          'generate'
        );
        
        // Small delay to prevent blocking
        await new Promise(resolve => setImmediate(resolve));
      }
    }
    
    builder.appendLine('      </section>');
  }
  
  // Add modal and closing tags
  builder.appendLine('    <!-- 图片模态框 -->')
    .appendLine('    <div id="imageModal" class="modal">')
    .appendLine('      <span class="close" onclick="closeModal()">&times;</span>')
    .appendLine('      <div class="modal-content">')
    .appendLine('        <img id="modalImage" class="modal-image">')
    .appendLine('      </div>')
    .appendLine('    </div>')
    .appendLine('      </div>')
    .appendLine('    </div>')
    .appendLine('  </div>')
    .appendLine('  <script>')
    .append(getJavaScript(options))
    .appendLine('  </script>')
    .appendLine('</body>')
    .appendLine('</html>');
  
  return builder.toString();
}

function generateEntryHTMLOptimized(entry: DiaryEntry, options: any): string {
  if (!entry) return '';
  
  const builder = new HtmlBuilder();
  const hasTextContent = entry.content && entry.content.trim();
  
  builder.appendLine('    <article class="diary-entry">')
    .appendLine('      <header class="entry-header">')
    .appendLine(`        <div class="entry-date">${entry.formattedDate || '日期未知'}</div>`);
  
  if (entry.collection && options.includeCollections) {
    builder.appendLine(`        <div class="entry-collection">${escapeHtml(entry.collection)}</div>`);
  }
  
  builder.appendLine('      </header>');
  
  // Add content
  if (hasTextContent) {
    builder.appendLine(`      <div class="entry-content">${escapeHtml(entry.content || '')}</div>`);
  }
  
  // Add media content
  builder.appendLine('      <div class="entry-media">');
  
  // Add images
  if (entry.album && entry.album.length > 0 && options.includeImages) {
    const images = entry.album.filter(item => 
      item && (item.type === 'image' || item.type === 'live_photo') && item.url && item.url !== ''
    );
    
    if (images.length > 0) {
      builder.appendLine('        <div class="media-section">');
      
      if (hasTextContent) {
        builder.appendLine(`          <div class="media-title">📷 图片 (${images.length})</div>`);
      }
      
      builder.appendLine('          <div class="entry-images">');
      for (const img of images) {
        builder.appendLine('            <div class="image-container">')
          .appendLine(`              <img src="${escapeHtml(img.url)}" alt="日记图片" class="entry-image" loading="lazy">`)
          .appendLine('            </div>');
      }
      builder.appendLine('          </div>')
        .appendLine('        </div>');
    }
    
    // Add videos
    const videos = entry.album.filter(item => 
      item && item.type === 'video' && item.url && item.url !== ''
    );
    
    if (videos.length > 0) {
      builder.appendLine('        <div class="media-section">');
      
      if (hasTextContent) {
        builder.appendLine(`          <div class="media-title">🎬 视频 (${videos.length})</div>`);
      }
      
      builder.appendLine('          <div class="entry-videos">');
      for (const video of videos) {
        const videoUrl = video.url || '';
        let mimeType = 'video/mp4';
        
        if (videoUrl.toLowerCase().endsWith('.webm')) {
          mimeType = 'video/webm';
        } else if (videoUrl.toLowerCase().endsWith('.ogv')) {
          mimeType = 'video/ogg';
        } else if (videoUrl.toLowerCase().endsWith('.mov')) {
          mimeType = 'video/quicktime';
        }
        
        builder.appendLine('            <div class="video-container">')
          .appendLine('              <video controls class="entry-video" preload="metadata">')
          .appendLine(`                <source src="${escapeHtml(videoUrl)}" type="${mimeType}">`)
          .appendLine('                您的浏览器不支持视频播放。')
          .appendLine(`                <a href="${escapeHtml(videoUrl)}" target="_blank">点击这里打开视频链接</a>`)
          .appendLine('              </video>')
          .appendLine('            </div>');
      }
      builder.appendLine('          </div>')
        .appendLine('        </div>');
    }
  }
  
  // Add music share
  if (entry.music) {
    const musicInfo = getMusicLinkTextOptimized(entry.music);
    builder.appendLine('        <div class="media-section">');
    
    if (hasTextContent) {
      builder.appendLine('          <div class="media-title">🎶 音乐分享</div>');
    }
    
    builder.appendLine('          <div class="music-share">')
      .appendLine('            <div class="music-icon">🎵</div>')
      .appendLine('            <div class="music-content">')
      .appendLine(`              <div class="music-platform">${musicInfo.platform}</div>`)
      .appendLine('              <div class="music-link">')
      .appendLine(`                <a href="${escapeHtml(musicInfo.actualUrl)}" target="_blank" rel="noopener noreferrer">`)
      .appendLine(`                  ${escapeHtml(musicInfo.title)}`)
      .appendLine('                </a>')
      .appendLine('              </div>')
      .appendLine('            </div>')
      .appendLine('          </div>')
      .appendLine('        </div>');
  }
  
  // Add audio
  if (entry.audio && options.includeAudio) {
    builder.appendLine('        <div class="media-section">');
    
    if (hasTextContent) {
      builder.appendLine('          <div class="media-title">🎵 音频文件</div>');
    }
    
    builder.appendLine('          <div class="audio-player">')
      .appendLine('            <div class="audio-header">')
      .appendLine('              <div class="audio-icon">♪</div>')
      .appendLine('              <div class="audio-info">');
    
    if (entry.audioInfo) {
      builder.appendLine(`                <div class="audio-filename">${escapeHtml(entry.audioInfo.filename)}</div>`)
        .appendLine('                <div class="audio-meta">')
        .appendLine(`                  <span>大小: ${escapeHtml(entry.audioInfo.size)}</span>`)
        .appendLine(`                  <span>格式: ${escapeHtml(entry.audioInfo.format || '未知')}</span>`)
        .appendLine('                </div>');
    } else {
      builder.appendLine('                <div class="audio-filename">音频文件</div>');
    }
    
    builder.appendLine('              </div>')
      .appendLine('            </div>')
      .appendLine('            <div class="audio-controls">')
      .appendLine('              <audio controls class="audio-element" preload="metadata">');
    
    const audioUrl = entry.audioInfo ? entry.audioInfo.originalUrl : entry.audio;
    builder.appendLine(`                <source src="${escapeHtml(audioUrl)}">`)
      .appendLine('                您的浏览器不支持音频播放。')
      .appendLine(`                <a href="${escapeHtml(audioUrl)}" target="_blank">点击这里打开音频链接</a>`)
      .appendLine('              </audio>')
      .appendLine('            </div>')
      .appendLine('          </div>')
      .appendLine('        </div>');
  }
  
  builder.appendLine('      </div>'); // Close entry-media
  
  // Add tags
  if (entry.tags && entry.tags.length > 0 && options.includeTags) {
    builder.appendLine('      <div class="entry-tags">');
    for (const tag of entry.tags) {
      builder.append(`        <span class="tag">${escapeHtml(tag)}</span>`);
    }
    builder.appendLine('      </div>');
  }
  
  builder.appendLine('    </article>');
  
  return builder.toString();
}

// Optimized helper functions
function generateSidebarOptimized(groupedData: Record<string, DiaryEntry[]>): string {
  const months = Object.keys(groupedData).sort().reverse();
  const yearGroups: Record<string, Array<{month: string, count: number}>> = {};
  
  for (const month of months) {
    const year = month.split('-')[0];
    if (!yearGroups[year]) {
      yearGroups[year] = [];
    }
    yearGroups[year].push({
      month: month,
      count: groupedData[month].length
    });
  }
  
  const builder = new HtmlBuilder();
  
  builder.appendLine('    <div class="sidebar-overlay"></div>')
    .appendLine('    <nav class="sidebar">')
    .appendLine('      <div class="sidebar-header">')
    .appendLine('        <div class="sidebar-title">')
    .appendLine('          <span>📅</span>')
    .appendLine('          <span>目录导航</span>')
    .appendLine('        </div>')
    .appendLine('        <button class="close-sidebar" aria-label="关闭侧边栏">×</button>')
    .appendLine('      </div>')
    .appendLine('      <div class="sidebar-content">');
  
  for (const year of Object.keys(yearGroups).sort().reverse()) {
    builder.appendLine(`        <div class="year-group">`)
      .appendLine(`          <div class="year-title">${year}年</div>`)
      .appendLine('          <div class="month-list">');
    
    for (const item of yearGroups[year]) {
      const title = dateCache.getYearMonthTitle(item.month);
      const monthName = title.replace(/\d+年/, '');
      
      builder.appendLine(`            <a href="#month-${item.month}" class="month-link" onclick="scrollToMonth('month-${item.month}')">`)
        .appendLine(`              <span class="month-name">${monthName}</span>`)
        .appendLine(`              <span class="month-count">${item.count}</span>`)
        .appendLine('            </a>');
    }
    
    builder.appendLine('          </div>')
      .appendLine('        </div>');
  }
  
  builder.appendLine('      </div>')
    .appendLine('    </nav>');
  
  return builder.toString();
}

function generateTopBarOptimized(options: any): string {
  return `
    <header class="top-bar">
      <div class="top-bar-left">
        <button class="menu-btn" aria-label="打开导航菜单">☰</button>
        <h1 class="page-title">${escapeHtml(options.title || '我的日记')}</h1>
      </div>
      <button class="theme-toggle" onclick="toggleTheme()">🌙 深色模式</button>
    </header>
  `;
}

function generateCoverPageOptimized(data: DiaryEntry[], options: any): string {
  const totalEntries = data.length;
  const withImages = data.filter(e => e.album && e.album.length > 0).length;
  const withAudioVideo = data.filter(e => {
    const hasAudio = e.audio || e.audioInfo;
    const hasVideo = e.album && e.album.some(item => item.type === 'video' && item.url && item.url !== '');
    const hasMusic = e.music;
    return hasAudio || hasVideo || hasMusic;
  }).length;
  const withContent = data.filter(e => e.content && e.content.trim()).length;
  
  let dateRange = null;
  if (data.length > 0) {
    const sortedData = [...data].sort((a, b) => 
      dateCache.getTimestamp(a.date) - dateCache.getTimestamp(b.date)
    );
    dateRange = {
      earliest: dateCache.formatDateSimple(sortedData[0].date),
      latest: dateCache.formatDateSimple(sortedData[sortedData.length - 1].date),
    };
  }
  
  const builder = new HtmlBuilder();
  
  builder.appendLine('        <div class="cover-page">')
    .appendLine(`          <h1 class="cover-title">${escapeHtml(options.title || '我的日记')}</h1>`);
  
  if (options.author) {
    builder.appendLine(`          <p class="cover-subtitle">作者：${escapeHtml(options.author)}</p>`);
  }
  
  builder.appendLine(`          <p class="cover-subtitle">生成于 ${new Date().toLocaleDateString('zh-CN')}</p>`)
    .appendLine('          <div class="cover-stats">')
    .appendLine('            <div class="stat-card">')
    .appendLine(`              <div class="stat-number">${totalEntries}</div>`)
    .appendLine('              <div class="stat-label">总条目</div>')
    .appendLine('            </div>')
    .appendLine('            <div class="stat-card">')
    .appendLine(`              <div class="stat-number">${withContent}</div>`)
    .appendLine('              <div class="stat-label">文字记录</div>')
    .appendLine('            </div>')
    .appendLine('            <div class="stat-card">')
    .appendLine(`              <div class="stat-number">${withImages}</div>`)
    .appendLine('              <div class="stat-label">包含图片</div>')
    .appendLine('            </div>')
    .appendLine('            <div class="stat-card">')
    .appendLine(`              <div class="stat-number">${withAudioVideo}</div>`)
    .appendLine('              <div class="stat-label">包含音视频</div>')
    .appendLine('            </div>')
    .appendLine('          </div>');
  
  if (dateRange) {
    builder.appendLine('          <div style="margin-top: 2rem; font-size: 1.1rem; color: #6b7280;">')
      .appendLine(`            <p>时间跨度：${dateRange.earliest} 至 ${dateRange.latest}</p>`)
      .appendLine('          </div>');
  }
  
  builder.appendLine('        </div>');
  
  return builder.toString();
}

function getMusicLinkTextOptimized(musicUrl: string): { platform: string; title: string; actualUrl: string } {
  if (!musicUrl) {
    return { platform: '音乐分享', title: '点击查看', actualUrl: musicUrl };
  }
  
  let actualUrl = musicUrl;
  const urlMatch = musicUrl.match(/(https?:\/\/[^\s]+)/);
  if (urlMatch) {
    actualUrl = urlMatch[1].replace(/[)）]$/, '');
  }
  
  if (musicUrl.includes('163') || musicUrl.includes('网易云')) {
    const titleMatch = musicUrl.match(/分享(.+?)的单曲《(.+?)》/);
    if (titleMatch) {
      return { platform: '网易云音乐', title: `${titleMatch[2]} - ${titleMatch[1]}`, actualUrl };
    }
    if (musicUrl.includes('johari-window')) {
      const userMatch = musicUrl.match(/@(.+?)邀请你/);
      if (userMatch) {
        return { platform: '网易云音乐', title: `${userMatch[1]}的好友印象四格`, actualUrl };
      }
    }
    return { platform: '网易云音乐', title: '点击收听', actualUrl };
  } else if (musicUrl.includes('simple.imsummer.cn')) {
    if (musicUrl.includes('channel')) {
      return { platform: 'Simple频道', title: '查看频道', actualUrl };
    } else if (musicUrl.includes('sharePost')) {
      return { platform: 'Simple动态', title: '查看动态', actualUrl };
    }
    return { platform: 'Simple平台', title: '查看链接', actualUrl };
  } else if (musicUrl.includes('qq.com')) {
    return { platform: 'QQ音乐', title: '点击收听', actualUrl };
  } else if (musicUrl.includes('xiami')) {
    return { platform: '虾米音乐', title: '点击收听', actualUrl };
  } else if (musicUrl.includes('spotify')) {
    return { platform: 'Spotify', title: '点击收听', actualUrl };
  } else if (musicUrl.includes('apple')) {
    return { platform: 'Apple Music', title: '点击收听', actualUrl };
  }
  
  if (musicUrl.includes('分享')) {
    const match = musicUrl.match(/分享(.+?)的/);
    if (match) {
      return { platform: '音乐分享', title: musicUrl.substring(0, 50) + (musicUrl.length > 50 ? '...' : ''), actualUrl };
    }
  }
  
  return { platform: '音乐分享', title: '点击查看', actualUrl };
}

// Reuse the same styles and JavaScript functions
function getHTMLStyles(isDark: boolean): string {
  // Return the same styles as original
  return `
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    /* 主题切换支持 - 统一的CSS变量定义 */
    :root {
      --transition-duration: 0.4s;
      --transition-timing: cubic-bezier(0.4, 0, 0.2, 1);
      --sidebar-width: 280px;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: var(--text-color);
      background: var(--bg-color);
      transition: color var(--transition-duration) var(--transition-timing), 
                  background-color var(--transition-duration) var(--transition-timing);
      overflow-x: hidden;
    }

    /* 默认主题变量（根据初始主题设置） */
    body {
      --text-color: ${isDark ? '#e5e7eb' : '#374151'};
      --bg-color: ${isDark ? '#1f2937' : '#ffffff'};
      --border-color: ${isDark ? '#4b5563' : '#e5e7eb'};
      --card-bg: ${isDark ? '#374151' : '#ffffff'};
      --secondary-bg: ${isDark ? '#374151' : '#f9fafb'};
      --sidebar-bg: ${isDark ? '#111827' : '#ffffff'};
      --sidebar-border: ${isDark ? '#374151' : '#e5e7eb'};
      --accent-color: ${isDark ? '#60a5fa' : '#3b82f6'};
      --muted-color: ${isDark ? '#9ca3af' : '#6b7280'};
      --heading-color: ${isDark ? '#f3f4f6' : '#111827'};
      --hover-bg: ${isDark ? '#4b5563' : '#f3f4f6'};
    }

    /* 深色主题 */
    body.dark-theme {
      --text-color: #e5e7eb;
      --bg-color: #1f2937;
      --border-color: #4b5563;
      --card-bg: #374151;
      --secondary-bg: #374151;
      --sidebar-bg: #111827;
      --sidebar-border: #374151;
      --accent-color: #60a5fa;
      --muted-color: #9ca3af;
      --heading-color: #f3f4f6;
      --hover-bg: #4b5563;
    }

    /* 浅色主题 */
    body.light-theme {
      --text-color: #374151;
      --bg-color: #ffffff;
      --border-color: #e5e7eb;
      --card-bg: #ffffff;
      --secondary-bg: #f9fafb;
      --sidebar-bg: #ffffff;
      --sidebar-border: #e5e7eb;
      --accent-color: #3b82f6;
      --muted-color: #6b7280;
      --heading-color: #111827;
      --hover-bg: #f3f4f6;
    }
    
    /* 为所有使用变量的元素添加过渡效果 */
    * {
      transition: background-color var(--transition-duration) var(--transition-timing),
                  border-color var(--transition-duration) var(--transition-timing),
                  color var(--transition-duration) var(--transition-timing);
    }

    /* 应用主容器 */
    .app-container {
      display: flex;
      min-height: 100vh;
      position: relative;
    }

    /* 侧边栏样式 */
    .sidebar {
      position: fixed;
      left: 0;
      top: 0;
      width: var(--sidebar-width);
      height: 100vh;
      background: var(--sidebar-bg);
      border-right: 1px solid var(--sidebar-border);
      transform: translateX(-100%);
      transition: transform var(--transition-duration) var(--transition-timing);
      z-index: 1000;
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: var(--muted-color) transparent;
    }

    .sidebar::-webkit-scrollbar {
      width: 6px;
    }

    .sidebar::-webkit-scrollbar-track {
      background: transparent;
    }

    .sidebar::-webkit-scrollbar-thumb {
      background: var(--muted-color);
      border-radius: 3px;
    }

    .sidebar.open {
      transform: translateX(0);
    }

    .sidebar-header {
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      background: var(--sidebar-bg);
      z-index: 10;
      height: 72px;
    }

    .sidebar-title {
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--heading-color);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .close-sidebar {
      background: none;
      border: none;
      font-size: 1.5rem;
      color: var(--muted-color);
      cursor: pointer;
      padding: 0.25rem;
      border-radius: 4px;
      transition: all var(--transition-duration) var(--transition-timing);
    }

    .close-sidebar:hover {
      background: var(--hover-bg);
      color: var(--text-color);
    }

    .sidebar-content {
      padding: 1rem;
    }

    .year-group {
      margin-bottom: 1.5rem;
    }

    .year-title {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--muted-color);
      margin-bottom: 0.75rem;
      padding-left: 0.5rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .month-list {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .month-link {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem;
      color: var(--text-color);
      text-decoration: none;
      border-radius: 8px;
      transition: all var(--transition-duration) var(--transition-timing);
      font-size: 0.9rem;
    }

    .month-link:hover {
      background: var(--hover-bg);
      transform: translateX(4px);
    }

    .month-link.active {
      background: var(--accent-color);
      color: white;
    }

    .month-name {
      font-weight: 500;
    }

    .month-count {
      background: var(--secondary-bg);
      color: var(--muted-color);
      padding: 0.25rem 0.5rem;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 500;
    }

    .month-link:hover .month-count,
    .month-link.active .month-count {
      background: rgba(255, 255, 255, 0.2);
      color: white;
    }

    /* 主内容区域 */
    .main-wrapper {
      flex: 1;
      margin-left: var(--sidebar-width);
      transition: margin-left var(--transition-duration) var(--transition-timing);
    }

    .main-wrapper.sidebar-closed {
      margin-left: 0;
    }

    /* 顶部导航栏 */
    .top-bar {
      position: sticky;
      top: 0;
      background: var(--bg-color);
      border-bottom: 1px solid var(--border-color);
      padding: 1rem 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 100;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      height: 72px;
    }

    .top-bar-left {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .menu-btn {
      background: none;
      border: none;
      font-size: 1.25rem;
      color: var(--text-color);
      cursor: pointer;
      padding: 0.5rem;
      border-radius: 6px;
      transition: all var(--transition-duration) var(--transition-timing);
    }

    .menu-btn:hover {
      background: var(--hover-bg);
      transform: scale(1.05);
    }

    .page-title {
      font-size: 1.2rem;
      font-weight: 600;
      color: var(--heading-color);
    }

    .theme-toggle {
      background: var(--secondary-bg);
      border: 1px solid var(--border-color);
      color: var(--text-color);
      padding: 0.6rem 1.2rem;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      font-size: 0.85rem;
      transition: all var(--transition-duration) var(--transition-timing);
    }
    
    .theme-toggle:hover {
      background: var(--accent-color);
      color: white;
      border-color: var(--accent-color);
      transform: scale(1.02);
    }

    /* 内容容器 */
    .content-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 1.5rem;
    }

    /* 侧边栏遮罩层 */
    .sidebar-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      opacity: 0;
      visibility: hidden;
      transition: all var(--transition-duration) var(--transition-timing);
      z-index: 999;
    }

    .sidebar-overlay.show {
      opacity: 1;
      visibility: visible;
    }

    /* 封面样式 */
    .cover-page {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      min-height: 80vh;
      text-align: center;
      border-bottom: 2px solid var(--border-color);
      margin-bottom: 2rem;
    }
    
    .cover-title {
      font-size: 3.5rem;
      font-weight: 700;
      margin-bottom: 2rem;
      color: var(--heading-color);
    }
    
    .cover-subtitle {
      font-size: 1.4rem;
      color: var(--muted-color);
      margin-bottom: 1rem;
    }
    
    .cover-stats {
      margin-top: 3rem;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      width: 100%;
      max-width: 600px;
    }
    
    .stat-card {
      background: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 1.5rem;
      text-align: center;
      transition: all var(--transition-duration) var(--transition-timing);
    }
    
    .stat-card:hover {
      border-color: var(--accent-color);
      transform: translateY(-2px);
    }
    
    .stat-number {
      font-size: 2rem;
      font-weight: bold;
      color: var(--accent-color);
    }
    
    .stat-label {
      font-size: 0.9rem;
      color: var(--muted-color);
      margin-top: 0.5rem;
    }

    /* 内容区域 */
    .month-section {
      margin: 4rem 0;
      scroll-margin-top: 100px;
    }
    
    .month-title {
      font-size: 2.2rem;
      font-weight: 700;
      margin-bottom: 2rem;
      padding: 1rem 0;
      border-bottom: 3px solid var(--accent-color);
      color: var(--heading-color);
      position: relative;
    }
    
    .month-title::before {
      content: '';
      position: absolute;
      left: 0;
      bottom: -3px;
      width: 80px;
      height: 3px;
      background: #f59e0b;
    }
    
    .diary-entry {
      margin-bottom: 3rem;
      background: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 2rem;
      transition: all var(--transition-duration) var(--transition-timing);
    }
    
    .diary-entry:hover {
      border-color: var(--accent-color);
      transform: translateY(-1px);
    }
    
    .entry-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--border-color);
    }
    
    .entry-date {
      font-weight: 600;
      font-size: 1.2rem;
      color: var(--accent-color);
    }
    
    .entry-collection {
      background: var(--secondary-bg);
      color: var(--muted-color);
      padding: 0.375rem 0.75rem;
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 500;
    }
    
    .entry-content {
      margin-bottom: 1.5rem;
      white-space: pre-wrap;
      word-wrap: break-word;
      font-size: 1.1rem;
      line-height: 1.7;
    }
    
    .entry-media {
      margin: 2rem 0;
    }
    
    .media-section {
      margin-bottom: 2rem;
    }
    
    .media-title {
      font-size: 1.1rem;
      font-weight: 600;
      margin-bottom: 1rem;
      color: var(--heading-color);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    /* 图片展示 */
    .entry-images {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1rem;
    }
    
    .image-container {
      position: relative;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid var(--border-color);
      cursor: pointer;
      transition: all var(--transition-duration) var(--transition-timing);
    }
    
    .image-container:hover {
      transform: scale(1.02);
      border-color: var(--accent-color);
    }
    
    .entry-image {
      width: 100%;
      height: auto;
      display: block;
    }

    /* 视频展示 */
    .entry-videos {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 1rem;
    }
    
    .video-container {
      position: relative;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid var(--border-color);
      background: var(--secondary-bg);
    }
    
    .entry-video {
      width: 100%;
      height: auto;
      display: block;
      border-radius: 8px;
      max-height: 400px;
    }
    
    /* 音乐分享样式 */
    .music-share {
      background: var(--secondary-bg);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 1.5rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      transition: all var(--transition-duration) var(--transition-timing);
    }
    
    .music-share:hover {
      border-color: var(--accent-color);
      transform: translateY(-1px);
    }
    
    .music-icon {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      flex-shrink: 0;
    }
    
    .music-content {
      flex: 1;
      min-width: 0;
    }
    
    .music-platform {
      font-size: 0.85rem;
      color: var(--muted-color);
      margin-bottom: 0.5rem;
    }
    
    .music-link a {
      color: var(--accent-color);
      text-decoration: none;
      font-weight: 500;
      font-size: 1.1rem;
      transition: all var(--transition-duration) var(--transition-timing);
    }
    
    .music-link a:hover {
      color: var(--heading-color);
      text-decoration: underline;
    }

    /* 音频播放器 */
    .audio-player {
      background: var(--secondary-bg);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 1.5rem;
      transition: all var(--transition-duration) var(--transition-timing);
    }
    
    .audio-player:hover {
      border-color: var(--accent-color);
    }
    
    .audio-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1rem;
    }
    
    .audio-icon {
      width: 48px;
      height: 48px;
      background: var(--accent-color);
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      font-weight: bold;
      flex-shrink: 0;
    }
    
    .audio-info {
      flex: 1;
      min-width: 0;
    }
    
    .audio-filename {
      font-weight: 600;
      color: var(--heading-color);
      margin-bottom: 0.5rem;
      word-break: break-all;
    }
    
    .audio-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      font-size: 0.85rem;
      color: var(--muted-color);
    }
    
    .audio-controls {
      width: 100%;
    }
    
    .audio-element {
      width: 100%;
      height: 42px;
      border-radius: 8px;
      outline: none;
    }

    .audio-element:focus {
      outline: 2px solid var(--accent-color);
      outline-offset: 2px;
    }
    
    /* 标签 */
    .entry-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 1.5rem;
    }
    
    .tag {
      background: var(--secondary-bg);
      color: var(--muted-color);
      padding: 0.375rem 0.75rem;
      border-radius: 8px;
      font-size: 0.8rem;
      border: 1px solid var(--border-color);
      transition: all var(--transition-duration) var(--transition-timing);
    }
    
    .tag:hover {
      background: var(--accent-color);
      color: white;
      border-color: var(--accent-color);
      transform: scale(1.02);
    }
    
    .tag::before {
      content: "#";
      opacity: 0.7;
    }
    
    /* 图片模态框 */
    .modal {
      display: none;
      position: fixed;
      z-index: 1000;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.9);
    }
    
    .modal-content {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      max-width: 90%;
      max-height: 90%;
    }
    
    .modal-image {
      width: 100%;
      height: auto;
      border-radius: 8px;
    }
    
    .close {
      position: absolute;
      top: 20px;
      right: 30px;
      color: white;
      font-size: 40px;
      font-weight: bold;
      cursor: pointer;
    }
    
    .close:hover {
      opacity: 0.7;
    }
    
    /* 响应式设计 */
    @media (max-width: 768px) {
      :root {
        --sidebar-width: 300px;
      }

      .content-container {
        padding: 0 1rem;
      }

      .main-wrapper {
        margin-left: 0 !important;
      }

      .main-wrapper.sidebar-closed {
        margin-left: 0 !important;
      }
      
      .cover-title {
        font-size: 2.5rem;
      }
      
      .cover-stats {
        grid-template-columns: 1fr;
        gap: 0.75rem;
      }

      .top-bar {
        padding: 0.75rem 1rem;
      }

      .page-title {
        font-size: 1.1rem;
      }

      .theme-toggle {
        padding: 0.5rem 1rem;
        font-size: 0.8rem;
      }
      
      .entry-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
      }
      
      .entry-images {
        grid-template-columns: 1fr;
      }

      .entry-videos {
        grid-template-columns: 1fr;
      }
    }
    
    /* 平滑滚动 */
    html {
      scroll-behavior: smooth;
    }
    
    /* 加载动画 */
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .diary-entry {
      animation: fadeIn 0.6s ease-out;
    }

    /* 特殊的过渡处理 */
    .nav-item, .theme-toggle, .tag, .diary-entry, .image-container, .stat-card, .audio-player, .month-link {
      transition: all var(--transition-duration) var(--transition-timing);
    }
  `;
}

function getJavaScript(options: any): string {
  const initialTheme = options.theme || 'light';
  return `
    // 侧边栏控制
    function toggleSidebar() {
      const sidebar = document.querySelector('.sidebar');
      const mainWrapper = document.querySelector('.main-wrapper');
      const overlay = document.querySelector('.sidebar-overlay');
      
      sidebar.classList.toggle('open');
      if (window.innerWidth <= 768) {
        overlay.classList.toggle('show');
      } else {
        mainWrapper.classList.toggle('sidebar-closed');
      }
    }

    function closeSidebar() {
      const sidebar = document.querySelector('.sidebar');
      const mainWrapper = document.querySelector('.main-wrapper');
      const overlay = document.querySelector('.sidebar-overlay');
      
      sidebar.classList.remove('open');
      overlay.classList.remove('show');
      if (window.innerWidth <= 768) {
      } else {
        mainWrapper.classList.add('sidebar-closed');
      }
    }

    function openSidebar() {
      const sidebar = document.querySelector('.sidebar');
      const mainWrapper = document.querySelector('.main-wrapper');
      const overlay = document.querySelector('.sidebar-overlay');
      
      sidebar.classList.add('open');
      if (window.innerWidth <= 768) {
        overlay.classList.add('show');
      } else {
        mainWrapper.classList.remove('sidebar-closed');
      }
    }

    // 更新活跃的月份导航项
    function updateActiveNav() {
      const monthSections = document.querySelectorAll('.month-section');
      const navLinks = document.querySelectorAll('.month-link');
      
      const scrollTop = window.pageYOffset;
      const windowHeight = window.innerHeight;
      
      let activeSection = null;
      
      monthSections.forEach(section => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= windowHeight / 2 && rect.bottom >= windowHeight / 2) {
          activeSection = section.id;
        }
      });
      
      navLinks.forEach(link => {
        link.classList.remove('active');
        if (activeSection && link.getAttribute('href') === '#' + activeSection) {
          link.classList.add('active');
        }
      });
    }

    // 主题切换
    function toggleTheme() {
      const body = document.body;
      const themeToggle = document.querySelector('.theme-toggle');
      const isDarkNow = body.classList.contains('dark-theme');
      
      body.style.pointerEvents = 'none';
      
      if (isDarkNow) {
        body.classList.add('light-theme');
        setTimeout(() => {
          body.classList.remove('dark-theme');
          body.style.pointerEvents = '';
        }, 50);
        localStorage.setItem('theme', 'light');
        themeToggle.textContent = '🌙 深色模式';
      } else {
        body.classList.add('dark-theme');
        setTimeout(() => {
          body.classList.remove('light-theme');
          body.style.pointerEvents = '';
        }, 50);
        localStorage.setItem('theme', 'dark');
        themeToggle.textContent = '☀️ 浅色模式';
      }
    }
    
    // 图片模态框
    function openModal(src) {
      const modal = document.getElementById('imageModal');
      const modalImg = document.getElementById('modalImage');
      modal.style.display = 'block';
      modalImg.src = src;
    }
    
    function closeModal() {
      document.getElementById('imageModal').style.display = 'none';
    }
    
    // 平滑滚动到月份
    function scrollToMonth(monthId) {
      document.getElementById(monthId).scrollIntoView({ behavior: 'smooth' });
      if (window.innerWidth <= 768) {
        setTimeout(closeSidebar, 500);
      }
    }
    
    // 初始化
    document.addEventListener('DOMContentLoaded', function() {
      const currentTheme = '${initialTheme}';
      const themeToggle = document.querySelector('.theme-toggle');
      
      document.body.classList.add(currentTheme + '-theme');
      if (currentTheme === 'dark') {
        themeToggle.textContent = '☀️ 浅色模式';
      } else {
        themeToggle.textContent = '🌙 深色模式';
      }
      
      localStorage.setItem('theme', currentTheme);

      document.querySelector('.menu-btn').addEventListener('click', toggleSidebar);
      document.querySelector('.close-sidebar').addEventListener('click', closeSidebar);
      document.querySelector('.sidebar-overlay').addEventListener('click', closeSidebar);
      
      window.addEventListener('scroll', updateActiveNav);
      updateActiveNav();
      
      document.querySelectorAll('.entry-image').forEach(img => {
        img.addEventListener('click', function() {
          openModal(this.src);
        });
      });
      
      document.getElementById('imageModal').addEventListener('click', function(e) {
        if (e.target === this) {
          closeModal();
        }
      });
      
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
          closeModal();
          closeSidebar();
        }
      });

      window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
          openSidebar();
        } else {
          closeSidebar();
        }
      });

      document.querySelector('.main-wrapper').classList.add('sidebar-closed');
    });
  `;
}