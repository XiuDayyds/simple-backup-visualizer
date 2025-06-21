import { DiaryEntry, ProcessedDiaryEntry, GroupedDiaryData } from '@/types/diary';

/**
 * 格式化日期字符串（包含时间）
 */
export function formatDate(dateString: string): string {
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
    console.warn('日期格式化失败:', dateString, error);
    return dateString;
  }
}

/**
 * 获取年月字符串 (YYYY-MM格式)
 */
export function getYearMonth(dateString: string): string {
  try {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
  } catch (error) {
    console.warn('年月提取失败:', dateString, error);
    return '未知日期';
  }
}

/**
 * 获取年月的中文显示标题
 */
export function getYearMonthTitle(yearMonth: string): string {
  try {
    const [year, month] = yearMonth.split('-');
    return `${year}年${parseInt(month)}月`;
  } catch (error) {
    return yearMonth;
  }
}

/**
 * 处理单个日记条目
 */
export function processDiaryEntry(entry: DiaryEntry): ProcessedDiaryEntry {
  const formattedDate = formatDate(entry.date);
  const yearMonth = getYearMonth(entry.date);
  const timestamp = new Date(entry.date).getTime();

  return {
    ...entry,
    formattedDate,
    yearMonth,
    timestamp,
  };
}

/**
 * 处理日记数据数组
 */
export function processDiaryData(entries: DiaryEntry[]): ProcessedDiaryEntry[] {
  return entries
    .map(processDiaryEntry)
    .sort((a, b) => b.timestamp - a.timestamp); // 按时间倒序排列
}

/**
 * 按月分组日记数据
 */
export function groupDiaryByMonth(entries: ProcessedDiaryEntry[]): GroupedDiaryData {
  const grouped: GroupedDiaryData = {};

  entries.forEach(entry => {
    const { yearMonth } = entry;
    
    if (!grouped[yearMonth]) {
      grouped[yearMonth] = {
        entries: [],
        title: getYearMonthTitle(yearMonth),
        count: 0,
      };
    }
    
    grouped[yearMonth].entries.push(entry);
    grouped[yearMonth].count++;
  });

  // 对每个月内的条目按时间倒序排列
  Object.values(grouped).forEach(group => {
    group.entries.sort((a, b) => b.timestamp - a.timestamp);
  });

  return grouped;
}

/**
 * 验证JSON数据格式
 */
export function validateDiaryData(data: any): string | null {
  if (!Array.isArray(data)) {
    return '数据必须是数组格式';
  }

  if (data.length === 0) {
    return '数据数组不能为空';
  }

  for (let i = 0; i < data.length; i++) {
    const entry = data[i];
    
    if (!entry.date) {
      return `第${i + 1}条记录缺少date字段`;
    }
    
    // 验证日期格式
    if (isNaN(new Date(entry.date).getTime())) {
      return `第${i + 1}条记录的日期格式无效: ${entry.date}`;
    }
    
    // 允许在有album或audio的情况下缺少content字段
    if (!entry.content && !entry.album && !entry.audio) {
      return `第${i + 1}条记录缺少内容：需要至少包含content、album或audio字段之一`;
    }
    
    // 验证album格式（如果存在）
    if (entry.album && !Array.isArray(entry.album)) {
      return `第${i + 1}条记录的album字段必须是数组`;
    }
    
    // 验证tags格式（如果存在）
    if (entry.tags && !Array.isArray(entry.tags)) {
      return `第${i + 1}条记录的tags字段必须是数组`;
    }
  }

  return null; // 验证通过
}

/**
 * 统计数据信息
 */
export function getDataStatistics(entries: ProcessedDiaryEntry[]) {
  const totalEntries = entries.length;
  const withImages = entries.filter(e => e.album && e.album.some(item => item.type === 'image')).length;
  const withVideos = entries.filter(e => e.album && e.album.some(item => item.type === 'video')).length;
  const withAudio = entries.filter(e => e.audio).length;
  const withTags = entries.filter(e => e.tags && e.tags.length > 0).length;
  const withCollections = entries.filter(e => e.collection).length;

  const collections = new Set(
    entries
      .filter(e => e.collection)
      .map(e => e.collection)
  );

  const allTags = new Set(
    entries
      .filter(e => e.tags)
      .flatMap(e => e.tags || [])
  );

  return {
    totalEntries,
    withImages,
    withVideos,
    withAudio,
    withTags,
    withCollections,
    uniqueCollections: collections.size,
    uniqueTags: allTags.size,
    dateRange: entries.length > 0 ? {
      earliest: entries[entries.length - 1].formattedDate,
      latest: entries[0].formattedDate,
    } : null,
  };
} 