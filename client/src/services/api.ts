import axios, { AxiosProgressEvent } from 'axios';
import { PDFGenerationOptions, GeneratePDFResponse, UploadProgress, DocumentGenerationOptions, GenerateDocumentResponse } from '@/types/diary';

// 创建axios实例
const api = axios.create({
  baseURL: '/backup/moment/api',
  timeout: 120000, // 120秒超时
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 在请求发送前做一些处理
    console.log('发送请求:', config.url);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API错误:', error.response?.data || error.message);
    
    // 统一错误处理
    const errorMessage = error.response?.data?.message || error.message || '网络请求失败';
    
    return Promise.reject({
      message: errorMessage,
      code: error.response?.status,
      details: error.response?.data,
    });
  }
);

/**
 * 上传JSON文件并生成文档（PDF或HTML）
 */
export async function generateDocument(
  file: File,
  options: DocumentGenerationOptions,
  onProgress?: (progress: UploadProgress) => void
): Promise<GenerateDocumentResponse> {
  const formData = new FormData();
  formData.append('diaryFile', file);
  formData.append('options', JSON.stringify(options));

  const endpoint = options.outputFormat === 'html' ? '/generate-html' : '/generate-pdf';

  const response = await api.post(endpoint, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent: AxiosProgressEvent) => {
      if (onProgress && progressEvent.total) {
        const progress: UploadProgress = {
          loaded: progressEvent.loaded,
          total: progressEvent.total,
          percentage: Math.round((progressEvent.loaded * 100) / progressEvent.total),
        };
        onProgress(progress);
      }
    },
  });

  return response.data;
}

/**
 * 上传JSON文件并生成PDF
 */
export async function generatePDF(
  file: File,
  options: PDFGenerationOptions,
  onProgress?: (progress: UploadProgress) => void
): Promise<GeneratePDFResponse> {
  const formData = new FormData();
  formData.append('diaryFile', file);
  formData.append('options', JSON.stringify(options));

  const response = await api.post('/generate-pdf', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent: AxiosProgressEvent) => {
      if (onProgress && progressEvent.total) {
        const progress: UploadProgress = {
          loaded: progressEvent.loaded,
          total: progressEvent.total,
          percentage: Math.round((progressEvent.loaded * 100) / progressEvent.total),
        };
        onProgress(progress);
      }
    },
  });

  return response.data;
}

/**
 * 下载文件（通用）
 */
export async function downloadFile(filename: string): Promise<Blob> {
  const response = await api.get(`/download/${filename}`, {
    responseType: 'blob',
  });

  return response.data;
}

/**
 * 下载PDF文件
 */
export async function downloadPDF(filename: string): Promise<Blob> {
  return downloadFile(filename);
}

/**
 * 预览JSON数据
 */
export async function previewDiary(file: File) {
  const formData = new FormData();
  formData.append('diaryFile', file);

  const response = await api.post('/preview', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
}

/**
 * 获取服务器状态
 */
export async function getServerStatus() {
  const response = await api.get('/status');
  return response.data;
}

/**
 * 验证JSON文件格式
 */
export async function validateDiaryFile(file: File) {
  const formData = new FormData();
  formData.append('diaryFile', file);

  const response = await api.post('/validate', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
}

/**
 * 获取支持的图片格式
 */
export async function getSupportedFormats() {
  const response = await api.get('/formats');
  return response.data;
}

/**
 * 清理临时文件
 */
export async function cleanupTempFiles() {
  const response = await api.post('/cleanup');
  return response.data;
}

// 导出API实例，以便在其他地方使用
export default api; 
