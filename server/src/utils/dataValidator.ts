interface DiaryEntry {
  date: string;
  content?: string;
  collection?: string;
  album?: Array<{ type: string; url: string }>;
  audio?: string;
  tags?: string[];
}

interface ValidationResult {
  isValid: boolean;
  error?: string;
  details?: any;
  statistics?: any;
}

/**
 * 验证日记数据格式
 */
export function validateDiaryData(data: any): ValidationResult {
  try {
    // 检查是否为数组
    if (!Array.isArray(data)) {
      return {
        isValid: false,
        error: '数据必须是数组格式',
        details: { type: typeof data },
      };
    }

    // 检查数组是否为空
    if (data.length === 0) {
      return {
        isValid: false,
        error: '数据数组不能为空',
        details: { length: 0 },
      };
    }

    // 验证每个条目
    const errors: string[] = [];
    const statistics = {
      totalEntries: data.length,
      withImages: 0,
      withVideos: 0,
      withAudio: 0,
      withTags: 0,
      withCollections: 0,
      dateRange: null as any,
      collections: new Set<string>(),
      tags: new Set<string>(),
    };

    const dates: Date[] = [];

    for (let i = 0; i < data.length; i++) {
      const entry = data[i];

      // 验证必需字段
      if (!entry.date) {
        errors.push(`第${i + 1}条记录缺少date字段`);
        continue;
      }

      // content字段是可选的，但如果没有content，必须有album或audio
      if (!entry.content && !entry.album && !entry.audio) {
        errors.push(`第${i + 1}条记录必须至少包含content、album或audio中的一个`);
        continue;
      }

      // 验证日期格式
      const date = new Date(entry.date);
      if (isNaN(date.getTime())) {
        errors.push(`第${i + 1}条记录的日期格式无效: ${entry.date}`);
        continue;
      }
      dates.push(date);

      // 验证可选字段
      if (entry.album) {
        if (!Array.isArray(entry.album)) {
          errors.push(`第${i + 1}条记录的album字段必须是数组`);
        } else {
          // 统计图片和视频数量
          const hasImages = entry.album.some((item: any) => item.type === 'image');
          const hasVideos = entry.album.some((item: any) => item.type === 'video');
          
          if (hasImages) statistics.withImages++;
          if (hasVideos) statistics.withVideos++;
          
          // 验证album中的每个项目
          entry.album.forEach((item: any, idx: number) => {
            if (!item.type || !item.url) {
              errors.push(`第${i + 1}条记录的album[${idx}]缺少type或url字段`);
            } else if (!['image', 'video'].includes(item.type)) {
              errors.push(`第${i + 1}条记录的album[${idx}]的type字段必须是'image'或'video'`);
            }
          });
        }
      }

      if (entry.tags) {
        if (!Array.isArray(entry.tags)) {
          errors.push(`第${i + 1}条记录的tags字段必须是数组`);
        } else {
          statistics.withTags++;
          entry.tags.forEach((tag: string) => statistics.tags.add(tag));
        }
      }

      if (entry.audio) {
        if (typeof entry.audio !== 'string') {
          errors.push(`第${i + 1}条记录的audio字段必须是字符串`);
        } else {
          statistics.withAudio++;
        }
      }

      if (entry.collection) {
        if (typeof entry.collection !== 'string') {
          errors.push(`第${i + 1}条记录的collection字段必须是字符串`);
        } else {
          statistics.withCollections++;
          statistics.collections.add(entry.collection);
        }
      }
    }

    // 如果有错误，返回错误信息
    if (errors.length > 0) {
      return {
        isValid: false,
        error: `发现${errors.length}个数据错误`,
        details: { errors: errors.slice(0, 10) }, // 只返回前10个错误
      };
    }

    // 计算日期范围
    if (dates.length > 0) {
      dates.sort((a, b) => a.getTime() - b.getTime());
      statistics.dateRange = {
        earliest: dates[0].toISOString(),
        latest: dates[dates.length - 1].toISOString(),
      };
    }

    // 转换Set为数组以便序列化
    const finalStatistics = {
      ...statistics,
      uniqueCollections: statistics.collections.size,
      uniqueTags: statistics.tags.size,
      collections: Array.from(statistics.collections),
      tags: Array.from(statistics.tags).slice(0, 20), // 只返回前20个标签
    };

    return {
      isValid: true,
      statistics: finalStatistics,
    };
  } catch (error) {
    return {
      isValid: false,
      error: `数据解析失败: ${error instanceof Error ? error.message : '未知错误'}`,
      details: { error: error instanceof Error ? error.stack : error },
    };
  }
}

/**
 * 验证PDF生成选项
 */
export function validatePDFOptions(options: any) {
  const defaultOptions = {
    title: '我的日记',
    author: '未知作者',
    includeImages: true,
    includeAudio: true,
    includeTags: true,
    includeCollections: true,
    pageSize: 'A4' as const,
    theme: 'light' as const,
  };

  const validatedOptions = { ...defaultOptions, ...options };

  // 验证pageSize
  const validPageSizes = ['A4', 'A5', 'Letter'];
  if (!validPageSizes.includes(validatedOptions.pageSize)) {
    validatedOptions.pageSize = 'A4';
  }

  // 验证theme
  const validThemes = ['light', 'dark'];
  if (!validThemes.includes(validatedOptions.theme)) {
    validatedOptions.theme = 'light';
  }

  // 确保布尔值类型
  validatedOptions.includeImages = Boolean(validatedOptions.includeImages);
  validatedOptions.includeAudio = Boolean(validatedOptions.includeAudio);
  validatedOptions.includeTags = Boolean(validatedOptions.includeTags);
  validatedOptions.includeCollections = Boolean(validatedOptions.includeCollections);

  return validatedOptions;
}

/**
 * 清理和标准化日记内容
 */
export function sanitizeContent(content: string): string {
  if (typeof content !== 'string') {
    return '';
  }

  // 移除HTML标签（基础清理）
  const withoutHtml = content.replace(/<[^>]*>/g, '');
  
  // 标准化换行符
  const normalized = withoutHtml.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // 移除过多的空行
  const cleanedLines = normalized.split('\n').reduce((acc: string[], line: string, index: number, array: string[]) => {
    const trimmedLine = line.trim();
    const prevLine = index > 0 ? array[index - 1].trim() : '';
    
    // 保留内容行，但限制连续空行
    if (trimmedLine || prevLine) {
      acc.push(line);
    }
    
    return acc;
  }, []);
  
  return cleanedLines.join('\n').trim();
}

export { DiaryEntry, ValidationResult }; 