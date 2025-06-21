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

export async function generateHTML(
  diaryData: DiaryEntry[],
  options: any,
  jobId: string
): Promise<string> {
  console.log(`${jobId}: 开始生成HTML文档...`);
  
  // 验证选项
  const validatedOptions = validatePDFOptions(options);
  
  // 处理数据
  const processedData = processDiaryData(diaryData);
  const groupedData = groupByMonth(processedData);
  
  // 生成HTML内容
  console.log(`${jobId}: 生成HTML内容...`);
  const htmlContent = generateHTMLContent(processedData, groupedData, validatedOptions);
  
  // 保存HTML文件
  const outputPath = path.join(__dirname, '../../temp', `diary-${jobId}.html`);
  fs.writeFileSync(outputPath, htmlContent, 'utf-8');
  
  console.log(`${jobId}: HTML生成完成: ${outputPath}`);
  return outputPath;
}

function processDiaryData(data: DiaryEntry[]): DiaryEntry[] {
  return data.map(entry => ({
    ...entry,
    formattedDate: formatDate(entry.date),
    yearMonth: getYearMonth(entry.date),
  })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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
    return dateString;
  }
}

function formatDateSimple(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch (error) {
    return dateString;
  }
}

function getYearMonth(dateString: string): string {
  try {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
  } catch (error) {
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

function generateHTMLContent(
  data: DiaryEntry[],
  groupedData: Record<string, DiaryEntry[]>,
  options: any
): string {
  const isDark = options.theme === 'dark';
  
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(options.title || '我的日记')}</title>
  <style>
    ${getHTMLStyles(isDark)}
  </style>
</head>
<body>
  <div class="app-container">
    ${generateSidebar(groupedData)}
    <div class="main-wrapper">
      ${generateTopBar(options)}
      <div class="content-container">
        ${generateCoverPage(data, options)}
        ${generateContent(groupedData, options)}
      </div>
    </div>
  </div>
  
  <script>
    ${getJavaScript(options)}
  </script>
</body>
</html>
  `;
}

function getHTMLStyles(isDark: boolean): string {
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
      height: 72px; /* 与顶部导航栏同高 */
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
      height: 72px; /* 固定高度确保对齐 */
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
        // 移动端使用遮罩层
        overlay.classList.toggle('show');
      } else {
        // 桌面端调整主内容区域
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
        // 移动端不需要调整主内容区域
      } else {
        // 桌面端隐藏时调整主内容区域
        mainWrapper.classList.add('sidebar-closed');
      }
    }

    function openSidebar() {
      const sidebar = document.querySelector('.sidebar');
      const mainWrapper = document.querySelector('.main-wrapper');
      const overlay = document.querySelector('.sidebar-overlay');
      
      sidebar.classList.add('open');
      if (window.innerWidth <= 768) {
        // 移动端使用遮罩层
        overlay.classList.add('show');
      } else {
        // 桌面端调整主内容区域
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

    // 主题切换 - 优化版本，避免闪烁
    function toggleTheme() {
      const body = document.body;
      const themeToggle = document.querySelector('.theme-toggle');
      const isDarkNow = body.classList.contains('dark-theme');
      
      // 添加切换过渡类
      body.style.pointerEvents = 'none';
      
      if (isDarkNow) {
        // 切换到浅色主题
        body.classList.add('light-theme');
        setTimeout(() => {
          body.classList.remove('dark-theme');
          body.style.pointerEvents = '';
        }, 50);
        localStorage.setItem('theme', 'light');
        themeToggle.textContent = '🌙 深色模式';
      } else {
        // 切换到深色主题
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
      // 在移动端自动关闭侧边栏
      if (window.innerWidth <= 768) {
        setTimeout(closeSidebar, 500);
      }
    }
    
    // 初始化
    document.addEventListener('DOMContentLoaded', function() {
      // 设置初始主题
      const currentTheme = '${initialTheme}'; // 从服务端获取的初始主题
      const themeToggle = document.querySelector('.theme-toggle');
      
      // 优先使用服务端设置的主题，而不是localStorage
      document.body.classList.add(currentTheme + '-theme');
      if (currentTheme === 'dark') {
        themeToggle.textContent = '☀️ 浅色模式';
      } else {
        themeToggle.textContent = '🌙 深色模式';
      }
      
      // 保存当前主题到localStorage以供后续切换使用
      localStorage.setItem('theme', currentTheme);

      // 侧边栏控制事件
      document.querySelector('.menu-btn').addEventListener('click', toggleSidebar);
      document.querySelector('.close-sidebar').addEventListener('click', closeSidebar);
      
      // 遮罩层点击关闭
      document.querySelector('.sidebar-overlay').addEventListener('click', closeSidebar);
      
      // 滚动更新活跃导航
      window.addEventListener('scroll', updateActiveNav);
      updateActiveNav(); // 初始更新
      
      // 图片点击事件
      document.querySelectorAll('.entry-image').forEach(img => {
        img.addEventListener('click', function() {
          openModal(this.src);
        });
      });
      
      // 模态框关闭事件
      document.getElementById('imageModal').addEventListener('click', function(e) {
        if (e.target === this) {
          closeModal();
        }
      });
      
      // 键盘事件
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
          closeModal();
          closeSidebar();
        }
      });

      // 响应式处理
      window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
          // 桌面端自动显示侧边栏
          openSidebar();
        } else {
          // 移动端默认隐藏侧边栏
          closeSidebar();
        }
      });

      // 初始化响应式状态 - 默认隐藏侧边栏
      document.querySelector('.main-wrapper').classList.add('sidebar-closed');
    });
  `;
}

function generateCoverPage(data: DiaryEntry[], options: any): string {
  const totalEntries = data.length;
  const withImages = data.filter(e => e.album && e.album.length > 0).length;
  const withAudioVideo = data.filter(e => {
    // 检查是否有音频
    const hasAudio = e.audio || e.audioInfo;
    // 检查是否有视频
    const hasVideo = e.album && e.album.some(item => item.type === 'video');
    return hasAudio || hasVideo;
  }).length;
  const withContent = data.filter(e => e.content && e.content.trim()).length;
  
  // 安全地获取日期范围
  let dateRange = null;
  if (data.length > 0) {
    const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    dateRange = {
      earliest: formatDateSimple(sortedData[0].date),
      latest: formatDateSimple(sortedData[sortedData.length - 1].date),
    };
  }

  return `
    <div class="cover-page">
      <h1 class="cover-title">${escapeHtml(options.title || '我的日记')}</h1>
      ${options.author ? `<p class="cover-subtitle">作者：${escapeHtml(options.author)}</p>` : ''}
      <p class="cover-subtitle">生成于 ${new Date().toLocaleDateString('zh-CN')}</p>
      
      <div class="cover-stats">
        <div class="stat-card">
          <div class="stat-number">${totalEntries}</div>
          <div class="stat-label">总条目</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${withContent}</div>
          <div class="stat-label">文字记录</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${withImages}</div>
          <div class="stat-label">包含图片</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${withAudioVideo}</div>
          <div class="stat-label">包含音视频</div>
        </div>
      </div>
      
      ${dateRange ? `
        <div style="margin-top: 2rem; font-size: 1.1rem; color: #6b7280;">
          <p>时间跨度：${dateRange.earliest} 至 ${dateRange.latest}</p>
        </div>
      ` : ''}
    </div>
  `;
}

function generateSidebar(groupedData: Record<string, DiaryEntry[]>): string {
  const months = Object.keys(groupedData).sort().reverse();
  
  // 按年份分组
  const yearGroups: Record<string, Array<{month: string, count: number}>> = {};
  
  months.forEach(month => {
    const year = month.split('-')[0];
    if (!yearGroups[year]) {
      yearGroups[year] = [];
    }
    yearGroups[year].push({
      month: month,
      count: groupedData[month].length
    });
  });

  const yearSections = Object.keys(yearGroups).sort().reverse().map(year => {
    const monthItems = yearGroups[year].map(item => {
      const title = getYearMonthTitle(item.month);
      const monthName = title.replace(/\d+年/, ''); // 只保留月份部分
      return `
        <a href="#month-${item.month}" class="month-link" onclick="scrollToMonth('month-${item.month}')">
          <span class="month-name">${monthName}</span>
          <span class="month-count">${item.count}</span>
        </a>
      `;
    }).join('');

    return `
      <div class="year-group">
        <div class="year-title">${year}年</div>
        <div class="month-list">
          ${monthItems}
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="sidebar-overlay"></div>
    <nav class="sidebar">
      <div class="sidebar-header">
        <div class="sidebar-title">
          <span>📅</span>
          <span>目录导航</span>
        </div>
        <button class="close-sidebar" aria-label="关闭侧边栏">×</button>
      </div>
      <div class="sidebar-content">
        ${yearSections}
      </div>
    </nav>
  `;
}

function generateTopBar(options: any): string {
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

function generateContent(groupedData: Record<string, DiaryEntry[]>, options: any): string {
  const months = Object.keys(groupedData).sort().reverse();
  
  const content = months.map(month => {
    const entries = groupedData[month];
    const title = getYearMonthTitle(month);
    
    const entryHTML = entries.map(entry => generateEntryHTML(entry, options)).join('');
    
    return `
      <section class="month-section" id="month-${month}">
        <h2 class="month-title">${title}</h2>
        ${entryHTML}
      </section>
    `;
  }).join('');

  return `
    ${content}
    
    <!-- 图片模态框 -->
    <div id="imageModal" class="modal">
      <span class="close" onclick="closeModal()">&times;</span>
      <div class="modal-content">
        <img id="modalImage" class="modal-image">
      </div>
    </div>
  `;
}

function generateEntryHTML(entry: DiaryEntry, options: any): string {
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
  const hasTextContent = entry.content && entry.content.trim();
  if (hasTextContent) {
    html += `<div class="entry-content">${escapeHtml(entry.content || '')}</div>`;
  }

  // 添加媒体内容
  html += '<div class="entry-media">';

  // 添加图片
  if (entry.album && entry.album.length > 0 && options.includeImages) {
    const images = entry.album
      .filter(item => item.type === 'image')
      .map(item => `
        <div class="image-container">
          <img src="${escapeHtml(item.url)}" alt="日记图片" class="entry-image">
        </div>
      `)
      .join('');
    
    if (images) {
      if (hasTextContent) {
        html += `
          <div class="media-section">
            <div class="media-title">📷 图片 (${entry.album.filter(item => item.type === 'image').length})</div>
            <div class="entry-images">${images}</div>
          </div>
        `;
      } else {
        html += `
          <div class="media-section">
            <div class="entry-images">${images}</div>
          </div>
        `;
      }
    }

    // 添加视频
    const videos = entry.album
      .filter(item => item.type === 'video')
      .map(item => `
        <div class="video-container">
          <video controls class="entry-video">
            <source src="${escapeHtml(item.url)}" type="video/mp4">
            您的浏览器不支持视频播放。
            <a href="${escapeHtml(item.url)}" target="_blank">点击这里打开视频链接</a>
          </video>
        </div>
      `)
      .join('');
    
    if (videos) {
      if (hasTextContent) {
        html += `
          <div class="media-section">
            <div class="media-title">🎬 视频 (${entry.album.filter(item => item.type === 'video').length})</div>
            <div class="entry-videos">${videos}</div>
          </div>
        `;
      } else {
        html += `
          <div class="media-section">
            <div class="entry-videos">${videos}</div>
          </div>
        `;
      }
    }
  }

  // 添加音频
  if (entry.audio && options.includeAudio) {
    if (entry.audioInfo) {
      if (hasTextContent) {
        html += `
          <div class="media-section">
            <div class="media-title">🎵 音频文件</div>
            <div class="audio-player">
              <div class="audio-header">
                <div class="audio-icon">♪</div>
                <div class="audio-info">
                  <div class="audio-filename">${escapeHtml(entry.audioInfo.filename)}</div>
                  <div class="audio-meta">
                    <span>大小: ${escapeHtml(entry.audioInfo.size)}</span>
                    <span>格式: ${escapeHtml(entry.audioInfo.format || '未知')}</span>
                  </div>
                </div>
              </div>
              <div class="audio-controls">
                <audio controls class="audio-element">
                  <source src="${escapeHtml(entry.audioInfo.originalUrl)}" type="audio/mpeg">
                  您的浏览器不支持音频播放。
                  <a href="${escapeHtml(entry.audioInfo.originalUrl)}" target="_blank">点击这里打开音频链接</a>
                </audio>
              </div>
            </div>
          </div>
        `;
      } else {
        html += `
          <div class="media-section">
            <div class="audio-player">
              <div class="audio-header">
                <div class="audio-icon">♪</div>
                <div class="audio-info">
                  <div class="audio-filename">${escapeHtml(entry.audioInfo.filename)}</div>
                  <div class="audio-meta">
                    <span>大小: ${escapeHtml(entry.audioInfo.size)}</span>
                    <span>格式: ${escapeHtml(entry.audioInfo.format || '未知')}</span>
                  </div>
                </div>
              </div>
              <div class="audio-controls">
                <audio controls class="audio-element">
                  <source src="${escapeHtml(entry.audioInfo.originalUrl)}" type="audio/mpeg">
                  您的浏览器不支持音频播放。
                  <a href="${escapeHtml(entry.audioInfo.originalUrl)}" target="_blank">点击这里打开音频链接</a>
                </audio>
              </div>
            </div>
          </div>
        `;
      }
    } else {
      if (hasTextContent) {
        html += `
          <div class="media-section">
            <div class="media-title">🎵 音频文件</div>
            <div class="audio-player">
              <div class="audio-header">
                <div class="audio-icon">♪</div>
                <div class="audio-info">
                  <div class="audio-filename">音频文件</div>
                </div>
              </div>
              <div class="audio-controls">
                <audio controls class="audio-element">
                  <source src="${escapeHtml(entry.audio)}" type="audio/mpeg">
                  您的浏览器不支持音频播放。
                  <a href="${escapeHtml(entry.audio)}" target="_blank">点击这里打开音频链接</a>
                </audio>
              </div>
            </div>
          </div>
        `;
      } else {
        html += `
          <div class="media-section">
            <div class="audio-player">
              <div class="audio-header">
                <div class="audio-icon">♪</div>
                <div class="audio-info">
                  <div class="audio-filename">音频文件</div>
                </div>
              </div>
              <div class="audio-controls">
                <audio controls class="audio-element">
                  <source src="${escapeHtml(entry.audio)}" type="audio/mpeg">
                  您的浏览器不支持音频播放。
                  <a href="${escapeHtml(entry.audio)}" target="_blank">点击这里打开音频链接</a>
                </audio>
              </div>
            </div>
          </div>
        `;
      }
    }
  }

  html += '</div>'; // 关闭 entry-media

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

// 安全地转义HTML内容
function escapeHtml(unsafe: string): string {
  if (typeof unsafe !== 'string') return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
} 