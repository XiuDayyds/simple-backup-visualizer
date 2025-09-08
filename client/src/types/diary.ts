// 日记数据的基本类型定义
export interface DiaryEntry {
  date: string;
  content: string;
  collection?: string;
  album?: MediaItem[];
  audio?: string;
  music?: string;  // 音乐分享链接
  tags?: string[];
}

// 媒体项类型
export interface MediaItem {
  type: 'image' | 'video';
  url: string;
}

// 处理后的日记条目（包含格式化的日期）
export interface ProcessedDiaryEntry extends DiaryEntry {
  formattedDate: string;
  yearMonth: string;
  timestamp: number;
}

// 按月分组的日记数据
export interface GroupedDiaryData {
  [yearMonth: string]: {
    entries: ProcessedDiaryEntry[];
    title: string;
    count: number;
  };
}

// 文档生成选项
export interface DocumentGenerationOptions {
  title?: string;
  author?: string;
  includeImages?: boolean;
  includeAudio?: boolean;
  includeTags?: boolean;
  includeCollections?: boolean;
  pageSize?: 'A4' | 'A5' | 'Letter';
  theme?: 'light' | 'dark';
  outputFormat?: 'pdf' | 'html';
}

// PDF生成选项（保持向后兼容）
export interface PDFGenerationOptions extends DocumentGenerationOptions {}

// API响应类型
export interface GenerateDocumentResponse {
  success: boolean;
  message: string;
  downloadUrl?: string;
  filename?: string;
  outputFormat?: 'pdf' | 'html';
}

// PDF响应类型（保持向后兼容）
export interface GeneratePDFResponse extends GenerateDocumentResponse {}

// 上传进度
export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  message?: string;
  stage?: string;
  estimatedRemaining?: number; // Estimated remaining time in milliseconds
  elapsedTime?: number; // Elapsed time in milliseconds
}

// 错误类型
export interface APIError {
  message: string;
  code?: string;
  details?: any;
} 